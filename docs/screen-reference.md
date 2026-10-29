# Referencia de pantallas: datos, estilo y recetas { #screen-reference }

!!! note "Disponible con Kino 0.9.74"
    Disponible con Kino 0.9.74 (la próxima versión, aún no publicada). Una versión anterior de Kino rechaza estos
    plugins con «Este plugin necesita una versión más nueva de Kino»; para seguir llegando a quien tiene una versión
    anterior usa `enhancements` (ver [Pantallas sin subir tu apiVersion](enhancements.md)).

Esta es la tercera parte del catálogo de componentes de las [pantallas](screens.md) de un plugin:

- [Disposición, contenido y acciones](screen-components.md): `Column`, `Row`, `Card`, `Text`, `Image`, botones,
  `ListTile`, las tarjetas de títulos de Kino y las operaciones locales `ui`.
- [Formularios, superpuestos y navegación](screen-forms.md): `Form`, las entradas, `bind` y `config`, ventanas
  emergentes, avisos y `go`.
- **Esta página**: cómo fluyen los datos y los eventos (estado, entradas, eventos, respuestas, temporizadores), los
  valores por tamaño, los nombres al estilo Flutter, cada propiedad de estilo y cada token, los límites y recetas para
  copiar.

La guía, [Pantallas](screens.md), explica el bloque `screen` del manifiesto, las exportaciones `screen()` y
`screenEvent()`, el foco en la TV y cómo probar con el kit. El
[ejemplo de la galería](https://github.com/kinotvapp/kino-plugin-ui-gallery) pone en marcha todos los componentes.

## Datos y comportamiento { #data-and-behavior }

### Estado { #state }

**El estado vive en Kino.** Tu entorno de ejecución se cierra tras un rato sin actividad, así que nada de lo que guardes en
una variable sobrevive: Kino guarda el estado de la pantalla, lo entrega en cada llamada y vuelve a llamar a `screen()`
después de cada respuesta que trae un parche de `state`. Un parche se fusiona clave por clave (`null` borra una clave). Como
máximo 64 KB; vive solo mientras la pantalla está abierta esta vez (lo que deba sobrevivir, guárdalo en `kino.storage`).
`screen()` es una vista pura: nada de red ahí.

```json
{ "state": { "count": 3, "selected": null } }
```

### Entradas (`state.inputs`) { #inputs }

`state.inputs` guarda cada entrada de la pantalla por su clave: lo que fijó la persona o tu código, o si no, el valor que
muestra el árbol. Para fijar lo que muestra un campo, responde `{ state: { inputs: { <key>: value } } }`: se ve al instante y
no dispara ningún evento.

| Entrada | Valor en `state.inputs` | Reglas del formulario | `bind` guarda |
| --- | --- | --- | --- |
| [`TextField`](screen-forms.md#text-field) | texto | `required`, `minLength`, `maxLength`, `pattern`, `errorText` | `text` |
| [`TextField` (varias líneas)](screen-forms.md#text-area) | texto | `required`, `minLength`, `maxLength`, `pattern`, `errorText` | `text` |
| [`DropdownButton`](screen-forms.md#dropdown) | el valor de la opción o `null` | `required`, `errorText` | `select` o `text` |
| [`Switch`](screen-forms.md#switch) | booleano | `required`, `errorText` | `toggle` |
| [`Checkbox`](screen-forms.md#checkbox) | booleano | `required`, `errorText` | `toggle` |
| [`RadioGroup`](screen-forms.md#radio-group) | el valor de la opción o `null` | `required`, `errorText` | `select` o `text` |
| [`Slider`](screen-forms.md#slider) | número | ninguna | `text` |
| [`Chips`](screen-components.md#chips) | un valor o `null` (una lista con `multiple`) | `required`, `minLength`, `maxLength`, `errorText` | `select` o `text` |
| [`NumberStepper`](screen-forms.md#number-stepper) | su valor como texto (`"2.50"`) | `required`, `errorText` | sin `bind` |

### Eventos { #events }

- Un evento a la vez por pantalla; el siguiente espera (como máximo 8 en espera), separados 100 ms, y nunca se descarta por
  llegar rápido. Un `onChanged` más nuevo del mismo campo reemplaza a uno anterior que siga esperando.
- La primera llamada después de abrir la pantalla es el evento reservado `open`: carga ahí tus datos y responde un parche de
  `state`.
- Una llamada tiene 20 s. Una llamada que se pasa del tiempo muestra el estado de error de la pantalla; tres fallos seguidos
  también. El tiempo agotado de una pantalla nunca cuenta para el «No responde» del plugin.

<a id="answer"></a>

### Respuestas { #answers }

Lo que puede responder `screenEvent` (y un temporizador, el `onClose` de una ventana emergente, el `panelAction` de un panel).
Todos los campos son opcionales; `null` significa que no hay nada que hacer. Algunas respuestas no son de la persona, así que
conservan menos: la respuesta al evento reservado `open` descarta su `go` (salvo `go.screen`), y la de un «cargar más» nunca
cambia la ruta.

| Campo | Qué hace | En la respuesta de un temporizador | En una respuesta de `onClose` | En un panel en modo pantalla |
| --- | --- | --- | --- | --- |
| `state` | un parche fusionado clave por clave (`null` borra una clave); luego `screen()` corre de nuevo | se conserva | se conserva | se conserva |
| `dialog` | un diálogo emergente: `title`, `body` (texto o nodos), como máximo 3 `buttons` | se descarta | se descarta | se descarta |
| `sheet` | una hoja inferior en el teléfono, un cajón lateral en la TV: `title`, `body` | se descarta | se descarta | se descarta |
| `menu` | una lista de 1 a 8 acciones: `items` de `{ label, icon?, onTap }` | se descarta | se descarta | se descarta |
| `toast` | un mensaje corto: un texto o `{ text, textEn?, role?, action?, ms? }` (`ms` de 2.000 a 8.000, por defecto 3.500) | se conserva | se conserva | se conserva |
| `toastEn` | el gemelo en inglés de un `toast` de texto | se conserva | se conserva | se conserva |
| `go` | algún lugar de Kino ([Navegación](screen-forms.md#navigation)) | se descarta | se descarta | se conserva |
| `route` | `{ push: name, params? }` o `{ pop: true }`: una pantalla tuya más adentro del lienzo | se descarta | se descarta | se descarta |
| `close` | `true` cierra la pantalla | se conserva | se conserva | se conserva |
| `focus` | la clave del nodo que toma el foco | se descarta | se descarta | se conserva |
| `config` | tus ajustes a escribir, como máximo 32 claves ([bind y config](screen-forms.md#bind-and-config)) | se conserva | se conserva | se conserva |
| `ui` | operaciones locales (como máximo 8); un `open` espera al árbol que pide la respuesta | se descarta | se conserva, sin `open` ni `focus` | se conserva |

<a id="every"></a>

### Temporizadores (`every`) { #timers }

La raíz de un árbol (o el `screen.every` del manifiesto) puede llevar `{ ms, event }` o una lista de ellos: Kino envía ese
evento cada `ms` mientras la pantalla está abierta, visible y Kino en primer plano. Un tic no es la pulsación de nadie: su
respuesta conserva solo `state`, `toast`, `close` y `config`; 3 fallos seguidos apagan ese temporizador; los tics nunca
cuentan para «No responde» y nunca corren mientras espera un evento de la persona.

```json
{ "type": "Column", "every": { "ms": 30000, "event": "refresh" }, "children": [{ "type": "Text", "text": "Se actualiza cada 30 s", "textEn": "Refreshes every 30 s" }] }
```

<a id="responsive"></a>

### Valores por tamaño { #per-size-values }

**Cualquier propiedad de estilo o de disposición puede ser un mapa por tamaño** `{ compact?, medium?, expanded? }` (las
clases de ventana de Material: `compact` por debajo de 600 dp, `medium` de 600 a 839, `expanded` de 840 en adelante; una TV
es `expanded`). Una clase que falta en el mapa toma la siguiente más pequeña presente, o si no, el valor por defecto de Kino.
Un nodo cuyo valor no es válido **en una sola clase se descarta entero**, y un mapa que mezcla clases con otras claves se
descarta. `devices` y `sizes` dibujan un nodo solo en algunos sitios; `ctx.device` y `ctx.size` le permiten a `screen()`
devolver otro árbol.

```json
{ "type": "GridView", "columns": { "compact": 1, "medium": 2, "expanded": 3 }, "gap": { "compact": 8, "expanded": 16 }, "padding": { "compact": 16, "expanded": 32 }, "children": [
  { "type": "Text", "text": "Solo en la TV", "textEn": "TV only", "devices": ["tv"] },
  { "type": "Text", "text": "Solo en ventanas anchas", "textEn": "Wide windows only", "sizes": ["expanded"] }
] }
```

<a id="aliases"></a>

### Nombres al estilo Flutter { #flutter-style-names }

Quien conoce Flutter encuentra los mismos nombres. Son la forma documentada; los nombres anteriores en minúsculas se siguen
aceptando y los dos dan el mismo árbol. Usa una sola forma: si un nodo trae las dos, gana la de Flutter y el choque queda en
el registro. Solo se renombran los nodos: los campos del `dialog`, `sheet` y `menu` de una respuesta, los `buttons` de un
diálogo, los `items` de un menú, la `action` de un aviso y las entradas de `options` y `tabs` conservan `label` y `onTap`.
Los componentes propios de Kino (`titleCard`, `titleRail`, `titleGrid`, `heroCard`, `emptyState`, `errorState`, `popup`,
`settings`) conservan sus nombres.

| Nombre al estilo Flutter | Nombre anterior | Implica |
| --- | --- | --- |
| `Column` | `col` |  |
| `Row` | `row` |  |
| `Stack` | `box` |  |
| `Card` | `card` |  |
| `Spacer` | `spacer` |  |
| `SizedBox` | `spacer` |  |
| `Divider` | `divider` |  |
| `SingleChildScrollView` | `scroll` |  |
| `GridView` | `grid` |  |
| `Text` | `text` |  |
| `Image` | `image` |  |
| `Icon` | `icon` |  |
| `Badge` | `badge` |  |
| `LinearProgressIndicator` | `progress` |  |
| `CircularProgressIndicator` | `loading` |  |
| `ListView` | `list` |  |
| `Button` | `button` |  |
| `ElevatedButton` | `button` | `variant: "primary"` |
| `TextButton` | `button` | `variant: "text"` |
| `IconButton` | `button` | `variant: "icon"` |
| `TextField` | `textInput` |  |
| `DropdownButton` | `dropdown` |  |
| `Switch` | `toggle` |  |
| `Checkbox` | `checkbox` |  |
| `RadioGroup` | `radioGroup` |  |
| `Slider` | `slider` |  |
| `Chips` | `chips` |  |
| `TabBar` | `tabs` |  |
| `AlertDialog` | `popup` | `kind: "dialog"` |
| `BottomSheet` | `popup` | `kind: "sheet"` |
| `PopupMenuButton` | `popup` | `kind: "menu"` |
| `Form` | `form` |  |
| `MaterialBanner` | `banner` |  |
| `ExpansionTile` | `accordion` |  |
| `Skeleton` | `skeleton` |  |
| `QrImage` | `qr` |  |
| `NumberStepper` | `stepper` |  |
| `DataTable` | `table` |  |
| `TableRow` | `tr` |  |
| `TableCell` | `td` |  |
| `FloatingActionButton` | `fab` |  |
| `ListTile` | `listTile` |  |
| `CircleAvatar` | `avatar` |  |
| `PageView` | `pageView` |  |
| `Scaffold` | `scaffold` |  |
| `AppBar` | `appBar` |  |
| `NavigationBar` | `navigationBar` |  |
| `TextField` con `multiline: true` o `maxLines` > 1 | `textArea` |  |

| Propiedad al estilo Flutter | Nombre anterior | Dónde |
| --- | --- | --- |
| `width` | `w` | cualquier nodo |
| `height` | `h` | cualquier nodo |
| `minHeight` | `minH` | cualquier nodo |
| `mainAxisAlignment` | `justify` | cualquier nodo |
| `crossAxisAlignment` | `align` | cualquier nodo |
| `flex` | `weight` | cualquier nodo |
| `borderRadius` | `radius` | cualquier nodo |
| `onChanged` | `onChange` | cualquier nodo |
| `onSubmitted` | `onSubmit` | cualquier nodo |
| `hintText` | `hint` | cualquier nodo |
| `hintTextEn` | `hintEn` | cualquier nodo |
| `labelText` | `label` | cualquier nodo |
| `labelTextEn` | `labelEn` | cualquier nodo |
| `obscureText` | `secret` | cualquier nodo |
| `onPressed` | `onTap` | solo un botón (en otro lado se ignora y queda en el registro) |
| `flex` | `weight` | una columna de `DataTable` |

### Estilo { #style }

El estilo sale de escalas fijas, nunca de valores libres; un valor fuera de su escala se descarta y queda en el registro.
Todos los nodos aceptan estas propiedades.

| Propiedad | Nombre anterior | Valores | Por tamaño |
| --- | --- | --- | --- |
| `padding` |  | 0, 4, 8, 12, 16, 24, 32, 48, o por lado `{ x, y, top, end, bottom, start }` | sí |
| `margin` |  | 0, 4, 8, 12, 16, 24, 32, 48, o por lado | sí |
| `gap` |  | 0, 4, 8, 12, 16, 24, 32, 48 | sí |
| `borderRadius` | `radius` | `none`, `small`, `medium`, `large`, `full`, o por esquina `{ topStart, topEnd, bottomStart, bottomEnd }` (la que se omite, `medium`) | sí |
| `width` | `w` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | sí |
| `height` | `h` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | sí |
| `minHeight` | `minH` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | sí |
| `fill` |  | `true`: todo el ancho del padre | sí |
| `flex` | `weight` | de 1 a 12: su parte de un `Row` o un `Column` | sí |
| `crossAxisAlignment` | `align` | `start`, `center`, `end`, `stretch`: a lo ancho del eje principal (en un `Text`, el párrafo) | sí |
| `mainAxisAlignment` | `justify` | `start`, `center`, `end`, `spaceBetween`, `spaceAround`: a lo largo del eje principal | sí |
| `color` |  | `primary`, `secondary`, `surface`, `muted`, `warning`, `error`, `onPrimary`, `primaryContainer`, `surfaceVariant` | sí |
| `span` |  | de 1 a 12 o `"auto"` (por defecto), solo en un `Row` con `wrap: true` | sí |
| `offset` |  | de 0 a 11, solo en un `Row` con `wrap: true` | sí |
| `maxWidthFraction` |  | de 0.25 a 1 en pasos de 0.05: como máximo esa parte del ancho del padre (exactamente, con `fill`) | sí |
| `alignSelf` |  | `start`, `center`, `end`, `stretch`: este hijo a lo ancho de su `Row` o `Column`, por encima del `crossAxisAlignment` del padre ([propiedades de caja y texto](#box-and-text-properties)) | sí |
| `textAlign` |  | `start`, `center`, `end`, `justify`: el párrafo de un nodo que dibuja texto (`Text`, `Button`, `Chips`, `TextField`, `TextField`, `ListTile`) | sí |
| `border` |  | `{ width?, color? }` en una caja: ancho de 0 a 8 dp (por defecto 1), un rol de color (por defecto el contorno de Kino) | sí |
| `elevation` |  | de 0 a 24 en un `Card` o un `Stack`: la sombra de Kino (también la elevación tonal de una tarjeta) | sí |
| `background` |  | un rol de color: el relleno de una caja (su contenido se lee en el color «sobre» de ese rol) | sí |
| `minWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | sí |
| `maxWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | sí |
| `maxHeight` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | sí |
| `positioned` |  | `{ top?, left?, right?, bottom?, width?, height? }` en un hijo de `Stack`: dp o `"25%"` del `Stack` ([Stack posicionado](screen-components.md#positioned)) | sí |
| `opacity` |  | de 0 a 1; por debajo de 0.38 el nodo no acepta pulsaciones ni foco ([animaciones](#animations)) | sí |
| `animate` |  | `{ duration?, curve? }` en una caja o un hijo posicionado: los cambios se deslizan ([animaciones](#animations)) | sí |

### Propiedades comunes { #common-properties }

Todos los nodos aceptan estas, además de las suyas y las de estilo.

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | texto | `auto-<n>` | no | única en la pantalla; obligatoria en entradas, ventanas emergentes, un `ExpansionTile` y un aviso que se puede descartar; el prefijo `auto-` es de Kino |
| `onTap` | acción | ninguna | no | una pulsación (la de un botón es `onPressed`) |
| `onLongPress` | acción | ninguna | no | una pulsación larga; úsala para extras a los que se llega de otra forma |
| `arg` | texto | ninguno | no | el `arg` del evento cuando la acción es solo el nombre de un evento (como máximo 4.096 caracteres) |
| `enabled` | booleano | `true` | no | `false` lo dibuja desactivado; `ui` `enable`/`disable` lo cambian |
| `hidden` | booleano | `false` | no | `true` lo empieza oculto; `ui` `show`/`hide`/`toggle` lo cambian |
| `devices` | `phone`, `tv`, `desktop` (una lista) | en todas partes | no | se dibuja solo ahí; un nombre desconocido descarta el nodo |
| `sizes` | `compact`, `medium`, `expanded` (una lista) | todos los tamaños | no | se dibuja solo en esas clases de ancho |
| `testKey` | texto | ninguno | no | de 1 a 64 caracteres, para pruebas, nunca se dibuja |
| `autofocus` | booleano | `false` | no | un nodo que toma foco: adonde va el foco cuando un dibujado lo dejó en ninguna parte ([propiedades compartidas](#shared-properties)) |
| `selected` | booleano | ninguno | no | un botón o una tarjeta con `onTap`: el aspecto de seleccionado de Kino; `ui` `set` y `toggle` (`prop: "selected"`) lo cambian |
| `badge` | `"dot"` o `{ text, textEn?, color? }` | ninguno | no | un botón, una tarjeta con `onTap`, una pestaña: un número (como máximo 12 caracteres) o un punto en su esquina superior final |
| `visible` | booleano | `true` | no | `false` lo oculta igual que `hidden: true` ([animaciones](#animations)) |
| `tooltip` | texto | ninguno | no | un nodo que hace algo: la pista de Kino (`tooltipEn`), como máximo 80 caracteres; nunca información esencial ([tooltip](screen-components.md#tooltip)) |
| `enabledAt` | epoch ms | ninguno | no | un botón, un `FloatingActionButton`, una tarjeta o un `ListTile` con `onTap`: desactivado hasta esa hora en el reloj del aparato, luego se activa solo, sin llamarte ([texto con una hora](screen-components.md#text-time)) |
| `canRequestFocus` | booleano | `false` | no | cualquier nodo: en la TV, una parada del D-pad donde el control se detiene para leerlo (el aspecto de fila de Kino, sin pulsación); se ignora donde el nodo ya toma foco y en el teléfono ([propiedades compartidas](#shared-properties)) |
| `loading` | booleano | `false` | no | un botón, un `FloatingActionButton`, una tarjeta o un `ListTile` con `onTap`: el aspecto de ocupado de Kino (un indicador giratorio, sin pulsación, se lee como ocupado); Kino también lo dibuja en el nodo pulsado mientras su llamada tarda ([pulsaciones ocupadas y lentas](screen-components.md#busy)) |

### Propiedades compartidas { #shared-properties }

Kino nunca agrega un componente por cada necesidad: una familia de nodos comparte una propiedad con un mismo significado en
todas partes.

- **`autofocus: true`** en un nodo que toma foco (un botón, una entrada, un `TabBar`, un `titleCard`, o cualquier nodo con
  `onTap` u `onLongPress`): en un dibujado (un tic o una respuesta) que dejó el foco en ninguna parte, o en un nodo que ya no
  está, el foco va al primer nodo con `autofocus` en el orden del árbol. El `focus` propio de una respuesta gana, y un nodo que
  todavía tiene el foco lo conserva. Esto es sobre todo para la TV: una pantalla que cambia con un temporizador (una descarga
  terminada, un evento en vivo que acabó) pone el control en su único camino para seguir. En un teléfono un campo de texto
  nunca recibe autofoco (ningún teclado se abre solo). En otro lado se ignora y queda en el registro.
- **`canRequestFocus: true`** (el nombre de Flutter) en cualquier nodo que no toma foco por sí mismo (un `Card` de estado, un
  `Text`, un `Row`, un `Column`, un `DataTable`, un `MaterialBanner` sin acción): en la TV se vuelve una parada del D-pad donde
  el control se detiene para leerlo, con el aspecto de fila de Kino (un tinte tonal y un subrayado de acento, nunca el anillo
  blanco), sin pulsación (OK no hace nada). Participa en Arriba, Abajo, Izquierda, Derecha y las reglas del `Scaffold` como
  cualquier parada, y un lector de pantalla lee su contenido. Se ignora en un nodo que ya toma foco y en el teléfono; nunca
  por tamaño. Receta, una tarjeta de estado como parada de lectura en la TV:
  `{ "type": "Card", "key": "status", "canRequestFocus": true, "children": [ ... ] }`. Sin ella la TV igual muestra la
  tarjeta: un cuerpo con desplazamiento avanza por páginas (80 % de su alto) antes de que el foco pase de largo un bloque que
  todavía no se ha mostrado.
- **`selected: true | false`** en un botón (cualquier variante) o una tarjeta con `onTap`: el aspecto de seleccionado de Kino
  (tonal relleno; una tarjeta recibe un contorno en el color primario), que un lector de pantalla lee como seleccionado. Es
  estado, no una acción; `ui` `set` y `toggle` con `prop: "selected"` lo cambian sin llamarte
  ([Operaciones ui locales](screen-components.md#ui-ops)). `Chips` y `TabBar` dicen cuál está seleccionado con su `value`. En
  la TV el foco no cambia.
- **`badge`**: el valor del nodo `Badge`, `"dot"` o `{ text, textEn?, color? }` (un número o una palabra corta, como máximo 12
  caracteres; `color` un rol de color, por defecto el primario de Kino), en un botón, una tarjeta con `onTap`, una pestaña de
  `TabBar` (en su entrada de `tabs`) y una pestaña del cajón de un panel (en los `tabs` del resultado del panel). Se pone en la
  esquina superior final del nodo (junto a la etiqueta de una pestaña) y un lector de pantalla lo lee después del nombre del
  nodo («Chat, 3»; un punto se lee «nuevo»). Ponlo en cada dibujado.

```json
{ "type": "Column", "children": [
  { "type": "TabBar", "key": "tabs", "value": "chat", "onChanged": "tab", "tabs": [
    { "value": "room", "label": "Sala", "labelEn": "Room" },
    { "value": "chat", "label": "Chat", "badge": { "text": "3" } }] },
  { "type": "Row", "gap": 8, "children": [
    { "type": "IconButton", "key": "mute", "icon": "close", "labelText": "Silencio", "labelTextEn": "Mute", "selected": true,
      "onPressed": { "ui": [{ "toggle": "mute", "prop": "selected" }], "event": "mute" } },
    { "type": "IconButton", "key": "downloads", "icon": "download", "labelText": "Descargas", "labelTextEn": "Downloads", "badge": "dot", "onPressed": "downloads" },
    { "type": "ElevatedButton", "key": "retry", "labelText": "Reintentar", "labelTextEn": "Try again", "autofocus": true, "onPressed": "retry" }] }
] }
```

`maxWidthFraction` (de 0.25 a 1 en pasos de 0.05) y `borderRadius` por esquina son de [estilo](#style): todos los nodos
aceptan el primero, y todo nodo que dibuja una caja el segundo; el anillo de foco de la TV sigue las esquinas.

<a id="box-props"></a>

### Propiedades de caja y texto { #box-and-text-properties }

Propiedades de estilo, todas por tamaño, cada una un token o un rol de color, nunca un valor libre:

| Propiedad | La aceptan | Qué hace |
| --- | --- | --- |
| `alignSelf` | un hijo de un `Row`, `Column`, `Card`, `Form` o desplazamiento | `start`, `center`, `end`, `stretch` a lo ancho de su padre, por encima del `crossAxisAlignment` del padre; en una fila `stretch` se dibuja como `start` (Kino no mide alturas intrínsecas); en otro lado, también la celda de una fila que se ajusta, se ignora y queda en el registro |
| `textAlign` | `Text`, la etiqueta de un botón, `Chips`, `TextField`, `ListTile` | `start`, `center`, `end`, `justify`; en un `Text` gana sobre la lectura anterior de `crossAxisAlignment` como párrafo. La TV dibuja sus propias entradas de campos y acciones, ajustadas a su texto: ahí se nota en un `Text` |
| `border` | una caja: `Column`, `Row`, `Stack`, `Card`, desplazamiento, `GridView`, `Form`, `ListTile`, `PageView` | `{ width?, color? }`: de 0 a 8 dp (por defecto 1; fuera de rango se ajusta al límite), un rol de color (por defecto el contorno de Kino); sigue `borderRadius`; una tarjeta seleccionada conserva el contorno primario de Kino |
| `elevation` | `Card`, `Stack` | de 0 a 24 (ajustado al límite): la sombra de Kino, que sigue la forma; una tarjeta simple además se eleva tonalmente. Sin sombras libres |
| `background` | una caja | un rol de color: el relleno (por encima de `color`, que una caja sigue leyendo como su relleno); el texto y los iconos de adentro se leen en el color «sobre» de ese rol, y un `Text` o `Icon` coloreado con un rol que no se leería sobre ese relleno se dibuja en el color legible del relleno |
| `minWidth`, `maxWidth`, `maxHeight` | cualquier nodo | la escala de tamaños, junto a `minHeight`; un mínimo mayor que su máximo descarta el máximo y queda en el registro |

```json
{ "type": "Column", "crossAxisAlignment": "start", "children": [
  { "type": "Card", "border": { "width": 2, "color": "primary" }, "elevation": 3, "maxWidth": 320, "alignSelf": "center",
    "children": [{ "type": "Text", "text": "Centrado", "textEn": "Centred", "textAlign": "center", "fill": true }] },
  { "type": "Stack", "background": "primaryContainer", "padding": 12, "children": [{ "type": "Text", "text": "Destacado", "textEn": "Highlighted" }] }
] }
```

<a id="animate"></a>

### Animaciones (`animate`, `opacity`, `visible`) { #animations }

`AnimatedContainer`, `AnimatedOpacity` y `AnimatedSwitcher` de Flutter reunidos en una sola propiedad de estilo:
`animate: { duration?, curve? }` en una caja (o un hijo `positioned`): los cambios de su tamaño, su `opacity`, su relleno, su
lugar en un `Stack` y su visibilidad entre dos dibujados se deslizan durante `duration` ms (de 100 a 600, por defecto 250,
ajustado al límite) siguiendo `curve` (`standard`, `ease`, `decelerate`). `opacity` (de 0 a 1, cualquier nodo) lo desvanece;
por debajo de 0.38 el nodo no acepta pulsaciones ni foco. `visible: false` oculta un nodo igual que `hidden: true` (`ui`
`show` y `hide` siguen funcionando); con `animate` aparece y desaparece desvaneciéndose y plegándose, y mientras se va no
acepta nada. La opción «quitar animaciones» del aparato (escala de duración de animación 0) vuelve cada una un salto; una
animación nunca retrasa una pulsación ni el foco; como máximo 24 nodos animándose por pantalla (el resto descarta `animate`
y queda en el registro).

```json
{ "type": "Card", "key": "details", "animate": { "duration": 300, "curve": "decelerate" }, "visible": true,
  "background": "surfaceVariant", "children": [{ "type": "Text", "text": "Más información", "textEn": "More details" }] }
```

### Tokens { #tokens }

| Token | Valores |
| --- | --- |
| Espaciado (`padding`, `margin`, `gap`) | 0, 4, 8, 12, 16, 24, 32, 48 |
| Tamaños (`width`, `height`, `minHeight`) | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| Esquinas (`borderRadius`) | `none`, `small`, `medium`, `large`, `full` (uno para todas las esquinas, o un mapa por esquina) |
| Roles de color (`color`) | `primary`, `secondary`, `surface`, `muted`, `warning`, `error`, `onPrimary`, `primaryContainer`, `surfaceVariant` |
| Roles (`MaterialBanner`, un `toast`) | `info`, `warning`, `error`, `success` |
| Estilos de texto (`Text.style`) | `h1`, `h2`, `h3`, `h4`, `h5`, `p`, `caption`, `label` |
| Tamaños de tarjeta (`titleCard`, `titleRail`, `QrImage`) | `small`, `medium`, `large` |
| Clases de ancho (mapas por tamaño, `sizes`) | `compact`, `medium`, `expanded` |
| Aparatos (`devices`, `ctx.device`) | `phone`, `tv`, `desktop` |
| Iconos (`Icon.name`, el `icon` de un botón) | `info`, `tune`, `settings`, `star`, `bolt`, `language`, `subtitles`, `list`, `magic`, `heart`, `movie`, `tv`, `sports`, `music`, `bookmark`, `help`, `refresh`, `sync`, `add`, `remove`, `delete`, `edit`, `search`, `close`, `check`, `share`, `play`, `pause`, `download`, `upload`, `link`, `open_in_new`, `home`, `person`, `lock`, `notifications`, `warning`, `error`, `visibility`, `copy`, `arrow_back`, `arrow_forward`, `expand_more`, `expand_less`, `more_vert`, `filter_list`, `calendar`, `schedule`, `send`, `mood` |

No están en esta versión: deslizar para actualizar, botones segmentados, autocompletado y cuadros combinados, selectores de
fecha y hora, un control deslizante de rango, una calificación, elementos de lista que se descartan o se reordenan, texto
enriquecido, gráficos, tarjetas de «seguir viendo» y de canales, y entradas de archivo. Detecta un componente que agregue un
Kino más nuevo con `kino.screen.names.includes("DataTable")`.

### Límites { #limits }

| Límite | Valor | Qué |
| --- | --- | --- |
| `maxConfigKeys` | 32 | ajustes que escribe un `config` |
| `maxDepth` | 10 | profundidad de un árbol |
| `maxNodes` | 600 | nodos en un árbol |
| `maxListItems` | 500 | elementos de una lista, fila, cuadrícula, acordeón o de las opciones de una elección |
| `maxStateBytes` | 65.536 (64 KB) | bytes del estado, como JSON |
| `maxTextChars` | 2.000 | caracteres de un texto |
| `minEventIntervalMs` | 100 | ms entre dos eventos |
| `callTimeoutMs` | 20.000 | ms por llamada a `screen` o `screenEvent` |
| `maxPopups` | 1 | ventana emergente abierta a la vez |
| `maxRefChars` | 4.096 | caracteres de un `ref` o un `arg` |
| `maxSearchQueryChars` | 200 | caracteres del `q` de un `go.search` |
| `eventQueue` | 8 | eventos en espera |
| `maxUiOps` | 8 | operaciones `ui` por acción o respuesta |
| `maxDialogButtons` | 3 | botones en un diálogo |
| `maxWeight` | 12 | el mayor `flex` |
| `maxGridColumns` | 8 | el mayor `columns` |
| `maxTestKeyChars` | 64 | caracteres de un `testKey` |
| `maxTrailingLabelChars` | 40 | caracteres del `trailingLabel` de un campo de texto |
| `maxHeroButtons` | 2 | botones en un `heroCard` |
| `maxMenuItems` | 8 | elementos de un menú |
| `maxTitles` | 1.000 | títulos en todo un árbol |
| `maxFlatTitles` | 60 | títulos en una fila o cuadrícula dibujada de una vez |
| `maxPatternChars` | 200 | caracteres de un `pattern` |
| `maxPatternRepeat` | 1.000 | la mayor repetición en un patrón |
| `maxPatternStates` | 500 | pasos de un patrón con las repeticiones expandidas |
| `maxPatternFields` | 16 | patrones que corre un envío |
| `maxPatternCompileWork` | 20.000 | unidades de trabajo para leer un patrón |
| `maxPatternMatchWork` | 4.000.000 | pasos del comparador que corre un envío |
| `minTimerMs` | 1.000 | temporizador más corto, ms |
| `maxTimerMs` | 86.400.000 | temporizador más largo, ms |
| `maxTimers` | 3 | temporizadores por pantalla |
| `timerMaxFailures` | 3 | fallos seguidos que apagan un temporizador |
| `toastMinMs` | 2.000 | `toast` más corto, ms |
| `toastMaxMs` | 8.000 | `toast` más largo, ms |
| `toastDefaultMs` | 3.500 | duración por defecto de un `toast`, ms |
| `timerConfigWriteIntervalMs` | 60.000 | ms entre dos escrituras de un mismo ajuste desde un temporizador |
| `maxQrChars` | 1.000 | caracteres del valor de un `QrImage` |
| `maxStepperDecimals` | 6 | decimales de un `NumberStepper` |
| `maxStepperAbs` | 1.000.000.000.000.000 | el mayor número de un `NumberStepper`, en positivo o negativo |
| `maxSkeletonLines` | 6 | líneas de un `Skeleton` |
| `maxTableColumns` | 20 | columnas de un `DataTable` |
| `maxTableRows` | 200 | filas de un `DataTable` |
| `maxColSpan` | 8 | el mayor `colSpan` |
| `gridColumns` | 12 | columnas de la fila de doce columnas |
| `maxGoRouteChars` | 64 | caracteres del `route` de un `go.screen` |
| `maxGoArgsBytes` | 4.096 (4 KB) | bytes de los `args` de un `go.screen`, como JSON |

## Panel del reproductor { #player-panel }

El panel del reproductor se puede armar con los mismos nodos: `panel(context)` puede devolver
`{ format: "screen", root, ... }`, un árbol de pantalla dentro del cajón de Kino. Todo lo que hace falta está en
[El panel del reproductor](player-panel.md):

- [el panel en modo pantalla](player-panel.md#screen-mode): el resultado, el texto más pequeño en la TV, qué campos de la
  respuesta conserva;
- [pestañas aportadas](player-panel.md#contributed-tab) (`playerPanelTab`): tu pestaña en el panel del título de cualquier
  plugin;
- [el panel fijado](player-panel.md#pinned): acoplado junto al video;
- [`layout: "fill"`](player-panel.md#layout-fill) y un `ListView` con `stickToBottom`: una pestaña de chat cuya fila de
  escritura se queda abajo del panel.

## Recetas { #recipes }

Copia, pega, adapta. Cada una es un `screen` completo (y su `screenEvent` cuando tiene eventos); el
[ejemplo de la galería](https://github.com/kinotvapp/kino-plugin-ui-gallery) pone en marcha la mayoría.

### Cuadrícula de tarjetas de noticias { #recipe-news-grid }

Una tarjeta por línea en un teléfono, dos en una ventana mediana, tres en una TV; tarjetas sin margen interno con una imagen y
un respaldo; un toque lee la noticia en una ventana emergente declarada que abre la respuesta.

```js
const STORIES = [
  { id: "a", title: "Un estreno", source: "Kino", image: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg" },
  { id: "b", title: "Otra noticia", source: "Guía", image: "" },
];

export async function screen({ state }) {
  const reading = STORIES.find((s) => s.id === state.reading);
  const card = (s) => ({
    type: "Card", key: "story-" + s.id, flush: true, span: { compact: 12, medium: 6, expanded: 4 }, onTap: { event: "read", arg: s.id },
    children: [
      { type: "Image", ...(s.image ? { url: s.image } : {}), aspect: "16:9", alt: s.title, fallback: { type: "Stack", color: "surface", children: [{ type: "Text", text: s.source, style: "h3", padding: 12 }] } },
      { type: "Column", padding: 12, gap: 4, children: [{ type: "Text", text: s.title, style: "h4", maxLines: 3 }, { type: "Text", text: s.source, style: "caption", color: "muted" }] },
    ],
  });
  return { type: "Column", children: [
    { type: "SingleChildScrollView", flex: 1, children: [{ type: "Row", wrap: true, gap: 12, padding: 16, children: STORIES.map(card) }] },
    { type: "AlertDialog", key: "story", title: reading ? reading.title : "", onClose: "closed", children: [{ type: "Text", text: reading ? reading.source : "…" }] },
  ] };
}

export async function screenEvent({ name, arg }) {
  if (name === "read") return { state: { reading: arg }, ui: [{ open: "story" }] };
  if (name === "closed") return { state: { reading: null } };
  return null;
}
```

### Formulario de ajustes con validación { #recipe-settings-form }

Un formulario cuyo envío Kino revisa primero; la respuesta escribe tus ajustes con `config` (el manifiesto declara `greeting`
como un ajuste `text` y `density` como un `select`).

```js
export async function screen() {
  return { type: "SingleChildScrollView", children: [{ type: "Form", key: "prefs", onSubmitted: "save", gap: 12, padding: 16, children: [
    { type: "TextField", key: "greeting", labelText: "Saludo", labelTextEn: "Greeting", required: true, maxLength: 40, pattern: "^[A-Za-z ]+$", errorText: "Solo letras", errorTextEn: "Letters only" },
    { type: "RadioGroup", key: "density", labelText: "Densidad", value: "normal", options: [{ value: "compact", label: "Compacta" }, { value: "normal", label: "Normal" }, { value: "roomy", label: "Amplia" }] },
    { type: "ElevatedButton", labelText: "Guardar", labelTextEn: "Save", submit: true },
  ] }] };
}

export async function screenEvent({ name, value }) {
  if (name !== "save") return null;
  return { config: { greeting: value.greeting, density: value.density }, toast: "Guardado", toastEn: "Saved" };
}
```

### Ventana de confirmación { #recipe-confirm }

La forma rápida es el `confirm` de un botón (Kino pregunta y luego corre la acción); la forma a tu medida es un diálogo desde
la respuesta.

```js
export async function screen({ state }) {
  return { type: "Column", gap: 12, padding: 16, children: [
    { type: "Text", text: state.deleted ? "Lista borrada" : "Tu lista" },
    { type: "TextButton", labelText: "Borrar (rápido)", confirm: "¿Borrar la lista?", confirmEn: "Delete the list?", onPressed: "delete" },
    { type: "Button", variant: "secondary", labelText: "Borrar (diálogo)", onPressed: "ask" },
  ] };
}

export async function screenEvent({ name }) {
  if (name === "ask") return { dialog: { title: "¿Borrar la lista?", body: "No se puede deshacer.", buttons: [{ label: "Borrar", event: "delete", variant: "primary" }, { label: "Cancelar", variant: "text" }] } };
  if (name === "delete") return { state: { deleted: true }, toast: { text: "Borrada", role: "success" } };
  return null;
}
```

### Pestañas con chips { #recipe-tabs-chips }

Un `TabBar` cuyo valor guardas en tu estado, y `Chips` que filtran la lista de la pestaña.

```js
const ALL = [{ t: "Big Buck Bunny", k: "movies" }, { t: "Sintel", k: "movies" }, { t: "Una serie", k: "series" }];

export async function screen({ state }) {
  const tab = state.tab === "saved" ? "saved" : "all";
  const filter = typeof state.inputs?.kind === "string" ? state.inputs.kind : "any";
  const list = ALL.filter((x) => filter === "any" || x.k === filter);
  return { type: "Column", children: [
    { type: "TabBar", key: "tabs", value: tab, onChanged: "tab", tabs: [{ value: "all", label: "Todo", labelEn: "All" }, { value: "saved", label: "Guardado", labelEn: "Saved" }] },
    { type: "Chips", key: "kind", value: filter, padding: 8, options: [{ value: "any", label: "Todo" }, { value: "movies", label: "Películas" }, { value: "series", label: "Series" }], onChanged: "filter" },
    { type: "ListView", key: "list", flex: 1, items: list.map((x, i) => ({ type: "Text", key: "x" + i, text: x.t, padding: 12 })), empty: { type: "emptyState", title: "Nada", titleEn: "Nothing" } },
  ] };
}

export async function screenEvent({ name, value }) {
  if (name === "tab") return { state: { tab: value } };
  if (name === "filter") return { state: {} }; // the chip's value is already in state.inputs: just draw again
  return null;
}
```

### Matriz de botones (estilo calculadora) { #recipe-matrix }

Botones en una fila de doce columnas, tres columnas cada uno (cuatro por línea), cada uno con su propia `key` y con tamaño
por clase: en una TV el D-pad la recorre como una matriz. Un plugin de calculadora completo se arma de la misma forma.

```js
const KEYS = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "C", "0", ".", "+"];

export async function screen({ state }) {
  const shown = typeof state.shown === "string" ? state.shown : "0";
  return { type: "Column", gap: 12, padding: 16, children: [
    { type: "Card", variant: "filled", children: [{ type: "Text", text: shown, style: "h1", crossAxisAlignment: "end" }] },
    { type: "Row", wrap: true, gap: 8, children: KEYS.map((k, i) => ({
      type: "Button", key: "k" + i, variant: /\d|\./.test(k) ? "secondary" : "primary", labelText: k,
      onPressed: "key", arg: k, span: 3, fill: true, height: { compact: 80, medium: 64, expanded: 48 },
    })) },
  ] };
}

export async function screenEvent({ name, arg, state }) {
  if (name !== "key") return null;
  const now = typeof state.shown === "string" ? state.shown : "0";
  return { state: { shown: arg === "C" ? "0" : (now === "0" ? "" : now) + arg } };
}
```

### Una pantalla con barra superior, pestañas y botón flotante { #recipe-scaffold }

Una raíz `Scaffold`: la barra con un botón para volver, una acción de búsqueda y dos pestañas; una lista perezosa en el
cuerpo; un botón «Nueva» encima de una barra inferior de tres secciones. Tu estado guarda la pestaña y la sección (ninguna
está en `state.inputs`).

```js
export async function screen({ state }) {
  const tab = state.tab === "saved" ? "saved" : "all";
  const section = ["home", "lists", "me"].includes(state.section) ? state.section : "home";
  const rows = (tab === "saved" ? ["Guardado 1"] : ["Uno", "Dos", "Tres"]).map((t, i) => ({ type: "ListTile", key: "r" + i, title: t, onTap: "show", arg: String(i) }));
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar", title: "Mis listas", titleEn: "My lists",
      leading: { type: "IconButton", icon: "arrow_back", labelText: "Atrás", labelTextEn: "Back", onPressed: { close: true } },
      actions: [{ type: "IconButton", icon: "search", labelText: "Buscar", labelTextEn: "Search", onPressed: "search" }],
      bottom: { type: "TabBar", key: "tabs", value: tab, onChanged: "tab", tabs: [{ value: "all", label: "Todo", labelEn: "All" }, { value: "saved", label: "Guardado", labelEn: "Saved" }] },
    },
    body: { type: "ListView", key: "rows", items: rows },
    floatingActionButton: { type: "FloatingActionButton", icon: "add", labelText: "Nueva", labelTextEn: "New", onPressed: "newList" },
    bottomNavigationBar: { type: "NavigationBar", value: section, onChanged: "section", items: [
      { key: "home", icon: "home", label: "Inicio", labelEn: "Home" },
      { key: "lists", icon: "list", label: "Listas", labelEn: "Lists" },
      { key: "me", icon: "person", label: "Yo", labelEn: "Me" },
    ] },
  };
}

export async function screenEvent(e) {
  if (e.name === "tab") return { state: { tab: e.value } };
  if (e.name === "section") return { state: { section: e.value } };
  return null;
}
```

### Pestañas en la barra superior { #recipe-app-bar-tabs }

La barra de título propia de Kino ya nombra la pantalla, así que la barra superior puede llevar las pestañas mismas: un
`TabBar` como `title`, junto a las acciones, de una fila de alto.

```js
export async function screen({ state }) {
  const tab = ["account", "connection", "help"].includes(state.tab) ? state.tab : "account";
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      title: { type: "TabBar", key: "tabs", value: tab, onChanged: "tab", tabs: [
        { value: "account", label: "Cuenta", labelEn: "Account" },
        { value: "connection", label: "Conexión", labelEn: "Connection" },
        { value: "help", label: "Inicio y ayuda", labelEn: "Start and help" },
      ] },
      actions: [
        { type: "IconButton", icon: "refresh", labelText: "Actualizar", labelTextEn: "Refresh", onPressed: "refresh" },
        { type: "IconButton", icon: "help", labelText: "Ayuda", labelTextEn: "Help", onPressed: "help" },
      ],
    },
    body: { type: "SingleChildScrollView", children: [{ type: "Column", padding: 16, gap: 12, children: [{ type: "Text", text: "Pestaña: " + tab }] }] },
  };
}

export async function screenEvent(e) {
  return e.name === "tab" ? { state: { tab: e.value } } : null;
}
```
