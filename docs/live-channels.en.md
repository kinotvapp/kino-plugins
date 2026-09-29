# Live channels

There are two ways to give Kino live TV, and a plugin can do both:

- **`live` items** (apiVersion 2): channels mixed into your own Home rows, "Ver más" pages and search
  results, next to your movies and series.
- **The `channels` capability** (apiVersion 3): your channels in Kino's own En vivo tab, TV guide,
  channel drawer and Home "Canales en vivo" row, given one by one or as an M3U playlist with an
  XMLTV guide that Kino downloads and parses itself.

Testing them with the Node kit is on [Test it locally](test-locally.md#live).

## Live channels (apiVersion 2) { #live-items }

With `"apiVersion": 2` an item may be a live channel: `kind: "live"`, in any `home` row, `browse`
page or `search` result, next to your movies and series. Nothing to declare beyond the version.

```js
export async function home() {
  return [{
    id: "en-vivo", title: "En vivo",
    items: [
      { id: "canal-1", ref: "live:1", title: "Canal Uno", kind: "live", poster: "https://cdn.example.org/canal-1.png" },
    ],
  }];
}

export async function resolve(ref) {
  if (ref.startsWith("live:")) {
    const url = await freshPlaylistUrlFor(ref); // look the live link up here, never in home()
    return { url, mime: "application/vnd.apple.mpegurl" };
  }
  // ...movies and episodes as before
}
```

What Kino does with a `live` item:

- Its card wears an "EN VIVO" badge (Home, "Ver más", search, phone and TV), and tapping it goes
  **straight to the player**: no info page, nothing to read or pick. `resolve(ref)` gets the item's
  `ref`, exactly as for a movie.
- The `Stream` plays as live: an HLS or DASH live manifest (`.m3u8`/`.mpd`) is what the player
  expects; a progressive file plays too but reads as a channel (no seek bar, no length). `headers`,
  `subtitles` and `expiresInSeconds` work as for any stream; `durationMs` and `audioTracks` are
  ignored (a separate audio file cannot follow a live window: put a channel's other languages inside
  its manifest, e.g. HLS `EXT-X-MEDIA` renditions, and the player's audio menu offers them).
- The player shows the live overlay (no progress bar, no seeking, no "next") and starts at the live
  edge. If it falls behind the live window, or the playlist resets or stalls, it re-joins the live
  edge in place without calling you (a few times a minute). On any other cut, or when your URL
  stops working, it calls `resolve` again with the same `ref` after 2 s, then 4 s, then 8 s: three
  reopens, replenished once the channel has played for five seconds. Only after the third failed
  reopen does the person read "Se cortó la señal de &lt;canal&gt; y no volvió". `expiresInSeconds` plays
  no part for a channel: a cut always re-resolves.
- A channel is never saved: no library row, no resume position, never in "Continuar viendo", and
  never downloadable (a plugin that declares `download` gets "Este video no se puede descargar"
  for it). `runtimeMinutes` on the item is ignored; a channel has no `episodes`.

Limits: a `live` item from a plugin on `"apiVersion": 1` is dropped silently, like any invalid
item (and a row left with no items disappears), so declare `2` before you return one. A channel
still counts against the same row and page sizes as any item. These channels appear in your rows,
with your plugin's name; to put channels in Kino's En vivo tab and its "Canales en vivo" row, use
the apiVersion 3 `channels` capability ([below](#en-vivo-tab)).

## Channels in the En vivo tab (apiVersion 3) { #en-vivo-tab }

Declare `"apiVersion": 3` and the capability `"channels"`, and export `liveCategories()` and
`liveChannels({ categoryId, cursor })` (and, optionally, `guide(...)`, see [below](#live-contract)). Your channels then
appear in Kino's own En vivo tab, TV guide, channel drawer and Home "Canales en vivo" row, in a
section with your plugin's name. `channels` does not replace `search`/`home`: the manifest still
needs one of them (a plugin with only channels exports a `home()` that returns `[]`). Items of kind
`"live"` in your rows keep working; a plugin can do both. On install, and on an update that adds it,
the person reads and approves "Agrega canales en vivo a la pestaña En vivo".

## Channels from any server (`liveStreamHosts`, apiVersion 3) { #live-stream-hosts }

IPTV lists name their streams on servers you cannot know ahead of time, often plain `http` and
often a bare public IP. For that, and only that, a `channels` plugin may add:

```json
"apiVersion": 3,
"capabilities": ["home", "resolve", "channels"],
"liveStreamHosts": "any"
```

It is read only with `"apiVersion": 3` (an older manifest ignores it, like any field it does not
know). There, `"any"` is the only value and it needs the `channels` capability: otherwise the
manifest is refused with `El campo "liveStreamHosts" solo admite "any"` or
`"liveStreamHosts" necesita la capacidad "channels"`.

What it allows: **a live channel's stream** (the `url` of a channel's inline `stream`, or the `url`
`resolve` returns for a channel; items you mark as live are treated as channels) may be on **any
public host**, over `http` or `https`, a public IPv4 address included (not an IPv6 literal). The player then fetches that manifest and
its variants, segments and keys, and follows their redirects, under the same rule. The audio and
subtitle renditions the HLS manifest itself lists (`#EXT-X-MEDIA`) are part of that stream and follow
the same rule too; the `subtitles` and `audioTracks` you return in a `Stream` do not (see below).

What it never allows:

- the home network: private, loopback, link-local and carrier-grade NAT addresses, IPv6 literals,
  `localhost` and local names (`.local`, `.lan`, …), and a public name that resolves into any of
  them (refused when the player connects);
- other ports or schemes of a server the person typed: that server is reached exactly as typed,
  never "any";
- `kino.fetch`: your own requests still reach only your `hosts` and the person's servers;
- the playlist and XMLTV downloads a `{ playlist }` declaration asks Kino to make: those URLs must
  still be on your `hosts` (or the person's server);
- subtitles, audio tracks and a `drm` block's `licenseUrl`: still your `hosts` only, and every
  redirect they make is judged the same way;
- movies and episodes: a non-live `Stream` is checked exactly as before;
- images: the poster rule (http or https, never local) does not change.

The consent sheet shows it in red, "Puede reproducir canales desde cualquier servidor que indique su
lista", and an update that newly adds it waits for the person's approval, like a new host.

## The channel functions (apiVersion 3) { #live-contract }

With the `channels` capability ([above](#en-vivo-tab)) Kino calls three
more functions. Their arguments:

- `liveCategories()` gets `null`.
- `liveChannels({ categoryId, cursor })` gets the `id` of one of your categories, and `cursor` `null`
  for the first page or the `next` of the page before.
- `guide({ channelIds, from, to })` gets at most 50 of your channel ids and a window of at most
  24 hours: `from` and `to` are epoch milliseconds.

They return:

```ts
LiveCategory = { id: string, title: string, country?: string, adult?: boolean, genre?: Genre }
Playlist     = { playlist: { url: string, format: "m3u", headers?: Record<string, string>,
                             streamHeaders?: Record<string, string>, genre?: Genre,
                             epg?: { url: string, format: "xmltv" }, refreshHours?: number,
                             hideGroups?: string[], resolve?: boolean } }
LiveChannel  = { id: string, title: string, categoryId?: string, ref?: string, stream?: Stream,
                 logo?: string, number?: number, adult?: boolean }
GuideEntry   = { channelId: string, title: string, start: number, end: number, description?: string }
```

A plugin can give its channels in three ways, and mix them:

1. **A channel with a `ref`.** The `ref` goes to `resolve(ref)` when the person plays it, exactly
   like a `live` item's, and its Stream plays as live.
2. **A channel with an inline `stream`.** A `Stream` checked by the same rules as `resolve()`'s
   answer ([The `Stream` rules](contract.md#stream)); it plays with no call to your plugin. A channel whose `stream` is refused is dropped. With
   both `ref` and `stream`, the stream plays and the `ref` is only the fallback. A channel with
   neither is dropped. Some channels only answer a known player: give the `Stream` a `headers` with
   the `User-Agent` (or `Referer`) it insists on, and the player sends it with every request for that channel.
3. **A playlist.** Put `{ playlist: { ... } }` entries next to your categories in the
   `liveCategories()` answer (or return one alone). Kino downloads the M3U list itself, and its XMLTV
   guide from `epg.url`, and groups the entries into categories. Both URLs must be `https` on one of
   your `hosts` (or `http` on one declared `insecureHttp`, or a server the person typed), always:
   a playlist on another host is dropped, and an `epg` on another host only loses the guide.
   `headers` go with those downloads. `streamHeaders` are what the **player** sends for every channel of
   the list, for the channels that only answer a known `User-Agent` (or a `Referer`): they are filtered
   like a Stream's `headers` and kept apart from `headers` on purpose, because those carry your list's own
   credentials and go only to the list's host, never to the many hosts the channels are on. A header an
   M3U entry names itself (`#EXTVLCOPT:http-user-agent=...`) wins. Kino versions before the one that added
   `streamHeaders` ignore the field, so the list plays without it. `refreshHours` is 1 to 168 (default 12); `hideGroups` lists
   group titles not to show (case doesn't matter, at most 50). With `resolve: true`, each entry plays
   through your `resolve(<entry url>)`, for lists whose links need a fresh token. At most 10 per
   answer.

    Each entry gets a channel code, the key of favourites and recents: its `tvg-id` when that is a
    valid id and the entry is the **first of the list to use it**, else one made from its URL and
    name. A later entry repeating a `tvg-id` never moves the first one's code, but it gets a
    URL-and-name code itself, which changes (and its favourites and recents stop matching) when its
    URL does; a copy inserted *before* the first one takes the `tvg-id` code over. Give every entry a
    stable, unique `tvg-id`; `node sdk/run.mjs live playlist <list>` lists the repeated ones.

The rules:

- Times are epoch milliseconds.
- At most 200 categories (playlists don't count), and at most 500 channels per `liveChannels` page.
  `id` follows the item `id` pattern; an `id` starting with `~` is reserved for Kino's own playlist
  entries and dropped. A repeated `id` in one answer is dropped. `title` is required.
- `country` is an ISO 3166 two-letter code (`"CO"`), informational; anything else is ignored.
  `number` is 1 to 9999 (anything else counts as no number); `logo` follows the poster rules;
  `categoryId` is optional and informational (a channel is listed under the category
  `liveChannels` was asked for); one that is not a valid id becomes empty.
- Kino pages `liveChannels` until `next` is missing, repeats, or brings nothing new, at most 10
  pages per category.
- Kino caches your categories and channels for 1 hour and your guide for 30 minutes.
- `guide` is optional. Kino keeps entries for the channels it asked for, with `end` after `start`,
  inside the window, at most 100 per channel and one per start time. A `guide` that fails or is not
  exported is simply not asked again for 30 minutes: your channels still list.
- An `adult: true` category or channel is dropped.

## Three recipes (apiVersion 3) { #recipes }

Three ways to fill the En vivo tab, from the least code to the most control. Each is a complete
plugin (see [Channels in the En vivo tab](#en-vivo-tab) and
[The channel functions](#live-contract) for the rules).

### 1. A plain M3U list the person types { #recipe-m3u }

The person pastes the address of their list (and, if they
have one, of its guide) in Configurar; Kino downloads it, groups it and plays each entry itself.

```json
{
  "id": "mi-lista", "name": "Mi lista", "version": "1.0.0", "apiVersion": 3, "entry": "plugin.js",
  "hosts": [],
  "capabilities": ["home", "resolve", "channels"],
  "liveStreamHosts": "any",
  "settings": [
    { "key": "lista", "label": "Lista M3U", "type": "url", "required": true },
    { "key": "guia", "label": "Guía XMLTV", "type": "url" }
  ]
}
```

`"hosts": []` is enough: the list and the guide are on servers the person typed. Their streams are
not: an IPTV list points at dozens of servers nobody can declare ahead of time, which is what
`"liveStreamHosts": "any"` is for ([Channels from any server](#live-stream-hosts)).
The person sees it on the consent sheet, in red: "Puede reproducir canales desde cualquier servidor
que indique su lista". Leave it out when every stream is on hosts you can declare.

```js
// Kino downloads the list (and the guide), groups it and plays each entry by itself.
export async function liveCategories() {
  const guia = kino.config.get("guia");
  return [{
    playlist: {
      url: kino.config.get("lista"),
      format: "m3u",
      epg: guia ? { url: guia, format: "xmltv" } : undefined,
      hideGroups: ["Compras"],
    },
  }];
}

// Every channel comes from the list: no categories of your own to page.
export async function liveChannels() {
  return { items: [] };
}

// The manifest needs search or home; a plugin with only channels has an empty home.
export async function home() {
  return [];
}

// A direct list never calls resolve: its entries play as they are.
export async function resolve() {
  await null;
  throw kino.error("not_found");
}
```

```
node sdk/run.mjs . --config lista=https://iptv-org.github.io/iptv/countries/co.m3u live categories
```

### 2. A token per channel { #recipe-token }

Your API lists the channels, and each play needs a freshly signed URL.
`liveChannels` returns `{ id, title, ref }` items; `resolve(ref)` signs the URL when the person
plays it. A channel's `expiresInSeconds` is ignored: when a live stream is cut, Kino simply calls
`resolve` again.

```json
{
  "id": "mi-tv", "name": "Mi TV", "version": "1.0.0", "apiVersion": 3, "entry": "plugin.js",
  "hosts": ["api.example.com", "cdn.example.com"],
  "capabilities": ["home", "resolve", "channels"],
  "settings": [{ "key": "token", "label": "Código de acceso", "type": "password", "required": true }]
}
```

```js
const API = "https://api.example.com";

async function api(path) {
  const r = await kino.fetch(API + path, { headers: { Authorization: "Bearer " + kino.config.get("token") } });
  if (r.status === 401) throw kino.error("auth_required", "código de acceso inválido");
  if (!r.ok) throw kino.error("unavailable", "la API respondió " + r.status);
  return r.json();
}

export async function home() {
  return [];
}

export async function liveCategories() {
  const cats = await api("/categorias"); // [{ slug, nombre }]
  return cats.map((c) => ({ id: c.slug, title: c.nombre }));
}

// One page of a category. The ref is only the channel's id: the signed URL is made on play.
export async function liveChannels({ categoryId, cursor }) {
  const page = await api("/canales?categoria=" + encodeURIComponent(categoryId) + (cursor ? "&pagina=" + encodeURIComponent(cursor) : ""));
  return {
    items: page.canales.map((c) => ({ id: c.id, title: c.nombre, categoryId, ref: c.id, logo: c.logo, number: c.numero })),
    next: page.siguiente || undefined,
  };
}

// Called on every play, and again when the stream is cut: always a fresh token.
export async function resolve(ref) {
  const s = await api("/firmar/" + encodeURIComponent(ref)); // { url: "https://cdn.example.com/…?token=…" }
  return { url: s.url, mime: "application/vnd.apple.mpegurl" };
}
```

```
node sdk/run.mjs . --config token=... live channels noticias
```

### 3. Mixed { #recipe-mixed }

Your own "Destacados" category with inline `stream` items (they play with no call to
your plugin, so zapping through them is instant), plus the provider's full list declared with
`resolve: true`: Kino downloads and groups it, and each of its entries plays through your
`resolve(<entry url>)`, which appends a token.

```json
{
  "id": "mi-mezcla", "name": "Mi mezcla", "version": "1.0.0", "apiVersion": 3, "entry": "plugin.js",
  "hosts": ["api.example.com", "live.example.com", "listas.example.com"],
  "capabilities": ["home", "resolve", "channels"]
}
```

```js
// Your own featured channels: inline streams, played with no call to the plugin (fast zapping).
const DESTACADOS = [
  { id: "noticias24", title: "Noticias 24", number: 1, url: "https://live.example.com/noticias24/index.m3u8" },
  { id: "deportes", title: "Deportes", number: 2, url: "https://live.example.com/deportes/index.m3u8" },
];

export async function home() {
  return [];
}

export async function liveCategories() {
  return [
    { id: "destacados", title: "Destacados" },
    // The provider's full list: Kino downloads and groups it; each entry plays through resolve().
    {
      playlist: {
        url: "https://listas.example.com/todos.m3u",
        format: "m3u",
        epg: { url: "https://listas.example.com/guia.xml.gz", format: "xmltv" },
        resolve: true,
      },
    },
  ];
}

export async function liveChannels({ categoryId }) {
  if (categoryId !== "destacados") return { items: [] };
  return {
    items: DESTACADOS.map((c) => ({ id: c.id, title: c.title, number: c.number, categoryId, stream: { url: c.url } })),
  };
}

// Only the list's entries get here (resolve: true), with the entry's URL as the ref.
export async function resolve(url) {
  const r = await kino.fetch("https://api.example.com/token");
  if (!r.ok) throw kino.error("unavailable", "no hay token");
  const { token } = r.json();
  return { url: url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token) };
}
```

The list's streams must be on your `hosts` here (`live.example.com`), since this manifest does not
declare `"liveStreamHosts": "any"`; `live categories` counts the entries that are not as discarded.

```
node sdk/run.mjs . live categories
node sdk/run.mjs . live channels destacados
```

The published demo [Tu servidor](cookbook.md#own-server) uses all three shapes at once (channels
with a `ref`, channels with an inline `stream`, and an M3U playlist with an XMLTV guide), all on the
person's own server.
