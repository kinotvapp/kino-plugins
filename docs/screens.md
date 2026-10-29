# Pantallas (`screen`, apiVersion 14) { #screens }

!!! note "Disponible con Kino 0.9.74"
    Disponible con Kino 0.9.74 (la próxima versión, aún no publicada). Una versión anterior de Kino rechaza estos
    plugins con «Este plugin necesita una versión más nueva de Kino»; para seguir llegando a quien tiene una versión
    anterior usa `enhancements` (ver [Pantallas sin subir tu apiVersion](enhancements.md)).

Todo lo de esta página necesita `"apiVersion": 14`.

Un plugin puede tener su **propio lienzo de pantalla completa dentro de Kino**: una mini-app. La persona toca tu entrada
en el menú (o un botón en tu página de ajustes) y lo que se abre es una pantalla en blanco con la barra de título de Kino
(el nombre de tu plugin y un botón para cerrar), cuyo cuerpo entero describe tu JavaScript: columnas, filas, tarjetas,
listas, imágenes, campos de texto, listas desplegables, formularios, pestañas, tablas, las mismas tarjetas de póster y filas
de Inicio, ventanas emergentes. Kino lo dibuja con su propio aspecto, en el celular (táctil) y en la TV (el control remoto
y su foco), **a partir del mismo JSON**: el contrato no nombra ningún tipo de Android ni ninguna unidad de píxel que solo
entienda una plataforma.

Tres ideas sostienen toda la guía:

- **Tú describes, Kino dibuja.** `screen()` devuelve un árbol de objetos simples (nodos). Kino lo valida, descarta lo que
  está mal con una línea en el registro (nunca un cierre de la app) y dibuja el resto. Nunca tocas una vista, un valor de
  color ni una fuente.
- **El estado vive en Kino.** Tu entorno de ejecución se cierra después de un rato sin uso, así que nada de lo que guardes
  en una variable sobrevive. Kino guarda el estado de la pantalla, se lo pasa a cada llamada y vuelve a llamar a
  `screen()` cada vez que una respuesta lo cambia.
- **La persona siempre puede salir.** El botón de cerrar y Atrás son de Kino y siempre funcionan, responda lo que responda
  tu código o mientras todavía esté corriendo.

En un Kino anterior, `kino.screen` es `undefined`. Esta página es la guía; cada componente, con sus propiedades, un árbol
JSON, su comportamiento en celular y TV y sus límites, está en la referencia: [Diseño, contenido y
acciones](screen-components.md), [Formularios, ventanas y navegación](screen-forms.md) y [Datos, comportamiento y
límites](screen-reference.md). El [ejemplo galería](#examples) los dibuja todos en un aparato.

## Una primera pantalla { #first-screen }

`kino-plugin.json`:

```json
{
  "id": "hello-screen",
  "name": "Hola",
  "version": "1.0.0",
  "apiVersion": 14,
  "entry": "plugin.js",
  "hosts": ["example.org"],
  "capabilities": ["screen"],
  "screen": { "label": "Hola", "labelEn": "Hello", "icon": "star", "menuOpens": "screen" }
}
```

`plugin.js`:

```js
export async function screen({ state, lang }) {
  const children = [
    { type: "Text", text: "Hola", textEn: "Hello", style: "h1" },
    { type: "TextField", key: "name", labelText: "Tu nombre", labelTextEn: "Your name", onSubmitted: "greet" },
    { type: "ElevatedButton", labelText: "Saludar", labelTextEn: "Greet", onPressed: "greet" },
  ];
  if (state.greeting) children.push({ type: "Text", text: state.greeting, style: "h3", color: "primary" });
  return { type: "Column", padding: { compact: 16, expanded: 32 }, gap: 12, children };
}

export async function screenEvent({ name, state, lang }) {
  if (name !== "greet") return null;                 // the reserved "open" event comes first: nothing to load here
  const who = String(state.inputs.name ?? "").trim(); // every input's value, by its key
  if (!who) return { toast: lang === "es" ? "Escribe tu nombre" : "Type your name" };
  return { state: { greeting: (lang === "es" ? "Hola, " : "Hello, ") + who } }; // Kino merges it and calls screen() again
}
```

```
node sdk/validate.mjs .
node sdk/run.mjs . screen
node sdk/run.mjs --state '{"inputs":{"name":"Ana"}}' . screenEvent greet
node sdk/run.mjs --device tv . screen
```

Un plugin con `screen` no necesita `resolve`, `search` ni `home`: esa capacidad puede ser la única que declare, y **no
agrega ninguna línea de consentimiento** (no llega a nada a lo que tus `hosts` no llegaran ya). `hosts` igual necesita una
entrada cuando no hay un ajuste `url`, aunque la pantalla nunca haga peticiones (el ejemplo de la calculadora nombra su
sitio de documentación).

## El bloque `screen` del manifiesto { #manifest }

| Campo | Regla |
| --- | --- |
| `label` | Obligatorio, de 1 a 20 caracteres: el nombre de la entrada del menú (`labelEn`, el nombre en inglés). |
| `icon` / `iconFile` | Uno de los nombres de ícono de Kino (los 50 de la [tabla de íconos](screen-components.md#icon-names), `refresh` entre ellos) o un PNG de 96×96 px con fondo transparente, de máximo 24 KB; nunca los dos. No hace falta sin `"menu"` en `opensFrom`. |
| `menuOpens` | Qué abre la entrada del menú: `"section"` (las filas de tarjetas de Kino, necesita tu `section`), `"screen"` (el lienzo) o `"both"` (dos entradas, necesita `section`). Por defecto: `"section"` cuando declaras una `section` (nada cambia para un plugin que ya existe); si no, `"screen"`. Un destino sin su export se rechaza al instalar. |
| `opensFrom` | Desde dónde se abre la pantalla: `"menu"` (el ícono: la barra lateral de la TV, la franja de Inicio del celular) y/o `"settings"` (un botón arriba de la página de ajustes de tu plugin). Por defecto `["menu"]`, nunca vacío. Sin `"menu"` no hay ícono ni entrada: `icon`, `iconFile` y `menuOpens` se ignoran. |
| `settingsButton` | `{ "label", "labelEn" }`, cada uno de 1 a 40 caracteres: el nombre de ese botón de la página de ajustes (por defecto, el de Kino: «Abrir pantalla» / "Open screen"). |
| `settingsIn` | Dónde se muestran tus ajustes: `"settings"` (el formulario de Kino en Ajustes), `"screen"` (solo tu pantalla: Kino esconde su formulario en tu pestaña, en tu tarjeta de «Mis plugins» y en el Configurar de un proveedor de sincronización mientras la pantalla pueda abrirse, y esos lugares abren tu pantalla) o `"both"` (por defecto). `"screen"` necesita una forma de entrar (`menuOpens` `"screen"`/`"both"`, o `"settings"` en `opensFrom`); ver [Ajustes dentro de una pantalla](#settings-in-screen). |
| `replaces` | `["categories"]`: tu pantalla toma el lugar de tu grupo en las Categorías de Kino; ver [`go`](#go). Necesita la capacidad `browse` y el export `categories`. |
| `every` | Temporizadores que corren mientras la pantalla está abierta, como el [`every`](#timers) de la raíz de un árbol. Uno mal escrito se descarta y queda en el registro; nunca se rechaza el plugin. |
| `adult` | `true`: la entrada solo se ve mientras el código 18+ de la persona está desbloqueado. |

Dónde aparece la entrada: en la barra lateral de la TV, después de Categorías y de las secciones (las 3 primeras pantallas
de plugins directamente, las demás dentro de «Más pantallas»), y como un chip en la franja de Inicio del celular; solo para
un plugin activado que no necesita configuración, como una `section`. Con `opensFrom: ["settings"]` el plugin no tiene
ícono: su página de ajustes muestra el botón arriba y, con `settingsIn: "screen"`, ese botón es todo lo que muestra la
página además de los interruptores propios de Kino (el formulario vuelve cuando la pantalla no puede abrirse: pantallas
apagadas, 18+ bloqueado, ajustes por llenar). Atrás vuelve a la página de ajustes. Kino tiene un interruptor remoto para
todas las pantallas de plugins: apagado, las entradas se esconden en el acto y una pantalla abierta se cierra; el mismo
interruptor detiene las [salas](rooms.md#room) y los [trabajos en segundo plano](jobs-and-shared.md#jobs).

## Los exports: `screen` y `screenEvent` { #exports }

```js
export async function screen({ state, route, device, size, lang }) { return /* the root node */; }
export async function screenEvent({ name, arg, value, state, route, device, lang }) { return /* an answer, or null */; }
```

- **`screen` es una vista pura.** Con el estado, devuelve el árbol. Kino la llama cuando se abre la pantalla, después de
  cada respuesta que trae un parche de `state`, después de un cambio de ruta y cuando la ventana cambia de clase de tamaño
  (al girar, al redimensionar). No hagas trabajo de red aquí: devuelve lo que tiene el estado (un `Skeleton` mientras
  carga).
- **`screenEvent` reacciona.** Kino la llama cuando la persona actúa sobre un nodo que nombra un evento. La primera
  llamada después de abrir la pantalla es el **evento reservado `open`**: carga tus datos ahí (con `kino.fetch`, tu caché)
  y responde un parche de `state`. `open` está reservado: ningún nodo puede usar ese nombre.
- **`state`**: la copia de Kino, en JSON: tus propias claves, más `inputs` (cada campo de la pantalla por su clave, ver
  [Acciones, eventos y estado](#state)) y `ui` (lo que Kino hizo localmente: `hidden`, `enabled`, `open`). Máximo 64 KB.
  Vive solo mientras la pantalla está abierta: cerrarla lo borra, así que guarda en `kino.storage` lo que tenga que
  sobrevivir.
- **`route`**: `{ name, params, args? }`; en la raíz, `{ name: "main", params: {} }`. Una respuesta con
  `route: { push: "detail", params }` entra una pantalla más adentro de tu lienzo y `{ pop: true }` vuelve; Atrás saca una
  ruta empujada antes de cerrar el lienzo. `args` viene de un [`go.screen`](#go) que la abrió.
- **`device`** `"phone"`, `"tv"` o `"desktop"`; **`size`** `{ widthClass, heightClass, orientation }` con las clases de
  ventana de Material (`compact` por debajo de 600 dp, `medium` de 600 a 839, `expanded` de 840 en adelante); **`lang`**
  `"es"` o `"en"`. Puedes devolver un árbol distinto por aparato, pero los [valores por tamaño](#layout) suelen hacerlo
  mejor.
- **Un entorno de ejecución por plugin.** `kino.storage`, `kino.config`, las cookies y los secretos se comparten con tus
  otros exports, así que un catálogo (`home`, `search`...) puede alimentar la pantalla y al revés; las llamadas se ponen en
  fila con tus otras llamadas.
- **Fallas.** Una llamada que se pasa del tiempo (20 s), o un primer dibujo que Kino no puede hacer, muestra el estado de
  error de la pantalla (tu nombre, «Reintentar», cerrar), nunca una pantalla en blanco; después, un dibujo que se pasa del
  presupuesto conserva el último cuadro bueno y tres fallas seguidas muestran el estado de error. El tiempo agotado de una
  pantalla nunca cuenta para "No responde": una mini-app rota nunca apaga tu catálogo, ni al revés.

**Mezclar.** `screen` es una capacidad entre las demás, nunca un tipo de plugin: un mismo manifiesto puede declarar un
catálogo, `channels`, `subtitles`, una `section`, el `panel` del reproductor y `screen` a la vez. Los exports tienen nombres
distintos, así que nada choca; con `menuOpens: "both"` la persona recibe tu sección y tu pantalla como dos entradas.

## Nodos y widgets { #nodes }

Cada nodo es `{ type, ...properties }`. Estas propiedades funcionan en cualquier nodo (la lista completa está en
[propiedades comunes](screen-reference.md#common-properties) y [propiedades compartidas](screen-reference.md#shared-properties)):

- `key`: su id, único en la pantalla. **Obligatorio en los campos** (nombra el valor en `state.inputs`), en un `popup`, un
  `ExpansionTile` y un `MaterialBanner` que se puede descartar; los demás nodos reciben una clave generada `auto-<n>` (el
  prefijo `auto-` es de Kino: no lo uses). Un campo sin clave o con una clave repetida se descarta.
- `onTap`, `onLongPress` (el toque de un botón es `onPressed`), `arg`: lo que hace un toque, ver
  [Acciones, eventos y estado](#state).
- `enabled`, `hidden`: cómo se ve el nodo al empezar; las operaciones locales `ui` y los árboles siguientes lo cambian.
- `devices` (`["tv"]`, `["phone", "desktop"]`) y `sizes` (`["expanded"]`): el nodo solo se dibuja ahí. Un nombre
  desconocido descarta el nodo.
- `testKey` (de 1 a 64 caracteres): para pruebas y herramientas; nunca se dibuja.
- Compartidas por una familia de nodos, con un solo significado en todas partes: `autofocus` (un nodo que toma el foco:
  adonde va el foco cuando un dibujo lo dejó en ninguna parte; el control remoto de la TV cae ahí), `selected` (un botón o
  una tarjeta con `onTap`: el aspecto de seleccionado de Kino; `set` y `toggle` de `ui` con `prop: "selected"` lo cambian)
  y `badge` (`"dot"` o `{ text, textEn?, color? }` en un botón, una tarjeta con `onTap`, una pestaña de `TabBar` y la
  pestaña del cajón de un panel).
- `visible: false` (lo esconde, igual que `hidden: true`) y `tooltip` (`tooltipEn`; en un nodo que hace algo: la pista de
  Kino al mantener presionado, tras un momento de foco en la TV y para un lector de pantalla, máximo 80 caracteres, nunca
  información esencial) ([tooltip](screen-components.md#tooltip)).
- Las propiedades de estilo de la [siguiente sección](#layout), entre ellas `alignSelf`, `textAlign`, `border`,
  `elevation`, `background`, `minWidth`/`maxWidth`/`maxHeight`, `positioned` en el hijo de un `Stack`, `opacity` y
  `animate`.

Los textos de Kino son siempre suyos; los tuyos llevan un gemelo en inglés con el sufijo `En` (`text`/`textEn`,
`labelText`/`labelTextEn`, `title`/`titleEn`...), elegido según el idioma de la persona.

| Nombre | Nombre anterior | Qué es | Sus propiedades | Como campo |
| --- | --- | --- | --- | --- |
| `Column` | `col` | sus hijos en una columna |  |  |
| `Row` | `row` | sus hijos en una fila; `wrap: true` es la cuadrícula de doce columnas | `stackOnNarrow`, `wrap` |  |
| `Stack` | `box` | sus hijos apilados uno sobre otro |  |  |
| `Card` | `card` | la tarjeta de Kino alrededor de sus hijos | `variant`, `flush` |  |
| `Spacer`, `SizedBox` | `spacer` | espacio vacío (`SizedBox`, su `width`/`height`; `Spacer`, su parte de `flex`) |  |  |
| `Divider` | `divider` | una línea fina |  |  |
| `SingleChildScrollView` | `scroll` | sus hijos, con desplazamiento | `direction` |  |
| `GridView` | `grid` | sus hijos en `columns` | `columns` |  |
| `Text` | `text` | texto simple (`text`, `textEn`) | `style`, `maxLines`, `bold`, `time`, `timeFormat` |  |
| `Image` | `image` | una imagen https en un host público (`url`, `alt`, `fallback`) | `aspect` |  |
| `Icon` | `icon` | uno de los íconos de Kino (`name`) |  |  |
| `Badge` | `badge` | una etiqueta pequeña (`text`) |  |  |
| `LinearProgressIndicator` | `progress` | una barra de progreso (`value`, `labelText`) |  |  |
| `CircularProgressIndicator` | `loading` | el indicador de carga de Kino (`text`) |  |  |
| `ListView` | `list` | una lista perezosa de `items` (nodos), `empty` cuando no hay ninguno, cargar más | `columns`, `stickToBottom`, `onEndReached`, `loadingMore`, `done`, `newItemsHint` |  |
| `Button`, `ElevatedButton`, `TextButton`, `IconButton` | `button` | un botón (`labelText`, `icon`, `onPressed`, `confirm`, `submit`) | `variant` |  |
| `TextField` | `textInput` | un campo de texto (`kind`, `maxLength`, `value`, `onSubmitted`; un `trailingIcon` adentro con `trailingLabel` y `onTrailingTap`; `obscureText` lo enmascara) | `trailingIcon`, `obscureText` | valor en `state.inputs`; reglas de formulario: `required`, `minLength`, `maxLength`, `pattern`, `errorText`; `bind` guarda un ajuste `text` |
| `TextField` (varias líneas) | `textArea` | un campo de texto de varias líneas (`multiline: true` o `maxLines` mayor que 1) |  | valor en `state.inputs`; reglas de formulario: `required`, `minLength`, `maxLength`, `pattern`, `errorText`; `bind` guarda un ajuste `text` |
| `DropdownButton` | `dropdown` | una elección entre `options` |  | valor en `state.inputs`; reglas de formulario: `required`, `errorText`; `bind` guarda un ajuste `select` o `text` |
| `Switch` | `toggle` | un interruptor de encendido y apagado |  | valor en `state.inputs`; reglas de formulario: `required`, `errorText`; `bind` guarda un ajuste `toggle` |
| `Checkbox` | `checkbox` | una casilla |  | valor en `state.inputs`; reglas de formulario: `required`, `errorText`; `bind` guarda un ajuste `toggle` |
| `RadioGroup` | `radioGroup` | una elección entre `options` |  | valor en `state.inputs`; reglas de formulario: `required`, `errorText`; `bind` guarda un ajuste `select` o `text` |
| `Slider` | `slider` | un número entre `min` y `max` (`step`) |  | valor en `state.inputs`; `bind` guarda un ajuste `text` |
| `Chips` | `chips` | una o varias (`multiple`) elecciones entre `options` |  | valor en `state.inputs`; reglas de formulario: `required`, `minLength`, `maxLength`, `errorText`; `bind` guarda un ajuste `select` o `text` |
| `TabBar` | `tabs` | una fila de pestañas (`tabs`, `value`, `onChanged`); su valor NO está en `state.inputs` |  |  |
| `emptyState` | `emptyState` | el estado vacío de Kino (`title`, `text`, `icon`) |  |  |
| `errorState` | `errorState` | el estado de error de Kino (`title`, `text`, `icon`) |  |  |
| `titleCard` | `titleCard` | una tarjeta de póster de Inicio para un `item` | `size` |  |
| `titleRail` | `titleRail` | una fila de Inicio: `title`, `items`, `ref` para su "Ver más" | `size`, `onEndReached`, `loadingMore`, `done` |  |
| `titleGrid` | `titleGrid` | tarjetas de Inicio en una cuadrícula (`items`) | `columns`, `onEndReached`, `loadingMore`, `done` |  |
| `heroCard` | `heroCard` | el banner de una sección: `title`, `text`, `image`, máximo 2 `buttons` |  |  |
| `popup`, `AlertDialog`, `BottomSheet`, `PopupMenuButton` | `popup` | una ventana emergente declarada en el árbol (`key`, `kind`), abierta con una operación `ui` | `onClose`, `buttons`, `items`, `anchor` |  |
| `Form` | `form` | campos con un solo envío, revisados por Kino antes de tu código (`onSubmitted`) |  |  |
| `settings` | `settings` | el formulario de ajustes propio de Kino para tu plugin (`keys`, `onSaved`) | `onSaved` |  |
| `MaterialBanner` | `banner` | una línea de aviso en el color de un rol (`role`, `title`, `text`, `action`, `dismissible`) |  |  |
| `ExpansionTile` | `accordion` | secciones que se abren y se cierran (`key`, `items`, `multiple`) |  |  |
| `Skeleton` | `skeleton` | un marcador de lugar mientras algo carga | `shape`, `lines` |  |
| `QrImage` | `qr` | un código QR que Kino dibuja en el aparato (`value`; `expiresInMs` o `expiresAt` con la cuenta regresiva de Kino, `onExpire`, `renewBeforeMs`) | `size`, `expiresInMs`, `expiresAt`, `renewBeforeMs`, `onExpire` |  |
| `NumberStepper` | `stepper` | un número dibujado `[ − ] valor [ + ]` (`min`, `max`, `step`, `decimals`, `editable`) |  | valor en `state.inputs`; reglas de formulario: `required`, `errorText`; sin `bind` |
| `DataTable` | `table` | una tabla de `TableRow` con `TableCell` (`text` o `children`, `colSpan`, `crossAxisAlignment`) | `header`, `wrap`, `zebra`, `columns` |  |
| `FloatingActionButton` | `fab` | el botón flotante de Kino sobre la parte de abajo de la pantalla (`icon`, `labelText`, `onPressed`), uno por pantalla | `fabPosition` |  |
| `ListTile` | `listTile` | una fila de una lista: `leading`, `title`, `subtitle`, `trailing`, un toque | `dense`, `leading`, `trailing`, `subtitle` |  |
| `CircleAvatar` | `avatar` | un círculo con una imagen, iniciales o un ícono (`image`, `text`, `icon`, `backgroundColor`) | `borderRadius`, `backgroundColor` |  |
| `PageView` | `pageView` | páginas que se deslizan, con los puntos de Kino (`initialPage`, `onPageChanged`, `autoPlayMs`); `viewportFraction` < 1 es un carrusel | `viewportFraction`, `padEnds`, `initialPage`, `onPageChanged`, `autoPlayMs` |  |
| `Scaffold` | `scaffold` | la raíz de una pantalla con un `appBar`, un `body`, un `floatingActionButton` y un `bottomNavigationBar` (dibujado en modo de llenado) |  |  |
| `AppBar` | `appBar` | la barra de arriba de un Scaffold: `title`, `leading`, hasta cuatro `actions`, un TabBar en `bottom` |  |  |
| `NavigationBar` | `navigationBar` | la barra de abajo de un Scaffold, de 2 a 5 `items` (`value`, `onChanged`) |  |  |
| `steps` | `steps` | un flujo de configuración con el aspecto de Kino: `items` hechos, el actual (abierto, con sus `children`) o pendientes; `onStepTap` deja tocar un paso hecho | `items`, `onStepTap` |  |

Un `TextField` enmascarado (`obscureText: true`) es la excepción de su fila: solo se ata a un ajuste `password` (ver
[campos secretos](screen-forms.md#secret-field)). La barra del `Scaffold` va debajo de la barra de título de Kino, que
ningún plugin reemplaza ni tapa ([Scaffold](screen-components.md#scaffold)).

Un `type` desconocido se descarta con una línea en el registro y el resto se dibuja. **Revisa que exista un widget antes
de depender de uno que agrega un Kino más nuevo**: `kino.screen.names` lista los nombres de tipo que dibuja este Kino tal
como los escribe esta guía, `kino.screen.widgets` los mismos con sus nombres anteriores, y `kino.screen.version` es el
número propio del contrato de pantallas (1 por ahora).

```js
const has = (name) => typeof kino.screen === "object" && kino.screen.names.includes(name);
const table = has("DataTable") ? { type: "DataTable", /* ... */ } : { type: "Column", /* the same rows as text */ };
```

No están en esta versión: deslizar para actualizar, botones segmentados, autocompletado y cuadros combinados, selectores de
fecha y hora, un control deslizante de rango, una calificación, elementos de lista que se descartan o se reordenan, texto
enriquecido, gráficos, tarjetas de continuar viendo y de canales, y campos de archivo.

## Nombres al estilo de Flutter y los anteriores { #flutter-names }

Quien conoce Flutter encuentra los mismos nombres: `Column`, `Row`, `Text`, `TextField`, `Switch`, `ListView`,
`AlertDialog`, y las propiedades `width`, `height`, `mainAxisAlignment`, `crossAxisAlignment`, `flex`, `borderRadius`,
`onPressed`, `onChanged`, `onSubmitted`, `hintText`, `labelText`. Son la escritura documentada (esta guía, `kino.d.ts`, los
ejemplos). Los nombres anteriores en minúscula (`col`, `row`, `textInput`, `w`, `justify`, `onTap` en un botón...) se
siguen aceptando como alias: las dos escrituras se leen como el mismo árbol. La tabla completa de alias está en
[Nombres al estilo de Flutter](screen-reference.md#flutter-style-names). Las reglas:

- Usa una sola escritura. Cuando un nodo tiene las dos, gana la de Flutter y el choque queda en el registro (un `null` en
  la de Flutter cuenta como ausente).
- Un tipo que implica algo lo fija: `ElevatedButton`, `TextButton`, `IconButton` son un `Button` con `variant` `primary`,
  `text`, `icon`; `AlertDialog`, `BottomSheet`, `PopupMenuButton` son un `popup` con `kind` `dialog`, `sheet`, `menu`. Un
  valor distinto que pongas se reemplaza y queda en el registro. `secondary` no tiene otro nombre:
  `{ type: "Button", variant: "secondary" }`.
- Un `TextField` con `multiline: true` o con `maxLines` mayor que 1 en cualquier clase de tamaño tiene varias líneas.
- `onPressed` es solo de los botones; en otros nodos se ignora y queda en el registro.
- Solo se renombran nodos. Los campos de `dialog`, `sheet` y `menu` de una respuesta, los `buttons` de un diálogo, los
  `items` de un menú, la `action` de un banner y las entradas de `options` y `tabs` conservan `label` y `onTap`.
- Los componentes propios de Kino conservan sus nombres (`titleCard`, `titleRail`, `titleGrid`, `heroCard`, `emptyState`,
  `errorState`, `popup`, `settings`).
- El `Stepper` de Flutter es otro widget (un asistente): ese nombre aquí es desconocido (se descarta); el control
  `[−] n [+]` es `NumberStepper`. `OutlinedButton` y `Wrap` no existen (un `Row` con `wrap: true` es la cuadrícula de doce
  columnas).
- **Las líneas del registro usan la escritura anterior** ("button dropped", "textInput needs a key"), la que Kino lee por
  dentro.

## Diseño, estilo y valores por tamaño { #layout }

El estilo sale de escalas fijas, nunca de valores libres; un valor fuera de su escala se descarta y queda en el registro.

| Propiedad | Nombre anterior | Valores |
| --- | --- | --- |
| `padding` |  | 0, 4, 8, 12, 16, 24, 32, 48, o por lado (`x`, `y`, `top`, `end`, `bottom`, `start`) |
| `margin` |  | 0, 4, 8, 12, 16, 24, 32, 48, o por lado |
| `gap` |  | 0, 4, 8, 12, 16, 24, 32, 48 |
| `borderRadius` | `radius` | `none`, `small`, `medium`, `large`, `full`, o por esquina (`topStart`, `topEnd`, `bottomStart`, `bottomEnd`; la que falte, `medium`) |
| `width` | `w` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `height` | `h` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `minHeight` | `minH` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `fill` |  | `true`: todo el ancho del padre |
| `flex` | `weight` | de 1 a 12: su parte de un `Row` o un `Column` |
| `crossAxisAlignment` | `align` | `start`, `center`, `end`, `stretch`: a través del eje principal (en un `Text`, el párrafo) |
| `mainAxisAlignment` | `justify` | `start`, `center`, `end`, `spaceBetween`, `spaceAround`: a lo largo del eje principal |
| `color` |  | `primary`, `secondary`, `surface`, `muted`, `warning`, `error`, `onPrimary`, `primaryContainer`, `surfaceVariant` |
| `span` |  | de 1 a 12 o `"auto"`, en un `Row` con `wrap: true` |
| `offset` |  | de 0 a 11, en un `Row` con `wrap: true` |
| `maxWidthFraction` |  | de 0.25 a 1 en pasos de 0.05: como mucho esa fracción del ancho del padre (exactamente, con `fill`) |
| `alignSelf` |  | `start`, `center`, `end`, `stretch`: este hijo a través de su `Row` o `Column` |
| `textAlign` |  | `start`, `center`, `end`, `justify`: el párrafo de un texto |
| `border` |  | `{ width?, color? }` en una caja: de 0 a 8 dp, un rol de color |
| `elevation` |  | de 0 a 24 en un `Card` o un `Stack`: la sombra de Kino |
| `background` |  | un rol de color: el relleno de una caja |
| `minWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `maxWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `maxHeight` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `positioned` |  | `{ top?, left?, right?, bottom?, width?, height? }` en un hijo de `Stack`, en dp o `"25%"` |
| `opacity` |  | de 0 a 1 |
| `animate` |  | `{ duration?, curve? }`: los cambios se deslizan |

Cada una está explicada en detalle en [Estilo](screen-reference.md#style).

**Toda propiedad de estilo o de diseño de cualquier nodo puede ser un mapa por tamaño**: `{ compact?, medium?, expanded? }`.
Una clase que falte en el mapa toma la siguiente más pequeña que esté; si no hay ninguna, el valor por defecto de Kino.
Kino resuelve los mapas antes de dibujar, así que quien dibuja solo ve valores simples
([valores por tamaño](screen-reference.md#per-size-values)):

```js
{ type: "GridView", columns: { compact: 1, medium: 2, expanded: 3 }, gap: { compact: 8, expanded: 16 }, children }
```

Dos consecuencias: un nodo con un valor inválido **en una sola clase de tamaño se descarta entero** (en todas las clases),
y un mapa por tamaño que mezcla clases con otras claves se descarta. Usa `devices`/`sizes` para dibujar un nodo solo en
algunos lugares.

- `crossAxisAlignment` en un contenedor alinea sus hijos a través de su eje principal (la altura de un `Row`, el ancho de
  un `Column`); en un `Text` es la alineación del párrafo. `stretch` en un `Row` simple se dibuja como `start` (las filas no
  miden su contenido).
- **El lienzo no se desplaza solo**: un `Column` raíz más alto que la ventana se corta. Pon una página larga dentro de un
  `SingleChildScrollView` (o de un `ListView`, que es perezoso). Un `ListView` o una fila de títulos dentro de algo que se
  desplaza en la misma dirección se dibuja entero de una vez (con tope: 60 títulos).
- **La cuadrícula de doce columnas** (la de Bootstrap, [fila de doce columnas](screen-components.md#wrap-row)): un `Row`
  con `wrap: true` pone sus hijos en líneas de 12 columnas. Cada hijo ocupa su `span` (de 1 a 12, o `"auto"`, el valor por
  defecto) después de su `offset`; uno que no cabe en lo que queda de una línea empieza la siguiente; los `auto` de una
  línea se reparten lo que dejan los `span` fijos, y un botón, `Badge` o `Icon` en `auto` nunca queda más angosto que su
  propio ancho (empieza la línea siguiente en su lugar, sin cortar su texto); `gap` va entre celdas y entre líneas; un
  hijo escondido no deja hueco. Una línea es tan alta como su celda más alta y, por defecto (o con
  `crossAxisAlignment: "stretch"`), cada `Card` o celda contenedora (`Column`, `Row`, `Stack`, `GridView`, `Form`) sin
  `width`/`height` fijo se dibuja con esa altura, así que una cuadrícula de tarjetas queda pareja; un botón, una etiqueta o
  una imagen con tamaño conserva su propia altura arriba; `start`, `center` o `end` dejan cada celda con su propia altura.
  Una línea con algo que no se puede medir (una lista perezosa, una fila de títulos, pestañas, una tabla, el formulario de
  ajustes) no se estira. En una fila que envuelve, `flex`, `mainAxisAlignment` y `stackOnNarrow` no significan nada; un
  hijo toma su ancho natural salvo con `fill: true`. `span` y `offset` en cualquier otro lugar se ignoran y quedan en el
  registro. Dentro de un desplazamiento lateral, las doce columnas se reparten sobre 600 dp.
- `Card` con `flush: true` quita su propio relleno y recorta sus hijos a su forma redondeada, así que una `Image` arriba va
  de borde a borde; pon tú el relleno de los hijos de texto ([Card](screen-components.md#card)).

Una cuadrícula de tarjetas, una por línea en un celular, dos en una ventana mediana, tres en una TV:

```js
{ type: "Row", wrap: true, gap: 12, children: stories.map((s) => ({
  type: "Card", key: "story-" + s.id, flush: true, span: { compact: 12, medium: 6, expanded: 4 },
  onTap: { event: "read", arg: s.id },
  children: [
    // No picture: leave url out and the fallback is drawn (an empty url draws it too, but logs).
    { type: "Image", ...(s.image ? { url: s.image } : {}), aspect: "16:9", alt: s.title,
      fallback: { type: "Stack", color: "surface", children: [{ type: "Text", text: s.source, style: "h3" }] } },
    { type: "Column", padding: 12, gap: 4, children: [
      { type: "Text", text: s.title, style: "h4", maxLines: 3 },
      { type: "Text", text: s.source, style: "caption", color: "muted" },
    ] },
  ],
})) }
```

Una `Image` solo acepta URL https en un host público (sin declararlo, como toda imagen en Kino). Su `fallback` es un nodo
que se dibuja en la caja de la imagen cuando la imagen falla o no hay `url` (con un `fallback`, una imagen cuya `url` falta
o se rechaza se conserva): solo `Column`, `Row`, `Stack`, `Card`, `Spacer`, `SizedBox`, `Divider`, `Text`, `Icon`,
`Badge`, `Skeleton` e `Image`, a cualquier profundidad, y nada adentro se puede tocar. Sin él, una imagen que falla muestra
la marca de Kino ([Image](screen-components.md#image)).

## Texto y colores { #text-colours }

- El `style` de un `Text` es de `h1` a `h5`, `p` (el valor por defecto), `caption` o `label`; los nombres anteriores
  `display`, `title`, `subtitle` y `body` se leen como `h1`, `h3`, `h4` y `p`, y uno desconocido es `p`, con una línea en
  el registro. Kino los pasa a su propia escala tipográfica (en el celular, de `h1` headlineLarge hasta `p` bodyMedium) y
  en la TV cada paso crece 1.25, así que el orden se mantiene a tres metros. Se respeta la escala de fuente de la persona.
- Los títulos ya son negrita; `bold: true` pone en negrita cualquier estilo, `bold: false` nunca adelgaza un título.
  `maxLines` corta con puntos suspensivos.
- **Un plugin nunca fija una familia de fuente, un tamaño, cursiva ni un color libre.** `color` recibe un rol (`primary`,
  `secondary`, `surface`, `muted`, `warning`, `error`, `onPrimary`, y los roles contenedores `primaryContainer` y
  `surfaceVariant`, cuya caja le da a su texto el color de encima correspondiente), pintado con la paleta de Kino (el
  `theme` de tu manifiesto tiñe `primary` cuando cumple las reglas de contraste). Un rol que no se leería sobre su
  superficie se acerca al color de texto propio de la superficie hasta que se lee (4.5:1); `onPrimary`, que no se lee
  sobre una superficie simple, vuelve al valor por defecto, con una línea en el registro una vez por nodo.
- El texto es simple: nada en él es un enlace ni marcado, y los saltos de línea se conservan. La escritura de derecha a
  izquierda sigue a la app.

El detalle está en [Text](screen-components.md#text) y [Colores](screen-components.md#colors).

## Acciones, eventos y estado { #state }

Lo que hace un toque es una **acción**: el `onTap`, `onLongPress` u `onPressed` de un nodo, el `onChanged` y el
`onSubmitted` de un campo, el `onSubmitted` de un formulario. Cuatro formas:

```js
onTap: "refresh"                                        // an event for screenEvent; its arg is the node's arg
onTap: { event: "read", arg: "story-42" }               // an event with its arg (at most 4,096 characters)
onTap: { ui: [{ toggle: "details" }], event: "seen" }   // local operations first (no plugin call), then the event
onTap: { go: { title: { ref, kind: "movie" } } }        // somewhere in Kino, no plugin call (also { ui, go } and a bare go object)
```

**Las operaciones locales `ui`** corren en el acto, sin ida y vuelta, sobre nodos de la misma pantalla por su `key`:
`show`, `hide`, `toggle`, `enable`, `disable`, `focus`, `set` (`{ set: { key, value } }`: un texto de hasta 2.000
caracteres, un booleano, un número, o hasta 500 textos para `Chips`), `clear` (el valor de un campo), y `open` / `close`
(una ventana emergente declarada). Máximo 8 por acción; una clave desconocida se ignora y queda en el registro. Lo que hacen
se guarda en `state.ui` (`hidden` y `enabled` por clave, `open` con los elementos abiertos de cada `ExpansionTile`), así
que lo ves en tu siguiente llamada y un nuevo dibujo lo conserva; tú mismo puedes fijar esas claves en un parche de
`state`. El `selected` de un botón o de una tarjeta que se toca es la única excepción: `{ toggle: key, prop: "selected" }`
lo invierte y `set` con `true` o `false` lo fija, y dura solo hasta que tu siguiente dibujo lo vuelva a decir
([operaciones locales `ui`](screen-components.md#ui-ops)).

**`screenEvent`** recibe `name` (el evento), `arg`, `value` (el valor del campo que lo disparó), `state`, `route`, `device`
y `lang`.

**`state.inputs`** tiene cada campo de la pantalla por su clave: lo que fijó la persona o tu código; si no, el valor que
muestra el árbol (se llena en cada llamada y nunca se guarda, así que un árbol que cambia un valor por defecto es lo que
trae la siguiente llamada). Tipos: un `TextField`, un texto; `Switch` y `Checkbox`, un booleano; `Slider`, un número;
`DropdownButton` y `RadioGroup`, el valor de la opción (o `null`); `Chips`, un valor (o una lista con `multiple`);
`NumberStepper`, su valor como texto (`"2.50"`). Para fijar lo que muestra un campo (vaciar un buscador, llenar de
antemano un formulario, elegir una opción), responde `{ state: { inputs: { <key>: value } } }`: se ve en el acto y no
dispara ningún evento. **Un `TabBar` no es un campo**: su `value` no está en `state.inputs`; guarda la pestaña elegida, que
llega en el `value` de su evento `onChanged`, en una clave de estado tuya.

Cómo fluyen los eventos:

- Un evento a la vez por pantalla; el siguiente espera (máximo 8 en espera) y van separados por 100 ms, nunca se descartan
  por llegar rápido. Un `onChanged` más nuevo del mismo campo reemplaza a uno anterior que todavía espera. Una respuesta
  que llega después de cerrar la pantalla se descarta.
- En el celular, el `onChanged` de un campo de texto espera a que la persona deje de escribir (300 ms); en la TV se
  dispara una vez, cuando la persona acepta el diálogo de texto ([En la TV](#tv-focus)).
- Un parche de `state` se mezcla clave por clave (`null` borra una clave) con el estado a partir del cual se calculó tu
  respuesta; un parche que llevaría el estado por encima de 64 KB se rechaza y se conserva el estado anterior, con una
  línea en el registro. `screen()` vuelve a correr solo después de una respuesta que trae `state` (o de un cambio de ruta).
- Una llamada que se pasa del tiempo muestra el estado de error en el acto. Una llamada que lanza un error o responde algo
  que Kino no puede leer cuenta: tres seguidas muestran el estado de error (la primera ya lo muestra mientras no hay ningún
  cuadro); una respuesta buena pone la cuenta en cero.

## Lo que puede traer una respuesta { #answers }

Todos los campos son opcionales; `null` significa nada que hacer.

| Campo | Qué hace |
| --- | --- |
| `state` | Un parche que se mezcla con el estado; después `screen()` vuelve a correr. |
| `toast` / `toastEn` | Un mensaje corto abajo: un texto, o `{ text, textEn?, role?, action?: { label, labelEn?, event, arg? }, ms? }` (`ms` de 2.000 a 8.000, por defecto 3.500). Uno a la vez: uno más nuevo lo reemplaza; su acción manda su evento una vez. |
| `dialog`, `sheet`, `menu` | Una ventana emergente armada por la respuesta ([Ventanas emergentes](#popups)). Si hay más de una, gana el diálogo y después la hoja. |
| `ui` | Operaciones locales, las mismas que en una acción (máximo 8): `{ open: "story" }` abre una ventana emergente declarada, `{ close: "story" }` la cierra. |
| `go` | Algún lugar de Kino ([`go`](#go)). |
| `route` | `{ push: "<name>", params? }` o `{ pop: true }`: una pantalla tuya más adentro del lienzo. |
| `focus` | La `key` del nodo que debe tomar el foco. |
| `close` | `true` cierra la pantalla. |
| `config` | Tus ajustes para escribir ([Ajustes dentro de una pantalla](#settings-in-screen)). |

Algunas respuestas no vienen de un toque de la persona, así que conservan menos: la respuesta al `open` reservado pierde su
`go` (salvo `go.screen`), así que abrir una pantalla nunca reproduce ni abre nada por sí solo; la de un
[temporizador](#timers) conserva solo `state`, `toast`, `close` y `config`; la de cargar más nunca cambia la ruta; la de
un `onClose` de una ventana emergente no conserva ventanas emergentes, `focus`, `go` ni `route`. Los campos descartados
quedan en el registro.

## Ventanas emergentes, avisos y banners { #popups }

Una ventana emergente a la vez; abrir otra la reemplaza; Atrás la cierra antes que cualquier otra cosa; nunca tapa la barra
de título de Kino, y Kino siempre dibuja su botón de cerrar: una X sola (un lector de pantalla dice «Cerrar», «Close» en
inglés). Dos formas de mostrar una:

- **Desde una respuesta**: `dialog` (`title`, `body` como texto o nodos, máximo 3 `buttons`; un botón sin `event` la
  cierra), `sheet` (una hoja inferior en el celular, un cajón lateral en la TV; `body` como texto o nodos) o `menu` (de 1 a
  8 `items`: `label`, `icon`, `onTap`; el menú se cierra primero). La ventana de una respuesta nunca lleva un `Form`, un
  `ExpansionTile`, `bind` ni el nodo `settings`. Ver [Dialog](screen-forms.md#dialog), [Sheet](screen-forms.md#sheet) y
  [Menu](screen-forms.md#menu).
- **Declarada en el árbol**: un nodo `popup` (`AlertDialog`, `BottomSheet`, `PopupMenuButton`) con una `key`, escondido
  hasta que una operación `ui` lo abre. Su cuerpo es parte de tu árbol: puede tener formularios y campos, y tu siguiente
  dibujo lo actualiza ([ventanas declaradas](screen-forms.md#popup)).

La forma segura de abrir una ventana declarada con contenido nuevo es **desde la respuesta**, no desde el toque: el toque
manda el evento, la respuesta parcha el estado y trae `ui: [{ open: "story" }]`; Kino la abre cuando ya dibujó el árbol
nuevo, así que la ventana nunca muestra el cuerpo de la noticia anterior (un Atrás antes de eso lo cancela). Después del
Guardar de la propia ventana, ciérrala de la misma forma:

```js
// tap:            { type: "Card", onTap: { event: "read", arg: s.id }, ... }
// in screenEvent: case "read":  return { state: { reading: arg }, ui: [{ open: "story" }] };
//                 case "saved": return { state: { terms }, ui: [{ close: "addTerm" }], toast: "Guardado" };
{ type: "AlertDialog", key: "story", onClose: "storyClosed", children: [/* built from state.reading */],
  buttons: [{ label: "Cerrar", labelEn: "Close" }] }
```

- `onClose` (un nombre de evento, o `{ ui?, event?, arg? }`) corre después de que **la persona** cerró la ventana (Atrás,
  el botón de cerrar de Kino, un toque afuera), nunca después de sus propios botones, un elemento de menú, tu `close` u
  otra ventana que la reemplace. Úsalo para vaciar `state.reading`. Su evento no es un toque: nada de `kino.qr.scan`, ni
  `go.titleByIds` ni `go.url`, y su respuesta no abre ventanas, no mueve el foco ni va a ninguna parte (se descarta, con
  una línea en el registro); un `go`, `open` o `focus` dentro del propio `onClose` se descarta.
- `title` es opcional: con uno, la X de Kino cierra la fila del título; sin él (uno en blanco cuenta como ninguno) no se
  dibuja una fila vacía y la X empieza (a la izquierda) la fila de abajo, con tus botones juntos al final (a la derecha),
  así que la X nunca queda al lado de tu acción principal; los botones que no caben pasan a más líneas, siempre al final.
  No pases `" "` para esconderlo.
- Una ventana cuyo nodo está `hidden` no se puede abrir. Si una ventana está abierta o no, no aparece en `state.ui`.
- Un menú no queda pegado a lo que lo abrió: en el celular es una lista de acciones abajo del lienzo; en la TV va
  centrado.
- En la TV, un cuerpo largo se desplaza con Abajo y Arriba; deja un botón al final (el D-pad cae ahí después del texto).

Un **`MaterialBanner`** es una línea de aviso a lo ancho de la pantalla en el color de Kino para su `role` (`info`,
`warning`, `error`, `success`), con un `title` opcional, un botón `action` y, cuando es `dismissible` (necesita una
`key`), el botón de cerrar de Kino: lo esconde en el acto (`state.ui.hidden`) y manda el evento `dismiss` con la clave del
banner como `arg` ([MaterialBanner](screen-components.md#banner)). Un **aviso** (toast) con `action` se alcanza en la TV
sin robar el foco: Abajo desde el final del árbol llega a él (Arriba o Atrás salen), y la tecla Menú o Play/Pausa del
control lo ejecuta; el aviso lo dice en palabras ([Avisos](screen-components.md#toast)).

## Listas, cargar más y las tarjetas de Kino { #lists }

Un `ListView` es perezoso: dale `items` (nodos, cada uno con su propia `key`, máximo 500), un nodo `empty` para cuando no
hay elementos, y `columns` para una cuadrícula. Carga más con `onEndReached` en un `ListView`, un `titleRail` o un
`titleGrid` ([ListView](screen-components.md#list-view)):

```js
{ type: "ListView", items, onEndReached: { event: "more" }, loadingMore: state.loading === true, done: state.done === true }
```

Kino lo manda una vez cuando el último elemento entra a la vista, y de nuevo solo después de que respondiste, se dibujó el
árbol que pediste, y la lista creció o su `loadingMore` pasó de true a false (una carga que terminó sin nada nuevo). Nunca
más de una vez por segundo por lista, nunca mientras la pantalla está escondida (una página de título o el reproductor
encima, la app en segundo plano: pregunta cuando la pantalla vuelve a verse), nunca para una lista vacía, nunca con 500
elementos (o 60 para una fila o cuadrícula de títulos dibujada entera). `loadingMore: true` dibuja el indicador de carga de
Kino después de los elementos; `done: true` deja de preguntar. Dos consecuencias: un temporizador que apaga `loadingMore`
en cada tic sin nada nuevo hace que Kino vuelva a preguntar una vez por tic, y una lista que el dibujo de un temporizador
achica no vuelve a preguntar hasta que la persona haga algo.

**Los componentes propios de Kino** reciben datos, nunca estilo, con la misma forma que devuelve una fila de `home` o
`browse` (`KinoItem`: `id`, `ref`, `title`, `kind`, `poster`, `backdrop`, `year`, `rating`, `badges`, `progress`,
`adult`), leídos con las mismas reglas: una serie necesita tu capacidad `episodes`, los pósters y fondos son solo https (si
no, el marcador de Kino), y los elementos 18+ solo se ven mientras el código 18+ de la persona está desbloqueado.

- `titleCard` (una tarjeta de póster de Inicio; `size` small, medium o large), `titleRail` (una fila de Inicio con un
  `title` y, con un `ref`, su "Ver más"), `titleGrid` (tarjetas en `columns`, 3 por defecto), `heroCard` (el banner de una
  sección: `title`, `text`, una `image` https, máximo 2 botones). Ver [titleCard](screen-components.md#title-card),
  [titleRail](screen-components.md#title-rail), [titleGrid](screen-components.md#title-grid) y
  [heroCard](screen-components.md#hero-card).
- El toque de una tarjeta abre su título como lo hace la tarjeta de Inicio, con ese mismo elemento, así que "Continuar
  viendo", las listas guardadas y el progreso lo reconocen; `onTap` puede reemplazarlo por un evento, un `go` u
  operaciones `ui`. El `open: { screen }` de un elemento vuelve a abrir tu pantalla en esa ruta.
- Máximo 1.000 títulos en un árbol, y 60 en una cuadrícula o fila dibujada entera (dentro de un desplazamiento, una lista,
  una ventana emergente o una celda de tabla).

## Formularios y validación { #forms }

Un `Form` agrupa campos y les da un solo envío, **revisado por Kino antes de que algo llegue a tu código**
([Form](screen-forms.md#form), [Validación](screen-forms.md#validation)):

```js
{ type: "Form", key: "contact", onSubmitted: "send", children: [
  { type: "TextField", key: "email", kind: "email", labelText: "Correo", labelTextEn: "Email", required: true,
    pattern: "^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$", errorText: "Revisa el correo", errorTextEn: "Check the email" },
  { type: "TextField", key: "msg", labelText: "Mensaje", labelTextEn: "Message", multiline: true, maxLength: 500, required: true },
  { type: "ElevatedButton", labelText: "Enviar", labelTextEn: "Send", submit: true },
] }
```

- Campos: `TextField` (`required`, `minLength`, `maxLength`, `pattern`, `errorText`), `DropdownButton`, `Switch`,
  `Checkbox`, `RadioGroup`, `NumberStepper` (`required`, `errorText`), `Chips` (`required`, y `minLength`/`maxLength`
  cuentan los chips elegidos). `required` significa un texto que no está en blanco, una opción elegida, un interruptor
  encendido, un chip elegido; un campo vacío que no es obligatorio pasa todas las revisiones. `errorText`/`errorTextEn` es
  lo que la persona lee debajo de un campo que falla; si no, el texto propio de Kino; el error de un `RadioGroup` o de
  `Chips` se muestra en el grupo.
- El botón con `submit: true` envía (su propio `onPressed` se ignora); está apagado mientras un campo obligatorio esté
  vacío. Un formulario inválido nunca llama a tu código: los errores se muestran debajo de cada campo y el foco va al
  primero. Uno válido corre el `onSubmitted` del formulario, cuyo `value` trae el valor de cada campo por su clave.
- **Enter no envía un formulario**, y el `onSubmitted` propio de un campo dentro de un formulario corre sin la revisión del
  formulario. Las reglas de un campo fuera de un formulario no se usan. Un formulario sin `onSubmitted` se descarta; los
  formularios no se anidan (la regla es estricta: reescribe un formulario anidado como dos hermanos); la ventana de una
  respuesta no lleva ninguno.
- Los valores de los campos `hidden` o apagados igual se mandan, sin revisar; un campo obligatorio dentro de un `TableRow`
  escondido no se revisa; un campo obligatorio dentro de un elemento cerrado de un `ExpansionTile` no deja el botón
  apagado, pero el envío lo revisa y, si falla, abre el elemento y le pone el foco. Un `NumberStepper` siempre tiene un
  valor, así que su `required` siempre pasa.
- **El motor de patrones es propio de Kino** (uno de tiempo lineal, el mismo en la app y en el kit), nunca la expresión
  regular de la plataforma, así que un patrón hostil no puede congelar el aparato. Un patrón (máximo 200 caracteres) tiene
  que coincidir con el valor **completo**, en un subconjunto seguro: literales, `.`, `^`, `$`, `|`, grupos `( )` y
  `(?: )`, clases `[...]`, los escapes `\d \D \w \W \s \S \b \B \n \r \t` y la puntuación escapada, los cuantificadores
  `* + ? {n} {n,} {n,m}` (cuentas de hasta 1.000, opcionalmente perezosos), que se pueden anidar. Sin referencias hacia
  atrás ni búsquedas alrededor. Los significados son ASCII: `\d` es `[0-9]`, `\w` `[A-Za-z0-9_]`, `\s` el espacio en blanco
  ASCII, `.` cualquier carácter salvo un salto de línea. Un patrón puede expandirse a máximo 500 pasos una vez expandidas
  sus cuentas, así que `[a-z]{1,600}` se rechaza: escribe `[a-z]+` y pon `maxLength: 600`. Un patrón fuera del
  subconjunto se descarta, con una línea en el registro (el campo sigue revisando sus otras reglas). Un envío corre máximo
  16 patrones y 4.000.000 de pasos del motor; pasado cualquiera de los dos, los patrones que faltan pasan. El veredicto de
  Kino es el que cuenta: vuelve a revisar en tu código solo lo que necesite tu propia lógica
  ([Patrones](screen-forms.md#pattern)).

## Ajustes dentro de una pantalla: `settings`, `bind` y `config` { #settings-in-screen }

Tu pantalla puede ser la ventana de ajustes de tu plugin, o tenerla como una pestaña de una interfaz más grande. Los
valores siguen siendo tus ajustes reales (el mismo almacén, la misma sincronización entre los aparatos de la persona,
leídos con `kino.config`); nada se copia a `kino.storage`. La referencia está en
[el nodo settings](screen-forms.md#settings-node) y [bind y config](screen-forms.md#bind-and-config).

- **El nodo `settings`** dibuja el formulario de ajustes propio de Kino para tu plugin, el mismo que muestra Ajustes, en
  celular y TV: todos los tipos de ajuste, `devices`, los dos idiomas, la validación, los campos de Kino para secretos y
  sus botones para acciones (una `action` corre como allá), "Enviar a otro aparato", su propio guardar. `keys: [...]`
  muestra solo esos ajustes, en ese orden. No te manda ningún evento y tu código nunca ve lo que se escribe en él (su
  `onSaved` solo te avisa que la persona guardó). Cada ajuste se muestra máximo una vez por pantalla, así que varios nodos
  `settings` están bien. Nunca dentro de un `Form` ni de la ventana de una respuesta.
- **`bind: "<settingKey>"`** en un campo muestra el valor guardado al abrir la pantalla y escribe solo el cambio de la
  persona: una elección al cambiar, un texto al confirmar (la acción del teclado, cuando el foco sale, al aceptar el
  diálogo de la TV), nunca letra por letra, y solo cuando es distinto; igual recibes los eventos del campo. Lo que puede
  guardar cada campo está en la última columna de la tabla de widgets. Una pestaña de ajustes simple no necesita nada de
  JavaScript.
- **`config: { <settingKey>: value }`** en una respuesta escribe ajustes desde tu código: solo claves que declara tu
  manifiesto, máximo 32 por respuesta, cada valor acorde a su tipo (`text`, un texto; en blanco o `null` lo vacía salvo que
  sea obligatorio; `toggle`, un booleano; `select`, uno de sus valores de opción; `list`, un arreglo de registros con sus
  campos; `password`, un texto).
- **Un `password`** se guarda exactamente como llega (nunca se recorta); `null`, `""` o espacios en blanco lo vacían
  (nunca uno `required`); máximo 500 caracteres. Una pantalla nunca lo vuelve a leer (`bind` nunca lo prellena, `state`
  nunca lo tiene) y Kino nunca escribe su texto en el registro, solo su clave. Átalo solo a un campo enmascarado
  ([campos secretos](screen-forms.md#secret-field)).
- **Nunca desde una pantalla:** un ajuste `url` (una dirección que la persona guarda se vuelve un servidor al que tu
  plugin puede llegar, la red de la casa incluida, así que solo la persona la escribe, en el nodo `settings`), un ajuste
  `action` o `help`, un valor que contiene uno de tus secretos sellados, una escritura de `list` que agrega una dirección a
  un campo `url` (las entradas se pueden quitar, reordenar o renombrar), y un ajuste con [`unlockWith`](settings-form.md#unlock-with) (lo protege el código
  18+) movido de su valor por defecto (un campo nunca se ata a uno; el nodo `settings` lo muestra y pide el código). Todo
  eso se descarta, con una línea en el registro.
- **Ritmo:** cada ajuste se escribe máximo una vez cada 500 ms por pantalla (gana el valor más nuevo, y el último siempre
  llega, aunque la pantalla se cierre a mitad de la escritura); la respuesta de un temporizador escribe cada uno máximo
  una vez por minuto. `kino.config`, en el dibujo que pidió una respuesta, todavía puede leer el valor anterior de una
  clave escrita hace menos de 500 ms; cuando necesites el valor nuevo en el acto, léelo de tu propio estado.
- **Lo que cuesta una escritura:** cada escritura reinicia tu entorno de ejecución para que `kino.config` lea el valor
  nuevo. Una escritura que solo trae interruptores y selecciones conserva la sesión web de tu plugin (las cookies);
  cualquier otra es el Guardar completo de Kino, y la sesión se olvida (un inicio de sesión con cookies se cierra).

## Adónde manda la pantalla a la persona: `go` { #go }

La acción de un nodo o una respuesta puede traer `go`: una de doce formas, **siempre hacia el contenido de este mismo
plugin o hacia una página propia de Kino**. Ninguna forma nombra un intent ni una app, y solo `liveChannel` nombra otro
plugin (un proveedor de En vivo, para un plugin cuya pestaña del reproductor declara `"kinds": ["live"]`); cualquier otra
cosa se descarta. Cada forma tiene su entrada en la referencia, de [`go.title`](screen-forms.md#go-title) a
[`go.liveChannel`](screen-forms.md#go-live-channel).

| `go` | Qué abre | Desde dónde se manda |
| --- | --- | --- |
| `title` | la página de título de este plugin (`ref`, `kind`; `id`, `title` y `adult` para un título que no está en el lienzo) | un toque, o la respuesta a un evento (nunca la respuesta a `open`, a un temporizador o al `onClose` de una ventana emergente) |
| `play` | reproduce el título de este plugin (`ref`, `kind`, como `title`) | un toque, o la respuesta a un evento (nunca la respuesta a `open`, a un temporizador o al `onClose` de una ventana emergente) |
| `search` | la búsqueda de Kino con `q` (máximo 200 caracteres), solo con este plugin como fuente | un toque, o la respuesta a un evento (nunca la respuesta a `open`, a un temporizador o al `onClose` de una ventana emergente) |
| `browse` | la lista "Ver más" de este plugin para un `ref` | un toque, o la respuesta a un evento (nunca la respuesta a `open`, a un temporizador o al `onClose` de una ventana emergente) |
| `section` | la sección de este plugin | un toque, o la respuesta a un evento (nunca la respuesta a `open`, a un temporizador o al `onClose` de una ventana emergente) |
| `categories` | las Categorías de Kino con el grupo de este plugin primero (su propia pantalla con `screen.replaces`) | un toque, o la respuesta a un evento (nunca la respuesta a `open`, a un temporizador o al `onClose` de una ventana emergente) |
| `close` | cierra la pantalla | un toque, o la respuesta a un evento (nunca la respuesta a `open`, a un temporizador o al `onClose` de una ventana emergente) |
| `screen` | la pantalla propia de este plugin en `route` (máximo 64 caracteres) con `args` (máximo 4.096 bytes de JSON) | un toque, o una respuesta, incluida la respuesta al `open` reservado (nunca la de un temporizador ni el `onClose` de una ventana emergente) |
| `titleByIds` | la página de título propia de Kino para ids de TMDB o IMDb, donde la persona elige cualquiera de sus fuentes | solo un toque o envío de la propia persona (un toque, un envío, la respuesta a uno, el botón de una ventana emergente, un toque en un panel) |
| `url` | un enlace https en el navegador, después de la hoja de confirmación propia de Kino (un código QR en una TV) | solo un toque o envío de la propia persona (un toque, un envío, la respuesta a uno, el botón de una ventana emergente, un toque en un panel) |
| `copy` | Kino pone el texto del plugin en el portapapeles y siempre muestra su propio aviso «Copiado» (una TV no puede copiar) | solo un toque o envío de la propia persona (un toque, un envío, la respuesta a uno, el botón de una ventana emergente, un toque en un panel) |
| `liveChannel` | el reproductor sintoniza el canal de un proveedor de En vivo (`provider`, `code`), solo para un plugin cuya pestaña del reproductor declara `"kinds": ["live"]` | solo un toque o envío de la propia persona (un toque, un envío, la respuesta a uno, el botón de una ventana emergente, un toque en un panel) |

- La página de Kino se abre encima de tu pantalla; Atrás vuelve a ella con su estado. Máximo un `go` que abre una página
  cada 500 ms (uno segundo en ese lapso se descarta, con una línea en el registro).
- **El candado 18+ vale en todas partes**: un `title` o `play` de un elemento `adult` queda escondido mientras el código
  18+ de la persona está bloqueado. Un `titleByIds` con el código bloqueado solo abre cuando TMDB dice que el título no es
  para adultos; para adultos, desconocido, una falla o 12 s de espera muestran el mensaje de bloqueo de Kino ("Contenido
  para adultos: desactiva el control parental en Ajustes").
- `title` / `play`: un título que está en el lienzo se abre con ese mismo elemento (pasa su `id` cuando dos elementos
  comparten un `ref`). Un título que NO está en el lienzo necesita su `id` y su `title` (y `adult: true` cuando es 18+), o
  Kino no puede saber cuál es y muestra su error de siempre. Un canal en vivo se reproduce; una serie abre su página
  (`kind: "episode"` solo y una `series` de un plugin sin `episodes` muestran el error); una película, una canción o un
  episodio de podcast se reproduce en el acto.
- `search` abre la búsqueda de Kino con solo tu plugin como fuente (la persona ve su chip y puede quitarlo); a un plugin
  sin `search` se le rechaza. `categories` se rechaza, con una línea en el registro, para un plugin sin sus propios
  mosaicos en Categorías.
- `screen: { route?, args? }` abre la pantalla de **este plugin** desde sus otras superficies: su panel del reproductor
  (respuesta o botón), los elementos y filas de su `home`, `section` y `browse` (`open: { screen }`), la tarjeta de «Mis
  plugins». La pantalla recibe `route: { name, params: {}, args }` (`name` es `"main"` sin ruta). Desde dentro de la
  pantalla, vuelve a empezar en esa ruta (las rutas empujadas y una ventana abierta se van, el estado se queda) y el
  `open` reservado vuelve a llegar con la ruta nueva, así que un mismo camino carga lo que nombran los `args` sin importar
  por dónde entró la persona; máximo un reinicio por segundo. Con las pantallas apagadas, una tarjeta o una fila hace lo que
  hacía antes ([`go.screen`](screen-forms.md#go-screen)).
- **`screen.replaces: ["categories"]`**: mientras tu pantalla pueda abrirse, un mosaico de tu grupo en las Categorías de
  Kino y un `go` `categories` abren tu pantalla en la ruta `categories` con `args: { from, category? }` (`from` es
  `categories`, `screen` o `panel`; `category` es el `ref` del mosaico tocado). Ármala con `titleRail`, `titleGrid`,
  `heroCard`, `TabBar`, `Chips` y `go`. Las Categorías de Kino quedan de respaldo: con las pantallas apagadas, la pantalla
  escondida, o una PRIMERA apertura que falla (Kino muestra entonces la lista "Ver más" del propio mosaico y se salta tu
  pantalla durante esa sesión de la app). Un `go` `categories` mandado desde la ruta `categories` abre las de Kino (sin
  bucle).
- **`titleByIds`** (`{ tmdb?, imdb?, kind, season?, episode?, title?, year? }`, al menos un id) es la forma en que personas
  con **plugins distintos** llegan al mismo título: abre la página de título propia de Kino (la que abre una tarjeta de TMDB
  en Inicio), con todas las fuentes que tiene la persona. No nombra ningún plugin, ref ni URL (cualquier otro campo lo
  descarta), nunca reproduce, no te devuelve nada; un `imdb` solo cuesta una búsqueda en TMDB ("Buscando el título…", una a
  la vez); la serie se abre entera (todavía sin foco en un episodio)
  ([`go.titleByIds`](screen-forms.md#go-title-by-ids)).
- **`url`** (`{ href, title? }`, un botón "Ver noticia") le pide a Kino abrir un enlace https en un navegador. Nada se abre
  solo: Kino muestra primero **su propia** hoja («Abrir un enlace», «Lo pide: <tu plugin>», el host con su final siempre
  visible, un host internacional como su punycode con una advertencia, tu `title` bajo «Texto del plugin:», y después
  «Cancelar» con el foco primero y «Abrir», inactivo durante sus primeros 600 ms). En una TV, o en un celular sin
  navegador, la hoja muestra el enlace como un código QR para escanear con un celular. `href`: solo `https://`, máximo
  2.048 caracteres ASCII imprimibles (codifica el resto con porcentajes), un nombre DNS público con un punto (nunca una
  dirección IP, `localhost`, `.local`, `.internal`, `.lan`, `.home.arpa`, `nip.io`, `sslip.io` y parecidos), sin
  `user:password@`, sin otro puerto que el 443. Una respuesta que llega más de 5 s después del toque pierde el enlace, y
  las ventanas emergentes de esa misma respuesta se descartan para que nada tape la hoja de Kino. Nada vuelve a ti, ni
  siquiera si la persona lo abrió. No hace falta ninguna capacidad ([`go.url`](screen-forms.md#go-url)).
- **Desde la pantalla abierta encima del reproductor** (el `go.screen` de un panel): `close` la cierra; cualquier otro
  `go` primero la cierra y sigue; el video hace entonces lo que hace cuando cualquier página de Kino lo tapa (la TV pausa,
  una transmisión en vivo se detiene).

## Temporizadores: `every` { #timers }

La raíz de un árbol (o el `screen.every` del manifiesto) puede traer `{ ms, event }` o una lista de ellos: Kino manda
`screenEvent { name: event }` cada `ms` mientras la pantalla está abierta, visible y Kino al frente (una ventana emergente
no lo detiene; una página de título o el reproductor encima, o la app en segundo plano, lo pausan). `ms` de al menos 1.000
(uno más corto se sube, con una línea en el registro) y máximo un día; máximo 3 temporizadores por pantalla (primero los del
manifiesto; un evento nombrado dos veces conserva el primero).

- Los tics nunca le cuestan nada a la persona: un tic corre solo mientras ningún evento de la persona espera o corre, un
  tic en espera se descarta cuando llega uno, y la siguiente espera empieza cuando el tic y su dibujo terminaron (el doble
  de tiempo cuando tardó más que `ms`).
- **Un tic no es un toque de nadie.** Su respuesta conserva solo `state`, `toast`, `close` y `config` (cada ajuste máximo
  una vez por minuto); sus ventanas emergentes, `focus`, `go`, `route` y `ui` se descartan, con una línea en el registro.
  No puede abrir el escáner de QR, preguntarle a la IA, ni abrir o entrar a una sala.
- Un tic que falla o se pasa del tiempo cuenta solo para su temporizador; 3 seguidos apagan ese temporizador mientras dure
  esta apertura (queda en el registro). Los tics nunca cuentan para "No responde".
- Usos típicos: actualizar un feed, revisar el `inbox` de una [sala](rooms.md#room), avanzar un paso pequeño de una
  [cola de trabajo](#patterns).

## Acordeón, esqueleto, QR, selector numérico y tabla { #components-misc }

- **`ExpansionTile`** (`key` obligatoria): `items` (de 1 a 500, cada uno `{ key, title, children, open? }`), uno abierto a
  la vez salvo con `multiple`. Cuáles están abiertos vive en `state.ui.open.<key>`, así que sobrevive a un nuevo dibujo;
  `open` es solo el aspecto inicial. Abrir y cerrar es cosa de Kino (sin llamada). El encabezado de cada elemento cuesta un
  nodo. Cuando el presupuesto de nodos se acaba justo después, el acordeón se dibuja con menos elementos (quizá ninguno)
  ([ExpansionTile](screen-components.md#accordion)).
- **`Skeleton`**: `shape` `line` (con `lines`, de 1 a 6), `block`, `circle` o `card`, con tamaño por `width`/`height`; el
  color atenuado de Kino, con un pulso suave, quieto cuando las animaciones del sistema están apagadas; se lee como
  "Cargando…" ([Skeleton](screen-components.md#skeleton)).
- **`QrImage`**: `value` de 1 a 1.000 caracteres, dibujado tal cual por el generador propio de Kino (en el aparato, sin
  red, negro sobre blanco con su margen), `size` small, medium o large. Un valor que contiene uno de los secretos de tu
  plugin nunca se dibuja (se muestra el estado vacío de Kino, con una línea en el registro); Kino solo reconoce el secreto
  tal como está guardado, no partido ni recodificado, así que nunca armes un QR con un secreto. Nunca se toca ni toma el
  foco; puede ir dentro de una ventana emergente ([QrImage](screen-components.md#qr)).
- **`NumberStepper`** (un campo): `value`, `min`, `max` (min menor que max), `step` (1 por defecto), `decimals` (de 0 a
  6), dibujado `[ − ] valor [ + ]`; un botón en su límite está apagado; mantenerlo presionado repite, cada vez un poco más
  rápido. Su valor en `state.inputs` es texto (`"2.50"`). `editable: true` deja que la persona lo escriba con la entrada de
  solo dígitos de Kino, solo con `decimals: 0` y un `min` de 0 o más (si no, se ignora, con una línea en el registro).
  Números de máximo 1e15 hacia cualquier lado (se recortan, con una línea en el registro). Sin `bind`
  ([NumberStepper](screen-forms.md#number-stepper)).
- **`DataTable`**: sus `children` son `TableRow` (de 1 a 200, cada una `{ key?, hidden?, children: [TableCell...] }`); una
  celda es un `text` simple (`textEn`) o `children`, con `colSpan` (de 1 a 8) y `crossAxisAlignment`. `columns` (máximo
  20, cada una con un `flex`) o tantas como la fila más ancha; `header: true` hace de la primera fila el encabezado;
  `zebra: true` alterna el color de las filas; en un ancho compacto la tabla se desplaza de lado (al menos 96 dp por
  columna) salvo con `wrap: true`. Toda propiedad acepta mapas por tamaño (`colSpan: { compact: 1, expanded: 3 }`). Una
  celda nunca tiene un `ListView`, un `SingleChildScrollView` ni un `DataTable` (nada dentro de una celda se desplaza; las
  tablas no se anidan); un `ExpansionTile` sí puede ir en una. Una fila con menos celdas se completa; las celdas que pasan
  de la última columna se descartan (queda en el registro). Cada fila y cada celda cuesta un nodo. La `key` de una fila
  deja que `ui` la muestre, la esconda o la alterne. No toma el foco: en la TV el D-pad recorre lo que se puede enfocar
  dentro de sus celdas ([DataTable](screen-components.md#table)).

## En la TV: escribir texto y el foco { #tv-focus }

**El texto en la TV es una entrada simulada**, no un campo real: un `TextField` se dibuja como una fila que muestra su
valor y que, al presionarla, abre el diálogo de texto de Kino para TV con su teclado en pantalla (de varias líneas para un
`TextField` de varias líneas; el teclado de solo dígitos para un `NumberStepper` editable). El evento se dispara **una
vez, al aceptar el diálogo**: `onChanged` y después `onSubmitted`, con el valor final; no hay un evento por cada letra. Un
teclado físico en una TV confirma una vez con Enter o al perder el foco, con los mismos eventos. El celular usa campos
normales (el teclado del celular, un `onChanged` que espera a que termines de escribir). Tu código no puede saber cómo se
escribió un valor y nunca lo necesita: solo lee `device`. Dos diferencias que conviene saber: la TV manda el texto sin
recortar, y un `TextField` de varias líneas manda `onSubmitted` solo en la TV (el teclado de varias líneas del celular no
tiene botón de enviar: dale un botón). El título del diálogo es el nombre de tu plugin, dibujado por Kino. Kino nunca
autocompleta ni sugiere los datos guardados de la persona en un campo de un plugin.

**El foco es de Kino.** No nombras ningún orden de foco; el D-pad sigue el árbol, moviéndose según lo que está dibujado:

- El primer foco va al primer nodo que se puede enfocar en el orden del árbol. El `focus` de una respuesta o un `focus`
  de `ui` lo mueve.
- Un `TabBar` y una fila de `Chips` recorren sus elementos con Izquierda y Derecha; al final siguen al siguiente elemento
  enfocable de al lado **en la misma fila** (las pestañas, después un `IconButton` para actualizar) y, si no hay nada ahí,
  se quedan quietos: nunca otra fila, nunca la barra de título de Kino. La cuadrícula de doce columnas mantiene Izquierda y
  Derecha dentro de sí misma. Entrar a un `TabBar` o a una fila de `Chips`, desde cualquier lado, cae en el elemento
  elegido.
- Un `Scroll`, `ListView` o cuadrícula de títulos con una clave tuya debajo del primer `TabBar` de la pantalla (un `Row`
  de encabezado cuenta) conserva su desplazamiento por pestaña, también cuando le pones una clave distinta al cuerpo de
  cada pestaña (`newsBody`, `settingsBody`).
- Moverse a un nodo desplaza solo lo necesario para mostrarlo entero: un nodo que ya está a la vista no desplaza nada, así
  que la primera línea bajo un encabezado nunca queda medio tapada. Arriba (Abajo) sin nada más que enfocar en esa
  dirección dentro de un `Scroll` (o del cuerpo de un panel del reproductor) lo desplaza casi una página hasta su inicio
  (final), así que el texto arriba del primer elemento enfocable o abajo del último se lee solo con el D-pad; en el inicio
  (final), la tecla sale como antes.
- Los hijos apilados (un `Column` de botones y campos) llevan Abajo y Arriba al borde más cercano del vecino, así que un
  botón angosto debajo de una fila de ancho completo nunca se salta; las matrices de botones conservan sus columnas.
- Una ventana emergente mantiene el foco adentro (solo la de arriba, cuando el selector de una lista desplegable está
  encima); su primer foco es su primer nodo enfocable; si no, un cuerpo más alto que el marco (se desplaza con Abajo y
  Arriba); si no, su primer botón; si no, su botón de cerrar. Izquierda y Derecha van entre la X de Kino y tus botones;
  Atrás la cierra y el foco vuelve a lo que la abrió.
- Cada acción enfocada tiene el anillo de Kino, y solo ella: nunca el marco de una ventana emergente, un cuerpo que se
  desplaza ni ningún otro contenedor. Lo mismo en cualquier panel del reproductor, clásico o en modo pantalla: un texto,
  una sección, un estado, una imagen o un QR no toman el foco en la TV (Arriba y Abajo pasan página). Un `NumberStepper`
  se mueve entre −, el valor (solo si es editable) y + con Izquierda y Derecha, y sus botones en el límite siguen siendo
  enfocables (dibujados apagados), así que mantener OK nunca pierde el foco. El encabezado de un `ExpansionTile` toma el
  foco y OK lo abre o cierra; Abajo desde un encabezado abierto entra a su contenido. Un `QrImage` y un `DataTable` simple
  no lo toman.
- La acción de un aviso se alcanza con Abajo desde el final del árbol, o se ejecuta con la tecla Menú o Play/Pausa del
  control.
- Un cuadro nuevo que quitó el nodo enfocado (la vista nueva de una respuesta): el foco va al elemento enfocable que ahora
  está en su lugar o después; si no, al último antes; si no hay ninguno, un `Scroll` (o el cuerpo de un panel del
  reproductor) que se desplaza toma el foco él mismo, sin anillo, para que el D-pad lo siga leyendo. Gana el `focus` de una
  respuesta. Dentro de un panel del reproductor, el texto de la TV es un paso más pequeño que el de una pantalla completa
  (`h1` del tamaño de `h3` ... `p` 15 sp); en el celular no cambia.
- Atrás: primero la ventana abierta, después una ruta empujada, después la pantalla.

Diseña primero para la TV: pocas paradas de foco, la acción importante primero, filas cortas, y `onLongPress` solo para
extras a los que la persona también puede llegar de otra forma.

## Límites de las pantallas { #limits }

| Qué | Límite |
| --- | --- |
| Un árbol | profundidad 10, 600 nodos (el encabezado de un acordeón, la fila y la celda de una tabla cuentan como uno cada uno); en un panel en modo pantalla, profundidad 6 y 200 nodos |
| Listas | 500 elementos en una lista, fila de títulos, cuadrícula, acordeón o en las `options` de una elección; 1000 títulos en todo un árbol, 60 en una fila o cuadrícula dibujada entera (dentro de un desplazamiento, una lista, una ventana emergente o una celda de tabla) |
| Textos y claves | un texto, 2.000 caracteres; `testKey`, 64; el `trailingLabel` de un campo de texto, 40; un `ref`, 4.096; el `label` de la entrada del menú, 20; el del botón de ajustes, 40 |
| Estado | 64 KB en JSON (un parche más grande se rechaza y se conserva el estado anterior) |
| Llamadas | `screen` y `screenEvent`, 20 s cada una; eventos de a uno, separados al menos 100 ms, máximo 8 en espera |
| Respuestas | 8 operaciones `ui` por acción o respuesta; 32 ajustes por `config`; 1 ventana emergente a la vez; 3 botones en un diálogo; 8 elementos en un menú; 2 botones en un `heroCard` |
| Diseño | `flex` de 1 a 12; `columns` de 1 a 8; la fila de doce columnas: 12 columnas |
| Patrones (formularios) | un patrón de máximo 200 caracteres, una cuenta de máximo 1.000, 500 pasos con las cuentas expandidas (y 20.000 unidades de trabajo para leerlo); un envío corre máximo 16 patrones y 4.000.000 de pasos del motor (pasado cualquiera, el resto pasa) |
| Temporizadores (`every`) | 3 por pantalla, cada 1.000 ms a 86.400.000 ms (un día); 3 fallas seguidas apagan uno; el `config` de un tic escribe un ajuste máximo una vez cada 60 s |
| Avisos | se muestran de 2.000 a 8.000 ms (por defecto 3.500) |
| `QrImage` | `value` de 1 a 1.000 caracteres |
| `NumberStepper` | máximo 6 decimales; números de máximo 1.000.000.000.000.000 hacia cualquier lado |
| `Skeleton` | de 1 a 6 líneas |
| `DataTable` | 200 filas, 20 columnas, `colSpan` de 1 a 8 |
| `go` | `route` 64 caracteres, `args` 4.096 bytes; `titleByIds`: `tmdb` de 1 a 2.147.483.647, `season` de 0 a 999, `episode` de 1 a 9999, `year` de 1870 a 2100, `title` 120; `url`: `href` 2.048, `title` 60, un enlace por segundo para todos los plugins y 10 por minuto por plugin, un código QR de hasta 1.000 caracteres; `copy`: `text` de 500 caracteres en 6 líneas, `label` 40, una copia cada 500 ms y 20 por minuto por plugin; máximo un `go` que abre una página cada 500 ms |
| Búsqueda | `q` de 200 caracteres |

Todo lo demás (`kino.fetch`, `kino.storage`, la memoria) son los límites habituales del plugin
([Límites del motor](engine-limits.md#limits)). Todos los números de las pantallas juntos también están en
[Límites](screen-reference.md#limits).

## Capacidades que van con las pantallas { #consent }

Una pantalla no agrega ninguna línea de consentimiento. Las capacidades de abajo sí agregan alcance, así que Kino se lo
pregunta a la persona **con sus propias palabras**, que no puedes cambiar ni esconder:

| Capacidad | Lo que lee la persona | En rojo, espera aprobación | El interruptor de la persona (tu pestaña en Ajustes) |
| --- | --- | --- | --- |
| `screen` | nada: no tiene línea propia | no | ninguno |
| `library` | "Podrá leer lo que has visto y guardado en Kino, y enviarlo a sus servicios" | sí | "Dejar que lea lo que he visto y guardado" |
| `playerPanelTab` | "Su pestaña en el reproductor verá lo que estás viendo (título, año, identificadores y posición, o el canal en vivo) mientras la tengas abierta, y podrá enviarlo a sus servicios" | sí | "Mostrar en el reproductor" |
| `playerControl` | "Podrá pausar, reanudar y mover tu video por sí solo" | sí | "Dejar que pause y mueva mi video" |
| `room` | "Podrá abrir una sala a la que se entra por internet a través de este aparato, y enviar los mensajes de la sala a quienes entren" | sí | "Dejar que abra salas por internet" |
| `schedule` | "Podrá ejecutarse en segundo plano cada cierto tiempo para actualizar sus datos, usando internet y batería" | sí | "Dejar que trabaje en segundo plano" |
| `ai` | "Podrá enviar texto a un servicio de IA de terceros (Kilo) para que lo resuma o clasifique; lo que envíe sale de tu aparato" | sí | "Dejar que use la IA de texto" |
| `shared` | "Guarda unos pocos resultados que se sincronizan entre tus aparatos vinculados" | no | ninguno |

- Una línea en rojo se pregunta al instalar y otra vez en la actualización que la agrega, y **Kino nunca la aprueba por su
  cuenta**; la importación del kit la deja sin marcar. Hasta que la persona la aprueba, la API se niega
  (`permission_denied`, `refused`), así que maneja siempre la negativa y funciona sin ella.
- Cada interruptor está en la pestaña de tu plugin en Ajustes, vale para todo el aparato y todos los perfiles, y se
  sincroniza con los otros aparatos de la persona; apagado, la API se niega en el acto (una sala se cierra, el trabajo de
  un job se cancela).
- Sé honesto también en tu propia interfaz: di qué mandas y adónde (los ajustes del ejemplo de noticias dicen "Los
  titulares se envían al servicio de IA de terceros de Kino").
- Estas líneas son la salvaguarda, no un muro técnico: un plugin que puede hacer peticiones puede mandar a sus hosts lo que
  lee. Por eso la hoja muestra tus hosts junto a la línea.

Cada capacidad tiene su propia página:

| Capacidad | Qué da | Dónde |
| --- | --- | --- |
| `room` | Un buzón de corta vida alojado en el propio aparato de la persona y alcanzable por internet: una sala a la que otros entran. | [Salas](rooms.md#room) |
| `library` | Lo que el perfil activo vio y guardó (títulos e ids, nunca streams ni 18+). | [Biblioteca](rooms.md#library) |
| `playerControl` | Pausar, reanudar y mover el video desde un panel (el tuyo o una pestaña que aportas). | [Control del reproductor](rooms.md#player-control) |
| `schedule` (`jobs`, `job(ctx)`) | Trabajos en segundo plano que actualizan lo que muestran tu pantalla o tu catálogo. | [Trabajos](jobs-and-shared.md#jobs) |
| `shared` | Unos pocos resultados que se sincronizan entre los aparatos vinculados de la persona. | [Compartido](jobs-and-shared.md#shared) |
| `ai` | Un texto corto a la IA de texto de Kino, para resumir o clasificar. | [IA](jobs-and-shared.md#ai) |
| `qrScan` | `kino.qr.scan` desde un `screenEvent` que sigue a un toque o envío de la persona. | [QR](qr.md) |
| `playerPanelTab` | Tu pestaña en el panel del reproductor del título de cualquier plugin. | [Pestaña aportada](player-panel.md#contributed-tab) |
| `kino.fetch` `maxBytes` / `stopAt` | Leer solo el principio de una página. | [`kino.fetch`](kino-api.md#fetch) |
| `enhancements` | Pantallas y las demás funciones de apiVersion 14 para un plugin que conserva un apiVersion anterior; en una actualización, los consentimientos nuevos primero. | [Pantallas sin subir tu apiVersion](enhancements.md) |

## Probar pantallas con el kit { #testing }

```
node sdk/validate.mjs <folder>                                    # the manifest, the exports, every consent line, enhancements
node sdk/run.mjs <folder> screen                                  # the tree as Kino reads it (aliases resolved, drops logged)
node sdk/run.mjs --device tv <folder> screen                      # as a TV
node sdk/run.mjs --state '{"inputs":{"q":"dune"}}' <folder> screenEvent search
node sdk/run.mjs --context '{"route":{"name":"categories","params":{},"args":{"from":"categories"}}}' <folder> screen
node sdk/run.mjs <folder> panel <ref>                             # a panel (legacy or screen format)
node sdk/run.mjs --state '{}' --screen <folder> panelAction <ref> <name> press
node sdk/run.mjs --foreign latino:Latino <folder> panel <ref>     # a tab you contribute to another plugin's title
node sdk/run.mjs --device phone <folder> job refresh manual       # one job run, with Kino's caps
node sdk/run.mjs --device tv <folder> screen                      # ...then read what the job shared, as the TV
node sdk/run.mjs <folder> shared                                  # what the simulated phone and TV hold
```

`run.mjs` imprime el árbol después de las reglas de Kino (con los nombres anteriores que Kino lee por dentro, y los valores
por tamaño resueltos en `byClass`), cada nodo y campo descartado, y los campos de la respuesta; `validate.mjs` revisa el
árbol y los objetos `go` como lo hace la app. Las variables de entorno `KINO_LIBRARY_FIXTURE`, `KINO_LIBRARY_REVOKED`,
`KINO_ROOM_REVOKED`, `KINO_PLAYER_CONTROL_REVOKED`, `KINO_AI_REPLY`, `KINO_AI_ERROR` y `KINO_AI_REVOKED` simulan los datos
y las decisiones de la persona. En archivos de `node --test`, importa las ayudas del kit (`createKino`,
`createKitRoom`...) como lo hacen las pruebas de los ejemplos. Los archivos de casos compartidos en `sdk/test/`
(`screen-cases.json`, `room-cases.json`, `job-cases.json`, `ai-cases.json`, `shared-cases.json`,
`player-control-cases.json`, `panel-foreign-cases.json`, `qr-origin-cases.json`) son los mismos casos que corren las
pruebas propias de Kino. Más sobre el kit en [Probar en local](test-locally.md).

## Patrones { #patterns }

- **Arma con funciones simples.** Una pantalla son datos: una función por pestaña o tarjeta (`newsTab(state)`,
  `card(story)`), un mapa de manejadores para `screenEvent`
  (`const on = { open, read, more, save }; return on[name]?.(ev) ?? null;`). El plugin sigue siendo un solo archivo al
  correr ([pártelo en `src/` y empaquétalo](structure.md) cuando crezca).
- **Mantén pequeño el estado.** Viaja en cada llamada y tiene un tope de 64 KB: guarda ahí ids y elecciones, y lo
  voluminoso (un feed, artículos) en `kino.storage` o `kino.shared`, leído en `screen()` por los ids.
- **Trabaja en pasos pequeños.** Nunca hagas todo en una llamada: una llamada tiene 20 s, y un job 20 s y 10 peticiones.
  Escribe una función pura, `step(cache, fetch, settings, clock, budget)`, que avance un poco una cola de trabajo (el
  siguiente lote de búsquedas, unas pocas imágenes) y se detenga en su presupuesto, guardando un cursor en la caché.
  Llámala desde el job, desde el `open` de la pantalla y desde un tic de `every`; cada llamada sigue donde se detuvo la
  anterior. Con el reloj y el presupuesto como parámetros, tus pruebas demuestran que se detiene y sigue. Un presupuesto
  más liviano en una TV (`kino.device`).
- **Cachés detrás de un adaptador.** Lee y escribe a través de un objeto pequeño (`get`, `set`) que intenta
  `kino.shared` y cae a `kino.storage` cuando falta o se niega, así el mismo código corre con o sin la capacidad, en un
  Kino anterior y en las pruebas.
- **Mostrar lo guardado mientras se actualiza.** Muestra la caché en el acto en `open` y después pide solo lo que está
  viejo; un `Skeleton` para lo que todavía no está; un `MaterialBanner` con «Reintentar» cuando falla la red, con los datos
  viejos todavía a la vista.
- **Toda entrada es poco confiable**: lo que responden `kino.shared` y una sala, una respuesta de la IA, una página que
  pediste, un valor de una versión anterior de tu plugin. Revisa formas, tamaños y campos; limpia los caracteres de
  control y de dirección de los nombres.
- **Textos en español e inglés.** Cada nodo de texto lleva su gemelo `En`; tus avisos leen `lang`. Las palabras de Kino
  son suyas (en los dos idiomas).
- **Nada de secretos donde viajan**: nunca en `kino.shared`, un mensaje de sala, un `QrImage`, una pregunta a la IA ni una
  línea del registro.
- **Revisa qué existe** (`kino.screen.names`, `typeof kino.library === "object"`...) y ten un camino sin cada capacidad:
  la persona puede negarla o apagarla.
- **La lógica vive en el plugin.** Kino trae piezas genéricas (el kit de pantallas, el anfitrión de pestañas, las salas,
  el control del reproductor, `titleByIds`, `library`, los jobs, `shared`, `ai`); una función como una Watch Party es por
  completo un protocolo del plugin encima de ellas.

## Los ejemplos { #examples }

Cinco plugins muestran esta guía en acción; cada uno tiene un README (en español e inglés) y pruebas que corren sin red.

### Galería { #example-gallery }

[kinotvapp/kino-plugin-ui-gallery](https://github.com/kinotvapp/kino-plugin-ui-gallery) (Kino 0.9.74 y posteriores):
todos los componentes de la referencia en una sola pantalla, una pestaña por grupo (Layout, Content, Actions, Forms,
Overlays, Navigation, Data), cada componente en una sección con la clave de su ancla en la referencia, con demostraciones
interactivas (ventanas emergentes desde una respuesta y declaradas, avisos, validación de formularios, operaciones `ui`,
`bind` y `config`, `go.url`, `go.titleByIds` y `go.screen` con destinos inofensivos, un temporizador). Su
`screenshot-map.json` dice dónde está cada componente, para capturar las imágenes de la referencia desde el dibujo real.

### Noticias { #example-news }

[kinotvapp/kino-plugin-news](https://github.com/kinotvapp/kino-plugin-news) («Solo noticias»): dos pestañas.
**Noticias**: noticias sobre las películas y series que vio la persona y sobre sus propios términos, desde el RSS de Google
News, como una cuadrícula de doce columnas de tarjetas `flush` (una, dos o tres por línea) con chips de categoría; el toque
de una tarjeta lee la noticia y la respuesta abre una ventana declarada (`ui: [{ open }]`) con la imagen, el texto leído de
la página del medio (`maxBytes`) y «Ver noticia» (`go.url`; en una TV, también un QR). **Configuración**: la frecuencia,
imágenes y textos, ordenar con IA, «Usar lo que he visto» con filas que se pueden quitar, títulos de muestra, y los
términos propios de la persona agregados desde una ventana con un formulario. Muestra `library`, un job de `schedule` con
`runOn: "preferPhone"` que escribe en `kino.shared` a través de un adaptador de caché con `kino.storage` de respaldo, la
clasificación con `ai` en el job o después de «Clasificar ahora» con validación estricta y un respaldo por palabras clave,
el `fallback` de una imagen, `card.flush`, la cuadrícula de doce columnas, `bind`, un temporizador `every` que avanza la
cola de trabajo y un presupuesto para TV. Muestra sus límites con honestidad: los enlaces de los artículos de Google se
resuelven con una llamada no oficial que puede romperse. Su código está partido en `src/` y empaquetado en `plugin.js` (ver
[Estructura](structure.md)).

### Watch Party { #example-watch-party }

[kinotvapp/kino-plugin-watch-party](https://github.com/kinotvapp/kino-plugin-watch-party): «Party Chat», una pestaña
aportada al panel del reproductor del título de cualquier plugin (`playerPanelTab`), con `room`, `qrScan` y
`playerControl`. Un chat (texto de hasta 300 caracteres y ocho reacciones) y la reproducción sincronizada: el anfitrión
transmite su posición; un invitado lo sigue solo cuando su plugin de origen (`ctx.source`) y los ids del título
coinciden; si no, «Abrir este título» (`go.titleByIds`). Para compartir están las palabras y el código de la sala y un QR
con los dos. Muestra el protocolo de sala que maneja un plugin: instantáneas cada 10 s, puertas de respaldo
(`open({ code })`), una elección con un toque para cambiarse (porque `join` necesita un toque), replicación incremental
del chat, un puesto en la TV vinculado desde un celular, pares no confiables, y por qué hay que fijar la pestaña (durante
la reproducción) para que siga corriendo. Su código está partido en `src/` y empaquetado en `plugin.js` (ver
[Estructura](structure.md)).

### Calculadora { #example-calculator }

El otro extremo: sin red, sin job, sin ajustes. Una tarjeta de pantalla y veinte botones en un `Row` con `wrap: true`
(`span: 3`), con tamaños por mapas por tamaño para celular, ventana mediana y TV; una vista pura sobre `state.calc` y
funciones exportadas puras para la lógica, probadas con una tabla de 94 filas y una prueba de propiedades. En una TV el
D-pad recorre la matriz de botones: una guarda contra regresiones del foco en una cuadrícula. Cada tecla es una ida y
vuelta a JS, así que también mide la latencia del kit de pantallas.

### Flujo de configuración { #example-setup-flow }

Un inicio de sesión en tres pasos sin red: el nodo `steps` de Kino (tocar un paso hecho vuelve a él), un `QrImage` que
vence (la cuenta regresiva propia de Kino y un `onExpire` cinco segundos antes del final que dibuja un código nuevo), un
`Form` con un `TextField` enmascarado (`obscureText`) cuyo texto se escribe en el ajuste `password` propio del plugin a
través de `config` y nunca queda en el estado, y un nodo `settings` cuyo `onSaved` le avisa a la pantalla que la persona
guardó. Funciones exportadas puras, probadas con el kit.

## Límites conocidos { #known-limits }

Lo que esta versión no hace:

- El cuerpo de una ventana declarada no se puede llenar con una segunda respuesta: una respuesta no puede encadenar un
  evento, así que una noticia que necesita una petición lenta se lee antes de abrir su ventana (nada de esqueleto y
  después texto dentro de una misma ventana).
- La respuesta de cargar más todavía puede abrir una ventana emergente.
- Una pestaña aportada (una Watch Party) no funciona en listas M3U, canales propios ni otro contenido que no sea de un
  plugin, y solo corre mientras está elegida en un cajón abierto o fijado.
- `go.titleByIds` abre una serie entera (todavía sin foco en una temporada o episodio).
- Sin `bind` en un `NumberStepper`; el estado de la pantalla se borra al cerrarla. Un `TextField` enmascarado
  (`obscureText`) guarda lo que se escribió solo en memoria y solo hasta que el siguiente toque o envío de la persona lo
  lleve ([campos secretos](screen-forms.md#secret-field)).
- Una pantalla cuyos tamaños fijos son más altos que la ventana no se desplaza sola: pon la raíz dentro de un `scroll` (o
  dale tamaños por `heightClass`), como hace el ejemplo de la calculadora en horizontal.
- En un celular en horizontal, el [panel fijado](player-panel.md#pinned) ocupa el 32 % del ancho pero nunca menos de
  360 dp, así que un celular angosto queda cerca de 59/41 (video/panel) en vez de 68/32.
- La fijación dura una reproducción: salir del reproductor la olvida.
- Cuando ni siquiera las filas apiladas de botones del reproductor caben (un área de video muy angosta), los botones menos
  importantes pasan a una fila más debajo de ellas, no a un menú «⋮».
