# Formulario de ajustes (apiVersion 6)

Los [ajustes](manifest.md#settings) de siempre guardan valores que tu código lee con `kino.config`.
Desde `"apiVersion": 6` (Kino 0.9.50) el formulario también puede **mostrar** cosas y **hacer** cosas,
y cada plugin instalado tiene su propia pestaña en Ajustes. Esta página tiene [todos los tipos de
campo](#types), los tres tipos sin valor, las funciones que los llenan y los revisan, y
[un ejemplo completo](#example).

## Su propia pestaña en Ajustes { #own-tab }

Cada plugin instalado y encendido tiene **su propia pestaña en Ajustes** (celular y TV), con el nombre
del plugin y su interruptor de [Modo debug](diagnostics.md#debug); cuando tiene `settings`, la pestaña
también muestra su formulario, y Plugins ▸ Configurar abre el mismo formulario. Por eso, desde Kino 0.9.50,
el error `auth_required` dice "Configura {plugin} en Ajustes ▸ {plugin}" cuando tu plugin declara
ajustes.

## Todos los tipos de campo { #types }

El formulario muestra tus ajustes **en el orden del manifiesto**, cada uno con su `label` y, debajo, su
`hint`. Nueve tipos:

| `type` | Lo que ve la persona | Lo que devuelve `kino.config.get(key)` | Desde |
| --- | --- | --- | --- |
| `text` | un campo de texto (máximo 500 caracteres) | el texto, o `undefined` | apiVersion 1 |
| `password` | un campo de texto oculto (máximo 500), guardado cifrado en el aparato | el texto, o `undefined` | apiVersion 1 |
| `url` | un campo de dirección (máximo 2.048): `http`/`https`; ese servidor pasa a ser un host al que tu plugin puede llegar ([Los servidores de la persona](manifest.md#own-servers)) | la dirección tal como se escribió, o `undefined` | apiVersion 1 |
| `toggle` | un interruptor | `true` / `false` (`false` si no hay `default`) | apiVersion 1 |
| `select` | una elección entre `options` | el `value` escogido (la primera opción si no hay `default`) | apiVersion 1 |
| `list` | una lista que la persona arma con "Agregar", cada entrada un diálogo con los `fields` de la lista | un arreglo de `{ [clave del campo]: texto }`, o `undefined` si está vacía | apiVersion 4 |
| `section` | un título, con `hint` como explicación | nada | apiVersion 6 |
| `status` | una línea de solo lectura que llena tu `settingsStatus()` | nada | apiVersion 6 |
| `action` | un botón que corre tu `action(key)` | nada | apiVersion 6 |

Lo que puede llevar cada entrada:

| Atributo | Tipos | Regla |
| --- | --- | --- |
| `key` | todos | obligatorio, `^[a-z][a-zA-Z0-9_]{0,31}$`, único en la lista |
| `label` | todos | obligatorio, de 1 a 40 caracteres |
| `type` | todos | obligatorio, uno de los nueve de arriba |
| `hint` | todos | opcional, máximo 80 caracteres: el ejemplo o la explicación debajo del campo |
| `required` | `text`, `password`, `url`, `list` | opcional `true`/`false`. Un ajuste obligatorio sin valor detiene toda llamada ("Falta configurar") |
| `default` | `text`, `password`, `toggle`, `select` | opcional. Nunca en `url` ni en `list` ("… no puede tener valor por defecto: usa "hint"") ni en los tres tipos sin valor; tiene que servir para su tipo (el `default` de un `select` es uno de sus `value`) |
| `options` | solo `select` | obligatorio: de 1 a 20 `{ "value", "label" }`, `value` de 1 a 40 caracteres y sin repetir, `label` de 1 a 40 |
| `fields` | solo `list` | obligatorio: de 1 a 4, cada uno `{ key, label, type, hint?, required? }` con `type` `"text"` o `"url"`, sin `default` ("Solo un ajuste de tipo list tiene "fields"") |
| `max` | solo `list` | opcional, número entero de 1 a 50 (20 por defecto): cuántas entradas |
| `confirm` | solo `action`, apiVersion 6 | opcional, de 1 a 120 caracteres: se pregunta antes de correr la acción, con Cancelar enfocado ("Solo un ajuste de tipo action tiene "confirm"") |

Cualquier otra clave de una entrada se ignora. Un manifiesto que incumple una regla se rechaza al
instalar con un mensaje que nombra el ajuste (`El ajuste "quality" necesita opciones`); una `list` por
debajo de apiVersion 4 o un `section`/`status`/`action` por debajo de apiVersion 6 también se rechazan.
Límites: 12 ajustes con valor (`text`, `password`, `url`, `toggle`, `select`, `list`) y, desde
apiVersion 6, 16 sin valor.

**No hay campos condicionales**: todo ajuste se muestra siempre, tenga lo que tenga otro. Usa un
`section` con `hint` para decir qué campos van juntos ("Opcional: sin cuenta ves el catálogo gratis"),
déjalos opcionales, y deja que [`validateSettings`](#validate) rechace una combinación que no tenga
sentido.

**¿`password` o `secrets` sellados?** Un ajuste `password` es la credencial **de la persona**: ella la
escribe, tu código la lee y viaja sellada de punta a punta a sus otros aparatos. Una clave que es
**tuya**, de quien hizo el plugin (una clave fija del reproductor del sitio), va en los
[`secrets`](manifest.md#secrets) sellados del manifiesto, y tu código solo tiene un marcador.

## Tres tipos que no guardan valor { #ui-types }

Desde apiVersion 6 hay tres tipos que no guardan ningún valor (nunca están en `kino.config`, nunca son
`required`, sin `default`), máximo 16 de ellos además de los 12 ajustes con valor:

```json
"settings": [
  { "key": "account", "label": "Tu cuenta", "type": "section", "hint": "Opcional: sin cuenta usas la sesión anónima" },
  { "key": "email", "label": "Correo", "type": "text" },
  { "key": "password", "label": "Contraseña", "type": "password" },
  { "key": "linked", "label": "Estado", "type": "status" },
  { "key": "logout", "label": "Cerrar sesión", "type": "action", "confirm": "¿Cerrar la sesión de esta cuenta?" }
]
```

- **`section`**: un título; `hint` es su explicación.
- **`status`**: una línea de solo lectura. Kino llama tu `settingsStatus()` cuando se abre el formulario
  (10 s) y muestra el texto que devuelves bajo esa clave: `{ linked: "Vinculada como ana@…" }` (máximo
  200 caracteres). Mientras no responde la línea dice "Cargando…"; una clave que falta o un valor que no
  es texto muestran "Sin información"; un tiempo agotado o un error muestran "No se pudo consultar". El
  resto del formulario sigue funcionando en todos los casos. **Export obligatorio** cuando existe un
  ajuste `status`.
- **`action`**: un botón. Kino llama tu `action(key)` (30 s), una acción a la vez (los otros botones y
  Guardar esperan), y muestra el `message` que devuelves (máximo 300 caracteres) o "Listo"; si lanza un
  error o se pasa del tiempo, la persona ve el texto del error. Kino vuelve a pedir
  `settingsStatus()` después de cada acción (y al abrir el formulario), así que las líneas de estado
  describen lo que acaba de hacer; `refresh: true` se sigue aceptando y no cambia nada. `confirm` (de 1 a 120 caracteres) pregunta antes, con Cancelar enfocado. **Export
  obligatorio** cuando existe un ajuste `action`.

## Olvidar ajustes desde una acción (`clearSettings`) { #clear-settings }

Una acción también puede **olvidar ajustes propios** con `clearSettings`: hasta 12 claves de tus ajustes
con valor declarados (`text`, `url`, `password`, `toggle`, `select`, `list`). Cuando la acción responde,
Kino los vacía exactamente como si la persona hubiera vaciado los campos y oprimido Guardar (una
`password` también sale del Keystore), cierra tu sandbox y olvida las cookies y las filas de Inicio
guardadas como con cualquier cambio guardado (`kino.storage` sobrevive), vuelve a cargar el formulario y
vuelve a pedir `settingsStatus()`; tu `message` igual se muestra. Así un botón "Cerrar sesión" evita que
el siguiente token vencido vuelva a iniciar sesión con la cuenta guardada.

```js
export async function action(key) {
  if (key === "logout") {
    await api.logout();                       // avisa primero al servidor: un error aquí conserva la cuenta guardada
    return { message: "Sesión cerrada", clearSettings: ["email", "password"] };
  }
}
```

(Aquí `email` y `password` tienen que ser ajustes opcionales; marca la cuenta `required` solo si el
plugin no puede funcionar sin sesión.)

Límites:

- Solo se toca el plugin de la propia acción, nunca otro.
- Una entrada que no es texto, que no existe, que nombra un `section`/`status`/`action`, que nombra un
  ajuste `required` (vaciarlo haría fallar todas las llamadas siguientes), que se repite o que viene
  después de la duodécima se descarta con una línea en el log (`run.mjs` muestra `[dropped by Kino]`);
  un valor que no es un arreglo se ignora.
- Una acción que lanza un error o se pasa del tiempo no vacía nada.

## Validar antes de guardar (`validateSettings`) { #validate }

`validateSettings(values)` (opcional, 20 s) corre **antes** de que Kino guarde. `values` trae solo los
ajustes con valor: textos sin espacios en los extremos, toggles como booleanos, listas como arreglos de
objetos.

- Devuelve `null` para aceptar.
- `{ password: "La contraseña no es correcta" }` para rechazar con ese texto debajo del campo (máximo
  200 caracteres), o un texto para rechazar con un mensaje general. Una clave que no es uno de tus
  ajustes con valor también rechaza, y su texto se muestra como mensaje general.
- Con un rechazo no se guarda nada y la persona conserva lo que escribió.
- Si lanza un error, se pasa del tiempo o responde algo que Kino no puede leer (un arreglo, un
  número…), tampoco se guarda nada, y el formulario ofrece **"Guardar sin comprobar"**; ese botón solo
  aparece entonces, nunca después de un rechazo con mensajes.

## Reglas comunes { #rules }

- Los textos que devuelves se muestran después de que Kino les quita cualquiera de tus secretos
  guardados.
- Estos tres exports corren aunque un ajuste `required` siga vacío, así una línea de estado puede decir
  qué falta.
- Guardar cualquier ajuste cierra tu sandbox, como siempre; `kino.storage` sobrevive.
- Si declaras `telemetry`, una falla de `settingsStatus`, `action` o `validateSettings` se reporta como
  la de cualquier otra función ([Registro y telemetría](diagnostics.md)).

Pruébalos con el kit (imprime lo que la app conservaría): `node sdk/run.mjs . settingsStatus`,
`node sdk/run.mjs . action logout`, `node sdk/run.mjs . validateSettings '{"email":"ana@x.co"}'` (`--raw`
imprime tu respuesta sin tocar). El kit no aplica el tapado de secretos de la app, y `validateSettings`
recibe exactamente el JSON que escribes: la app solo envía los ajustes con valor, sin espacios en los
extremos. Un ejemplo que funciona es `plugins/sdk/test/settings-demo` en el repositorio de Kino.

## Un ejemplo completo { #example }

Una cuenta opcional, una línea de estado, un botón "Cerrar sesión", una elección de calidad, un
interruptor y una lista de espejos propios de la persona, todo leído como lo declara
[`kino.d.ts`](reference/index.md):

```json
{
  "id": "mi-cuenta", "name": "Mi cuenta", "version": "1.0.0", "apiVersion": 6, "entry": "plugin.js",
  "hosts": ["api.example.com"],
  "capabilities": ["search", "resolve"],
  "settings": [
    { "key": "account", "label": "Tu cuenta", "type": "section", "hint": "Opcional: sin cuenta ves el catálogo gratis" },
    { "key": "email", "label": "Correo", "type": "text", "hint": "ana@correo.com" },
    { "key": "password", "label": "Contraseña", "type": "password" },
    { "key": "linked", "label": "Estado", "type": "status" },
    { "key": "logout", "label": "Cerrar sesión", "type": "action", "confirm": "¿Cerrar la sesión de esta cuenta?" },
    { "key": "playback", "label": "Reproducción", "type": "section" },
    { "key": "quality", "label": "Calidad", "type": "select", "default": "auto",
      "options": [{ "value": "auto", "label": "Automática" }, { "value": "hd", "label": "Alta" }, { "value": "sd", "label": "Ahorro de datos" }] },
    { "key": "spanishSubs", "label": "Solo subtítulos en español", "type": "toggle", "default": true },
    { "key": "mirrors", "label": "Espejos propios", "type": "list", "max": 5,
      "fields": [{ "key": "url", "label": "Dirección", "type": "url", "required": true, "hint": "https://espejo.example.org" },
                 { "key": "name", "label": "Nombre", "type": "text", "hint": "Espejo de la casa" }] }
  ]
}
```

```js
const API = "https://api.example.com";
// Keyed by the account: settings can change under the plugin (another device, clearSettings).
const sessionKey = () => `session:${kino.config.get("email") ?? ""}`;

async function login(email, password) {
  const r = await kino.fetch(`${API}/login`, { method: "POST", body: { json: { email, password } } });
  if (r.status === 401) throw kino.error("auth_required", "login 401");
  if (!r.ok) throw kino.error("unavailable", `login ${r.status}`);
  return r.json().token;
}

async function session() {
  await null;                                    // the first await before anything can throw
  const email = kino.config.get("email");        // undefined: signed out, free catalog
  if (!email) return null;
  const saved = kino.storage.get(sessionKey());
  if (saved) return saved;
  const token = await login(email, kino.config.get("password") ?? "");
  kino.storage.set(sessionKey(), token, { ttlMs: 12 * 60 * 60 * 1000 });
  return token;
}

export async function settingsStatus() {         // one text per "status" key
  const email = kino.config.get("email");
  if (!email) return { linked: "Sin cuenta: ves el catálogo gratis" };
  try {
    await session();
    return { linked: "Cuenta vinculada" };
  } catch (e) {
    return { linked: e.code === "auth_required" ? "El correo o la contraseña no coinciden" : "No se pudo revisar la cuenta ahora" };
  }
}

export async function action(key) {             // one call per "action" button
  if (key !== "logout") return null;
  const token = kino.storage.get(sessionKey());
  if (token) await kino.fetch(`${API}/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  kino.storage.remove(sessionKey());
  return { message: "Sesión cerrada", clearSettings: ["email", "password"] };
}

export async function validateSettings(values) { // before saving: null accepts
  await null;
  if (values.email && !values.password) return { password: "Escribe la contraseña de esa cuenta" };
  if (values.password && !values.email) return { email: "Escribe el correo de la cuenta" };
  if (values.email) {
    try {
      await login(values.email, values.password);
    } catch (e) {
      if (e.code === "auth_required") return { password: "El correo o la contraseña no coinciden" };
      throw e;                                    // the person may "Guardar sin comprobar"
    }
  }
  return null;
}

export async function search(query) {
  const token = await session();
  const r = await kino.fetch(`${API}/search?q=${encodeURIComponent(query.q)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw kino.error("unavailable", `search ${r.status}`);
  return r.json().results.map((x) => ({ id: String(x.id), ref: String(x.id), title: x.title, kind: "movie" }));
}

export async function resolve(ref) {
  const token = await session();
  const quality = kino.config.get("quality");    // "auto", "hd" or "sd": a select always has a value
  const r = await kino.fetch(`${API}/play/${encodeURIComponent(ref)}?q=${quality}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw kino.error("not_found", `play ${r.status}`);
  const s = r.json();                            // { url, path, subtitles: [{ lang, url }] }
  const mirrors = kino.config.get("mirrors") ?? []; // [{ url, name? }]: each url is a server the person typed
  return {
    url: s.url,
    label: "Principal",
    subtitles: kino.config.get("spanishSubs") ? s.subtitles.filter((t) => t.lang === "es") : s.subtitles,
    alternatives: mirrors.slice(0, 8).map((m) => ({ url: m.url.replace(/\/+$/, "") + s.path, label: m.name || "Espejo" })),
  };
}
```

Lo que recibe la persona: una pestaña "Mi cuenta" en Ajustes con dos títulos; "Estado" dice "Sin cuenta:
ves el catálogo gratis" hasta que escriba una cuenta; Guardar revisa la cuenta antes de guardarla;
"Cerrar sesión" pregunta primero y después vacía el correo y la contraseña en todos sus aparatos; cada
espejo aparece como una copia más en el menú Servidor del reproductor.

## En los otros aparatos de la persona { #other-devices }

Cuando la persona empareja dos de sus aparatos (celular y TV), Kino mantiene sus plugins al día entre
ellos. Lo que pasa y lo que no:

- **Pasa:** la instalación, las actualizaciones, encendido/apagado, la desinstalación y las
  aprobaciones de hosts. Cada aparato descarga tu código él mismo; solo viajan la dirección y la
  aprobación. El otro aparato instala **en silencio** cuando lo que descargó no pide nada más de lo que
  la persona aprobó en el primero; si ahora pides más (un host, permiso o capacidad nueva), espera en
  "Plugins de tus otros aparatos" con la hoja de consentimiento normal.
- **Pasa:** los valores de los ajustes `text`, `select`, `toggle`, `url` y `list` (una `list` que tiene
  un campo `password` no viaja), y los ajustes `password`, sellados de punta a punta con la llave que los
  aparatos acordaron al emparejarse, nunca legibles en el camino.
- **Pasa:** los vaciados. Un campo que la persona vacía, o el `clearSettings` de una acción, también se
  vacía en sus otros aparatos (contraseñas incluidas). Un ajuste `required` nunca se vacía a distancia.
  Un aparato con una versión de Kino más vieja ignora los vaciados y conserva su valor.
- **Nunca pasa:** `kino.storage`, las cookies, las filas de Inicio guardadas.

Un valor que llega así se aplica **sin** tu `validateSettings` y, como cualquier cambio guardado, cierra
tu sandbox. Así que escribe el plugin como si un ajuste pudiera cambiar en cualquier momento: ponle a
cualquier sesión que guardes en `kino.storage` como clave la cuenta a la que pertenece, y nunca pongas
una identidad del aparato en un ajuste, porque se copiaría al otro aparato.

```js
const sessionKey = `session:${kino.config.get("email") ?? ""}`;   // no solo "session"
```

Un plugin [firmado](signed.md) instalado desde dos repositorios distintos en dos aparatos cuenta como el
mismo plugin cuando tiene el mismo `id` y la misma llave de autor: mira
[El mismo plugin en dos direcciones](signed.md#two-addresses).
