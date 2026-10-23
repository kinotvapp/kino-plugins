# Plugins que usan scrapers de Nuvio (`kino.nuvio`)

Desde **Kino 0.9.71** (`"apiVersion": 11`) un plugin puede decir «usa este repositorio de Nuvio» y dejar que Kino
haga el trabajo pesado de buscar enlaces. Hay muchos repositorios de Nuvio con decenas de scrapers que ya funcionan;
en lugar de escribir y mantener un scraper por cada sitio, tu plugin se alimenta de ellos y tú solo haces la parte
que es tuya: el catálogo, qué scrapers preguntar primero, cómo ordenar y etiquetar las copias y qué hacer cuando uno
falla.

!!! warning "Experimento"
    `kino.nuvio` es nuevo y puede cambiar. Úsalo detrás de `typeof kino.nuvio === "object"`: un Kino anterior no lo
    tiene (y rechaza un manifiesto con `"apiVersion": 11`).

!!! note "No es la importación de Nuvio"
    [Scrapers de Nuvio](nuvio.md) cuenta cómo **la persona** agrega los scrapers de un repositorio, uno por uno, desde
    «Agregar plugin». Esta página es para **quien escribe un plugin**: el plugin nombra el repositorio y Kino instala y
    usa los scrapers sin pantallas ni pasos para la persona. Por debajo es la misma lectura, la misma conversión y las
    mismas reglas.

## Cómo funciona { #how }

1. En el manifiesto declaras la capacidad `nuvio` y `nuvioRepos` (de 1 a 4 repositorios).
2. En tu `resolve` (o en cualquier función tuya) llamas a `kino.nuvio`:
    - `available` te dice qué ofrece el repositorio;
    - `use` instala los scrapers que elijas, con el mismo lector y la misma conversión de la importación;
    - `streams` le pide a cada scraper los enlaces de un título (por su id de TMDB) y te devuelve **una respuesta por
      scraper**;
    - `scrapers` lista los que ya están instalados y encendidos.
3. Tú decides qué hacer con las respuestas: ordenarlas, mezclarlas, etiquetarlas y descartar las que no sirvan. Lo que
   devuelves es un `Stream` normal, con la copia principal y el resto como `alternatives`.

Tu plugin no ejecuta ni descarga nada de los scrapers: lo hace Kino, con los mismos hosts, el mismo cupo de peticiones y
el mismo filtro de torrents de la importación.

## El manifiesto { #manifest }

```json
{
  "id": "mi-todo-en-uno",
  "name": "Mi Todo en Uno",
  "version": "1.0.0",
  "apiVersion": 11,
  "entry": "plugin.js",
  "description": "Películas y series con TMDB; busca los enlaces en un repositorio de Nuvio",
  "author": "tu-usuario",
  "hosts": ["image.tmdb.org"],
  "streamHosts": "any",
  "capabilities": ["search", "episodes", "resolve", "nuvio"],
  "nuvioRepos": ["owner/repositorio-de-nuvio"]
}
```

| Campo | Regla |
| --- | --- |
| `capabilities` | Incluye `"nuvio"`. Es una capacidad declarativa que **la persona aprueba** al instalar: la hoja dice «Instala y usa scrapers de Nuvio del repositorio que indica para buscar enlaces». Necesita `"apiVersion": 11`. |
| `nuvioRepos` | Obligatorio con `nuvio`, y `nuvio` es obligatorio con él. De 1 a 4 repositorios, cada uno `owner/repo` de GitHub o la dirección https del `manifest.json` de Nuvio. `kino.nuvio` rechaza cualquier otro repositorio con `not_allowed`, así que los que tu plugin puede alcanzar quedan fijos y visibles al instalar. |
| `streamHosts` | Normalmente `"any"` (`apiVersion` 4): los videos salen de los sitios de cada scraper, que no puedes listar de antemano. La persona lo aprueba al instalar. |
| `hosts` | Solo los de tu propio plugin (por ejemplo `image.tmdb.org` para los pósters). Los hosts de cada scraper los trae el scraper. |

## Las funciones { #api }

Se llaman **solo dentro de una de tus funciones** (nunca al cargar el módulo ni en el carril de firma), y todas
devuelven una promesa.

| Llamada | Qué hace |
| --- | --- |
| `kino.nuvio.available({ repo })` | Lo que ofrece el repositorio, leído como lo lee la importación: `id`, `name`, `description` (hasta 120 caracteres), `types` (`movie`, `tv`, `anime`), `languages`, `compatible` e `installed`. |
| `kino.nuvio.use({ repo, scrapers })` | Se asegura de que esos scrapers (hasta 12) estén instalados, instalando los que falten uno tras otro. Responde `{ ready, failed }`; en `failed` va cada uno que no se pudo (`refused` si es de torrents, `not_found`, `timeout`, `failed`) y los demás siguen. |
| `kino.nuvio.scrapers({ repo, scrapers? })` | Los scrapers del repositorio que están instalados y encendidos, en orden de instalación. Los +18 nunca se listan. |
| `kino.nuvio.streams({ repo, type, tmdbId, season?, episode?, scrapers?, timeoutMs? })` | Le pregunta a los scrapers por un título y devuelve `{ results, truncated }`. Cada elemento de `results` es `{ scraper, ok: true, stream }` o `{ scraper, ok: false, code, message }`. Una serie necesita `season` y `episode`. |

Detalles que importan:

- `type` es `"movie"`, `"series"` o `"tv"`. `tmdbId` es el id de TMDB del título.
- `streams` nunca lanza error porque un scraper falle o tarde: ese scraper es una entrada con `ok: false`, así que una
  fuente lenta no esconde a las demás. `timeoutMs` (de 2000 a 60000, por defecto 60000) es lo que puede tardar **cada**
  scraper.
- `stream` trae los campos de un `Stream`: `url`, `mime`, `headers`, `label`, `subtitles` y `alternatives`. Una copia
  perezosa (sin dirección todavía) se omite.
- `truncated` es `true` si había instalados más de 12 scrapers y solo se preguntó a los primeros 12.
- Los scrapers que son solo de torrents salen como `compatible: false` y nunca se instalan.

### Errores { #errors }

`invalid_request` (consulta mal formada), `rate_limited`, `unavailable` (no se pudo leer el repositorio) y
`not_allowed` (no declaraste la capacidad, o el repositorio no está en `nuvioRepos`).

## Límites { #limits }

| Qué | Cuánto |
| --- | --- |
| Llamadas por minuto, por plugin | 20 |
| Scrapers por llamada a `use` o `streams` | hasta 12 (`streams` pregunta 4 a la vez) |
| Tiempo de un scraper | 60 s, o el `timeoutMs` que pidas (de 2 a 60 s) |
| Instalar un scraper | 45 s cada uno |
| Scrapers que `available` devuelve | hasta 200 |
| Filtro `scrapers` de una consulta | hasta 64 ids |
| Tamaño de la consulta | 4096 caracteres |
| `resolve` de un plugin que declara `nuvio` | 75 s (como los plugins convertidos) |

## Los scrapers son de tu plugin { #owned }

Los scrapers que instalas desde un repositorio que nombras en `nuvioRepos` son **de tu plugin**, no una elección de la
persona:

- Ajustes ▸ Plugins ▸ Instalados no los lista; la tarjeta de tu plugin dice «N scrapers de Nuvio, se quitan con el
  plugin».
- Si la persona desinstala tu plugin, se desinstalan con él, salvo que otro plugin instalado nombre el mismo repositorio.
- Nada nuevo se guarda aparte: se lee de los manifiestos y registros que ya se sincronizan, así que vale en todos sus
  aparatos.

## Un ejemplo completo { #example }

Un plugin de películas y series: el catálogo viene de TMDB (con `kino.tmdb`, sin llave en tu código), los capítulos de
`kino.meta`, y los enlaces de los scrapers de un repositorio de Nuvio. Cambia `owner/repositorio-de-nuvio` por el
repositorio que quieras usar. (`kino.tmdb` y `kino.meta` existen desde Kino 0.9.53, así que con `apiVersion` 11 siempre están; el kit avisa de ello y puedes ignorar el aviso.)

```js
const REPO = "owner/repositorio-de-nuvio"; // el mismo de "nuvioRepos" en kino-plugin.json
const MAX_SCRAPERS = 6;

function ref(o) { return JSON.stringify(o); }

function parse(r) {
  try { const o = JSON.parse(String(r)); if (o && o.t) return o; } catch { /* cae abajo */ }
  throw kino.error("not_found", "bad ref", { userMessage: "No reconozco este título." });
}

function toItem(r, kind) {
  const title = String((kind === "movie" ? r.title : r.name) || "").trim();
  if (!r || !r.id || !title) return null;
  const item = { id: kind[0] + r.id, ref: ref({ k: kind, t: r.id }), title: title.slice(0, 200), kind, ids: { tmdb: r.id } };
  if (r.poster_path) item.poster = "https://image.tmdb.org/t/p/w342" + r.poster_path;
  return item;
}

export async function search(query) {
  const q = String(query.q || "").trim();
  if (q.length < 2) return [];
  const data = await kino.tmdb("/search/multi", { query: q, include_adult: false });
  const items = [];
  for (const r of data.results || []) {
    if (r.media_type === "movie" || r.media_type === "tv") {
      const item = toItem(r, r.media_type === "movie" ? "movie" : "series");
      if (item) items.push(item);
    }
  }
  return items.slice(0, 40);
}

export async function episodes(refText) {
  const r = parse(refText);
  const meta = await kino.meta({ type: "series", ids: { tmdb: r.t } });
  const list = [];
  for (const ep of (meta && meta.episodes) || []) {
    if (ep.season < 1 || ep.number < 1) continue; // los especiales (temporada 0) no caben en la numeración de Kino
    list.push({ season: ep.season, number: ep.number, title: ep.title, ref: ref({ k: "series", t: r.t, s: ep.season, e: ep.number }) });
  }
  if (!list.length) throw kino.error("not_found", "no episodes", { userMessage: "No encontré capítulos." });
  return { episodes: list };
}

export async function resolve(refText) {
  const r = parse(refText);
  // Un Kino anterior no tiene kino.nuvio: falla con un mensaje claro en lugar de romperse.
  if (typeof kino.nuvio !== "object") throw kino.error("unavailable", "no kino.nuvio", { userMessage: "Actualiza Kino para usar este plugin." });

  // 1. Qué ofrece el repositorio, y de esos, los compatibles con este tipo de título.
  const offered = await kino.nuvio.available({ repo: REPO });
  const type = r.k === "movie" ? "movie" : "tv";
  const ids = offered.filter((o) => o.compatible && o.types.includes(type)).slice(0, MAX_SCRAPERS).map((o) => o.id);
  if (!ids.length) throw kino.error("unavailable", "no scrapers", { userMessage: "No hay fuentes para este título." });

  // 2. Instala los que falten. Los que no se puedan, quedan en "failed" y se siguen con los demás.
  await kino.nuvio.use({ repo: REPO, scrapers: ids });

  // 3. Pregúntales por el título. Un scraper lento o roto es una entrada con ok: false, nunca un error.
  const query = { repo: REPO, type: r.k, tmdbId: r.t, scrapers: ids, timeoutMs: 15000 };
  if (r.k === "series") { query.season = r.s || 1; query.episode = r.e || 1; }
  const answer = await kino.nuvio.streams(query);

  // 4. Tú decides: aquí, todas las copias que respondieron, sin repetir dirección; la primera es la principal.
  const seen = new Set();
  const copies = [];
  for (const x of answer.results) {
    if (!x.ok) continue;
    const all = [x.stream].concat(x.stream.alternatives || []);
    for (const c of all) {
      if (!c || !c.url || seen.has(c.url)) continue;
      seen.add(c.url);
      copies.push({ url: c.url, mime: c.mime, headers: c.headers, label: x.scraper.name + (c.label ? " · " + c.label : ""), subtitles: c.subtitles });
    }
  }
  if (!copies.length) throw kino.error("unavailable", "no sources", { userMessage: "Ninguna fuente tuvo este título." });

  const main = copies[0];
  const stream = { url: main.url, label: main.label.slice(0, 48) };
  if (main.mime) stream.mime = main.mime;
  if (main.headers) stream.headers = main.headers;
  if (main.subtitles) stream.subtitles = main.subtitles;
  stream.alternatives = copies.slice(1, 9).map((c, i) => ({ url: c.url, mime: c.mime, headers: c.headers, label: (c.label.slice(0, 44) + " " + (i + 2)) }));
  return stream;
}
```

Qué hace cada paso, y dónde puedes ponerle tu propia lógica:

- **Elegir scrapers** (paso 1): aquí ordenas por idioma, por tipo (los de anime solo para animación), por los que
  funcionaron la última vez (guárdalo en `kino.storage`) o por lo que la persona escoja en un ajuste.
- **Instalar** (paso 2): `use` tarda hasta 45 s por scraper nuevo, así que no pidas los 12 de golpe; empieza con unos
  pocos y pide más solo si ninguno responde.
- **Preguntar** (paso 3): baja `timeoutMs` para que una fuente colgada no te gaste los 75 s del `resolve`.
- **Mezclar** (paso 4): ordena como quieras (por calidad, por servidor, descartando embebidos), etiqueta cada copia con
  su origen y deja el resto como `alternatives`; si la principal falla, Kino prueba las demás.


## Los tipos (TypeScript) { #types }

Estas declaraciones son las de `kino.d.ts` de Kino 0.9.71; los archivos de referencia de este sitio todavía no las incluyen.

```ts
/** Kino 0.9.71, `kino.nuvio.scrapers(query)`: `repo` is a GitHub `owner/repo` or the https address of a Nuvio `manifest.json`, as the person added it. */
interface KinoNuvioScrapersRequest {
  repo: string;
  /** Only these scraper ids (at most 64). */
  scrapers?: string[];
}

/** Kino 0.9.71, `kino.nuvio.streams(query)`: the title by its TMDB id; a series needs `season` and `episode`. */
interface KinoNuvioStreamsRequest extends KinoNuvioScrapersRequest {
  type: "movie" | "series" | "tv";
  tmdbId: number;
  season?: number;
  episode?: number;
  /** How long each scraper may take, 2000 to 60000 ms (default 60000): a scraper that hangs answers `timeout` and hides nothing. */
  timeoutMs?: number;
}

interface KinoNuvioScraper { id: string; name: string }

/** One scraper a repository offers (`kino.nuvio.available`). */
interface KinoNuvioOffered extends KinoNuvioScraper { description: string; types: string[]; languages: string[]; compatible: boolean; installed: boolean }

/** One copy a scraper found: a `Stream`'s fields, copies included; a lazy copy (no address yet) is left out. */
interface KinoNuvioStream {
  url: string;
  mime?: string;
  headers?: Record<string, string>;
  label?: string;
  expiresInSeconds?: number;
  subtitles?: { lang: string; url: string; format?: "vtt" | "srt" }[];
  alternatives?: { url: string; mime?: string; headers?: Record<string, string>; label?: string }[];
}

type KinoNuvioResult =
  | { scraper: KinoNuvioScraper; ok: true; stream: KinoNuvioStream }
  | { scraper: KinoNuvioScraper; ok: false; code: string; message: string };

interface KinoNuvioStreamsAnswer { results: KinoNuvioResult[]; truncated: boolean }

declare namespace kino.nuvio {
  function available(query: { repo: string }): Promise<KinoNuvioOffered[]>;
  function use(query: { repo: string; scrapers: string[] }): Promise<{ ready: string[]; failed: { id: string; code: string; message: string }[] }>;
  function scrapers(query: KinoNuvioScrapersRequest): Promise<KinoNuvioScraper[]>;
  function streams(query: KinoNuvioStreamsRequest): Promise<KinoNuvioStreamsAnswer>;
}
```

## Probarlo { #test }

- **El kit de Node todavía no conoce `nuvio`.** `node sdk/validate.mjs .` responde `capabilities: Unknown capability: "nuvio"` aunque el manifiesto esté bien: es un error del kit, no de Kino. No quites la capacidad para callarlo; el que decide es Kino 0.9.71 o más nuevo al instalar. El resto de lo que revisa el kit (hosts, estructura, las demás funciones) sí te sirve.
- El kit de Node **tampoco simula `kino.nuvio`**: en el kit `typeof kino.nuvio` no es `"object"`. Por eso el ejemplo lo
  comprueba primero. Prueba el `resolve` de verdad instalando el plugin en Kino 0.9.71 o más nuevo y reproduciendo un
  título.
- Mira el registro del plugin (`kino.log`) para saber qué scraper falló y por qué.

## Errores comunes { #mistakes }

- Llamar a `kino.nuvio` al cargar el módulo: solo funciona dentro de una de tus funciones.
- Olvidar `nuvioRepos` (o `nuvio` en `capabilities`): el manifiesto se rechaza.
- Pedir un repositorio que no declaraste: `not_allowed`.
- Pedir los 12 scrapers en cada `resolve`: es lento y gasta tu cupo de 20 llamadas por minuto. Guarda cuáles funcionan.
- No declarar `"streamHosts": "any"`: Kino descarta las copias de hosts que no declaraste.
- Esperar scrapers de torrents: nunca se instalan.

Más: [el contrato](contract.md), [el manifiesto](manifest.md#nuvio-repos) y [Scrapers de Nuvio](nuvio.md), la importación que hace la persona.
