# El contrato (apiVersion 1 a 8)

Tu archivo de entrada es un módulo ES que exporta una función `async` por cada capacidad que
declaraste, y no se llama nada que no hayas declarado:

```js
export async function search(query) { /* -> Item[] or Page */ }
export async function home() { /* -> Row[] */ }
export async function browse(ref, cursor) { /* -> Page */ }
export async function episodes(ref) { /* -> { series?: SeriesInfo, episodes: Episode[], seasons?: Season[] } */ }
export async function resolve(ref) { /* -> Stream */ }
export async function details(ref) { /* -> SeriesInfo or null (apiVersion 8, Kino 0.9.54) */ }
export async function liveCategories() { /* -> Array<LiveCategory | Playlist> or Playlist */ }
export async function liveChannels({ categoryId, cursor }) { /* -> { items: LiveChannel[], next? } */ }
export async function guide({ channelIds, from, to }) { /* -> GuideEntry[] */ }
export async function liveSearch({ query }) { /* -> { items: LiveChannel[] } */ }
export async function subtitles({ imdbId, tmdbId, kind, season, episode, title, year, languages, file }) { /* -> { lang, url, format?, label?, translated? }[] */ }
export async function track(event) { /* -> { ok: true } or { skipped: true }, or throw kino.error(code) (apiVersion 7) */ }
export async function segments(query) { /* -> { type, startMs, endMs }[] (apiVersion 7) */ }
```

Desde `"apiVersion": 6` (Kino 0.9.50) hay más exports opcionales, cada uno con su página:
`sign` ([Firma por petición](signed-streams.md)), `migrate` ([Pasar lo guardado](migrate.md)),
`section` y `categories` ([Sección, categorías y colores](section-theme.md)), y `settingsStatus`,
`action` y `validateSettings` ([Formulario de ajustes](settings-form.md)), y `meta`
([Describir otros títulos](#meta)). `subtitles` ([Subtítulos para cualquier título](#subtitles)) no
necesita un `apiVersion` nuevo. Desde `"apiVersion": 7` (Kino 0.9.51): `track` ([Contarle a un
servicio de seguimiento qué ve la persona](#tracking)) y `segments` ([Dónde están la intro y los
créditos](#segments)). Desde `"apiVersion": 8` (Kino 0.9.54, todavía no publicada): los tipos de ítem de
audio `music` y `podcast` ([Música y podcasts](#music-podcasts)) y el export opcional `details` ([Los
detalles propios de un título](#details)). Y en cualquier `apiVersion`, desde Kino 0.9.54, un plugin que
lista títulos pero no reproduce ninguno puede decirlo con `"catalogOnly": true` ([Plugins de solo
catálogo](#catalog-only)).

([`kino.d.ts`](reference/index.md) tiene las mismas formas como declaraciones de TypeScript.)

Usa exports con nombre (`export async function ...`). Los datos entran y salen de tu código como
JSON, así que devuelve datos simples: textos, números, booleanos, arreglos y objetos.

Las funciones de canales en vivo (`liveCategories`, `liveChannels`, y las opcionales `guide` y
`liveSearch`, apiVersion 3) tienen sus argumentos y reglas en [Canales en vivo](live-channels.md#live-contract).

## Argumentos { #arguments }

- `search(query)` recibe `{ q, type, season, episode, tmdbId, year, originalTitle, altTitles, cursor }`:
    - `q` es el texto que escribió la persona (puede estar vacío; devuelve `[]`).
    - `type` es `"movie"` o `"series"` (o, apiVersion 8, `"music"` o `"podcast"`) cuando Kino se
      inclina por ese tipo, y `"any"` si no. Es una
      pista, no un filtro: Kino lo saca de la división película/serie de TMDB, que casi nunca coincide
      con el catálogo propio de una fuente, y un título puede existir como las dos cosas. Devuelve
      todas las coincidencias posibles; usa `type`, como mucho, para poner primero el tipo que nombra.
    - `season` y `episode` son `0` salvo que Kino esté buscando un capítulo específico; `tmdbId` y
      `year` son `0` cuando no se conocen.
    - `originalTitle` es el título original de TMDB cuando es distinto de `q` (si no, `""`), y
      `altTitles` hasta 5 títulos más que Kino conoce de la obra (cada uno de máximo 200 caracteres):
      pruébalos cuando `q` no encuentra nada en una fuente que nombra las cosas en otro idioma.
    - `cursor` es `null`, salvo cuando la persona pidió más resultados y tu página anterior dijo
      dónde seguir (mira `Page` abajo).
    - `within` (apiVersion 6, solo en un plugin que declara `scopedSearch`) aparece cuando la persona
      busca dentro de una de tus páginas "Ver más": mira [Buscar dentro de un "Ver más"](#scoped-search).
- `home()` recibe `null`.
- `browse(ref, cursor)` recibe el `ref` de una de tus filas de Inicio (o un `ref` que dio una página
  anterior), y `cursor` `null` para la primera página o el `next` de la página anterior.
- `episodes(ref)` recibe el `ref` de un ítem `series`, tal como lo devolviste, o (apiVersion 8) el
  `ref` de un ítem `music` o `podcast`, para sus pistas o episodios.
- `details(ref)` (apiVersion 8, Kino 0.9.54) recibe el `ref` de un ítem `movie` cuando se abre su
  página: mira [Los detalles propios de un título](#details).
- `resolve(ref, options)` recibe el `ref` de un ítem `movie`, el `ref` de un capítulo, (apiVersion 2) el
  `ref` de un ítem `live` o (apiVersion 8) el `ref` de un ítem `music` o `podcast` de un plugin sin
  `episodes`. `options` es `undefined` en una llamada normal; solo un plugin apiVersion 6
  con un stream [firmado por petición](signed-streams.md#retry) lo recibe, como `{ retry }`. Desde
  apiVersion 6 también recibe el `ref` de una de tus [copias perezosas](#lazy-copies), cuando esa copia
  hace falta.
- `subtitles(arg)` recibe `{ imdbId?, tmdbId?, kind, season?, episode?, title?, year?, languages, file? }` (ver
  [Subtítulos para cualquier título](#subtitles)) y devuelve un arreglo con la forma de los `subtitles`
  de un `Stream`, cada entrada con un `label` y un `translated` opcionales.

## Lo que devuelves { #returns }

```ts
Item       = { id: string, ref: string, title: string, kind: "movie" | "series" | "live" | "music" | "podcast",
               year?: string, poster?: string, backdrop?: string, overview?: string,
               lang?: string, quality?: string, originalTitle?: string,
               genres?: string[], rating?: number, runtimeMinutes?: number,
               ids?: { tmdb?: number, imdb?: string }, badges?: string[], adult?: boolean,
               artist?: string }                         // music, podcast, artist: apiVersion 8 (Kino 0.9.54)
Row        = { id: string, title: string, items: Item[], ref?: string, genre?: Genre }
Genre      = "peliculas" | "series" | "anime" | "infantil" | "documentales" | "deportes" | "noticias" | "musica" | "entretenimiento" | "otros"
Page       = { items: Item[], next?: string }
SeriesInfo = { title?: string, poster?: string, backdrop?: string, overview?: string,
               ids?: { tmdb?: number, imdb?: string, mal?: number, anilist?: number, kitsu?: number },
               genres?: string[], year?: string,
               rating?: number, runtimeMinutes?: number }   // rating, runtimeMinutes, ids.mal/anilist/kitsu: Kino 0.9.54
Episode    = { season: number, number: number, ref: string, title?: string,
               still?: string, overview?: string, airDate?: string, runtimeMinutes?: number }
Season     = { id: string, ref: string, title: string, number?: number, current?: boolean }
Stream     = { url: string, mime?: string, headers?: Record<string, string>,
               subtitles?: { lang: string, url: string, format?: "vtt" | "srt" }[],
               audioTracks?: { lang: string, url: string, label?: string }[],
               durationMs?: number, expiresInSeconds?: number,
               drm?: { type: "widevine", licenseUrl: string, licenseHeaders?: Record<string, string> },
               label?: string,                                                        // apiVersion 6
               alternatives?: ({ url: string, mime?: string, headers?: Record<string, string>, label?: string }
                               | { ref: string, label?: string })[],                  // label y { ref }: apiVersion 6
               skip?: { openingStartMs?: number, openingEndMs?: number, endingStartMs?: number },
               signing?: "request", signContext?: string, alternateHosts?: string[] }   // las tres últimas: apiVersion 6
```

**Género (Categorías y el filtro de En vivo).** Una `Row` del Home, una `LiveCategory` de En vivo y una `playlist` pueden llevar un `genre` opcional de una lista cerrada de diez ids: `peliculas`, `series`, `anime`, `infantil`, `documentales`, `deportes`, `noticias`, `musica`, `entretenimiento`, `otros` (Kino muestra sus nombres en español). Sirve para que Kino alinee categorías de plugins distintos: la pestaña Categorías agrupa por género las filas del Home que se pueden explorar (las que tienen `ref`, si declaras `browse`) de todos los plugins, y En vivo puede acotar sus categorías por género. Un valor fuera de la lista se ignora, nunca es un error, y sin `genre` Kino lo adivina por el título de la fila o del grupo ("Deportes", "Noticias Colombia", "Kids"…), así que ponlo cuando tus títulos no lo digan. En una `playlist` el género es el de partida para los grupos de la lista (antes se intenta adivinar por el título de cada grupo). Las versiones de Kino anteriores a este campo lo ignoran.

### Cómo se conectan las piezas { #pieces }

El `ref` de un ítem `movie` va a `resolve`. El `ref` de un ítem `series` va a `episodes`, y el `ref`
de cada capítulo va a `resolve`. El `ref` de un ítem `live` (apiVersion 2, mira
[Canales en vivo](live-channels.md#live-items)) también va a `resolve`, y su Stream se reproduce en
vivo. El `ref` de un ítem `music` o `podcast` (apiVersion 8) va a `episodes` cuando lo declaras (sus
pistas o episodios, cada `ref` a `resolve`), y si no, directo a `resolve` (mira
[Música y podcasts](#music-podcasts)). El `ref` de una fila va a `browse`, y lo mismo el `next` de cada
página. El `ref` de una película también va a `details` cuando lo exportas (apiVersion 8,
[abajo](#details)).

### Temporadas { #seasons }

Hay dos formas, y tu respuesta de `episodes` dice cuál. Cuando todas las temporadas de una serie
están en una sola lista, dale a cada capítulo su `season` y deja `seasons` por fuera: Kino saca las
temporadas de los capítulos y muestra un selector que solo filtra la lista. Cuando tu fuente guarda
cada temporada como su propio ítem `series` (con su propio `id` y `ref`, como lo listaría una
búsqueda), devuelve solo los capítulos de esa temporada y lista todas las temporadas de la serie en
`seasons`, incluida la que estás respondiendo: `{ id, ref, title, number?, current? }`, con `title` lo
que muestra el selector ("Temporada 2") y `current: true` en la temporada que se está listando (Kino
también la reconoce por `id`). Kino muestra las temporadas como chips; escoger otra llama a
`episodes` con el `ref` de esa temporada y la abre como ese título, con su propio progreso en la
biblioteca. `seasons` es opcional y nuevo en esta revisión de apiVersion 1: un plugin que nunca lo
devuelve sigue funcionando exactamente igual que antes.

### Paginación ("Ver más") { #paging }

Si declaras `browse`, una fila de Inicio con `ref` tiene una tarjeta "Ver más" que abre una
cuadrícula: Kino llama `browse(ref, null)` y después `browse(ref, next)` mientras la persona baja y
tú sigas devolviendo un `next`. `search` también puede devolver una `Page`; su `next` pone "Ver más
resultados de &lt;name&gt;" debajo de tus resultados, y Kino vuelve a llamar `search` con la misma
consulta y `cursor: next`. Un `next` (y el `ref` de una fila) solo se conserva cuando declaras
`browse`; sin eso Kino los descarta con una línea en el log. Los cursores son opacos para Kino: un
número de página, un desplazamiento, una URL, de máximo 2048 caracteres.

### Los detalles propios de un título (`details`, apiVersion 8, Kino 0.9.54) { #details }

Un ítem de la búsqueda o del Inicio muchas veces trae solo un nombre y un póster. La página del título
muestra lo que traiga el ítem (`overview`, `backdrop`, `genres`, `year`, `rating`, `runtimeMinutes`) y,
en una serie, lo que agregue `episodes(ref).series`. Para una **película** no hay llamada a `episodes`,
así que puedes exportar `details(ref)`: recibe el `ref` del ítem de la película y responde un objeto
`SeriesInfo` (o `null`: nada que agregar).

```js
export async function details(ref) {
  const page = await loadPage(ref);           // tu propia función, idealmente con caché por ref
  return { overview: page.plot, backdrop: page.fanart, genres: page.tags, year: String(page.year),
           rating: page.score, runtimeMinutes: page.minutes };
}
```

- **Desde `apiVersion` 8, `details` es un nombre de export reservado**: exporta una función con ese
  nombre solo con este significado (una función tuya que se llame `details` hay que renombrarla o no
  exportarla). No hay capacidad que declarar: Kino la llama solo si tu plugin la exporta y declara
  `apiVersion` 8 o más, así que un Kino anterior nunca la llama, y tampoco se llama nunca una función
  `details` propia de un plugin anterior.
- Kino la llama cuando se abre la página, junto con su búsqueda en TMDB (nunca antes de ella), con un
  límite de 20 s (`timeoutsMs.details`). Puede usar [`kino.browser.page`](browser.md#page) como
  `episodes`.
- Cuando el ítem no traía `ids`, los `ids` de tu respuesta fijan la película en TMDB. Además de `tmdb` e
  `imdb`, los `ids` (en `details` y en `episodes().series`) pueden llevar los `mal`, `anilist` y `kitsu`
  de un anime (Kino 0.9.54): entonces AniList y los plugins [`meta`](#meta) de la persona se consultan
  con ellos.
- `rating` va de 0 a 10 (como el de un ítem); `runtimeMinutes` es la duración de la película (el
  `runtimeMinutes` de una serie se ignora: es por capítulo). `episodes(ref).series` también acepta
  `rating` y `runtimeMinutes` desde Kino 0.9.54; las versiones anteriores los ignoran.
- Si tu `resolve` necesita la misma página que leyó `details`, guárdala en una caché pequeña en tu
  módulo: la persona suele darle a reproducir justo después de abrir la página.

La página se arma con todas las respuestas, con un orden fijo por campo, sin importar en qué orden
lleguen:

| Campo | Primero → último |
| --- | --- |
| sinopsis, año, géneros | TMDB → tu ítem → `details` → AniList → plugins meta |
| póster, fondo | tu ítem → `details` → AniList → plugins meta |
| nota | TMDB → tu ítem → `details` (también en la página de una serie: TMDB → tu ítem → `episodes().series`) |
| duración | TMDB → plugins meta → tu ítem → `details` |
| reparto; eslogan, dirección, clasificación | TMDB (el reparto, luego los plugins meta) |
| logo, notas de otros sitios | tu ítem → plugins meta |

Mientras `details` no haya respondido (hasta su límite), la sinopsis, el año, los géneros y el arte de
AniList y de los plugins meta lo esperan, porque `details` va antes que ellos; todo lo demás se muestra
de una vez.

### Buscar dentro de un "Ver más" (`scopedSearch`, apiVersion 6) { #scoped-search }

Cada página "Ver más" (una fila de Inicio, una fila de tu [sección](section-theme.md), una de tus
Categorías) tiene un campo de búsqueda arriba ("Buscar en esta categoría"). Para todos los plugins,
Kino filtra por nombre los títulos que ya cargó esa página (sin importar tildes ni mayúsculas, cada
palabra en cualquier parte del título); con menos de 24 coincidencias sigue cargando las páginas
siguientes del mismo `ref` ("Buscando en más páginas…"), máximo 10 páginas o 300 títulos por ronda, y la
persona puede pedir otra ronda. Una consulta nueva cancela la que está corriendo.

Declara `"scopedSearch"` en `capabilities` (apiVersion 6, junto con `search`; no hay nada más que
exportar ni línea de consentimiento) para responder tú esa búsqueda, por ejemplo con la búsqueda de tu
backend restringida a esa categoría. Sin `search` el manifiesto se rechaza con "La capacidad
\"scopedSearch\" necesita también \"search\"". Kino llama tu `search` con la consulta de siempre más
`within`, el `ref` de browse de esa página tal como lo diste:

```js
export async function search(query) {
  if (query.within) {
    const category = categoryOf(query.within);      // tu propio ref
    if (!category) return null;                      // "ahí no puedo buscar": Kino filtra la página él mismo
    return searchCategory(category, query.q, query.cursor); // Item[] o Page, paginada por tu `next`
  }
  /* la búsqueda normal */
}
```

Ahí `type` siempre es `"any"`, y `season`, `episode`, `tmdbId` y `year` son `0`. La respuesta se revisa
como cualquier respuesta de búsqueda (los mismos topes, los títulos `adult` solo con el código +18
desbloqueado), y el `next` de una `Page` la pagina mientras la persona baja. Kino vuelve a su propio
filtro cuando respondes `null`, lanzas un error, o no has respondido a los 6 s (la página busca entonces
en sus propios títulos y descarta tu respuesta tardía; tu llamada conserva el límite de 15 s de la
búsqueda). Una falla llega al tablero de errores como cualquier llamada fallida, nunca con la consulta
ni el `ref`; responder `null` no es una falla. `sdk/validate.mjs` avisa cuando declaras `scopedSearch` y
tu archivo de entrada nunca lee `within`; pruébalo con
`node sdk/run.mjs --within '<ref>' ./plugin.js search "texto"`.

### `id` es estable, `ref` puede cambiar { #id-and-ref }

`id` es la identidad de un título: de él cuelgan la biblioteca de la persona, su progreso y
"Continuar viendo", así que tiene que ser el mismo cada vez que vuelve el mismo título, en cada
búsqueda y en cada actualización de Inicio. `ref` es opaco para Kino: es solo lo que tus `episodes`
y `resolve` necesitan para volver a encontrar el título. Puede cambiar de una llamada a otra (las
fuentes vuelven a emitir enlaces), y Kino te puede entregar un `ref` que devolviste antes, por ejemplo
el que quedó guardado con un título en la biblioteca de la persona. Así que haz refs que sigan
funcionando; si los enlaces de tu fuente vencen, pon algo estable en el `ref` (un id) y busca el
enlace fresco dentro de `resolve`.

### Kino es estricto, y tolerante con las listas { #validation }

Cada lista se revisa entrada por entrada: una entrada mala se descarta (con una línea en el log) y
el resto sobrevive; lo que pasa de un tope se corta. Un `Stream` es todo o nada.

| Qué | Reglas |
| --- | --- |
| Resultado de `search` | Máximo 100 ítems (un `Item[]` o una `Page`). Un ítem `live` cuyo nombre no tiene nada que ver con la búsqueda se descarta: se queda solo si su nombre lleva al menos el 60 % de las palabras de 3 o más letras de alguna forma de la búsqueda (lo que se escribió, `originalTitle` o uno de `altTitles`), sin importar tildes ni mayúsculas -- la regla de [`kino.rank.filterRelevant`](kino-api.md#rank). Las películas y series nunca se juzgan así (pueden llevar con razón otro título), y una búsqueda sin ninguna palabra así no descarta nada. Así que no respondas una búsqueda con toda tu lista de canales cuando nada coincide. |
| Resultado de `browse` | Una `Page` de máximo 100 ítems. |
| Resultado de `home` | Máximo 20 filas de máximo 60 ítems cada una. Una fila necesita un `id` único (mismo patrón que el id de un ítem) y un `title` no vacío; las filas sin ítems válidos se descartan. Kino las muestra después de sus propias filas, con el nombre de tu plugin, y las guarda 6 horas (las filas viejas se muestran mientras se actualizan; una respuesta sin filas válidas, o de más de 2 MB, no se guarda y se vuelve a pedir la próxima vez). Si `home()` falla no aportas filas y el Inicio no se bloquea. |
| Resultado de `episodes` | Máximo 5000 capítulos. `number` es obligatorio y va de 1 a 99999 (un capítulo con número 0, como un especial, se descarta). `season` debería ir de 1 a 999; una temporada que falta o está fuera de rango se vuelve 1. `ref` es obligatorio. Una temporada y número repetidos se descartan. Sin `title`, Kino muestra "Capítulo N". |
| `seasons` (en el resultado de `episodes`) | Opcional; máximo 50. Cada una necesita un `id` (mismo patrón que el id de un ítem; uno repetido se descarta), un `ref` no vacío de máximo 4096 caracteres y un `title` no vacío (hasta 200 caracteres), o se descarta. `number` de 1 a 999 y `current` booleano; uno mal puesto se ignora, no la temporada. Lo que no sea una lista se ignora. |
| `id` | `^[A-Za-z0-9._~-]{1,128}$`. Cualquier otra cosa descarta el ítem, así que si los ids de tu fuente tienen otros caracteres (espacios, `/`, `:`, `%`), deriva tú un id estable, como un slug. Los ids repetidos en una lista se descartan. |
| `ref` | Un texto no vacío de máximo 4096 caracteres. |
| `kind` | `"movie"`, `"series"`, (apiVersion 2) `"live"` o (apiVersion 8) `"music"` o `"podcast"`; un ítem `live` se queda en una fila de `home` solo desde apiVersion 6 (por debajo se quita del Inicio: mira [Canales en tus filas de Inicio](live-channels.md#home-rows)). Un ítem `series` de un plugin que no declara `episodes` se descarta: nunca se podría abrir; un ítem `live` de un plugin apiVersion 1 también se descarta (mira [Canales en vivo](live-channels.md#live-items)), y un ítem `music` o `podcast` de un plugin por debajo de apiVersion 8 (mira [Música y podcasts](#music-podcasts)), que no necesita `episodes`. |
| Campos de texto | `title` es obligatorio y no vacío, hasta 200 caracteres. `overview` hasta 2000; `lang` y `quality` hasta 20 (por ejemplo `"es"`, `"1080p"`); `year` hasta 10 (se acepta un número y se convierte). El texto más largo se corta; el texto de `SeriesInfo` y `Episode` se corta igual (200 caracteres para títulos, 2000 para sinopsis). |
| Campos extra del ítem | Todos opcionales; uno mal puesto se ignora, no el ítem. `genres` máximo 5, cada uno de máximo 30 caracteres; `badges` (se muestran como chips, p. ej. `"HD"`, `"Latino"`) máximo 3 de máximo 20; `rating` de 0 a 10; `runtimeMinutes` de 1 a 1000; `ids.tmdb` un entero positivo (Kino lo usa para emparejar tu título con TMDB, para volver a encontrarlo desde la búsqueda y para enriquecer su página de información -- mira abajo); `ids.imdb` cumple `^tt\d{5,10}$` (también enriquece la página de información de una película cuando no tienes `ids.tmdb`). El `airDate` de un capítulo es `YYYY-MM-DD`. |
| `adult` | Desde apiVersion 6, `adult: true` marca una entrada +18: Kino la muestra solo mientras el código +18 de la persona está desbloqueado en ese aparato (Ajustes ▸ Adultos), y la vuelve a esconder cuando lo bloquea; por debajo de apiVersion 6 se descarta. Aplica en Inicio, en la búsqueda, en "Ver más", en tu sección y en Categorías. Mira [Contenido +18](#adult). |
| Imágenes | `poster`, `backdrop` y `still` tienen que ser URL `http` o `https` de máximo 2048 caracteres, o se ignoran (las versiones de Kino anteriores a la que aceptó `http` en imágenes ignoran las `http`). Las imágenes las carga Kino directamente y **no** se revisan contra `hosts` (son solo para mostrar), y Kino no envía tus headers ni tus cookies con ellas. Es la única excepción a la regla de hosts, con un límite: una imagen en la red local, en una dirección IP privada o reservada, o en un nombre local (`localhost`, `.local`, `.lan`, …) también se ignora, y también un nombre sin punto por `http` (`router`, `nas`), salvo que esté en un servidor que la persona escribió en tus ajustes. Una dirección IPv4 pública sirve. |

### `ids.tmdb` enriquece la página de información, no solo el emparejamiento { #tmdb }

Cuando TMDB tiene exactamente este título (emparejado por `ids.tmdb`, o por `ids.imdb` en una
película cuando no diste `ids.tmdb`), al abrirlo se agregan tres tipos de campo, cada uno llenado de
forma distinta:

- **Solo TMDB los tiene, así que siempre vienen de ahí:** un eslogan, el director o (en una serie) el
  creador, el reparto y la clasificación por edad.
- **TMDB gana siempre que tenga respuesta; el tuyo solo es el respaldo de lo que TMDB dejó vacío:**
  el año y los géneros. Un título con su propio año o géneros igual muestra los de TMDB una vez
  emparejado, no los suyos.
- **El tuyo gana cuando lo diste; TMDB solo llena el hueco:** la sinopsis (solo se reemplaza si la
  tuya estaba vacía), la calificación (solo si la dejaste por fuera) y la duración de una película
  (solo si no la pusiste -- la duración de una serie nunca se toca, ni la de TMDB; se muestra por
  capítulo, no para toda la serie).

**No** agrega un póster, un fondo ni temporadas desde TMDB -- esos quedan exactamente como los dio
tu respuesta de `Item`/`SeriesInfo`/`episodes`, o vacíos si los dejaste por fuera.

**Kino 0.9.54 cambia el tercer grupo.** Desde 0.9.54 TMDB va primero también para la sinopsis, el año,
los géneros, la nota y la duración de una película, tanto en la página de una película como en la de una
serie: tus valores son el respaldo de lo que TMDB dejó vacío. El orden completo por campo, con el nuevo
export `details`, AniList y los plugins `meta`, está en [Los detalles propios de un título](#details).
Los títulos de música y podcast nunca se emparejan con TMDB.

### Las reglas del `Stream` { #stream }

- `url` tiene que ser `https` y su host tiene que ser uno de tus `hosts`, igual que el host de cada
  URL de subtítulos, o estar en un servidor que la persona escribió en tus ajustes (exactamente ese
  esquema, host y puerto). La otra única vía a `http` plano es un host que declaraste
  `{ "host": "…", "insecureHttp": true }` (apiVersion 2, [mira el manifiesto](manifest.md#insecure-host)):
  ese host, exacto, acepta `http` para el stream, sus subtítulos, sus pistas de audio y su licencia.
  Un stream que rompe esto se rechaza completo; un subtítulo malo se descarta y el stream igual se
  reproduce. Dos cosas aflojan esto para una película o un episodio: un manifiesto con
  [`streamHosts: "any"`](manifest.md#stream-hosts) y el [permiso amplio de video](#broad-video) de la
  persona; y por un host que se te olvidó se puede [preguntar](#forgotten-host) en vez de rechazarlo.
- `mime` es opcional, con la forma `video/mp4` (cualquier otra cosa rechaza el stream). Cuando falta,
  el reproductor de Kino detecta HLS, DASH o un archivo simple por la URL y el contenido.
- **Todo lo que el reproductor pide para el stream sigue las reglas de hosts de `kino.fetch`.** Eso
  cubre la `url` misma, las variantes, segmentos y llaves `#EXT-X-KEY` que nombra un manifiesto HLS,
  los `BaseURL` de un manifiesto DASH, los subtítulos y cada salto de redirección de cualquiera de
  ellos: cada uno tiene que ser `https` en uno de tus `hosts` (o `http` en uno que declaraste
  `insecureHttp`), nunca una dirección IP ni un nombre local, y un nombre declarado que resuelve
  dentro de la red de la persona se rechaza. Una petición que rompe esto falla antes de salir del
  dispositivo y la reproducción se detiene con un error, así que un manifiesto que apunta a otro CDN
  necesita ese CDN en `hosts`.
- Los `headers` se envían con cada una de esas peticiones del reproductor (el stream, los segmentos y
  llaves de su manifiesto, sus subtítulos y los saltos de redirección, todo en tus `hosts`) y, si
  declaras `download`, con cada petición que guarda el stream en el dispositivo (en HLS: las
  playlists, la llave y cada segmento) — y en ninguna otra parte. Máximo 20; los nombres son letras, dígitos y guiones; los valores tienen máximo 4096
  caracteres sin saltos de línea; `Host`, `Content-Length`, `Transfer-Encoding` y `Connection` se
  ignoran.
- `subtitles`: máximo 30, cada uno `{ lang, url, format? }`. `lang` es un código de idioma corto como
  `"es"` (hasta 20 caracteres; vacío se vuelve `"und"`), `format` es `"vtt"` o `"srt"`.
- `audioTracks`: máximo 8, cada una `{ lang, url, label? }` -- un doblaje o una mezcla alterna que tu
  fuente sirve como archivo propio, aparte del video. Se revisa exactamente como un subtítulo: `url`
  tiene que ser `https` en un host declarado, o el servidor propio de la persona exactamente como lo
  escribió; una entrada mala se descarta y el resto del stream se reproduce igual, y lo mismo una
  `url` que ya estaba en la lista (gana la primera entrada). `lang` hasta 16 caracteres (vacío se
  vuelve `"und"`); `label`, hasta 40 caracteres, se muestra tal cual en el menú de audio cuando lo das,
  en vez de un nombre adivinado a partir de `lang`. Kino une cada una al video y la ofrece, escogida
  automáticamente según la preferencia de audio de la persona, en el mismo menú que las pistas que
  trae el contenedor. Un stream sin `audioTracks` se reproduce exactamente como siempre. Ejemplo, una
  fuente que dobla a dos idiomas:

    ```js
    return {
      url: videoUrl,
      audioTracks: [
        { lang: "es-419", url: dubUrl("es"), label: "Español (Latinoamérica)" },
        { lang: "en", url: dubUrl("en") },
      ],
    };
    ```

- `alternatives` (máximo 8, cada una `{ url, mime?, headers? }`): otras copias del mismo video, la mejor
  primero. Cuando `url` no se puede reproducir en el aparato (un códec para el que no tiene decodificador,
  un archivo roto o no soportado) o ya no está (404, 403), Kino pasa solo a la siguiente alternativa, en
  el mismo punto, y solo muestra un error cuando no queda ninguna. Una red caída no es razón para
  cambiar: eso se reintenta como siempre. Cada entrada se revisa exactamente como `url`, `mime` y
  `headers`; una mala se descarta y las demás siguen contando. Comparten los `subtitles` y `audioTracks`
  del stream. Se ignoran junto a `drm`, con `signing` (la conmutación de un stream firmado es
  `alternateHosts`) y en un canal en vivo. Devuélvelas cuando tu fuente ofrece varios archivos de un
  título (otros servidores, resoluciones, codificaciones): un aparato que no puede decodificar el
  primero igual alcanza a verlo. Cada alternativa tiene que ser **el mismo video en el mismo idioma**
  (el mismo doblaje, los mismos subtítulos quemados o no): Kino cambia entre ellas por su cuenta, así que
  una copia doblada listada junto a la original le cambiaría el idioma a la persona. Ofrece otro idioma
  como otro stream (otro resultado de búsqueda u otra fuente del capítulo), nunca como alternativa. Desde
  Kino 0.9.54, después de varias pausas para cargar, Kino también pasa una vez, por su cuenta, a una copia
  claramente más liviana (como mucho tres cuartos de la altura en pantalla) cuando las etiquetas lo dicen:
  nombra la resolución en la etiqueta (`"Streamwish · 720p"`, `"4K"`, `"Full HD"`); un `HD` o `SD` a
  secas nunca alcanza para eso. Desde apiVersion 6 una alternativa puede llevar un `label`, o ser una
  `{ label, ref }` perezosa que se resuelve solo cuando hace falta: ver
  [Copias con etiqueta y perezosas](#lazy-copies).
- `label` (apiVersion 6): el nombre corto del Stream, y cada alternativa puede llevar el suyo -- por
  ejemplo `"Latino · Servidor 1"`. Se recorta; máximo 48 caracteres, sin caracteres de control, o se
  descarta (la copia igual se reproduce). Cuando un Stream tiene dos o más copias, el reproductor las
  muestra todas, por etiqueta, en una sección **Servidor** arriba de su menú "Audio y subtítulos"
  (celular y TV, alcanzable con el control), donde la persona puede cambiar en cualquier momento y seguir
  viendo desde el mismo punto; una copia sin etiqueta sale como "Opción 2", "Opción 3"… Las etiquetas
  también van al registro del plugin, solo con el host (nunca una URL ni un token).
- `signing`, `signContext` y `alternateHosts` (apiVersion 6): un stream HLS que necesita una firma
  fresca en cada petición. Tienen su propia página: [Firma por petición](signed-streams.md).
- `durationMs` es opcional, en milisegundos.
- `skip` es opcional: dónde están la entrada y el cierre de ESTE archivo, en milisegundos desde su
  comienzo -- `{ openingStartMs?, openingEndMs?, endingStartMs? }`. Kino muestra su botón "Saltar intro"
  desde `openingStartMs` (0 si falta o es `null`) hasta `openingEndMs`, y "Saltar outro" (al siguiente
  capítulo) desde `endingStartMs`. Cada valor debe ser un número finito entre 0 y `durationMs` (o 24 h si
  no das `durationMs`); la entrada necesita su `openingEndMs`, después de su inicio; `endingStartMs` no
  puede ir antes del final de la entrada. Una parte mala se descarta y el resto sigue contando; un `skip`
  malo nunca detiene el stream. Manda los tiempos del archivo exacto que devuelves: otro corte del mismo
  capítulo tiene la entrada en otro lado. Kino los guarda como las marcas del capítulo, también para una
  copia descargada, y se sincronizan con el otro aparato de la persona. Una corrección que la persona
  hace a mano siempre le gana a la tuya; la tuya le gana a los tiempos de la comunidad que Kino busca
  por su cuenta para anime (AniSkip), que ni se consulta cuando mandas `skip`. Se ignora en un canal en
  vivo. Las versiones anteriores de Kino ignoran el campo.

    ```js
    return { url: videoUrl, durationMs: 1_420_000, skip: { openingStartMs: 62_000, openingEndMs: 152_000, endingStartMs: 1_290_000 } };
    ```

- `expiresInSeconds` (de 30 a 86400) dice cuándo puede dejar de funcionar tu URL. Si la reproducción
  falla después de ese tiempo, Kino llama a `resolve` una vez más y sigue donde iba la persona.
- **DRM solo si se declara.** Un stream que traiga cualquiera de `drm`, `license`, `licenseUrl`,
  `drmLicenseUrl`, `keySystem` o `widevine` se rechaza ("El video tiene DRM y los plugins no lo
  soportan") -- salvo que tu manifiesto declare la capacidad `drm` (apiVersion 2) y la única clave de
  ese tipo sea un bloque `drm` `{ type: "widevine", licenseUrl, licenseHeaders? }`: ahí Kino lo
  reproduce como Widevine. `licenseUrl` se revisa exactamente como `url` (https en uno de tus `hosts`,
  o el servidor propio de la persona), y `licenseHeaders` se filtran como los `headers` (máximo 20) y
  solo se envían con la petición de licencia. Las otras cinco claves se rechazan aunque estén junto a
  un bloque `drm` válido. Mira [Un stream protegido con Widevine](cookbook.md#widevine).

### Copias con etiqueta y perezosas (apiVersion 6) { #lazy-copies }

Una fuente suele tener el mismo capítulo en varios idiomas y en varios servidores, y encontrar el video
de cada servidor cuesta tiempo (una página que abrir, a veces una captura del
[navegador oculto](browser.md) de 5 a 25 s). Resolverlos todos antes del primer cuadro haría lento cada
play. Desde `"apiVersion": 6`, las `alternatives` de un Stream pueden nombrar una copia **sin
resolverla**: `{ label, ref }` en vez de `{ url }`. Kino le pasa ese `ref` a tu `resolve(ref)` solo
cuando la copia de verdad hace falta:

- la persona la escoge en el menú **Servidor** del reproductor (la copia en pantalla sigue
  reproduciéndose mientras abre, y después la nueva arranca en el mismo punto; si falla, lee "No se pudo
  abrir …" y sigue viendo la copia que tenía);
- el cambio automático llega a ella (la copia en pantalla no se puede reproducir en este aparato, o ya
  no está);
- la elección de copia de una descarga llega a ella (dentro del mismo presupuesto de 30 s que gasta
  probando copias; una copia perezosa que no ha respondido para entonces se salta, nunca se espera).

Esa llamada es un `resolve` normal: el mismo límite de tiempo (75 s para un plugin
[`browser`](browser.md) aprobado) cuando la persona escogió la copia -- decidió esperarla -- pero
**máximo 20 s cuando la pidió el cambio automático**, y después Kino la cancela (terminando una captura
que siga corriendo) y pasa a la siguiente copia; las mismas revisiones de lo que devuelve,
`kino.browser.capture` permitido (en la elección de copia de una descarga: solo si no hay otra página
abierta; si no, `busy` y la copia se salta), y las preguntas de host como para el título. De su
respuesta Kino usa `url`, `headers`, `mime`, `subtitles` (cuando trae; si no, se quedan los del título),
`expiresInSeconds` (una copia perezosa vencida se resuelve de nuevo, no todo el título) y `skip` (muestra
"Saltar intro" mientras se reproduce esa copia, nunca se guarda: el `skip` del Stream sigue siendo el del
capítulo, y una corrección a mano sigue ganando). Sus propias `alternatives` se ignoran -- una copia
nunca se abre en más copias. Un `resolve` que falla pasa a la siguiente copia.

```js
export async function resolve(ref) {
  // El ref propio de una copia: "<capítulo>|<servidor>". Resuelve solo ese servidor.
  if (ref.includes("|")) return resolveServer(ref);
  const servers = await listServers(ref);            // [{ id, lang, name }], rápido: aún sin abrir página
  const first = await resolveServer(`${ref}|${servers[0].id}`);
  return {
    ...first,
    label: `${servers[0].lang} · ${servers[0].name}`,  // "Latino · Servidor 1"
    alternatives: servers.slice(1, 9).map((s) => ({
      label: `${s.lang} · ${s.name}`,                // "Subtitulado · Servidor 2"
      ref: `${ref}|${s.id}`,
    })),
  };
}
```

Reglas: `ref` es un texto no vacío de máximo 512 caracteres sin caracteres de control (uno malo o
repetido se descarta); una entrada con `url` es una copia normal, lleve lo que lleve; las copias
perezosas y las concretas se mezclan libremente y comparten el límite de 8; cada `label` se recorta,
máximo 48 caracteres, sin caracteres de control, o se descarta mientras la copia sigue contando. Que el
ref alcance para volver a encontrar ese servidor: puede resolverse minutos después del título (una
persona que cambia de servidor a mitad del capítulo). Por debajo de apiVersion 6 las llaves son
desconocidas: un `label` se ignora y una entrada `{ ref }`, al no tener `url`, se descarta igual que
antes. Pruébalo con `node sdk/run.mjs ./plugin.js resolve '<ref>'`, que imprime cada copia con su
etiqueta, y luego `resolve '<el ref de una copia>'` para resolver esa copia.

Un plugin completo que captura su primer servidor y ofrece los demás así está en
[Navegador oculto](browser.md#example).

### Por un host que se te olvidó se puede preguntar, una vez { #forgotten-host }

Cuando la persona abre un título en el reproductor y lo único malo de tu `Stream` es que una URL (el
video, su licencia, un subtítulo o una pista de audio) está en un host `https` que no declaraste, Kino
le pregunta en el momento ("El video está en `<host>`, un servidor nuevo para este plugin.
¿Permitir?"), el mismo diálogo que recibe un [`kino.fetch` a un host no declarado](kino-api.md#fetch).
El reproductor también pregunta cuando se encuentra un host nuevo en plena reproducción (un
manifiesto, un segmento, una redirección). "Permitir" agrega ese host a los hosts aprobados de tu
plugin (no hay tope de cuántos puede aprobar una persona así; una actualización los conserva) y el
video se reproduce; "Rechazar" (o Atrás) queda recordado para tu plugin -- el video falla como se
describe arriba, un subtítulo o una pista de audio se descartan -- y nunca se vuelve a preguntar por
ese host hasta que la persona elija "Olvidar rechazos de host". Nunca se pregunta por una dirección
IP, un nombre local, `http` plano ni un stream roto de cualquier otra forma, y no se pregunta nada
cuando nadie está mirando: una descarga falla en ese host. No te confíes: declara los hosts que usan
tus streams.

### El permiso amplio de video { #broad-video }

Para una película o un episodio, esos diálogos de video, subtítulos y audio tienen una tercera opción,
"Permitir video de cualquier servidor". Es un permiso que da la persona, visible y revocable en
Ajustes ▸ Plugins ("Puede reproducir video desde cualquier servidor", "Quitar permiso de video
amplio"); la única forma de que tú pidas la misma regla de entrada es
[`streamHosts: "any"`](manifest.md#stream-hosts) (apiVersion 4), aprobado en la hoja de
consentimiento. Una actualización o una reinstalación lo conservan; desinstalar lo quita.

Mientras está activo, el `Stream` de tu película o episodio se revisa como el de un canal en vivo con
[`liveStreamHosts: "any"`](live-channels.md#live-stream-hosts): su `url`, todo lo que nombra su
manifiesto, cada salto de redirección **y** sus `subtitles` y `audioTracks` pueden estar en cualquier
host público, por `http` o `https`, incluida una dirección IPv4 pública, y nunca más se pregunta por
un host de video para tu plugin. Una [descarga](manifest.md#downloads) de una película o un episodio
sigue la misma regla. Nunca cubre:

- la red de la casa: direcciones privadas, de loopback, link-local y CGNAT, literales IPv6, nombres
  locales y un nombre público que resuelve dentro de la LAN;
- la `licenseUrl` de un bloque `drm` (sigue solo en tus hosts, con la pregunta de arriba);
- `kino.fetch`: tu propio código sigue llegando solo a tus hosts y a los aprobados uno por uno;
- los canales en vivo, que tienen su propia regla.

Existe para fuentes cuyos servidores de video cambian de dominio en cada video o en plena
reproducción; un plugin con un CDN fijo debería igual declararlo.

## Música y podcasts (apiVersion 8, Kino 0.9.54) { #music-podcasts }

Con `"apiVersion": 8` un ítem puede ser audio: `kind: "music"` (un álbum, una lista o una sola pista) o
`kind: "podcast"` (un programa o un audiolibro), en `search`, `browse`, las filas de `home` y tu
sección, junto a tus películas y series. No hay nada que declarar aparte de la versión: un ítem de audio
**no** necesita la capacidad `episodes`. Kino 0.9.54 todavía no está publicada; un Kino anterior
rechaza un plugin apiVersion 8 con "Este plugin necesita una versión más nueva de Kino", así que declara
8 solo cuando devuelvas ítems de audio o exportes `details`.

```js
export async function search(q) {
  return [
    { id: "album-42", ref: "album:42", title: "Un álbum", kind: "music", artist: "Los Artistas", poster: "https://cdn.example.org/a42.jpg" },
    { id: "show-7", ref: "show:7", title: "Un podcast", kind: "podcast", overview: "Una charla por semana" },
  ];
}

export async function episodes(ref) {            // solo con la capacidad "episodes"
  if (ref.startsWith("album:")) return { episodes: [
    { season: 1, number: 1, ref: "track:1", title: "Primera canción", runtimeMinutes: 4 },
    { season: 1, number: 2, ref: "track:2", title: "Segunda canción", runtimeMinutes: 5 },
  ] };
  // ...los episodios de un podcast, los capítulos de una serie
}
```

Cómo se conectan las piezas:

- **Con `episodes` declarada**, Kino llama `episodes(ref)` con el `ref` del ítem, para cada ítem `music`
  y `podcast`: las pistas de un álbum o una lista, los episodios de un podcast, los capítulos de un
  audiolibro, en tu orden (una sola pista responde una entrada). `number` es el número de pista o de
  episodio, `title`, `still` (la portada) y `runtimeMinutes` funcionan como en cualquier capítulo, y el
  `ref` de cada entrada va a `resolve`. Si declaras `episodes` (para tus series, por ejemplo), tu
  `episodes` también tiene que responder por cada `ref` de `music` y `podcast`, aunque sea una pista
  suelta: no hay forma de saltárselo por ítem.
- **Sin `episodes`**, el `ref` del propio ítem va directo a `resolve` y se reproduce como una sola pista,
  igual que el de una película.
- `artist` (opcional, solo en `music` y `podcast`) es el artista (música) o quien conduce o escribe
  (podcast): se recorta, máximo 200 caracteres, y se ignora en cualquier otro tipo. La página del álbum o
  del podcast lo muestra como la línea debajo del título (y Kino lo nombra como artista donde reproduce el
  audio). Sin él no hay esa línea: Kino nunca la saca de `overview` ni de `genres`.
- `runtimeMinutes` se conserva en un ítem de audio (a diferencia de uno `live`). `search` puede recibir
  `type: "music"` o `type: "podcast"` cuando Kino se inclina hacia ahí; `"any"` los incluye, y sigue
  siendo una pista.
- El `Stream` es uno normal: audio progresivo (MP3, M4A, AAC, OGG) o un manifiesto HLS/DASH. El tipo es
  una pista: un stream que resulta traer video igual se reproduce como video.
- [`migrate`](migrate.md) puede responder un título guardado como `{ kind: "music" | "podcast", id, ref }`
  (por debajo de apiVersion 8 esa respuesta no reclama nada).

Lo que la persona recibe con ellos en Kino 0.9.54:

- Títulos de audio en **portadas cuadradas**, en filas propias del Inicio, después del video en la
  búsqueda y en su propia sección de la biblioteca. Se mantienen lejos de TMDB y de las recomendaciones.
- Una **página de álbum o de podcast** en celular y TV, con "Reproducir", "Aleatorio" y la lista de
  pistas, en lugar de la página de título de video.
- Un **reproductor de audio** para música y podcasts a pedido: el nombre y la portada de la pista,
  adelantar y retroceder, anterior y siguiente (también desde la notificación y los audífonos), y la
  siguiente pista a los 2 s. Un podcast sigue exactamente donde quedó y cuenta como terminado solo en sus
  últimos 30 s.
- **"Seguir escuchando"**, una fila del Inicio para podcasts (el audio sale de "Continuar viendo").
- **Descargas**, cuando declaras `download` (apiVersion 2): los archivos de audio progresivos y el HLS
  solo de audio se guardan como un video, y un álbum descargado se reproduce sin conexión en el
  reproductor de audio.
- **Enviar a la TV**: una pista va a un Chromecast como música, con su título, artista, álbum y portada,
  y a una TV DLNA como ítem de audio; una pista +18 solo envía el nombre de la app.

Límites: un ítem `music` o `podcast` de un plugin por debajo de `"apiVersion": 8` se descarta (con una
línea en el log), y el resto de la respuesta se queda. Los ítems de audio cuentan para los mismos
tamaños de fila y de página que cualquier ítem, y `adult: true` sigue el mismo bloqueo +18.

## Subtítulos para cualquier título { #subtitles }

Exporta `subtitles({ imdbId, tmdbId, kind, season, episode, title, year, languages, file })` y Kino lista lo
que respondas en "Buscar subtítulos en línea" del reproductor (celular y TV), bajo el nombre de tu
plugin, junto a OpenSubtitles y SubDL: para **cualquier** película o capítulo que la persona reproduzca
-- tus títulos, los de otro plugin, los de un addon de Stremio -- siempre que Kino conozca su id de IMDb
o de TMDB (un título que solo se conoce por nombre nunca te llega). La persona escoge una pista, Kino la
descarga, la convierte a SRT y la agrega como cualquier subtítulo en línea (desfase, estilo, recordado
para el título).

Dos formas de ofrecerlo:

- **Un proveedor de subtítulos**: `"capabilities": ["subtitles"]` y nada más. No hace falta `resolve`,
  `search` ni `home`; el plugin no aparece en ninguna parte salvo en la búsqueda de subtítulos y en
  Ajustes ▸ Plugins (no es una fuente en "Elige tus fuentes"). La pantalla de consentimiento dice
  "Agrega subtítulos a tus películas y series". Las versiones anteriores de Kino rechazan una capacidad
  que no conocen: no lo instalan.
- **Junto a tus videos**: deja tus capacidades y solo exporta `subtitles` (declarar también `subtitles`
  agrega la línea de consentimiento, pero entonces las versiones anteriores de Kino rechazarían el
  plugin). Kino le pregunta a todo plugin cuya instalación encontró el export; las versiones anteriores
  nunca lo llaman.

El argumento: `imdbId` (`tt…`) y/o `tmdbId` (un número), al menos uno; `kind` `"movie"` o `"series"`
-- en un capítulo los ids son los **de la serie** y vienen `season`/`episode`; `title` y `year` son
pistas; `languages` son los idiomas de subtítulos de la persona, ISO 639-1, el mejor primero (`["es",
"en"]`). `file` (Kino 0.9.51) es lo que Kino sabe del archivo que suena, cuando la persona busca desde
el reproductor: `{ hash?, size?, name? }`, cada uno solo cuando se conoce, y ausente cuando no se sabe
nada. `hash` es el hash de OpenSubtitles de 16 hexadecimales y `size` los bytes con que se calculó (solo
para un archivo plano y estable); `name` es el nombre del archivo con su extensión
("The.Matrix.1999.1080p.mkv", máximo 200 caracteres), tomado solo de una URL que termina en un nombre de
archivo de video; si no, un nombre al estilo de un release que Kino arma con el título
("Oppenheimer.2023.mkv", "Breaking.Bad.S01E05.mkv"). Nunca la URL del video. Úsalo para poner primero
la versión que coincide con ese archivo exacto; las versiones anteriores de Kino nunca lo mandan, así
que tómalo como una pista. Devuelve un arreglo de `{ lang, url, format?, label?, translated? }`: entradas de los
`subtitles` de un `Stream` más un `label` opcional y `translated: true` para una traducción automática
(el menú entonces dice "Español (traducido)" y la lista después de las pistas hechas por personas en ese
idioma). Kino conserva 30, y después lista solo las de los idiomas de la persona, en ese orden, 15 por
plugin: pon primero los idiomas pedidos. `label` (60 caracteres) se muestra junto al idioma, por ejemplo
el nombre de un release. Cada `url` sigue la regla de subtítulos de un `Stream`: tus `hosts`, el
servidor de la persona, o cualquier host público con [`streamHosts: "any"`](manifest.md#stream-hosts).
Es una llamada en segundo plano (10 s, nunca marca tu plugin "No responde"); devuelve `[]` cuando no
tienes nada. Pruébalo con `node sdk/run.mjs ./plugin.js subtitles tt0944947 1 1` (`KINO_LANGS=es,en`
para los idiomas).

## Describir otros títulos (`meta`, apiVersion 6) { #meta }

Declara `"meta"` y exporta `meta(query)` para completar lo que Kino no encontró de un título en su
página de información, sin importar qué plugin lo listó: una sinopsis, un póster o fondo, géneros, un
año, una duración, una lista de capítulos. Kino le pregunta primero a TMDB y, para un anime, a AniList;
tu respuesta solo llena lo que ellos dejaron vacío, nunca reemplaza un valor que dieron (ni el del
plugin propio del título). Es la forma de describir títulos que TMDB no conoce, como anime `kitsu:`. Sin
línea de consentimiento.

```js
export async function meta(query) {
  // query: { type: "movie" | "series", ids: { imdb?, tmdb?, kitsu?, mal?, anilist? }, id?, lang? }
  //   id: el id estilo Stremio del título en su fuente ("kitsu:1376", "tt0944947"), cuando tiene
  //   lang: el idioma de la persona ("es")
  const found = await lookUp(query.ids);
  if (!found) return null;                         // un título que no conoces: no es una falla
  return {
    title, overview, poster, backdrop, year: "2011", genres: ["Drama"], runtimeMinutes: 57,
    episodes: [{ season: 1, number: 1, title, overview, still, airDate: "2011-04-17", id: "tt0944947:1:1" }],
    logo: "https://img.example.org/got-logo.png",                    // Kino 0.9.51+
    ratings: [{ source: "imdb", value: "9.2" }, { source: "rottentomatoes", value: "89%" }],
    cast: [{ name: "Emilia Clarke", character: "Daenerys Targaryen", photo: "https://img.example.org/ec.jpg" }],
  };
}
```

Todos los campos son opcionales. Las imágenes siguen las mismas reglas que las de un ítem. Desde Kino
0.9.51 hay tres más (las versiones anteriores los ignoran; sin `apiVersion` nuevo):

- `logo`: el logo del título (su nombre dibujado como arte, con fondo transparente). La ficha lo
  muestra en lugar del nombre del título, arriba (celular y TV; el nombre se queda para TalkBack y
  vuelve si la imagen no carga). Las mismas reglas de imagen que un `poster`.
- `ratings`: máximo 6 `{ source, value }`, uno por fuente. `source` es uno de `imdb`, `tmdb`,
  `rottentomatoes`, `metacritic`, `letterboxd`, `mal`, `anilist`, `trakt`; `value` un número como lo
  escribe el sitio, hasta 3 dígitos con hasta 2 decimales, con un `%` o una escala opcional (`"8.8"`,
  `"94%"`, `"4.1/5"`; también sirve un número de JSON). Se muestran junto a la nota ★ de la ficha ("IMDb
  8.8 · Rotten Tomatoes 94%"). A diferencia de los demás campos, se suman: la nota propia de TMDB se
  queda, y un rating `tmdb` se descarta cuando la ficha ya tiene nota. Una entrada mala se descarta y el
  resto se conserva.
- `cast`: máximo 20 `{ name, character?, photo? }` (`name` y `character` de 60 caracteres; `photo` una
  imagen como un `poster`). Como todo campo, solo llena un hueco: Kino muestra el reparto de TMDB cuando
  TMDB lo tiene. Kino muestra los nombres; `character` y `photo` se guardan para después.

`episodes[].id` es el id de video estilo Stremio del capítulo: un título de un addon de Stremio cuyo
propio listado falló puede entonces reproducir esos capítulos con él. Kino le pregunta a la vez a todos
los plugins `meta` de la persona, máximo 6 s cada uno, usa la primera respuesta en orden de instalación
y la recuerda 30 minutos; una falla o un tiempo agotado es simplemente no responder, y la página nunca
te espera.

Lo que Kino lee, campo por campo (el resto de una respuesta se ignora, y cada parte se descarta por su
cuenta):

- Los campos de texto (`title`, `overview`, el `title`/`overview`/`id` de un capítulo, el
  `name`/`character` de alguien del reparto) pueden ser textos o números, se recortan y se cortan en su
  límite. `title` se lee pero nunca se muestra: la página conserva el de la fuente.
- `year`: solo se leen sus primeros 9 caracteres, y sus primeros cuatro dígitos son el año (`1999`,
  `"1999-2003"`; no `"estrenada 1999"`). `runtimeMinutes`: de 1 a 1000 (un texto numérico o un decimal se
  lee como lo lee el JSON de Android), y se muestra solo en una película.
- `genres`: solo textos, los primeros 5 que no estén vacíos, cada uno cortado a 30 caracteres.
- `episodes`: se leen las primeras 5000 entradas, inválidas incluidas; `season` de 0 a 999 (el 0 se
  conserva pero la página nunca lo lista), `number` de 1 a 99999, uno por temporada y número (gana el
  primero), ordenados.
- Imágenes (`poster`, `backdrop`, `logo`, el `still` de un capítulo, la `photo` del reparto): la regla de
  imágenes de un ítem. Una URL se lee primero como texto, y una de más de 2048 caracteres se descarta
  (nunca se corta en una dirección rota).
- Una respuesta cuyas únicas partes útiles son `year` y/o `runtimeMinutes` cuenta como no responder,
  igual que `null`.

Pruébalo con `node sdk/run.mjs <carpeta del plugin> meta tt0133093` (o `tmdb:603`, `kitsu:1376 series`,
varios ids, o la consulta entera como JSON): imprime tu respuesta, el veredicto de Kino para cada campo
(conservado, cortado, descartado y por qué), lo que Kino conserva y cómo lo usaría la ficha (mira
[Probar en local](test-locally.md)). `node sdk/validate.mjs . --run search <texto>` (o `home`, `browse`)
también le pregunta a tu `meta` por el primer título de la respuesta que trae `ids.imdb` o `ids.tmdb`,
como arma Kino la consulta. Al revés, cualquier plugin puede preguntarle a Kino lo que sabe de un título:
[`kino.meta`](kino-api.md#meta) (Kino 0.9.53).

## Plugins de solo catálogo (`catalogOnly`, Kino 0.9.54) { #catalog-only }

Un plugin que lista y describe títulos pero no tiene video propio -- un catálogo de TMDB, una lista de
estrenos, calificaciones -- lo dice con `"catalogOnly": true` en su manifiesto (Kino 0.9.54, todavía no
publicada):

```json
{
  "id": "tmdb", "name": "TMDB", "version": "1.2.0", "apiVersion": 7, "entry": "plugin.js",
  "hosts": ["image.tmdb.org"],
  "capabilities": ["search", "home", "browse", "episodes", "resolve", "meta"],
  "catalogOnly": true
}
```

Lo que hacen con él Kino 0.9.54 y posteriores:

- **Sus títulos toman el camino de "Buscar dónde verlo".** El botón principal de la ficha dice "Buscar
  dónde verlo" en vez de "Reproducir", y cualquier otra entrada al reproductor (el Inicio y su
  reproducción rápida, "Continuar viendo", el destacado, un enlace directo, la reproducción rápida de la
  TV) busca primero el título en los otros plugins de la persona: si una fuente lo tiene, se reproduce;
  si son varias, se abre la lista de fuentes; si ninguna, dice "Ninguno de tus plugins tiene este
  título…". El mismo desvío que tienen los [addons de Stremio](stremio.md) sin streams.
- **Nunca es fuente de un título.** A su `search` no se le pregunta cuando Kino lista las fuentes de un
  título (la pantalla de búsqueda, "Ver otras fuentes" del reproductor, "Buscar dónde verlo"), no se
  ofrece en "Buscar por fuente" y nunca aparece en la lista "Servidor" del reproductor. Dentro de sus
  propias páginas (su sección, "Ver más", la búsqueda dentro de un "Ver más") su catálogo se recorre y se
  busca como siempre.
- **Su `resolve` nunca se llama.** Si igual un título suyo llega al reproductor, el reproductor dice
  "&lt;nombre&gt; solo muestra el catálogo: no reproduce videos. Busca este título en tus otras
  fuentes." (o su versión en inglés), con "Ver otras fuentes" debajo.
- **No es una fuente en "Elige tus fuentes"**, y Kino lo archiva en Utilidades cuando el manifiesto no
  trae `categories`.
- La ventana de consentimiento dice "Solo catálogo: no reproduce videos". No es un permiso: una
  actualización que agrega o quita el campo se aplica sin preguntar.

Las reglas (si no se cumplen, la instalación se rechaza con el mensaje entre comillas):

| Regla | Rechazo |
| --- | --- |
| Solo `true` o `false` | "El campo \"catalogOnly\" debe ser true o false" |
| Al menos una de `home`, `browse`, `search`, `meta` (en lugar de `resolve` más `search` o `home`) | "Un plugin \"catalogOnly\" debe declarar \"home\", \"browse\", \"search\" o \"meta\"" |
| Sin `download`, `drm` ni `channels`: solo sirven para reproducir | "Un plugin \"catalogOnly\" no puede declarar \"download\": no reproduce videos" (el primero que encuentre) |
| Sin `streamHosts` (desde apiVersion 4) y sin `"browser": true` (desde apiVersion 6); `"browser": "pages"` sí vale, lee páginas para el catálogo | "Un plugin \"catalogOnly\" no puede declarar \"streamHosts\": no reproduce videos" |

`resolve` todavía se puede declarar y exportar: cada capacidad que declares tiene que estar exportada,
como siempre, y Kino 0.9.54+ simplemente nunca la llama. `subtitles`, `tracking`, `segments`, `meta`,
`episodes`, `scopedSearch`, `migrate`, `section`, `categories()` y los ajustes funcionan como en
cualquier plugin.

**Sin apiVersion nuevo.** El campo es aditivo, como `discoverable` y `kino.meta`: vale en cualquier
`apiVersion`, y un Kino anterior lo ignora como ignora cualquier clave que no conoce. Eso es lo que
permite que un mismo manifiesto sirva para los dos:

- **Kino 0.9.53 y anteriores** ignoran `catalogOnly` y aplican sus propias reglas, que exigen `resolve`
  y `search` o `home`. Así que, para seguir instalándose ahí, **sigue declarando y exportando
  `resolve`** -- uno que siempre falle con una frase para la persona -- **y declara `search` o `home`**:

    ```js
    export async function resolve() {
      // Solo Kino 0.9.53 y anteriores llaman esto: 0.9.54+ manda primero a la persona a sus otras fuentes.
      throw kino.error("not_found", "catalog only", { userMessage: "Este catálogo no reproduce: busca el título en tus otras fuentes." });
    }
    ```

    Sin ellos, Kino 0.9.53 y anteriores rechazan el plugin ("El plugin debe declarar \"resolve\""), y
    una versión anterior ya instalada simplemente deja de actualizarse ahí. `sdk/validate.mjs` te dice en
    qué caso estás.

- **Kino 0.9.54 y posteriores** leen el campo y nunca llaman ese `resolve`.

`sdk/validate.mjs` imprime la línea de consentimiento y una nota sobre los Kino anteriores;
`sdk/run.mjs . resolve <ref>` igual corre tu `resolve` (para el Kino anterior al que sirve) y te recuerda
que 0.9.54+ nunca lo llama. Un catálogo completo que lo usa: [Un catálogo de TMDB](cookbook.md#tmdb-catalog).

## Contarle a un servicio de seguimiento qué ve la persona (`tracking`, apiVersion 7) { #tracking }

Un plugin de un servicio de seguimiento -- Seenr, Trakt, Simkl, un webhook al estilo de Plex, el
servidor propio de la persona -- declara `"capabilities": ["tracking"]` (solo, con
`subtitles`/`segments`, o junto a las capacidades de una fuente) y `"apiVersion": 7`, y exporta
`track(event)`. Kino lo llama por cada película o capítulo que la persona reproduce **en ese aparato**,
de cualquier fuente. Kino 0.9.50 y anteriores rechazan ese manifiesto con "Este plugin necesita una
versión más nueva de Kino".

- **Consentimiento.** La hoja de instalación dice, en rojo, "Le contará a `<tus hosts>` qué ves y
  cuándo lo terminas" (los 3 primeros hosts, después "y N más"; sin hosts, "al servidor que escribas en
  su configuración"). Una actualización que agrega `tracking` siempre espera a la persona, aunque Kino
  apruebe otras actualizaciones por su cuenta.
- **El interruptor.** Tu pestaña de Ajustes recibe "Enviar lo que veo" (encendido de entrada,
  sincronizado con los otros aparatos de la persona). Apagado, Kino deja de llamar a `track` y borra lo
  que estaba esperando; desactivar o desinstalar el plugin hace lo mismo.
- **Lo que nunca se manda.** Canales en vivo y radio, títulos +18, lo que reproduce un Chromecast o un
  televisor DLNA (el celular es solo un control remoto ahí), un título que no está en la biblioteca de
  la persona, y un capítulo cuyo número Kino no conoce.

**Cuándo.** `start` cuando el video de verdad suena (y otra vez cuando se reanuda tras una pausa);
`progress` como mucho cada 5 minutos de reproducción y en cada pausa (con `paused: true`); `stop` con la
posición cuando la persona sale del título (o pone otro); `watched` **una vez**, cuando la posición
cruza la regla de "visto" de Kino: quedan 3 minutos o menos **y** se vio al menos el 90 %. Un título
abierto ya pasado ese punto (retomado en los créditos en otro aparato) no vuelve a mandar `watched`, y
cada aparato le manda el `watched` de un título a tu plugin máximo una vez.

```js
{
  id: "6f1c…",            // estable: el mismo en cada reintento de este evento; úsalo para ignorar un repetido
  type: "start" | "progress" | "stop" | "watched",
  at: 1759670000000,      // cuándo pasó en el aparato (epoch ms), no cuándo te llegó
  kind: "movie" | "episode",
  ids: { imdb?, tmdb?, tvdb?, anilist?, mal? },   // los de la película; los PROPIOS de un capítulo (abajo)
  title?: "…",            // el nombre de la película; el del capítulo cuando TMDB lo tiene
  year?: 1999,            // el año de una película
  show?: { title: "…", year?: 2008, ids: { imdb?, tmdb?, tvdb?, anilist?, mal? } },   // solo capítulos
  season?: 1, episode?: 2,                          // solo capítulos (temporada 1 si la fuente no dio ninguna)
  positionMs?: 1234000, durationMs?: 8160000, progress?: 0.151,   // dónde iba la persona, 0..1
  paused?: true           // un progress mandado porque la persona pausó
}
```

**Qué ids.** En un **capítulo**, `ids` son los **propios del capítulo** (el id de capítulo de TMDB, y
sus ids de IMDb y TVDB cuando TMDB los conoce) y los **de la serie** van en `show.ids`: nunca uses
`show.ids` donde un servicio espera el id de un capítulo, o el registro cae en el ítem equivocado. Kino
completa con TMDB los ids que le faltan al entregar (máximo 8 s); si TMDB no responde, el evento igual
sale, y los `ids` de un capítulo pueden venir `{}`: recurre a `show.ids` + `season` + `episode`.
`anilist`/`mal` solo aparecen cuando la fuente propia del título los nombró. Toda clave falta cuando no
se conoce; `imdb` es un texto `tt…`, las demás son números.

**Qué devolver.** Cualquier cosa (`{ ok: true }` por convención) significa entregado. Devuelve
`{ skipped: true }` para un evento que a tu servicio no le sirve (uno que no guarda `progress`, un título
que no tiene): Kino lo descarta igual, pero solo una entrega de verdad borra la línea roja "No pudo
avisar…", así que un enlace equivocado sigue a la vista hasta que se arregle. Para fallar, lanza
`kino.error(code)`:

- `timeout`, `network`, `unavailable`, `rate_limited` (y un tiempo agotado de la propia llamada, o un
  error lanzado sin código): Kino reintenta el mismo evento más tarde -- 30 s, duplicando hasta 6 h,
  máximo 12 intentos -- y tus eventos siguientes esperan detrás, en orden;
- `auth_required`, `invalid_request`, `not_found`, `geo_blocked`, `host_not_allowed`, `too_large`: el
  evento se descarta de una vez.

Un evento descartado, o tres fallas seguidas, muestra "No pudo avisar a `<tu plugin>`: …" en rojo en tu
pestaña de Ajustes y en Gestionar, hasta que una entrega funcione. Es una llamada en segundo plano (10 s,
nunca "No responde"), nunca en el hilo del reproductor. Kino guarda máximo 200 eventos en espera por
plugin (el `progress` más viejo sale primero, un `watched` nunca) y descarta uno sin entregar después de
7 días; un `progress` nuevo reemplaza al que espera del mismo título, y un `stop` o `watched` reemplaza
su `progress` en espera. Nada se pierde sin conexión ni con la app cerrada: Kino entrega cuando hay red.

Los registros propios de Kino nunca llevan lo que la persona vio; con "Modo debug" encendido, tu
Registro muestra cada evento enviado. Un addon de Stremio convertido nunca recibe `tracking` (Stremio no
tiene protocolo de scrobble). Pruébalo con `node sdk/run.mjs <carpeta del plugin> track start` (o
`progress`, `stop`, `watched`, y un objeto JSON para cambiar el ejemplo).

## Dónde están la intro y los créditos (`segments`, apiVersion 7) { #segments }

Un plugin que sabe dónde están la intro y los créditos de un título -- una base al estilo de IntroDB,
una al estilo de AniSkip, el servidor propio de la persona -- declara `"capabilities": ["segments"]`
(solo, con `subtitles`/`tracking`, o junto a las capacidades de una fuente) y `"apiVersion": 7`, y
exporta `segments(query)`. Kino muestra entonces sus botones "Saltar intro" y "Saltar outro", y "Saltar
automáticamente" salta la intro, en **cualquier** película o capítulo que la persona reproduzca, de
cualquier fuente, en celular y TV. Kino 0.9.50 y anteriores rechazan ese manifiesto.

- **Consentimiento.** "Agrega el botón para saltar la intro y los créditos", no en rojo (como
  `subtitles`, tu plugin solo se entera de qué título suena). Una actualización que agrega `segments` no
  necesita aprobación propia.
- **Cuándo.** Cuando una película o capítulo de verdad suena (Kino conoce la duración del archivo), en
  segundo plano: la reproducción nunca te espera. Nunca para canales en vivo o radio, títulos +18, ni un
  título que Kino no conoce por ningún id. Se le pregunta a la vez a cada plugin `segments` instalado;
  Kino guarda una respuesta (también una vacía) durante la sesión por título, capítulo y duración
  (redondeada a 10 s), y vuelve a preguntar después de 2 minutos solo cuando fallaron todos.

```js
{
  kind: "movie" | "episode",
  ids: { imdb?, tmdb?, tvdb?, anilist?, mal? },   // los de la película; los PROPIOS del capítulo, como en track()
  show?: { ids: { imdb?, tmdb?, tvdb?, anilist?, mal? } },   // solo capítulos: los de la serie
  season?: 1, episode?: 2,                          // solo capítulos
  durationMs?: 1440000                              // la duración del archivo que suena: responde por ESE corte
}
```

No se manda título, año ni URL; los `ids` de un capítulo pueden venir `{}`, así que recurre a
`show.ids` + `season` + `episode`. **Devuelve** un arreglo de `{ type, startMs, endMs }` (`[]` o `null`
cuando no sabes nada): `type` uno de `intro`, `outro`, `recap`, `credits`, `preview`, tiempos en ms
enteros del archivo. Kino revisa cada entrada por separado y descarta una mala sin perder las demás: un
`type` desconocido, un tiempo que no es entero, un inicio menor que 0, un final que no está al menos 1 s
después del inicio y -- con `durationMs` conocido -- un inicio en el final o después, o un final más de
5 s pasado de él (dentro de eso se recorta). De entradas del mismo tipo que se cruzan se queda la
primera. Kino lee las primeras 100 entradas y conserva 10. La `intro` más temprana es la intro, y el
`outro` o `credits` más temprano después de ella es donde empieza el final; `recap` y `preview` se
aceptan y todavía no tienen botón.

**Quién gana.** La corrección de la propia persona (el editor de marcas) siempre gana, y también el
[`skip`](#stream) del plugin que sirve el archivo. En anime, AniSkip (con "Saltar intro en anime"
encendido) gana parte por parte: tu respuesta solo llena la intro o el final que le falte. Entre dos
plugins `segments` gana el primero, en el orden de Ajustes ▸ Plugins, con una respuesta utilizable. Nada
de lo que respondes se guarda ni se sincroniza. Es una llamada en segundo plano (8 s, nunca "No
responde"); Kino la espera máximo 12 s. Pruébalo con
`node sdk/run.mjs <carpeta del plugin> segments tt0133093 8160000` (una película y su duración) o
`segments tmdb:1396 1 2 2880000` (un capítulo, por el id de la serie): muestra lo que Kino conserva, lo
que descartó y por qué, y el botón que arma con eso.

## Errores que la gente entiende { #errors }

Un `throw new Error("…")` simple le llega a la persona como una falla genérica de tu plugin. Cuando la
falla es de las comunes, lanza un error con tipo y Kino lo dice bien, en español, con el nombre de tu
plugin:

```js
if (r.status === 401) throw kino.error("auth_required", "la sesión venció");
```

| Código de `kino.error` | Lo que ve la persona |
| --- | --- |
| `auth_required` | "Configura {plugin} en Ajustes ▸ {plugin}" cuando tu plugin declara ajustes (tiene su propia pestaña en Ajustes); si no, "Configura {plugin} en Ajustes ▸ Plugins" ("Menú ▸ Plugins" en el celular), con un botón a su pantalla Configurar |
| `not_found` | "No se encontró en {plugin}" |
| `geo_blocked` | "Este contenido no está disponible en tu región" |
| `rate_limited` | "{plugin} está limitando las peticiones; intenta en unos minutos" |
| `unavailable` | "{plugin} no está disponible ahora" |

Tu mensaje es un detalle para el log (cortado a 200 caracteres); la persona lee la frase de Kino. Un
código desconocido se vuelve un error simple.

### Tu propia frase para la persona (`userMessage`, apiVersion 6) { #user-message }

Cuando la frase de Kino dice muy poco (un capítulo que retiraron, una cuenta que hay que vincular de
nuevo), pasa tu propia frase para la persona como tercer argumento:

```js
throw kino.error("not_found", "E100006", { userMessage: "Este capítulo ya no está disponible." });
throw kino.error("auth_required", "E100083", {
  userMessage: "Tu cuenta se abrió en otro dispositivo. Vuelve a intentarlo, o vincúlala de nuevo.",
});
```

Kino la muestra **en lugar de** su propia línea, siempre como "Mensaje de &lt;nombre de tu plugin&gt;:
&lt;tu frase&gt;" ("Mensaje de Demo: Este capítulo ya no está disponible."), y solo cuando se cumple
todo esto; si no, la persona lee la línea de Kino y tu frase no va a ninguna parte (tampoco al log; el
detalle sí):

- el nombre de tu plugin puede presentarla: solo los caracteres de abajo, sin `:`, sin un dígito
  pegado a una letra, nada que deletree Kino (así que un plugin llamado `M3U` o `Cuevana3` siempre
  muestra la línea de Kino; `Cuevana 3` sirve);
- el código es uno de los cinco de la tabla (`timeout`, `network`, `host_not_allowed`, `crypto_error`
  y los demás siempre los redacta Kino);
- tiene de 1 a 160 caracteres sin los espacios de los extremos, hechos solo de las letras del latín
  básico y Latin-1 (lo que escriben el español, el portugués y el inglés: á é í ó ú ü ñ ç ã õ â ê ô à
  è…, pero no ø æ ð þ ß), los dígitos 0-9, el espacio normal y `` . , : ; ¿ ? ¡ ! ' ’ ‘ “ ” « » ( ) % - – — ▸ ``
  (un `;` solo antes de un espacio): nada de otra escritura, letras parecidas, versalitas, saltos de
  línea, tabuladores, otros espacios, caracteres invisibles, emojis ni `@`;
- se lee como palabras normales: al menos dos palabras, sin URL, sin prefijo de error (`TypeError:`,
  `[Tag]`), sin `undefined`/`null`/`NaN`, y no termina en `:` `,` `;` ni `-`;
- menos de 6 dígitos en total, los separe lo que los separe (ningún teléfono ni número de cuenta, y por
  eso tampoco una fecha completa con su año), y ningún dígito pegado a una letra (`en 5 minutos` sirve,
  `5minutos` no);
- ningún dominio: un punto pegado a una letra (`site.app`), un punto después de un espacio
  (`site .app`), un punto seguido de una palabra en minúsculas de 2 a 6 letras (`site. app`), `www`, ni
  `punto`/`dot` pegado o seguido de una terminación de dominio (`punto com`, `puntodev`; "a punto de
  volver" y "en este punto es mejor" sirven: `es`, `la`, `me` y `to` no se leen como terminaciones);
- nunca deletrea Kino: leída con `1`, `l`, `!`, `¡` como `i`, `0` como `o` y sin ningún carácter que no
  sea letra, no contiene `kino` en ninguna parte (así que evita una palabra como "Kinoshita");
- no pide credenciales, dinero ni contacto por fuera de Kino, leída palabra por palabra (una palabra
  partida a propósito se lee entera: `N e q u i`, `Ne qui`, `con tra seña`, `What s app`, `pun to com`):
  nada de `pag…` (pago, pagues, págalo; "página" sirve), `abon…`, `recarg…`, `transfer…`, `consign…`,
  `deposit…`, `contraseñ…`, `passw…`, `clave…`, `credencial…`, `token…`, `tarjeta`, `PIN`, Nequi,
  Daviplata, WhatsApp, Telegram, ni un `código` que llegó por SMS o que es de verificación
  (`verification…`; "Verifica tu conexión" sirve): tus propios ajustes son el único lugar para eso
  (`recarg…` también rechaza "Recarga la lista": di "Vuelve a cargar");
- no contiene ninguna de las contraseñas que la persona escribió en tus ajustes (se compara con los
  valores guardados de tu plugin; mientras no se pueden leer, la frase no se muestra), ni el valor de
  ningún secreto sellado. Nunca repitas lo que la persona escribió, de ninguna forma.

!!! danger "Nunca uses `userMessage` para pedir plata, contraseñas o datos de contacto"
    Cada autor es responsable de su propio plugin. Kino solo **lista** los plugins de la comunidad (su
    búsqueda de la comunidad); no los recomienda ni los promociona. Si un plugin incumple las reglas
    para plugins -- por ejemplo, usa `userMessage` para pedir plata, contraseñas o datos de contacto,
    es malware o infringe los derechos de alguien --, Kino lo retira del índice de la comunidad con
    [`community-blocklist.json`](https://github.com/kinotvapp/kino-plugins/blob/main/community-blocklist.json) (en la raíz de este repositorio), y cualquiera lo puede reportar
    con la plantilla de issue ["Reclamo / retiro de plugin"](https://github.com/kinotvapp/kino-plugins/issues/new?template=reclamo-retiro-plugin.yml). Una copia instalada sigue
    instalada, su tarjeta dice "Retirado del índice de la comunidad." y no recibe más actualizaciones;
    un fork necesita su propio reporte. Ver [Reclamos y retiro de plugins](claims.md).

Escríbela para la persona, en su idioma; Kino no la traduce. Ocupa exactamente el lugar de la línea de
Kino, así que nunca cambia lo que hace la pantalla: `auth_required` conserva el botón a tu pantalla
Configurar; `geo_blocked` muestra el diálogo "No se puede reproducir" del reproductor; los demás códigos
muestran la línea de error de Kino (en un canal en vivo la persona sigue haciendo zapping). También es
el motivo bajo la fila de Inicio de tu plugin y en los avisos de búsqueda. Tu formulario de ajustes y
las páginas de tu sección la muestran para `not_found`, `unavailable` y `rate_limited`, y conservan su
propio texto genérico para `auth_required` y `geo_blocked`. Una sola cosa le gana, sea cual sea el
código: un host que la persona rechazó para esa llamada (sobre eso puede actuar). La frase cuenta solo
para la llamada que construyó el error: créala donde lanzas, no una vez arriba en tu módulo. El kit de
Node (`run.mjs`) imprime lo que leería la persona, o por qué no se muestra la frase. Las versiones de
Kino anteriores a la 0.9.50 ignoran el tercer argumento y muestran su propia línea, así que pasarlo
siempre es seguro.

### Una actualización pendiente le gana al error { #pending-update }

Si una versión nueva de tu plugin está esperando la aprobación de la persona (pide un host, un
permiso o una capacidad nueva), una llamada fallida no muestra la frase de siempre sino "Hay una versión
nueva de &lt;nombre&gt;: actualízala en Ajustes ▸ Plugins", para que la persona sepa qué hacer. Le siguen
ganando un host rechazado, tu `userMessage` válido y `auth_required` (que conserva su botón). Mira
[Actualizaciones](publish.md#updates).

## Contenido +18 (`adult`, apiVersion 6) { #adult }

Desde `"apiVersion": 6`, `adult: true` en un ítem, en una de tus [Categorías](section-theme.md#categories)
o en una categoría o un canal en vivo marca una entrada +18. Kino la muestra solo mientras el código +18
de la persona está desbloqueado en ese aparato (Ajustes ▸ Adultos) y la vuelve a esconder cuando lo
bloquea. No hay nada que declarar en el manifiesto. Por debajo de apiVersion 6 una entrada `adult: true`
se descarta, como antes.

- Aplica en Inicio, la búsqueda, "Ver más", tu sección, Categorías y En vivo. Una fila o un grupo que
  se queda solo con entradas +18 no se muestra mientras el código está bloqueado.
- Todo canal de una categoría +18 cuenta como +18, y un canal +18 nunca entra a "Recientes".
- Los resultados de `liveSearch` necesitan una marca: mira [Marca cada resultado de `liveSearch`](live-channels.md#live-search-adult).
- Enviar un título +18 al TV emparejado pide que el TV también tenga el contenido +18 desbloqueado
  ("Desbloquea el contenido 18+ en el TV para verlo allí").
- Tu plugin no sabe si el código está desbloqueado ni puede saltarse el candado: siempre devuelve la
  marca y Kino decide qué se ve.
