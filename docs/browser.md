# Navegador oculto (apiVersion 6)

Algunos sitios nunca ponen la dirección del video en su HTML: un reproductor incrustado la arma en la
página con sus propios scripts, y la única forma de conocerla es ejecutar la página. Para esos casos,
Kino 0.9.50 deja que un plugin abra la página en una **vista web oculta en el aparato** y reciba las
peticiones de video que hizo la página: `kino.browser.capture`. Es el último recurso, no la primera
herramienta.

!!! tip "Prefiere `kino.fetch`"
    Prueba primero el camino barato: un [`kino.fetch`](kino-api.md#fetch) de la página o del embed, y
    la dirección leída de su HTML, su JSON o una variable de un script ([`kino.html.select`](kino-api.md#html)
    ayuda). Es más rápido (no hay página que arrancar ni reproductor que esperar), corre en el
    [kit de Node](test-locally.md) y nunca necesita la línea roja de consentimiento. Deja el navegador
    oculto para los servidores que de verdad necesitan que la página corra.

## Cuándo usarlo { #when }

- Un embed cuya dirección de video solo aparece cuando la página ejecuta sus propios scripts (un
  reproductor ofuscado, un token calculado en la página, una dirección que el reproductor pide después
  de cargar).
- Un sitio donde cada servidor de un capítulo es un embed distinto, algunos sencillos (usa `kino.fetch`)
  y otros no (usa la captura solo para esos).

Cuándo **no** usarlo:

- Para leer una lista, una búsqueda o la página de un título: `kino.browser.capture` solo existe en
  `resolve` y devuelve peticiones de video, no HTML. (Kino 0.9.50 también trae
  [`kino.browser.page`](#page), con `"browser": "pages"`, para leer páginas; ver abajo.)
- Para pasar un sitio que pide una persona. Kino nunca resuelve un captcha, y tu plugin tampoco puede:
  ver [La regla dura](#no-captcha).

## El permiso, y lo que ve la persona { #permission }

```json
"apiVersion": 6,
"browser": true,
"streamHosts": "any"
```

- `"browser": true` necesita `"apiVersion": 6`; por debajo, el campo se ignora. `"browser": "pages"`
  además permite [`kino.browser.page`](#page), con su propia línea roja. Cualquier otro valor se rechaza
  con "El campo \"browser\" debe ser true, false o \"pages\"".
- La pantalla de consentimiento lo muestra **en rojo**: "Puede abrir páginas web ocultas para encontrar
  el video". Una actualización que lo agrega espera a que la persona apruebe de nuevo, como un host nuevo.
- Un plugin aprobado para esto tiene un límite de `resolve` más largo: **75 s en vez de 20 s**, porque
  cada página puede tardar hasta 25 s.
- La página que abres debe estar en un host al que llega tu `kino.fetch` (tus `hosts`), por `https`.
  Después la página puede cargar desde **cualquier servidor público** (el reproductor de un embed vive
  en hosts que no puedes listar de antemano), y el video que encuentra suele estar en uno de esos, así
  que un plugin que reproduce lo que captura necesita también
  [`"streamHosts": "any"`](manifest.md#stream-hosts) (otra línea roja).
- Mientras corre una captura, la persona no ve nada nuevo: el reproductor muestra su carga de siempre.
  La página nunca sale en pantalla.

## Solo en un `resolve` que empezó la persona { #where }

`kino.browser.capture` funciona solo dentro de `resolve`, y solo en un `resolve` que empezó la persona:
le dio play, o empezó una descarga (incluida su elección entre tus copias). En cualquier otro lugar
-- `search`, `home`, `episodes`, o un `resolve` que Kino corre en segundo plano, como una revisión de
disponibilidad -- lanza `not_allowed`. Kino nunca resuelve por adelantado los canales en vivo de un
plugin con navegador mientras la persona hace zapping.

Hay **una sola página a la vez en toda la app**. Una captura que empieza con otra página abierta lanza
`busy`; la captura de una descarga nunca espera a otra página (recibe `busy` de una vez y esa copia se
salta).

## El modelo de seguridad { #safety }

La página corre en el aparato de la persona, así que Kino la encierra:

- **Un proxy dentro de Kino.** Todo el tráfico de la página pasa por un proxy en el loopback del
  aparato, abierto solo mientras corre esa captura y que solo le responde a la página de esa captura,
  con una credencial hecha para esa captura. El proxy se conecta solo a la dirección que revisó, así
  que un nombre no puede responder una dirección a la revisión y otra a la conexión (la IP revisada
  queda fija); la WebView misma no resuelve ningún nombre.
- **La red de la casa, nunca.** Toda petición de la página a un nombre local, a una dirección privada o
  de loopback, o a un nombre público que resuelve dentro de la red de la casa recibe una respuesta
  vacía. La página inicial misma debe ser pública y `https`, o la captura lanza `blocked`.
- **Todos los métodos, la misma revisión.** `POST` funciona, la página sigue las redirecciones como en
  un navegador, y las conexiones WebSocket pasan por la misma revisión. WebRTC está apagado.
- **A dónde puede ir la página principal.** La página de una captura puede navegar a cualquier sitio
  público en el nivel principal (la cadena de redirecciones de un embed salta de host a propósito; con
  [`fetchHosts: "any"`](manifest.md#fetch-hosts) aprobado, esas navegaciones tienen que ser `https`, puerto 443 y un nombre con punto):
  solo devuelve las peticiones de video que hizo la página y la última dirección de la página principal,
  nunca un documento. Una [lectura de página](#page) es más estricta: su documento principal tiene que
  quedarse en tus hosts.
- **Con `fetchHosts: "any"` aprobado, tres capas** (Kino 0.9.55). Una sola regla cubre la dirección de inicio y cada
  navegación posterior del nivel principal (una redirección, un meta refresh, un script que cambia `location`): un host que
  declaraste o que la persona escribió conserva sus propias reglas (un host `insecureHttp` admite `http`, un host
  declarado cualquier puerto, un servidor escrito por la persona exactamente como lo escribió); un host alcanzable solo por
  el permiso tiene que ser `https`, en el puerto 443, con un nombre con punto o una IPv4 pública. Las navegaciones pueden
  salir de tus hosts (los embeds saltan a propósito) y la primera que rompa la regla termina la captura con `blocked`
  («solo se abren páginas https en el puerto 443 con un nombre público con punto»). Es detección, no siempre prevención:
  cuando el WebView del aparato pasa la página por el proxy de Kino, una redirección del servidor sobre la página principal
  la sigue el WebView antes de que Kino la vea, así que su destino puede recibir una conexión antes de que termine la
  captura (lo mismo vale para una lectura de página). Los **subrecursos** de la página (marcos, scripts, la CDN del video)
  siguen tan amplios como antes: cualquier servidor público, nunca la red de la casa, cubiertos por tu propio consentimiento
  `"browser": true` y no por el permiso, y no cuentan en el cupo de `kino.fetch`. Los service workers solo se mantienen
  fuera de la red donde el WebView del aparato lo permite. Sin el permiso, las navegaciones de una captura no se vigilan.
- **Limpia cada vez.** Cada página empieza sin cookies ni almacenamiento, y todo se borra al cerrarla.
  Nada se comparte con [`kino.cookies`](kino-api.md#cookies), con tus otras capturas ni con ningún otro
  plugin.
- **Nada sale.** La página no puede abrir ventanas, descargar archivos, salir de http(s), leer archivos,
  pedir ubicación, cámara o micrófono, ni mostrar diálogos, y está oculta para los servicios de
  accesibilidad. El sonido va silenciado.
- **Sin puente.** No hay canal de la página a tu código: lo que recibes es solo lo que la página pidió.
- Un aparato cuya WebView no se puede apuntar a un proxy igual captura, con Kino haciendo él mismo cada
  `GET`/`HEAD` (un `POST` entonces solo llega a una dirección IPv4 pública escrita como tal, y no hay
  WebSocket). Uno cuya WebView no puede correr scripts al inicio del documento, o que no tiene WebView
  (algunas cajas de TV), recibe `browser_unavailable`.

## La regla dura: Kino nunca resuelve un captcha { #no-captcha }

!!! danger "Una página que pide una persona termina la captura con `blocked`"
    Cuando la página muestra un CAPTCHA, ALTCHA, Turnstile, hCaptcha, una casilla de reCAPTCHA,
    "Verify you are human" o "Confirme que es humano", la captura termina **de inmediato** con `blocked`.
    Kino nunca intenta resolverlo, hacerle clic ni marcarlo, y tu plugin tampoco: nada de servicios que
    resuelven captchas, trucos de huella del navegador ni bucles de reintento para desgastar la revisión.
    Trata `blocked` como "este servidor no es para nosotros ahora" y pasa a tu siguiente servidor, o
    falla con un error claro.

    Cada autor es responsable de su propio plugin. Kino solo **lista** los plugins de la comunidad (su
    búsqueda de la comunidad); no los recomienda ni los promociona. Si un plugin incumple las reglas
    para plugins -- por ejemplo, usa `userMessage` para pedir plata, contraseñas o datos de contacto,
    es malware o infringe los derechos de alguien --, Kino lo retira del índice de la comunidad con
    [`community-blocklist.json`](https://github.com/kinotvapp/kino-plugins/blob/main/community-blocklist.json) (en la raíz de este repositorio), y cualquiera lo puede reportar
    con la plantilla de issue ["Reclamo / retiro de plugin"](https://github.com/kinotvapp/kino-plugins/issues/new?template=reclamo-retiro-plugin.yml). Una copia instalada sigue
    instalada, su tarjeta dice "Retirado del índice de la comunidad." y no recibe más actualizaciones;
    un fork necesita su propio reporte. Ver [Reclamos y retiro de plugins](claims.md).

## `kino.browser.capture(url, options?)` { #capture }

Abre `url` en la vista web oculta, deja correr la página (en silencio), le da play y responde con las
peticiones de video que hizo la página, primero los manifiestos (HLS/DASH) y después los MP4.

| opción | |
| --- | --- |
| `timeoutMs` | 1 a 25000 ms; por defecto 18000. La captura termina en la primera petición de video (más 1 s para sus hermanas; los manifiestos van antes que los MP4 sin importar el orden en que llegaron) o aquí. |
| `headers` | Encabezados extra solo para la primera carga de la página (un `Referer` que un embed exige). `Cookie`, `Host` y similares se descartan. |
| `match` | Una expresión regular (sin distinguir mayúsculas, 1 a 500 caracteres) de lo que cuenta como el video; por defecto: `.m3u8`, `.mpd`, `.mp4`, `master.txt`, `videoplayback`, `/hls/`. |
| `autoplay` | Por defecto `true`: arranca cualquier video, hace clic unas veces en los botones de play/servidor de siempre y toca el centro de la página cada 2 s (un toque llega al reproductor de un embed de otro origen). Nunca toca una revisión humana: esa termina la captura. |

La respuesta es `{ media: [{ url, mime?, headers }], subtitles: [{ url }], finalUrl }`, máximo 8 media
y 10 subtítulos.

### Tiempos { #timeouts }

- Cada captura: `timeoutMs`, máximo 25 s (18 s por defecto).
- Todo el `resolve` de un plugin con navegador aprobado: 75 s, tus fetch y todas las capturas juntas.
  Caben dos o tres servidores; planea para el primero que responda, no para probarlos todos.
- `timeout` quiere decir que la página no mostró ninguna petición de video a tiempo. Prueba el siguiente
  servidor.

### Encabezados y cookies que debes devolver { #headers }

La página **nunca descarga** una petición de video: Kino la retiene (la página recibe una respuesta
vacía), así que un token de un solo uso o atado a la sesión en su dirección sigue sin gastarse cuando el
reproductor lo pide. Los `headers` de cada media son los que llevaba la petición de la página (Referer,
Origin, User-Agent, Accept-Language, un encabezado con token…, máximo 12; nunca `Range`,
`Accept-Encoding` ni el paquete de la app) **más las cookies de la página para esa dirección**.
Devuélvelos como los `headers` del Stream y al reproductor le sirven lo mismo que le habrían servido a
la página. Sin ellos, la mayoría de estos servidores responden 403.

### Todas las coincidencias, una cookie, una respuesta al acabarse el tiempo (Kino 0.9.54) { #capture-all }

Cuatro opciones más, sin `apiVersion` nuevo: Kino 0.9.54 y posteriores las aceptan, un Kino
anterior las ignora y hace una captura normal. Comprueba `kino.browser.captureAll === true` antes de contar con ellas
(`node sdk/validate.mjs` avisa cuando no lo haces).

```js
if (kino.browser.captureAll) {
  const page = await kino.browser.capture(embed, {
    match: "master\\.m3u8", captureAll: true, alsoMatch: ["\\.key", "/subs/"], timeoutMs: 15000,
  });
  const master = page.requests[0];                 // the first request matching `match`
  const key = page.requests.find((r) => /\.key/.test(r.url));
}
```

| opción | |
| --- | --- |
| `captureAll` | Junta todas las peticiones cuya URL cumple `match` (o el patrón de media por defecto) o alguno de `alsoMatch`, sin repetir URL, máximo 20, y termina cuando ya vio la primera coincidencia y nada nuevo coincidió durante 1 s (o al llegar a 20, o en `timeoutMs`). |
| `alsoMatch` | Solo con `captureAll`: de 1 a 10 expresiones regulares más (sin distinguir mayúsculas, de 1 a 500 caracteres cada una; un texto o el `source` de un RegExp). Sus peticiones se juntan y aun así le llegan a la página (solo se retienen las de `match`). |
| `waitForCookie` | El nombre de una cookie (un token HTTP, como `cf_clearance`) que la página también debe tener para su host actual. Sin `match` no hace falta ninguna petición: la página termina en cuanto la cookie está. Con `match`, solo cuando se cumplen las dos (con `captureAll`, el segundo de calma empieza ahí). A una página que espera una cookie nunca se le da play ni se le toca. `captureAll` con `waitForCookie` necesita un `match`. |
| `returnCookiesOnTimeout` | Una página a la que se le acaba el tiempo responde lo que tenía, con `timedOut: true`, en vez de lanzar `timeout`. |

Una llamada que usó alguna de ellas también recibe `requests` (`[{ url, method, headers }]`, la primera coincidencia
primero, cada una con el método y los encabezados que mandó la página), `cookies` (las de la página final, como objeto:
máximo 64 y 16.384 caracteres en total, primero las `cf_*`/`__cf*` de Cloudflare), `userAgent` (el de la página oculta,
al que Cloudflare ata `cf_clearance`: mándalo junto con esas cookies) y `timedOut`. En una respuesta por tiempo sin
ninguna coincidencia vista, `requests` solo trae lo que encontró `alsoMatch` (o nada): revisa cada URL con tus propios
patrones. Una llamada sin estas opciones recibe exactamente la respuesta de arriba. Los patrones se buscan en cualquier
parte de la URL, incluidas la dirección de la página principal y sus redirecciones; empieza uno con `(?-i)` para que
distinga mayúsculas.

Antes de Kino 0.9.54 estos cuatro nombres se ignoraban (la captura simplemente los descartaba); desde 0.9.54 se revisan,
y un valor del tipo equivocado (`captureAll: 1`, `alsoMatch: "x"`, un nombre de cookie con un espacio) es
`invalid_request`. Ningún plugin del catálogo de Kino los manda hoy.

## Un ejemplo completo { #example }

Una fuente cuya página de capítulo lista varios servidores, cada uno un embed. La lista se lee con
`kino.fetch`; un servidor se captura ya, y los demás se ofrecen como
[copias perezosas con etiqueta](contract.md#lazy-copies) que solo se capturan si la persona escoge una o
si la primera no se puede reproducir.

```js
// kino-plugin.json: "apiVersion": 6, "browser": true, "streamHosts": "any",
//                   "hosts": ["example.com"], "capabilities": ["search", "episodes", "resolve"]
const BASE = "https://example.com";

async function listServers(episodeRef) {           // barato: HTML plano, sin abrir página
  const r = await kino.fetch(`${BASE}/episode/${episodeRef}`);
  if (!r.ok) throw kino.error("unavailable", `episode ${r.status}`);
  return kino.html.select(r.text, "li[data-embed]").map((li, i) => ({
    id: String(i),
    name: li.attrs.title || `Servidor ${i + 1}`,
    lang: li.attrs["data-lang"] || "Latino",
  }));
}

async function resolveServer(episodeRef, serverId) {
  const page = await kino.browser.capture(`${BASE}/embed/${episodeRef}/${serverId}`, { timeoutMs: 18000 });
  const [first, ...rest] = page.media;              // primero HLS/DASH, después MP4
  return {
    url: first.url,
    headers: first.headers,                         // Referer, User-Agent, Cookie...: devuélvelos
    alternatives: rest.map((m) => ({ url: m.url, headers: m.headers })),
    subtitles: page.subtitles.map((s) => ({ url: s.url, lang: "es" })),
  };
}

export async function resolve(ref) {
  // El ref propio de una copia perezosa: "<capítulo>|<servidor>". Resuelve solo ese servidor.
  if (ref.includes("|")) {
    const [episodeRef, serverId] = ref.split("|");
    const { alternatives, ...stream } = await resolveServer(episodeRef, serverId);
    return stream;                                  // las alternatives de una copia se ignoran igual
  }
  const servers = await listServers(ref);
  for (const [i, s] of servers.entries()) {
    try {
      const { alternatives, ...stream } = await resolveServer(ref, s.id);
      return {
        ...stream,
        label: `${s.lang} · ${s.name}`,             // "Latino · Servidor 1"
        alternatives: servers.filter((o) => o !== s).slice(0, 8)
          .map((o) => ({ label: `${o.lang} · ${o.name}`, ref: `${ref}|${o.id}` })),
      };
    } catch (e) {
      if (["blocked", "timeout"].includes(e.code) && i < 2) continue; // siguiente servidor, dentro de los 75 s
      throw e;
    }
  }
  throw kino.error("unavailable", "no server answered");
}
```

## Fallas comunes { #failures }

| Código | Qué pasó | Qué hacer |
| --- | --- | --- |
| `blocked` | La página pidió una persona (captcha), o el host inicial no es tuyo, no es https o resuelve dentro de la red de la casa. | Pasa al siguiente servidor. Nunca reintentes el mismo en bucle, nunca intentes resolverlo. |
| `timeout` | La página no mostró ninguna petición de video en `timeoutMs`. | Siguiente servidor; revisa `match` si el reproductor usa una dirección rara. |
| `busy` | Hay otra página oculta abierta (una en toda la app), o la captura de una descarga encontró una abierta. | Falla esta copia; Kino sigue con la próxima. No esperes en un bucle. |
| `browser_unavailable` | No hay WebView en este aparato (algunas cajas de TV), o la que hay no puede correr scripts al inicio del documento. **Siempre en el kit de Node.** | Deja un camino con `kino.fetch` para los servidores que lo permiten, para que esos aparatos (y el kit) igual reproduzcan algo. |
| `not_allowed` | Sin aprobar, fuera de `resolve`, o un `resolve` que nadie empezó. | Llámalo solo desde `resolve`. |
| `invalid_request` | Una opción mala (`timeoutMs` fuera de rango, un `match` que no es una expresión válida…). | Corrige la llamada. |

Para depurar: mientras el [Modo debug](diagnostics.md#debug) de tu plugin está encendido (`"debug": true`
en el manifiesto solo lo deja así de entrada), las líneas de logcat de Kino sobre la página oculta
(etiqueta `KinoPlugin/<id>`) nombran los hosts y rutas que cargó; en una versión de producción con el
interruptor apagado nunca lo hacen. Ver [Registro y telemetría](diagnostics.md).

## `kino.browser.page(url, options?)`: leer una página { #page }

También en Kino 0.9.50 (apiVersion 6), pero se pide **por nombre**:

```json
"apiVersion": 6,
"browser": "pages"
```

`"pages"` incluye todo lo que da `true` (también `kino.browser.capture`). La línea roja entonces lo
dice: "Puede abrir páginas web ocultas para mostrar contenido y encontrar el video". `"browser": true`
sigue siendo solo captura, con la línea de antes, y su `kino.browser.page` responde `not_allowed`. Un
plugin que la persona aprobó con `true` vuelve a preguntar cuando su actualización dice `"pages"`
-- también en la pasada automática de actualizaciones después de actualizar Kino, y en otro aparato que
solo aprobó la línea de antes. Cualquier otro valor se rechaza: "El campo \"browser\" debe ser true,
false o \"pages\"".

Algunos sitios responden cada `kino.fetch` normal con su revisión automática de navegador (el "Just a
moment…" de Cloudflare). `kino.browser.page` carga `url` en la misma vista web oculta de la captura
-- misma regla del host inicial, mismo proxy y mismo rechazo de la red de la casa, cookies y
almacenamiento nuevos, una sola página a la vez en toda la app -- y devuelve el HTML de la página cuando
ya cargó, **ya no es la página de revisión del sitio** (el "Just a moment…" de Cloudflare, sus marcas
`cf-chl`) y coincide con `waitFor`.

**Dónde.** Desde `search`, `home`, `browse`, `episodes`, [`details`](contract.md#details) (Kino 0.9.54, apiVersion 8), `section` o `resolve`, solo mientras la
persona está usando la app: su propia búsqueda, la fila de Inicio o la sección que abrió, una lista, un
título, su play (un `resolve` también para una descarga que ella empezó). Una llamada que Kino hace por
su cuenta recibe `not_allowed`: "Para ti" revisando sus sugerencias cuando termina un capítulo,
**`categories`** (siempre es una llamada propia de Kino, aunque la persona esté mirando Categorías), las
filas de Inicio que pide por adelantado al abrir, los capítulos nuevos, el resolve por adelantado del
zapping en vivo, la sincronización y la búsqueda de actualizaciones. También la lectura de una lista
mientras la app no está al frente.

!!! warning "`categories` no puede leer páginas"
    Versiones anteriores de 0.9.50 ponían `categories` entre los exports que pueden llamar
    `kino.browser.page`; ya no. Arma tus mosaicos de Categorías con datos que ya tienes (un
    `kino.fetch`, o lo que una lectura de página en `home` o `section` dejó en
    [`kino.storage`](kino-api.md#storage)).

**La página tiene que quedarse en tus hosts.** No solo la dirección inicial: cada navegación del nivel
principal -- una redirección, un meta refresh, un script que cambia `location`, una redirección abierta
-- y el documento que finalmente se lee tienen que estar en un host al que llega tu `kino.fetch`, por
https. El primer salto que no lo está corta la lectura con `blocked` ("la página terminó en un host que
el plugin no declaró") y no vuelve ningún HTML. Los frames, scripts e imágenes dentro de la página sí
pueden cargar desde cualquier servidor público. Nada en la página se reproduce (el video necesita un
gesto que nunca llega), y la página oculta no recibe ningún toque ni tecla de la persona.

```js
// Un sitio cuyo kino.fetch siempre responde el 403 "Just a moment…" de Cloudflare.
const BASE = "https://example.com";

async function read(url, waitFor) {
  const r = await kino.fetch(url);
  if (r.ok && !/just a moment|cf-chl/i.test(r.text)) return r.text;        // primero el camino barato
  const page = await kino.browser.page(url, { waitFor, timeoutMs: 12000 });  // dentro de los 15 s de search
  return page.html;
}

export async function search(query) {
  try {
    const html = await read(`${BASE}/?s=${encodeURIComponent(query.q)}`, "class=\"item");
    return kino.html.select(html, "article.item").map(/* … tus items … */);
  } catch (e) {
    // blocked: el sitio quiere una persona (un captcha) o nunca dejó entrar al aparato. Ríndete en silencio.
    if (e.code === "blocked" || e.code === "busy" || e.code === "rate_limited") return [];
    throw e;
  }
}
```

| opción | |
| --- | --- |
| `timeoutMs` | 1 a 25000 ms; por defecto 15000. Cuenta dentro del límite de tu propia llamada (`search` 15 s, tus otros fetch incluidos; `home`, `browse`, `episodes`, `details`, `section` 20 s; `resolve` 75 s para un plugin con navegador). Kino lo recorta a lo que queda de ese límite **menos 1,5 s** para que alcances a usar el HTML, así la lectura termina con su propio `timeout` en vez de cancelarse toda la llamada; igual, pasa unos **12000 en `search`** y deja espacio para tus otros fetch. |
| `waitFor` | Una expresión regular de JavaScript (texto o `RegExp`, 1 a 500 caracteres, sin distinguir mayúsculas, contra el HTML dentro de la página; un `RegExp` conserva sus banderas `m` y `s`, las demás no cambian nada en una prueba): la página se devuelve solo cuando coincide. Sin ella, apenas carga la página y pasa su revisión. Úsala con páginas que llenan su lista con scripts. |

La respuesta es `{ html, finalUrl, status, truncated }`: el doctype y el `outerHTML` del DOM después de
que corrieron los scripts de la página (máximo 2.000.000 caracteres, lo que acepta `kino.html.select`;
`truncated` es `true` cuando se cortó), la última dirección de la página principal y el estado HTTP de
su última carga.

**En modo página Kino nunca toca la página.** Ni clic, ni toque, ni tecla, ni scroll, ni ayuda de
autoplay. Así que la única revisión que puede pasar es una que se completa sola, como cuando una persona
abre el sitio: la revisión automática de Cloudflare suele hacerlo en unos segundos. Una página que pide
una persona termina la lectura de inmediato con `blocked`, y una página que sigue en su revisión cuando
se acaba `timeoutMs` también es `blocked` (el sitio no dejó entrar al aparato). No la reintentes en
bucle; pasa a otra fuente o no devuelvas nada.

**Límites.** Máximo **20 lecturas de página por minuto** por plugin (`rate_limited` después: nunca se
martilla un sitio a través del navegador oculto). Cada lectura abre una página nueva, así que guarda lo
que leíste con [`kino.storage`](kino-api.md#storage). La lectura de una lista espera hasta 8 s su turno
cuando hay otra página abierta (`busy` después), y la persona dándole play la termina.

Errores: `browser_unavailable` (sin WebView, y siempre en el kit de Node cuando la petición es válida y
el manifiesto dice `"pages"` -- antes el kit responde `invalid_request` y `not_allowed` como lo hace la
app; deja un camino con `kino.fetch` normal para que el kit pueda correr tu plugin), `timeout` (la
página no cargó, o `waitFor` nunca coincidió), `blocked` (una revisión que pide una persona, una revisión
que nunca pasó, un documento principal fuera de tus hosts; o el host inicial no es tuyo, no es https o
resuelve dentro de la red de la casa), `busy`, `not_allowed` (sin `"browser": "pages"` aprobado -- `true` es solo captura --, otra
función, o nadie está usando la app), `rate_limited` e `invalid_request`.

## Un ejemplo real { #real-world }

[**Maratón**](https://github.com/xuper-plugin/maraton) (firmado, `apiVersion` 6, `"browser": "pages"`) es un plugin hecho así:
lista los servidores e idiomas de cada capítulo con `kino.fetch` normal, reproduce el primero con
`kino.browser.capture` y ofrece los demás como [copias perezosas con etiqueta](contract.md#lazy-copies)
en el menú Servidor del reproductor, cada una capturada solo cuando la persona la escoge. Para todo lo
demás -- ajustes, sesiones, descargas, canales en vivo -- "Tu servidor"
([kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server)) sigue siendo
el plugin de referencia completo.
