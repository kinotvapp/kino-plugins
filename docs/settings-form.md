# Formulario de ajustes (apiVersion 6)

Los [ajustes](manifest.md#settings) de siempre guardan valores que tu código lee con `kino.config`.
Desde `"apiVersion": 6` (Kino 0.9.50) el formulario también puede **mostrar** cosas y **hacer** cosas,
y cada plugin con ajustes tiene su propia pestaña en Ajustes.

## Su propia pestaña en Ajustes { #own-tab }

Cada plugin instalado, encendido y con `settings` tiene **su propia pestaña en Ajustes** (celular y
TV), con el nombre del plugin; Plugins ▸ Configurar abre el mismo formulario. Por eso, desde Kino 0.9.50,
el error `auth_required` dice "Configura {plugin} en Ajustes ▸ {plugin}" cuando tu plugin declara
ajustes.

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
