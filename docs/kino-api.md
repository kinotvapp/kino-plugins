# La API `kino`

`kino` es un objeto global, congelado, que siempre está. Nada más del mundo exterior está.

```js
kino.apiVersion   // 8 on Kino 0.9.54 (7 on 0.9.51 to 0.9.53) -- the highest apiVersion this build of Kino understands, not your manifest's
kino.appVersion   // the version of Kino, for example "1.42.0"
kino.lang         // "es-CO"; from Kino 0.9.54 "en-US" too, when Kino speaks English
kino.fetchAnyHost // Kino 0.9.55+: true when this install's kino.fetch may reach any public host; undefined before
```

(`kino.apiVersion` es el `apiVersion` más alto que entiende esta versión de Kino, no el de tu
manifiesto; `kino.appVersion` es la versión de Kino.)

### `kino.lang`: el idioma de la persona { #lang }

`kino.lang` es el idioma en que Kino le habla a la persona. Hasta Kino 0.9.53 es siempre `"es-CO"`. Desde **Kino 0.9.54**
sigue el idioma de la app: `"es-CO"` mientras Kino está en español, `"en-US"` mientras está en
inglés. La persona lo elige en Ajustes ▸ App ▸ Idioma (Automático, Español o English, sincronizado entre sus aparatos);
Automático habla español en un aparato configurado en cualquier variante de español, e inglés en cualquier otro. Sin
`apiVersion` nuevo y sin nada que comprobar: léelo donde lo necesites.

- **Un sandbox conserva el `kino.lang` con que se abrió.** Cuando la persona cambia de idioma, Kino cierra el sandbox de
  tu plugin y la siguiente llamada abre uno nuevo con el valor nuevo (el nivel superior de tu módulo vuelve a correr;
  `kino.storage` se conserva). El sandbox que corre [`sign()`](signed-streams.md) sigue abierto, así que un video que se
  está reproduciendo sigue firmándose.
- Con el cambio, Kino también vacía la caché de [`kino.meta`](#meta) y vuelve a pedir tus filas de Inicio, sin usar su
  caché.
- **Escribe en ese idioma lo que lee la persona**: los títulos de tus filas, tu `userMessage`, un encabezado
  `Accept-Language`. Kino muestra tu texto tal como lo escribiste. El `lang` de `kino.meta` acepta la etiqueta tal cual
  (`lang: kino.lang`) o su código corto (`kino.lang.split("-")[0]`).
- En el kit de Node, `kino.lang` es siempre `"es-CO"` ([Probar en local](test-locally.md#differences)).

### `kino.fetchAnyHost`: ¿llega `kino.fetch` a cualquier host? { #fetch-any-host }

Desde **Kino 0.9.55**, `kino.fetchAnyHost` es `true` solo cuando el `kino.fetch` de esta instalación puede llegar a
cualquier host público: tu manifiesto declara [`"fetchHosts": "any"`](manifest.md#fetch-hosts), tu plugin califica
(`apiVersion` 9 o más, o un scraper de Nuvio convertido) **y** la persona lo aprobó en rojo. Si falta algo es `false`,
y en un Kino anterior no existe (`undefined`). Úsalo para decidir antes de pedir:

```js
const url = kino.fetchAnyHost === true ? enlaceDelExtractor : await miRespaldo(enlaceDelExtractor);
```

Aun en `true`, la red de la casa sigue rechazada y un [secreto sellado](manifest.md#secrets) solo va a tus `hosts`
declarados. En el kit de Node es `true` cuando el manifiesto pide `"fetchHosts": "any"` con `apiVersion` 9 (el kit da
la aprobación por hecha).

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
| `host_not_allowed` | el host (o un salto de redirección) no es uno que declaraste o que escribió la persona, o es `http` en un host declarado que no está marcado `insecureHttp`; con [`fetchHosts`](manifest.md#fetch-hosts) aprobado, solo una dirección de la red de la casa |
| `timeout` | no llegó una respuesta completa dentro de `timeoutMs` |
| `network` | la conexión falló, o hubo demasiadas redirecciones |
| `too_large` | la petición pasa del tope de tamaño, o un cuerpo de más de 5 MB |
| `invalid_request` | una URL, método, `redirect` o `body` inválidos, o más peticiones de las que permite una llamada |

Desde Kino 0.9.54 los mensajes de error de Kino (`e.message`) están en inglés y pueden cambiar; compara el `code`.

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
hasta ahí. Un salto a cualquier otra parte falla como `host_not_allowed`: "this plugin can't
send sealed data to `<host>`" para un host que no declaraste, "... without https to `<host>`" para
`http` plano aunque el host esté declarado. (Son los mensajes de Kino 0.9.54; 0.9.53 y anteriores los dicen en español. Compara el `code`.)

**`kino.crypto`.** Un marcador puede ser la `key` *completa* de un `encrypt`/`decrypt` AES --
exactamente un marcador, nada más en el texto -- o parte de una `key` más larga de HMAC o del
`password`/`salt` de PBKDF2. Siempre se rechaza, con "a sealed value can't be used here", como
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

## `kino.browser` (apiVersion 6) { #browser }

Solo con `"browser": true` (solo captura) o `"browser": "pages"` (captura y lectura de páginas) en el
manifiesto, aprobado en rojo por la persona. `kino.browser.capture(url,
options?)` abre una página en una vista web oculta dentro de un `resolve` que empezó la persona y
devuelve las peticiones de video que hizo, con los encabezados y cookies para reproducirlas;
`kino.browser.page(url, options?)` devuelve el HTML de una página cuando ya pasó la revisión automática
del sitio. Kino nunca resuelve un captcha: una página que pide una persona termina la llamada con
`blocked`. Prefiere `kino.fetch` siempre que funcione. Todo -- dónde se puede llamar cada una, el modelo
de seguridad, los tiempos, los errores y un ejemplo completo -- está en [Navegador oculto](browser.md). Desde
Kino 0.9.54 una captura también puede juntar todas las peticiones que coinciden, esperar una cookie y responder lo que
tenía cuando se acaba el tiempo ([`captureAll` y compañía](browser.md#capture-all); comprueba antes
`kino.browser.captureAll === true`), y `kino.browser.page` también se puede llamar desde la exportación
[`details`](contract.md#details) (apiVersion 8).

## `kino.cloudstream` (solo plugins generados) { #cloudstream }

Solo existe en los plugins que Kino mismo genera cuando la persona instala un plugin desde un repositorio de CloudStream
(Kino 0.9.54); un plugin que escribes tú nunca lo tiene (`typeof kino.cloudstream` es `"undefined"`), diga lo que diga su
manifiesto. Sus cuatro funciones (`search`, `mainPage`, `load`, `loadLinks`, con sus tipos en
[`kino.d.ts`](reference/index.md)) corren un proveedor de CloudStream dentro de la app complemento de CloudStream, que va
aparte. Lanzan `not_found` cuando el propio proveedor falló y `unavailable` en todo lo demás (no hay complemento, un
plugin incompatible, se acabó el tiempo, una petición rechazada; el mensaje dice cuál).

## `await kino.meta(query)`: preguntarle a Kino por un título (Kino 0.9.53) { #meta }

```js
if (typeof kino.meta === "function") {                       // Kino 0.9.53 o superior: antes no existe, compruébalo
  const m = await kino.meta({ type: "series", ids: { imdb: "tt0944947" }, lang: kino.lang });
  if (m) {
    // { title, overview, year, poster, backdrop, logo, genres, runtimeMinutes, tagline, certification, directors,
    //   episodes: [{ season, number, title, overview, still, airDate, id: "tt0944947:1:1" }],
    //   ids: { imdb, tmdb, tvdb, kitsu, mal, anilist }, ratings, cast, sources: ["tmdb", ...] }
  }
}
```

Kino responde lo que sabe de un título, y tu plugin nunca toca una llave de TMDB para eso. La respuesta se arma igual
que la ficha de Kino arma la página de un título: primero **la consulta de TMDB de Kino** (una función de la app, con la
llave de Kino, en español es-MX, o desde Kino 0.9.54 en el idioma de la app: es-MX o en-US; ninguna llave llega a tu código), luego **AniList** para un anime (con el mapeo de ids
de anime, así que también sirve un id `kitsu`, `mal` o `anilist`), y luego **los plugins `meta` que la persona tiene
instalados** (por ejemplo un addon de metadatos de Stremio configurado con su propia llave). Cada fuente siguiente solo
llena lo que las anteriores dejaron vacío; las notas se suman. `null` quiere decir que nadie conocía el título: nunca es
un error.

- **La consulta**: `type` (`"movie"` o `"series"`) y al menos un id: `imdb` (`"tt0133093"`), o `tmdb`, `tvdb`, `kitsu`,
  `mal`, `anilist` como enteros positivos (un número o un texto de dígitos, hasta 2147483647). `lang` (`"es"`, `"es-MX"`)
  va a los plugins meta de la persona. Una consulta mal formada lanza `invalid_request`; la consulta entera ocupa como
  máximo 4.096 caracteres en JSON.
- **La respuesta**: cada campo aparece solo cuando se conoce, menos `ids` (todos los ids que Kino conoce del título,
  incluidos los tuyos: pregunta con un id de IMDb y recibe los de TMDB y TVDB) y `sources` (`"tmdb"`, `"anilist"`,
  `"plugin"`: quién aportó). `episodes` solo para una serie (máximo 5.000; se recortan desde el final para que la
  respuesta entera quede por debajo de 1.000.000 de caracteres), cada uno con su `id` al estilo de Stremio. `ratings`
  máximo 6 (la nota de TMDB es `{ source: "tmdb" }`), `cast` máximo 20, `genres` máximo 5.
- **Nunca tú mismo**: a tu propio export `meta` nunca se le pregunta en tu nombre, y un `kino.meta` llamado desde dentro
  de un export `meta` no le pregunta a ningún plugin (solo a TMDB y AniList), así que dos plugins meta no pueden
  preguntarse uno al otro en bucle.
- **Límites**: máximo 30 llamadas por minuto por plugin (luego `rate_limited`; es un balde de fichas que recupera una
  llamada cada 2 s); como mucho 8 s (6 s por cada plugin meta; se responde lo que se sepa para entonces), contados dentro
  del límite de tiempo de tu propia llamada; la parte de TMDB y AniList queda en caché 30 minutos por consulta y las
  respuestas de los plugins meta comparten la caché de 30 minutos de la ficha. No desde `sign()` (`not_allowed`). Ningún
  destino de red nuevo: TMDB y AniList son de Kino, y cada plugin meta usa sus propios hosts aprobados. La telemetría de
  Kino solo cuenta llamadas y códigos de error, nunca los ids.
- **Sin `apiVersion` nuevo**: `kino.meta` está en todos los plugins desde Kino 0.9.53, diga lo que diga su manifiesto; las
  versiones anteriores no tienen esa función, así que compruébala (`typeof kino.meta === "function"`).
  `node sdk/validate.mjs` avisa si tu código la llama sin esa comprobación.

### Por título, sin ids (apiVersion 9, Kino 0.9.55) { #meta-by-title }

```js
if (typeof kino.meta === "function" && kino.meta.byTitle === true) {   // Kino 0.9.55 o superior
  const m = await kino.meta({ type: "movie", title: "Matrix", year: 1999 });
  if (m) console.log(m.ids.tmdb, m.ids.imdb);                            // 603, "tt0133093"
}
```

Cuando tu fuente solo te da el nombre y el año, pásaselos a Kino en vez de los ids: `{ type, title, year?, lang? }`.

- **Cómo lo busca**: Kino busca el título en TMDB (la búsqueda de películas o la de series según `type`, en español
  es-MX, la primera página) y se queda con el resultado cuyo título en español o título original es igual al tuyo, sin
  mayúsculas, tildes ni signos («¡Amélie!» y «amelie» son el mismo). Con `year`, gana el de ese año exacto; si no hay,
  uno que esté a un año (la fecha de estreno puede variar según el país). Una película nunca responde por una serie, ni
  al revés.
- **Nunca adivina**: si dos resultados empatan (el mismo título y el mismo año, o el mismo título y no diste año) o
  ninguno coincide, la respuesta es `null`. Si tienes el año, mándalo: es lo que separa una película de su remake.
- **La misma respuesta de siempre**: si lo encuentra, responde exactamente como si hubieras preguntado por su id, con
  `ids` lleno (TMDB, IMDb, TVDB…), y a los plugins `meta` de la persona se les pregunta por esos ids. Mismos límites
  (30 por minuto, 8 s), y la caché de 30 minutos es por tipo, título normalizado y año.
- **La consulta**: `title` de 1 a 200 caracteres; `year` de 1870 a 2100 (un número o un texto de 4 dígitos), y solo
  junto a `title`. Cualquier otra cosa lanza `invalid_request`. Si mandas `ids` y `title`, ganan los ids.
- **Necesita `"apiVersion": 9`; comprueba `kino.meta.byTitle === true`**: por debajo de 9 `kino.meta.byTitle` no
  existe y el título no llega, igual que en un Kino anterior, así que la consulta responde `invalid_request` («necesita
  al menos un id»). `node sdk/validate.mjs` avisa si llamas `kino.meta` con `title` sin esa comprobación.

Con el kit, la búsqueda de TMDB de Kino no existe: el archivo de `KINO_META_FIXTURE` responde con claves
`"movie:title:the matrix:1999"` (el tipo, `title`, el título normalizado y el año, o sin el año), y `pickMetaTitle` de
`sdk/kino-shim.mjs` te dice qué escogería Kino entre resultados de TMDB que traigas tú.

Lo contrario -- que tu plugin describa títulos para la ficha de Kino -- es la [capacidad `meta`](contract.md#meta). Con el
kit de Node, `kino.meta` responde `null` salvo que apuntes `KINO_META_FIXTURE` a un archivo JSON de respuestas (claves
`"movie:imdb:tt0133093"` o `"tmdb:1399"`, y por título `"movie:title:the matrix:1999"`; ver [Probar en local](test-locally.md)).

## `await kino.tmdb(path, params?)`: TMDB sin una llave en tu código (Kino 0.9.53) { #tmdb }

```js
async function tmdb(path, params) {
  if (typeof kino.tmdb === "function") return kino.tmdb(path, params);   // Kino 0.9.53+: Kino pone la llave, nunca tu código
  // Kino anterior: tu propio ajuste "tmdbKey", como antes.
  const key = kino.config.get("tmdbKey");
  if (!key) throw kino.error("auth_required", "falta la llave de TMDB");
  const q = new URLSearchParams({ ...params, api_key: key });
  const r = await kino.fetch(`https://api.themoviedb.org/3${path}?${q}`);
  if (!r.ok) throw kino.error(r.status === 404 ? "not_found" : "unavailable", "TMDB respondió " + r.status);
  return r.json();
}

const semana = await tmdb("/trending/movie/week", { language: "es-MX" });
```

Una puerta de solo lectura a la API v3 de TMDB. Tu plugin nunca lleva una llave: Kino pone una, en este orden:

1. **La llave propia de Kino**, siempre. Sus llamadas pasan por la caché de TMDB de Kino (la misma de las pantallas de
   Kino, guardada en disco; una petición que ya va en camino se comparte, no se repite) y por límites propios, para que
   los plugins no gasten la cuota de TMDB de Kino: máximo 20 llamadas cada 10 s por plugin y 60 cada 10 s entre todos
   los plugins llegan a TMDB con la llave de Kino.
2. **La llave de la persona, solo si la de Kino falla**: TMDB rechaza la llave de Kino (401/403), TMDB la limita (429), o
   se agotó uno de los dos límites de arriba. Entonces la misma petición sale otra vez con la llave que la persona
   escribió en **Ajustes ▸ App ▸ Tu llave de TMDB** (opcional; una API key v3 de 32 caracteres hexadecimales, o un token
   de lectura v4; se sincroniza entre sus aparatos) o, si no hay, con la que configuró en un **addon de Stremio
   instalado** (Kino busca en la configuración guardada de cada addon un campo cuyo nombre contenga "tmdb", ninguno se
   nombra en el código, y la usa solo después de que la persona dijo que sí una vez a "Usar la llave de TMDB de tu addon
   &lt;nombre&gt;", también sincronizado).
3. **Sin ninguna de las dos**: una copia de la caché de hasta 7 días cuando la hay; si no, `rate_limited` (el límite de
   Kino, o el 429 de TMDB) o `unavailable` (TMDB rechazó la llave de Kino).

`no_tmdb_key` queda para una versión de Kino sin llave propia y una persona sin llave: `e.userMessage` es entonces la
frase de Kino para la persona, en su idioma: "Agrega tu llave de TMDB en Ajustes ▸ Tu llave de TMDB" /
"Add your TMDB key in Settings ▸ Your TMDB key" (Kino 0.9.53 también mencionaba un addon de TMDB de Stremio). Si no
la atrapas, la persona lee esa misma frase. En esa versión, una llave de la persona que TMDB rechaza también es
`no_tmdb_key`.

Una llave que tu plugin guarda en sus propios ajustes (un ajuste `tmdbKey`) es asunto de tu plugin: Kino nunca la lee para
`kino.tmdb`. Kino pone la llave él mismo (como `api_key` para una llave v3, como encabezado `Authorization: Bearer` para un
token v4): tu código nunca ve ninguna, ni la de Kino ni la de la persona, y ni las respuestas, ni los errores, ni los
registros la llevan. No declaras `api.themoviedb.org` en `hosts` para esto.

- **`path`**: empieza por `/discover`, `/trending`, `/search`, `/movie`, `/tv`, `/find`, `/genre`, `/configuration`,
  `/person` o `/collection` (`"/movie"` o `"/movie/603/credits"`), sin la versión `/3`, sin texto de consulta, sin `..` y
  sin `//`. Cualquier otra ruta (una cuenta, una lista, una calificación: lo que escribe o lee la cuenta de la persona)
  es `invalid_request`. Solo GET.
- **`params`**: un objeto simple de máximo 20 textos, números o booleanos, cada uno de máximo 500 caracteres como texto,
  con nombres como `language`, `page`, `with_genres`, `vote_count.gte`, `append_to_response`. Nunca `api_key`,
  `session_id`, `guest_session_id`, `request_token` ni `access_token` (`invalid_request`).
- **La respuesta**: el cuerpo ya convertido desde JSON. `404` es `not_found`, un cuerpo de más de 2 MiB es `too_large`;
  cuando TMDB no responde en 15 s (`timeout`), no se puede alcanzar (`network`) o responde 5xx (`unavailable`), llega en
  su lugar la copia de la caché (de hasta 7 días) si la hay. Cualquier otra cosa que no sea un 2xx con JSON es
  `unavailable`.
- **Límites**: máximo 40 llamadas cada 10 s por plugin, conteste la llave que conteste (un balde de fichas), más los dos
  límites de la llave de Kino de arriba; una respuesta fresca de la caché no cuenta en los de Kino. En caché 10 minutos en
  memoria por ruta y parámetros (o sea, por `language`; solo cuerpos de hasta 512 KiB), y en disco con la caché de TMDB
  de Kino (desde 1 hora para listas y búsquedas hasta 7 días para `/find` y `/genre`), la haya traído la llave que sea. No
  cuenta en las 60 peticiones por llamada de `kino.fetch`. No desde `sign()` (`not_allowed`). La telemetría de Kino solo
  cuenta llamadas según cómo se respondieron (caché, llave de Kino, llave de la persona) y códigos de error, nunca una
  ruta ni una llave.
- **Una llamada que Kino dejó de esperar** (una falla corregida en Kino 0.9.54): cuando Kino abandona una de tus llamadas
  (la persona salió de la pantalla, se acabó el tiempo) pero igual le pasa su respuesta tardía a una llamada idéntica que
  la está esperando, `kino.tmdb` y `kino.meta` siguen respondiendo hasta que tu código termina. Kino 0.9.53 respondía
  `not_allowed` desde ese momento, así que un Inicio armado con muchas llamadas a `kino.tmdb` podía quedarse solo con su
  primera fila hasta reiniciar.
- **Sin `apiVersion` nuevo**: Kino 0.9.53 o superior; compruébala (`typeof kino.tmdb === "function"`) y deja tu propio
  ajuste de llave solo como respaldo para versiones anteriores de Kino, como arriba. Un plugin que arma su catálogo con
  TMDB ya no necesita pedirle una llave a cada persona. Un ejemplo completo: [Un catálogo de TMDB sin llave en el
  plugin](cookbook.md#tmdb-catalog).

Con el kit de Node, `kino.tmdb` usa tu llave de `KINO_TMDB_KEY` (o `"tmdbKey"` en `sdk/config.json`) donde la app usa la
de Kino, con el límite más estricto de la llave de Kino (20 cada 10 s; el kit no tiene una llave de la persona a la que
pasar), y con `KINO_TMDB_FIXTURE` responde sin red desde un archivo JSON con claves `"<path>?<params ordenados por
nombre>"` o `"<path>"`. Sin ninguno de los dos lanza `no_tmdb_key`, como una versión de Kino sin llave propia.

## `kino.sleep(ms)` y `kino.error(code, message?, { userMessage }?)` { #sleep-error }

`await kino.sleep(1500)` espera de 0 a 5000 ms (para un sitio que te limita las peticiones); el tiempo
cuenta dentro del límite de la llamada. `kino.error` arma los errores con tipo de
[Errores que la gente entiende](contract.md#errors); su `{ userMessage }` opcional (apiVersion 6) es tu
propia frase para la persona, que se muestra bajo [sus reglas](contract.md#user-message) como
"Mensaje de &lt;tu plugin&gt;: …".

### Errores que tu código puede atrapar { #catch }

Toda falla que reporta una llamada `kino.*` es un `Error` normal que recibe tu `try`/`catch` (tus
propios `throw` siguen teniendo [la trampa del rechazo](engine-limits.md#rejection-trap)). Compara
`e.code`, nunca el texto de `e.message`: ese texto es para el log y puede cambiar (en español hasta Kino 0.9.53, en
inglés desde Kino 0.9.54).

| Dónde | `e.code` |
| --- | --- |
| `kino.fetch` | `host_not_allowed`, `timeout`, `network`, `too_large`, `invalid_request` ([la tabla](#fetch)) |
| `kino.crypto` | `crypto_error` |
| `kino.browser.capture` | `browser_unavailable`, `timeout`, `blocked`, `busy`, `not_allowed`, `invalid_request` |
| `kino.browser.page` | los mismos, más `rate_limited` ([Navegador oculto](browser.md#page)) |
| dentro de [`sign()`](signed-streams.md#rules) | `host_not_allowed` desde `kino.fetch`; `not_allowed` desde `kino.storage`, `kino.cookies` y `kino.sleep` |
| `kino.storage` por encima de 256 KB o con un `ttlMs` inválido, `kino.html.select` por encima de sus límites, `kino.secret` con un nombre no declarado | sin `code`: un `Error` simple con un mensaje (en español hasta Kino 0.9.53, en inglés desde Kino 0.9.54) |

Desde Kino 0.9.50 una llamada `kino.*` **síncrona** que falla (un `kino.storage` lleno, una clave de
cifrado mala, un selector demasiado largo) la atrapa tu `try`/`catch` como cualquier otro error. Kino
0.9.49 y anteriores terminaban ahí la llamada entera aunque estuviera dentro de un `try`/`catch`, así
que en esas versiones vigila lo que guardas.

`kino.error(code, message?, { userMessage }?)` arma un `Error` cuyo `name` es `KinoError_<code>`
(`KinoError_not_found`), con `code` y, si pasaste una, `userMessage`. Un código que no es uno de los
cinco queda como `code: "unknown"`, y la persona lee un error simple. Lánzalo tal cual, o vuelve a lanzar
uno que atrapaste: el código le llega a la persona solo si el error sale de tu función con él. Lo que
lances (un `Error`, un texto, lo que sea) le llega a Kino como texto, cortado a 2.000 caracteres.

```js
try {
  kino.storage.set("cache:" + key, JSON.stringify(rows), { ttlMs: 3600000 });
} catch (e) {
  kino.log("cache: not saved", e.message);   // almacenamiento lleno: sigue sin el caché
}

try {
  return await api("/play/" + encodeURIComponent(ref));
} catch (e) {
  if (e.code === "timeout" || e.code === "network") return backupStream(ref);
  throw e;                                     // un kino.error conserva su código y su userMessage
}
```

## `kino.config` { #config }

```js
kino.config.get("server")   // text, url, password, select: un texto; toggle: true/false
kino.config.get("sources")  // list (apiVersion 4): [{ url: "https://…", category: "Noticias" }, …]
kino.config.all()           // todos los ajustes que tienen valor, como un objeto
```

`get` devuelve el valor de un ajuste: un texto en `text`, `url`, `password` y `select`; `true`/`false`
en un `toggle`; y en una `list` (apiVersion 4) un arreglo de objetos, uno por entrada, con las claves
de sus `fields` (`[{ url: "https://…", category: "Noticias" }, …]`), recortados y sin entradas en
blanco. `all` devuelve todos los ajustes que tienen valor, como un objeto. Solo lectura: los valores que
guardó la persona, o el `default` de un ajuste que no tocó. Un `toggle` sin `default` vale `false` y un
`select` sin `default` vale su primera opción, así que los dos siempre tienen valor. Un `text` o un
`password` sin valor y sin `default`, un `url` vacío (nunca tiene `default`) y una `list` vacía son
`undefined`. Los tipos `section`, `status` y `action` no guardan valor y nunca salen aquí. Todos los
tipos están en [Formulario de ajustes](settings-form.md#types).

## `kino.html.select(html, css)` { #html }

Analiza `html` y devuelve `[{ text, html, attrs }]` por cada elemento que cumple el selector CSS
(la sintaxis de selectores de Jsoup): `text` es su texto, `html` su HTML interno, `attrs` un objeto
con sus atributos. Solo se leen los primeros 2.000.000 caracteres de `html`, vuelven máximo 500
elementos, y lanza un error si el texto y el HTML de las coincidencias juntos pasan de 5.242.880
caracteres (5 MB). Un selector de más de 10.000 caracteres lanza
`Error("CSS selector too long (over 10000 characters)")` (Kino 0.9.53 y anteriores:
`"selector CSS demasiado largo (más de 10000 caracteres)"`). **Solo existe dentro de Kino**: la
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
valores); pasarse lanza `Error("plugin storage full (256 KB)")` (Kino 0.9.53 y anteriores:
`"almacenamiento del plugin lleno (256 KB)"`). Se borra cuando la
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
cualquier compilación mientras el [Modo debug](diagnostics.md#debug) de tu plugin está encendido: `"debug": true` solo lo deja así de entrada), los objetos se escriben como JSON, y un mensaje se corta a los 2000
caracteres. En el kit de Node van a stderr.

Cuando una llamada de un plugin cuyo manifiesto dice `"telemetry": true` o `"verbose"` (apiVersion 6)
**falla** (lanza un error, se pasa del tiempo, devuelve algo inservible, incluidos `sign`,
`settingsStatus`, `action` y `validateSettings`), las líneas que registró durante esa llamada (las
últimas 30, cada una cortada a 300 caracteres) viajan con el reporte de la falla al registro de
errores de quienes mantienen Kino como `plugin_log`; así que un `kino.log("home: status", r.status)`
antes del `throw` es como ves por qué falló en el celular de otra persona. Cada reporte va marcado con
el id y la versión de tu plugin; máximo un reporte por función y tipo de falla por hora. No se envía
nada de una llamada que sale bien, ni ninguna línea de un plugin que no declara `telemetry` (recomendado o
no, un scraper de Nuvio convertido): de esos Kino solo anota que la llamada falló (tu id y versión, la
función, el tipo de falla). Hasta Kino 0.9.53 las líneas de un plugin que lo declara se envían
siempre; desde Kino 0.9.54 la persona puede apagar "Enviar registros de errores y de reproducción" en la pestaña de tu
plugin en Ajustes (mira [Registro y telemetría](diagnostics.md#telemetry)), y entonces no se envía nada mientras esté
apagado. Antes de salir del aparato, a cada línea se le
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
