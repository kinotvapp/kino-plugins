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
Este es el plugin de demostración publicado **Tu servidor**
([kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server), con un
servidor de referencia para probarlo), que usa todas las funciones de apiVersion 3 que puede usar un
servidor propio: temporadas, `download`, `audioTracks`, ítems `live`, un TTL de `kino.storage`,
`kino.rank`, `ids.tmdb`, y `channels` en sus tres formas (canales con `ref`, canales con `stream` en
línea y una lista M3U con guía XMLTV).

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

`hosts` está vacío: el plugin solo llega al servidor que escribe la persona (permitido desde
apiVersion 2 con un ajuste `url`, mira [Los servidores propios de la persona](manifest.md#own-servers)).
Hasta la 1.1.1 el demo declaraba el comodín `"tu-servidor.invalid"` para las versiones de Kino
anteriores a esa regla; la 1.2.0 es apiVersion 3, que esas versiones rechazan de todos modos, así que
no declara ninguno. Todas las listas de canales, guías y streams están en ese mismo servidor, así que
no necesita `"liveStreamHosts": "any"`. Luego:

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

Lo que explican los comentarios del código: todo lo que se guarda en `kino.storage` pertenece a un
usuario en un servidor (el almacenamiento sobrevive a un cambio en Configurar, así que una clave sin
ellos le entregaría al servidor nuevo las respuestas del viejo); el token no cambia cuando solo
cambia la contraseña del mismo usuario@servidor, y un token invalidado del lado del servidor se olvida
y se vuelve a pedir; las imágenes viven en el mismo servidor, con pósters 2:3 y fondos 16:9; `kind`
viene del servidor; `ids.tmdb` solo cuando el servidor lo conoce; Inicio se guarda 15 minutos con un
TTL; `kino.rank` convierte en búsqueda por título un servidor que compara CUALQUIER palabra; cada
temporada es su propio título, así que la respuesta lista todas en `seasons`; películas y capítulos
son mp4 progresivos (descargables), el canal en vivo es HLS; y `channels` usa las tres formas en una
sola respuesta.

Pruébalo en Node con `--config server=http://192.168.1.10:8096 --config user=ana --config
password=…` (o `sdk/config.json`, por fuera de git), desde la dirección de tu computador en la red
local, no `127.0.0.1`: una dirección de loopback se rechaza incluso como servidor propio de la
persona. `node sdk/run.mjs . live categories` muestra entonces las dos categorías y la lista como la
lee Kino ("3 canales en 1 categorías; 0 entradas descartadas; 2 ocultas (adultos)").

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
  `download`, y no se puede mandar a un Chromecast (ningún título de plugin se puede).
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
