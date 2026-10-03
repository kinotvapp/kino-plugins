# The contract (apiVersion 1 to 6)

Your entry file is one ES module that exports one `async` function for each capability you
declared, and nothing is called that you did not declare:

```js
export async function search(query) { /* -> Item[] or Page */ }
export async function home() { /* -> Row[] */ }
export async function browse(ref, cursor) { /* -> Page */ }
export async function episodes(ref) { /* -> { series?: SeriesInfo, episodes: Episode[], seasons?: Season[] } */ }
export async function resolve(ref) { /* -> Stream */ }
export async function liveCategories() { /* -> Array<LiveCategory | Playlist> or Playlist */ }
export async function liveChannels({ categoryId, cursor }) { /* -> { items: LiveChannel[], next? } */ }
export async function guide({ channelIds, from, to }) { /* -> GuideEntry[] */ }
export async function liveSearch({ query }) { /* -> { items: LiveChannel[] } */ }
```

From `"apiVersion": 6` (Kino 0.9.50) there are more optional exports, each with its own page:
`sign` ([Signing every request](signed-streams.md)), `migrate` ([Moving saved titles](migrate.md)),
`section` and `categories` ([Section, categories and colors](section-theme.md)), and `settingsStatus`,
`action` and `validateSettings` ([The settings form](settings-form.md)).

([`kino.d.ts`](reference/index.md) has the same shapes as TypeScript declarations.)

Use named exports (`export async function ...`). Data crosses into and out of your code as JSON, so
return plain data: strings, numbers, booleans, arrays and objects.

The live-channel functions (`liveCategories`, `liveChannels`, and the optional `guide` and
`liveSearch`, apiVersion 3) have their arguments and rules on [Live channels](live-channels.md#live-contract).

## Arguments { #arguments }

- `search(query)` gets `{ q, type, season, episode, tmdbId, year, originalTitle, altTitles, cursor }`:
    - `q` is the text the person typed (it can be empty; return `[]`).
    - `type` is `"movie"` or `"series"` when Kino leans towards that kind, and `"any"` otherwise. It is
      a hint, not a filter: Kino derives it from TMDB's movie/tv split, which rarely lines up with a
      source's own catalogue, and a title can exist as both. Return every plausible match; use `type`
      at most to put the kind it names first.
    - `season` and `episode` are `0` unless Kino is looking for a specific episode; `tmdbId` and `year`
      are `0` when unknown.
    - `originalTitle` is TMDB's original title when it differs from `q` (else `""`), and `altTitles` up
      to 5 other titles Kino knows for the work (each at most 200 characters): try them when `q` finds
      nothing on a source that names things in another language.
    - `cursor` is `null`, except when the person asked for more results and your previous page said
      where to continue (see `Page` below).
    - `within` (apiVersion 6, only for a plugin that declares `scopedSearch`) is present when the person
      searches inside one of your "Ver más" pages: see [Searching inside a "Ver más" page](#scoped-search).
- `home()` gets `null`.
- `browse(ref, cursor)` gets the `ref` of one of your Home rows (or a `ref` a previous page gave),
  and `cursor` `null` for the first page or the `next` of the page before.
- `episodes(ref)` gets the `ref` of a `series` item, as you returned it.
- `resolve(ref, options)` gets the `ref` of a `movie` item, the `ref` of an episode, or (apiVersion 2) the
  `ref` of a `live` item. `options` is `undefined` on a normal call; only an apiVersion 6 plugin with a
  [request-signed](signed-streams.md#retry) stream ever gets it, as `{ retry }`.

## What you return { #returns }

```ts
Item       = { id: string, ref: string, title: string, kind: "movie" | "series" | "live",
               year?: string, poster?: string, backdrop?: string, overview?: string,
               lang?: string, quality?: string, originalTitle?: string,
               genres?: string[], rating?: number, runtimeMinutes?: number,
               ids?: { tmdb?: number, imdb?: string }, badges?: string[], adult?: boolean }
Row        = { id: string, title: string, items: Item[], ref?: string, genre?: Genre }
Genre      = "peliculas" | "series" | "anime" | "infantil" | "documentales" | "deportes" | "noticias" | "musica" | "entretenimiento" | "otros"
Page       = { items: Item[], next?: string }
SeriesInfo = { title?: string, poster?: string, backdrop?: string, overview?: string,
               ids?: { tmdb?: number, imdb?: string }, genres?: string[], year?: string }
Episode    = { season: number, number: number, ref: string, title?: string,
               still?: string, overview?: string, airDate?: string, runtimeMinutes?: number }
Season     = { id: string, ref: string, title: string, number?: number, current?: boolean }
Stream     = { url: string, mime?: string, headers?: Record<string, string>,
               subtitles?: { lang: string, url: string, format?: "vtt" | "srt" }[],
               audioTracks?: { lang: string, url: string, label?: string }[],
               durationMs?: number, expiresInSeconds?: number,
               drm?: { type: "widevine", licenseUrl: string, licenseHeaders?: Record<string, string> },
               alternatives?: { url: string, mime?: string, headers?: Record<string, string> }[],
               signing?: "request", signContext?: string, alternateHosts?: string[] }   // the last three: apiVersion 6
```

**Genre (Categorías and the En vivo filter).** A Home `Row`, a live `LiveCategory` and a `playlist` may carry an optional `genre` from a closed list of ten ids: `peliculas`, `series`, `anime`, `infantil`, `documentales`, `deportes`, `noticias`, `musica`, `entretenimiento`, `otros` (Kino shows their Spanish names). It lets Kino line up categories from different plugins: the Categorías tab groups the browsable Home rows (those with a `ref`, when you declare `browse`) of every plugin by genre, and En vivo can narrow its categories by genre. A value outside the list is ignored, never an error, and without a `genre` Kino guesses from the title of the row or group ("Deportes", "Noticias Colombia", "Kids"…), so set it when your titles do not say it. On a `playlist` the genre is the default for the groups of the list (each group's own title is guessed first). Kino versions before this field ignore it.

### How the pieces connect { #pieces }

A `movie` item's `ref` goes to `resolve`. A `series` item's `ref` goes to
`episodes`, and each episode's `ref` goes to `resolve`. A `live` item's `ref` (apiVersion 2, see
[Live channels](live-channels.md#live-items)) goes to `resolve` too, and its Stream plays as live. A
row's `ref` goes to `browse`, and so does each page's `next`.

### Seasons { #seasons }

Two shapes, and your `episodes` answer says which. When every season of a show is in
one list, give each episode its `season` and leave `seasons` out: Kino reads the seasons from the
episodes and shows a selector that only filters the list. When your source keeps each season as its
own `series` item (its own `id` and `ref`, as a search would list it), return only that season's
episodes and list every season of the show in `seasons`, the one you are answering for included:
`{ id, ref, title, number?, current? }`, with `title` what the selector shows ("Temporada 2") and
`current: true` on the season being listed (Kino also recognizes it by `id`). Kino shows the seasons
as chips; choosing another one calls `episodes` with that season's `ref` and opens it as that title,
with its own progress in the library. `seasons` is optional and new in this revision of apiVersion 1:
a plugin that never returns it keeps working exactly as before.

### Paging ("Ver más") { #paging }

If you declare `browse`, a Home row with a `ref` gets a "Ver más" card that
opens a grid: Kino calls `browse(ref, null)`, then `browse(ref, next)` while the person scrolls and
you keep returning a `next`. `search` may also return a `Page`; its `next` puts "Ver más resultados
de &lt;name&gt;" under your results, and Kino calls `search` again with the same query and `cursor: next`.
A `next` (and a row's `ref`) is only kept when you declare `browse`; without it Kino drops them with a
line in the log. Cursors are opaque to Kino: a page number, an offset, a URL, at most 2048
characters.

### Searching inside a "Ver más" page (`scopedSearch`, apiVersion 6) { #scoped-search }

Every "Ver más" page (a Home row, a row of your [section](section-theme.md), one of your Categorías) has
a search field at the top ("Buscar en esta categoría"). For every plugin, Kino filters the titles already
loaded on that page by name (accents and case aside, every word anywhere in the title); with fewer than
24 matches it keeps loading the next pages of the same `ref` ("Buscando en más páginas…"), at most 10
pages or 300 titles per round, and the person may ask for another round. A new query cancels the
running one.

Declare `"scopedSearch"` in `capabilities` (apiVersion 6, together with `search`; nothing more to
export, no consent line) to answer that search yourself, e.g. with your backend's search restricted to
that category. Without `search` the manifest is refused with "La capacidad \"scopedSearch\" necesita
también \"search\"". Kino then calls your `search` with the usual query plus `within`, the page's browse
`ref` exactly as you gave it:

```js
export async function search(query) {
  if (query.within) {
    const category = categoryOf(query.within);      // your own ref
    if (!category) return null;                      // "can't search there": Kino filters the page itself
    return searchCategory(category, query.q, query.cursor); // Item[] or Page, paged by your `next`
  }
  /* the plain search */
}
```

`type` is always `"any"` there, and `season`, `episode`, `tmdbId` and `year` are `0`. The answer is
checked like any search answer (the same caps, `adult` titles only while the 18+ code is unlocked), and
a `Page`'s `next` pages it as the person scrolls. Kino falls back to its own filter when you answer
`null`, throw, or have not answered after 6 s (the page then searches its own titles and drops your late
answer; your call keeps the search limit of 15 s); a failure reaches the error board like any failed
call, never with the query or the `ref`. Answering `null` is not a failure. `sdk/validate.mjs` warns when
you declare `scopedSearch` and your entry never reads `within`; try it with
`node sdk/run.mjs --within '<ref>' ./plugin.js search "texto"`.

### `id` is stable, `ref` may change { #id-and-ref }

`id` is the identity of a title: the person's library,
progress and "Continuar viendo" hang off it, so it must be the same every time the same title comes
back, in every search and on every Home refresh. `ref` is opaque to Kino: it is just what your
`episodes`/`resolve` need to find the title again. It may differ from one call to the next (sources
re-issue links), and Kino can hand you a `ref` you returned earlier, for example the one saved with a
title in the person's library. So make refs that keep working; if your source's links expire, put
something stable in the `ref` (an id) and look the fresh link up inside `resolve`.

### Kino is strict, and forgiving with lists { #validation }

Every list is checked entry by entry: a bad entry is
dropped (with a line in the log) and the rest survive; anything over a cap is cut. A `Stream` is
all or nothing.

| Thing | Rules |
| --- | --- |
| `search` result | At most 100 items (an `Item[]`, or a `Page`). A `live` item whose name has nothing to do with the query is dropped: it stays only when its name carries at least 60% of the words of 3 or more letters of some form of the query (what was typed, `originalTitle` or one of `altTitles`), accents and case ignored -- the rule of [`kino.rank.filterRelevant`](kino-api.md#rank). Movies and series are never judged this way (they may rightly carry another title), and a query with no such word drops nothing. So don't answer a search with your whole channel list when nothing matches. |
| `browse` result | A `Page` of at most 100 items. |
| `home` result | At most 20 rows of at most 60 items each. A row needs a unique `id` (same pattern as an item id) and a non-blank `title`; rows with no valid items are dropped. Kino shows them after its own rows, labelled with your plugin's name, and caches them for 6 hours (stale rows show while it refreshes; an answer with no valid rows, or over 2 MB, is not cached and is asked again next time). If `home()` fails you contribute no rows and Home is not blocked. |
| `episodes` result | At most 5000 episodes. `number` is required and from 1 to 99999 (an episode numbered 0, such as a special, is dropped). `season` should be from 1 to 999; a missing or out-of-range season becomes 1. `ref` is required. A repeated season and number is dropped. Without a `title`, Kino shows "Capítulo N". |
| `seasons` (in the `episodes` result) | Optional; at most 50. Each needs an `id` (same pattern as an item id; a repeated one is dropped), a non-empty `ref` of at most 4096 characters and a non-blank `title` (up to 200 characters), or it is dropped. `number` from 1 to 999 and `current` a boolean; a wrong one is ignored, not the season. Anything that is not a list is ignored. |
| `id` | `^[A-Za-z0-9._~-]{1,128}$`. Anything else drops the item, so if your source's own ids have other characters (spaces, `/`, `:`, `%`), derive a stable id yourself, such as a slug. Repeated ids in one list are dropped. |
| `ref` | A non-empty string of at most 4096 characters. |
| `kind` | `"movie"`, `"series"` or (apiVersion 2) `"live"`; a `live` item stays in a `home` row only from apiVersion 6 (below it, it is dropped from Home: see [Channels in your Home rows](live-channels.md#home-rows)). A `series` item from a plugin that does not declare `episodes` is dropped: it could never be opened; a `live` item from an apiVersion 1 plugin is dropped too (see [Live channels](live-channels.md#live-items)). |
| Text fields | `title` is required and non-blank, up to 200 characters. `overview` up to 2000; `lang` and `quality` up to 20 (for example `"es"`, `"1080p"`); `year` up to 10 (a number is accepted and converted). Longer text is cut; the text of `SeriesInfo` and `Episode` is cut the same way (200 characters for titles, 2000 for overviews). |
| Extra item fields | All optional; a wrong one is ignored, not the item. `genres` at most 5, each at most 30 characters; `badges` (shown as chips, e.g. `"HD"`, `"Latino"`) at most 3 of at most 20; `rating` from 0 to 10; `runtimeMinutes` from 1 to 1000; `ids.tmdb` a positive integer (Kino uses it to match your title with TMDB, to find it again from search, and to enrich its info page -- see below); `ids.imdb` matches `^tt\d{5,10}$` (also enriches a movie's info page when you have no `ids.tmdb`). An episode's `airDate` is `YYYY-MM-DD`. |
| `adult` | From apiVersion 6, `adult: true` marks an 18+ entry: Kino shows it only while the person's 18+ code is unlocked on that device (Ajustes ▸ Adultos), and hides it again when they lock it; below apiVersion 6 it is dropped. It applies on Home, in search, "Ver más", your section and Categorías. See [18+ content](#adult). |
| Images | `poster`, `backdrop` and `still` must be `http` or `https` URLs of at most 2048 characters, or they are ignored (Kino versions before the one that accepted `http` for images ignore the `http` ones). Images are loaded by Kino directly and are **not** checked against `hosts` (they are display only), and Kino does not send your headers or cookies with them. This is the one exception to the host rule, with one limit: an image on the home network, a private or reserved IP address, or a local name (`localhost`, `.local`, `.lan`, …) is ignored too, and so is a name without a dot over `http` (`router`, `nas`), unless it is on a server the person typed in your settings. A public IPv4 address is fine. |

### `ids.tmdb` enriches the info page, not only matching { #tmdb }

When TMDB has this exact title (matched by
`ids.tmdb`, or by `ids.imdb` on a movie when you gave no `ids.tmdb`), opening it adds three kinds of
field, each filled in differently:

- **Only TMDB has these, so they always come from it:** a tagline, the director or (for a series)
  creator, the cast and the age rating.
- **TMDB wins whenever it has an answer; yours is only the fallback for what TMDB left blank:** the
  year and the genres. A title with its own year or genres still shows TMDB's once matched, not its
  own.
- **Yours wins when you gave one; TMDB only fills the gap:** the synopsis (only replaced if yours was
  empty), the rating (only if you left it out), and a movie's runtime (only if you left it unset --
  a series' runtime is never touched either way, TMDB's included; it prints per episode, not for the
  whole show).

It does **not** add a poster, a backdrop or seasons from TMDB -- those stay exactly what your
`Item`/`SeriesInfo`/`episodes` answer gave, or blank if you left them out.

### The `Stream` rules { #stream }

- `url` must be `https` and its host must be one of your `hosts`, and so must the host of every
  subtitle URL, or it must be on a server the person typed in your settings (exactly that scheme,
  host and port). The one other way to plain `http` is a host you declared
  `{ "host": "…", "insecureHttp": true }` (apiVersion 2, [see the manifest](manifest.md#insecure-host)):
  that host, exactly, accepts `http` for the stream, its subtitles, its audio tracks and its
  license. A stream that breaks this is refused as a whole; a bad subtitle is dropped and the
  stream still plays. Two things relax this for a movie or an episode: a manifest with
  [`streamHosts: "any"`](manifest.md#stream-hosts) and the person's
  [broad video permission](#broad-video); and a host you forgot may be
  [asked about](#forgotten-host) instead of refused.
- `mime` is optional, of the form `video/mp4` (anything else refuses the stream). When it is missing
  Kino's player detects HLS, DASH or a plain file from the URL and the content.
- **Everything the player fetches for the stream follows the `kino.fetch` host rules.** That covers the
  `url` itself, the variants, segments and `#EXT-X-KEY` keys an HLS manifest names, the `BaseURL`s of a
  DASH manifest, the subtitles, and every redirect hop of any of them: each must be `https` on one of
  your `hosts` (or `http` on one you declared `insecureHttp`), never an IP address or a local name,
  and a declared name that resolves inside the person's own network is refused. A request that breaks this fails before it leaves the device and
  playback stops with an error, so a manifest that points at another CDN needs that CDN in `hosts`.
- `headers` are sent with every one of those player requests (the stream, its manifest's segments and
  keys, its subtitles, and redirect hops, all on your `hosts`) and, if you declare `download`, with
  every request that saves the stream to the device (for HLS: the playlists, the key and every
  segment) — and nowhere else. At most 20; names are letters, digits and
  hyphens; values are at most 4096 characters with no line breaks; `Host`, `Content-Length`,
  `Transfer-Encoding` and `Connection` are ignored.
- `subtitles`: at most 30, each `{ lang, url, format? }`. `lang` is a short language code such as
  `"es"` (up to 20 characters; blank becomes `"und"`), `format` is `"vtt"` or `"srt"`.
- `audioTracks`: at most 8, each `{ lang, url, label? }` -- a dub or an alternate mix your source
  serves as its own file, separate from the video. Checked exactly like a subtitle: `url` must be
  `https` on a declared host, or the person's own server exactly as typed; a bad entry is dropped and
  the rest of the stream still plays, and so is a `url` already listed (the first entry wins). `lang` up to 16 characters (blank becomes `"und"`); `label`, up
  to 40 characters, is shown in the audio menu verbatim when given, instead of a name guessed from
  `lang`. Kino merges each one into the video and offers it, auto-picked by the person's audio
  preference, in the same menu as the container's own embedded tracks. A stream with no `audioTracks`
  plays exactly as it always has. Example, a source that dubs into two languages:

    ```js
    return {
      url: videoUrl,
      audioTracks: [
        { lang: "es-419", url: dubUrl("es"), label: "Español (Latinoamérica)" },
        { lang: "en", url: dubUrl("en") },
      ],
    };
    ```

- `alternatives` (at most 8, each `{ url, mime?, headers? }`): other copies of the same video, best
  first. When `url` cannot play on the device (a codec it has no decoder for, a broken or unsupported
  file) or is gone (404, 403), Kino moves on to the next alternative by itself, at the same spot, and
  only shows an error once none is left. A lost network is not a reason to move on: that is retried as
  usual. Each entry is checked exactly like `url`, `mime` and `headers`; a bad one is dropped and the
  rest still count. They share the stream's `subtitles` and `audioTracks`. Ignored next to `drm`, with
  `signing` (`alternateHosts` is a signed stream's failover) and for a live channel. Return them when
  your source offers several files of one title (other servers, resolutions, encodes): a device that
  cannot decode the first one still gets to watch.
- `signing`, `signContext` and `alternateHosts` (apiVersion 6): an HLS stream that needs a fresh
  signature on every request. They have their own page: [Signing every request](signed-streams.md).
- `durationMs` is optional, in milliseconds.
- `expiresInSeconds` (30 to 86400) says when your URL may stop working. If playback fails after that
  long, Kino calls `resolve` once more and continues where the person was.
- **DRM only when declared.** A stream carrying any of `drm`, `license`, `licenseUrl`, `drmLicenseUrl`,
  `keySystem` or `widevine` is refused ("El video tiene DRM y los plugins no lo soportan") -- unless
  your manifest declares the `drm` capability (apiVersion 2) and the only such key is a `drm` block
  `{ type: "widevine", licenseUrl, licenseHeaders? }`: then Kino plays it as Widevine. `licenseUrl`
  is checked exactly like `url` (https on one of your `hosts`, or the person's own server), and
  `licenseHeaders` are filtered like `headers` (at most 20) and sent with the license request only.
  The other five keys are refused even next to a valid `drm` block. See
  [A Widevine-protected stream](cookbook.md#widevine).

### A host you forgot may be asked about, once { #forgotten-host }

When the person opens a title in the player and the only thing wrong with your `Stream` is that a URL
(the video, its license, a subtitle or an audio track) is on an `https` host you did not declare,
Kino asks them in the moment ("El video está en `<host>`, un servidor nuevo para este plugin.
¿Permitir?"), the same dialog a [`kino.fetch` to an undeclared host](kino-api.md#fetch) gets. The
player also asks when it meets a new host mid-playback (a manifest, a segment, a redirect).
"Permitir" adds that host to your plugin's approved hosts (there is no cap on how many a person
approves this way; an update keeps them) and the video plays; "Rechazar" (or Back) is remembered for
your plugin -- the video fails as described above, a subtitle or audio track is dropped -- and that
host is never asked about again until the person chooses "Olvidar rechazos de host". An IP address, a
local name, plain `http` or a stream broken in any other way is never asked about, and nothing is
asked when nobody is watching: a download fails on that host instead. Don't rely on it: declare the
hosts your streams use.

### The broad video permission { #broad-video }

For a movie or an episode, those video, subtitle and audio dialogs have a third choice, "Permitir
video de cualquier servidor". It is the person's own grant, shown and revocable in Ajustes ▸ Plugins
("Puede reproducir video desde cualquier servidor", "Quitar permiso de video amplio"); the one way for
you to ask for the same rule up front is [`streamHosts: "any"`](manifest.md#stream-hosts)
(apiVersion 4), approved on the consent sheet. An update or a reinstall keeps it; uninstalling drops
it.

While it is on, your movie or episode `Stream` is checked the way a live channel's is under
[`liveStreamHosts: "any"`](live-channels.md#live-stream-hosts): its `url`, everything its manifest
names, every redirect hop, **and** its `subtitles` and `audioTracks` may be on any public host, over
`http` or `https`, a public IPv4 address included, and no video host is ever asked about again for
your plugin. A [download](manifest.md#downloads) of a movie or an episode follows the same rule. It
never covers:

- the home network: private, loopback, link-local and CGNAT addresses, IPv6 literals, local names,
  and a public name that resolves into the LAN;
- a `drm` block's `licenseUrl` (still your hosts only, asked about as above);
- `kino.fetch`: your own code still reaches only your hosts and the ones approved one by one;
- live channels, which have their own rule.

It exists for sources whose hosters change domain per video or mid-playback; a plugin with a fixed
CDN should still declare it.

## Errors people understand { #errors }

A plain `throw new Error("…")` reaches the person as a generic failure of your plugin. When the
failure is one of the usual ones, throw a typed error instead and Kino says it properly, in Spanish, with your plugin's
name:

```js
if (r.status === 401) throw kino.error("auth_required", "la sesión venció");
```

<!-- contract:errors:start -->
| `kino.error` code | What the person sees |
| --- | --- |
| `auth_required` | "Configura {plugin} en Ajustes ▸ Plugins", with a button to its Configurar screen |
| `not_found` | "No se encontró en {plugin}" |
| `geo_blocked` | "Este contenido no está disponible en tu región" |
| `rate_limited` | "{plugin} está limitando las peticiones; intenta en unos minutos" |
| `unavailable` | "{plugin} no está disponible ahora" |
<!-- contract:errors:end -->

Your message is a detail for the log (cut at 200 characters); the person reads Kino's sentence. An
unknown code becomes a plain error.

From Kino 0.9.50, `auth_required` reads "Configura {plugin} en Ajustes ▸ {plugin}" when your plugin
declares settings (it has its own tab in Ajustes), else "Configura {plugin} en Ajustes ▸ Plugins"
("Menú ▸ Plugins" on the phone), with the same button.

### Your own sentence for the person (`userMessage`, apiVersion 6) { #user-message }

When Kino's sentence says too little (a chapter that was taken down, an account to link again), pass
your own sentence for the person as a third argument:

```js
throw kino.error("not_found", "E100006", { userMessage: "Este capítulo ya no está disponible." });
throw kino.error("auth_required", "E100083", {
  userMessage: "Tu cuenta se abrió en otro dispositivo. Vuelve a intentarlo, o vincúlala de nuevo.",
});
```

Kino shows it **instead of** its own line, always as "Mensaje de &lt;your plugin's name&gt;: &lt;your
sentence&gt;" ("Mensaje de Demo: Este capítulo ya no está disponible."), only when all of this holds;
otherwise the person reads Kino's line and your sentence goes nowhere (it is not logged either; the
detail is):

- your plugin's name can introduce it: only the characters below, no `:`, no digit glued to a letter,
  nothing that spells Kino (so a plugin named `M3U` or `Cuevana3` always shows Kino's line; `Cuevana 3`
  is fine);
- the code is one of the five in the table (Kino always words `timeout`, `network`, `host_not_allowed`,
  `crypto_error` and the rest itself);
- it is 1 to 160 characters once trimmed, made only of the letters of Basic Latin and Latin-1 (what
  Spanish, Portuguese and English write: á é í ó ú ü ñ ç ã õ â ê ô à è…, but not ø æ ð þ ß), the digits
  0-9, the plain space and `` . , : ; ¿ ? ¡ ! ' ’ ‘ “ ” « » ( ) % - – — ▸ `` (a `;` only before a
  space): so no other script, look-alike letter, small capital, line break, tab, other kind of space,
  invisible character, emoji or `@`;
- it reads as plain words: at least two words, no URL, no error prefix (`TypeError:`, `[Tag]`), no
  `undefined`/`null`/`NaN`, and it doesn't end in `:` `,` `;` or `-`;
- fewer than 6 digits in all, whatever separates them (no phone or account number, and so no full date
  with its year), and no digit glued to a letter (`en 5 minutos` is fine, `5minutos` is not);
- no domain: a dot glued to a letter (`site.app`), a dot after a space (`site .app`), a dot followed by
  a lowercase word of 2 to 6 letters (`site. app`), `www`, or `punto`/`dot` glued to or followed by a
  domain ending (`punto com`, `puntodev`; "a punto de volver" and "en este punto es mejor" are fine:
  `es`, `la`, `me` and `to` are not read as endings);
- it never spells Kino: read with `1`, `l`, `!`, `¡` as `i`, `0` as `o` and every non-letter dropped, it
  holds no `kino` anywhere (so avoid a word like "Kinoshita");
- it asks for no credentials, money or contact outside Kino, read word by word (a word split on purpose
  is read whole: `N e q u i`, `Ne qui`, `con tra seña`, `What s app`, `pun to com`): no `pag…` (pago,
  pagues, págalo; "página" is fine), `abon…`, `recarg…`, `transfer…`, `consign…`, `deposit…`,
  `contraseñ…`, `passw…`, `clave…`, `credencial…`, `token…`, `tarjeta`, `PIN`, Nequi, Daviplata,
  WhatsApp, Telegram, a `código` that came by SMS or is a verification code (`verification…`; "Verifica
  tu conexión" is fine): your own settings are the only place for those (`recarg…` also refuses
  "Recarga la lista": say "Vuelve a cargar");
- it holds none of the passwords the person typed in your settings (checked against your plugin's
  stored values; while they can't be read, the sentence is not shown), nor any sealed secret's value.
  Never echo what the person typed, in any form.

!!! danger "A plugin that uses `userMessage` to ask for money, credentials or contact is removed"
    A plugin that uses `userMessage` to ask people for money, credentials or contact outside Kino is
    removed from the plugin catalog.

Write it for the person, in their language; Kino doesn't translate it. It takes the very place Kino's
own line takes, so it never changes what the screen does: `auth_required` keeps the button to your
Configurar screen; `geo_blocked` shows the player's "No se puede reproducir" dialog; the other codes
show Kino's error line (on a live channel the person keeps zapping). It is also the reason under your
plugin's Home row and in the search notices. Your settings form and your section pages show it for
`not_found`, `unavailable` and `rate_limited`, and keep their own generic text for `auth_required` and
`geo_blocked`. One thing still wins over it, whatever the code: a host the person refused for this call
(they can act on that). The sentence counts only for the call that built the error: build it where you
throw it, not once at the top of your module. The Node kit (`run.mjs`) prints what the person would
read, or why the sentence is not shown. Kino builds older than 0.9.50 ignore the third argument and
show their own line, so it is always safe to pass.

### A pending update wins over the error { #pending-update }

When a newer version of your plugin waits for the person's approval (it asks for a new host,
permission or capability), a failed call does not show the usual sentence but "Hay una versión nueva de
&lt;name&gt;: actualízala en Ajustes ▸ Plugins", so the person knows what to do. A refused host, your
valid `userMessage` and `auth_required` (which keeps its button) still win over it. See
[Updates](publish.md#updates).

## 18+ content (`adult`, apiVersion 6) { #adult }

From `"apiVersion": 6`, `adult: true` on an item, on one of your [Categorías](section-theme.md#categories)
tiles, or on a live category or channel marks an 18+ entry. Kino shows it only while the person's 18+
code is unlocked on that device (Ajustes ▸ Adultos) and hides it again when they lock it. Nothing to
declare in the manifest. Below apiVersion 6 an `adult: true` entry is dropped, as before.

- It applies on Home, in search, "Ver más", your section, Categorías and En vivo. A row or a group left
  with only 18+ entries is not shown while the code is locked.
- Every channel of an 18+ category counts as 18+, and an 18+ channel never enters "Recientes".
- `liveSearch` hits need a mark: see [Mark every `liveSearch` hit](live-channels.md#live-search-adult).
- Sending an 18+ title to the paired TV needs the TV's 18+ content unlocked too ("Desbloquea el
  contenido 18+ en el TV para verlo allí").
- Your plugin cannot tell whether the code is unlocked, nor get around the lock: always return the mark
  and Kino decides what shows.
