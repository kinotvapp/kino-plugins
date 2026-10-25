# Sockets y bytes que sirve el plugin (`socket` y `byteSource`, apiVersion 13) { #bytes }

!!! note "apiVersion 13 está en desarrollo"
    Nada de esta página está todavía en un Kino publicado. apiVersion 13 viene en la próxima versión de Kino (0.9.75 es
    provisional); el Kino de hoy (0.9.74) llega hasta apiVersion 12 y rechaza un manifiesto con `"apiVersion": 13`
    ("Este plugin necesita una versión más nueva de Kino"). El contrato y el kit ya lo conocen, así que puedes escribir y
    probar un plugin desde ya y publicarlo cuando salga esa versión.

Algunos servicios no son HTTP: un servicio de mensajería habla su propio protocolo sobre un WebSocket, y el video vive
en mensajes, no detrás de una URL. Dos capacidades cubren ese caso. Declara una o las dos, con `"apiVersion": 13`:

```json
"apiVersion": 13,
"capabilities": ["search", "resolve", "socket", "byteSource"],
"hosts": ["ws.example.org"]
```

- **`socket`** le da a tu código `kino.ws`: WebSockets de salida (solo `wss://`) a los hosts que declaras.
- **`byteSource`** deja que `resolve()` responda un stream sin URL, `{ source: "plugin", handle, size, mime }`; Kino le
  pide entonces sus bytes a tu export `read`, un rango a la vez, y los reproduce en su propio reproductor, en un
  Chromecast o en un televisor DLNA.

Ninguna tiene línea de consentimiento propia: `socket` solo llega a los hosts que la pantalla de consentimiento ya
muestra, y `byteSource` no llega a nada.

## `kino.ws`: WebSockets (`socket`) { #ws }

Declarativa: no hay nada que exportar.

```js
const ws = await kino.ws.open("wss://ws.example.org/apiws", { protocol: "binary" });
await ws.send(new Uint8Array([1, 2, 3]));
const reply = await ws.recv(10000);   // Uint8Array, or null when nothing came within 10 s
await ws.close();
```

- **Reglas de host.** Solo `wss://` (un `ws://` simple se rechaza con el código `not_https`), solo por el puerto 443, y el
  host tiene que ser uno que tu manifiesto declara en `hosts` y que la persona aprobó. Cualquier otra cosa se rechaza con
  `host_not_allowed` (el error trae el `host`). Nunca la red local y nunca una IP literal, la misma regla de
  `kino.fetch`. Abrir un socket nunca le pregunta a la persona por un host nuevo: decláralo en `hosts`.
- **Límites.** Máximo 4 sockets abiertos por plugin (el quinto se rechaza con `limit`) y máximo 8 MiB de mensajes
  recibidos sin leer en cola por socket; pasado eso el socket se cierra y `recv` falla con `limit` cuando ya leíste lo
  que había en cola. Un frame que envías tiene máximo 786.000 bytes (uno más grande falla con `too_large`: pártelo). Un
  `recv` espera máximo 60 s (30 s si no le das tiempo). Un socket que el plugin nunca cierra vive hasta que Kino cierra
  el sandbox del plugin (5 minutos sin llamadas), y eso cierra todos los sockets que abrió. Los mensajes son binarios
  (`Uint8Array`).
- **Sockets cerrados.** `send` o `recv` sobre un socket cerrado falla con el código `closed`; `recv` sobre un socket que
  cerró el otro lado responde lo que queda en cola y después falla con `closed`. Cierra cada socket que abras.
- **Consejo para la sesión.** Lo que te deja reconectar después (una llave de autorización, un texto de sesión) es un
  secreto. Guárdalo en un [secreto sellado](manifest.md#secrets) o en `kino.storage`, nunca en el manifiesto ni en los
  logs, y nunca lo mandes a un host que no declaraste.

| `code` del error | Cuándo |
| --- | --- |
| `not_https` | La dirección no es `wss://`. |
| `host_not_allowed` | El host no está declarado y aprobado, no va por el puerto 443, es una IP literal o la red local. |
| `limit` | Un quinto socket, o más de 8 MiB en cola sin leer (y entonces el socket se cierra). |
| `closed` | El socket está cerrado (por ti, por el otro lado o por Kino). |
| `network`, `timeout` | No se pudo hacer la conexión. |
| `too_large` | Un frame para enviar de más de 786.000 bytes (contados ya decodificados). |
| `invalid_request` | Un frame hex o base64 mal formado, o un `encoding` que no es `hex` ni `base64`. |

### Frames como texto: `{ encoding: "hex" | "base64" }` { #encodings }

Tu plugin corre en QuickJS, un intérprete: un ciclo de JavaScript sobre los bytes de un mensaje cuesta tiempo de verdad
en un teléfono, cerca de un segundo por MiB para la decodificación que necesita un `Uint8Array` (medido en un teléfono
reciente). Un protocolo binario que ya trabaja con textos hex (casi todos, porque `kino.crypto` recibe y responde hex)
debería pedir sus frames codificados. Kino entonces codifica lo que responde `recv` y decodifica lo que le pasas a
`send` en código nativo, y ningún JavaScript toca los bytes:

```js
const ws = await kino.ws.open("wss://ws.example.org/apiws", { protocol: "binary" });
await ws.send("efefefef", { encoding: "hex" });                  // 4 bytes, decoded by Kino
const hex = await ws.recv(10000, { encoding: "hex" });          // "0a1b..." (lower case), or null after 10 s
await ws.send("AAECAw==", { encoding: "base64" });              // bytes 0, 1, 2, 3
const b64 = await ws.recv(10000, { encoding: "base64" });       // padded base64, or null
await ws.close();
```

- Sin `encoding` nada cambia: `recv` responde un `Uint8Array` y `send` recibe uno.
- `hex` es un número par de dígitos (en mayúsculas o minúsculas al enviar, en minúsculas al recibir); `base64` es el
  alfabeto estándar, con relleno y sin espacios. Cualquier otra cosa, y cualquier otro `encoding`, falla con
  `invalid_request` antes de enviar un solo byte.
- Todos los límites cuentan los bytes decodificados: un frame de máximo 786.000 bytes son hasta 1.572.000 caracteres hex.

## `byteSource`: un stream que sirve el plugin { #byte-source }

`resolve()` responde un stream que no tiene URL:

```js
return { source: "plugin", handle: "msg:12345", size: 734003200, mime: "video/mp4" };
```

`handle` es tuyo (opaco para Kino, de 1 a 512 caracteres), `size` es el largo total en bytes y `mime` el tipo de medio.
`handle` no lleva caracteres de control, `size` es un número entero positivo y `mime` un tipo de medio (`video/mp4`,
`video/x-matroska`...; sin parámetros); cualquier otra cosa se rechaza ("El video que entregó el plugin no es válido"). Solo
se lee del `resolve` propio de una película, un episodio o una pista, nunca de un canal en vivo ni de una alternativa
perezosa. El reproductor le pide entonces los bytes a tu export `read`, un rango a la vez:

```js
export async function read({ handle, offset, length }) {
  // offset is always a multiple of 4096; length is at most 1048576 (1 MiB)
  const base64 = await fetchRangeAsBase64(handle, offset, length);   // your own code
  return { bytes: base64 };                                          // the range, base64-encoded
}
```

- **Responde exactamente el rango pedido**, o menos bytes solo cuando el rango pasa de `size`. Una respuesta que no es
  `{ bytes }` del largo correcto se rechaza como "El plugin no entregó los datos del video".
- Un plugin que declara `byteSource` tiene que exportar `read`, o la instalación falla con "El plugin no carga: le falta
  read". Una respuesta `{ source: "plugin" }` de un plugin que no declara la capacidad se rechaza.
- **Tiempo.** Cada `read` tiene 20 segundos. Lo que lanza (o un timeout) es lo que la persona lee cuando el video se
  detiene, con las mismas palabras de cualquier otra llamada que falla. Después de 3 lecturas seguidas con timeout Kino
  deja de leer ese stream hasta que se abra otra vez (cada timeout deja la evaluación de tu script corriendo hasta que
  termina sola).
- **Una a la vez.** Las llamadas a `read` llegan de a una, y una llamada que empezó siempre corre hasta el final, aunque
  la persona salte a otro punto mientras tanto, así que una conexión que mantienes abierta entre llamadas sigue abierta.
- **Qué puede llevar el stream.** Un stream de bytes puede llevar `subtitles`, `audioTracks`, `durationMs`, `skip`,
  `label` y `media` como cualquier stream; es solo para una película, un episodio o una pista (nunca un canal en vivo ni
  una alternativa perezosa).
- **Enviar al televisor.** Se puede enviar a un Chromecast o a un televisor DLNA cuando `mime` es un tipo de archivo de
  video o audio que no sea MPEG-TS (`video/mp4`, `video/webm`, `video/x-matroska`, `audio/mpeg`...): el televisor lo pide
  al teléfono por la red de la casa, con una sesión propia que termina con el envío (salir del reproductor no detiene el
  televisor), y cada byte sigue saliendo de tu `read`, que entonces también sirve lo que pide el televisor. Kino nunca lo
  reempaqueta ni lo convierte para el televisor, así que un formato que el televisor no reproduce tal cual no se verá
  ahí.
- **Sin descargas.** Nunca se descarga, así que declarar `download` no sirve en un plugin cuyos streams son todos
  `{ source: "plugin" }`: sus títulos muestran el botón de descarga y cada descarga falla como no descargable.

### Cómo lee Kino, y cómo hacerlo rápido { #performance }

Las llamadas a `read` van en serie por plugin (una a la vez, pida lo que pida el reproductor), así que el tiempo de cada
llamada se suma antes del primer cuadro. Kino pide 1 MiB por llamada, en un offset múltiplo de 1 MiB, lee por adelantado
hasta 3 trozos, guarda los últimos 8 trozos que leyó, y lee temprano el primer y el último trozo del stream, porque un
reproductor necesita los dos antes de arrancar (un MP4 con el índice `moov` al final, los cues de un Matroska). Cuando
la persona salta a otro punto, los trozos en cola para la posición vieja se descartan y la nueva va primero; una lectura
que ya corre igual termina y su trozo se guarda. Lo que hace rápido un trozo es tu propio tiempo por llamada:

- **Pocas lecturas grandes**: responde todo el `length` pedido en una sola llamada; si tu fuente entrega pedazos más
  pequeños, pídelos en paralelo dentro de esa misma llamada en lugar de uno tras otro.
- **Los bytes fuera de los ciclos de JavaScript**: recibe los frames del socket codificados (`{ encoding: "hex" }`,
  arriba), haz la criptografía con `kino.crypto` sobre hex, y deja que el último paso de `kino.crypto` responda
  `outputEncoding: "base64"` en lugar de convertir en JavaScript; cuando el último paso no es una llamada de
  `kino.crypto` (bytes que recortaste de un mensaje hex), pásalos a base64 con `kino.crypto.convert(hex, "hex",
  "base64")`. Un ciclo simple sobre los bytes de 1 MiB toma cerca de un segundo en un teléfono.
- **Menos textos grandes**: cada llamada de `kino.crypto` copia su entrada y su respuesta una vez cada una por el puente,
  así que una llamada que hace dos pasos le gana a dos llamadas (`kino.crypto.aesIgeVerify`, [abajo](#crypto)).
- El `bytes` de tu respuesta cruza tal cual: Kino solo lee `bytes` (cualquier otro campo de la respuesta se descarta), y
  nada recorre el texto en el camino.

**Memoria.** Cada stream abierto ocupa hasta cerca de 12 MiB de la memoria de Kino (los trozos guardados, los leídos por
adelantado y el que está en camino), fuera de tus 64 MB del sandbox; hay máximo 2 streams abiertos a la vez en el
aparato, más máximo 2 servidos a televisores. Lo que arma tu `read` (un texto hex son 2 bytes por byte, y después el
base64) cuenta en tus 64 MB: guarda pocos trozos propios y suelta lo que ya no necesitas. Todavía no se ha medido en
cajas de TV de 1 GB.

## Operaciones de bytes en `kino.crypto` (la próxima versión de Kino: revisa si están) { #crypto }

Para protocolos binarios (MTProto y parecidos), sobre textos en cualquiera de las tres codificaciones (`utf8`, `hex`,
`base64`):

```js
kino.crypto.aesIge("decrypt", keyHex, ivHex, dataHex, { keyEncoding: "hex", ivEncoding: "hex", inputEncoding: "hex", outputEncoding: "hex" })
kino.crypto.modPow(baseHex, expHex, modHex)          // big-endian hex, padded to the modulus' width
kino.crypto.gunzip(b64)                              // base64 in, text out by default
kino.crypto.convert(hex, "hex", "base64")            // re-encoding, done natively
kino.crypto.aesIgeVerify(keyHex, ivHex, dataHex, {   // AES-IGE decrypt + SHA-256 MAC check in one call
  mac: msgKeyHex, macPrefix: authKeySliceHex, macOffset: 8,
  keyEncoding: "hex", ivEncoding: "hex", inputEncoding: "hex", outputEncoding: "hex",
})
```

- `aesIge` es AES-256-IGE: una llave de 32 bytes, un iv de 32 bytes (dos bloques) y datos múltiplos de 16 bytes.
- `modPow` recibe números hex big-endian de máximo 4.096 bits y responde hex rellenado al ancho del módulo.
- `convert(data, from, to)` pasa, por ejemplo, el hex de un trozo que recortaste de un mensaje al base64 que responde un
  `read`, o un texto UTF-8 al base64 de un frame, sin un ciclo de JavaScript sobre sus bytes.
- `aesIgeVerify` descifra como `aesIge("decrypt", ...)` y después revisa que los bytes `macOffset` a
  `macOffset + mac.length` de `SHA-256(macPrefix || plaintext)` sean iguales a `mac` (`mac` y `macPrefix` se leen con
  `macEncoding`, hex por defecto). Responde el texto descifrado solo cuando coinciden; si no, falla con "the mac doesn't
  match". La revisión del msg_key de MTProto 2.0 es exactamente eso, con 32 bytes de la auth key como `macPrefix` y
  `macOffset: 8`: una llamada en lugar de un descifrado, una unión del pedazo de la llave con el texto y un hash.
- Un valor sellado se rechaza en cualquier campo de estas cinco. Cualquier cosa mal formada falla con "invalid crypto
  operation".
- Dependen del Kino en el que corres, no de tu manifiesto: Kino le da a cada plugin el `kino.crypto` de su propia
  versión, así que un Kino anterior a una de ellas no la tiene, declares el `apiVersion` que declares (`convert` y
  `aesIgeVerify` llegaron después de las primeras versiones con apiVersion 13). Revisa cada una y ten un plan B:
  `typeof kino.crypto.convert === "function"`. El kit hace lo mismo: ofrece lo que tiene su propio contrato. No
  necesitan capacidad. Cada llamada de `kino.crypto` recibe máximo 5 MB de datos.

Los `atob` y `btoa` del motor también son más rápidos en la próxima versión de Kino (con tablas, mismas respuestas y
mismos errores), pero un texto de 1 MiB por ellos sigue siendo una pasada a velocidad de JavaScript: para bytes en
volumen usa `kino.crypto.convert`.

## Un ejemplo completo: una biblioteca de videos detrás de un WebSocket { #example }

Un servicio inventado, `files.example.org`, guarda los videos de una persona y habla un protocolo pequeño propio sobre un
WebSocket: cada petición es un frame de JSON en UTF-8; la respuesta a `{"op":"list"}` es un frame de JSON en UTF-8
(`{ "files": [{ "id", "name", "size", "mime" }] }`); la respuesta a `{"op":"read","id","offset","length"}` son los
bytes de ese rango en uno o más frames binarios, y después un frame vacío. El plugin muestra los archivos en Inicio y en
la búsqueda, resuelve un archivo como un stream de bytes y lo sirve con `read`, sin ningún ciclo de JavaScript sobre los
bytes del video: los frames llegan en hex, se unen como textos y pasan a base64 de forma nativa.

`kino-plugin.json`:

```json
{
  "id": "ws-files",
  "name": "WS Files",
  "version": "1.0.0",
  "apiVersion": 13,
  "entry": "plugin.js",
  "hosts": ["files.example.org"],
  "capabilities": ["home", "search", "resolve", "socket", "byteSource"]
}
```

`plugin.js`:

```js
// A video library behind a WebSocket: files.example.org (a made-up service) keeps the files and speaks a tiny protocol
// of its own. Each request is one frame of UTF-8 JSON; the answer to "list" is one frame of UTF-8 JSON; the answer to
// "read" is the range's bytes in one or more binary frames, then an empty frame.
const WS_URL = "wss://files.example.org/ws";
const WAIT_MS = 15000;

let socket = null; // module-level: kept between calls while the sandbox lives (a cache, never relied on)

async function connection() {
  if (!socket) socket = await kino.ws.open(WS_URL, { protocol: "binary" });
  return socket;
}

// Sends one request; on a socket the service closed meanwhile, opens a new one and sends it once more.
async function send(request) {
  const frame = kino.crypto.convert(JSON.stringify(request), "utf8", "base64");
  try {
    await (await connection()).send(frame, { encoding: "base64" });
  } catch (e) {
    if (e.code !== "closed") throw e;
    socket = null;
    await (await connection()).send(frame, { encoding: "base64" });
  }
}

async function nextFrame(encoding) {
  const frame = await socket.recv(WAIT_MS, { encoding });
  if (frame === null) throw kino.error("unavailable", "files.example.org did not answer in time");
  return frame;
}

async function listFiles() {
  const cached = kino.storage.get("files");
  if (cached) return JSON.parse(cached);
  await send({ op: "list" });
  const { files } = JSON.parse(kino.crypto.convert(await nextFrame("base64"), "base64", "utf8"));
  kino.storage.set("files", JSON.stringify(files), { ttlMs: 10 * 60 * 1000 });
  return files; // [{ id, name, size, mime }]
}

const toItem = (f) => ({ id: "f" + f.id, ref: f.id, title: f.name, kind: "movie" });

export async function home() {
  const files = await listFiles();
  return [{ id: "files", title: "Mis videos", items: files.slice(0, 60).map(toItem) }];
}

export async function search(query) {
  const q = String(query.q || "").toLowerCase();
  return (await listFiles()).filter((f) => f.name.toLowerCase().includes(q)).slice(0, 100).map(toItem);
}

export async function resolve(ref) {
  const file = (await listFiles()).find((f) => f.id === ref);
  if (!file) throw kino.error("not_found", "no such file");
  // No URL: Kino plays it through read() below.
  return { source: "plugin", handle: file.id, size: file.size, mime: file.mime };
}

// Kino asks for one range at a time: offset is a multiple of 4096, length at most 1 MiB.
export async function read({ handle, offset, length }) {
  await send({ op: "read", id: handle, offset, length });
  let hex = "";
  for (;;) {
    const frame = await nextFrame("hex"); // hex string, decoded by Kino: no JavaScript loop over the bytes
    if (frame === "") break;              // the empty frame ends the range
    hex += frame;
    if (hex.length > 2 * length) throw kino.error("unavailable", "the service sent more than asked");
  }
  // Exactly the range asked, or fewer bytes only at the end of the file; base64 made natively.
  return { bytes: kino.crypto.convert(hex, "hex", "base64") };
}
```

En qué fijarse:

- **El socket vive más que una llamada** (el `socket` a nivel de módulo), porque el sandbox se reutiliza entre llamadas;
  cuando el servicio o Kino lo cerraron, `send` ve `closed` y abre uno nuevo. Nunca cuentes con que sobreviva: Kino
  cierra el sandbox después de 5 minutos sin llamadas, después de un timeout y en una actualización.
- **Las llamadas nunca se cruzan** (Kino corre una llamada de un plugin a la vez), así que un socket con una petición en
  camino es seguro aquí. Un protocolo que multiplexa (ids de mensaje) puede tener varias peticiones en camino dentro de un
  mismo `read`.
- **Cada byte sigue siendo texto**: frames hex unidos con `+=`, y después `kino.crypto.convert` a base64. Un servicio
  real agrega su propio enmarcado, sus reintentos y su criptografía (`kino.crypto.aesIge`/`aesIgeVerify` sobre el mismo
  hex) de la misma forma.
- Un servicio real también necesita una cuenta: guarda su sesión en un [secreto sellado](manifest.md#secrets) o en
  `kino.storage`, y muestra el inicio de sesión desde el [formulario de ajustes](settings-form.md) (para un televisor, un
  [código QR](qr.md)).

### Pruébalo con el kit { #testing }

El `kino.ws` del kit corre sobre el `WebSocket` global de Node con las reglas de la app (solo wss, hosts declarados por
el puerto 443, los topes de 4 sockets y de tamaño de frame, frames `hex`/`base64` rechazados con las mismas palabras de
la app). Para probar sin red, cambia `globalThis.WebSocket` por una imitación de tu servicio antes de cargar el plugin, y
llama tus exports directamente. Esta es la prueba con la que corrió el ejemplo de arriba (Node 18+, con la carpeta
`sdk/` del kit al lado):

```js
// test/plugin.test.mjs -- node --test test/plugin.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createKino } from "../sdk/kino-shim.mjs";
import { loadPlugin } from "../sdk/sandbox.mjs";
import { validateManifest } from "../sdk/contract.mjs";

const FILE = Buffer.alloc(2_500_000).map((_, i) => (i * 31 + 7) & 255);

// files.example.org, faked: answers "list" and "read" as the protocol above says.
class FakeService {
  constructor() { this.l = {}; this.readyState = 0; setTimeout(() => { this.readyState = 1; this.emit("open", {}); }, 0); }
  addEventListener(n, f) { (this.l[n] ||= []).push(f); }
  emit(n, e) { (this.l[n] || []).forEach((f) => f(e)); }
  reply(bytes) { const c = Uint8Array.from(bytes); setTimeout(() => this.emit("message", { data: c.buffer }), 0); }
  send(data) {
    const req = JSON.parse(Buffer.from(data).toString("utf8"));
    if (req.op === "list") this.reply(Buffer.from(JSON.stringify({ files: [{ id: "a1", name: "Vacaciones 2024", size: FILE.length, mime: "video/mp4" }] })));
    if (req.op === "read") {
      const part = FILE.subarray(req.offset, Math.min(FILE.length, req.offset + req.length));
      for (let i = 0; i < part.length; i += 300_000) this.reply(part.subarray(i, i + 300_000));
      this.reply(new Uint8Array(0));
    }
  }
  close() { this.readyState = 3; this.emit("close", {}); }
}

test("lists, resolves to a byte stream and serves every range", async () => {
  const manifestText = readFileSync(new URL("../kino-plugin.json", import.meta.url), "utf8");
  assert.equal(validateManifest(manifestText).ok, true);
  globalThis.WebSocket = FakeService;
  const { kino } = createKino(JSON.parse(manifestText));
  const { plugin } = await loadPlugin(new URL("../plugin.js", import.meta.url).pathname, kino);
  assert.equal((await plugin.home())[0].items[0].title, "Vacaciones 2024");
  const s = await plugin.resolve("a1");
  assert.deepEqual({ ...s }, { source: "plugin", handle: "a1", size: FILE.length, mime: "video/mp4" });
  for (let offset = 0; offset < FILE.length; offset += 1048576) {
    const { bytes } = await plugin.read({ handle: "a1", offset, length: 1048576 });
    assert.ok(Buffer.from(bytes, "base64").equals(FILE.subarray(offset, offset + 1048576)), "range at " + offset);
  }
});
```

**Las herramientas del kit.** `checkOutput("resolve", ...)` (y por eso `node sdk/run.mjs . resolve <ref>`) acepta la
forma `{ source: "plugin", handle, size, mime }` de un plugin que declara `byteSource`, con las reglas de arriba.
`askRead(plugin, manifest, stream, offset, length)` de `sdk/kino-shim.mjs` llama tu `read` como lo hace el proxy de Kino
(la capacidad y el export, un offset múltiplo de 4.096 dentro del stream, de 1 a 1.048.576 bytes, una llamada a la vez,
20 s, exactamente `min(length, size - offset)` bytes de vuelta) y resuelve con un Buffer. Desde la terminal:

```
node sdk/run.mjs --size 2500000 . read a1 0 1048576   # the byte count, the sha256 and the first bytes
```

`node sdk/init.mjs mi-plugin --host example.com --with byteSource,socket` arma un plugin de apiVersion 13 con un ejemplo
de `read` y de `kino.ws` que funciona y viene comentado.

!!! warning "Lo que el kit no reproduce"
    El lado del reproductor de Kino: los trozos de 1 MiB, la lectura por adelantado, el primer y el último trozo
    temprano, la parada a los 3 timeouts y las sesiones de envío al televisor. Instala el plugin en un aparato para verlo
    reproducir.

Mira también: [la API `kino`](kino-api.md#ws), [los límites](engine-limits.md#limits), [las reglas del
`Stream` en el contrato](contract.md#stream), y [las imágenes del plugin](images.md), que esperan mientras se reproduce un
stream de bytes.
