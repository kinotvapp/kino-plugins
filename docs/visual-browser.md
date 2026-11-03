# Una ventana de navegador que la persona maneja (`visualBrowser`, apiVersion 20) { #visual-browser }

El [navegador oculto](browser.md) está oculto: nadie lo ve y nadie puede escribir en él. Hay cosas que solo la persona puede hacer
en una página web: iniciar sesión, resolver una verificación, aceptar los términos de un sitio, elegir algo. Con
`"apiVersion": 20` y `"visualBrowser": true` tu plugin puede abrir **una ventana que la persona ve y usa**,
`kino.visualBrowser.open`, y recibir lo que la página dejó (cookies, el HTML de la página, su última dirección), o pedirle a Kino
que escriba las cookies directo en uno de tus ajustes `password`.

!!! note "Disponible desde Kino 0.9.81"
    `apiVersion` 20 llega con Kino 0.9.81. La ventana funciona en teléfono y tableta Android y,
    **de forma experimental**, en Android TV. No existe en la app de escritorio ni en un aparato sin WebView.

## El manifest { #manifest }

```json
{
  "apiVersion": 20,
  "visualBrowser": true,
  "hosts": ["accounts.google.com", "music.youtube.com"],
  "settings": [{ "key": "cookieHeader", "label": "Cookies", "type": "password" }]
}
```

`visualBrowser` es `true` o `false` (por defecto `false`); por debajo de `apiVersion` 20 se ignora y cualquier otro valor se
rechaza con `The "visualBrowser" field must be true or false`. **No es una capability**: en la instalación solo se aprueba una línea
de consentimiento sencilla («Puede abrir una ventana web donde inicias sesión o terminas un paso en sus sitios»), porque Kino le
pregunta a la persona en su propia hoja **en cada apertura**.

Un plugin que conserva un `apiVersion` más bajo (para que todo Kino lo siga instalando) puede ofrecer la ventana solo a un Kino que
la tenga, con un [enhancement](enhancements.md): `"enhancements": { "20": { "visualBrowser": true } }`. En ambos casos, revisa
`kino.visualBrowser?.available` antes de usarla.

## `kino.visualBrowser.open(options)` { #open }

```js
if (kino.visualBrowser?.available) {                   // undefined en un Kino sin ella; false en el escritorio y en un aparato sin WebView
  const r = await kino.visualBrowser.open({
    url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
    title: "YouTube Music",                              // después del nombre de tu plugin en la barra de Kino
    doneWhen: { cookies: ["SAPISID"] },                  // opcional: la ventana se cierra sola cuando la página las tiene
    collect: { cookies: ["SID", "HSID", "SAPISID"], storeAs: { setting: "cookieHeader", format: "header" } },
    userAgent: "browser",                                // o tu propio texto
    timeoutMs: 600000,                                   // 10 minutos como máximo
  });
  // r = { status: "done" | "closed" | "timeout", finalUrl?, cookies?, html?, stored?, storedNames?, userAgent? }
}
```

`kino.visualBrowser` es `undefined` sin la clave del manifest o en un Kino anterior a 0.9.81; `kino.visualBrowser.available` es
`false` en el escritorio y en un aparato sin WebView.

## Lo que ve la persona { #consent }

La hoja propia de Kino **cada vez**, con las palabras de Kino (nunca las tuyas): «&lt;tu plugin&gt; quiere abrir una ventana web»,
los sitios (los `hosts` de tu manifest), los **nombres** de las cookies que pediste, si la ventana se presenta como un navegador
normal o con un texto propio y, con `storeAs`, que Kino guarda las cookies y tú no las ves. Solo después de Continuar se abre la
ventana, con la barra de Kino (el nombre de tu plugin, tu `title`, el host con un candado, Cerrar y, si no diste `doneWhen`, Listo)
que no puedes cambiar. Decir que No, Cerrar y Atrás te dan `{ status: "closed" }`.

## Las reglas { #rules }

- **Solo desde un toque de la persona**: una `action` de ajustes, una `panelAction` o un `screenEvent` que sigue a un toque o a un
  envío de la persona (la misma puerta que el [escáner QR](qr.md)). Desde cualquier otra cosa (una búsqueda, el Home, un temporizador,
  un trabajo, la apertura o el "cargar más" de una pantalla, una llamada en segundo plano) la llamada lanza `forbidden`.
- **Solo tus hosts.** La primera `url` y cada página a la que pase la ventana deben ser https en el puerto por defecto y de un host
  de los `hosts` de tu manifest (con comodines como allí). Cualquier otra se detiene y Kino lo dice; la red local nunca es
  alcanzable. Un inicio de sesión que pasa por `accounts.google.com` necesita declararlo.
- **Cookies.** Los nombres de `collect.cookies` (32 como máximo) se leen de los hosts por los que pasó la ventana y que tú declaras,
  también las HttpOnly, con 64 cookies como máximo y 16.384 caracteres entre nombres y valores; llegan solo con `done`.
  `collect.html` es el DOM de la página (2.000.000 de caracteres como máximo) y `collect.finalUrl` su última dirección.
- **`storeAs`**: Kino mismo escribe las cookies en tu ajuste `password` `setting` (declarado en el manifest) como
  `name=value; name2=value2` (`"header"`) o un objeto JSON (`"json"`), **cuando tu llamada ya terminó** (guardar un ajuste reinicia
  tu runtime); tu script recibe `stored` y `storedNames` (los nombres, nunca un valor). Un ajuste `password` admite 500
  caracteres: un texto más largo responde `store_failed` y no se guarda nada. Los secretos sellados mantienen su regla: solo viajan
  a tus hosts declarados.
- **`storeAs.spill`** (opcional, para una lista de cookies de más de 500 caracteres; la de YouTube Music necesita unos 850): una
  lista de 1 a 3 ajustes `password` tuyos **más** (declarados, distintos, ninguno igual a `setting`; si no, `bad_args`). Kino corta el
  texto con formato en el límite del ajuste (500 caracteres) y los trozos son los valores de los ajustes **en orden**: primero
  `setting`, luego cada uno de `spill`; un ajuste al que el texto no llega se vacía, pero solo si ahora tiene un valor. Todos se
  guardan en **un solo** guardado (la sincronización registra un cambio), todo o nada: si `(1 + spill.length) x 500` no alcanza para
  el texto, la respuesta es `store_failed` y no se guarda nada. Tu script sigue sin ver nunca un valor. **Para leerlo de vuelta,
  concatena los valores de los ajustes en ese orden, sin separador** (con `"header"` un corte puede caer dentro de una cookie, así
  que nunca partas ni recortes un trozo):
  `[kino.config.cookieA, kino.config.cookieB, kino.config.cookieC, kino.config.cookieD].join("")`.
- **`storeAs.thenEvent`** (opcional): una pantalla que abrió la ventana no puede ver la cuenta nueva en la misma llamada, porque la
  escritura ocurre cuando la llamada ya terminó. Nombra un `screenEvent` y Kino se lo envía a **tu pantalla abierta** cuando el
  ajuste ya se escribió con éxito, con `arg` = `{ stored: ["SID", ...] }` (solo nombres de cookies) y sin `value`; atiéndelo
  recargando tus datos. El nombre sigue las reglas de nombres de evento (de 1 a 128 caracteres de `A-Z a-z 0-9 . _ ~ -`, nunca
  `open`; si no, `bad_args`). Se envía solo cuando la llamada vino del `screenEvent` de una pantalla (desde una acción de ajustes o
  una `panelAction` la opción se acepta y no se envía nada), nunca tras una escritura fallida o una ventana que no terminó en
  `done`, se descarta en silencio si tu pantalla ya se cerró o su cola de eventos está llena, y como máximo una vez por llamada. Es un
  seguimiento, no un toque: de su respuesta se descartan `go.url`, `go.copy`, `go.titleByIds`, `go.installPlugin`, `share` y
  `enableJob`; `state`, `config` y un toast funcionan, con el presupuesto de tiempo normal de un evento.
- **Un almacén limpio.** La ventana empieza con las cookies de tus hosts vencidas y las vuelve a vencer al cerrarse (Android tiene un
  solo almacén de cookies para la app, así que una cookie de una ruta distinta de `/` sobrevive; no es el de tu `kino.fetch`).
- **Nada más.** Ningún script tuyo en la página, ninguna tecla expuesta, sin ventanas emergentes, descargas, selector de archivos,
  cámara, micrófono, ubicación ni avisos. Una sola ventana a la vez en toda la app (`busy`), 10 minutos como máximo (`timeoutMs`, que
  se baja a 600.000 o se sube a 5.000), y se cierra cuando la app queda un minuto en segundo plano o se apaga la pantalla.
- **El tiempo de la ventana es su propio `timeoutMs`.** Mientras la ventana está abierta, el límite de tiempo de la llamada que la
  abrió (el de una acción de ajustes, una `panelAction` o un `screenEvent`) no corre, así que un inicio de sesión de Google con
  verificación en dos pasos puede tardar lo que la persona necesite, hasta `timeoutMs`. Cuando la ventana se cierra, tu llamada
  tiene al menos 10 segundos para ejecutar el código posterior a `open`; si se cuelga después de eso, se detiene como siempre.
- **`doneWhen`** cierra la ventana solo: `cookies` (existen todas las cookies nombradas) y/o `urlMatches` (la dirección coincide con
  el patrón, donde `*` es cualquier tramo de caracteres y el resto es literal; 200 caracteres como máximo).
- **`userAgent`**: `"browser"` es el texto del Chrome del teléfono, que Kino mantiene al día; o el tuyo, de 1 a 300 caracteres ASCII
  imprimibles, para que un sitio que cambia lo que acepta se arregle con una actualización del plugin. De cualquier forma se quita
  la marca del WebView (`; wv`) y no se envía `X-Requested-With` (en un WebView que deja a Kino quitarlo). Sin él: el del WebView.

Errores, en `e.code`: `bad_args` (las opciones están mal), `forbidden`, `unavailable` (el aparato no tiene WebView, o es el
escritorio), `busy` y `store_failed`.

## En un TV (experimental) { #tv }

La ventana también se abre en Android TV, manejada con el control remoto: el D-pad se mueve entre los enlaces y campos de la página,
OK sobre un campo de texto abre el teclado del TV, Atrás retrocede en la página y luego cierra, y la barra de Kino (Cerrar y, si no
diste `doneWhen`, Listo) se alcanza con Arriba desde la página (o con la tecla Menú) y Abajo desde la barra. La hoja de Kino es la
misma, más grande y con foco. Límites: un sitio cuyos controles solo responden a un puntero (menús al pasar el cursor, widgets de
canvas, asas de arrastre) puede ser difícil o imposible de alcanzar, y un TV box sin WebView responde `available === false`. Deja
el ajuste de pegar las cookies como alternativa, y recuerda que las cookies que guardas viajan a los otros aparatos de la persona con
la sincronización, así que vincular en el teléfono también cubre el TV.

## Receta: vincular una cuenta ("Vincular cuenta") { #recipe-link }

Un inicio de sesión al estilo de YouTube Music: el plugin guarda sus cookies en un ajuste `password` y ofrece un botón que lo llena.

```json
"settings": [
  { "key": "link", "label": "Vincular cuenta", "labelEn": "Link account", "type": "action" },
  { "key": "cookieHeader", "label": "Cookies (pegarlas a mano si no puedes vincular)", "type": "password" }
]
```

```js
async function action(key) {
  if (key !== "link") return;
  if (!kino.visualBrowser?.available) return { message: "Pega las cookies en el campo de abajo" };
  const r = await kino.visualBrowser.open({
    url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
    title: "YouTube Music",
    doneWhen: { cookies: ["SAPISID"] },
    collect: { cookies: ["SID", "HSID", "SSID", "APISID", "SAPISID", "__Secure-3PSID"], storeAs: { setting: "cookieHeader", format: "header" } },
    userAgent: "browser",
  });
  if (r.status !== "done" || !r.stored) return { message: "No se vinculó la cuenta" };
  return { message: "Cuenta vinculada" };   // Kino guarda el header cuando esta llamada termina
}
```

La lista completa de cookies de YouTube Music es más larga que un ajuste `password` (unos 850 caracteres), así que el plugin
declara cuatro (`cookieA` a `cookieD`) y deja que Kino reparta el texto entre ellos:

```js
const r = await kino.visualBrowser.open({
  url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
  title: "YouTube Music",
  doneWhen: { cookies: ["SAPISID"] },
  collect: {
    cookies: ["SID", "HSID", "SSID", "APISID", "SAPISID", "__Secure-3PSID", "__Secure-3PAPISID", "__Secure-3PSIDTS", "LOGIN_INFO", "VISITOR_INFO1_LIVE", "YSC"],
    storeAs: { setting: "cookieA", spill: ["cookieB", "cookieC", "cookieD"], format: "header", thenEvent: "account_linked" },
  },
  userAgent: "browser",
});
// Después, en cualquier llamada: los trozos son los valores de los ajustes en orden, unidos SIN separador.
const cookieHeader = [kino.config.cookieA, kino.config.cookieB, kino.config.cookieC, kino.config.cookieD].join("");
```

Lo mismo desde una **pantalla** (un botón de tu árbol cuyo `screenEvent` abre la ventana); `thenEvent` le avisa a la pantalla
cuando las cookies ya están guardadas, para que se recargue con la cuenta nueva:

```js
async function screenEvent({ name, arg, state }) {
  if (name === "link") {
    const r = await kino.visualBrowser.open({
      url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
      doneWhen: { cookies: ["SAPISID"] },
      collect: { cookies: ["SID", "HSID", "SAPISID"], storeAs: { setting: "cookieHeader", format: "header", thenEvent: "account_linked" } },
      userAgent: "browser",
    });
    return r.stored ? { toast: "Vinculando..." } : { toast: "No se vinculó la cuenta" };
  }
  if (name === "account_linked") {
    // Kino escribió las cookies después de que terminó la llamada de arriba; arg.stored lista sus nombres. Ahora kino.config ve la cuenta nueva.
    return { state: { account: await loadAccount() }, toast: "Cuenta vinculada" };
  }
}
```

La advertencia honesta: Google puede negarse a iniciar sesión dentro de una ventana embebida diga lo que diga su user agent, y puede
cambiarlo sin avisar. Deja el ajuste de pegar las cookies como alternativa y envía `userAgent` con tu propio texto si uno más nuevo
funciona mejor (lo puedes publicar en una actualización del plugin, sin esperar un Kino nuevo).

## Probarla { #kit }

El kit de Node no tiene ventana: `node sdk/validate.mjs` revisa la clave del manifest, las opciones y la línea de consentimiento, e
imprime una nota; `kino.visualBrowser.open` responde `unavailable` en `run.mjs` a menos que una prueba tuya le pase a `createKino` una
opción `visualBrowser` (hace de la persona). Prueba la ventana real en un teléfono o un TV, y deja otra forma de entrar (pegar las
cookies en un ajuste `password`). Más en [Probar en local](test-locally.md).
