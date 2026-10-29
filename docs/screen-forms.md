# Componentes de pantalla: formularios, ventanas y navegación { #screen-forms }

!!! note "Disponible con Kino 0.9.74"
    Disponible con Kino 0.9.74 (la próxima versión, aún no publicada). Una versión anterior de Kino rechaza estos
    plugins con «Este plugin necesita una versión más nueva de Kino»; para seguir llegando a quien tiene una versión
    anterior usa `enhancements` (ver [Pantallas sin subir tu apiVersion](enhancements.md)).

Esta es la segunda parte del catálogo de componentes de una [pantalla](screens.md): los campos y formularios, las
ventanas emergentes y todo lo que un nodo puede abrir con `go`. El catálogo tiene tres páginas:

- [Disposición, contenido y acciones](screen-components.md): de `Column` a `ListTile`, de `Text` a `heroCard`, de los
  botones a las operaciones `ui`.
- **Formularios, ventanas y navegación** (esta página): de `Form` a `bind` y `config`, de `Dialog` a `anchor`, cada forma
  de `go` y las rutas.
- [Datos, comportamiento y recetas](screen-reference.md): estado, campos, eventos, respuestas, temporizadores, valores por
  tamaño, estilo, propiedades comunes, animaciones, límites y las recetas.

Qué es una pantalla, cómo se declara y cómo responde está en la guía, [Pantallas](screens.md).

## Formularios { #forms }

Los campos guardan valores que Kino mantiene en `state.inputs` por clave ([Campos](screen-reference.md#inputs)). Dentro
de un `Form` además llevan reglas que **Kino revisa antes de que nada llegue a tu código**.

### Form { #form }

Campos con un solo envío: un botón con `submit: true` revisa cada campo, muestra los errores debajo de cada uno que falla
y enfoca el primero; solo un formulario válido corre el `onSubmitted` del formulario, cuyo `value` del evento trae cada
campo por clave.

![Un formulario en el teléfono](assets/ui/form-phone.png)
![Un formulario en el televisor](assets/ui/form-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `children` | nodos (entre ellos sus campos)[] | ninguno | no | sus hijos, dibujados en orden |
| `onSubmitted` | acción | obligatorio | no | corre solo cuando todos los campos pasan; el `value` de su evento trae cada campo por clave |

```json
{ "type": "Form", "key": "contact", "onSubmitted": "send", "gap": 12, "children": [
  { "type": "TextField", "key": "email", "kind": "email", "labelText": "Correo", "labelTextEn": "Email", "required": true,
    "pattern": "^[^@\\s]+@[^@\\s]+\\.[A-Za-z]{2,}$", "errorText": "Revisa el correo", "errorTextEn": "Check the email" },
  { "type": "TextField", "key": "msg", "labelText": "Mensaje", "labelTextEn": "Message", "multiline": true, "maxLength": 500, "required": true },
  { "type": "Checkbox", "key": "ok", "labelText": "Acepto", "labelTextEn": "I agree", "required": true },
  { "type": "ElevatedButton", "labelText": "Enviar", "labelTextEn": "Send", "submit": true }
] }
```

```js
export async function screen() {
  return { type: "Form", key: "contact", onSubmitted: "send", gap: 12, children: [
    { type: "TextField", key: "name", labelText: "Nombre", required: true, minLength: 2 },
    { type: "ElevatedButton", labelText: "Enviar", submit: true },
  ] };
}

export async function screenEvent({ name, value }) {
  if (name !== "send") return null;
  return { state: { sentBy: value.name }, toast: "Enviado", toastEn: "Sent" }; // value: every field by key, already checked
}
```

- **Televisor:** el error lleva el foco al primer campo que falla.
- **Teléfono y televisor:** las mismas reglas; solo cambia cómo se escribe el texto ([TextField](#text-field)).
- **Límites y errores comunes:** un formulario sin `onSubmitted` se descarta; los formularios no se anidan (escribe dos
  hermanos); la ventana de una respuesta no lleva ninguno (una declarada sí). Enter no envía un formulario.

### TextField { #text-field }

Un campo de texto: un nombre, una caja de búsqueda, un correo. `kind` elige el teclado (`text`, `number`, `email`, `url`,
`search`). `onSubmitted` es la acción del teclado; `onChanged` avisa los cambios. Un `trailingIcon` (uno de los
[iconos](screen-components.md#icon-names) de Kino) se dibuja dentro de la caja del campo, al final: el «Enviar» de un chat
o la lupa de una búsqueda. Su `onTrailingTap` se envía como `onSubmitted`, con lo que el campo tiene en ese momento como
`value` del evento, y `trailingLabel` (`trailingLabelEn`, máximo 40 caracteres) es lo que dice un lector de pantalla para
él.

![Un campo de texto en el teléfono](assets/ui/text-field-phone.png)
![Un campo de texto en el televisor](assets/ui/text-field-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `hintText` | string | ninguno | no | una pista dentro o debajo (`hintTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `kind` | `text` \| `number` \| `email` \| `url` \| `search` | `text` | no | el teclado; no hay tipo contraseña (un campo enmascarado es `obscureText`) |
| `value` | string | `""` | no | el texto inicial (gana lo que tenga `state.inputs`); se ignora en un campo `obscureText` |
| `obscureText` | boolean | `false` | no | enmascarado como una contraseña en teléfono y televisor, con el mostrar / ocultar de Kino; nunca en tu estado, enviado solo con el toque o el envío de la propia persona, y luego borrado ([campos secretos](#secret-field)); solo de una línea; solo se vincula a un ajuste `password` |
| `maxLength` | 1 a 2.000 | 2.000 | no | también es regla de formulario |
| `onSubmitted` | acción | ninguno | no | la acción del teclado (Enter); en el televisor, el aceptar del diálogo de texto |
| `trailingIcon` | uno de los 50 [iconos](screen-components.md#icon-names) | ninguno | sí | dibujado dentro de la caja del campo, al final, teñido con `color`; nunca en un campo deshabilitado; necesita `trailingLabel` y `onTrailingTap`, si no el campo se dibuja sin él (queda en el registro) |
| `trailingLabel` | 1 a 40 caracteres | ninguno | no | lo que dice un lector de pantalla para el icono (`trailingLabelEn` en inglés); obligatorio con `trailingIcon` |
| `onTrailingTap` | acción | ninguno | no | la pulsación del icono: se envía como `onSubmitted`, con el texto actual del campo como `value` (una pulsación de la persona); en el televisor el icono es su propia parada de foco, a la derecha del campo |
| `bind` | una clave de ajuste | ninguno | no | muestra y guarda uno de tus ajustes `text` ([bind](#bind-and-config)) |
| `required` | boolean | `false` | no | regla de formulario: un texto no vacío, una opción elegida, un interruptor encendido, un chip escogido |
| `minLength` | integer | ninguno | no | regla de formulario: caracteres (chips: chips escogidos) |
| `pattern` | string | ninguno | no | regla de formulario: tiene que coincidir con el valor entero; el subconjunto seguro propio de Kino, máximo 200 caracteres ([Patrones](#pattern)) |
| `errorText` | string | el texto de Kino | no | regla de formulario: lo que la persona lee debajo del campo que falla (`errorTextEn`) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "TextField", "key": "q", "kind": "search", "labelText": "Buscar", "labelTextEn": "Search", "hintText": "Una película", "hintTextEn": "A film", "maxLength": 100, "onSubmitted": "search" }
```

```js
export async function screen({ state }) {
  return { type: "Column", gap: 8, children: [
    { type: "TextField", key: "q", kind: "search", labelText: "Buscar", onSubmitted: "search" },
    { type: "Text", text: state.query ? "Buscaste: " + state.query : "Escribe algo" },
  ] };
}

export async function screenEvent({ name, state }) {
  if (name === "search") return { state: { query: String(state.inputs.q ?? "").trim().slice(0, 100), inputs: { q: "" } } };
  return null;
}
```

El campo de un chat con su icono de enviar adentro (el icono y Enter envían el mismo evento):

```json
{ "type": "TextField", "key": "msg", "hintText": "Escribe un mensaje", "hintTextEn": "Type a message", "maxLength": 300,
  "onSubmitted": "send", "trailingIcon": "send", "trailingLabel": "Enviar", "trailingLabelEn": "Send", "onTrailingTap": "send" }
```

- **Icono al final:** los tres, `trailingIcon`, `trailingLabel` y `onTrailingTap`, o el campo se dibuja sin el icono (queda
  en el registro): un icono desconocido, una etiqueta que falta o es demasiado larga, una acción que falta o es inválida.
  `trailingIcon` puede ser un mapa por tamaño (una clase sin él no dibuja icono ahí). Nunca se muestra en un campo
  deshabilitado. Solo en un campo de una línea: un `TextField` de varias líneas lo ignora (queda en el registro).
- **Teléfono y televisor:** en el teléfono, tocar el icono envía el texto tal como está escrito, primero su cambio
  pendiente. En el televisor el icono es una parada de foco propia dentro de la caja del campo: Derecha desde el campo
  llega a él, Izquierda vuelve, Arriba y Abajo salen como desde el campo; OK sobre él envía lo que el campo tiene.
- **Televisor:** **el texto en el televisor es un campo simulado**: el campo se dibuja como una fila que muestra su valor
  y que, al pulsarla, abre el diálogo de texto de Kino para televisor con su teclado en pantalla. `onChanged` y luego
  `onSubmitted` se disparan **una vez, al aceptar el diálogo**, con el valor final, sin recortar. Un teclado físico en un
  televisor confirma con Enter o cuando el foco sale.
- **Teléfono y televisor:** el teléfono usa un campo normal y el teclado del teléfono; `onChanged`
  espera una pausa (300 ms). Tu código no puede saber cómo se escribió un valor y nunca lo necesita.
- **Límites y errores comunes:** `key` es obligatoria (una clave de campo que falta o se repite descarta el nodo). No hay
  tipo contraseña: un campo enmascarado es `obscureText: true` ([campos secretos](#secret-field)).
  Para vaciar o prellenar un campo, responde `{ state: { inputs: { q: "" } } }`. Kino nunca autocompleta los datos
  guardados de la persona.

#### Campos secretos (`obscureText`) { #secret-field }

`obscureText: true` enmascara un `TextField` de una línea como una contraseña, en el teléfono (puntos, el teclado de
contraseña, el ojo de mostrar / ocultar de Kino cuando no hay `trailingIcon`) y en el televisor (puntos en el campo, el
diálogo de texto enmascarado con su botón de mostrar / ocultar, el mismo camino con el control que cualquier campo).
Ponlo en un `Form` para revisar y enviar un token o una contraseña con un «Siguiente»:

```json
{ "type": "Form", "key": "login", "onSubmitted": "next", "children": [
  { "type": "TextField", "key": "token", "obscureText": true, "labelText": "Token", "required": true, "minLength": 20 },
  { "type": "ElevatedButton", "labelText": "Siguiente", "labelTextEn": "Next", "submit": true }
] }
```

```js
export async function screenEvent({ name, value }) {
  if (name !== "next") return null;
  const ok = /^[A-Za-z0-9_-]{20,}$/.test(value.token); // what was typed, only in this call
  return ok ? { state: { step: "done" } } : { toast: "Token no válido", toastEn: "Invalid token" }; // the field is now empty
}
```

- **A dónde va el texto:** solo con el toque o el envío de la propia persona, en `state.inputs.<clave>` y, para el
  `onSubmitted` del formulario o del propio campo (o `onTrailingTap`), en `value`. Nunca en un render de `screen()`, un
  cambio, el tic de un temporizador, `open`, un «cargar más» ni el `onClose` de una ventana.
- **Nunca se guarda:** ni en el estado de la pantalla (así que tampoco en el estado guardado de un panel del reproductor,
  en una pantalla restaurada ni en nada que se sincronice), ni en los registros de Kino ni en sus informes de fallos, ni en
  las sugerencias del teclado ni en Autofill. Cuando termina la llamada que lo llevó (respondida, fallida o vencida) el
  campo vuelve a quedar vacío, salvo que tu respuesta devuelva un texto en `state: { inputs: { <clave>: "..." } }` (solo
  se guarda en memoria) o que la persona haya escrito algo nuevo mientras tanto. Cerrar la pantalla lo olvida.
- **Sus propias reglas:** `value` del árbol y `onChanged` se ignoran (queda en el registro); un `obscureText` que no es
  `true` ni `false`, o en un campo de varias líneas, descarta el campo. Las reglas de formulario (`required`, `minLength`,
  `pattern`) revisan lo que se escribió.
- **`bind`:** solo a un ajuste `password` (y una contraseña solo se vincula a un campo secreto): el campo siempre empieza
  vacío (una contraseña nunca se lee de vuelta) y escribe lo que se escribió al confirmar; un campo vacío nunca borra la
  contraseña (usa `config: { <clave>: null }`).
- **Editar un secreto guardado:** un secreto guardado nunca se muestra, así que el campo empieza vacío. Déjalo
  `required: false` (un `pattern` o `minLength` igual revisa lo que se escribió, y un campo vacío pasa) y lee un `value`
  vacío como "conservar el guardado": escribe `config` solo cuando la persona escribió algo, y ofrece un botón aparte que
  envíe `config: { <clave>: null }` para quitarlo.

### TextField de varias líneas { #text-area }

Un `TextField` con `multiline: true` (o un `maxLines` mayor que 1 en cualquier clase de tamaño) acepta varias líneas: un
mensaje, una nota. Kino lo lee como el antiguo `textArea`.

![Un campo de varias líneas en el teléfono](assets/ui/text-area-phone.png)
![Un campo de varias líneas en el televisor](assets/ui/text-area-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `hintText` | string | ninguno | no | una pista dentro o debajo (`hintTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `multiline` | boolean | `false` | no | `true` (o `maxLines` mayor que 1) hace que un `TextField` tenga varias líneas |
| `maxLines` | integer | ninguno | no | mayor que 1 en cualquier clase de tamaño: varias líneas |
| `kind` | `text` \| `number` \| `email` \| `url` \| `search` | `text` | no | como en un campo de una línea |
| `value` | string | `""` | no | el texto inicial |
| `maxLength` | 1 a 2.000 | 2.000 | no | también es regla de formulario |
| `onSubmitted` | acción | ninguno | no | se envía solo en el televisor (el teclado de varias líneas del teléfono no tiene envío: agrega un botón) |
| `bind` | una clave de ajuste | ninguno | no | muestra y guarda uno de tus ajustes `text` ([bind](#bind-and-config)) |
| `required` | boolean | `false` | no | regla de formulario: un texto no vacío, una opción elegida, un interruptor encendido, un chip escogido |
| `minLength` | integer | ninguno | no | regla de formulario: caracteres (chips: chips escogidos) |
| `pattern` | string | ninguno | no | regla de formulario: tiene que coincidir con el valor entero; el subconjunto seguro propio de Kino, máximo 200 caracteres ([Patrones](#pattern)) |
| `errorText` | string | el texto de Kino | no | regla de formulario: lo que la persona lee debajo del campo que falla (`errorTextEn`) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "TextField", "key": "note", "labelText": "Nota", "labelTextEn": "Note", "multiline": true, "maxLength": 500 }
```

```js
export async function screen() {
  return { type: "Column", gap: 8, children: [
    { type: "TextField", key: "note", labelText: "Nota", maxLines: 4, maxLength: 500 },
    { type: "ElevatedButton", labelText: "Guardar", onPressed: "saveNote" },
  ] };
}
```

- **Televisor:** el diálogo de texto de varias líneas para televisor; `onSubmitted` se envía solo en el televisor.
- **Errores comunes:** el teclado de varias líneas del teléfono no tiene envío: dale siempre un botón al campo.

### DropdownButton { #dropdown }

Una opción entre `options` en un campo cerrado que abre un selector: un idioma, un orden, una calidad. Su valor es el
`value` de la opción (o `null` antes de elegir).

![Una lista desplegable en el teléfono](assets/ui/dropdown-phone.png)
![Una lista desplegable en el televisor](assets/ui/dropdown-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `hintText` | string | ninguno | no | una pista dentro o debajo (`hintTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `options` | `{ value, label, labelEn? }[]` | obligatorio | no | 1 a 500, valores distintos |
| `value` | string | ninguno (`null`) | no | el valor de la opción elegida |
| `bind` | una clave de ajuste | ninguno | no | muestra y guarda uno de tus ajustes `select` o `text` ([bind](#bind-and-config)) |
| `required` | boolean | `false` | no | regla de formulario: un texto no vacío, una opción elegida, un interruptor encendido, un chip escogido |
| `errorText` | string | el texto de Kino | no | regla de formulario: lo que la persona lee debajo del campo que falla (`errorTextEn`) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "DropdownButton", "key": "lang", "labelText": "Idioma", "labelTextEn": "Language", "value": "es", "onChanged": "lang", "options": [
  { "value": "es", "label": "Español", "labelEn": "Spanish" },
  { "value": "en", "label": "Inglés", "labelEn": "English" }
] }
```

```js
export async function screen() {
  const sorts = [["new", "Más reciente"], ["title", "Título"]];
  return { type: "DropdownButton", key: "sort", labelText: "Ordenar", value: "new", onChanged: "sort", options: sorts.map(([value, label]) => ({ value, label })) };
}
```

- **Televisor:** OK abre el selector de Kino; el foco se queda adentro hasta elegir o pulsar Atrás (sobre una ventana
  abierta, solo el selector recibe foco).
- **Límites y errores comunes:** 1 a 500 opciones con valores distintos. `bind` lleva un ajuste `select` o `text`.

### RadioGroup { #radio-group }

Una opción entre unas pocas `options`, todas visibles a la vez: de dos a cinco opciones que la persona debería comparar.

![Un grupo de opciones en el teléfono](assets/ui/radio-group-phone.png)
![Un grupo de opciones en el televisor](assets/ui/radio-group-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `hintText` | string | ninguno | no | una pista dentro o debajo (`hintTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `options` | `{ value, label, labelEn? }[]` | obligatorio | no | 1 a 500, valores distintos |
| `value` | string | ninguno (`null`) | no | el valor de la opción elegida |
| `bind` | una clave de ajuste | ninguno | no | muestra y guarda uno de tus ajustes `select` o `text` ([bind](#bind-and-config)) |
| `required` | boolean | `false` | no | regla de formulario: un texto no vacío, una opción elegida, un interruptor encendido, un chip escogido |
| `errorText` | string | el texto de Kino | no | regla de formulario: lo que la persona lee debajo del campo que falla (`errorTextEn`) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "RadioGroup", "key": "plan", "labelText": "Plan", "value": "free", "options": [
  { "value": "free", "label": "Gratis", "labelEn": "Free" },
  { "value": "family", "label": "Familiar", "labelEn": "Family" }
] }
```

```js
export async function screen() {
  return { type: "RadioGroup", key: "quality", labelText: "Calidad", value: "auto", onChanged: "quality", options: ["auto", "720p", "1080p"].map((value) => ({ value, label: value })) };
}
```

- **Errores comunes:** en un formulario, el error de un `RadioGroup` que falla se muestra en el grupo.

### Checkbox { #checkbox }

Una casilla con su etiqueta: "Acepto las condiciones", un elemento de una lista para escoger. En un formulario,
`required` significa marcada.

![Una casilla en el teléfono](assets/ui/checkbox-phone.png)
![Una casilla en el televisor](assets/ui/checkbox-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `value` | boolean | `false` | no | marcada o no |
| `bind` | una clave de ajuste | ninguno | no | muestra y guarda uno de tus ajustes `toggle` ([bind](#bind-and-config)) |
| `required` | boolean | `false` | no | regla de formulario: un texto no vacío, una opción elegida, un interruptor encendido, un chip escogido |
| `errorText` | string | el texto de Kino | no | regla de formulario: lo que la persona lee debajo del campo que falla (`errorTextEn`) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "Checkbox", "key": "terms", "labelText": "Acepto las condiciones", "labelTextEn": "I accept the terms", "required": true, "errorText": "Hace falta aceptarlas", "errorTextEn": "You need to accept them" }
```

```js
export async function screen({ state }) {
  return { type: "Checkbox", key: "remember", labelText: "Recordarme", value: state.inputs?.remember === true };
}
```

### Switch { #switch }

Un ajuste de encendido / apagado que se aplica en el acto. Con `bind` guarda por sí solo uno de tus ajustes `toggle`.

![Un interruptor en el teléfono](assets/ui/switch-phone.png)
![Un interruptor en el televisor](assets/ui/switch-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `value` | boolean | `false` | no | encendido o apagado |
| `bind` | una clave de ajuste | ninguno | no | muestra y guarda uno de tus ajustes `toggle` ([bind](#bind-and-config)) |
| `required` | boolean | `false` | no | regla de formulario: un texto no vacío, una opción elegida, un interruptor encendido, un chip escogido |
| `errorText` | string | el texto de Kino | no | regla de formulario: lo que la persona lee debajo del campo que falla (`errorTextEn`) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "Switch", "key": "autoplay", "labelText": "Reproducir solo", "labelTextEn": "Autoplay", "value": true, "onChanged": "autoplay" }
```

```js
export async function screen() {
  return { type: "Switch", key: "tipsSwitch", labelText: "Mostrar consejos", bind: "tips" }; // "tips" is a toggle setting of the manifest
}
```

- **Televisor:** OK lo cambia. **Errores comunes:** un `Switch` es un interruptor: para elegir entre dos opciones con
  nombre usa un `RadioGroup`.

### Slider { #slider }

Un número entre `min` y `max`, de `step` en `step`: un volumen, un nivel. Su valor en `state.inputs` es un número.

![Un deslizador en el teléfono](assets/ui/slider-phone.png)
![Un deslizador en el televisor](assets/ui/slider-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `hintText` | string | ninguno | no | una pista dentro o debajo (`hintTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `min` | number | `0` | no | menor que `max` |
| `max` | number | `100` | no | mayor que `min` |
| `step` | number | ninguno (continuo) | no | mayor que 0 y como máximo `max - min` |
| `value` | number | `min` | no | ajustado a `min..max` |
| `bind` | una clave de ajuste | ninguno | no | muestra y guarda uno de tus ajustes `text` ([bind](#bind-and-config)) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "Slider", "key": "volume", "labelText": "Volumen", "labelTextEn": "Volume", "min": 0, "max": 10, "step": 1, "value": 5, "onChanged": "volume" }
```

```js
export async function screen({ state }) {
  const v = Number.isFinite(state.inputs?.level) ? state.inputs.level : 30;
  return { type: "Column", gap: 8, children: [
    { type: "Slider", key: "level", min: 0, max: 100, step: 10, value: v, onChanged: "level" },
    { type: "Text", text: "Nivel " + v },
  ] };
}
```

- **Errores comunes:** `min` tiene que ser menor que `max` (si no, se descarta); un `step` fuera de `0..max-min` se
  descarta (queda en el registro). No tiene reglas de formulario propias; `bind` lleva un ajuste `text` (su número como
  texto).

### NumberStepper { #number-stepper }

Un número dibujado `[ − ] valor [ + ]`: asientos, porciones, un precio. Cada pulsación lo mueve de `step` en `step`, dentro
de `min`..`max` y redondeado a `decimals`; mantener un botón pulsado repite, cada vez un poco más rápido. Su valor en
`state.inputs` es **texto** (`"2.50"`). El `Stepper` de Flutter es otro widget (un asistente de pasos): ese nombre aquí
no se conoce.

![Un selector numérico en el teléfono](assets/ui/number-stepper-phone.png)
![Un selector numérico en el televisor](assets/ui/number-stepper-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | nombra el valor en `state.inputs`; única en la pantalla |
| `labelText` | string | ninguno | no | la etiqueta del campo (`labelTextEn`) |
| `hintText` | string | ninguno | no | una pista dentro o debajo (`hintTextEn`) |
| `onChanged` | acción | ninguno | no | la persona lo cambió; el `value` del evento es el valor nuevo |
| `value` | number | `min`, si no 0 | no | redondeado a `decimals`; en `state.inputs` como texto (`"2.50"`) |
| `min` | number | ninguno | no | menor que `max` |
| `max` | number | ninguno | no | mayor que `min` |
| `step` | number > 0 | `1` | no | redondeado a `decimals` |
| `decimals` | 0 a 6 | `0` | no |  |
| `editable` | boolean | `false` | no | deja que la persona lo escriba (solo dígitos); solo con `decimals: 0` y un `min` de 0 o más |
| `bind` |  |  | no | no se acepta (se ignora, queda en el registro) |
| `required` | boolean | `false` | no | regla de formulario: un texto no vacío, una opción elegida, un interruptor encendido, un chip escogido |
| `errorText` | string | el texto de Kino | no | regla de formulario: lo que la persona lee debajo del campo que falla (`errorTextEn`) |
| `forceErrorText` | string | ninguno | no | tu propio veredicto debajo del campo (`forceErrorTextEn`, máximo 200 caracteres) hasta que la persona lo edita ([validación](#validation)) |

```json
{ "type": "Column", "gap": 12, "children": [
  { "type": "NumberStepper", "key": "seats", "labelText": "Asientos", "labelTextEn": "Seats", "value": 2, "min": 1, "max": 8, "editable": true },
  { "type": "NumberStepper", "key": "price", "labelText": "Precio", "labelTextEn": "Price", "value": 2.5, "min": 0, "max": 10, "step": 0.25, "decimals": 2 }
] }
```

```js
export async function screen({ state }) {
  const seats = Number(state.inputs?.seats ?? "2"); // text in state.inputs
  return { type: "Column", gap: 8, children: [
    { type: "NumberStepper", key: "seats", value: seats, min: 1, max: 8, onChanged: "seats" },
    { type: "Text", text: "Total: " + seats * 5 },
  ] };
}
```

- **Televisor:** Izquierda y Derecha se mueven entre −, el valor (solo con `editable`) y +; un botón en su límite sigue
  recibiendo foco (dibujado apagado), así que mantener OK pulsado nunca pierde el foco. `editable` abre el teclado de solo
  dígitos del televisor.
- **Límites y errores comunes:** máximo 6 decimales; números de máximo 1e15 hacia cualquier lado (se ajustan, queda en el
  registro). `editable` solo con `decimals: 0` y un `min` de 0 o más (si no, se ignora, queda en el registro). Sin `bind`.
  Su `required` siempre pasa (siempre tiene un valor).

### Foco en el televisor { #tv-focus }

Kino dibuja en el televisor uno de dos aspectos de foco, según el tipo de nodo; un plugin nunca lo elige.

| Nodo | Foco en el televisor |
| --- | --- |
| `Switch`, `Checkbox`, cada fila de un `RadioGroup` | fila: un tinte suave sobre toda la fila y un subrayado de acento a lo largo de su borde inferior |
| `TextField` (de una línea o de varias), `DropdownButton`, `Slider` | fila |
| botones (`ElevatedButton`, `TextButton`, `IconButton`...), `FloatingActionButton` | anillo: un contorno blanco y un relleno suave |
| `Chips`, `TabBar`, elementos de `NavigationBar`, botones de `NumberStepper` | anillo |
| una `Card`, `ListTile`, `Text` o `Icon` pulsable; tarjetas de títulos | anillo |

Una fila deja al menos 16 dp entre sus bordes y su texto, así que ni el tinte ni el subrayado tocan una letra. Un lector
de pantalla lee el nodo enfocado como siempre. El nodo `settings` es el formulario de ajustes propio de Kino: sus filas de
interruptor y de opción también muestran el aspecto de fila, como toda fila y campo de ancho completo de Kino en el
televisor. En el televisor sus filas miden al menos 56 dp de alto (12 dp arriba y abajo de su texto, las opciones de un
`select` separadas 4 dp, 8 dp bajo su etiqueta), así que el subrayado de una fila enfocada nunca toca la siguiente; en el
teléfono, al menos 48 dp. Sus filas no se quedan con ninguna tecla del control: Arriba y Abajo desde su primera o última
fila siguen como desde cualquier nodo (la fila de arriba, si no una página, si no la pestaña del `AppBar`), e Izquierda y
Derecha se quedan en una fila de interruptor o de opción.

Cómo se mueve el foco por una pantalla entera está en la guía: [Foco en el televisor](screens.md#tv-focus).

### Validación { #validation }

Cada campo de un `Form` acepta las reglas que lista la [tabla de campos](screen-reference.md#inputs):

- `required`: un texto no vacío, una opción elegida, un interruptor o una casilla encendidos, un chip escogido. Un campo
  vacío que no es obligatorio pasa todas las revisiones.
- `minLength` / `maxLength`: caracteres de un texto; chips escogidos de un [`Chips`](screen-components.md#chips).
- `pattern`: un [patrón](#pattern) con el que tiene que coincidir el texto entero.
- `errorText` / `errorTextEn`: lo que la persona lee debajo del campo que falla (en el grupo, para un `RadioGroup` o unos
  `Chips`); sin él, el mensaje propio de Kino.

Los valores de los campos `hidden` o deshabilitados se envían igual, sin revisar; un campo obligatorio dentro de un
[`TableRow`](screen-components.md#table-row) oculto no se revisa.

**Tu propio veredicto:** `forceErrorText` (y `forceErrorTextEn`), el de Flutter, en cualquier campo, desde tu estado: Kino
lo dibuja debajo del campo igual que sus propios errores (el de un envío fallido gana mientras se muestra) y un lector de
pantalla lo lee con el campo. Cuando la persona edita el campo se oculta hasta tu siguiente veredicto: la respuesta a su
siguiente pulsación o envío, o un texto distinto. Máximo 200 caracteres. Nunca bloquea un envío.

```json
{ "type": "TextField", "key": "code", "kind": "number", "labelText": "Código", "labelTextEn": "Code", "forceErrorText": "El código no es válido", "forceErrorTextEn": "That code is not valid" }
```

Las reglas en un campo fuera de un formulario no se usan. El veredicto de Kino es el que cuenta: vuelve a revisar en tu
código solo lo que tu propia lógica necesite.

![Errores de validación en el teléfono](assets/ui/validation-phone.png)
![Errores de validación en el televisor](assets/ui/validation-tv.png)

### Patrones (el comparador propio de Kino) { #pattern }

**El motor de patrones es propio de Kino** (un comparador de tiempo lineal, el mismo en la app y en el kit), nunca las
expresiones regulares de la plataforma, así que un patrón hostil no puede congelar el aparato. Un patrón tiene que
coincidir con el valor **entero**, en un subconjunto seguro: literales, `.`, `^`, `$`, `|`, grupos `( )` y `(?: )`, clases
`[...]`, los escapes `\d \D \w \W \s \S \b \B \n \r \t` y la puntuación escapada, los cuantificadores
`* + ? {n} {n,} {n,m}` (opcionalmente perezosos), que se pueden anidar. Sin referencias hacia atrás ni lookarounds. Los
significados son ASCII: `\d` es `[0-9]`, `\w` `[A-Za-z0-9_]`, `\s` espacio en blanco ASCII, `.` cualquier carácter menos
un salto de línea.

| Límite | Valor |
| --- | --- |
| Un patrón | máximo 200 caracteres |
| Una cuenta (`{n,m}`) | máximo 1.000 |
| Pasos una vez expandidas las cuentas | máximo 500 (así que `[a-z]{1,600}` se rechaza: escribe `[a-z]+` y `maxLength: 600`) |
| Trabajo para leer un patrón | 20.000 unidades |
| Un envío | máximo 16 patrones y 4.000.000 de pasos del comparador; pasado cualquiera de los dos, los patrones restantes pasan |

Un patrón fuera del subconjunto se descarta (queda en el registro) y el campo sigue revisando sus otras reglas.

```js
pattern: "^[^@\\s]+@[^@\\s]+\\.[A-Za-z]{2,}$" // an email (in JSON, every backslash doubled)
pattern: "^\\d{4,6}$"                          // a code of 4 to 6 digits
pattern: "^[A-Za-z0-9 ]+$"                     // letters, digits and spaces
```

### Reglas del envío { #submit }

- El botón con `submit: true` envía; su propio `onPressed` se ignora. Se dibuja apagado mientras un campo obligatorio esté
  vacío.
- Un formulario inválido nunca llama a tu código: los errores se muestran debajo de cada campo que falla y el foco va al
  primero.
- **Enter no envía un formulario**, y el `onSubmitted` propio de un campo dentro de un formulario corre sin la revisión
  del formulario.
- Un campo obligatorio dentro de un elemento cerrado de un [`ExpansionTile`](screen-components.md#accordion) no deja el
  botón apagado, pero el envío lo revisa y, si falla, abre el elemento y lo enfoca.
- El `onSubmitted` del formulario recibe `value`: el valor de cada campo por clave (los mismos tipos que `state.inputs`).

### Nodo settings { #settings-node }

El formulario de ajustes propio de Kino para tu plugin, el mismo que muestra Ajustes, dentro de tu pantalla: todos los
tipos de ajuste, los dos idiomas, la validación, los campos de Kino para secretos y sus botones para acciones, «Enviar a
otro aparato», su propio guardado. `keys` muestra solo esos ajustes, en ese orden. Tu código nunca ve lo que se escribe
ahí; con `onSaved` se entera de que terminó un guardado o un botón de acción, nunca de los valores ([onSaved](#on-saved)).
El formulario en sí está descrito en [El formulario de ajustes](settings-form.md); la guía lo muestra dentro de una
pantalla en [Ajustes dentro de una pantalla](screens.md#settings-in-screen).

![El nodo settings en el teléfono](assets/ui/settings-phone.png)
![El nodo settings en el televisor](assets/ui/settings-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `keys` | string[] | todos los ajustes | no | solo esos ajustes, en ese orden; cada ajuste se muestra como máximo una vez por pantalla |
| `autoSave` | boolean | `false` | no | sus ajustes `toggle` y `select` se guardan al cambiar (sin `validateSettings`); si solo tiene esos, no hay Guardar ([nodo settings](#settings-node)) |
| `onSaved` | nombre de evento o `{ event, arg? }` | ninguno | no | se envía después de que el formulario de Kino aquí guardó (Guardar, o un autoguardado) o de que terminó uno de sus botones de acción: `value` es `{ kind, ok, keys, action?, reason? }`, solo claves de ajustes, nunca un valor ([onSaved](#on-saved)) |

```json
{ "type": "Column", "gap": 12, "children": [
  { "type": "Text", "text": "Ajustes", "textEn": "Settings", "style": "h3" },
  { "type": "settings", "keys": ["density"] }
] }
```

- **`autoSave`:** `true` guarda los interruptores y las opciones del nodo a medida que la persona los cambia, por el mismo
  almacén y la misma sincronización (no se le pregunta a tu [`validateSettings`](settings-form.md#validate), igual que con
  `bind`; tu sesión web se mantiene); una escritura rechazada vuelve a poner el valor guardado. Cuando todos los ajustes
  con valor que muestra el nodo son interruptores u opciones, Kino no dibuja Guardar ni Descartar; un texto, una
  dirección, una contraseña o una lista los conservan. Un ajuste bloqueado solo se guarda después de su código.
- **Solo botones:** un nodo cuyas claves no tienen ningún ajuste con valor (`keys: ["logout"]`: una acción, un estado, una
  sección, un enlace, una ayuda, un QR) dibuja solo esos elementos y no dibuja Guardar ni Descartar; la acción corre desde
  su propio botón, primero su `confirm`, exactamente como en Ajustes.
- **Un ajuste bloqueado** (`"unlockWith": "adultCode"` en el manifiesto, un interruptor o una opción): moverlo de su valor
  por defecto aquí pide primero el código +18 del aparato con el aviso propio de Kino (teléfono y televisor); un código
  equivocado o Cancelar conservan el valor anterior, y volver hacia el valor por defecto nunca lo pide. Solo este nodo (y
  Ajustes) lo aleja del valor por defecto: nunca `bind` ni `config` ([Un ajuste que protege el código
  +18](settings-form.md#unlock-with)).
- **Límites y errores comunes:** nunca dentro de un `Form` ni en la ventana de una respuesta. Cada ajuste se muestra como
  máximo una vez por pantalla, así que varios nodos `settings` no son problema. Un ajuste `url` solo se puede llenar aquí
  (nunca con `bind` ni `config`). Un `password` se puede llenar aquí, con el `config` de una respuesta o con un campo
  `obscureText` vinculado a él ([campos secretos](#secret-field)).

#### `onSaved` { #on-saved }

`onSaved` (un nombre de evento o `{ event, arg }`) se envía después de que el formulario de Kino en este nodo guardó (su
Guardar, o, con `autoSave`, un interruptor u opción que se guardó al cambiar: `kind: "save"` con esa clave; un autoguardado
que no cambió nada no envía ninguno) o de que terminó uno de sus botones de acción (un nodo con solo botones no tiene
Guardar: solo `kind: "action"`), para que tu pantalla reaccione en el acto en lugar de en el siguiente tic de
[`every`](screens.md#timers). Los autoguardados rápidos que aún esperan se juntan en un solo evento. El `value` del
evento:

| Campo | Qué trae |
| --- | --- |
| `kind` | `"save"` o `"action"` |
| `ok` | `true` cuando guardó, o la acción corrió y respondió |
| `keys` | los ajustes que cambiaron (solo claves, ordenadas): lo que se editó, lo que una acción borró o llenó; nunca un valor |
| `action` | la clave del botón de acción (solo con `kind: "action"`) |
| `reason` | cuando no es `ok`: `rejected` (tu `validateSettings` lo rechazó), `checkFailed` (no pudo revisar), `refused` (el almacén de Kino lo rechazó), `failed` (la acción lanzó un error o se le acabó el tiempo) |

```js
export async function screenEvent({ name, value }) {
  if (name === "saved" && value.ok && value.keys.includes("twoStepPassword")) return { state: { step: "login" } };
  return null;
}
```

- **Orden y ritmo:** espera en la cola de la pantalla como los eventos de la propia persona (el tic de un temporizador
  nunca corre antes). Un guardado mientras el evento de un guardado anterior aún espera se junta con él (las claves de
  los dos, el último veredicto); los eventos de acción nunca se juntan. No es una pulsación de nadie: su respuesta no abre
  ninguna página de título ni ningún enlace.
- **Una pantalla cerrada:** un guardado o una acción que termina después de que la pantalla se cerró (o de que el nodo
  salió del árbol) no envía nada; el `open` de la siguiente apertura lee `kino.config` como siempre. El guardado en sí
  siempre queda hecho.
- **Nunca un valor:** la clave de una contraseña puede estar en `keys`; su texto, nunca.

### bind y config { #bind-and-config }

- **`bind: "<claveDeAjuste>"`** en un campo muestra el valor guardado cuando se abre la pantalla y escribe por sí solo el
  cambio de la persona: una opción al cambiar, un texto al confirmar (la acción del teclado, el foco que sale, el aceptar
  del diálogo del televisor), solo cuando es distinto. Igual recibes los eventos del campo. Una pestaña de ajustes simple
  no necesita nada de JavaScript.
- **`config: { <claveDeAjuste>: valor }`** en una respuesta escribe ajustes desde tu código: solo claves que tu
  manifiesto declara, máximo 32 por respuesta, cada valor acorde a su tipo (`text` un string, `toggle` un boolean,
  `select` uno de sus valores, `list` un arreglo de registros, `password` un string).
- **Un `password`** se guarda exactamente como llega (nunca se recorta); `null`, `""` o solo espacios lo vacían (nunca uno
  `required`); máximo 500 caracteres. Se guarda donde Ajustes guarda uno escrito: una contraseña sincronizada llega a los
  otros aparatos de la persona (una vaciada se borra también ahí), una con [`"sync": false`](settings-form.md#sync-false)
  se queda en este aparato. Una pantalla nunca la lee de vuelta (`bind` nunca la prellena, `state` nunca la tiene) y Kino
  nunca escribe su texto en una línea del registro, solo su clave. Vincúlala solo con un campo `obscureText` ([campos
  secretos](#secret-field)).
- **Nunca desde una pantalla:** un ajuste `url`, un ajuste `action` o `help`, un valor que contenga uno de tus secretos
  sellados, una escritura de `list` que agregue una dirección, un ajuste con `unlockWith` alejado de su valor por defecto
  (ningún campo se vincula a uno). Todo eso se descarta y queda en el registro.
- **Ritmo y costo:** cada ajuste se escribe como máximo una vez cada 500 ms por pantalla (la respuesta de un
  temporizador: una vez por minuto); cada escritura reinicia tu runtime para que `kino.config` lea el valor nuevo (los
  interruptores y las opciones conservan tu sesión web; cualquier otra escritura es el Guardar completo de Kino).

```json
{ "type": "Column", "gap": 8, "children": [
  { "type": "TextField", "key": "greetingField", "bind": "greeting", "labelText": "Saludo", "labelTextEn": "Greeting" },
  { "type": "Switch", "key": "tipsField", "bind": "tips", "labelText": "Mostrar consejos", "labelTextEn": "Show tips" },
  { "type": "DropdownButton", "key": "densityField", "bind": "density", "labelText": "Densidad", "labelTextEn": "Density", "options": [
    { "value": "compact", "label": "Compacta", "labelEn": "Compact" }, { "value": "normal", "label": "Normal" }, { "value": "roomy", "label": "Amplia", "labelEn": "Roomy" }
  ] }
] }
```

```json
{ "config": { "greeting": "Hola", "tips": false }, "toast": "Guardado", "toastEn": "Saved" }
```

## Ventanas emergentes { #overlays }

Una ventana a la vez; abrir otra la reemplaza; Atrás la cierra antes que cualquier otra cosa; nunca tapa la barra de
título de Kino, y Kino siempre dibuja su cierre: una X sola (un lector de pantalla dice «Cerrar», «Close» en inglés), al
final de la fila del título o, sin título, al principio (a la izquierda) de la fila de abajo, con tus botones juntos al
final (a la derecha), nunca al lado de tu acción principal; los botones que no caben pasan a más líneas, siempre al
final. Hay dos formas de mostrar una: **desde una respuesta** (`dialog`, `sheet`, `menu`: las arma `screenEvent`, con
texto o nodos simples) o **declarada en el árbol** (un nodo `popup`, oculto hasta que un `open` de
[`ui`](screen-components.md#ui-ops) lo nombra, cuyo cuerpo es parte de tu árbol y puede llevar formularios y campos).

### Dialog { #dialog }

Una pregunta o un mensaje corto que necesita respuesta. Desde una respuesta: `dialog: { title, body, buttons }` (máximo 3
botones; uno sin `event` lo cierra). Declarado: un nodo `AlertDialog` con `children` y `buttons`.

![Un diálogo en el teléfono](assets/ui/dialog-phone.png)
![Un diálogo en el televisor](assets/ui/dialog-tv.png)

```json
{ "dialog": { "title": "¿Borrar la lista?", "titleEn": "Delete the list?", "body": "No se puede deshacer.", "bodyEn": "It cannot be undone.",
  "buttons": [{ "label": "Borrar", "labelEn": "Delete", "event": "deleteList", "variant": "primary" }, { "label": "Cancelar", "labelEn": "Cancel", "variant": "text" }] } }
```

```js
export async function screenEvent({ name }) {
  if (name === "ask") return { dialog: { title: "¿Seguro?", titleEn: "Are you sure?", buttons: [{ label: "Sí", labelEn: "Yes", event: "yes" }, { label: "No" }] } };
  if (name === "yes") return { toast: "Hecho", toastEn: "Done" };
  return null;
}
```

- **Televisor:** el foco se queda dentro del diálogo; su primer foco es su primer nodo enfocable, si no (un cuerpo más alto
  que el marco sin nada que enfocar) el cuerpo mismo, si no su primer botón, si no su cierre; un cuerpo más alto que el
  marco se desplaza con Abajo y Arriba (deja un botón al final). Solo el control enfocado dibuja el anillo de Kino: el
  marco y un cuerpo que se desplaza nunca lo hacen (el desplazamiento es la señal). Izquierda y Derecha se mueven entre la
  X de Kino y tus botones en la fila de abajo.
- **Teléfono y televisor:** un diálogo centrado en los dos.
- **Límites y errores comunes:** con más de uno de `dialog`, `sheet` y `menu` en una respuesta, gana el diálogo. La ventana
  de una respuesta nunca lleva un `Form`, un `ExpansionTile`, `bind` ni el nodo `settings` (para eso, declara una).

### Sheet { #sheet }

Más espacio que un diálogo para detalles o unas pocas acciones: una hoja inferior en el teléfono, un panel lateral en el
televisor. Desde una respuesta: `sheet: { title, body }`; declarada: un nodo `BottomSheet`.

![Una hoja en el teléfono](assets/ui/sheet-phone.png)
![Una hoja en el televisor](assets/ui/sheet-tv.png)

```json
{ "sheet": { "title": "Compartir", "titleEn": "Share", "body": [
  { "type": "Text", "text": "Escanéalo con tu teléfono.", "textEn": "Scan it with your phone." },
  { "type": "QrImage", "value": "https://kinotvapp.github.io/kino-plugins/", "size": "small" }
] } }
```

```js
export async function screenEvent({ name }) {
  return name === "info" ? { sheet: { title: "Información", body: "Una línea de texto.", bodyEn: "A line of text." } } : null;
}
```

- **Teléfono y televisor:** abajo de la pantalla en el teléfono, al costado en el televisor. Atrás la cierra.

### Menu { #menu }

Una lista corta de acciones (de 1 a 8 elementos con una etiqueta, un icono opcional y un `onTap`); el menú se cierra antes
de que corra la acción del elemento. Desde una respuesta: `menu: { title, items }`; declarado: un nodo `PopupMenuButton`
que se abre con `{ open: key }`.

![Un menú en el teléfono](assets/ui/menu-phone.png)
![Un menú en el televisor](assets/ui/menu-tv.png)

```json
{ "menu": { "title": "Ordenar por", "titleEn": "Sort by", "items": [
  { "label": "Más reciente", "labelEn": "Newest", "icon": "star", "onTap": { "event": "sort", "arg": "new" } },
  { "label": "Título", "labelEn": "Title", "icon": "list", "onTap": { "event": "sort", "arg": "title" } }
] } }
```

```js
export async function screen() {
  return { type: "Column", children: [
    { type: "TextButton", labelText: "Ordenar", onPressed: { ui: [{ open: "sortMenu" }] } },
    { type: "PopupMenuButton", key: "sortMenu", items: [{ label: "Título", onTap: { event: "sort", arg: "title" } }, { label: "Año", onTap: { event: "sort", arg: "year" } }] },
  ] };
}
```

- **Teléfono y televisor:** un menú no queda pegado a lo que lo abrió: en el teléfono es una lista de acciones abajo del
  lienzo, en el televisor queda centrado (para dibujar uno junto a un nodo, mira [`anchor`](#anchor)).
- **Límites y errores comunes:** máximo 8 elementos; un elemento de menú lleva `label` y `onTap` (nunca
  `labelText`/`onPressed`).

### Ventanas declaradas, `open` y `close` de `ui`, `onClose` { #popup }

Un nodo `popup` (`AlertDialog`, `BottomSheet`, `PopupMenuButton`, o `popup` con su `kind`) con una `key`, en cualquier
parte del árbol, oculto hasta que un `open` de `ui` lo nombra. Su cuerpo es parte de tu árbol, así que puede llevar
formularios y campos, y tu siguiente render lo actualiza.

![Una ventana declarada en el teléfono](assets/ui/popup-phone.png)
![Una ventana declarada en el televisor](assets/ui/popup-tv.png)

| Propiedad | Tipo | Por defecto | Por tamaño | Notas |
| --- | --- | --- | --- | --- |
| `key` | string | obligatorio | no | lo que nombran `{ open: key }` y `{ close: key }` |
| `kind` | `dialog` \| `sheet` \| `menu` | lo fija el tipo | no | `AlertDialog` es `dialog`, `BottomSheet` `sheet`, `PopupMenuButton` `menu` |
| `title` | string | ninguno | no | `titleEn`; sin él (o en blanco) no se dibuja una fila de título vacía |
| `children` | nodos[] | ninguno | no | el cuerpo de un diálogo o de una hoja: se permiten formularios y campos |
| `buttons` | `{ label, labelEn?, event?, arg?, variant? }[]` | ninguno | no | los de un diálogo, máximo 3; uno sin `event` lo cierra |
| `items` | `{ label, labelEn?, icon?, onTap }[]` | obligatorio para un menú | no | 1 a 8; el menú se cierra primero |
| `onClose` | nombre de evento o `{ ui?, event?, arg? }` | ninguno | no | corre después de que la persona la cerró (Atrás, el cierre de Kino, un toque afuera), nunca después de sus propios botones |
| `anchor` | la clave de un nodo | ninguno | no | se dibuja junto a ese nodo, sobre el contenido, sin ocupar espacio ([ventana anclada](#anchor)); la única ventana que dibuja un panel del reproductor |

La forma segura de abrir una con contenido nuevo es **desde la respuesta**, no desde el toque: el toque envía el evento,
la respuesta actualiza el estado y lleva `ui: [{ open }]`; Kino la abre cuando el árbol nuevo ya está dibujado, así que
la ventana nunca muestra el cuerpo del elemento anterior (Atrás antes de eso la cancela). Ciérrala igual después de su
propio Guardar.

```json
{ "type": "AlertDialog", "key": "story", "title": "Una historia", "titleEn": "A story", "onClose": "storyClosed",
  "children": [{ "type": "Text", "text": "El texto de la historia.", "textEn": "The story's text." }],
  "buttons": [{ "label": "Cerrar", "labelEn": "Close" }] }
```

```js
export async function screen({ state }) {
  return { type: "Column", children: [
    { type: "ElevatedButton", labelText: "Leer", onPressed: { event: "read", arg: "42" } },
    { type: "AlertDialog", key: "story", title: "Historia " + (state.reading || ""), onClose: "storyClosed", children: [{ type: "Text", text: "…" }] },
  ] };
}

export async function screenEvent({ name, arg }) {
  if (name === "read") return { state: { reading: arg }, ui: [{ open: "story" }] }; // opens once the new tree is drawn
  if (name === "storyClosed") return { state: { reading: null } };                  // the person dismissed it
  return null;
}
```

- **`onClose`** (un nombre de evento, o `{ ui?, event?, arg? }`) corre después de que **la persona** cerró la ventana
  (Atrás, el cierre de Kino, un toque afuera), nunca después de sus propios botones, de un elemento de menú, de tu `close`
  ni de otra ventana que la reemplace. Su evento no es una pulsación: nada de [`kino.qr.scan`](qr.md), nada de
  `go.titleByIds` ni `go.url`; su respuesta no abre ninguna ventana, no mueve el foco y no va a ninguna parte (se
  descarta, queda en el registro).
- **Televisor:** el foco queda atrapado dentro de la ventana abierta; Atrás la cierra y el foco vuelve a lo que la abrió.
- **Límites y errores comunes:** `title` es opcional (sin él no se dibuja una fila vacía; nunca pases `" "`). Una ventana
  cuyo nodo está `hidden` no se puede abrir. Si una ventana está abierta no aparece en `state.ui`. En un panel en [modo
  pantalla](player-panel.md#screen-mode) un nodo `popup` se descarta (las ventanas son de la pantalla), salvo que tenga un
  `anchor` (abajo).

#### Ventana anclada (`anchor`) { #anchor }

`anchor` (la clave de un nodo) convierte cualquier ventana declarada en un globo: Kino la dibuja **junto a ese nodo**,
arriba si hay más espacio arriba, si no abajo, del tamaño de su contenido y como máximo del ancho del área, sobre el
contenido sin oscurecerlo y sin ocupar espacio en la disposición. Se abre y se cierra como cualquier ventana (`open` y
`close` de `ui`, Atrás, un toque afuera) y no tiene botón de cierre propio. Una elección rápida al lado de un botón (una
reacción, una velocidad, un orden):

```json
{ "type": "Row", "children": [
  { "type": "IconButton", "key": "react", "icon": "mood", "labelText": "Reacciones", "labelTextEn": "Reactions",
    "onPressed": { "ui": [{ "open": "palette" }] } },
  { "type": "PopupMenuButton", "key": "palette", "anchor": "react", "items": [
    { "label": "Me gusta", "labelEn": "Like", "icon": "heart", "onTap": { "event": "react", "arg": "like" } },
    { "label": "Me encanta", "labelEn": "Love", "icon": "star", "onTap": { "event": "react", "arg": "love" } }] }
] }
```

- **Televisor:** el foco entra en ella (su primer elemento enfocable, o su nodo con `autofocus`) y se queda adentro
  mientras está abierta; Atrás la cierra y le devuelve el foco al ancla.
- **Panel del reproductor:** un `popup` con `anchor` es la única ventana que dibuja un panel en [modo
  pantalla](player-panel.md#screen-mode), dentro del panel.
- **Alternativa:** cuando el ancla no está en pantalla, o no hay espacio ni arriba ni abajo (una ventana compacta, un
  cuerpo alto), se dibuja en el lugar propio de su tipo y queda una vez en el registro. Sin `anchor` se comporta como
  siempre.

## Navegación { #navigation }

La acción de un nodo o una respuesta pueden llevar `go`: una de doce formas, **siempre hacia el contenido propio de este
plugin o hacia una de las páginas propias de Kino**. La página de Kino se abre sobre tu pantalla; Atrás vuelve a ella con
su estado. Como máximo un `go` que abre una página cada 500 ms. Ninguna forma nombra un intent ni una app, y solo
`liveChannel` nombra a otro plugin (un proveedor de En vivo, a cuyo canal Kino sintoniza para un plugin cuya pestaña del
reproductor se une a los canales en vivo). La guía trata `go` en [Navegar con `go`](screens.md#go).

| Forma | Se escribe | Qué abre | Desde dónde se envía |
| --- | --- | --- | --- |
| [`title`](#go-title) | `{ title: { ref, kind, id, title, adult } }` | la página de título de este plugin | un toque o la respuesta a un evento (nunca la de `open`, la de un temporizador ni la de un `onClose`) |
| [`play`](#go-play) | `{ play: { ref, kind, id, title, adult } }` | reproduce el título de este plugin | un toque o la respuesta a un evento (nunca la de `open`, la de un temporizador ni la de un `onClose`) |
| [`search`](#go-search) | `{ search: { q } }` | la búsqueda de Kino con `q` (máximo 200 caracteres), con este plugin como única fuente | un toque o la respuesta a un evento (nunca la de `open`, la de un temporizador ni la de un `onClose`) |
| [`browse`](#go-browse) | `{ browse: { ref, title?, titleEn? } }` | la lista «Ver más» de este plugin para un `ref` | un toque o la respuesta a un evento (nunca la de `open`, la de un temporizador ni la de un `onClose`) |
| [`section`](#go-section) | `{ section: true }` | la sección de este plugin | un toque o la respuesta a un evento (nunca la de `open`, la de un temporizador ni la de un `onClose`) |
| [`categories`](#go-categories) | `{ categories: true }` | las Categorías de Kino, primero el grupo de este plugin | un toque o la respuesta a un evento (nunca la de `open`, la de un temporizador ni la de un `onClose`) |
| [`close`](#go-close) | `{ close: true }` | cierra la pantalla | un toque o la respuesta a un evento (nunca la de `open`, la de un temporizador ni la de un `onClose`) |
| [`screen`](#go-screen) | `{ screen: { route?, args? } }` | la pantalla propia de este plugin en `route` (máximo 64 caracteres) con `args` (máximo 4.096 bytes) | un toque o una respuesta, incluida la de `open` |
| [`titleByIds`](#go-title-by-ids) | `{ titleByIds: { tmdb, imdb, kind, season, episode, title, year } }` | la página de título propia de Kino para ids de TMDB o IMDb, con todas las fuentes que tiene la persona | solo la pulsación o el envío de la propia persona |
| [`url`](#go-url) | `{ url: { href, title } }` | un enlace https en el navegador, después de la hoja propia de Kino (un código QR en un televisor) | solo la pulsación o el envío de la propia persona |
| [`copy`](#go-copy) | `{ copy: { text, label, sensitive } }` | Kino copia `text` (máximo 500 caracteres, 6 líneas) y muestra su propio aviso «Copiado»; un televisor no puede | solo la pulsación o el envío de la propia persona |
| [`liveChannel`](#go-live-channel) | `{ liveChannel: { provider, code } }` | sintoniza el reproductor en el canal de un proveedor de En vivo (solo para un plugin cuya pestaña del reproductor se une a los canales en vivo) | solo la pulsación o el envío de la propia persona |

![Navegación en el teléfono](assets/ui/navigation-phone.png)
![Navegación en el televisor](assets/ui/navigation-tv.png)

### `go.title` { #go-title }

Abre la página de título de este plugin. Un título que está en el lienzo (un
[`titleCard`](screen-components.md#title-card), o un elemento de una fila o de una cuadrícula) se abre con ese mismo
elemento (pasa su `id` cuando dos elementos comparten un `ref`); un título que no está en el lienzo necesita su `id` y su
`title` (y `adult: true` cuando es +18).

```json
{ "go": { "title": { "ref": "movie/123", "kind": "movie", "id": "m123", "title": "Una película" } } }
```

### `go.play` { #go-play }

Reproduce el título de este plugin, escrito como `title`. Un canal en vivo se reproduce; una serie abre su página; una
película, una pista o un episodio de pódcast se reproducen en el acto. El filtro +18 se mantiene.

```json
{ "type": "ElevatedButton", "labelText": "Reproducir", "labelTextEn": "Play", "onPressed": { "go": { "play": { "ref": "live/1", "kind": "live", "id": "c1", "title": "Canal 1" } } } }
```

### `go.search` { #go-search }

La búsqueda de Kino con `q` ya escrita y con este plugin como única fuente (la persona ve su chip y lo puede quitar). Se
rechaza para un plugin sin `search`.

```json
{ "go": { "search": { "q": "big buck bunny" } } }
```

### `go.browse` { #go-browse }

La lista «Ver más» de este plugin para un `ref` (tu `browse`).

```json
{ "go": { "browse": { "ref": "genre/drama", "title": "Drama" } } }
```

### `go.section` { #go-section }

La sección de este plugin (sus filas de tarjetas).

```json
{ "go": { "section": true } }
```

### `go.categories` { #go-categories }

Las Categorías de Kino con el grupo de este plugin primero; con [`screen.replaces: ["categories"]`](screens.md#manifest)
tu propia pantalla en la ruta `categories`. Se rechaza, y queda en el registro, para un plugin sin sus propios mosaicos
de Categorías.

```json
{ "go": { "categories": true } }
```

### `go.close` { #go-close }

Cierra la pantalla (lo mismo que `close: true` en la respuesta).

```json
{ "type": "TextButton", "labelText": "Cerrar", "labelTextEn": "Close", "onPressed": { "go": { "close": true } } }
```

### `go.screen` { #go-screen }

La pantalla propia de este plugin en una `route` con `args`, desde sus otras superficies (su panel del reproductor, sus
elementos y filas de `home`/`section`/`browse` con `open: { screen }`, la tarjeta de «Mis plugins») o desde dentro de la
pantalla, que vuelve a empezar en esa ruta (el estado se mantiene). El evento reservado `open` vuelve a llegar con la ruta
nueva, así que un solo camino carga lo que nombran los args. Como máximo un reinicio por segundo.

```json
{ "type": "Button", "variant": "secondary", "labelText": "Ver los ajustes", "labelTextEn": "See the settings", "onPressed": { "go": { "screen": { "route": "main", "args": { "tab": "config" } } } } }
```

```js
export async function screenEvent({ name, route }) {
  if (name === "open" && route.args?.tab === "config") return { state: { tab: "config" } };
  return null;
}
```

### `go.titleByIds` { #go-title-by-ids }

Cómo llegan al mismo título personas con **plugins distintos**: la página de título propia de Kino (la que abre una
tarjeta de TMDB en Inicio), con todas las fuentes que tiene la persona. Al menos uno de `tmdb` e `imdb`; no nombra ningún
plugin, ref ni URL, nunca reproduce y no te devuelve nada. Solo desde la pulsación o el envío de la propia persona.

```json
{ "type": "ElevatedButton", "labelText": "Abrir este título", "labelTextEn": "Open this title", "icon": "movie",
  "onPressed": { "go": { "titleByIds": { "tmdb": 10378, "kind": "movie", "title": "Big Buck Bunny", "year": 2008 } } } }
```

- +18: mientras el código +18 de la persona está bloqueado, solo se abre cuando TMDB dice que el título no es para
  adultos. Un `imdb` solo cuesta una búsqueda en TMDB («Buscando el título…»). Una serie se abre entera (todavía sin
  enfocar un episodio).

### `go.url` { #go-url }

Le pide a Kino abrir un enlace https en un navegador: un botón «Ver noticia». Nada se abre solo: Kino muestra primero **su
propia** hoja (el nombre de tu plugin, el host con su final siempre visible, tu `title` bajo «Texto del plugin:»,
«Cancelar» enfocado primero y «Abrir», inactivo durante sus primeros 600 ms). En un televisor, o en un teléfono sin
navegador, la hoja muestra el enlace como un código QR para escanear.

```json
{ "type": "ElevatedButton", "labelText": "Ver noticia", "labelTextEn": "Read the story", "icon": "language",
  "onPressed": { "go": { "url": { "href": "https://kinotvapp.github.io/kino-plugins/", "title": "Guía de plugins" } } } }
```

- `href`: solo `https://`, máximo 2.048 caracteres de ASCII imprimible, un nombre DNS público con un punto (nunca una IP,
  `localhost`, `.local`, `.lan`...), sin `usuario:contraseña@`, sin otro puerto que el 443. Solo desde la pulsación o el
  envío de la propia persona; una respuesta que llega más de 5 s después del toque lo descarta. No te devuelve nada.

### `go.copy` { #go-copy }

Un botón «Copiar»: Kino pone tu texto en el portapapeles él mismo y **siempre** muestra su propio aviso, «Copiado» (o
«Copiado: <label>»), así que nada se copia nunca sin que se vea. Kino nunca lee el portapapeles. Solo desde la pulsación
o el envío de la propia persona (un toque, un envío, la respuesta a uno de ellos, el botón de una ventana, una pulsación
en el panel); el panel sigue abierto.

```json
{ "type": "ElevatedButton", "labelText": "Copiar invitación", "labelTextEn": "Copy invite", "icon": "copy",
  "onPressed": { "go": { "copy": { "text": "Sala: luna roja azul\nCódigo: 4821", "label": "Invitación", "sensitive": true } } } }
```

- `text`: de 1 a 500 caracteres en máximo 6 líneas, una vez quitados los caracteres de control, de dirección y de ancho
  cero (los saltos de línea se quedan). `label` (máximo 40) nombra lo copiado en el aviso de Kino. `sensitive: true` lo
  oculta de la vista previa del portapapeles en Android 13 y posteriores (un código de sala, una contraseña).
- Una copia cada 500 ms y 20 por minuto por plugin. Un televisor no tiene un portapapeles que sirva: Kino muestra «No se
  puede copiar en este aparato»; oculta el botón ahí (`kino.device` / `device: "tv"`).

### `go.liveChannel` { #go-live-channel }

Sintoniza el reproductor de Kino en un canal de En vivo: `provider` es el id del plugin que lo lista, `code` el id del
canal en el listado de ese plugin (lo que el contexto de una pestaña en vivo trae como `channel`). Así un invitado de
Party Chat ve el mismo canal que el anfitrión: la pestaña del anfitrión lee `context.channel`, lo envía a la sala, y el
invitado pulsa «Ver el mismo canal».

```json
{ "type": "ElevatedButton", "labelText": "Ver el mismo canal", "labelTextEn": "Watch the same channel", "icon": "tv",
  "onPressed": { "go": { "liveChannel": { "provider": "tdt", "code": "la1" } } } }
```

- Solo para un plugin cuya pestaña contribuida y aprobada declara [`"kinds": ["live"]`](player-panel.md#live-kinds)
  (`panel.contributes`, [`playerPanelTab`](player-panel.md#contributed-tab)): el mismo consentimiento; el de cualquier
  otro plugin se descarta y queda en el registro como `needs_live_tab`. Solo desde la pulsación o el envío de la propia
  persona.
- El proveedor tiene que ser un plugin instalado y usable con canales en vivo (nunca `own`, «Mis canales»); un proveedor
  +18 solo mientras el código +18 está desbloqueado, y un canal +18 no se encuentra mientras está bloqueado (el mensaje de
  siempre de Kino).
- En el panel del reproductor, sobre un canal en vivo, el canal cambia ahí mismo (el panel y su fijación se mantienen);
  desde cualquier otro lugar el panel o la pantalla se cierran y el reproductor abre el canal. No te devuelve nada: el
  siguiente contexto dice el canal.

### Rutas (`route`: push y pop) { #routes }

Pantallas propias más adentro del lienzo: el `route: { push: "detail", params }` de una respuesta baja un nivel,
`{ pop: true }` vuelve; Atrás quita una ruta agregada antes de cerrar el lienzo. `screen({ route })` recibe
`{ name, params, args? }`.

![Rutas en el teléfono](assets/ui/route-phone.png)
![Rutas en el televisor](assets/ui/route-tv.png)

```json
{ "route": { "push": "detail", "params": { "id": "42" } } }
```

```js
export async function screen({ route }) {
  if (route.name === "detail") return { type: "Column", padding: 16, children: [{ type: "Text", text: "Detalle " + route.params.id }, { type: "TextButton", labelText: "Volver", onPressed: "back" }] };
  return { type: "ElevatedButton", labelText: "Ver detalle", onPressed: { event: "detail", arg: "42" } };
}

export async function screenEvent({ name, arg }) {
  if (name === "detail") return { route: { push: "detail", params: { id: arg } } };
  if (name === "back") return { route: { pop: true } };
  return null;
}
```
