# Temas de la app (apiVersion 18) { #themes }

!!! note "La próxima versión de Kino"
    `appThemes`, `go.useTheme`, `go.setExperience` y `activeTheme` llegan con `"apiVersion": 18`, que `contract.json` asocia a
    Kino 0.9.81: la próxima versión de Kino, **que todavía no está en ningún Kino publicado**. Todo Kino anterior rechaza un
    manifiesto con apiVersion 18 con «Este plugin necesita una versión más nueva de Kino», y `appThemes` no se ofrece por
    [`enhancements`](enhancements.md). Por debajo de apiVersion 18 el campo se ignora.

Un plugin puede ofrecer **aspectos para toda la app**: colores, un fondo, el redondeo de las esquinas, el tamaño del texto,
sombras, movimiento, el tamaño de los controles del reproductor y su propio logo, en todas las pantallas de Kino en el
celular y en el TV. Un tema son **datos en el manifiesto**: no corre código, no usa la red y no necesita ninguna capacidad. La
persona elige un tema en **Ajustes ▸ Apariencia** (o con un botón en tu propia pantalla), puede ajustar lo que tú permitas, y
la elección es por perfil y se sincroniza entre sus aparatos.

No es el campo [`theme`](section-theme.md#theme) de apiVersion 6, que solo colorea *tu* sección, tu pestaña de Ajustes y el
acento del reproductor. Los dos pueden estar en el mismo manifiesto.

## Un plugin que solo trae temas { #theme-only }

```json
{
  "id": "theme-neon",
  "name": "Neón",
  "version": "1.0.0",
  "apiVersion": 18,
  "entry": "plugin.js",
  "description": "Un tema oscuro con acentos neón",
  "hosts": [],
  "categories": ["themes"],
  "appThemes": [
    {
      "id": "neon",
      "name": { "es": "Neón", "en": "Neon" },
      "colors": { "accent": "#00E5FF", "onAccent": "#000000", "background": "#0A0A14", "surface": "#14142A", "surfaceHigh": "#1E1E3A", "railPanel": "#101026" },
      "background": { "type": "gradient", "colors": ["#0A0A14", "#1A0A2E"], "angle": 180 },
      "shape": { "cardRadius": 14, "channelRadius": 14, "buttonRadius": 24, "chipRadius": 20, "dialogRadius": 20, "inputRadius": 12 },
      "typography": { "scale": 1.1, "titleScale": 1.05, "bodyScale": 1.0 },
      "tv": { "typography": { "scale": 1.0 } },
      "adjustable": {
        "colors.accent": { "swatches": ["#00E5FF", "#7C4DFF", "#FFB300"] },
        "shape.cardRadius": { "min": 0, "max": 20 },
        "typography.scale": { "min": 1.0, "max": 1.3 },
        "background": true
      }
    }
  ]
}
```

`plugin.js` puede estar vacío (`export {};`): Kino lo carga y no llama nada. Reglas para un plugin así:

- **Sin capacidades.** Un plugin cuyo único contenido es `appThemes` puede omitir `capabilities` (o agregar solo `screen`, para
  una página de presentación: ver [Activar un tema desde tu pantalla](#use-theme)).
- **`"hosts": []`** se permite desde apiVersion 18 en un plugin que solo trae `appThemes`: no llega a ningún lado, y su
  tarjeta dice que no se conecta a internet.
- **`"categories": ["themes"]`** lo lista en **Temas** en la tienda de plugins de Kino. `themes` es uno de los nueve valores
  de la tienda (`movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `themes`, `adult`).
- No reproduce nada, así que no abre el paso más allá del primer selector de fuentes de Kino.
- Sin línea de consentimiento: activar un tema es el consentimiento de la persona, y un tema no concede nada (ni red, ni
  código, ni datos).
- Cualquier otro plugin (un catálogo, un plugin de TV en vivo) también puede traer `appThemes` junto a sus capacidades.

## Los campos de un tema { #fields }

`appThemes` es una lista de **1 a 8** temas. Cada uno:

| Campo | Regla |
| --- | --- |
| `id` | Obligatorio. `^[a-z0-9][a-z0-9-]{1,39}$`, único en el plugin. Nunca lo cambies después de publicar: de él cuelgan la elección y los ajustes de la persona. |
| `name` | Obligatorio. `{ "es", "en" }` (si falta uno, toma el otro) o un solo texto para los dos; como máximo 40 caracteres. |
| `colors`, `shape`, `typography`, `elevation`, `motion`, `player` | Los grupos de tokens de abajo. Todos son opcionales: lo que no pongas sigue siendo de Kino. |
| `background` | `{ "type": "solid", "colors": [uno] }` o `{ "type": "gradient", "colors": [2 a 8], "angle": grados enteros }` (ángulo por defecto 180). `image` se rechaza por ahora: "background.image arrives in a later version of Kino; remove it from this theme". |
| `tv`, `phone` | Los mismos grupos y `background`, que reemplazan al tema solo en ese tipo de aparato. |
| `adjustable` | Lo que la persona puede cambiar en Ajustes ▸ Apariencia ▸ Personalizar (como máximo 40 tokens): `true`, `{ "swatches": ["#RRGGBB", …] }` (solo colores) o `{ "min", "max" }` (solo números). |
| `pluginColors` | `"respect"` (por defecto) u `"override"`: qué pasa con los colores `theme` de apiVersion 6 de los otros plugins. |
| `price` | Opcional `{ "kinos": 1 a 1000, "payTo": "<64 hex en minúscula>" }`. Sin `price`, el tema es gratis. Ver [Temas con precio](#price). |
| `experience` | Opcional `"light"` o `"full"`: la experiencia de toda la app con la que el tema se ve mejor. Ver [La experiencia](#experience). |
| `logo` | Opcional `{ "wordmark"?, "mark"? }`, solo vectores. Ver [Tu propio logo](#logo). |

**Un error de formato rechaza todo el manifiesto**: un campo o token desconocido, un tipo equivocado (un número donde va un
color), un `id` inválido, dos temas con el mismo `id`, más de 8 temas, un `name` de más de 40 caracteres, un `price`,
`experience` o `logo` mal formado. **Un valor fuera de su rango no rechaza nada**: Kino descarta ese token con una advertencia y
deja su propio valor, así que el tema sigue funcionando. `node sdk/validate.mjs .` muestra esas advertencias para el celular y
el TV.

## Tokens y rangos { #tokens }

Los 39 tokens, con los rangos que aplica `contract.json` (`manifest.appThemes`):

| Grupo | Token | Tipo y rango | Valor propio de Kino |
| --- | --- | --- | --- |
| `colors` | `accent` | `#RRGGBB` | `#E50914` |
| `colors` | `onAccent` (texto e íconos sobre el acento) | `#RRGGBB` | `#FFFFFF` |
| `colors` | `background` | `#RRGGBB` (o el campo `background`) | `#0E0E0E` |
| `colors` | `surface` (tarjetas, paneles) | `#RRGGBB` | `#181818` |
| `colors` | `surfaceHigh` (paneles elevados) | `#RRGGBB` | `#242424` |
| `colors` | `textPrimary`, `textSecondary` | `#RRGGBB` | `#F5F5F5`, `#B3B3B3` |
| `colors` | `focus`, `onFocus` (el marcador de foco del TV) | `#RRGGBB` | `#FFFFFF`, `#000000` |
| `colors` | `outline`, `railPanel`, `placeholderTop`, `placeholderBottom`, `success`, `warning`, `error`, `favorite`, `scrim` | `#RRGGBB` | los de Kino |
| `shape` | `cardRadius`, `channelRadius`, `buttonRadius`, `chipRadius`, `dialogRadius`, `inputRadius` | número, de 0 a 32 | los de Kino |
| `typography` | `scale`, `titleScale`, `bodyScale` | número, de 0,85 a 1,3 | 1 |
| `elevation` | `cardShadow`, `dialogShadow` | número, de 0 a 1 | los de Kino |
| `elevation` | `heroScrim` | número, de 0,3 a 1 | el de Kino |
| `motion` | `focusZoom` | número, de 1 a 1,15 | el de Kino |
| `motion` | `crossfadeMs` | número, de 0 a 800 | el de Kino |
| `motion` | `heroDrift` | `"on"` u `"off"` | el de Kino |
| `player` | `buttonScale` | número, de 0,8 a 1,4 | 1 |
| `player` | `playButtonScale` | número, de 0,8 a 1,6 | 1 |
| `player` | `seekBarScale` | número, de 0,8 a 2 | 1 |
| `player` | `labelScale` | número, de 0,85 a 1,3 | 1 |
| `player` | `buttonShape` | `"circle"`, `"rounded"` o `"square"` | el de Kino |

Cada token se nombra por su ruta: `colors.accent`, `shape.cardRadius`, `player.buttonShape` (así los nombra `adjustable`).
`typography.scale` multiplica la escala de letra del sistema (la combinación tiene un tope). En el celular un botón del
reproductor puede verse más pequeño, pero su zona táctil nunca baja de 48 dp; en el TV el botón enfocado conserva el marcador de
foco de Kino, solo recoloreado con `focus` y `onFocus`.

## Cómo resuelve Kino un tema { #resolution }

De menor a mayor prioridad, por token:

1. El valor propio de Kino.
2. El tema, y luego su bloque `tv` o `phone`.
3. Los ajustes de la persona, solo en tokens de `adjustable`, limitados a su `min`/`max` (o a uno de sus `swatches`) y a los
   rangos de arriba.
4. **El aparato.** Con los efectos reducidos (Ajustes ▸ Experiencia visual) los tokens de `motion` no hacen nada; si las
   tarjetas del TV van redondeadas o no lo sigue decidiendo el interruptor «Esquinas redondeadas» de la persona (apagado por
   defecto en el TV, por rendimiento; Apariencia ofrece encenderlo cuando un tema usa redondeo). Un tema nunca decide lo que un
   aparato puede dibujar.

### Las protecciones de legibilidad { #guardrails }

Los mismos umbrales que el `theme` de apiVersion 6 (`minTextContrast` 4,5 y `minUiContrast` 3), medidos sobre los colores
**efectivos** (los de Kino donde tu tema cambió solo un lado). Un par que falla vuelve a los valores de Kino en el lado que tu
tema puso, con una advertencia:

| Par | Necesita | Si falla |
| --- | --- | --- |
| El fondo (cada color del degradado) | oscuro: luminancia relativa de 0,05 como máximo | el fondo de Kino (los temas claros llegan después) |
| `accent` sobre el fondo | 3:1 | `accent` y `onAccent` de Kino, como par |
| `onAccent` sobre `accent` | 4,5:1 | `accent` y `onAccent` de Kino, como par |
| El acento de Kino sobre tu fondo | 3:1 | el fondo de Kino |
| `textPrimary` y `textSecondary` sobre el fondo y `surface` | 4,5:1 | los colores de texto de Kino |
| `textPrimary` sobre `surfaceHigh` | 4,5:1 | el `surfaceHigh` de Kino (y después los colores de texto) |
| El texto sobre tu `surface` | 4,5:1 | el `surface` de Kino |
| `focus` sobre el fondo; `onFocus` sobre `focus` | 3:1; 4,5:1 | `focus` y `onFocus` de Kino |

A diferencia del `theme` de apiVersion 6, `appThemes` no tiene la regla de «no parecerse al rojo de Kino». Los ajustes de la
persona pasan por las mismas comprobaciones: Apariencia rechaza, con palabras de Kino, un color que no se leería.

### Lo que un tema nunca cambia { #never }

Kino dibuja con su propio aspecto, sea cual sea el tema activo: Ajustes ▸ Apariencia misma, su vista previa, las preguntas de
compra y de experiencia, las hojas de consentimiento al instalar y actualizar plugins, el código +18 y los bloqueos de ajustes,
la hoja de `go.url`, la pantalla de bloqueo y cualquier otra pantalla que le pide una decisión a la persona. El logo propio de
Kino se queda en la pantalla de inicio, la puerta de entrada y esas pantallas de decisión. Los códigos QR siguen en negro sobre
blanco, y lo que se dibuja sobre el video o las imágenes conserva sus colores.

## `pluginColors` { #plugin-colors }

Otros plugins pueden tener sus propios colores `theme` de apiVersion 6. Con `"respect"` (por defecto) sus páginas y el acento
de su reproductor los conservan; con `"override"` mandan los colores del tema activo en todas partes. La persona siempre tiene
la última palabra: Apariencia muestra un interruptor **Colores de los plugins** en todos los temas, declares lo que declares.

## Temas con precio (`price`) { #price }

Un tema puede costar **kinos**, la moneda gratuita de Kino (la persona los gana viendo contenido: 1 cada 10 minutos, como
máximo 20 por día UTC).

```json
"price": { "kinos": 50, "payTo": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" }
```

- `kinos` es un número entero de 1 a 1000; `payTo` es **tu** cuenta de kinos: 64 caracteres hexadecimales en minúscula. Los dos
  van juntos; cualquier otra cosa rechaza el manifiesto.
- Antes de que se active un tema con precio (desde Apariencia, desde la hoja de gestión de tu plugin o desde tu propio
  `go.useTheme`), Kino muestra su propia hoja de compra: «Comprar «nombre»», «Cuesta N kinos.», el saldo de la persona («Tienes
  N kinos.») y **Comprar por N kinos**, activo solo si el saldo alcanza (si no, «Te faltan N kinos para comprarlo.»). Una compra
  que falla no cobra nada. Apariencia muestra el precio en la lista y en el botón de la vista previa, y el saldo junto a los
  temas con precio.
- Los kinos van a `payTo`. Una compra por tema y por cuenta, válida en todos los aparatos de la persona.
- Tu plugin nunca ve la compra, el saldo ni la sesión de monedas: **no necesitas la capacidad `coins` para vender un tema.**
  Declara [`coins`](kino-api.md#coins) (apiVersion 16, línea de consentimiento en rojo) solo si tu propia pantalla quiere mostrar
  el saldo con `kino.coins.balance()`; cuando rechace con `disabled`, no muestres nada sobre kinos.
- El precio y la cuenta están en tu manifiesto público: son lo que Kino cobra y paga, no un candado sobre tus archivos.
- **Tu cuenta.** Una cuenta de kinos es el mismo identificador de 64 hexadecimales que Kino Social llama `user_key` del autor:
  el servicio de monedas lo calcula a partir de la identidad de Telegram de la persona con un secreto, y nunca guarda el id de
  Telegram. Es el id de quien inició sesión en Kino con Telegram, así que `payTo` debe ser la cuenta de quien cobra. En la
  próxima versión de Kino (0.9.81, aún sin publicar) la ves y la copias en **Ajustes ▸ App ▸ Tu cuenta de kinos** (necesita el
  interruptor Kinos activado y tu sesión de Telegram): toca la fila para copiar los 64 caracteres completos.
- **Tu propio tema.** El servicio rechaza una compra cuyo comprador y `payTo` son la misma cuenta (`self_purchase`): no se
  cobra nada. Para probar el flujo de compra usa una segunda cuenta, o los mocks del kit y una compilación de depuración.
- **Reembolsos.** No hay: una compra es definitiva, los kinos ya están en el saldo del autor y el servicio no tiene operación de
  reembolso. Lo que la persona nunca paga es una compra fallida: no cobra nada, y comprar dos veces el mismo tema cobra una vez.

## La experiencia (`experience`, `go.setExperience`) { #experience }

Kino tiene dos modos para toda la app en Ajustes ▸ Experiencia visual: **ligera** (sin sombras, sin efectos, esquinas rectas) y
**completa** (todos los efectos, esquinas redondeadas).

- Un tema que se ve mejor con uno lo dice con `"experience": "light"` o `"full"`. Cuando la persona activa el tema, Kino
  pregunta («Este tema se ve mejor con la experiencia completa. ¿La usamos también?», con «Usar la completa» y «Dejar la
  actual»). Nada cambia sin su sí, y no se pregunta nada si la app ya la tiene.
- Tu propia pantalla también puede pedirla: `go: { setExperience: "light" | "full" }`, solo desde la pulsación o el envío de la
  propia persona en tu pantalla (nunca `open`, un temporizador, un cambio, un «cargar más», un `onClose`, un panel ni un aviso).
  Kino pregunta antes, nombrando tu plugin («Tu plugin» pide la experiencia completa. ¿La usamos?). Cualquier otro valor
  descarta el `go`, con registro.

## Tu propio logo (`logo`) { #logo }

Un tema puede dibujar su propio logo en lugar del de Kino en el menú lateral y la cabecera del celular y en el riel del TV. Solo
vectores (ningún archivo de imagen, nada de red):

```json
"logo": {
  "wordmark": { "size": [120, 30], "paths": [{ "d": "M0 0 L26 15 L0 30 Z", "fill": "accent" },
                                              { "d": "M40 4 H52 V26 H40 Z", "fill": "textPrimary" }] },
  "mark": { "size": [30, 30], "paths": [{ "d": "M15 0 L30 15 L15 30 L0 15 Z", "fill": "accent" }] }
}
```

- Al menos uno de `wordmark` (el logo largo: menú y cabecera del celular, el riel abierto del TV) y `mark` (el cuadrado: el
  riel cerrado del TV). Lo que no pongas sigue siendo de Kino.
- `size` es `[ancho, alto]`, números enteros de 1 a 1000, como máximo 8 veces más ancho que alto (o al revés).
- De 1 a 8 `paths`, cada `d` de hasta 2.000 caracteres de datos de trazo SVG (`M L H V C S Q T A Z`, números, espacios, comas,
  signos); `fill` es `accent`, `onAccent`, `textPrimary`, `textSecondary` (siguen al tema y a los ajustes de la persona) o un
  `#RRGGBB` fijo.
- Kino conserva su propio logo en la pantalla de inicio, la puerta de entrada y toda pantalla que pide una decisión.

## Activar un tema desde tu pantalla (`go.useTheme`, `activeTheme`) { #use-theme }

La persona activa un tema en **Ajustes ▸ Apariencia** (Tema de Kino siempre es la primera opción; una vista previa muestra una
fila del Inicio, un diálogo y los controles del reproductor antes de **Usar este tema**), desde la hoja de gestión de tu plugin
(«Ver temas», «Activar tema de …») o desde un botón en **tu propia [pantalla](screens.md)** (la capacidad `screen`, apiVersion
14 o más, que un plugin de temas puede declarar para presentar su tema):

```js
export async function screen({ activeTheme }) {
  const on = activeTheme === "neon";
  return { type: "ElevatedButton", labelText: on ? "Desactivar" : "Activar", labelTextEn: on ? "Turn off" : "Turn on",
    onPressed: { go: { useTheme: { theme: on ? null : "neon" } } } };
}
export async function screenEvent() { return null; }
```

- `screen` y `screenEvent` reciben **`activeTheme`**: el id de tu tema activo ahora, o `null`. Kino vuelve a llamar a `screen`
  después de cualquier cambio (también uno hecho en Apariencia), así que un mismo botón puede alternar.
- `go: { useTheme: { theme } }`: `theme` es uno de tus ids de `appThemes` (hace lo mismo que el botón de Apariencia: la misma
  elección por perfil, la misma sincronización, se conservan los ajustes de la persona) o `null` (vuelve al tema de Kino, solo
  mientras uno de los tuyos está activo: nunca puedes quitar el de otro plugin).
- Solo desde la pulsación o el envío de la propia persona en tu pantalla: se descarta, con registro, desde `open`, un
  temporizador, un cambio, un «cargar más», el `onClose` de una ventana, un panel o un aviso, y por debajo de apiVersion 18. Se
  rechaza, con registro y sin cambiar nada, cuando Apariencia no muestra ese tema como tuyo (el id de otro plugin, tu plugin
  apagado en este perfil, +18 mientras está bloqueado).
- Un tema con precio que la persona no ha comprado abre primero la hoja de compra de Kino; un tema con `experience` pregunta por
  ella.
- Kino muestra su propio aviso, «Tema aplicado» o «Volviste al tema de Kino», y vuelve a pintar toda la app, tu pantalla
  incluida.
- Una pantalla de presentación que no necesita ícono en el menú puede abrirse solo desde tu página de ajustes:
  `"screen": { "label": "Neón", "opensFrom": ["settings"], "settingsButton": { "label": "Ver presentación", "labelEn": "See presentation" } }`.

## Lo que ve la persona { #person }

- Hay un solo tema activo a la vez, por perfil; la elección y los ajustes se sincronizan entre los aparatos vinculados de la
  persona, en las dos direcciones.
- **Personalizar** muestra solo lo que marcaste como `adjustable` (muestras de color y un `#RRGGBB` escrito para los colores:
  las muestras son lo que funciona con un control remoto; un contador para los números), y «Volver a los valores del tema».
- Desactivar o quitar tu plugin vuelve al tema de Kino; la elección se guarda y regresa si se reinstala. Una actualización vuelve
  a resolver el tema, y se descartan los ajustes de tokens que ya no son `adjustable`.
- Cualquier falla al resolver un tema deja el aspecto propio de Kino, nunca un cierre de la app.

## Pruébalo con el kit { #kit }

```
node sdk/validate.mjs .                                                   # formato y advertencias de cada tema en celular y TV
node sdk/run.mjs --context '{"activeTheme":"neon"}' . screen              # tu pantalla de presentación con tu tema activo
node sdk/run.mjs . screenEvent activate --trigger tap                     # qué hace Kino con go.useTheme / go.setExperience
```

`validate.mjs` muestra líneas como `appThemes neon (tv): shape.cardRadius: 40.0 is outside 0.0..32.0; Kino's is used` y
`appThemes neon (phone): background: is too light (the background must be dark for now); Kino's is used`: las mismas
advertencias de la app, palabra por palabra. `screen` imprime el árbol sin los `go` mal formados, y `screenEvent` dice cuándo se descartaría un `go.useTheme` de una respuesta (no es un toque, no es uno de
tus ids, `null` sin ninguno de los tuyos activo). El kit no dibuja colores: mira el tema en Kino (Ajustes ▸ Apariencia ▸ la vista
previa).

## Lista de verificación { #checklist }

- [ ] `"apiVersion": 18`, y la persona sabe que necesita la próxima versión de Kino.
- [ ] `node sdk/validate.mjs .` pasa y no muestra advertencias que no esperabas, ni en celular ni en TV.
- [ ] Cada `id` de tema es definitivo; `name` tiene `es` y `en`.
- [ ] El fondo es oscuro y cada par de [las protecciones](#guardrails) se lee.
- [ ] `adjustable` ofrece muestras de color (no solo colores libres) para que se pueda usar con un control remoto.
- [ ] Un `price` lleva tu `payTo` real; no agregaste `coins` solo para vender.
- [ ] Una pantalla que activa el tema lee `activeTheme` y usa `go.useTheme` solo desde un toque.
- [ ] `"categories": ["themes"]`, y `"hosts": []` cuando el plugin solo trae temas.
