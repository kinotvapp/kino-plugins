# Formulario de ajustes (apiVersion 6)

Los [ajustes](manifest.md#settings) de siempre guardan valores que tu código lee con `kino.config`.
Desde `"apiVersion": 6` (Kino 0.9.50) el formulario también puede **mostrar** cosas y **hacer** cosas,
y cada plugin instalado tiene su propia pestaña en Ajustes. Esta página tiene [todos los tipos de
campo](#types), los tres tipos sin valor, las [dos ayudas para configurar](#aids) de apiVersion 12,
las funciones que los llenan y los revisan, y [un ejemplo completo](#example).

## Su propia pestaña en Ajustes { #own-tab }

Cada plugin instalado y encendido tiene **su propia pestaña en Ajustes** (celular y TV), con el nombre
del plugin y su interruptor de [Modo debug](diagnostics.md#debug); cuando tiene `settings`, la pestaña
también muestra su formulario, y Plugins ▸ Configurar abre el mismo formulario. Por eso, desde Kino 0.9.50,
el error `auth_required` dice "Configura {plugin} en Ajustes ▸ {plugin}" cuando tu plugin declara
ajustes.

## Todos los tipos de campo { #types }

El formulario muestra tus ajustes **en el orden del manifiesto**, cada uno con su `label` y, debajo, su
`hint`. Once tipos, y un duodécimo, `qr`, desde apiVersion 13 (en desarrollo):

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
| `link` | un botón que abre una dirección `https` por el sistema, solo cuando la persona lo toca ([Ayudas para configurar](#aids)) | nada | apiVersion 12 |
| `help` | un botón ("Ayuda") que abre tus instrucciones en una ventana ([Ayudas para configurar](#aids)) | nada | apiVersion 12 |
| `qr` | un código QR dibujado en el aparato con un texto que devuelve tu `settingsStatus()` ([Un código QR](#qr)) | nada | apiVersion 13 (en desarrollo) |

Lo que puede llevar cada entrada:

| Atributo | Tipos | Regla |
| --- | --- | --- |
| `key` | todos | obligatorio, `^[a-z][a-zA-Z0-9_]{0,31}$`, único en la lista |
| `label` | todos | obligatorio, de 1 a 40 caracteres (en un `help` es opcional: sin él, el botón dice "Ayuda") |
| `type` | todos | obligatorio, uno de los once de arriba |
| `hint` | todos | opcional, máximo 80 caracteres: el ejemplo o la explicación debajo del campo. En una `section`, hasta 300 y se parte en varias líneas (Kino 0.9.51; antes de 0.9.51 se rechaza una de más de 80) |
| `required` | `text`, `password`, `url`, `list` | opcional `true`/`false`. Un ajuste obligatorio sin valor detiene toda llamada ("Falta configurar") |
| `default` | `text`, `password`, `toggle`, `select` | opcional. Nunca en `url` ni en `list` ("… no puede tener valor por defecto: usa "hint"") ni en los tipos sin valor; tiene que servir para su tipo (el `default` de un `select` es uno de sus `value`) |
| `options` | solo `select` | obligatorio: de 1 a 20 `{ "value", "label" }`, `value` de 1 a 40 caracteres y sin repetir, `label` de 1 a 40 |
| `fields` | solo `list` | obligatorio: de 1 a 4, cada uno `{ key, label, type, hint?, required? }` con `type` `"text"` o `"url"`, sin `default` ("Solo un ajuste de tipo list tiene "fields"") |
| `max` | solo `list` | opcional, número entero de 1 a 50 (20 por defecto): cuántas entradas |
| `confirm` | solo `action`, apiVersion 6 | opcional, de 1 a 120 caracteres: se pregunta antes de correr la acción, con Cancelar enfocado ("Solo un ajuste de tipo action tiene "confirm"") |
| `url` | solo `link`, apiVersion 12 | obligatorio: `https://`, sin usuario ni contraseña, máximo 2.048 caracteres |
| `title`, `titleEn`, `body`, `bodyEn` | solo `help`, apiVersion 12 | el título (máximo 60) y el texto (máximo 2.000) de la ventana; `body` o `bodyEn` es obligatorio |
| `labelEn`, `hintEn`, `confirmEn` | los de `label`, `hint`, `confirm` | opcionales, apiVersion 9 (Kino 0.9.55): el mismo texto en inglés, con los mismos límites ([Textos en inglés](#english)) |
| `devices` | todos | opcional, apiVersion 12: `["phone"]`, `["tv"]` o los dos, los aparatos que lo dibujan ([un tipo de aparato](#devices)) |
| `linkOnly` | `action` | opcional `true`/`false`, apiVersion 12: nunca se dibuja, solo corre como `confirm` de un `link` ([linkOnly](#link-only)) |
| `sync` | `password` | opcional `true`/`false`, apiVersion 13 (en desarrollo): `false` deja el valor en este aparato ([sync: false](#sync-false)) |

Cualquier otra clave de una entrada se ignora. Un manifiesto que incumple una regla se rechaza al
instalar con un mensaje que nombra el ajuste (`El ajuste "quality" necesita opciones`); una `list` por
debajo de apiVersion 4, un `section`/`status`/`action` por debajo de apiVersion 6 o un `link`/`help` por
debajo de apiVersion 12 también se rechazan. Límites: 12 ajustes con valor (`text`, `password`, `url`,
`toggle`, `select`, `list`) y, desde apiVersion 6, 16 sin valor (entre ellos, desde apiVersion 12, hasta
4 `link` y 4 `help`).

**No hay campos condicionales**: todo ajuste se muestra siempre, tenga lo que tenga otro. Usa un
`section` con `hint` para decir qué campos van juntos ("Opcional: sin cuenta ves el catálogo gratis"),
déjalos opcionales, y deja que [`validateSettings`](#validate) rechace una combinación que no tenga
sentido.

**¿`password` o `secrets` sellados?** Un ajuste `password` es la credencial **de la persona**: ella la
escribe, tu código la lee y viaja sellada de punta a punta a sus otros aparatos. Una clave que es
**tuya**, de quien hizo el plugin (una clave fija del reproductor del sitio), va en los
[`secrets`](manifest.md#secrets) sellados del manifiesto, y tu código solo tiene un marcador.

## Textos en inglés (apiVersion 9, Kino 0.9.55) { #english }

Kino habla español o inglés desde 0.9.54 (Ajustes ▸ App ▸ Idioma). Desde Kino 0.9.55, con `"apiVersion": 9`, cada
texto de tu formulario puede llevar al lado su versión en inglés, con la misma clave y `En` al final:

| Dónde | Claves en inglés | Límite |
| --- | --- | --- |
| cualquier ajuste | `labelEn`, `hintEn` | los de `label` (1 a 40) y `hint` (80; 300 en una `section`) |
| un `action` con `confirm` | `confirmEn` | de 1 a 120, y solo junto a `confirm` |
| una opción de un `select` | `labelEn` | de 1 a 40 |
| un campo de una `list` | `labelEn`, `hintEn` | 1 a 40 y 80 |
| `section` del manifiesto | `labelEn` | de 1 a 20 ([El manifiesto](manifest.md)) |

```json
{ "key": "quality", "label": "Calidad", "labelEn": "Quality", "type": "select",
  "hint": "La más alta gasta más datos", "hintEn": "The highest uses more data",
  "options": [{ "value": "hd", "label": "Alta", "labelEn": "High" }, { "value": "sd", "label": "Normal" }] }
```

- **El texto de siempre es el español y el de respaldo**: con la app en inglés, Kino muestra cada versión en inglés que
  exista y, donde falte una, el texto de siempre (arriba, la opción «Normal» se ve igual en los dos idiomas). Con la app
  en español nada cambia.
- **Tu código no se entera**: las claves, los tipos, los valores y los `default` son los mismos en los dos idiomas, y
  `kino.config` devuelve lo mismo. Si quieres saber el idioma, lee [`kino.lang`](kino-api.md#lang).
- **Desde apiVersion 9**: por debajo de 9 estas claves son desconocidas y se ignoran sin revisarlas, como en un Kino
  anterior (que tampoco acepta `"apiVersion": 9`).
- **Las mismas reglas que el texto de siempre**: uno vacío, de más del límite o que no sea texto rechaza el manifiesto
  al instalar ("\"labelEn\" del ajuste \"quality\" debe ser un texto de 1 a 40 caracteres"; en una opción, "Una
  opción del ajuste \"quality\" no es válida"); `null` es como no ponerlo. `confirmEn` solo va en un `action` ("Solo un
  ajuste de tipo action tiene \"confirmEn\"") y con `confirm` al lado ("…necesita también \"confirm\"").
- Kino solo habla español e inglés: cualquier otra clave de idioma (`labelPt`, `labelFr`) es una clave desconocida y se
  ignora.

`node sdk/validate.mjs` revisa los mismos límites y, cuando tu plugin usa alguna versión en inglés, te dice cuántos
textos la tienen y cuáles no.

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

## Un código QR: `qr` (apiVersion 13, en desarrollo) { #qr }

Un cuarto tipo sin valor, que cuenta entre los 16: un código QR dibujado en el formulario, en el aparato (nada sale a la
red para dibujarlo). Es la forma de que una TV muestre un código de inicio de sesión para que lo escanee un teléfono.

```json
{ "key": "login", "label": "Escanéalo desde tu teléfono", "labelEn": "Scan it from your phone", "type": "qr", "refreshMs": 5000 }
```

- **Su texto** es lo que tu `settingsStatus()` devuelve bajo esa llave, como una línea `status`, pero entero: de 1 a 512
  caracteres sin caracteres de control; una dirección `http`/`https` solo si es https en un host público (nunca la red de
  la casa); cualquier otro texto (un enlace de app como `exampleapp://login?token=…`, un código para vincular) se dibuja
  tal cual. Un texto más largo, algo que no es texto, o uno que lleva uno de tus secretos sellados no dibuja QR (la línea
  dice "Sin información").
- **`refreshMs`** (de 2000 a 60000; solo un ajuste `qr` lo tiene): Kino pregunta `settingsStatus()` cuando se abre el
  formulario, después de cada acción y cada esa cantidad de ms mientras el formulario está en pantalla y la app al frente.
  Un refresco nunca empieza mientras la llamada anterior siga corriendo, y el QR en pantalla se queda hasta que el texto
  nuevo lo reemplaza. Así un código que vence cada 30 s sigue sirviendo, y una línea de estado al lado pasa a "Listo"
  cuando ya se usó el código.
- **Export obligatorio:** `settingsStatus`. Mostrar un QR no necesita capacidad; escanear uno (`kino.qr.scan`) necesita
  `qrScan`. La receta completa entre dos aparatos: [Códigos QR](qr.md#recipe).

## Ayudas para configurar: `link` y `help` (apiVersion 12, Kino 0.9.74) { #aids }

Dos tipos de ajuste le ayudan a la persona a configurar tu plugin. Ninguno guarda valor (nunca están en
`kino.config`, nunca son `required`, sin `default`), y los dos cuentan entre los 16 ajustes sin valor.

```json
"settings": [
  { "key": "steps", "type": "help", "title": "Qué necesitas", "titleEn": "What you need",
    "body": "1. Crea un bot con @BotFather y copia su token.\n2. Pégalo aquí y toca Guardar.",
    "bodyEn": "1. Create a bot with @BotFather and copy its token.\n2. Paste it here and tap Save." },
  { "key": "botfather", "type": "link", "label": "Abrir @BotFather", "labelEn": "Open @BotFather", "url": "https://t.me/BotFather" },
  { "key": "botToken", "label": "Token del bot", "type": "password" }
]
```

- **`link`**: un botón que abre `url` por el sistema **solo cuando la persona lo toca** (en un celular,
  `https://t.me/...` abre la app de Telegram si está instalada). Kino muestra su propio "Abrir enlace" y
  el host debajo del botón, no le hace ninguna petición a ese host y no lo cuenta como un acceso a la red
  de tu plugin. En un TV (casi nunca tiene navegador) el toque muestra la dirección como texto y como un
  QR para abrirla en el celular. `url` tiene que ser `https://`, sin usuario ni contraseña, de máximo
  2.048 caracteres; `label` es obligatorio. Una dirección que lleva uno de tus secretos guardados no se
  muestra. Kino abre la forma canónica de la dirección (el host en minúsculas), la misma que nombra. No
  hay otra forma de que un plugin le pida a Kino abrir una dirección.
- **`help`**: un botón pequeño ("Ayuda" / "Help", o tu propio `label`) que abre una ventana con tus
  instrucciones, titulada con el nombre de tu plugin. Solo texto plano: se conservan los saltos de línea,
  las marcas se muestran tal cual y nada es tocable (para una dirección usa un `link`). `title` de máximo
  60 caracteres, `body` de máximo 2.000 (`body` o `bodyEn` es obligatorio); si falta el texto en español o
  en inglés se muestra el otro; a todo se le quitan tus secretos. En un TV se desplaza con el control, el
  foco empieza en Cerrar y Atrás la cierra.

La etiqueta de un `link` y la etiqueta, el título y el texto de un `help` no pueden llevar caracteres de
control (el texto conserva sus saltos de línea), formato invisible ni cambios de dirección del texto; si
no, se rechaza el manifiesto. Máximo 4 `link` y 4 `help` por plugin. Un Kino anterior rechaza
apiVersion 12, así que un plugin que los usa declara `"apiVersion": 12`.

**Que la ayuda sea corta y práctica**: qué datos necesita el plugin y dónde se consiguen, en pocas
líneas. Si el plugin habla con un servidor propio de la persona, la ayuda no le enseña a armarlo: pon un
`link` a la guía completa (el límite técnico de 2.000 caracteres no es una meta).

## Ajustes para un tipo de aparato (`devices`, apiVersion 12, Kino 0.9.74) { #devices }

Cualquier elemento de los ajustes (un campo, una sección, un estado, una acción, un `link` o un `help`)
puede decir en qué aparatos se dibuja: `"devices": ["phone"]`, `["tv"]` o los dos; sin él se muestra en
todos.

```json
{ "key": "botToken", "label": "Token del bot", "labelEn": "Bot token", "type": "password", "devices": ["phone"] }
```

Solo cambia lo que se dibuja. En un aparato que deja fuera, el formulario no dibuja ni revisa ese
elemento (un campo `required` oculto nunca bloquea Guardar ahí), pero su valor sigue guardado, se guarda
igual al guardar, se sincroniza con los otros aparatos de la persona, viaja con `sync.provision` y tu
código lo lee con `kino.config`. Úsalo para la preparación que un TV no hace bien, como un token que se
pega en el celular: Sync-Gram y Sync Servidor dibujan su preparación solo en el celular, y el TV recibe los
valores con "Recibir desde otro aparato". Un aparato desconocido, una lista vacía o uno repetido rechazan
el manifiesto (`"devices" of the setting "<key>" must be a list of different devices: "phone", "tv"`);
por debajo de apiVersion 12 la clave se ignora. El kit de Node no dibuja un formulario: `validate.mjs`
solo revisa el campo.

## Acciones que solo corre un `link` (`linkOnly`, apiVersion 12, Kino 0.9.74) { #link-only }

Una `action` puede decir `"linkOnly": true`: nunca se dibuja en ningún aparato y solo corre como el
`confirm` del [`link`](#link) de otra acción, después de la pregunta de Kino. Así un par "buscar, luego
confirmar" le muestra a la persona un solo botón (*Verificar mensaje en el chat* de Sync-Gram); sin él, la
acción de confirmar es un segundo botón. `linkOnly` en algo que no es una acción, o que no es `true` o
`false`, rechaza el manifiesto.

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

## Llenar ajustes propios desde una acción (`setSettings`, Kino 0.9.74) { #set-settings }

Una acción también puede **llenar ajustes propios** con `setSettings`: hasta 8 claves de tus ajustes
`text` o `select`, cada una con un texto. Así una acción "Vincular" guarda el chat que encontró y la
persona no escribe nada. Kino quita los espacios de los extremos de cada valor, lo revisa como uno
escrito (largo, una de las opciones) y guarda los valores por el mismo Guardar del formulario: llegan a
los otros aparatos de la persona y quedan en el perfil en uso como los escritos a mano, y tu sandbox se
cierra como con cualquier cambio guardado. Es aditivo (sin `apiVersion` nueva): un Kino anterior lo
ignora.

```js
return { message: "Vinculado", setSettings: { chatId: String(chat.id) } };
```

- **Nunca** un `url` (su valor se vuelve un servidor al que tu plugin puede llegar, así que solo la
  persona lo escribe), **nunca** un `password` (un secreto lo escribe la persona), un `toggle`, una
  `list` ni un ajuste sin valor; un ajuste `required` nunca se vacía así.
- Kino **no** corre tu `validateSettings` con estos valores (tú los escogiste), y rechaza un valor que
  contiene uno de tus secretos guardados en vez de copiarlo a un ajuste simple que se sincroniza.
- Una clave desconocida o secreta, un valor que no es texto o que no pasa su revisión, una clave que
  también está en `clearSettings`, un valor que contiene uno de tus secretos o más de 8 claves rechazan
  **todo** el campo: no se aplica nada, tu `message` se muestra igual y Kino agrega debajo su error
  genérico.
- Funciona desde tu formulario de ajustes (cualquier acción, también la acción `confirm` de un
  [vínculo](#link)).

## Vincular: "¿Eres tú?" (`action.link`, Kino 0.9.74) { #link }

Úsalo cuando una acción encuentra **a quién** vincular y la persona tiene que decir que es ella: por
ejemplo un [proveedor de sincronización](sync-providers.md) cuyo bot lee el último mensaje ("escríbele
algo a tu bot") y encuentra a `@ana`. Tu plugin nunca vincula por su cuenta: responde un candidato, y
Kino pregunta.

```js
export async function action(key) {
  if (key === "findMe") {
    const who = await bot.latestSender();          // null mientras nadie haya escrito
    if (!who) return { message: "Escríbele algo a tu bot y vuelve a tocar Buscar" };
    kino.storage.set("pending", who.id);
    return { link: { candidate: "@" + who.username, confirm: "linkMe" } };
  }
  if (key === "linkMe") {                           // solo corre después de que la persona confirma
    const chat = kino.storage.get("pending");
    return { message: "Vinculado", setSettings: { chatId: String(chat) } };
  }
}
```

- Kino muestra **su propia** pregunta, "¿Eres tú, @ana?" / "Is this you, @ana?", y nombra ahí a tu
  plugin por el `name` de tu manifiesto. Tiene "Sí, soy yo" y Cancelar (Cancelar enfocado). No puedes
  cambiar sus palabras.
- **Cancelar no corre nada**: tu plugin no se llama ni se entera. Solo **"Sí, soy yo"** corre la acción
  `confirm`, una sola vez, como si se oprimiera ese botón (los mismos ajustes, los mismos 30 s). Si no
  puede empezar en ese momento (otra acción o un guardado está corriendo, o los cambios sin guardar de la
  persona no se pueden guardar), la pregunta sigue abierta y lo dice.
- `candidate`: un texto de 1 a 64 caracteres sin los espacios de los extremos, con los espacios seguidos
  juntados en uno. No puede llevar caracteres de control ni de formato invisible, ningún espacio que no
  sea el normal, ni los rellenos que no dibujan nada (U+115F, U+1160, U+3164, U+FFA0, U+2800). Pasa por el
  mismo tapado de secretos que tus líneas de estado y se muestra como texto plano.
- `confirm`: la `key` de **otro** ajuste `action` de tu plugin (no el que está respondiendo) que **no
  tenga su propia pregunta `confirm`**: una acción que pregunta "¿Borrar todo?" nunca puede presentarse
  como "¿Eres tú?".
- Cualquier otra cosa rechaza el vínculo: tu `message` se muestra igual, con el error genérico de Kino
  ("No se pudo completar. Inténtalo de nuevo.") debajo.
- Un `message` en la misma respuesta también se muestra. Un `link` en la respuesta de la propia acción
  `confirm` se ignora (no hay cadenas). Una pregunta a la vez: un vínculo nuevo reemplaza al que
  esperaba, y salir del formulario lo descarta.
- Un Kino anterior ignora `link` (es aditivo, sin `apiVersion` nueva): di también en `message` (o en una
  línea de estado) qué hacer.
- Una acción que solo sirve de `confirm` se puede ocultar con [`"linkOnly": true`](#link-only): la persona
  ve entonces un solo botón, y solo la pregunta de Kino corre la acción de confirmar.

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
`node sdk/run.mjs . action logout`, `node sdk/run.mjs . validateSettings '{"email":"ana@x.co"}'` (o `node sdk/validate.mjs . --run …` con
los mismos argumentos, que además dice lo que muestra Kino y marca una llamada que Kino nunca hace; `--raw`
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

## Una contraseña que se queda en este aparato (`"sync": false`, apiVersion 13, en desarrollo) { #sync-false }

Todavía no está en un Kino publicado. Un `password` puede decir `"sync": false` para quedarse en el aparato donde la
persona lo escribió: úsalo para un valor que solo tiene sentido una vez, en un aparato, como una contraseña de
verificación en dos pasos que tu plugin manda enseguida y después borra (`clearSettings`). Sin eso una contraseña llega a
los aparatos emparejados de la persona, sellada de punta a punta, como cualquier otra contraseña ([abajo](#other-devices)).

```json
{ "key": "tg_password", "label": "Contraseña de verificación", "type": "password", "sync": false }
```

- El valor nunca se envía a un aparato emparejado, y un valor que manda otro aparato nunca lo pone ni lo borra.
- No va en ninguna copia de seguridad, ningún kit ni el `provision` de un proveedor de sincronización: un manifiesto cuyo
  `sync.provision` lo nombra se rechaza ("The \"provision\" of the \"sync\" field can't name a setting with \"sync\":
  false").
- Tu plugin lo lee con `kino.config.get` y lo borra como cualquier contraseña.
- `sync` en algo que no es un password rechaza el manifiesto ("Only a setting of type password has \"sync\"
  (\"key\")"), y también un valor que no sea `true` o `false`. Por debajo de apiVersion 13, y en un Kino que no lo tiene,
  la clave se ignora y la contraseña se sincroniza como siempre. `node sdk/validate.mjs` revisa todo esto como la app.

## En los otros aparatos de la persona { #other-devices }

Cuando la persona empareja dos de sus aparatos (celular y TV), Kino mantiene sus plugins al día entre
ellos. Lo que pasa y lo que no:

- **Pasa:** la instalación, las actualizaciones, encendido/apagado, la desinstalación y las
  aprobaciones de hosts. Cada aparato descarga tu código él mismo; solo viajan la dirección y la
  aprobación. El otro aparato instala **en silencio** cuando lo que descargó no pide nada más de lo que
  la persona aprobó en el primero; si ahora pides más (un host, permiso o capacidad nueva), espera en
  "Plugins de tus otros aparatos" con la hoja de consentimiento normal.
- **Pasa:** los valores de los ajustes `text`, `select`, `toggle`, `url` y `list` (una `list` que tiene
  un campo `password` no viaja), y los ajustes `password` (salvo uno con `"sync": false`, apiVersion 13), sellados de punta a punta con la llave que los
  aparatos acordaron al emparejarse, nunca legibles en el camino.
- **Pasa:** los vaciados. Un campo que la persona vacía, o el `clearSettings` de una acción, también se
  vacía en sus otros aparatos (contraseñas incluidas). Un ajuste `required` nunca se vacía a distancia.
  Un aparato con una versión de Kino más vieja ignora los vaciados y conserva su valor.
- **Nunca pasa:** `kino.storage`, las cookies, las filas de Inicio guardadas.
- **Un proveedor de sincronización** además puede pasarle sus ajustes a otro aparato con "Enviar a otro
  aparato" (los que nombra su `sync.provision`): mira
  [Proveedores de sincronización](sync-providers.md#provisioning).

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
