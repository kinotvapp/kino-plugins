# Cookbook

Three complete shapes, then two short recipes for the apiVersion 2 powers that need a line on the
consent sheet. The three recipes for live channels (apiVersion 3) are on
[Live channels](live-channels.md#recipes). The first and the third shapes are, nearly line for line,
the two reference plugins Kino's own tests run end to end against a fake server.

## An HTML site with a login and hidden links { #html-login }

The site has a login form, keeps the session in a cookie, lists titles as HTML with a "next" link,
and hides each video URL with AES-128-CBC. The person's user and password are settings.

```json
{
  "id": "mi-sitio", "name": "Mi sitio", "version": "1.0.0", "apiVersion": 1, "entry": "plugin.js",
  "hosts": ["sitio.example", "cdn.example.com"],
  "capabilities": ["search", "home", "browse", "resolve"],
  "settings": [
    { "key": "user", "label": "Usuario", "type": "text", "required": true },
    { "key": "password", "label": "Contraseña", "type": "password", "required": true }
  ]
}
```

```js
const BASE = "https://sitio.example";
const KEY = "0123456789abcdef";
const IV = "abcdef9876543210";

// The cookie jar keeps the session between calls (and across restarts): log in only when needed.
async function login() {
  const probe = await kino.fetch(BASE + "/session", { redirect: "manual" });
  if (probe.status === 200) return;
  const r = await kino.fetch(BASE + "/login", {
    method: "POST",
    body: { form: { user: kino.config.get("user"), password: kino.config.get("password") } },
    redirect: "manual",
  });
  if (r.status === 401) throw kino.error("auth_required", "usuario o contraseña incorrectos");
  if (r.status !== 302) throw kino.error("unavailable", "el sitio respondió " + r.status);
}

function cards(html) {
  return kino.html.select(html, "a.card").map((a) => ({
    id: a.attrs["data-id"], ref: a.attrs["data-link"], title: a.text, kind: "movie",
  }));
}

async function page(path) {
  await login();
  const r = await kino.fetch(BASE + path);
  if (r.status === 429) throw kino.error("rate_limited", "demasiadas peticiones");
  if (!r.ok) throw kino.error("unavailable", "el sitio respondió " + r.status);
  const html = r.text();
  const next = kino.html.select(html, "a.next").map((a) => a.attrs.href)[0];
  return { items: cards(html), next: next || undefined };
}

export async function search(query) {
  return (await page("/buscar?q=" + encodeURIComponent(query.q))).items;
}

export async function home() {
  const first = await page("/catalogo");
  return [{ id: "catalogo", title: "Catálogo", ref: "/catalogo", items: first.items }];
}

export async function browse(ref, cursor) {
  return page(cursor || ref);
}

export async function resolve(ref) {
  await null;
  const url = kino.crypto.decrypt("aes-128-cbc", { key: KEY, iv: IV, data: ref });
  return { url, mime: "video/mp4" };
}
```

`kino.html.select` exists only in the app, so test this one in Kino (or with `--replay` for the
parts that do not parse HTML).

## A JSON API with a token { #json-token }

The API wants a token it gives out for an API key. Keep the token in `kino.storage`, keyed by the
key it came from, and fetch a new one when the API says it expired.

```js
const API = "https://api.example.com/v1";
const tokenKey = () => "token:" + kino.config.get("apiKey");

async function token() {
  await null;
  const saved = kino.storage.get(tokenKey());
  if (saved) return saved;
  const r = await kino.fetch(API + "/token", { method: "POST", body: { json: { key: kino.config.get("apiKey") } } });
  if (r.status === 401) throw kino.error("auth_required", "la clave no sirve");
  if (!r.ok) throw kino.error("unavailable", "la API respondió " + r.status);
  const t = r.json().token;
  kino.storage.set(tokenKey(), t);
  return t;
}

async function api(path) {
  const r = await kino.fetch(API + path, { headers: { Authorization: "Bearer " + (await token()) } });
  if (r.status === 401) { kino.storage.remove(tokenKey()); throw kino.error("auth_required", "el token venció"); }
  if (r.status === 404) throw kino.error("not_found");
  if (r.status === 429) throw kino.error("rate_limited");
  if (r.status === 451) throw kino.error("geo_blocked");
  if (!r.ok) throw kino.error("unavailable", "la API respondió " + r.status);
  return r.json();
}

export async function search(query) {
  const p = await api("/search?q=" + encodeURIComponent(query.q) + (query.cursor ? "&page=" + query.cursor : ""));
  return {
    items: p.results.map((x) => ({ id: String(x.id), ref: String(x.id), title: x.title, kind: "movie", ids: { tmdb: x.tmdb } })),
    next: p.nextPage ? String(p.nextPage) : undefined,
  };
}

export async function resolve(ref) {
  const s = await api("/play/" + encodeURIComponent(ref));
  return { url: s.url, expiresInSeconds: 3600 };
}
```

Manifest: `"hosts": ["api.example.com"]`, `"capabilities": ["search", "browse", "resolve"]` (a
`next` in a search page needs `browse`), and one setting
`{ "key": "apiKey", "label": "Clave de la API", "type": "password", "required": true }`. Since
`browse` is declared it must be exported too; `export async function browse(ref, cursor) { throw
kino.error("not_found"); }` is enough when only search pages.

## The person's own server { #own-server }

A media server at home (Jellyfin, Emby, a NAS…): the person types its address, user and password.
The address becomes an allowed host for that install, `http` and a LAN address included; streams,
posters and stills may point at it. This is the published demo plugin **Tu servidor**
([kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server), with a
reference server to run it against), which uses every apiVersion 3 feature a server of your own
can: seasons, `download`, `audioTracks`, `live` items, a `kino.storage` TTL, `kino.rank`,
`ids.tmdb`, and `channels` in all three shapes (channels with a `ref`, channels with an inline
`stream`, and an M3U playlist with an XMLTV guide). What follows is, line for line, its real
[`kino-plugin.json`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/kino-plugin.json)
and [`plugin.js`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js): it is
the reference plugin for anything beyond the five basic capabilities (see
[Example plugins](examples.md#reference-plugin)).

```json
{
  "id": "own-server", "name": "Tu servidor", "version": "1.2.0", "apiVersion": 3, "entry": "plugin.js",
  "hosts": [],
  "capabilities": ["search", "home", "browse", "episodes", "resolve", "download", "channels"],
  "settings": [
    { "key": "server", "label": "Servidor", "type": "url", "required": true, "hint": "http://192.168.1.10:8096" },
    { "key": "user", "label": "Usuario", "type": "text", "required": true },
    { "key": "password", "label": "Contraseña", "type": "password", "required": true },
    { "key": "hd", "label": "Solo HD", "type": "toggle" }
  ]
}
```

`hosts` is empty: the plugin reaches only the server the person types (allowed from apiVersion 2
with a `url` setting, see [The person's own servers](manifest.md#own-servers)). Up to 1.1.1 the
demo declared the placeholder `"tu-servidor.invalid"` for Kino builds from before that rule; 1.2.0
is apiVersion 3, which those builds refuse anyway, so it declares none. Every channel list, guide
and stream is on that same server, so it needs no `"liveStreamHosts": "any"`. Then:

```js
const base = () => String(kino.config.get("server")).replace(/\/+$/, "");

// Everything cached in kino.storage belongs to one user on one server: storage survives a change
// in Configurar, so a key without them would hand the old server's answers to the new one.
const scope = () => kino.config.get("user") + "@" + base();

// The token does NOT change when only the password changes for the same user@server -- a
// still-valid token keeps working, exactly like a real session would, until the server rejects it.
const tokenKey = () => "token:" + scope();

async function token() {
  await null;
  const saved = kino.storage.get(tokenKey());
  if (saved) return saved;
  const r = await kino.fetch(base() + "/auth", {
    method: "POST",
    body: { json: { user: kino.config.get("user"), password: kino.config.get("password") } },
  });
  if (r.status === 401) throw kino.error("auth_required", "usuario o contraseña incorrectos");
  if (!r.ok) throw kino.error("unavailable", "el servidor respondió " + r.status);
  const t = r.json().token;
  kino.storage.set(tokenKey(), t);
  return t;
}

// Every request goes through here, so a token invalidated server-side (expired, revoked, or a
// stale one from before a real password change) is forgotten and asked for again on the next call.
async function api(path) {
  const r = await kino.fetch(base() + path, { headers: { "X-Token": await token() } });
  if (r.status === 401) { kino.storage.remove(tokenKey()); throw kino.error("auth_required", "la sesión venció"); }
  if (r.status === 404) throw kino.error("not_found");
  if (r.status === 429) throw kino.error("rate_limited");
  if (r.status === 451) throw kino.error("geo_blocked");
  if (!r.ok) throw kino.error("unavailable", "el servidor respondió " + r.status);
  return r.json();
}

// Artwork lives on the same typed server, so `http` and a LAN address are fine here too. Posters
// are 2:3 (the cards), backdrops 16:9 (the info page's background, and each episode's still).
const art = (shape, id) => base() + "/img/" + shape + "/" + encodeURIComponent(id) + ".png";
const poster = (id) => art("poster", id);
const backdrop = (id) => art("backdrop", id);

// `kind` comes from the server: "movie", "series" (one season of a show) or "live" (apiVersion 2).
// `ids.tmdb` only when the server knows it: Kino then matches the title with TMDB and fills in its
// info page (cast, director, tagline...).
const item = (x) => ({
  id: x.id,
  ref: x.id,
  title: x.title,
  kind: x.kind,
  year: x.year,
  poster: poster(x.id),
  backdrop: backdrop(x.id),
  ids: x.tmdb ? { tmdb: x.tmdb } : undefined,
});

// Home rows, one per kind; each row's ref is the kind, which browse() pages through.
const ROWS = [
  { id: "novedades", title: "Novedades", kind: "movie" },
  { id: "series", title: "Series", kind: "series" },
  { id: "en-vivo", title: "En vivo", kind: "live" },
];

// Home asks the server three times; the answer is kept for 15 minutes with a storage TTL, so
// opening Kino again right away costs no request. An expired entry reads as null by itself.
const HOME_TTL_MS = 15 * 60 * 1000;

export async function home() {
  const key = "home:" + scope();
  const cached = kino.storage.get(key);
  if (cached) return JSON.parse(cached);
  const rows = [];
  for (const row of ROWS) {
    const p = await api("/items?limit=10&kind=" + row.kind);
    if (p.items.length) rows.push({ id: row.id, title: row.title, ref: row.kind, items: p.items.map(item) });
  }
  kino.storage.set(key, JSON.stringify(rows), { ttlMs: HOME_TTL_MS });
  return rows;
}

export async function browse(ref, cursor) {
  const p = await api("/items?limit=10&kind=" + encodeURIComponent(ref) + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
  return { items: p.items.map(item), next: p.next || undefined };
}

// The server matches ANY word of the query, so "Serie de prueba" also brings "Video de prueba 1".
// kino.rank turns that into a title search: ask with the title's head, drop the stray-word hits,
// best match first -- trying every form of the title Kino knows.
export async function search(query) {
  if (!query.q.trim()) return [];
  const titles = [query.q, query.originalTitle, ...(query.altTitles || [])].filter(Boolean);
  const found = (await api("/items?limit=50&q=" + encodeURIComponent(kino.rank.shortQuery(query.q)))).items;
  const relevant = kino.rank.filterRelevant(found, titles);
  return kino.rank.sortBySimilarity(relevant, titles).map(item);
}

// Each season is its own title on this server, so the answer lists every season of the show in
// `seasons` (the one being answered marked `current`): Kino shows them as chips and calls
// episodes() again with the chosen season's ref.
export async function episodes(ref) {
  const x = await api("/items/" + encodeURIComponent(ref));
  if (x.kind !== "series") throw kino.error("not_found");
  return {
    series: { title: x.show.title, overview: x.show.overview, poster: poster(x.id), backdrop: backdrop(x.id) },
    episodes: x.episodes.map((e) => ({ season: x.season, number: e.number, ref: e.id, title: e.title, still: backdrop(e.id) })),
    seasons: x.seasons.map((s) => ({
      id: s.id,
      ref: s.id,
      title: "Temporada " + s.number,
      number: s.number,
      current: s.id === x.id,
    })),
  };
}

// Movies and episodes are progressive mp4 files, so with `download` declared Kino can save them;
// the live channel is HLS and plays as live (never downloadable). A movie with a separate audio
// file gets it as an `audioTracks` entry, merged by the player and picked in its audio menu.
export async function resolve(ref) {
  const x = await api("/items/" + encodeURIComponent(ref));
  if (x.kind === "live") return { url: base() + x.stream, mime: "application/vnd.apple.mpegurl" };
  const hd = kino.config.get("hd");
  const stream = {
    url: base() + x.stream + (hd ? "?quality=hd" : ""),
    mime: "video/mp4",
    // The stream URL is short-lived on the reference server: resolve again once it is stale.
    expiresInSeconds: 600,
  };
  if (x.audio && x.audio.length) {
    stream.audioTracks = x.audio.map((a) => ({ lang: a.lang, label: a.label, url: base() + a.stream }));
  }
  return stream;
}

// channels (apiVersion 3), all three shapes in one answer: Noticias with a `ref` (played through
// resolve() above), Deportes with an inline `stream` (no plugin call on play), and a playlist Kino
// downloads and parses itself, sent with the token and hiding one group.
export async function liveCategories() {
  const categories = await api("/channels/categories");
  return [
    ...categories,
    { playlist: {
      url: base() + "/lista.m3u", format: "m3u",
      headers: { "X-Token": await token() },
      epg: { url: base() + "/guia.xml.gz", format: "xmltv" },
      refreshHours: 1,
      hideGroups: ["Compras"],
    } },
  ];
}

export async function liveChannels({ categoryId }) {
  const page = await api("/channels?category=" + encodeURIComponent(categoryId));
  return {
    items: page.items.map((c) => {
      const channel = { id: c.id, title: c.title, number: c.number, categoryId: c.categoryId, logo: poster(c.id) };
      if (categoryId === "deportes") channel.stream = { url: base() + "/live/" + c.id + ".m3u8", mime: "application/vnd.apple.mpegurl" };
      else channel.ref = c.id;
      return channel;
    }),
  };
}

export async function guide({ channelIds, from, to }) {
  return api("/channels/guide?ids=" + encodeURIComponent(channelIds.join(",")) + "&from=" + from + "&to=" + to);
}
```

Try it under Node with `--config server=http://192.168.1.10:8096 --config user=ana --config
password=…` (or `sdk/config.json`, kept out of git), from your computer's LAN address, not
`127.0.0.1`: a loopback address is refused even as the person's own server. `node sdk/run.mjs .
live categories` then shows the two categories and the playlist as Kino reads it ("3 canales en 1
categorías; 0 entradas descartadas; 2 ocultas (adultos)").

## A Widevine-protected stream (apiVersion 2) { #widevine }

Your source serves DASH or HLS encrypted with Widevine and hands out a license from its own server.
Declare `"apiVersion": 2` and `"drm"` in `capabilities`, list the license server in `hosts`, and
return a `drm` block with the `Stream`:

```json
{
  "id": "mi-servicio", "name": "Mi servicio", "version": "1.0.0", "apiVersion": 2, "entry": "plugin.js",
  "hosts": ["api.example.com", "cdn.example.com", "license.example.com"],
  "capabilities": ["search", "resolve", "drm"]
}
```

```js
export async function resolve(ref) {
  const s = await api("/play/" + encodeURIComponent(ref)); // { mpd, licenseToken }
  return {
    url: s.mpd, // https://cdn.example.com/…/manifest.mpd
    mime: "application/dash+xml",
    drm: {
      type: "widevine",
      licenseUrl: "https://license.example.com/widevine",
      licenseHeaders: { Authorization: "Bearer " + s.licenseToken },
    },
    expiresInSeconds: 3600,
  };
}
```

What Kino does with it, and what it does not:

- `licenseUrl` must pass the same check as `url`: `https` on one of your `hosts` (or the person's own
  server as typed), never an IP or a local name; the license request itself goes through the same
  host gate as the segments, with `licenseHeaders` (filtered like `headers`, at most 20) on it and
  nothing else. `headers` are not sent to the license server, and `licenseHeaders` are not sent to
  the CDN.
- `type` must be `"widevine"`: PlayReady, FairPlay and ClearKey are not offered. Without the `drm`
  capability, or with any other DRM-shaped key (`license`, `licenseUrl`, `drmLicenseUrl`, `keySystem`,
  `widevine`) in the `Stream`, the stream is refused as it always was.
- Kino asks Widevine for security level **L3** (software) so the same player, surface and decoder
  as a clear stream are used, and plays **only if the device confirms L3**: a device that stays at
  L1 (or won't say) opens no session at all and shows the message below. A license server that
  refuses L3, or grants it only SD, gives the person SD or that same message: check your server's
  policy before you ship.
- `audioTracks` next to `drm`: the video is protected, the side audio files are played **clear** --
  no license is requested for them, so they must be plain, unencrypted files (an encrypted side
  file fails the whole playback with the message below). `subtitles` and `headers` work as always.
- When the license is refused, unreachable or expired, or the device has no Widevine (or no L3), the
  person reads "No se pudo abrir este video protegido" (after one more `resolve` if `expiresInSeconds`
  had passed, like any stream). A protected live channel reads the same at once on a device with no
  L3; its other license failures are cuts, re-resolved like any other (see [Live channels](live-channels.md#live-items)). A protected title is **never downloadable** ("Este video no se puede
  descargar"), even with `download` declared, and cannot be sent to a Chromecast (no plugin title can).
- The consent sheet adds "Reproduce video protegido (DRM)" when `drm` is declared, and an update that
  newly declares it waits for the person's approval ([Publishing](publish.md#updates)).

To test without a real service, a public Widevine test stream works: the manifest at
`https://storage.googleapis.com/wvmedia/cenc/h264/tears/tears.mpd` with the license server
`https://proxy.uat.widevine.com/proxy?provider=widevine_test` (declare `storage.googleapis.com` and
`proxy.uat.widevine.com` in `hosts`; no `licenseHeaders` needed).

## A site of yours without a certificate (apiVersion 2) { #insecure-site }

Your videos sit on a server of yours that only speaks plain `http` -- a CDN box with no certificate,
an old media server on a public name. Declare `"apiVersion": 2` and mark that one host
`insecureHttp` in `hosts`; nothing changes in your code beyond the scheme:

```json
{
  "id": "mi-cdn", "name": "Mi CDN", "version": "1.0.0", "apiVersion": 2, "entry": "plugin.js",
  "hosts": ["api.example.com", { "host": "cdn.example.com", "insecureHttp": true }],
  "capabilities": ["search", "resolve"]
}
```

```js
export async function resolve(ref) {
  const s = await api("/play/" + encodeURIComponent(ref)); // over https, api.example.com
  return {
    url: "http://cdn.example.com/videos/" + s.file,           // plain http: only because cdn.example.com is insecureHttp
    subtitles: s.subs.map((x) => ({ lang: x.lang, url: "http://cdn.example.com/subs/" + x.file })),
  };
}
```

What the flag does, and what it does not:

- Only `cdn.example.com`, exactly, accepts `http`: for `kino.fetch`, a `Stream`'s `url`, `subtitles`,
  `audioTracks` and a `drm` block's `licenseUrl`, and for every redirect hop that lands on it.
  `api.example.com` stays https-only, and so does `sub.cdn.example.com` (no wildcard, no subdomains).
  `https://cdn.example.com/…` keeps working too.
- Everything else about a declared host holds: a public DNS name (no IP, no `localhost`, nothing
  `.local`/`.lan`), and a name that resolves into the person's own network is refused at request
  time. For a server at home the person types in a `url` setting instead (see
  [The person's own server](#own-server)): that path takes `http` without this flag.
- The consent sheet adds, in red, "Conexión sin cifrar con cdn.example.com", so the person knows
  that traffic can be read on the way; an update that newly marks an already-approved host
  `insecureHttp` waits for approval ([Publishing](publish.md#updates)). Prefer `https` whenever
  the server can: the flag is for the host that cannot.
