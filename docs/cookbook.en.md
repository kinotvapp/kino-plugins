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
posters and stills may point at it. This is the published demo plugin **Tu servidor** 1.5.0
([kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server), with a
reference server to run it against), which uses every feature up to apiVersion 7 (Kino 0.9.51) a
server of your own can: seasons, `download`, `audioTracks`, `subtitles`, `durationMs` and `skip`,
`live` items, `kino.storage` with a TTL, `kino.rank`, `ids`, `channels` in every shape (a `ref`, an
inline `stream`, an M3U playlist with an XMLTV guide, a `resolve: true` playlist, `liveSearch` and
paging), the apiVersion 6 set (a section with tabs, Categorías tiles, `scopedSearch`, `migrate`,
`adult` entries, labelled and lazy copies, request-signed HLS, the full settings form, `telemetry`,
`userMessage`) and the apiVersion 7 capabilities `tracking` and `segments`, plus `meta` with a logo,
ratings and cast and `subtitles` with Kino 0.9.51's `file` hint. It is the reference plugin for
anything beyond the five basic capabilities; [Example plugins](examples.md#reference-plugin) maps
every feature to its function. Its real
[`kino-plugin.json`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/kino-plugin.json):

```json
{
  "id": "own-server",
  "name": "Tu servidor",
  "version": "1.5.0",
  "apiVersion": 7,
  "entry": "plugin.js",
  "description": "Ve el contenido de tu propio servidor de video, con sus canales y subtítulos, y cuéntale qué ves. Necesita que escribas su dirección.",
  "author": "kinotvapp",
  "homepage": "https://github.com/kinotvapp/kino-plugin-own-server",
  "hosts": [],
  "capabilities": [
    "search",
    "home",
    "browse",
    "episodes",
    "resolve",
    "download",
    "channels",
    "scopedSearch",
    "migrate",
    "meta",
    "subtitles",
    "tracking",
    "segments"
  ],
  "categories": ["movies", "series", "live", "subtitles", "utilities"],
  "discoverable": true,
  "debug": false,
  "telemetry": true,
  "section": { "label": "Tu servidor" },
  "theme": { "accent": "#2BB68F", "onAccent": "#06201A", "background": "#0B1513", "surface": "#15241F", "highlight": "#E8F5F0" },
  "settings": [
    { "key": "cuenta", "label": "Tu servidor", "type": "section", "hint": "Escribe la dirección de tu servidor (Jellyfin, Emby, un NAS…) tal como la abres en el navegador de tu casa, con su puerto, y tu usuario y contraseña de ese servidor. Kino solo se conecta a esa dirección y a las otras que pongas abajo." },
    { "key": "server", "label": "Servidor", "type": "url", "required": true, "hint": "http://192.168.1.10:8096" },
    { "key": "user", "label": "Usuario", "type": "text", "required": true },
    { "key": "password", "label": "Contraseña", "type": "password", "required": true },
    { "key": "estado", "label": "Conexión", "type": "status" },
    { "key": "probar", "label": "Probar conexión", "type": "action" },
    { "key": "salir", "label": "Cerrar sesión", "type": "action", "confirm": "¿Cerrar la sesión en tu servidor? Kino vuelve a entrar con tu usuario la próxima vez." },
    { "key": "reproduccion", "label": "Reproducción", "type": "section", "hint": "Cómo pedir los videos y cada cuánto revisar lo nuevo de tu servidor." },
    { "key": "hd", "label": "Solo HD", "type": "toggle" },
    { "key": "homeTtl", "label": "Revisar lo nuevo", "type": "select", "default": "15",
      "options": [{ "value": "5", "label": "Cada 5 minutos" }, { "value": "15", "label": "Cada 15 minutos" }, { "value": "60", "label": "Cada hora" }] },
    { "key": "addresses", "label": "Otras direcciones del mismo servidor", "type": "list", "max": 5,
      "fields": [
        { "key": "url", "label": "Dirección", "type": "url", "required": true, "hint": "https://mi-servidor.example.org" },
        { "key": "label", "label": "Nombre", "type": "text", "hint": "Desde fuera de casa" }
      ] },
    { "key": "canales", "label": "Canales en vivo", "type": "section", "hint": "Algunos canales solo responden a un reproductor conocido: escribe aquí el User-Agent que piden." },
    { "key": "userAgent", "label": "User-Agent de los canales", "type": "text", "hint": "VLC/3.0.20 LibVLC/3.0.20" },
    { "key": "quitarAgente", "label": "Usar el User-Agent de Kino", "type": "action" },
    { "key": "avisos", "label": "Lo que ves", "type": "section", "hint": "Kino le cuenta a tu servidor qué ves en este aparato y cuándo lo terminas, para que marque lo visto como lo hace su propia app. Apágalo cuando quieras con el interruptor «Enviar lo que veo» de esta misma pestaña." },
    { "key": "ultimoAviso", "label": "Último aviso", "type": "status" }
  ],
  "color": "#1F8A70",
  "icon": "icon.png"
}
```

`hosts` is empty: the plugin reaches only the server the person types and the other addresses of
that server they list (allowed from apiVersion 2 with a `url` setting, see
[The person's own servers](manifest.md#own-servers)). Every channel list, guide and stream is on that
same server, so it needs no `"liveStreamHosts": "any"`. `"apiVersion": 7` makes Kino 0.9.50 and older
refuse it ("Este plugin necesita una versión más nueva de Kino"); declare the lowest number that has
what you use.

What follows is, line for line, the core of its real
[`plugin.js`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js): the requests ([`reach`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js#L56-L74) falls back to the other addresses,
`api` turns every status into a typed error), the listing and the playing. The rest -- copies,
signing, channels, the section, `migrate`, `meta`, `subtitles`, the settings form -- is in the same
file, one function per feature.

```js
const VERSION = "1.5.0";
const HLS = "application/vnd.apple.mpegurl";

const trimSlash = (u) => String(u).replace(/\/+$/, "");
const base = () => trimSlash(kino.config.get("server") || "");
const enc = encodeURIComponent;

// The other addresses of the SAME server (the `list` setting "addresses": its LAN address and its public
// name, say). Each `url` field is an allowed host too. Used three ways: the API falls back to them when
// the main address does not answer (`reach`), every file gets them as labelled copies (`withAddresses`),
// and the signed video as `alternateHosts` (`signedStream`).
const addresses = () =>
  (kino.config.get("addresses") || []).map((a) => ({ url: trimSlash(a.url), label: (a.label || "").trim() || new URL(a.url).host }));

// Everything cached in kino.storage belongs to one user on one server: storage survives a change
// in Configurar, so a key without them would hand the old server's answers to the new one.
const scope = () => kino.config.get("user") + "@" + base();

// The token does NOT change when only the password changes for the same user@server -- a
// still-valid token keeps working, exactly like a real session would, until the server rejects it.
const tokenKey = () => "token:" + scope();

// Who is asking, the way a Jellyfin client says it: Kino's version and language, this plugin's version, and
// a random id for this install (kino.crypto.uuid, kept in kino.storage: per device, never in a setting --
// settings travel to the person's other devices). Headers only, so the Node kit's recordings still match.
function clientHeaders() {
  let id = kino.storage.get("client-id");
  if (!id) kino.storage.set("client-id", (id = kino.crypto.uuid()));
  return {
    "X-Client": `Kino/${kino.appVersion} own-server/${VERSION} api/${kino.apiVersion}`,
    "X-Client-Id": id,
    "Accept-Language": kino.lang,
  };
}

// One request, to the main address and, when it does not answer at all (network or timeout), to the other
// addresses in order. A fallback is a degraded result even though the call works: kino.log.report tells
// Kino's error tracker (the manifest declares `"telemetry": true`), at most once an hour per area.
async function reach(path, init = {}) {
  const options = { ...init, headers: { ...clientHeaders(), ...init.headers } };
  try {
    return await kino.fetch(base() + path, options);
  } catch (e) {
    if (e.code !== "network" && e.code !== "timeout") throw e;
    const others = addresses();
    for (let i = 0; i < others.length; i++) {
      try {
        const r = await kino.fetch(others[i].url + path, options);
        kino.log.report("own_server:address", "main_unreachable", "fallback=" + (i + 1));
        return r;
      } catch (again) {
        if (again.code !== "network" && again.code !== "timeout") throw again;
      }
    }
    throw e;
  }
}

async function token() {
  await null;
  const saved = kino.storage.get(tokenKey());
  if (saved) return saved;
  const r = await reach("/auth", {
    method: "POST",
    body: { json: { user: kino.config.get("user"), password: kino.config.get("password") } },
  });
  if (r.status === 401) throw kino.error("auth_required", "usuario o contraseña incorrectos");
  if (!r.ok) throw kino.error("unavailable", "el servidor respondió " + r.status);
  const t = r.json().token;
  kino.storage.set(tokenKey(), t);
  return t;
}

// Every request goes through here. A token invalidated server-side (expired, revoked, or a stale one
// from before a real password change) is forgotten and the request tried once more with a fresh login.
// A 429 that asks to wait at most 3 s is waited out once with kino.sleep (the wait counts inside the
// call's own time limit). Every other failure becomes one of Kino's typed errors.
async function api(path, { method = "GET", body, headers = {}, timeoutMs } = {}) {
  const send = async () => reach(path, { method, body, timeoutMs, headers: { ...headers, "X-Token": await token() } });
  let r = await send();
  if (r.status === 401) {
    kino.storage.remove(tokenKey());
    r = await send();
  }
  const wait = Number(r.headers["retry-after"]);
  if (r.status === 429 && wait > 0 && wait <= 3) {
    await kino.sleep(wait * 1000);
    r = await send();
  }
  if (r.status === 401) { kino.storage.remove(tokenKey()); throw kino.error("auth_required", "la sesión venció"); }
  if (r.status === 400 || r.status === 404) throw kino.error("not_found", "el servidor respondió " + r.status);
  if (r.status === 429) throw kino.error("rate_limited");
  // Kino words the other codes itself; this one says more, as "Mensaje de Tu servidor: …" (kino.error's userMessage).
  if (r.status === 451) throw kino.error("geo_blocked", "el servidor respondió 451", { userMessage: "Tu servidor no deja ver este título desde esta red." });
  if (!r.ok) throw kino.error("unavailable", "el servidor respondió " + r.status);
  return r.status === 204 ? null : r.json();
}

// Artwork lives on the same typed server, so `http` and a LAN address are fine here too. Posters
// are 2:3 (the cards), backdrops 16:9 (the info page's background, and each episode's still), the
// logo a clear-logo on a transparent background (meta's `logo`).
const art = (shape, id) => base() + "/img/" + shape + "/" + enc(id) + ".png";
const poster = (id) => art("poster", id);
const backdrop = (id) => art("backdrop", id);

// `kind` comes from the server: "movie", "series" (one season of a show) or "live" (apiVersion 2).
// `ids` only when the server knows them: Kino then matches the title with TMDB and fills in its
// info page (cast, director, tagline...). `adult: true` (apiVersion 6) keeps it behind the person's 18+ code.
const item = (x) => ({
  id: x.id,
  ref: x.id,
  title: x.title,
  kind: x.kind,
  year: x.year,
  poster: poster(x.id),
  backdrop: backdrop(x.id),
  overview: x.overview,
  genres: x.genres ? x.genres.slice(0, 5) : undefined,
  rating: x.rating,
  runtimeMinutes: x.kind === "live" ? undefined : x.runtime,
  badges: x.badges,
  quality: x.quality,
  lang: x.lang,
  ids: x.tmdb || x.imdb ? { tmdb: x.tmdb, imdb: x.imdb } : undefined,
  adult: x.adult || undefined,
});

// A browse ref (a Home or section row, a Categorías tile) as the server's filter: a kind, or "genre:<id>".
function refFilter(ref) {
  if (ref === "movie" || ref === "series" || ref === "live") return "kind=" + ref;
  const genre = /^genre:([a-z0-9-]+)$/.exec(ref);
  return genre ? "genre=" + genre[1] : null;
}

// Home rows, one per kind; each row's ref is the kind, which browse() pages through. `genre` lines the
// rows up with other plugins' in Categorías and the En vivo filter (the live row leaves it to Kino's guess).
const ROWS = [
  { id: "novedades", title: "Novedades", kind: "movie", genre: "peliculas" },
  { id: "series", title: "Series", kind: "series", genre: "series" },
  { id: "en-vivo", title: "En vivo", kind: "live" },
];

// Home asks the server three times; the answer is kept with a storage TTL the person picks ("Revisar lo
// nuevo", a `select` setting), so opening Kino again right away costs no request. An expired entry reads
// as null by itself. A copy without TTL ("home-last:") is the fallback when the server is down.
export async function home() {
  const key = "home:" + scope();
  const cached = kino.storage.get(key);
  if (cached) return JSON.parse(cached);
  let rows;
  try {
    rows = [];
    for (const row of ROWS) {
      const p = await api("/items?limit=10&kind=" + row.kind);
      if (p.items.length) rows.push({ id: row.id, title: row.title, ref: row.kind, genre: row.genre, items: p.items.map(item) });
    }
  } catch (e) {
    const last = kino.storage.get("home-last:" + scope());
    if (!last || !["unavailable", "network", "timeout"].includes(e.code)) throw e;
    kino.log.report("own_server:home", "stale_rows", e.code);
    return JSON.parse(last);
  }
  const minutes = Number(kino.config.get("homeTtl")) || 15;
  kino.storage.set(key, JSON.stringify(rows), { ttlMs: minutes * 60 * 1000 });
  kino.storage.set("home-last:" + scope(), JSON.stringify(rows));
  return rows;
}

export async function browse(ref, cursor) {
  const filter = refFilter(ref);
  if (!filter) throw kino.error("not_found", "fila desconocida");
  const p = await api("/items?limit=10&" + filter + (cursor ? "&cursor=" + enc(cursor) : ""));
  return { items: p.items.map(item), next: p.next || undefined };
}

// The server matches ANY word of the query, so "Serie de prueba" also brings "Video de prueba 1".
// kino.rank turns that into a title search: ask with the title's head, drop the stray-word hits,
// best match first -- trying every form of the title Kino knows. `type` is only a hint: the kind it
// names goes first, nothing is dropped for it. The answer is a Page: its `next` gets "Ver más resultados".
// With `within` (the `scopedSearch` capability) the person is searching inside one of this plugin's
// "Ver más" pages: the server searches that row's kind or genre only; null for a ref it cannot search.
export async function search(query) {
  if (query.within !== undefined) {
    const filter = refFilter(query.within);
    if (!filter) return null;
    const p = await api("/items?limit=50&" + filter + "&q=" + enc(query.q) + (query.cursor ? "&cursor=" + enc(query.cursor) : ""));
    return { items: kino.rank.filterRelevant(p.items, query.q).map(item), next: p.next || undefined };
  }
  if (!query.q.trim()) return [];
  const titles = [query.q, query.originalTitle, ...(query.altTitles || [])].filter(Boolean);
  const p = await api("/items?limit=50&q=" + enc(kino.rank.shortQuery(query.q)) + (query.cursor ? "&cursor=" + enc(query.cursor) : ""));
  const best = kino.rank.sortBySimilarity(kino.rank.filterRelevant(p.items, titles), titles);
  const wanted = query.type === "movie" || query.type === "series" ? query.type : null;
  const ordered = wanted ? [...best.filter((x) => x.kind === wanted), ...best.filter((x) => x.kind !== wanted)] : best;
  return { items: ordered.map(item), next: p.next || undefined };
}

// Each season is its own title on this server, so the answer lists every season of the show in
// `seasons` (the one being answered marked `current`): Kino shows them as chips and calls
// episodes() again with the chosen season's ref.
export async function episodes(ref) {
  const x = await api("/items/" + enc(ref));
  if (x.kind !== "series") throw kino.error("not_found");
  return {
    series: { title: x.show.title, overview: x.show.overview, poster: poster(x.id), backdrop: backdrop(x.id), genres: x.genres, year: x.year },
    episodes: x.episodes.map((e) => ({
      season: x.season, number: e.number, ref: e.id, title: e.title, still: backdrop(e.id),
      overview: e.overview, airDate: e.airDate, runtimeMinutes: e.runtime,
    })),
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
// the live channels are HLS and play as live (never downloadable). A movie with a separate audio
// file gets it as an `audioTracks` entry, merged by the player and picked in its audio menu; its
// subtitles go in `subtitles`; its length in `durationMs` and, when the server knows where THIS file's
// opening and ending are, `skip` ("Saltar intro" / "Saltar outro").
// `options.retry` (apiVersion 6) comes only after the origin refused a signed stream: see signedStream.
export async function resolve(ref, options) {
  // An entry of the list declared with `resolve: true` (liveCategories): its link needs the token.
  if (/\/channels\/[^/]+\/play$/.test(ref)) return resolveListEntry(ref);
  // A lazy copy's own ref ("<title>|<copy>", see below): Kino asks for it only when the person picks that
  // copy in the player's Servidor menu, the fallback reaches it or a download's copy choice does.
  if (ref.includes("|")) return resolveCopy(ref);
  const retry = options && options.retry;
  if (retry) kino.log("resolve: retry", retry.reason, retry.attempt, retry.status || "-");
  const x = await api("/items/" + enc(ref) + (retry ? "?fresh=1" : ""));
  if (x.kind === "live") return { url: base() + x.stream, mime: HLS, headers: agentHeaders() };
  if (x.hls) return signedStream(x);
  const path = x.stream + (kino.config.get("hd") ? "?quality=hd" : "");
  const stream = {
    url: base() + path,
    mime: "video/mp4",
    // The token is short-lived server-side (see server.mjs); resolve again once it's stale.
    expiresInSeconds: 600,
  };
  if (x.durationMs) stream.durationMs = x.durationMs;
  if (x.skip) stream.skip = x.skip;
  if (x.subtitles && x.subtitles.length) {
    stream.subtitles = x.subtitles.map((s) => ({ lang: s.lang, url: base() + s.file, format: s.format }));
  }
  if (x.audio && x.audio.length) {
    stream.audioTracks = x.audio.map((a) => ({ lang: a.lang, label: a.label, url: base() + a.stream }));
  }
  if (x.copies && x.copies.length) return withCopies(ref, stream, x.copies);
  return withAddresses(stream, path);
}
```

The apiVersion 7 exports, [`track and segments`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js#L557-L591): the server marks what is in its library
as watched, like its own app, and knows where each title's intro and credits are.

```js
// `tracking` (apiVersion 7, approved in red: "Le contará al servidor que escribas en su configuración qué
// ves y cuándo lo terminas"): Kino calls track() for every movie or episode played on this device, from any
// source, and keeps the event in its own queue until it is delivered (offline, app closed...). The server
// marks what is in its library as watched, like its own app. The event id is the idempotency key. What the
// error codes mean to Kino: `unavailable`/`rate_limited` (and network trouble) retry later, in order;
// `auth_required`/`not_found` drop the event. Log the outcome, never the title.
export async function track(event) {
  const answer = await api("/playing", { method: "POST", body: { json: event }, headers: { "Idempotency-Key": event.id } });
  kino.log("track:", event.type, answer && answer.ignored ? "skipped" : "delivered");
  // A title the server does not have (it played from another source) is of no use to it: dropped, but not
  // counted as a delivery (only a real one clears the red "No pudo avisar…" line in Ajustes).
  return answer && answer.ignored ? { skipped: true } : { ok: true };
}

// `segments` (apiVersion 7): where a title's intro and credits are, for "Saltar intro" / "Saltar outro" on ANY
// movie or episode Kino knows by id, the way an intro-skipper plugin of a media server knows them. Asked in the
// background once the file plays; `durationMs` is that file's length, so the server answers for that cut.
// For an episode `ids` are the episode's own and may be empty: the show's ids + season + episode then.
// (This plugin's own files carry `skip` in their Stream instead, which wins over any segments answer.)
export async function segments({ kind, ids, show, season, episode, durationMs }) {
  const q = new URLSearchParams();
  let known = false;
  if (ids.imdb) { q.set("imdb", ids.imdb); known = true; }
  if (ids.tmdb) { q.set("tmdb", String(ids.tmdb)); known = true; }
  if (kind === "episode" && show) {
    if (show.ids.imdb) { q.set("showImdb", show.ids.imdb); known = true; }
    if (show.ids.tmdb) { q.set("showTmdb", String(show.ids.tmdb)); known = true; }
    q.set("season", String(season));
    q.set("episode", String(episode));
  }
  if (!known) return null;
  if (durationMs) q.set("duration", String(durationMs));
  const found = await api("/segments?" + q);
  return found.map((s) => ({ type: s.type, startMs: Math.round(s.startMs), endMs: Math.round(s.endMs) }));
}
```

Try it under Node against the bundled server (`node server.mjs`), with
`C="--config server=http://192.168.1.10:8096 --config user=ana --config password=s3cr3t"` (or `sdk/config.json`, kept out of git), from your
computer's LAN address, not `127.0.0.1`: a loopback address is refused even as the person's own server.
`node sdk/run.mjs $C . home`, `… . resolve doblaje`, `… . live categories`, `… . track watched` and
`… . segments tt1254207 45000` then show what Kino would get; the repository's README lists every
command, and `node --test test/*.test.mjs` runs its tests offline.

## A TMDB catalog with no key in the plugin (Kino 0.9.53) { #tmdb-catalog }

A plugin whose Home rows and search come from TMDB (trending, discover by genre, a title's seasons) used to ask every
person for a TMDB key in its own settings. With [`kino.tmdb`](kino-api.md#tmdb) Kino brings the key: its own first, behind
its cache and limits, and the person's (the one in Ajustes, or the one of their Stremio TMDB addon, once they agree) only
when Kino's fails. The plugin carries none and declares no TMDB host for it. The plugin's own setting stays only for Kino
0.9.52 and older.

```json
{
  "id": "tmdb-catalog", "name": "Catálogo TMDB", "version": "1.0.0", "apiVersion": 1, "entry": "plugin.js",
  "hosts": ["api.themoviedb.org"],
  "capabilities": ["home", "search", "episodes", "resolve"],
  "catalogOnly": true,
  "settings": [{ "key": "tmdbKey", "type": "password", "label": "Llave de TMDB (Kino 0.9.52 o anterior)" }]
}
```

(`api.themoviedb.org` is in `hosts` only for the fallback's `kino.fetch` on older Kino; `kino.tmdb` itself needs none.
`"catalogOnly": true` sends its titles to the person's other sources on Kino 0.9.54+; `resolve` stays for older Kino, see
[Catalog-only plugins](contract.md#catalog-only).)

```js
const IMG = "https://image.tmdb.org/t/p/w500";

async function tmdb(path, params = {}) {
  if (typeof kino.tmdb === "function") return kino.tmdb(path, params);
  const key = kino.config.get("tmdbKey");                     // Kino 0.9.52 and older: the plugin's own setting
  if (!key) throw kino.error("auth_required", "falta la llave de TMDB");
  const r = await kino.fetch(`https://api.themoviedb.org/3${path}?${new URLSearchParams({ ...params, api_key: key })}`);
  if (!r.ok) throw kino.error(r.status === 404 ? "not_found" : "unavailable", "TMDB respondió " + r.status);
  return r.json();
}

const item = (m, kind) => ({
  id: `${kind}-${m.id}`, ref: JSON.stringify({ kind, id: m.id }), kind: kind === "tv" ? "series" : "movie",
  title: m.title || m.name, year: (m.release_date || m.first_air_date || "").slice(0, 4),
  poster: m.poster_path ? IMG + m.poster_path : undefined, overview: m.overview || undefined, ids: { tmdb: m.id },
});

export async function home() {
  try {
    const [movies, shows] = await Promise.all([
      tmdb("/trending/movie/week", { language: "es-MX" }),
      tmdb("/trending/tv/week", { language: "es-MX" }),
    ]);
    return [
      { id: "movies", title: "Películas en tendencia", items: movies.results.map((m) => item(m, "movie")) },
      { id: "shows", title: "Series en tendencia", items: shows.results.map((m) => item(m, "tv")) },
    ];
  } catch (e) {
    // No key at all (a Kino build without one, and no key of the person's): Home shows no rows instead of an error.
    if (e.code === "no_tmdb_key") return [];
    throw e;
  }
}

export async function search(query) {
  if (!query.q) return [];
  // Kino's key answers first, so this is rare. Uncaught, no_tmdb_key reaches the person as Kino's own sentence
  // ("Agrega tu llave de TMDB en Ajustes, o instala un addon de TMDB de Stremio configurado con tu llave."): nothing to
  // word yourself.
  const r = await tmdb("/search/multi", { query: query.q, language: "es-MX", include_adult: false });
  return r.results.filter((m) => m.media_type === "movie" || m.media_type === "tv").map((m) => item(m, m.media_type));
}

export async function episodes(ref) {
  const { id } = JSON.parse(ref);
  const show = await tmdb(`/tv/${id}`, { language: "es-MX" });
  const out = [];
  for (const s of show.seasons.filter((x) => x.season_number > 0).slice(0, 10)) {
    const season = await tmdb(`/tv/${id}/season/${s.season_number}`, { language: "es-MX" });
    for (const e of season.episodes) {
      out.push({ season: e.season_number, number: e.episode_number, title: e.name, ref: JSON.stringify({ kind: "tv", id, s: e.season_number, e: e.episode_number }) });
    }
  }
  return { episodes: out };
}

export async function resolve(ref) {
  // Only Kino 0.9.53 and older call it ("catalogOnly" is ignored there): it says so in the person's words.
  throw kino.error("not_found", "catalog only", { userMessage: "Este catálogo no reproduce: busca el título en tus otras fuentes." });
}
```

Try it without a key (as a Kino build with none), then with yours standing in for Kino's:

```
node sdk/run.mjs . home                                   # [] : no_tmdb_key is caught
KINO_TMDB_KEY=<your v3 key> node sdk/run.mjs . home       # the two rows
node sdk/run.mjs . search matrix                          # [no_tmdb_key] … and the sentence the person reads
```

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
  L3; its other license failures are cuts, re-resolved like any other (see [Live channels](live-channels.md#live-items)). A protected title is **never downloadable** ("Este contenido no se puede
  descargar"), even with `download` declared, and cannot be sent to a TV either ([Sending to the TV](what-people-see.md#cast)).
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
