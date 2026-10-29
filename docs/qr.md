# Códigos QR: mostrar uno y escanear uno (`qr` y `qrScan`, apiVersion 13) { #qr }

!!! note "apiVersion 13 está en desarrollo"
    Nada de esta página está todavía en un Kino publicado. apiVersion 13 llega en Kino 0.9.74, la próxima versión, junto
    con apiVersion 12; todavía no está publicada. Todo Kino anterior a 0.9.74 rechaza un manifiesto con `"apiVersion": 13`
    ("Este plugin necesita una versión más nueva de Kino"). El contrato y el kit ya lo conocen, así que puedes escribir y
    probar un plugin desde ya y publicarlo cuando salga Kino 0.9.74.

Algunos inicios de sesión son más fáciles con una cámara que con un teclado, sobre todo en una TV: el aparato nuevo
muestra un código QR, y un teléfono que ya tiene la cuenta lo escanea y dice "sí, deja entrar a este aparato". Kino te da
las dos mitades, y ninguna sabe nada de tu servicio:

- **Mostrar un QR:** el [ajuste `qr`](#qr-setting) del formulario de ajustes dibuja uno con un texto que devuelve tu
  `settingsStatus()`, y lo vuelve a pedir cada `refreshMs`, así que un código que vence se reemplaza en su lugar. No
  necesita ninguna capacidad.
- **Escanear un QR:** `kino.qr.scan()` abre el lector de cámara propio de Kino en pantalla completa en el teléfono y te da
  el texto leído. Necesita la capacidad `qrScan`.

## Cómo se declara `qrScan` { #declare }

`qrScan` necesita `"apiVersion": 13` y es declarativa: nada que exportar, sin línea de consentimiento, sin aprobación al
instalar (el lector solo se abre mientras la persona usa tu plugin, nombra tu plugin, y no se lee nada hasta que apunta
la cámara a un código). Por debajo de 13 el manifiesto se rechaza con "The \"qrScan\" capability needs apiVersion 13".
Sin la capacidad no hay `kino.qr` (`typeof kino.qr === "undefined"`), y `sign()` nunca lo tiene.

```json
"capabilities": ["search", "resolve", "qrScan"]
```

## La llamada { #call }

`await kino.qr.scan({ title?, titleEn? })` resuelve con el texto leído, o con `null` cuando la persona cerró el lector
(el botón de cerrar, Atrás, o salir de la pantalla). `title` es tu línea debajo del nombre de tu plugin (`titleEn` se
muestra en su lugar cuando Kino está en inglés); cada uno es opcional, de máximo 80 caracteres, se muestra en máximo dos
líneas, y no puede llevar caracteres de control, bidi ni de formato (ni saltos de línea, ni marcas de derecha a
izquierda, ni caracteres invisibles), para que nunca pase por una línea propia de Kino. Cualquier otra cosa que mandes se
descarta.

## Lo que ve la persona { #what-people-see }

La imagen de la cámara con un marco para apuntar y, arriba: "<nombre de tu plugin> quiere leer un código QR", con el
nombre del plugin tal como está instalado (nunca un texto que tú mandes), después tu `title`, después la instrucción
propia de Kino ("Apunta la cámara al código QR") y un botón de cerrar. El primer código que la cámara lee y que tiene de 1
a 4.096 caracteres responde tu llamada y cierra el lector; un código más largo se ignora, el lector dice "Este código no
es válido para <tu plugin>" y sigue buscando. Sin el permiso de la cámara Kino lo pide; si la persona lo niega, Kino
explica por qué necesita la cámara, con Reintentar y Cancelar.

## Dónde funciona { #where }

Solo en un teléfono o una tableta con cámara, en la interfaz de teléfono de Kino: en una TV (y en cualquier aparato sin
cámara) el lector nunca se abre y la llamada falla con `unavailable`. Un escaneo solo corre desde un ajuste `action`,
desde un `panelAction` o desde un `screenEvent` que sigue a la presión de la persona, es decir, cuando la persona presionó uno de tus botones: cualquier otra llamada falla con
`not_allowed` ("kino.qr.scan only runs from a settings action, panelAction or screenEvent the person pressed"), aunque la haya empezado la persona
(Inicio, una búsqueda, una reproducción, una lista, la página de un título, tu sección, `settingsStatus`), así que la
cámara nunca se abre sola mientras alguien navega. En una [pantalla del plugin](screens.md) (apiVersion 14, Kino 0.9.74: una pantalla raíz, un panel en modo pantalla, una pestaña que aportas en modo pantalla) solo cuenta el evento del toque o del envío de la propia persona; el evento de apertura, un tic de temporizador (`every`), un «cargar más», un cambio, el `refreshMs` de un panel y un `playerEvent` nunca abren el lector. El nodo `settings` dentro de una pantalla corre su `action` exactamente como Ajustes. Mientras el lector está abierto, el límite de tiempo de esa llamada se
detiene (los 30 s de un `action` no se acaban mientras la persona busca el otro aparato); el lector mismo se cierra a
los 120 s con `timeout`. Un lector en pantalla a la vez, para toda la app: un segundo escaneo mientras hay uno abierto,
tuyo o de otro plugin, falla de inmediato con `busy`. Kino revisa, en este orden: la petición (`invalid_request`), el
aparato (`unavailable`), de dónde viene la llamada (`not_allowed`) y el escaneo abierto (`busy`).

| `code` del error | Cuándo | Qué hacer |
| --- | --- | --- |
| `busy` | Ya hay un escaneo abierto (tuyo o de otro plugin). | Espéralo; no lo repitas en un ciclo. |
| `timeout` | No se leyó nada en 120 s. | Dilo, y deja que la persona lo intente otra vez. |
| `unavailable` | Este aparato no puede escanear: sin cámara, o la interfaz de TV de Kino. | Muestra el código de otra forma: un ajuste `qr`, o un código para escribir. |
| `not_allowed` | La llamada no es un ajuste `action`, un `panelAction` ni un `screenEvent` tras un toque o un envío de la persona (Inicio, búsqueda, una reproducción, `settingsStatus`, el evento de apertura de una pantalla, un tic de temporizador o un «cargar más»…). | Escanea desde un botón: un ajuste `action`, un botón del panel o un botón de la pantalla. |
| `permission_denied` | La persona no le dio la cámara a Kino. | Dile que puede permitirla en los ajustes del teléfono. |
| `invalid_request` | `title` o `titleEn` no es un texto, pasa de 80 caracteres o lleva un carácter de control o de formato, o el argumento no es un objeto. | Corrige la llamada. |

## Privacidad { #privacy }

Recibes solo el texto del código al que la persona apuntó la cámara, nunca una imagen ni nada más de lo que vio la
cámara. Ese texto viene del mundo: revísalo (su prefijo, su largo, su forma) antes de actuar con él. Solo tu plugin lo
recibe, y solo del escaneo que abrió tu llamada.

## Receta: iniciar sesión en un aparato nuevo con el teléfono { #recipe }

El aparato nuevo (por ejemplo, la TV) muestra un código de inicio de sesión en sus ajustes; el teléfono donde la persona
ya inició sesión lo escanea desde una acción. El servicio aquí es un `api.example.com` inventado con tres llamadas: crear
un token de inicio de sesión, preguntar si ya lo aceptaron, aceptarlo con una sesión. Los dos aparatos corren el mismo
plugin:

```js
// kino-plugin.json (the parts that matter): {"apiVersion": 13, "hosts": ["api.example.com"], "capabilities": ["search", "resolve", "qrScan"], "settings": [{"key": "state", "label": "Cuenta", "labelEn": "Account", "type": "status"}, {"key": "login", "label": "Escanéalo desde tu teléfono", "labelEn": "Scan it from your phone", "type": "qr", "refreshMs": 5000}, {"key": "link", "label": "Vincular otro aparato", "labelEn": "Link another device", "type": "action"}]}
const API = "https://api.example.com";
const PREFIX = "exampleapp://login?token=";

async function api(path, body) {
  const r = await kino.fetch(API + path, body === undefined ? {} : { method: "POST", body: { json: body } });
  if (!r.ok) throw kino.error("unavailable", path + " answered " + r.status);
  return r.json();
}

// The NEW device, not signed in: show a fresh login code, and keep the session once a phone accepted it.
// Kino calls this when the form opens, after every action and every refreshMs (5 s) while the form is on screen.
export async function settingsStatus() {
  if (kino.storage.get("session")) return { state: "Vinculado" }; // no "login" key: no QR is drawn
  let pending = JSON.parse(kino.storage.get("pending") || "null");
  if (pending) {
    const s = await api("/login/status?token=" + encodeURIComponent(pending.token));
    if (s.session) {
      kino.storage.set("session", s.session);
      kino.storage.remove("pending");
      return { state: "Vinculado" };
    }
  }
  if (!pending || pending.expires - Date.now() < 10000) {
    pending = await api("/login/token", {}); // { token, expires }: a new code before the old one runs out
    kino.storage.set("pending", JSON.stringify(pending));
  }
  return { state: "Esperando que lo escanees", login: PREFIX + pending.token };
}

// The phone, signed in: scan the new device's code and accept it with this phone's session.
export async function action(key) {
  if (key !== "link") return null;
  const session = kino.storage.get("session");
  if (!session) return { message: "Primero inicia sesión en este aparato" };
  let text;
  try {
    text = await kino.qr.scan({ title: "Escanea el código del otro aparato", titleEn: "Scan the other device's code" });
  } catch (e) {
    if (e.code === "unavailable") return { message: "Este aparato no puede escanear: hazlo desde tu teléfono" };
    if (e.code === "permission_denied") return { message: "Permite la cámara a Kino en los ajustes del teléfono" };
    if (e.code === "timeout") return { message: "No se leyó ningún código: inténtalo otra vez" };
    throw e;
  }
  if (text === null) return { message: "Cancelado" };
  if (!text.startsWith(PREFIX)) return { message: "Ese código no es de inicio de sesión" };
  await api("/login/accept", { token: text.slice(PREFIX.length), session });
  return { message: "Listo: el otro aparato ya entró" };
}

export async function search() { return []; }
export async function resolve() { throw kino.error("not_found", "this example plays nothing"); }
```

Lo que pasa: en la TV el formulario muestra "Esperando que lo escanees" y el QR; cada 5 s Kino vuelve a preguntar
`settingsStatus()`, que cambia el código por uno nuevo antes de que venza el viejo y se da cuenta cuando el teléfono lo
aceptó. En el teléfono la persona presiona "Vincular otro aparato", el lector se abre con el nombre del plugin, apunta a
la TV y la acción acepta el token. En el siguiente refresco de la TV la línea pasa a "Vinculado" y el QR desaparece.
Presionar el botón en la misma TV responde "Este aparato no puede escanear" (`unavailable`): el mismo plugin, sin caso
especial.

## Las reglas del ajuste `qr` { #qr-setting }

El tipo `qr` del [formulario de ajustes](settings-form.md#qr), completo: su texto es lo que `settingsStatus()` devuelve
bajo su llave, de 1 a 512 caracteres, sin caracteres de control; una dirección `http`/`https` tiene que ser https en un
host público; cualquier otro texto, como un enlace de app del tipo `exampleapp://login?token=…`, se dibuja tal cual; un
texto que sería más largo, o que lleva uno de tus secretos sellados, no dibuja QR. `"refreshMs"` va de 2000 a 60000 ms;
sin él el texto solo se pide cuando se abre el formulario y después de una acción. Un refresco nunca cancela un
`settingsStatus()` que siga corriendo (eso reiniciaría tu plugin y cerraría sus sockets): el periódico se salta, y el de
después de una acción lo espera y pregunta una vez más. El QR en pantalla se queda hasta que el texto nuevo lo reemplaza.

## En el kit { #kit }

Node no tiene cámara: `createKino(manifest, { qrScan })` recibe una imitación, `async ({ title, titleEn, invalid }) =>`
el texto "leído", o `null` para una cancelación; puede lanzar `kino.error("permission_denied")` y parecidos. Sin ella, y
con `device: "tv"`, `kino.qr.scan` falla con `unavailable`, como en una TV. El kit aplica las mismas revisiones, en el
mismo orden y con los mismos errores de la app: `not_allowed` salvo que la llamada sea el `action`, el `panelAction` o el `screenEvent` de
tu plugin (el kit sabe qué export está corriendo cuando se llama por `run.mjs` o `loadPlugin`), `busy` para un segundo
escaneo mientras hay uno abierto, `invalid_request` para un título malo. Un código de más de 4.096 caracteres se ignora
como en el teléfono: el kit le pregunta otra vez a tu imitación con `invalid: true` (el lector sigue buscando), y responde
`timeout` después de 10 códigos ignorados.
