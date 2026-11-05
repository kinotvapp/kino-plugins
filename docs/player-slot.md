# El hueco del reproductor (`playerSlot`, apiVersion 23) { #player-slot }

!!! note "Próxima versión de Kino, todavía sin publicar"
    El apiVersion 23 llega con la próxima versión de Kino (provisionalmente la 0.9.83), que todavía no está publicada. Un Kino
    que no lo tiene rechaza un manifiesto con la capacidad `playerSlot` o el bloque `slot` ("Este plugin necesita una versión
    más nueva de Kino"). Para seguir corriendo en Kinos anteriores, conserva tu `apiVersion` y agrega los dos como
    [mejora](enhancements.md) (`enhancements["23"]`: `"capabilities": ["playerSlot"], "slot": { ... }`).

Un plugin puede poner hasta **tres cosas pequeñas en la esquina superior derecha del reproductor de la TV**: un reloj, un
marcador, un logo, un botón que abre el [panel del reproductor](player-panel.md) del plugin. Kino llama a dos funciones tuyas,
`playerSlot(context)` para llenar los elementos y `playerSlotAction({ id, context })` cuando la persona aprieta un botón, y
dibuja lo que respondes con su propio aspecto. Como en una [pantalla](screens.md), tú describes y Kino dibuja: nada de vistas,
colores ni píxeles.

- **Solo en la TV.** El reproductor del teléfono no cambia: ningún elemento, ninguna llamada.
- **Películas, series y canales de En vivo.** Lo que cambia en un canal está [más abajo](#live).
- **Tres elementos en pantalla en total, entre todos los plugins.** Primero los `fixed`, después los que salen con los
  controles; el orden de plugins de la persona (Ajustes, "Paneles del reproductor", la misma lista que las pestañas del panel)
  desempata y los demás no se dibujan.
- **Ningún destino de red nuevo.** El hueco usa los hosts que el plugin ya declara; una `image` la carga Kino desde cualquier
  dirección https pública.

Los números de esta página salen de [`contract.json`](reference/contract.json) (`playerSlot`); las formas están en
[`kino.d.ts`](reference/kino.d.ts) (`KinoManifestSlot`, `KinoSlotContext`, `KinoSlotAnswer`, `KinoSlotActionAnswer`).

## Un primer hueco: un reloj { #example }

El ejemplo completo es el **reloj del reproductor**: la hora y la fecha en español o en inglés, en un único elemento de texto
`fixed`, sin red. Sus módulos están en `src/` y `scripts/build.mjs` los junta en `plugin.js` (Kino carga un solo archivo).

Descargas: [`kino-plugin.json`](slot-examples/player-clock/kino-plugin.json) ·
[`plugin.js`](slot-examples/player-clock/plugin.js) · [`src/clock.js`](slot-examples/player-clock/src/clock.js) ·
[`src/index.js`](slot-examples/player-clock/src/index.js) · [`scripts/build.mjs`](slot-examples/player-clock/scripts/build.mjs)

**`kino-plugin.json`**

```json
--8<-- "slot-examples/player-clock/kino-plugin.json"
```

**`src/index.js`** (la entrada; `src/clock.js` convierte una `Date` y `context.lang` en `"21:05\nmié 4 nov"`)

```js
--8<-- "slot-examples/player-clock/src/index.js"
```

- Un plugin con solo `playerSlot` y su bloque `slot` está completo: como `screen`, no reproduce nada, así que no necesita ni
  `resolve` ni `search`.
- Las reglas del manifiesto piden al menos una entrada en `hosts`, así que nombra `kinotvapp.github.io`; el plugin nunca lo
  llama.
- `playerSlotAction` es obligatorio con la capacidad aunque el reloj no tenga botón (aquí Kino nunca lo llama).
- `refreshMs: 60000` es lo máximo que Kino permite: un reloj que muestra minutos pregunta una vez por minuto.

```bash
node sdk/run.mjs player-clock playerSlot                              # el cuadro que Kino guardaría
node sdk/run.mjs --context '{"lang":"en-US"}' player-clock playerSlot  # en inglés
node sdk/validate.mjs player-clock                                     # también imprime la línea roja de consentimiento
```

## El bloque `slot` del manifiesto { #manifest }

```json
{
  "apiVersion": 23,
  "capabilities": ["playerSlot"],
  "slot": { "elements": [
    { "id": "clock", "kind": "text", "mode": "fixed" },
    { "id": "open", "kind": "button", "mode": "overlay" }
  ] }
}
```

| Campo | Regla |
| --- | --- |
| `elements` | De 1 a 3 objetos (un cuarto se rechaza con `The "slot.elements" field must list 1 to 3 elements`). La cantidad, los tipos y los modos se fijan aquí: tus respuestas solo cambian el contenido. |
| `id` | Minúsculas, dígitos, `-` o `_`, empieza con una letra, de 1 a 24 caracteres (`^[a-z][a-z0-9_-]{0,23}$`), único en el bloque. Tus respuestas lo usan como clave. |
| `kind` | `text`, `icon`, `image` o `button`. La respuesta de un elemento tiene que ser de su tipo: un elemento `text` respondido con un `icon` se descarta. |
| `mode` | `overlay`: flota sobre el video y sale **con los controles** (los de una película o serie; en un canal, la tarjeta del canal). `fixed`: se queda en su lugar todo el tiempo, también en pausa o cargando, y pide la aprobación de la persona ([consentimiento](#consent)). |

- **La capacidad y el bloque se necesitan**: `The "slot" field needs the "playerSlot" capability`, `The "playerSlot"
  capability needs a "slot" block`. La capacidad exporta `playerSlot` y `playerSlotAction`, los dos obligatorios (si no, la
  instalación falla con "El plugin no carga: le falta ...").
- **`playerSlot` puede ser la única capacidad del plugin.** Un plugin que solo tiene el hueco no puede declarar
  `playerControl`: esa necesita un `panel`.
- **Cuándo Kino no dibuja nada:** mientras hay un panel de plugin abierto, el selector de audio y subtítulos abierto, un error
  de carga a la vista o el reproductor en imagen en imagen (un diálogo normal de Kino solo oscurece la pantalla; los elementos
  siguen). Un plugin 18+ solo dibuja mientras el código 18+ de la persona está desbloqueado. Los elementos `overlay` además
  esperan a los controles: en una película se esconden con ellos, y mientras la pantalla está bloqueada, hay una transmisión a
  un aparato DLNA o la persona está marcando un tiempo.

## `playerSlot(context)`: lo que muestra cada elemento { #render }

```json
{ "items": [
    { "id": "clock", "text": "21:05\nmié 4 nov" },
    { "id": "mark", "icon": "star" },
    { "id": "logo", "image": "https://example.com/logo.png" },
    { "id": "open", "label": "Marcador", "icon": "tune" }
  ],
  "refreshMs": 30000 }
```

| `kind` | Respondes | Lo que Kino guarda y dibuja |
| --- | --- | --- |
| `text` | `text`: un texto; los saltos de línea separan líneas | Máximo 2 líneas (las vacías se descartan, cada una recortada), 2000 caracteres antes de separar, sin caracteres de control ni de dirección. Nunca recibe el foco. |
| `icon` | `icon`: uno de los [nombres de íconos](screen-components.md#icon-names) de Kino | El ícono a 28 dp. Un nombre desconocido descarta el elemento. Nunca recibe el foco. |
| `image` | `image`: una dirección https de un host público (nunca una IP, `localhost` ni un nombre local) | Pequeña: unos 40 dp de alto y máximo 120 dp de ancho. Cualquier otra cosa descarta el elemento. Nunca recibe el foco. |
| `button` | `label` (máximo 40 caracteres, sin caracteres de control) y/o `icon` (un nombre conocido) | Necesita al menos uno de los dos válido. Un botón redondo (solo ícono) o una píldora (con texto), que recibe el foco con el control remoto; el de solo ícono se lee "Botón del plugin" / "Plugin button" en un lector de pantalla. |

- **`refreshMs`** es cuándo Kino vuelve a llamar a `playerSlot`, contado desde el final de la última llamada: por debajo de
  2000 sube a 2000 y por encima de 60 000 baja a 60 000. Si falta (o no es un número) no se vuelve a llamar, y eso está bien
  para un botón que no cambia.
- **Nada se repara.** Un id que no declaraste, un elemento del tipo equivocado, un ícono desconocido, una imagen mala y un botón
  sin nada que mostrar se descartan; un id repetido conserva el primero válido. Si la respuesta no es un objeto con una lista
  `items`, Kino conserva el último cuadro bueno (ninguno la primera vez).
- **Los elementos salen en el orden declarado**, respondas en el orden que respondas. Un elemento que dejas fuera simplemente
  no se dibuja.

### Tiempos, reintentos y segundo plano { #timing }

- **Cada llamada tiene 5 s.** Las llamadas van en fila: nunca dos a la vez para un plugin.
- **La primera llamada puede fallar sin perder el hueco:** hasta tener una respuesta buena, Kino vuelve a llamar a
  `playerSlot` cada 5 s, hasta 4 veces más, y después se rinde para esa reproducción. Después de la primera respuesta, una
  llamada fallida o inválida conserva el último cuadro y el reloj de `refreshMs` sigue.
- **Las llamadas corren solas.** Una llamada a `playerSlot` (la primera también) nunca cuenta para "No responde" (la racha de
  tiempos agotados seguidos); un toque sí. Por eso tampoco hay corte para las actualizaciones: un plugin cuyo `playerSlot` agota
  el tiempo una y otra vez después de su primer cuadro se vuelve a llamar cada `refreshMs` más hasta unos 5 s, mientras dure la
  reproducción, y conserva su último cuadro.
- **Nada en segundo plano.** Kino no llama a `playerSlot` mientras está en segundo plano (se apretó Inicio, o hay una página de
  Kino sobre el reproductor) y vuelve a llamar al regresar.

## `playerSlotAction({ id, context })`: un toque { #action }

Corre cuando la persona aprieta un botón (OK en el control remoto); `id` es el id del elemento. Kino solo la llama para un botón
declarado que está en pantalla. Responde `null` o `{}` para no hacer nada, o:

```json
{ "openPanel": true, "player": { "pause": true } }
```

| Clave | Qué hace Kino |
| --- | --- |
| `openPanel` | `true` abre el panel del reproductor de tu plugin (el que dibuja tu export `panel`: necesita un bloque `panel`, o una [pestaña aportada](player-panel.md#contributed-tab)). Si el panel ya está abierto, no cambia a tu pestaña. Sin un panel tuyo en ese reproductor, se registra y se ignora. |
| `player` | Una [acción `player`](player-panel.md#player) normal del panel (`seekToMs`, `pause`, `speed`, `resize`...), leída por el lector del propio panel y después con las mismas reglas que un toque en un panel: el plugin del título que suena conserva sus campos, cualquier otro plugin solo un salto (con la capacidad [`playerControl`](rooms.md#player-control) aprobada: un salto, `pause` y `speed`). Se aplica la compuerta de Kino (un salto o una pausa por segundo, nada bajo un diálogo de Kino ni mientras la persona salta, 30 acciones controladas por minuto), y una acción controlada muestra un aviso con el nombre de tu plugin. |

## El contexto { #context }

`context` es el contexto del panel del reproductor para el título que suena (mira [`panel(context)`](player-panel.md#context))
más `live: true | false`. Cuál recibes depende de qué suena y de quién puede saberlo:

| Qué suena | `context` |
| --- | --- |
| Un título de **tu propio** plugin | El contexto completo del panel: `kind`, `ref`, `title`, ids, posición, tus valores guardados... y `live: false`. |
| Un título de **otro** plugin (nunca 18+) | El contexto de una pestaña aportada: un `ref` opaco, `foreign: true`, `source: { pluginId, name }` y `live: false`. |
| Un título que no llega a ningún otro plugin (18+, un título que no es de ningún plugin, como una de las fuentes propias de Kino, o un título que Kino no puede confirmar que es el que suena) | El contexto **mínimo**: solo `live`, `foreign: true`, `device`, `lang` y `features`. **Sin `kind`**, ni siquiera película o serie: el código que lee `context.kind` tiene que soportar que falte. |
| Un canal de En vivo que su proveedor confirmó | El contexto del panel en vivo (`kind: "live"`, `live: true`, `channel`, `foreign`, `source`...), mira [Tu pestaña en un canal en vivo](player-panel.md#live-kinds). |
| Cualquier otro canal de En vivo | El contexto mínimo con `live: true`. |

Lee `live` y `lang` (`es-CO`, `en-US`...: un reloj escribe su fecha en ese idioma) y trata todo lo demás como algo que puede
faltar.

## En un canal de En vivo { #live }

- **Los elementos `fixed` siempre se ven; los `overlay` salen con la tarjeta del canal** (la que aparece al cambiar de canal y se
  esconde a los 3 segundos más o menos), y se van con ella.
- **Llegar a un botón: la tecla Menú.** Arriba y Abajo siguen cambiando de canal, así que no entran a la fila. Menú saca la
  tarjeta y pone el foco en el primer botón; Izquierda y Derecha recorren los botones, Abajo o Atrás vuelven al video (Atrás no
  cierra el reproductor). Mientras un botón tiene el foco, la tarjeta se queda. **Un control sin tecla Menú, como el del
  Chromecast con Google TV, no llega a un botón en vivo**: no hagas que una función solo en vivo dependa de uno.
- **Un toque en un canal puede hacer muy poco.** En un canal un plugin siempre cuenta como otro plugin, así que Kino solo
  conserva un salto (o con `playerControl` también `pause` y `speed`), y un canal no tiene línea de tiempo: `seekToMs`,
  `seekStepMs`, `speed`, `skip`, `markers` y `autoNext` se descartan con una línea en el registro, y `resize` nunca se conserva
  para otro plugin. Lo que sobrevive es **`pause` (true o false), y solo con la capacidad `playerControl` aprobada**, que un
  plugin con solo el hueco no puede tener. `openPanel` solo tiene efecto cuando el reproductor del canal ofrece pestañas de panel
  de plugins; en un canal sin ellas (un canal M3U propio, por ejemplo) se ignora y se registra.

## En una película o una serie { #vod }

Con los controles a la vista, **Arriba desde la barra de progreso** llega al primer botón de la fila; Izquierda y Derecha pasan
de un botón a otro y Abajo vuelve a la barra. Sin ningún botón en pantalla (solo textos, íconos e imágenes, o ningún plugin con
hueco) Arriba hace exactamente lo de antes. Los elementos de texto, ícono e imagen nunca reciben el foco.

## Cómo se ve { #look }

Kino dibuja cada elemento con su propio aspecto, así que no aplica ninguna propiedad de estilo del kit de pantallas (`padding`,
`color`, `style`...), y no hay `ring` de foco ni `key` que poner.

- **Un texto** va sobre una píldora oscura translúcida: el tamaño de etiqueta pequeña del reproductor, blanco con sombra (se lee
  sobre el video solo, porque un elemento `fixed` se ve sin los controles), la primera línea en Medium y la segunda en Regular,
  con cifras tabulares para que un reloj que avanza nunca cambie el ancho de la píldora; si no cabe, termina en puntos
  suspensivos.
- **Un botón** es un botón redondo (solo ícono) o una píldora (con texto), con el mismo fondo translúcido mientras no tiene el
  foco.
- **Orden:** los elementos conservan el orden en que los declaraste, los `overlay` a la izquierda de los `fixed`, así que un
  elemento fijo nunca se mueve cuando los otros aparecen y desaparecen.

La tipografía propia de Kino cambia en la misma versión (pesos más livianos en sus propias pantallas); el hueco conserva el
aspecto que se describe aquí, y las [pantallas de los plugins](screens.md) conservan la escala de texto de siempre: los
encabezados siguen en negrita.

## Consentimiento e interruptor { #consent }

- **`fixed` es el que pregunta.** Un plugin con un elemento `fixed` muestra una línea en rojo en su hoja de instalación:
  "Mostrará algo suyo de forma permanente en el reproductor mientras ves un video". Una actualización que agrega un elemento
  `fixed` vuelve a preguntar, marcada como nueva, y Kino nunca la aprueba por su cuenta; al importar con el kit empieza sin
  marcar. Un hueco con solo elementos `overlay` no muestra ninguna línea ni pide aprobación.
- **Por aparato.** La aprobación de un hueco `fixed` nunca pasa desde otro aparato vinculado ni desde una copia de seguridad: la
  persona la aprueba otra vez en cada aparato.
- **El interruptor de la persona**, en la pestaña de tu plugin en Ajustes: "Dejar que muestre algo en el reproductor". Vale para
  todo el aparato y se sincroniza con los demás aparatos de la persona; apagado, Kino deja de llamarte en el acto.
- **Un toque es una acción de la persona; una llamada a `playerSlot` no.** El contexto sigue las mismas reglas de privacidad que
  el de un panel, y el mínimo es todo lo que recibe un título que Kino no puede compartir.

## Probarlo con el kit { #kit }

```bash
node sdk/run.mjs <carpeta> playerSlot [ref]                         # el cuadro: elementos en orden declarado, refreshMs ajustado; lo descartado va a stderr
node sdk/run.mjs <carpeta> playerSlotAction <ref> <id del botón>    # el pedido: { openPanel, player, controlled }
node sdk/run.mjs --foreign <id del plugin>[:<nombre>] <carpeta> playerSlot <ref>   # un título de otro plugin
node sdk/run.mjs --bare <carpeta> playerSlot                        # el contexto de un título privado (sin kind)
node sdk/run.mjs --live-channel tdt:la1:La 1 <carpeta> playerSlot - # el de un canal de En vivo
node sdk/run.mjs --bare --live-channel tdt:la1:La 1 <carpeta> playerSlot -   # un canal que Kino no puede confirmar
node sdk/validate.mjs <carpeta>                                      # también imprime la línea roja de un elemento fixed
```

- `--context '<json>'` mezcla tu JSON sobre el contexto falso del kit (por ejemplo `{"lang":"en-US"}`). El ref es `-` con
  `--live-channel` o `--bare`.
- `validate` revisa el bloque `slot` contra el contrato y que la entrada exporte `playerSlot` y `playerSlotAction`, y (con
  `--run playerSlot`) llama al export y lee su respuesta como lo hace Kino.
- El kit no puede decir cómo se ve un cuadro en una TV: para eso, instala el plugin en un aparato con control remoto.

Mira también [Probar en local](test-locally.md) y [El panel del reproductor](player-panel.md).
