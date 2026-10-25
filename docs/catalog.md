# Catálogo y almacenamiento grande (`catalog`, `storageLarge`, apiVersion 13) { #catalog }

!!! note "apiVersion 13 está en desarrollo"
    Nada de esta página está todavía en un Kino publicado. apiVersion 13 viene en la próxima versión de Kino (0.9.75 es
    provisional); el Kino de hoy (0.9.74) llega hasta apiVersion 12 y rechaza un manifiesto con `"apiVersion": 13`
    ("Este plugin necesita una versión más nueva de Kino"). El contrato y el kit ya lo conocen, así que puedes escribir y
    probar un plugin desde ya y publicarlo cuando salga esa versión.

Un plugin cuya fuente es una biblioteca grande (todos los videos de un canal de Telegram, el archivo completo de un sitio,
una carpeta de medios propia) necesita encontrar cosas entre miles de registros. Guardarlos en `kino.storage` y filtrar en
JavaScript obliga a cargar la lista entera en los 64 MB de memoria QuickJS de tu plugin en cada búsqueda. `kino.catalog`
los guarda en una base de datos SQLite que Kino tiene para tu plugin, y busca ahí: tu código solo tiene en la mano la
página que pidió.

## Qué almacén usar { #which-store }

| Guardas | Usa | Por qué |
| --- | --- | --- |
| Ajustes, un token, un cursor, unos pocos valores JSON pequeños | `kino.storage` | 256 KB, síncrono, va en una copia de seguridad con contraseña |
| Unos pocos blobs grandes y opacos que lees enteros (un índice en caché, un paquete de llaves) | `kino.storage` con [`storageLarge`](#storage-large) | 16 MB, un archivo por valor, solo en el aparato |
| Miles de registros que buscas, ordenas y paginas | `kino.catalog` | hasta 100.000 ítems en un archivo de 64 MiB (unos 670 bytes por ítem en promedio, así que mantén `data` pequeño), buscados por Kino, nunca cargados enteros |

## Cómo se declara { #declare }

```json
"apiVersion": 13,
"capabilities": ["search", "resolve", "catalog"]
```

`catalog` es declarativa: nada que exportar, sin línea de consentimiento y sin aprobación (es espacio en este aparato, no
alcance hacia nadie). Un Kino más viejo rechaza el manifiesto ("Este plugin necesita una versión más nueva de Kino"), y un
manifiesto por debajo de `apiVersion` 13 se rechaza con "The \"catalog\" capability needs apiVersion 13". Un plugin que no
la declara no tiene `kino.catalog` (`typeof kino.catalog === "undefined"`), y `sign()` tampoco.

## Las operaciones { #operations }

Cada operación es `async` (usa `await`) y responde valores JSON simples. Las seis, con su forma exacta:

| Llamada | Recibe | Responde |
| --- | --- | --- |
| `kino.catalog.upsert(items)` | una lista de máximo 500 `{ id, title, sort?, data? }` | `{ count }`: cuántos ítems se escribieron |
| `kino.catalog.search(options?)` | `{ q?, limit?, offset?, order? }`: `q` por defecto `""` (todo), `limit` por defecto 50 (de 1 a 100), `offset` por defecto 0 (de 0 a 1.000.000), `order` por defecto `"newest"` | `{ items, total }`: una página de `{ id, title, sort, data }` y el número de todas las coincidencias |
| `kino.catalog.get(ids)` | una lista de máximo 500 ids | los ítems encontrados, en el orden pedido; los ids que faltan se saltan, un id repetido sale una vez |
| `kino.catalog.remove(ids)` | una lista de máximo 500 ids | `{ count }`: cuántos estaban y ya no están |
| `kino.catalog.clear()` | nada | nada: todos los ítems se van y Kino borra el archivo |
| `kino.catalog.count()` | nada | el número de ítems |

Un mini-plugin completo, que corre tal como está (las pruebas del kit de Node corren este mismo código contra una fuente
de mentira). Indexa una fuente que pagina sus videos del más nuevo al más viejo, unas pocas páginas por cada llamada a
Inicio para que ninguna llamada pase su límite de tiempo; responde `search` solo desde el catálogo; quita un video que la
fuente borró cuando alguien intenta reproducirlo; y empieza de nuevo una vez por semana (eso también quita lo que la
fuente borró) o cuando el catálogo vuelve vacío después de una restauración o un reinicio.

```js
// kino-plugin.json (the parts that matter): {"apiVersion": 13, "capabilities": ["home", "search", "resolve", "catalog"], "hosts": ["api.example.org"]}
const BATCH = 500;                         // maxUpsertBatch
const MAX_TITLE = 300;                     // maxTitleChars
const PAGES_PER_CALL = 3;                  // a few source pages per Home call
const ID_RE = /^[A-Za-z0-9._~-]{1,120}$/;  // fits a Kino Item id (128 characters) once prefixed with "v"
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function sourcePage(cursor) {
  const url = "https://api.example.org/videos" + (cursor ? "?after=" + encodeURIComponent(cursor) : "");
  const r = await kino.fetch(url);
  if (!r.ok) throw kino.error("unavailable", "the source answered " + r.status);
  return r.json(); // { videos: [{ id, caption, date, file, poster }], next }, newest first
}

// At most `max` characters (JavaScript's length, as Kino counts them), never cutting a character in two.
function clip(text, max) {
  let t = String(text).slice(0, max);
  if (/[\uD800-\uDBFF]$/.test(t)) t = t.slice(0, -1);
  return t;
}

// One source video as a catalog item, or null to skip it. A caption can be missing or far longer than 300 characters,
// and one bad item would refuse its whole batch of 500: the title is never empty and always fits, the id fits Kino's
// Item id, and `data` holds only small fields.
function toItem(v) {
  const id = String(v.id);
  if (!ID_RE.test(id)) return null;
  const title = clip(String(v.caption || "").replace(/\s+/g, " ").trim(), MAX_TITLE) || "Video " + id;
  return {
    id,
    title,
    sort: Number.isSafeInteger(v.date) ? v.date : 0, // "newest" = the biggest date first
    data: { file: clip(v.file || "", 200), poster: v.poster ? clip(v.poster, 500) : null },
  };
}

async function upsertAll(items) {
  for (let i = 0; i < items.length; i += BATCH) await kino.catalog.upsert(items.slice(i, i + BATCH));
}

// The catalog stays on this device, but kino.storage travels in a backup: after a restore, on a new device or after a
// "damaged" reset the catalog is empty while the markers still say it was indexed. Start over then.
async function forgetIndexIfEmpty() {
  if (kino.storage.get("indexedAt") !== null && (await kino.catalog.count()) === 0) {
    kino.storage.remove("indexedAt");
    kino.storage.remove("cursor");
  }
}

// One step of indexing, from Home (20 s per call), never from search (15 s, and the person is waiting):
// - not complete yet: go on with the full pass where the last step stopped (a cursor in kino.storage);
// - complete: read from the newest video and stop at the first page holding an item already indexed;
// - a week after the last full pass: clear and index again.
async function indexStep() {
  const at = Number(kino.storage.get("indexedAt"));
  if (at && Date.now() - at > WEEK_MS) {
    await kino.catalog.clear();
    kino.storage.remove("indexedAt");
    kino.storage.remove("cursor");
  }
  const complete = kino.storage.get("indexedAt") !== null;
  let cursor = complete ? null : kino.storage.get("cursor");
  for (let i = 0; i < PAGES_PER_CALL; i++) {
    const page = await sourcePage(cursor);
    const items = page.videos.map(toItem).filter((it) => it !== null);
    const known = complete && items.length > 0 && (await kino.catalog.get(items.slice(0, BATCH).map((it) => it.id))).length > 0;
    await upsertAll(items);
    if (known || !page.next) {
      if (!complete) {
        kino.storage.set("indexedAt", String(Date.now()));
        kino.storage.remove("cursor");
      }
      return;
    }
    cursor = page.next;
    if (!complete) kino.storage.set("cursor", cursor);
  }
}

const toKinoItem = (it) => ({ id: "v" + it.id, ref: it.id, title: it.title, kind: "movie", poster: (it.data && it.data.poster) || undefined });

export async function home() {
  try {
    await forgetIndexIfEmpty();
    await indexStep();
  } catch (e) {
    // The source or the catalog is unavailable right now: show what the catalog already has; the next Home goes on.
    if (e.code !== "unavailable") throw e;
    kino.log("indexing paused: " + e.message);
  }
  const newest = await kino.catalog.search({ limit: 20 });
  return [{ id: "newest", title: "Newest", items: newest.items.map(toKinoItem) }];
}

export async function search(query) {
  // The catalog only: cheap enough for every keystroke, and never the network.
  const page = await kino.catalog.search({ q: String(query.q || "").slice(0, 256), limit: 50 });
  return page.items.map(toKinoItem);
}

export async function resolve(ref) {
  const [item] = await kino.catalog.get([ref]);
  if (!item) throw kino.error("not_found", "no longer in the catalog");
  const r = await kino.fetch("https://api.example.org/files/" + encodeURIComponent(item.data.file));
  if (r.status === 404) {
    await kino.catalog.remove([ref]); // the source deleted it: drop it now, not at the weekly rebuild
    throw kino.error("not_found", "the source deleted this video");
  }
  return { url: r.json().url };
}
```

El `id` de un `Item` de Kino tiene que cumplir `^[A-Za-z0-9._~-]{1,128}$`; el `id` de un ítem del catálogo puede ser
cualquier texto de 1 a 128 caracteres, así que conviértelo cuando el tuyo tenga otros caracteres o pase de 128 con el
prefijo (el ejemplo se salta esos videos; un hash del id también sirve).

## Cómo busca { #search }

- **Las mayúsculas y las tildes no importan.** Kino guarda cada título en minúsculas y sin tildes (Unicode NFD sin las
  marcas combinables) y hace lo mismo con `q`: `"pelicula"`, `"PELÍCULA"` y `"Película"` encuentran "Película";
  `"nandu"` encuentra "Ñandú". Los caracteres de control que no son espacios (un NUL, un código de escape) se quitan de
  los dos, así que `"ab\u0000zz"` y `"abzz"` encuentran los mismos ítems.
- **Cada palabra tiene que estar, en cualquier orden, como parte del título.** `q` se parte por los espacios; cada
  palabra tiene que aparecer en alguna parte del título: `"rojo gato"` y `"gato rojo"` encuentran "El gato ROJO", y
  `"gat roj"` también. No hay ranking ni búsqueda aproximada: un ítem coincide o no.
- **`%`, `_` y `\` son caracteres normales.** Nunca son comodines: `"50%"` encuentra "50% off" y no "50 off"; `"a_b"`
  encuentra "a_b" y no "axb". Ninguna búsqueda puede ejecutar nada: de tu lado no hay SQL en absoluto.
- **Un `q` vacío, en blanco o ausente lista todo** (en el orden pedido).
- **Solo se busca en `title`**, nunca en `id` ni en `data`. Pon en el título cada palabra que alguien podría escribir.
- **Orden.** `"newest"` (por defecto): `sort` de mayor a menor; `"oldest"`: de menor a mayor; `"title"`: por el título
  sin mayúsculas ni tildes, luego el título tal como está escrito, luego el id. Los empates siempre se resuelven por
  `id`, así que la misma búsqueda pagina igual todas las veces.
- **`items` y `total`.** `items` es la página (máximo `limit`); `total` es cuántos ítems coinciden en total. Hay más
  cuando `offset + items.length < total`.
- **Paginar.** `limit` va de 1 a 100 (50 por defecto) y `offset` de 0 a 1.000.000, números enteros (`NaN` o `Infinity`
  es `invalid_request`); un `offset` más allá del final responde sin ítems y con el mismo `total`. `q` tiene máximo 256
  caracteres.

```js
await kino.catalog.search({ q: "gato rojo" });                                  // newest first, 50 at most
await kino.catalog.search({ q: "gato", order: "title", limit: 20, offset: 40 }); // the third page of 20, A to Z
const { total } = await kino.catalog.search({ q: "2001", limit: 1 });            // just the count of matches
```

## El modelo de datos { #data-model }

Una tabla, una fila por ítem: `id` (tu llave, de 1 a 128 caracteres), `title` (máximo 300 caracteres; lo único en que se
busca), `sort` (un número entero, 0 por defecto: una fecha en milisegundos, un número de mensaje, un número de episodio)
y `data` (un objeto simple opcional cuyo JSON tiene máximo 4.096 bytes en UTF-8, devuelto tal como lo guardaste). Pon en
`data` los pocos campos que muestras o necesitas para reproducir (la URL de un póster, una duración, la referencia de un
archivo), nunca blobs, páginas de HTML ni credenciales. `upsert` con un `id` que ya está **reemplaza el ítem completo**:
un campo que no mandas se pierde (también `data`). Un lote es una transacción: si se rechaza un ítem del lote, no se
escribe nada de él, así que limpia tus ítems antes (como hace `toItem` arriba) en lugar de mandar lo que te dio la fuente
tal cual.

## Cuántos ítems caben { #how-many }

Valen dos límites a la vez: 100.000 ítems y un archivo de 64 MiB. Los 100.000 ítems caben solo cuando un ítem ocupa en
promedio máximo unos 670 bytes del archivo: su id, su título dos veces (tal como está escrito y sin mayúsculas ni tildes),
su `data` y los dos índices de búsqueda. Medido en las pruebas de Kino con un título de 50 caracteres: unos 370 bytes sin
`data` (caben 100.000, en 37 MB), unos 690 bytes con 300 bytes de `data` (caben unos 96.000), unos 920 bytes con 500
bytes (unos 72.000), y unos 4.850 bytes con 4.000 bytes (unos 13.800). Mantén `data` pequeño: la referencia de un archivo
y la URL de un póster, no una descripción.

## Límites y errores { #limits }

| Límite | Valor |
| --- | --- |
| Ítems por plugin | 100.000, si caben en el archivo (mira "Cuántos ítems caben") |
| `id` | de 1 a 128 caracteres |
| `title` | máximo 300 caracteres |
| `data` | máximo 4.096 bytes de JSON (UTF-8) |
| Ítems por `upsert`, ids por `get` o `remove` | 500 |
| `limit` de `search` | 50 por defecto, máximo 100 |
| `offset` de `search` | máximo 1.000.000 |
| `q` de `search` | máximo 256 caracteres |
| El archivo de la base de datos | máximo 64 MiB |

Cada rechazo es un `KinoError` cuyo `code` dice qué hacer, y cuyo mensaje nombra el límite:

| `code` | Cuándo | Qué hacer |
| --- | --- | --- |
| `invalid_request` | Una forma o un tipo equivocado: `upsert` sin una lista, un ítem sin `id` o `title` de texto, un `sort` con decimales o no finito, un `data` que no es un objeto, un `limit` de 0 o `NaN`, un `order` desconocido. | Corrige la llamada; el mensaje dice qué ítem (`item 3`) y qué campo. |
| `too_large` | Un valor o un lote sobre su límite: `"kino.catalog.upsert: at most 500 items per call (maxUpsertBatch)"`, `"kino.catalog.upsert: item 0 data is over 4096 bytes as JSON (maxDataBytes)"`, un `id` o un `title` largo, `"kino.catalog.search: limit is over 100 (maxSearchLimit)"`, un `offset` o un `q` sobre su límite. | Parte el lote, acorta el valor, pide una página más pequeña. |
| `limit` | El catálogo está lleno: `"kino.catalog.upsert: the catalog is full (maxItems 100000)"` o `"kino.catalog.upsert: the catalog file is full (maxDbBytes 64 MiB)"`. | Quita ítems que ya no necesitas (o `clear` e indexa menos, con `data` más pequeño), y vuelve a intentar. |
| `unavailable` | Kino no pudo leer ni escribir el archivo en este momento (el almacenamiento del aparato falló o está lleno), o el plugin se acaba de quitar. Cuando el archivo estaba dañado, Kino lo borra y empieza uno vacío, y esa llamada dice `"kino.catalog: the catalog file was damaged and has been reset to empty; rebuild it"`. Un archivo que escribió un Kino más nuevo (después de que la persona volvió a un Kino más viejo) dice `"kino.catalog: the catalog file was made by a newer Kino"` en cada llamada hasta que lo borres con `clear()`. | Intenta más tarde; después de "damaged", indexa otra vez desde tu fuente; después de "made by a newer Kino", `clear()` (borra ese archivo y empieza uno nuevo) e indexa otra vez. |

Un `upsert` rechazado no escribe nada de su lote, así que reintentar con uno más pequeño es seguro. Kino nunca borra tu
catálogo por un error de lectura o escritura: solo se reemplaza un archivo que SQLite reporta como dañado.

## Aislamiento y privacidad { #privacy }

- **Un archivo de base de datos por plugin.** Tu catálogo es `catalog.db` dentro de la carpeta de datos de tu plugin,
  con un nombre que sale solo del id de tu plugin; Kino lo elige cuando arranca tu plugin, y ningún argumento que pases
  puede nombrar otro plugin u otro archivo. Ningún otro plugin puede leer ni cambiar tus ítems, y tú no puedes leer los
  suyos.
- **Nunca SQL desde los plugins.** Solo tienes las seis operaciones de arriba; cada valor que mandas va como parámetro.
- **Se queda en este aparato: nunca se sincroniza y no va en las copias de seguridad.** Es un caché de tu fuente que se
  puede reconstruir. Ninguna copia de seguridad lo lleva, así que en otro aparato, después de una restauración ahí, o
  después de que la persona desinstala y reinstala tu plugin, está vacío: revisa `kino.catalog.count()` (como hace
  `forgetIndexIfEmpty` arriba) e indexa otra vez desde tu fuente.
- **Desinstalar el plugin borra el archivo**, y una llamada tuya que siga corriendo en ese momento no lo puede crear otra
  vez.
- **Las credenciales NO van aquí.** Guarda tokens y sesiones en [secretos sellados](manifest.md#secrets), en los ajustes
  de la persona o en `kino.storage`, nunca en `data`.

## Rendimiento { #performance }

- Escribe en lotes de hasta 500 ítems: cada `upsert` es una transacción, mucho más rápido que una llamada por ítem.
- Nunca cargues el catálogo entero en memoria para filtrarlo tú: pídele a `search` una página y deja que Kino busque. Una
  página tiene máximo 100 ítems.
- Pagina los resultados grandes con `limit`/`offset` en lugar de pedirlo todo; lee `total` con `limit: 1` cuando solo
  necesitas la cuenta.
- Lo que cuesta: una búsqueda lee cada título una vez (una búsqueda por partes de palabra no puede usar un índice para
  encontrar palabras; los índices llevan el texto buscado, así que las filas solo se leen para las coincidencias) más la
  página pedida. Medido en las pruebas JVM de Kino en un computador de escritorio (un Mac con Apple Silicon), no en un
  teléfono ni en una caja de TV: dos búsquedas con sus totales sobre 50.000 ítems tomaron de 68 a 86 ms, sin `data` y con
  500 o 4.000 bytes de `data` por ítem por igual. Un teléfono o una caja de TV de 1 GB es más lento por un factor que
  nadie ha medido todavía: prueba tu plugin en el aparato más lento que soportes.
- Indexa desde Inicio o desde un refresco propio, unas pocas páginas de la fuente por llamada, nunca dentro de `search`:
  cada llamada tiene su propio límite de tiempo (15 s para `search`, 20 s para `home`) y la persona espera una búsqueda.

## Recetas { #recipes }

- **Indexar una biblioteca remota de a poco.** Como `indexStep` arriba: una pasada completa la primera vez, unas pocas
  páginas por llamada con un cursor en `kino.storage`; después, leer desde el ítem más nuevo y parar en la primera página
  que tenga un ítem ya indexado (`kino.catalog.get` lo responde), haciendo `upsert` de cada página en el camino. Una
  reconstrucción completa (`clear` y volver a indexar) es para un horario (una vez por semana quita lo que la fuente
  borró) o cuando tu fuente cambió de forma.
- **Buscar mientras la persona escribe.** En una página "Ver más" con `scopedSearch`, Kino espera 400 ms después de que la
  persona deja de escribir antes de llamar tu `search`, y una búsqueda nueva puede venir enseguida: responde cada llamada
  directo desde `kino.catalog.search({ q: query.q })`, nunca desde la red. Mientras el catálogo siga vacío, responde lo
  que tenga (nada): Inicio lo llena.
- **Decir cuando los ítems más viejos todavía no cargan.** Mientras la pasada completa no ha terminado (el marcador
  `cursor` de arriba sigue ahí), agrega un ítem a tu fila de Inicio, o un `userMessage` a una búsqueda vacía, que diga
  que la biblioteca todavía se está leyendo; quítalo cuando ya esté `indexedAt`.

## Un almacenamiento más grande, en su lugar: `storageLarge` { #storage-large }

Un plugin que indexa un catálogo (miles de videos de un canal, una biblioteca que arma desde su fuente) se queda sin los
256 KB después de unos cientos de entradas. Para **buscar** entre miles de registros, usa [`kino.catalog`](#catalog):
nunca los carga en tu memoria. Declara `storageLarge` y el mismo `kino.storage` guarda **16 MB en total (16.777.216
bytes: cada llave y cada valor, en UTF-8), máximo 2 MB por valor (2.097.152 bytes) y máximo 1.000 llaves de máximo 256
caracteres**:

```json
"apiVersion": 13,
"capabilities": ["search", "resolve", "storageLarge"]
```

- La misma API y las mismas reglas de `ttlMs`. Declarativa (nada que exportar) y sin línea de consentimiento: es espacio
  en el aparato, no alcance.
- **Parte el catálogo en valores de máximo unos 512 KB** (`catalog:0`, `catalog:1`, ... más una llave pequeña que dice
  cuántos hay). Cada texto que tiene tu plugin cuesta memoria de QuickJS (un texto de 2 MB son 4 MB de tus 64 MB), y Kino
  guarda cada valor en su propio archivo: un `get` lee un valor, un `set` escribe un valor, así que los pedazos pequeños
  siguen rápidos en una caja de TV de 1 GB.
- Pasarse lanza un `KinoError` con `code` `"too_large"`: `"plugin storage full (2 MB per value)"`, `"plugin storage full
  (16 MB)"` cuando todo el almacén pasaría de 16 MB, `"plugin storage full (1000 keys)"`. Una llave de más de 256
  caracteres es `"invalid_request"`. Una escritura rechazada no cambia nada.
- **Es solo del aparato: nunca se sincroniza y NO va en ninguna copia de seguridad.** Un plugin sin la capacidad tiene
  sus 256 KB de `kino.storage` en una copia de seguridad con contraseña; un plugin con `storageLarge` no tiene nada de su
  `kino.storage` en una copia de seguridad, y restaurar una lo deja vacío. Trátalo como un caché que reconstruyes desde
  tu fuente.
- **Declarar `storageLarge` mueve tus llaves existentes a ese almacén del aparato.** La primera llamada después de una
  actualización que lo agrega mueve todo lo que tu plugin tenía guardado (tokens y sesiones incluidos) fuera del almacén
  que va en las copias de seguridad, máximo 1.000 llaves de máximo 256 caracteres (el resto se descarta). Guarda las
  credenciales y las sesiones en [secretos sellados](manifest.md#secrets) o en los ajustes de la persona, o en un plugin
  que no declare `storageLarge`.
- Una actualización que quita `storageLarge` vuelve a empezar desde un almacén vacío de 256 KB (el más grande se queda en
  el aparato hasta que la capacidad vuelva o se desinstale el plugin).
- Un Kino más viejo rechaza un manifiesto con `storageLarge` ("Este plugin necesita una versión más nueva de Kino").
