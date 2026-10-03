# La API `kino`

`kino` es un objeto global, congelado, que siempre está. Nada más del mundo exterior está.

```js
kino.apiVersion   // 5 -- the highest apiVersion this build of Kino understands, not your manifest's
kino.appVersion   // the version of Kino, for example "1.42.0"
kino.lang         // "es-CO"
```

(`kino.apiVersion` es el `apiVersion` más alto que entiende esta versión de Kino, no el de tu
manifiesto; `kino.appVersion` es la versión de Kino.)

Kino también pone los globales web que le faltan a QuickJS, escritos en JavaScript y congelados:
`URL`, `URLSearchParams`, `atob`, `btoa`, `TextEncoder` y `TextDecoder` (solo UTF-8). Se comportan
como los del navegador (comparados con Node sobre un corpus de casos), salvo que `URL` no convierte
nombres de dominio internacionales a punycode. Una `URL` se puede cambiar en el sitio con los setters
de siempre (`protocol`, `username`, `password`, `host`, `hostname`, `port`, `pathname`, `search`,
`hash`, `href`), que, como en el navegador, nunca lanzan error: un valor que no pueden usar deja la
URL como estaba.

Toda la API está declarada en [`kino.d.ts`](reference/index.md) para tu editor.

## `await kino.fetch(url, options?)` { #fetch }

```js
const r = await kino.fetch("https://archive.org/metadata/" + encodeURIComponent(id), {
  method: "GET",              // GET (default), POST, PUT, PATCH, DELETE or HEAD
  headers: { Accept: "application/json" },
  body: "a=1&b=2",            // see "Bodies" below; sent only with POST, PUT and PATCH
  redirect: "follow",         // or "manual": get the 3xx itself, with its Location header
  cookies: true,              // false: neither send nor store cookies for this request
  timeoutMs: 20000,           // default 15000, at most 30000
});
r.ok        // true for 200 to 299
r.status    // the HTTP status
r.url       // the final URL, after redirects
r.headers   // { "content-type": "...", ... }: names in lowercase, repeated headers joined with ", "
r.text()    // the body as a string (already downloaded)
r.json()    // JSON.parse of the body
r.base64()  // the body bytes as base64: for anything that is not text
```

Las opciones: `method` es `GET` (por defecto), `POST`, `PUT`, `PATCH`, `DELETE` o `HEAD`; `body` solo
se envía con `POST`, `PUT` y `PATCH`; `redirect: "manual"` te entrega la respuesta 3xx misma, con su
header `Location`; `cookies: false` ni envía ni guarda cookies en esa petición; `timeoutMs` es 15000
por defecto y máximo 30000. La respuesta: `r.ok` es `true` de 200 a 299, `r.url` es la URL final
después de las redirecciones, y `r.headers` tiene los nombres en minúsculas, con los headers repetidos
unidos con `", "`.

Kino le entrega a tu código el texto o los bytes de un cuerpo, según su `Content-Type`; la otra forma
se convierte dentro del motor cuando la pides, y para un cuerpo de varios MB eso toma segundos del
tiempo de tu llamada. Pide la forma que tiene el contenido.

- **Cuerpos.** Un texto se envía tal cual (`text/plain` salvo que pongas `Content-Type`).
  `{ json: value }` envía `JSON.stringify(value)` como `application/json`; `{ form: { a: 1 } }` envía
  `application/x-www-form-urlencoded`; `{ base64: "…" }` envía esos bytes.
- **Solo https, y solo tus hosts.** El host de la petición y de **cada salto de redirección** tiene
  que coincidir con `hosts` (`*.x` coincide con los subdominios de `x`, no con `x`), o ser un servidor
  que la persona escribió en tus ajustes, exactamente como lo escribió. Una petición a cualquier otra
  cosa falla antes de salir del dispositivo. Una URL `http` en un host declarado también falla, salvo
  que hayas declarado ese host `{ "host": "…", "insecureHttp": true }` (apiVersion 2,
  [mira el manifiesto](manifest.md#insecure-host)). Una dirección IP o un nombre local (`localhost`,
  `.local`, …) siempre se rechaza salvo que la persona lo haya escrito. Kino también rechaza un nombre
  declarado que resuelve a una dirección dentro de la red de la persona (loopback, privada,
  link-local, NAT de operador, multicast, y los prefijos IPv6 que llevan una de esas adentro), y
  nunca manda tu tráfico por un proxy configurado en el dispositivo.
- **Las redirecciones** (301, 302, 303, 307, 308) las sigue Kino, hasta 10 saltos; cada salto se
  revisa y cuenta como una petición -- también cuenta un salto que Kino rechaza (o por el que le
  pregunta a la persona). Un 303, o un 301/302 después de un POST, se vuelve un GET sin
  cuerpo. Con `redirect: "manual"` recibes la respuesta 3xx (un formulario de login suele responder
  302 cuando sale bien).
- **Por un host que se te olvidó se puede preguntar, solo durante `resolve` y `episodes`.** Cuando
  una de esas llamadas pide un host `https` que no declaraste (incluido un salto de redirección),
  Kino le pregunta a la persona ("Quiere conectarse por primera vez a `<host>`. ¿Permitir?"). El
  reloj de tu llamada se detiene mientras decide, y la petición sigue después de "Permitir" (el host
  queda aprobado para siempre); "Rechazar" o Atrás la hacen fallar como `host_not_allowed` y queda
  recordado. La pregunta se quita sin respuesta, sin recordar nada, si tu llamada termina antes
  (falló, se pasó del tiempo o la persona se fue). Una llamada pregunta por máximo 3 hosts, y por
  ninguno más una vez que la persona rechaza uno en ella: desde ahí, cualquier otro host no declarado
  de esa llamada simplemente falla como `host_not_allowed`. `search`, `home`, `browse`,
  las listas en vivo, una descarga y una llamada que ya terminó nunca preguntan: la petición falla
  como `host_not_allowed`. No te confíes: declara tus hosts.
- **Una respuesta que no es 2xx no lanza error**: revisa `r.ok`. Todo lo demás que salga mal lanza un
  error con un `code` que puedes revisar (`e.code === "timeout"`):

| `e.code` | Cuándo |
| --- | --- |
| `host_not_allowed` | el host (o un salto de redirección) no es uno que declaraste o que escribió la persona, o es `http` en un host declarado que no está marcado `insecureHttp` |
| `timeout` | no llegó una respuesta completa dentro de `timeoutMs` |
| `network` | la conexión falló, o hubo demasiadas redirecciones |
| `too_large` | la petición pasa del tope de tamaño, o un cuerpo de más de 5 MB |
| `invalid_request` | una URL, método, `redirect` o `body` inválidos, o más peticiones de las que permite una llamada |

- **Límites:** 15 s por petición por defecto (30 s como máximo), un cuerpo de máximo 5 MB
  (decodificado con el charset de su `Content-Type`, UTF-8 por defecto), y máximo 60 peticiones en una
  llamada a tu plugin, incluidos los saltos de redirección y los rechazados (un plugin que Kino
  convirtió desde un [scraper de Nuvio](nuvio.md) tiene 250). Máximo 6 de tus peticiones corren al
  mismo tiempo; las demás esperan su turno.
- **Los headers que pones** se envían tal cual, salvo `Host`, `Content-Length`, `Transfer-Encoding`,
  `Connection`, `Cookie2` y `Accept-Encoding` (Kino pide gzip por su cuenta y siempre te entrega el
  cuerpo descomprimido; un `Accept-Encoding` copiado de un navegador te traería bytes comprimidos). Si no pones `User-Agent`, Kino envía `Kino/<version> (plugin <id>)`. Un
  header `Content-Type` fija el tipo del cuerpo.
- **Cookies:** cada plugin tiene su propio tarro de cookies. Kino guarda lo que ponen tus hosts
  (`Set-Cookie` nunca le llega a tu código) y lo devuelve en las peticiones siguientes, con las reglas
  de siempre (dominio, ruta, `Secure`, vencimiento). El tarro se guarda en el dispositivo, así que un
  login sobrevive al sandbox y a que la app se reinicie; se borra cuando la persona cambia tus ajustes
  o desinstala el plugin.
- **Un marcador de [`kino.secret`](#secret)** en la URL, un header o el cuerpo se cambia por su valor
  real justo antes de que salga la petición, y esa petición queda sujeta a una regla más estricta que
  la de arriba: solo los `hosts` de tu manifiesto, por `https`, en cada salto.

## `kino.cookies` { #cookies }

```js
kino.cookies.get("https://site.example/", "session")  // the value, or null
kino.cookies.clear()                                  // forget every cookie of this plugin
```

`get` devuelve el valor o `null`, y solo responde para URL a las que tu plugin puede llegar; `clear`
olvida todas las cookies del plugin. Máximo 50 cookies por dominio y 64 KB en total.

## `kino.secret(name)` (apiVersion 4) { #secret }

```js
const key = kino.secret("apiKey");   // un marcador, no el valor; cualquier otro nombre lanza error
await kino.fetch(`https://api.example.org/v1/list?key=${key}`);
```

Un marcador de posición para un valor sellado en el campo [`secrets`](manifest.md#secrets) de tu
manifiesto. Lleva el marcador a donde llevarías el valor. Kino abre cada sello como mucho una vez por
ejecución y nunca deja que tu código vea el valor en claro. Puedes llamarlo en el nivel superior de
tu módulo (`const KEY = kino.secret("apiKey");`): la revisión que Kino corre al instalar también
responde un marcador para cada nombre que declara tu manifiesto, así que la instalación pasa.

**Dónde el marcador se vuelve el valor: solo dentro de `kino.fetch`.** En la ruta y la query de la URL
(codificado con porcentajes, para que el valor no pueda partir un segmento ni agregar un parámetro),
dentro de un cuerpo JSON (escapado como JSON), y tal cual en los headers, un cuerpo de texto o un
campo de formulario. Un marcador en el esquema, el userinfo, el host, el puerto o el fragmento de la
URL se deja como texto: un valor nunca pasa a ser parte del host al que Kino se conecta. Un header cuyo
valor llevaría un carácter de control una vez puesto el secreto se rechaza en vez de enviarse.

**A dónde puede ir esa petición: solo a un host que lista el `hosts` de tu manifiesto, por `https`, en
cada salto de redirección.** Nunca a un host aprobado mientras el plugin corre, nunca a un servidor
que la persona escribió en tus ajustes, y ni `streamHosts: "any"` ni `liveStreamHosts: "any"` llegan
hasta ahí. Un salto a cualquier otra parte falla como `host_not_allowed`: "este plugin no puede
enviar datos sellados a `<host>`" para un host que no declaraste, "... sin https a `<host>`" para
`http` plano aunque el host esté declarado.

**`kino.crypto`.** Un marcador puede ser la `key` *completa* de un `encrypt`/`decrypt` AES --
exactamente un marcador, nada más en el texto -- o parte de una `key` más larga de HMAC o del
`password`/`salt` de PBKDF2. Siempre se rechaza, con "no se puede usar un dato sellado aquí", como
`data`, `iv` o `aad`, como parte de una `key` de cifrado más larga, y como llave de un cifrado que no
es AES (`des-ede3-*`) -- salvo una [llave de cifrado con tipo](manifest.md#typed-keys) (apiVersion 6),
que sirve como llave completa de cualquier cifrado, `des-ede3` incluido, y de nada más. No es una raya arbitraria: un `iv` o un `aad` conocidos bajo una llave sellada
permiten convertir un cifrado en una forma de calcular la llave de vuelta, y una llave rellenada con
bytes conocidos reduce la búsqueda a la parte desconocida. HMAC y PBKDF2 pasan toda su entrada por un
hash, así que un prefijo o sufijo conocido nunca separa el secreto.

**Tapado.** Todo lo que Kino le devuelve a tu código y que podría llevar un valor sellado --
`r.text()`, `r.url`, los valores de los headers, el `r.base64()` de un cuerpo de texto,
`kino.cookies.get`, un mensaje de error, una respuesta de `kino.crypto` y cada línea de `kino.log` --
trae el valor cambiado de nuevo por su marcador, haya usado o no esta ejecución el secreto. Las
formas que se detectan: en crudo, codificado con porcentajes (estricto, `+` por espacio y `%20` por
espacio), escapado como JSON (incluso con `\/` por `/` y `\uXXXX` para lo que no es ASCII, en
mayúsculas o minúsculas, como lo escriben PHP y Python) y base64/base64url. Una URL que el servidor
devuelve con el valor adentro vuelve con el marcador, así que un `Stream` armado con ella no se
reproduce: los marcadores solo se cambian en las peticiones de `kino.fetch`, nunca en lo que tu plugin
le devuelve a Kino. No se detecta: una respuesta binaria (`r.base64()` de algo que nunca fue texto),
el *nombre* de un header de respuesta, un `%xx` en minúsculas que un servidor devuelva, y un valor que
el servidor transforma a propósito (con hash, al revés…). Un error de `kino.crypto` todavía puede
decir cuántos bytes tenía una llave sellada, o si era hex o base64 válido -- metadatos, nunca el
valor. Prefiere valores de al menos 8 bytes: uno más corto igual se tapa donde aparezca dentro de
texto sin relación, lo que se vuelve más ruidoso entre más corto sea.

## `kino.crypto` { #crypto }

Funciones síncronas para lo que hacen los sitios para esconder sus enlaces. Cada argumento de texto
es texto en una codificación que tú escoges (`utf8`, `hex` o `base64`); los errores traen
`code: "crypto_error"`.

```js
kino.crypto.hash("sha256", "hola")                        // hex by default
kino.crypto.hmac("sha1", "key", "data", { outputEncoding: "base64" })
kino.crypto.decrypt("aes-128-cbc", { key: "0123456789abcdef", iv: "abcdef9876543210", data: b64 })
kino.crypto.encrypt("aes-256-gcm", { key: k, keyEncoding: "hex", iv: n, ivEncoding: "hex", data: "hola" })
kino.crypto.pbkdf2("sha256", "password", "salt", 10000, 32)   // hex
kino.crypto.randomBytes(16)                               // hex
kino.crypto.uuid()
```

- `encrypt` recibe texto (`utf8`) y devuelve `base64`; `decrypt` recibe `base64` y devuelve texto.
  Cambia cualquiera de los dos con `inputEncoding` / `outputEncoding`; las llaves, los IV y el `aad` de
  GCM usan `keyEncoding`, `ivEncoding`, `aadEncoding` (por defecto `utf8`). `hash`, `pbkdf2` y
  `randomBytes` devuelven `hex` por defecto.
- CBC y ECB usan relleno PKCS#7 salvo que pases `padding: "none"`. GCM pega su etiqueta de 16 bytes al
  final del texto cifrado, y la espera ahí para descifrar (como la mandan casi todos los sitios).
- Un tamaño de llave equivocado, un relleno malo o una etiqueta GCM que no cuadra lanzan un error;
  nunca devuelven basura en silencio.
- Un marcador de [`kino.secret`](#secret) solo se acepta como la `key` completa de un
  `encrypt`/`decrypt` AES, o como parte de una `key` de HMAC o del `password`/`salt` de `pbkdf2` --
  nunca en `data`, `iv` o `aad`, ni como llave `des-ede3`. Una [llave de cifrado con
  tipo](manifest.md#typed-keys) (apiVersion 6) es la excepción: la llave completa de cualquier cifrado,
  `des-ede3` incluido, y nada más.

| Función | Algoritmos |
| --- | --- |
| `hash`, `hmac` | `md5`, `sha1`, `sha256`, `sha512` |
| `encrypt`, `decrypt` | `aes-128-cbc`, `aes-192-cbc`, `aes-256-cbc`, `aes-128-ecb`, `aes-192-ecb`, `aes-256-ecb`, `aes-128-ctr`, `aes-192-ctr`, `aes-256-ctr`, `aes-128-gcm`, `aes-192-gcm`, `aes-256-gcm`, `des-ede3-cbc`, `des-ede3-ecb` |
| `pbkdf2` | `sha1`, `sha256`, `sha512` |
| codificaciones | `utf8`, `hex`, `base64` |
| `generateKeyPair` (apiVersion 6) | `ec`, `ed25519`, `x25519`; `ec` en `P-256`, `P-384`; máximo 64 llaves privadas vivas por runtime (una nueva descarta la más vieja) |
| `sign`, `verify` (apiVersion 6) | ECDSA con `SHA-256`, `SHA-384` como `der` o `ieee-p1363`; Ed25519; una firma de máximo 512 bytes |
| `importKey`, `deriveSharedSecret` (apiVersion 6) | llaves públicas como `jwk`, `spki`, `raw`; ECDH (misma curva) y X25519 |

### Pares de llaves, firmas y acuerdo de llaves (apiVersion 6) { #key-pairs }

Algunos reproductores demuestran que son un reproductor de verdad firmando un reto: crean un par de
llaves, firman lo que manda el servidor con la llave privada y devuelven la llave pública.
`kino.crypto` lo hace con llaves que nunca salen de Kino:

```js
// Node:      const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
// WebCrypto: await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
async function createAttest(challenge) {
  const { privateKey, publicKey } = kino.crypto.generateKeyPair({ type: "ec", namedCurve: "P-256" });
  // La firma ECDSA de WebCrypto es r||s (64 bytes en P-256): format "ieee-p1363". La de Node es "der".
  const signature = kino.crypto.sign({ key: privateKey, data: challenge, hash: "SHA-256", format: "ieee-p1363" });
  return { publicKey: publicKey.jwk, signature };   // signature en base64; outputEncoding: "hex" para hex
}
```

- `generateKeyPair({ type: "ec", namedCurve: "P-256" | "P-384" })`, `{ type: "ed25519" }` o
  `{ type: "x25519" }` responde `{ privateKey, publicKey }`. `publicKey` es `{ type, namedCurve?, jwk,
  spki, raw }`: el objeto JWK en el orden de llaves de WebCrypto (`{ crv, kty, x, y }`, base64url), el
  SubjectPublicKeyInfo DER en base64, y la llave cruda en base64 (`04||x||y` para `ec`, 32 bytes en los
  demás).
- `privateKey` es un manejador, `{ type, namedCurve?, handle }`: la llave misma se queda dentro de Kino.
  Un manejador sirve solo en el sandbox que lo creó: no en el carril de firma de
  [`sign()`](signed-streams.md), no después de que el plugin se reinicia (se cierra tras unos minutos sin
  uso), nunca en otro aparato; así que crea la llave en la llamada que la usa. Máximo 64 vivas a la vez;
  una nueva descarta la más vieja. Las llaves privadas no se pueden importar ni exportar.
- `sign({ key, data, encoding?, hash?, format?, outputEncoding? })` lee `data` como `utf8` salvo que
  digas `hex` o `base64`, y responde en base64. `ec`: `hash` `"SHA-256"` (por defecto) o `"SHA-384"`,
  `format` `"der"` (por defecto) o `"ieee-p1363"` (64 bytes en P-256, 96 en P-384). `ed25519`: 64 bytes,
  sin `hash`.
- `verify({ key, data, signature, signatureEncoding?, hash?, format? })` responde `true`/`false`; una
  firma mal formada es `false`. `key` es una llave pública (la tuya, o la de otro desde `importKey`), un
  `{ jwk }` suelto, o tu propia llave privada.
- `importKey({ format: "jwk", key: objetoJwk })`, `{ format: "spki", key: base64 }` o `{ format: "raw",
  key: base64, type, namedCurve? }` responde una llave pública con la misma forma; un punto fuera de su
  curva lanza un error.
- `deriveSharedSecret({ privateKey, publicKey })` es ECDH (las dos `ec` en la misma curva: 32 bytes en
  P-256, 48 en P-384) o X25519 (32 bytes), en base64 por defecto. Pásalo por un hash (o un HKDF con
  `hmac`) antes de usarlo como llave.
- Ninguna de estas cinco funciones acepta un marcador de `kino.secret`.

| Node / WebCrypto | `kino.crypto` |
| --- | --- |
| `generateKeyPairSync("ec", { namedCurve: "P-256" })` / `subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, …)` | `generateKeyPair({ type: "ec", namedCurve: "P-256" })` |
| `generateKeyPairSync("ed25519")` / `generateKeyPairSync("x25519")` | `generateKeyPair({ type: "ed25519" })` / `{ type: "x25519" }` |
| `publicKey.export({ format: "jwk" })` / `subtle.exportKey("jwk", publicKey)` | `publicKey.jwk` |
| `publicKey.export({ format: "der", type: "spki" }).toString("base64")` / `exportKey("spki", …)` | `publicKey.spki` |
| `subtle.exportKey("raw", publicKey)` | `publicKey.raw` (base64) |
| `crypto.sign("sha256", data, privateKey)` | `sign({ key: privateKey, data, hash: "SHA-256" })` (DER) |
| `crypto.sign("sha256", data, { key, dsaEncoding: "ieee-p1363" })` / `subtle.sign({ name: "ECDSA", hash: "SHA-256" }, …)` | `sign({ key, data, hash: "SHA-256", format: "ieee-p1363" })` |
| `crypto.sign(null, data, ed25519Key)` / `subtle.sign("Ed25519", …)` | `sign({ key, data })` |
| `crypto.verify(…)` / `subtle.verify(…)` | `verify({ key: publicKey, data, signature, … })` |
| `createPublicKey({ key: jwk, format: "jwk" })` / `subtle.importKey("jwk", …)` | `importKey({ format: "jwk", key: jwk })` |
| `crypto.diffieHellman({ privateKey, publicKey })` / `subtle.deriveBits({ name: "ECDH" o "X25519", public }, …)` | `deriveSharedSecret({ privateKey, publicKey })` |

Los Buffers se vuelven textos: pasa `encoding`/`outputEncoding` (`hex` o `base64`) donde Node recibe o
entrega un Buffer. No existe `kino.crypto.generateKeyPairSync`: una librería de Node o de navegador que lo
llame hay que adaptarla a estas llamadas. Un plugin que las usa debe declarar `"apiVersion": 6`, para
que un Kino sin ellas se niegue a instalarlo (`validate` lo dice).

## `kino.sleep(ms)` y `kino.error(code, message?, { userMessage }?)` { #sleep-error }

`await kino.sleep(1500)` espera de 0 a 5000 ms (para un sitio que te limita las peticiones); el tiempo
cuenta dentro del límite de la llamada. `kino.error` arma los errores con tipo de
[Errores que la gente entiende](contract.md#errors); su `{ userMessage }` opcional (apiVersion 6) es tu
propia frase para la persona, que se muestra bajo [sus reglas](contract.md#user-message) como
"Mensaje de &lt;tu plugin&gt;: …".

## `kino.config` { #config }

```js
kino.config.get("server")   // a setting's value: a string, or true/false for a toggle
kino.config.all()           // every setting that has a value, as an object
```

`get` devuelve el valor de un ajuste (un texto, o `true`/`false` en un `toggle`); `all` devuelve todos
los ajustes que tienen valor, como un objeto. Solo lectura: los valores que guardó la persona, o el
`default` de un ajuste que no tocó. Un ajuste sin valor y sin `default` es `undefined`.

## `kino.html.select(html, css)` { #html }

Analiza `html` y devuelve `[{ text, html, attrs }]` por cada elemento que cumple el selector CSS
(la sintaxis de selectores de Jsoup): `text` es su texto, `html` su HTML interno, `attrs` un objeto
con sus atributos. Solo se leen los primeros 2.000.000 caracteres de `html`, vuelven máximo 500
elementos, y lanza un error si el texto y el HTML de las coincidencias juntos pasan de 5.242.880
caracteres (5 MB). Un selector de más de 10.000 caracteres lanza
`Error("selector CSS demasiado largo (más de 10000 caracteres)")`. **Solo existe dentro de Kino**: la
versión del kit de Node lanza un error, así que prueba en la app todo lo que lo use.

## `kino.storage` { #storage }

```js
kino.storage.get("key")                          // the string, or null
kino.storage.set("key", "v")                     // values are converted to strings
kino.storage.set("key", "v", { ttlMs: 3600000 }) // expires after that many milliseconds
kino.storage.remove("key")
kino.storage.keys()                              // every key, as an array (expired keys are already gone)
```

`get` devuelve el texto o `null`; `set` convierte los valores a texto; `keys()` devuelve todas las
claves como arreglo (las vencidas ya no están). Es síncrono, privado de tu plugin, y sobrevive a los
reinicios del sandbox y de la app. Máximo 256 KB en total (medido como el JSON de todas las claves y
valores); pasarse lanza `Error("almacenamiento del plugin lleno (256 KB)")`. Se borra cuando la
persona desinstala el plugin, y **no** se borra cuando cambia tus ajustes.

El tercer argumento de `set` es opcional: déjalo por fuera para una entrada permanente, exactamente
como antes de que existiera esta opción. Pasa `{ ttlMs }` para que la entrada venza -- después de esa
cantidad de milisegundos `get` devuelve `null` y `keys()` ya no la lista, incluso después de reiniciar
la app. `ttlMs` tiene que ser un número entero mayor que 0 y de máximo 2.592.000.000 (30 días);
cualquier otra cosa lanza un error antes de tocar tu entrada, igual que ya pasa con un valor demasiado
grande. Una entrada vencida nunca cuenta para el tope de 256 KB: se descarta la próxima vez que tu
plugin lee o escribe en el almacenamiento. Ejemplo, una fila de Inicio guardada por una hora:

```js
export async function home() {
  const cached = kino.storage.get("home-rows");
  if (cached) return JSON.parse(cached);
  const rows = await buildHomeRows();
  kino.storage.set("home-rows", JSON.stringify(rows), { ttlMs: 60 * 60 * 1000 });
  return rows;
}
```

## `kino.log(...args)` { #log }

También `console.log`, `console.info`, `console.warn` y `console.error`: todos van al log (etiqueta
`KinoPlugin` en `adb logcat`; `KinoPlugin/<tu id>` en una compilación de depuración de Kino, o en
cualquier compilación cuando tu manifiesto dice `"debug": true`), los objetos se escriben como JSON, y un mensaje se corta a los 2000
caracteres. En el kit de Node van a stderr.

Cuando una llamada de un plugin que viene del catálogo recomendado de Kino, o de uno cuyo manifiesto
dice `"telemetry": true` (apiVersion 6) mientras la persona deja encendido "Enviar registros de errores",
**falla** (lanza un error, se pasa del tiempo, devuelve algo inservible, incluidos `sign`,
`settingsStatus`, `action` y `validateSettings`), las líneas que registró durante esa llamada (las
últimas 30, cada una cortada a 300 caracteres) viajan con el reporte de la falla al registro de
errores de quienes mantienen Kino como `plugin_log`; así que un `kino.log("home: status", r.status)`
antes del `throw` es como ves por qué falló en el celular de otra persona. Cada reporte va marcado con
el id y la versión de tu plugin; máximo un reporte por función y tipo de falla por hora. No se envía
nada de una llamada que sale bien, ni de ningún otro plugin (uno instalado desde un repositorio que no
está en el catálogo y no declara `telemetry`, un scraper de Nuvio convertido), ni cuando la persona
apaga el interruptor. Antes de salir del aparato, a cada línea se le
quitan URL, nombres de host, IP, correos, ids largos, tiras largas de hex/base64, texto con forma de
credencial, los valores de los ajustes de la persona y el texto de su búsqueda o del título, y el
total se limita a 2 KB (ganan las líneas más nuevas). Aun así: registra lo que pasó (un estado, un
paso, un conteo), nunca lo que la persona escribió ni un secreto, y nunca el valor de un ajuste.
Funciona en cualquier `apiVersion`.

**`kino.log.report(...args)`** (apiVersion 6, con `telemetry`) escribe una línea como `kino.log` y
además le avisa al registro de errores que tu plugin entregó un resultado **degradado**, aunque la
llamada funcionó: usó una cuenta compartida de respaldo, una fuente de reserva, recortó una lista. Los
detalles (el área, los topes) están en [Registro y telemetría](diagnostics.md#report).

## `kino.rank` { #rank }

Para un backend de búsqueda que solo compara una bolsa suelta de palabras en común, no un título
completo: si le preguntas por un título largo puede devolver veinte resultados sin relación que solo
comparten una palabra común, con la coincidencia real enterrada en la página dos. Estas tres
funciones puras hacen que un backend así se comporte como una búsqueda por título, sin tocar su
propia forma de JSON.

```js
kino.rank.shortQuery(query)
kino.rank.sortBySimilarity(items, query, getTitle?)
kino.rank.filterRelevant(items, query, getTitle?)
```

- **`shortQuery(query)`** devuelve la CABEZA del título, hasta su primer `:`, `,`, `|`, raya corta
  (en dash) o raya larga (em dash): pregúntale eso a tu backend en vez del título completo, para que
  su propio orden tenga menos ruido. Una cabeza de una o dos letras ("El", "A") no identifica nada, así
  que en ese caso vuelve el texto completo (sin espacios en los extremos); un `-` simple nunca es punto
  de corte (partiría "Spider-Man"). Pruébalo primero con tu backend -- algunos funcionan peor con una
  consulta corta, no mejor.
- **`sortBySimilarity(items, query, getTitle?)`** reordena `items` para que primero queden los que
  comparten más palabras con `query`; en los empates se conserva el orden del backend.
- **`filterRelevant(items, query, getTitle?)`** descarta los ítems que solo comparten una palabra
  suelta con `query`. Reordenar solo igual muestra una página llena de casi-aciertos cuando el título de
  verdad no está en el backend; esto hace que un título ausente vuelva con 0 resultados.

`query` es un título, o un arreglo con varias formas de uno que vale la pena probar juntas --
`[query.q, query.originalTitle, ...query.altTitles]`, porque un backend puede conocer un título solo en
un idioma. `getTitle` lee un título de uno de tus `items`; por defecto es `(item) => item.title`, y
también puede devolver un arreglo, igual que `query`, cuando un ítem guarda el título en más de un
campo o idioma (se combinan las palabras de todas las formas). La comparación ignora tildes y
mayúsculas y las palabras de 1-2 letras (los "el", "de", "of" que hacen parecer iguales títulos que no
tienen nada que ver); `filterRelevant` conserva un ítem cuando comparte al menos el 60% de las
palabras distintivas de un título pedido.

**Una entrada mala nunca lanza error.** A diferencia de `kino.fetch`/`kino.crypto`/`kino.sleep`, estas
tres nunca lanzan un `kino.error` por un argumento mal formado: `items` que no es un arreglo responde
`[]` en cualquiera de las dos funciones. Un ítem sin título utilizable -- `null`, `undefined`,
`getTitle` que devuelve algo que no es un texto (o un arreglo sin ninguno), o `getTitle` que lanza un
error -- se trata como "sin título" en vez de tumbar tu llamada: `filterRelevant` lo descarta como un
casi-acierto más, y `sortBySimilarity` lo pone después de todos los que sí tienen título, en el orden
de tu propia lista entre ellos.

```js
export async function search(query) {
  const titles = [query.q, query.originalTitle, ...query.altTitles];
  const r = await kino.fetch(BASE + "/search?q=" + encodeURIComponent(kino.rank.shortQuery(query.q)));
  const found = r.json().results; // whatever shape your backend answers with
  const relevant = kino.rank.filterRelevant(found, titles, (x) => x.name);
  return kino.rank.sortBySimilarity(relevant, titles, (x) => x.name).map(toItem);
}
```

Si tu backend ya ordena bien un título completo, sáltate `shortQuery` y usa solo
`filterRelevant`/`sortBySimilarity` sobre lo que te da para `query.q` tal como se escribió.

Dos cosas quedaron por fuera a propósito. Ninguna reintenta con el título completo: si la cabeza de
`shortQuery` resulta ser una palabra común (p. ej. "Love, Death & Robots" -> "Love") y el backend no
devuelve nada relevante, reintenta tú `search` con el título completo cuando la corta vuelva vacía. Y
ninguna hace nada con números ni orden de temporadas: cómo escribe un backend "temporada 2" en sus
títulos ("T2", "Temporada 2", …) es propio de ese backend, no algo que estas funciones puedan
absorber.
