# Canales en vivo

Hay dos formas de darle televisión en vivo a Kino, y un plugin puede usar las dos:

- **Ítems `live`** (apiVersion 2): canales mezclados en tus propias filas de Inicio, páginas de "Ver
  más" y resultados de búsqueda, al lado de tus películas y series.
- **La capacidad `channels`** (apiVersion 3): tus canales en la pestaña En vivo de Kino, la guía de
  TV, el cajón de canales y la fila "Canales en vivo" de Inicio, dados uno por uno o como una lista
  M3U con una guía XMLTV que Kino descarga y analiza por su cuenta.

Cómo probarlos con el kit de Node está en [Probar en local](test-locally.md#live).

## Canales en vivo (apiVersion 2) { #live-items }

Con `"apiVersion": 2` un ítem puede ser un canal en vivo: `kind: "live"`, en cualquier fila de
`home`, página de `browse` o resultado de `search`, al lado de tus películas y series. No hay nada
que declarar además de la versión.

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

(Busca el enlace en vivo dentro de `resolve`, nunca en `home()`.)

Lo que hace Kino con un ítem `live`:

- Su tarjeta lleva la insignia "EN VIVO" (Inicio, "Ver más", búsqueda, celular y TV), y al tocarla va
  **directo al reproductor**: sin página de información, nada que leer ni escoger. `resolve(ref)`
  recibe el `ref` del ítem, igual que con una película.
- En la **búsqueda**, un ítem `live` solo se queda si su nombre coincide con lo que se pidió (la
  mayoría de las palabras de 3 o más letras de la búsqueda, de su `originalTitle` o de uno de sus
  `altTitles`, como [`kino.rank.filterRelevant`](kino-api.md#rank)). A un plugin de canales que
  responde cualquier búsqueda con toda su lista cuando nada coincide se le descartan esos canales; las
  películas y series nunca se juzgan así.
- El `Stream` se reproduce en vivo: lo que espera el reproductor es un manifiesto en vivo HLS o DASH
  (`.m3u8`/`.mpd`); un archivo progresivo también se reproduce, pero se ve como un canal (sin barra de
  avance, sin duración). `headers`, `subtitles` y `expiresInSeconds` funcionan como en cualquier
  stream; `durationMs` y `audioTracks` se ignoran (un archivo de audio aparte no puede seguir una
  ventana en vivo: pon los otros idiomas de un canal dentro de su manifiesto, p. ej. renditions HLS
  `EXT-X-MEDIA`, y el menú de audio del reproductor los ofrece).
- El reproductor muestra la capa de en vivo (sin barra de progreso, sin adelantar, sin "siguiente") y
  arranca en el borde en vivo. Si se queda atrás de la ventana en vivo, o la lista se reinicia o se
  frena, vuelve al borde en vivo en el mismo lugar sin llamarte (unas cuantas veces por minuto). Ante
  cualquier otro corte, o cuando tu URL deja de funcionar, vuelve a llamar a `resolve` con el mismo
  `ref` a los 2 s, luego a los 4 s, luego a los 8 s: tres reaperturas, que se recargan cuando el canal
  lleva cinco segundos reproduciéndose. Solo después de la tercera reapertura fallida la persona lee
  "Se cortó la señal de &lt;canal&gt; y no volvió". `expiresInSeconds` no juega ningún papel en un
  canal: un corte siempre vuelve a resolver.
- Un canal nunca se guarda: no tiene fila en la biblioteca, ni posición para retomar, nunca sale en
  "Continuar viendo" y nunca se puede descargar (un plugin que declara `download` recibe "Este video
  no se puede descargar" para él). `runtimeMinutes` en el ítem se ignora; un canal no tiene
  `episodes`.

Límites: un ítem `live` de un plugin con `"apiVersion": 1` se descarta en silencio, como cualquier
ítem inválido (y una fila que se queda sin ítems desaparece), así que declara `2` antes de devolver
uno. Un canal cuenta para los mismos tamaños de fila y de página que cualquier ítem. Estos canales
aparecen en tus filas, con el nombre de tu plugin; para poner canales en la pestaña En vivo de Kino y
en su fila "Canales en vivo", usa la capacidad `channels` de apiVersion 3 ([abajo](#en-vivo-tab)).

## Canales en la pestaña En vivo (apiVersion 3) { #en-vivo-tab }

Declara `"apiVersion": 3` y la capacidad `"channels"`, y exporta `liveCategories()` y
`liveChannels({ categoryId, cursor })` (y, si quieres, `guide(...)`, mira [abajo](#live-contract)).
Tus canales aparecen entonces en la pestaña En vivo de Kino, la guía de TV, el cajón de canales y la
fila "Canales en vivo" de Inicio, en una sección con el nombre de tu plugin. `channels` no reemplaza
a `search`/`home`: el manifiesto igual necesita uno de los dos (un plugin que solo tiene canales
exporta un `home()` que devuelve `[]`). Los ítems de tipo `"live"` en tus filas siguen funcionando; un
plugin puede hacer las dos cosas. Al instalar, y en una actualización que la agregue, la persona lee
y aprueba "Agrega canales en vivo a la pestaña En vivo".

## Canales desde cualquier servidor (`liveStreamHosts`, apiVersion 3) { #live-stream-hosts }

Las listas IPTV nombran sus streams en servidores que no puedes conocer de antemano, muchas veces por
`http` plano y muchas veces con una IP pública pelada. Para eso, y solo para eso, un plugin
`channels` puede agregar:

```json
"apiVersion": 3,
"capabilities": ["home", "resolve", "channels"],
"liveStreamHosts": "any"
```

Solo se lee con `"apiVersion": 3` (un manifiesto más viejo lo ignora, como cualquier campo que no
conoce). Ahí, `"any"` es el único valor y necesita la capacidad `channels`: si no, el manifiesto se
rechaza con `El campo "liveStreamHosts" solo admite "any"` o
`"liveStreamHosts" necesita la capacidad "channels"`.

Lo que permite: **el stream de un canal en vivo** (la `url` del `stream` en línea de un canal, o la
`url` que devuelve `resolve` para un canal; los ítems que marcas como en vivo se tratan como canales)
puede estar en **cualquier host público**, por `http` o `https`, incluida una dirección IPv4 pública
(no un literal IPv6). El reproductor pide entonces ese manifiesto y sus variantes, segmentos y llaves,
y sigue sus redirecciones, con la misma regla. Las renditions de audio y subtítulos que lista el propio
manifiesto HLS (`#EXT-X-MEDIA`) son parte de ese stream y siguen la misma regla; los `subtitles` y
`audioTracks` que devuelves en un `Stream` no (mira abajo).

Lo que nunca permite:

- la red de la casa: direcciones privadas, de loopback, link-local y de NAT de operador, literales
  IPv6, `localhost` y nombres locales (`.local`, `.lan`, …), y un nombre público que resuelve a
  cualquiera de ellas (se rechaza cuando el reproductor se conecta);
- otros puertos o esquemas de un servidor que escribió la persona: a ese servidor se llega
  exactamente como se escribió, nunca "any";
- `kino.fetch`: tus propias peticiones siguen llegando solo a tus `hosts` y a los servidores de la
  persona;
- las descargas de la lista y del XMLTV que una declaración `{ playlist }` le pide a Kino: esas URL
  igual tienen que estar en tus `hosts` (o en el servidor de la persona);
- subtítulos, pistas de audio y la `licenseUrl` de un bloque `drm`: siguen siendo solo tus `hosts`, y
  cada redirección que hagan se juzga igual;
- películas y capítulos: un `Stream` que no es en vivo se revisa exactamente como antes (salvo que tu
  plugin declare [`streamHosts: "any"`](manifest.md#stream-hosts) o la persona le haya dado el
  [permiso amplio de video](contract.md#broad-video));
- imágenes: la regla de los pósters (http o https, nunca local) no cambia.

La hoja de consentimiento lo muestra en rojo, "Puede reproducir canales desde cualquier servidor que
indique su lista", y una actualización que lo agregue por primera vez espera la aprobación de la
persona, como un host nuevo.

## Las funciones de canales (apiVersion 3) { #live-contract }

Con la capacidad `channels` ([arriba](#en-vivo-tab)) Kino llama tres funciones más. Sus argumentos:

- `liveCategories()` recibe `null`.
- `liveChannels({ categoryId, cursor })` recibe el `id` de una de tus categorías, y `cursor` `null`
  para la primera página o el `next` de la página anterior.
- `guide({ channelIds, from, to })` recibe máximo 50 ids de tus canales y una ventana de máximo
  24 horas: `from` y `to` son milisegundos epoch.

Devuelven:

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

Un plugin puede dar sus canales de tres formas, y mezclarlas:

1. **Un canal con `ref`.** El `ref` va a `resolve(ref)` cuando la persona lo reproduce, igual que el
   de un ítem `live`, y su Stream se reproduce en vivo.
2. **Un canal con `stream` en línea.** Un `Stream` revisado con las mismas reglas que la respuesta de
   `resolve()` ([Las reglas del `Stream`](contract.md#stream)); se reproduce sin llamar a tu plugin. Un
   canal cuyo `stream` se rechaza se descarta. Con `ref` y `stream` a la vez, se reproduce el stream y
   el `ref` es solo el respaldo. Un canal sin ninguno de los dos se descarta. Algunos canales solo
   responden a un reproductor conocido: dale al `Stream` unos `headers` con el `User-Agent` (o el `Referer`)
   que exige, y el reproductor lo envía en cada petición de ese canal.
3. **Una lista.** Pon entradas `{ playlist: { ... } }` junto a tus categorías en la respuesta de
   `liveCategories()` (o devuelve una sola). Kino descarga la lista M3U por su cuenta, y su guía XMLTV
   desde `epg.url`, y agrupa las entradas en categorías. Las dos URL tienen que ser `https` en uno de
   tus `hosts` (o `http` en uno declarado `insecureHttp`, o un servidor que escribió la persona),
   siempre: una lista en otro host se descarta, y un `epg` en otro host solo pierde la guía. Los
   `headers` van con esas descargas. `streamHeaders` es lo que envía el **reproductor** en cada canal de la
   lista, para los canales que solo responden a un `User-Agent` (o un `Referer`) conocido: se filtran igual
   que los `headers` de un `Stream` y van aparte de `headers` a propósito, porque estos llevan las
   credenciales de tu lista y van solo al host de la lista, nunca a los muchos hosts donde están los canales.
   Un header que la propia entrada del M3U nombra (`#EXTVLCOPT:http-user-agent=...`, `#EXTHTTP:{"User-Agent":"..."}`, un sufijo `url|User-Agent=...&Referer=...`, o los headers de stream de `#KODIPROP`) gana; solo se conservan `User-Agent`, `Referer`, `Origin` y `Cookie`, y un valor con un carácter de control se descarta. Las versiones de
   Kino anteriores a la que agregó `streamHeaders` ignoran el campo, así que la lista se reproduce sin él.
   `refreshHours` va de 1 a 168 (por defecto 12); `hideGroups` lista
   títulos de grupo que no se muestran (sin importar mayúsculas, máximo 50). Con `resolve: true`, cada
   entrada se reproduce por tu `resolve(<entry url>)`, para listas cuyos enlaces necesitan un token
   fresco. Máximo 10 por respuesta.

    Cada entrada recibe un código de canal, la clave de favoritos y recientes: su `tvg-id` cuando es
    un id válido y la entrada es la **primera de la lista en usarlo**; si no, uno hecho con su URL y
    su nombre. Una entrada posterior que repite un `tvg-id` nunca le mueve el código a la primera, pero
    ella misma recibe un código de URL y nombre, que cambia (y sus favoritos y recientes dejan de
    coincidir) cuando cambia su URL; una copia insertada *antes* de la primera se queda con el código
    del `tvg-id`. Dale a cada entrada un `tvg-id` estable y único; `node sdk/run.mjs live playlist <list>`
    lista los repetidos.

Las reglas:

- Los tiempos son milisegundos epoch.
- Máximo 200 categorías (las listas no cuentan), y máximo 500 canales por página de `liveChannels`.
  `id` sigue el patrón del `id` de un ítem; un `id` que empieza por `~` está reservado para las
  entradas de lista propias de Kino y se descarta. Un `id` repetido en una respuesta se descarta.
  `title` es obligatorio.
- `country` es un código ISO 3166 de dos letras (`"CO"`), informativo; cualquier otra cosa se ignora.
  `number` va de 1 a 9999 (cualquier otra cosa cuenta como sin número); `logo` sigue las reglas de los
  pósters; `categoryId` es opcional e informativo (un canal se lista bajo la categoría por la que se
  le preguntó a `liveChannels`); uno que no es un id válido queda vacío.
- Kino pagina `liveChannels` hasta que `next` falta, se repite o no trae nada nuevo, máximo 10
  páginas por categoría.
- Kino guarda tus categorías y canales 1 hora y tu guía 30 minutos.
- `guide` es opcional. Kino conserva las entradas de los canales por los que preguntó, con `end`
  después de `start`, dentro de la ventana, máximo 100 por canal y una por hora de inicio. Una `guide`
  que falla o no está exportada simplemente no se vuelve a pedir durante 30 minutos: tus canales se
  siguen listando.
- Una categoría o un canal con `adult: true` se descarta.

## Tres recetas (apiVersion 3) { #recipes }

Tres formas de llenar la pestaña En vivo, de la que menos código pide a la que más control da. Cada
una es un plugin completo (mira [Canales en la pestaña En vivo](#en-vivo-tab) y
[Las funciones de canales](#live-contract) para las reglas).

### 1. Una lista M3U simple que escribe la persona { #recipe-m3u }

La persona pega la dirección de su lista (y, si la tiene, la de su guía) en Configurar; Kino la
descarga, la agrupa y reproduce cada entrada por su cuenta.

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

`"hosts": []` es suficiente: la lista y la guía están en servidores que escribió la persona. Sus
streams no: una lista IPTV apunta a decenas de servidores que nadie puede declarar de antemano, y para
eso es `"liveStreamHosts": "any"` ([Canales desde cualquier servidor](#live-stream-hosts)). La persona
lo ve en la hoja de consentimiento, en rojo: "Puede reproducir canales desde cualquier servidor que
indique su lista". Déjalo por fuera cuando todos los streams estén en hosts que puedas declarar.

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

### 2. Un token por canal { #recipe-token }

Tu API lista los canales, y cada reproducción necesita una URL recién firmada. `liveChannels`
devuelve ítems `{ id, title, ref }`; `resolve(ref)` firma la URL cuando la persona lo reproduce. El
`expiresInSeconds` de un canal se ignora: cuando se corta un stream en vivo, Kino simplemente vuelve a
llamar a `resolve`.

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

### 3. Mixto { #recipe-mixed }

Tu propia categoría "Destacados" con ítems de `stream` en línea (se reproducen sin llamar a tu
plugin, así que cambiar entre ellos es instantáneo), más la lista completa del proveedor declarada con
`resolve: true`: Kino la descarga y la agrupa, y cada una de sus entradas se reproduce por tu
`resolve(<entry url>)`, que le pega un token.

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

Aquí los streams de la lista tienen que estar en tus `hosts` (`live.example.com`), porque este
manifiesto no declara `"liveStreamHosts": "any"`; `live categories` cuenta como descartadas las
entradas que no lo estén.

```
node sdk/run.mjs . live categories
node sdk/run.mjs . live channels destacados
```

El demo publicado [Tu servidor](cookbook.md#own-server) usa las tres formas a la vez (canales con
`ref`, canales con `stream` en línea y una lista M3U con guía XMLTV), todo en el servidor propio de la
persona.
