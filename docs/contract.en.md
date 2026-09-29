# The contract (apiVersion 1, 2 and 3)

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
```

([`kino.d.ts`](reference/index.md) has the same shapes as TypeScript declarations.)

Use named exports (`export async function ...`). Data crosses into and out of your code as JSON, so
return plain data: strings, numbers, booleans, arrays and objects.

The three live-channel functions (`liveCategories`, `liveChannels`, `guide`, apiVersion 3) have their
arguments and rules on [Live channels](live-channels.md#live-contract).

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
- `home()` gets `null`.
- `browse(ref, cursor)` gets the `ref` of one of your Home rows (or a `ref` a previous page gave),
  and `cursor` `null` for the first page or the `next` of the page before.
- `episodes(ref)` gets the `ref` of a `series` item, as you returned it.
- `resolve(ref)` gets the `ref` of a `movie` item, the `ref` of an episode, or (apiVersion 2) the
  `ref` of a `live` item.

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
               drm?: { type: "widevine", licenseUrl: string, licenseHeaders?: Record<string, string> } }
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
| `search` result | At most 100 items (an `Item[]`, or a `Page`). |
| `browse` result | A `Page` of at most 100 items. |
| `home` result | At most 20 rows of at most 60 items each. A row needs a unique `id` (same pattern as an item id) and a non-blank `title`; rows with no valid items are dropped. Kino shows them after its own rows, labelled with your plugin's name, and caches them for 6 hours (stale rows show while it refreshes; an answer with no valid rows, or over 2 MB, is not cached and is asked again next time). If `home()` fails you contribute no rows and Home is not blocked. |
| `episodes` result | At most 5000 episodes. `number` is required and from 1 to 99999 (an episode numbered 0, such as a special, is dropped). `season` should be from 1 to 999; a missing or out-of-range season becomes 1. `ref` is required. A repeated season and number is dropped. Without a `title`, Kino shows "Capítulo N". |
| `seasons` (in the `episodes` result) | Optional; at most 50. Each needs an `id` (same pattern as an item id; a repeated one is dropped), a non-empty `ref` of at most 4096 characters and a non-blank `title` (up to 200 characters), or it is dropped. `number` from 1 to 999 and `current` a boolean; a wrong one is ignored, not the season. Anything that is not a list is ignored. |
| `id` | `^[A-Za-z0-9._~-]{1,128}$`. Anything else drops the item, so if your source's own ids have other characters (spaces, `/`, `:`, `%`), derive a stable id yourself, such as a slug. Repeated ids in one list are dropped. |
| `ref` | A non-empty string of at most 4096 characters. |
| `kind` | `"movie"`, `"series"` or (apiVersion 2) `"live"`. A `series` item from a plugin that does not declare `episodes` is dropped: it could never be opened; a `live` item from an apiVersion 1 plugin is dropped too (see [Live channels](live-channels.md#live-items)). |
| Text fields | `title` is required and non-blank, up to 200 characters. `overview` up to 2000; `lang` and `quality` up to 20 (for example `"es"`, `"1080p"`); `year` up to 10 (a number is accepted and converted). Longer text is cut; the text of `SeriesInfo` and `Episode` is cut the same way (200 characters for titles, 2000 for overviews). |
| Extra item fields | All optional; a wrong one is ignored, not the item. `genres` at most 5, each at most 30 characters; `badges` (shown as chips, e.g. `"HD"`, `"Latino"`) at most 3 of at most 20; `rating` from 0 to 10; `runtimeMinutes` from 1 to 1000; `ids.tmdb` a positive integer (Kino uses it to match your title with TMDB, to find it again from search, and to enrich its info page -- see below); `ids.imdb` matches `^tt\d{5,10}$` (also enriches a movie's info page when you have no `ids.tmdb`). An episode's `airDate` is `YYYY-MM-DD`. |
| `adult` | An item with `adult: true` is dropped: Kino has no place behind its 18+ lock for plugin titles yet. |
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
  stream still plays.
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
  the request that saves the stream to the device — and nowhere else. At most 20; names are letters, digits and
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
