# El contrato (apiVersion 1, 2 y 3)

Tu archivo de entrada es un módulo ES que exporta una función `async` por cada capacidad que
declaraste, y no se llama nada que no hayas declarado:

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

([`kino.d.ts`](reference/index.md) tiene las mismas formas como declaraciones de TypeScript.)

Usa exports con nombre (`export async function ...`). Los datos entran y salen de tu código como
JSON, así que devuelve datos simples: textos, números, booleanos, arreglos y objetos.

Las tres funciones de canales en vivo (`liveCategories`, `liveChannels`, `guide`, apiVersion 3)
tienen sus argumentos y reglas en [Canales en vivo](live-channels.md#live-contract).

## Argumentos { #arguments }

- `search(query)` recibe `{ q, type, season, episode, tmdbId, year, originalTitle, altTitles, cursor }`:
    - `q` es el texto que escribió la persona (puede estar vacío; devuelve `[]`).
    - `type` es `"movie"` o `"series"` cuando Kino se inclina por ese tipo, y `"any"` si no. Es una
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
- `home()` recibe `null`.
- `browse(ref, cursor)` recibe el `ref` de una de tus filas de Inicio (o un `ref` que dio una página
  anterior), y `cursor` `null` para la primera página o el `next` de la página anterior.
- `episodes(ref)` recibe el `ref` de un ítem `series`, tal como lo devolviste.
- `resolve(ref)` recibe el `ref` de un ítem `movie`, el `ref` de un capítulo o (apiVersion 2) el
  `ref` de un ítem `live`.

## Lo que devuelves { #returns }

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

**Género (Categorías y el filtro de En vivo).** Una `Row` del Home, una `LiveCategory` de En vivo y una `playlist` pueden llevar un `genre` opcional de una lista cerrada de diez ids: `peliculas`, `series`, `anime`, `infantil`, `documentales`, `deportes`, `noticias`, `musica`, `entretenimiento`, `otros` (Kino muestra sus nombres en español). Sirve para que Kino alinee categorías de plugins distintos: la pestaña Categorías agrupa por género las filas del Home que se pueden explorar (las que tienen `ref`, si declaras `browse`) de todos los plugins, y En vivo puede acotar sus categorías por género. Un valor fuera de la lista se ignora, nunca es un error, y sin `genre` Kino lo adivina por el título de la fila o del grupo ("Deportes", "Noticias Colombia", "Kids"…), así que ponlo cuando tus títulos no lo digan. En una `playlist` el género es el de partida para los grupos de la lista (antes se intenta adivinar por el título de cada grupo). Las versiones de Kino anteriores a este campo lo ignoran.

### Cómo se conectan las piezas { #pieces }

El `ref` de un ítem `movie` va a `resolve`. El `ref` de un ítem `series` va a `episodes`, y el `ref`
de cada capítulo va a `resolve`. El `ref` de un ítem `live` (apiVersion 2, mira
[Canales en vivo](live-channels.md#live-items)) también va a `resolve`, y su Stream se reproduce en
vivo. El `ref` de una fila va a `browse`, y lo mismo el `next` de cada página.

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
| Resultado de `search` | Máximo 100 ítems (un `Item[]` o una `Page`). |
| Resultado de `browse` | Una `Page` de máximo 100 ítems. |
| Resultado de `home` | Máximo 20 filas de máximo 60 ítems cada una. Una fila necesita un `id` único (mismo patrón que el id de un ítem) y un `title` no vacío; las filas sin ítems válidos se descartan. Kino las muestra después de sus propias filas, con el nombre de tu plugin, y las guarda 6 horas (las filas viejas se muestran mientras se actualizan; una respuesta sin filas válidas, o de más de 2 MB, no se guarda y se vuelve a pedir la próxima vez). Si `home()` falla no aportas filas y el Inicio no se bloquea. |
| Resultado de `episodes` | Máximo 5000 capítulos. `number` es obligatorio y va de 1 a 99999 (un capítulo con número 0, como un especial, se descarta). `season` debería ir de 1 a 999; una temporada que falta o está fuera de rango se vuelve 1. `ref` es obligatorio. Una temporada y número repetidos se descartan. Sin `title`, Kino muestra "Capítulo N". |
| `seasons` (en el resultado de `episodes`) | Opcional; máximo 50. Cada una necesita un `id` (mismo patrón que el id de un ítem; uno repetido se descarta), un `ref` no vacío de máximo 4096 caracteres y un `title` no vacío (hasta 200 caracteres), o se descarta. `number` de 1 a 999 y `current` booleano; uno mal puesto se ignora, no la temporada. Lo que no sea una lista se ignora. |
| `id` | `^[A-Za-z0-9._~-]{1,128}$`. Cualquier otra cosa descarta el ítem, así que si los ids de tu fuente tienen otros caracteres (espacios, `/`, `:`, `%`), deriva tú un id estable, como un slug. Los ids repetidos en una lista se descartan. |
| `ref` | Un texto no vacío de máximo 4096 caracteres. |
| `kind` | `"movie"`, `"series"` o (apiVersion 2) `"live"`. Un ítem `series` de un plugin que no declara `episodes` se descarta: nunca se podría abrir; un ítem `live` de un plugin apiVersion 1 también se descarta (mira [Canales en vivo](live-channels.md#live-items)). |
| Campos de texto | `title` es obligatorio y no vacío, hasta 200 caracteres. `overview` hasta 2000; `lang` y `quality` hasta 20 (por ejemplo `"es"`, `"1080p"`); `year` hasta 10 (se acepta un número y se convierte). El texto más largo se corta; el texto de `SeriesInfo` y `Episode` se corta igual (200 caracteres para títulos, 2000 para sinopsis). |
| Campos extra del ítem | Todos opcionales; uno mal puesto se ignora, no el ítem. `genres` máximo 5, cada uno de máximo 30 caracteres; `badges` (se muestran como chips, p. ej. `"HD"`, `"Latino"`) máximo 3 de máximo 20; `rating` de 0 a 10; `runtimeMinutes` de 1 a 1000; `ids.tmdb` un entero positivo (Kino lo usa para emparejar tu título con TMDB, para volver a encontrarlo desde la búsqueda y para enriquecer su página de información -- mira abajo); `ids.imdb` cumple `^tt\d{5,10}$` (también enriquece la página de información de una película cuando no tienes `ids.tmdb`). El `airDate` de un capítulo es `YYYY-MM-DD`. |
| `adult` | Un ítem con `adult: true` se descarta: Kino todavía no tiene un lugar detrás de su candado +18 para títulos de plugins. |
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

### Las reglas del `Stream` { #stream }

- `url` tiene que ser `https` y su host tiene que ser uno de tus `hosts`, igual que el host de cada
  URL de subtítulos, o estar en un servidor que la persona escribió en tus ajustes (exactamente ese
  esquema, host y puerto). La otra única vía a `http` plano es un host que declaraste
  `{ "host": "…", "insecureHttp": true }` (apiVersion 2, [mira el manifiesto](manifest.md#insecure-host)):
  ese host, exacto, acepta `http` para el stream, sus subtítulos, sus pistas de audio y su licencia.
  Un stream que rompe esto se rechaza completo; un subtítulo malo se descarta y el stream igual se
  reproduce.
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
  declaras `download`, con la petición que guarda el stream en el dispositivo — y en ninguna otra
  parte. Máximo 20; los nombres son letras, dígitos y guiones; los valores tienen máximo 4096
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

- `durationMs` es opcional, en milisegundos.
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

## Errores que la gente entiende { #errors }

Un `throw new Error("…")` simple le llega a la persona como una falla genérica de tu plugin. Cuando la
falla es de las comunes, lanza un error con tipo y Kino lo dice bien, en español, con el nombre de tu
plugin:

```js
if (r.status === 401) throw kino.error("auth_required", "la sesión venció");
```

| Código de `kino.error` | Lo que ve la persona |
| --- | --- |
| `auth_required` | "Configura {plugin} en Ajustes ▸ Plugins", con un botón a su pantalla Configurar |
| `not_found` | "No se encontró en {plugin}" |
| `geo_blocked` | "Este contenido no está disponible en tu región" |
| `rate_limited` | "{plugin} está limitando las peticiones; intenta en unos minutos" |
| `unavailable` | "{plugin} no está disponible ahora" |

Tu mensaje es un detalle para el log (cortado a 200 caracteres); la persona lee la frase de Kino. Un
código desconocido se vuelve un error simple.
