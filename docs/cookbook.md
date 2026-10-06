# Recetario

Tres formas completas, y después dos recetas cortas para los poderes de apiVersion 2 que necesitan
una línea en la hoja de consentimiento. Las tres recetas de canales en vivo (apiVersion 3) están en
[Canales en vivo](live-channels.md#recipes). La primera y la tercera forma son, casi línea por línea,
los dos plugins de referencia que las propias pruebas de Kino ejecutan de punta a punta contra un
servidor falso.

## Un sitio HTML con login y enlaces escondidos { #html-login }

El sitio tiene un formulario de login, guarda la sesión en una cookie, lista los títulos como HTML
con un enlace "siguiente", y esconde la URL de cada video con AES-128-CBC. El usuario y la contraseña
de la persona son ajustes.

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

`kino.html.select` solo existe en la app, así que prueba este en Kino (o con `--replay` para las
partes que no analizan HTML). En el código, el tarro de cookies guarda la sesión entre llamadas (y
entre reinicios): el plugin solo inicia sesión cuando hace falta.

## Una API JSON con token { #json-token }

La API pide un token que entrega a cambio de una clave de API. Guarda el token en `kino.storage`,
con la clave de la que salió como parte de su nombre, y pide uno nuevo cuando la API diga que venció.

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

Manifiesto: `"hosts": ["api.example.com"]`, `"capabilities": ["search", "browse", "resolve"]` (un
`next` en una página de búsqueda necesita `browse`), y un ajuste
`{ "key": "apiKey", "label": "Clave de la API", "type": "password", "required": true }`. Como
`browse` está declarado, también hay que exportarlo; `export async function browse(ref, cursor) { throw
kino.error("not_found"); }` basta cuando solo la búsqueda pagina.

## El servidor propio de la persona { #own-server }

Un servidor multimedia en la casa (Jellyfin, Emby, un NAS…): la persona escribe su dirección, su
usuario y su contraseña. La dirección se vuelve un host permitido para esa instalación, con `http` y
una dirección de la red local incluidos; los streams, los pósters y los stills pueden apuntar a él.
Este es el plugin de demostración publicado **Tu servidor** 1.5.0
([kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server), con un
servidor de referencia para probarlo), que usa todo lo que un servidor propio puede usar hasta
apiVersion 7 (Kino 0.9.51): temporadas, `download`, `audioTracks`, `subtitles`, `durationMs` y `skip`,
ítems `live`, `kino.storage` con TTL, `kino.rank`, `ids`, `channels` en todas sus formas (un `ref`, un
`stream` en línea, una lista M3U con guía XMLTV, una lista con `resolve: true`, `liveSearch` y
paginación), lo de apiVersion 6 (una sección con pestañas, mosaicos de Categorías, `scopedSearch`,
`migrate`, entradas `adult`, copias con etiqueta y perezosas, HLS firmado por petición, el formulario
de ajustes completo, `telemetry`, `userMessage`) y las capacidades de apiVersion 7 `tracking` y
`segments`, además de `meta` con logo, notas y reparto y `subtitles` con la pista `file` de Kino
0.9.51. Es el plugin de referencia para cualquier función más allá de las cinco capacidades básicas;
[Plugins de ejemplo](examples.md#reference-plugin) relaciona cada función con su código. Su
[`kino-plugin.json`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/kino-plugin.json) real:

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

`hosts` está vacío: el plugin solo llega al servidor que escribe la persona y a las otras direcciones
de ese servidor que ella liste (permitido desde apiVersion 2 con un ajuste `url`, mira
[Los servidores propios de la persona](manifest.md#own-servers)). Todas las listas de canales, guías y
streams están en ese mismo servidor, así que no necesita `"liveStreamHosts": "any"`. `"apiVersion": 7`
hace que Kino 0.9.50 y anteriores lo rechacen ("Este plugin necesita una versión más nueva de Kino");
declara el número más bajo que tenga lo que usas.

Lo que sigue es, línea por línea, el núcleo de su
[`plugin.js`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js) real: las peticiones ([`reach`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js#L56-L74) recurre a las otras
direcciones, `api` convierte cada estado en un error tipado), el listado y la reproducción. Lo demás --
copias, firma, canales, la sección, `migrate`, `meta`, `subtitles`, el formulario de ajustes -- está en
el mismo archivo, una función por cosa.

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

Los exports de apiVersion 7, [`track y segments`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js#L557-L591): el servidor marca como visto lo que
está en su biblioteca, como su propia app, y sabe dónde están la intro y los créditos de cada título.

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

Pruébalo bajo Node contra el servidor incluido (`node server.mjs`), con
`C="--config server=http://192.168.1.10:8096 --config user=ana --config password=s3cr3t"` (o `sdk/config.json`, fuera de git), desde la dirección de
red local de tu computador, no `127.0.0.1`: una dirección de loopback se rechaza incluso como servidor
propio de la persona. `node sdk/run.mjs $C . home`, `… . resolve doblaje`, `… . live categories`,
`… . track watched` y `… . segments tt1254207 45000` muestran entonces lo que Kino recibiría; el README
del repositorio lista todos los comandos, y `node --test test/*.test.mjs` corre sus pruebas sin red.

## Un catálogo de TMDB con la llave de la persona (Kino 0.9.53) { #tmdb-catalog }

Un plugin cuyas filas de Inicio y búsqueda salen de TMDB (tendencias, descubrir por género, las temporadas de un título)
antes le pedía a cada persona una llave de TMDB en sus propios ajustes. Con [`kino.tmdb`](kino-api.md#tmdb) Kino pone la
llave de la persona (la de Ajustes, o la de su addon de TMDB de Stremio, si acepta): el plugin no lleva ninguna ni
declara un host de TMDB para eso. El ajuste propio del plugin queda solo para Kino 0.9.52 y anteriores.

```json
{
  "id": "tmdb-catalog", "name": "Catálogo TMDB", "version": "1.0.0", "apiVersion": 1, "entry": "plugin.js",
  "hosts": ["api.themoviedb.org"],
  "capabilities": ["home", "search", "episodes", "resolve"],
  "settings": [{ "key": "tmdbKey", "type": "password", "label": "Llave de TMDB (Kino 0.9.52 o anterior)" }]
}
```

(`api.themoviedb.org` está en `hosts` solo para el `kino.fetch` de respaldo en versiones anteriores de Kino; `kino.tmdb` no lo necesita.)

```js
const IMG = "https://image.tmdb.org/t/p/w500";

async function tmdb(path, params = {}) {
  if (typeof kino.tmdb === "function") return kino.tmdb(path, params);
  const key = kino.config.get("tmdbKey");                     // Kino 0.9.52 y anteriores: el ajuste propio del plugin
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
    // Todavía sin llave: Inicio no muestra filas de este plugin en vez de un error.
    if (e.code === "no_tmdb_key") return [];
    throw e;
  }
}

export async function search(query) {
  if (!query.q) return [];
  // Sin atraparlo, no_tmdb_key le llega a la persona como la frase de Kino ("Agrega tu llave de TMDB en Ajustes, o instala un
  // addon de TMDB de Stremio configurado con tu llave."): no tienes que redactar nada.
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
  throw kino.error("not_found", "este catálogo no reproduce: solo lista títulos");   // aquí va el resolve de tu fuente
}
```

Pruébalo sin llave y luego con la tuya:

```
node sdk/run.mjs . home                                   # [] : no_tmdb_key se atrapa
KINO_TMDB_KEY=<tu llave v3> node sdk/run.mjs . home       # las dos filas
node sdk/run.mjs . search matrix                          # [no_tmdb_key] … y la frase que lee la persona
```

## Un stream protegido con Widevine (apiVersion 2) { #widevine }

Tu fuente sirve DASH o HLS cifrado con Widevine y entrega la licencia desde su propio servidor.
Declara `"apiVersion": 2` y `"drm"` en `capabilities`, pon el servidor de licencias en `hosts`, y
devuelve un bloque `drm` con el `Stream`:

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

Lo que hace Kino con él, y lo que no:

- `licenseUrl` tiene que pasar la misma revisión que `url`: `https` en uno de tus `hosts` (o el
  servidor propio de la persona tal como lo escribió), nunca una IP ni un nombre local; la petición de
  licencia misma pasa por el mismo filtro de hosts que los segmentos, con los `licenseHeaders`
  (filtrados como los `headers`, máximo 20) y nada más. Los `headers` no se envían al servidor de
  licencias, y los `licenseHeaders` no se envían al CDN.
- `type` tiene que ser `"widevine"`: PlayReady, FairPlay y ClearKey no se ofrecen. Sin la capacidad
  `drm`, o con cualquier otra clave con forma de DRM (`license`, `licenseUrl`, `drmLicenseUrl`,
  `keySystem`, `widevine`) en el `Stream`, el stream se rechaza como siempre.
- Kino le pide a Widevine el nivel de seguridad **L3** (software) para usar el mismo reproductor,
  superficie y decodificador que con un stream sin cifrar, y reproduce **solo si el dispositivo
  confirma L3**: un dispositivo que se queda en L1 (o que no dice) no abre ninguna sesión y muestra el
  mensaje de abajo. Un servidor de licencias que rechaza L3, o que con L3 solo da SD, le da a la
  persona SD o ese mismo mensaje: revisa la política de tu servidor antes de publicar.
- `audioTracks` junto a `drm`: el video está protegido, los archivos de audio aparte se reproducen
  **sin cifrar** -- no se pide licencia para ellos, así que tienen que ser archivos simples sin cifrar
  (un archivo aparte cifrado hace fallar toda la reproducción con el mensaje de abajo). `subtitles` y
  `headers` funcionan como siempre.
- Cuando la licencia se rechaza, no se alcanza o venció, o el dispositivo no tiene Widevine (o no
  tiene L3), la persona lee "No se pudo abrir este video protegido" (después de un `resolve` más si
  había pasado `expiresInSeconds`, como con cualquier stream). Un canal en vivo protegido dice lo mismo
  de una vez en un dispositivo sin L3; sus otras fallas de licencia son cortes, que se vuelven a
  resolver como cualquier otro (mira [Canales en vivo](live-channels.md#live-items)). Un título
  protegido **nunca se puede descargar** ("Este video no se puede descargar"), aunque se declare
  `download`, y tampoco se puede enviar a una TV ([Enviar a la TV](what-people-see.md#cast)).
- La hoja de consentimiento agrega "Reproduce video protegido (DRM)" cuando se declara `drm`, y una
  actualización que lo declare por primera vez espera la aprobación de la persona
  ([Publicar](publish.md#updates)).

Para probar sin un servicio real sirve un stream de prueba público de Widevine: el manifiesto en
`https://storage.googleapis.com/wvmedia/cenc/h264/tears/tears.mpd` con el servidor de licencias
`https://proxy.uat.widevine.com/proxy?provider=widevine_test` (declara `storage.googleapis.com` y
`proxy.uat.widevine.com` en `hosts`; no hacen falta `licenseHeaders`).

## Un sitio tuyo sin certificado (apiVersion 2) { #insecure-site }

Tus videos están en un servidor tuyo que solo habla `http` plano -- una caja de CDN sin certificado,
un servidor multimedia viejo con un nombre público. Declara `"apiVersion": 2` y marca ese único host
como `insecureHttp` en `hosts`; en tu código no cambia nada más que el esquema:

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

Lo que hace la bandera, y lo que no:

- Solo `cdn.example.com`, exacto, acepta `http`: para `kino.fetch`, la `url` de un `Stream`, los
  `subtitles`, los `audioTracks` y la `licenseUrl` de un bloque `drm`, y para cada salto de redirección
  que caiga en él. `api.example.com` sigue siendo solo https, y lo mismo `sub.cdn.example.com` (sin
  comodín, sin subdominios). `https://cdn.example.com/…` también sigue funcionando.
- Todo lo demás de un host declarado se mantiene: un nombre DNS público (sin IP, sin `localhost`, nada
  `.local`/`.lan`), y un nombre que resuelve dentro de la red de la persona se rechaza al momento de la
  petición. Para un servidor en la casa, la persona lo escribe en un ajuste `url` (mira
  [El servidor propio de la persona](#own-server)): esa vía acepta `http` sin esta bandera.
- La hoja de consentimiento agrega, en rojo, "Conexión sin cifrar con cdn.example.com", para que la
  persona sepa que ese tráfico se puede leer en el camino; una actualización que marque por primera
  vez como `insecureHttp` un host ya aprobado espera aprobación ([Publicar](publish.md#updates)).
  Prefiere `https` siempre que el servidor pueda: la bandera es para el host que no puede.
