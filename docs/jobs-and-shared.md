# Trabajos en segundo plano, resultados compartidos e IA { #jobs-and-shared }

!!! note "Disponible con Kino 0.9.74"
    Disponible con Kino 0.9.74 (la próxima versión, aún no publicada). Una versión anterior de Kino rechaza estos
    plugins con «Este plugin necesita una versión más nueva de Kino»; para seguir llegando a quien tiene una versión
    anterior usa `enhancements` (ver [Pantallas sin subir tu apiVersion](enhancements.md)).

Tres capacidades ayudan a que tu [pantalla](screens.md) abra con datos frescos sin hacer esperar a nadie:

- **`schedule`** (con el campo `jobs` del manifiesto y el export `job`): Kino corre tu código en segundo plano cada cierto
  tiempo ([abajo](#jobs)).
- **`shared`**: unos pocos resultados que se sincronizan entre los aparatos vinculados de la persona, para que el
  celular haga el trabajo y la TV lo lea ([abajo](#shared)).
- **`ai`**: una pregunta corta a la IA de texto de Kino, para resumir o clasificar ([abajo](#ai)).

Ninguna va sola: un trabajo alimenta lo que muestra tu pantalla o tu catálogo.

El ejemplo de referencia es **Solo noticias** (<https://github.com/kinotvapp/kino-plugin-news>): una pantalla de
noticias y un trabajo que, desde el celular, busca los titulares, los ordena con la IA y deja el resultado en
`kino.shared` para que la pantalla de la TV lo lea al abrir.

## El consentimiento { #consent }

| Capacidad | Lo que lee la persona | En rojo, espera aprobación | El interruptor de la persona (tu pestaña en Ajustes) |
| --- | --- | --- | --- |
| `schedule` | «Podrá ejecutarse en segundo plano cada cierto tiempo para actualizar sus datos, usando internet y batería» | sí | «Dejar que trabaje en segundo plano» |
| `ai` | «Podrá enviar texto a un servicio de IA de terceros (Kilo) para que lo resuma o clasifique; lo que envíe sale de tu aparato» | sí | «Dejar que use la IA de texto» |
| `shared` | «Guarda unos pocos resultados que se sincronizan entre tus aparatos vinculados» | no | ninguno |

- Una línea roja se pregunta al instalar y otra vez en la actualización que la agrega, y **Kino nunca la aprueba por su
  cuenta**; al importar con el kit empieza sin marcar. Hasta que la persona la aprueba, la API rechaza, así que maneja
  siempre el rechazo y funciona sin ella.
- Cada interruptor está en la pestaña de tu plugin en Ajustes, vale para todo el aparato y todos los perfiles, y se
  sincroniza con los demás aparatos de la persona. Apagado, la API rechaza de una vez (el trabajo de un job se cancela).
- `shared` es una línea simple: se marca como nueva en la actualización que la agrega y nunca espera aprobación (son los
  datos de la persona en sus propios aparatos). Una actualización que solo agrega `shared` se aplica sin hoja.
- Sé honesto en tu propia interfaz: di qué envías y adónde (los ajustes de Solo noticias dicen «Los titulares se envían al
  servicio de IA de terceros de Kino»).

El modelo completo está en [Pantallas](screens.md#consent).

## Trabajos en segundo plano (`schedule`, `jobs`, `job(ctx)`) { #jobs }

La capacidad `schedule`, el campo `jobs` del manifiesto y el export `job` se necesitan entre sí; un trabajo nunca va solo
(alimenta lo que muestra tu pantalla o tu catálogo):

```json
"capabilities": ["screen", "schedule", "shared"],
"jobs": [{ "id": "refresh", "label": { "es": "Actualizar", "en": "Refresh" }, "everyMin": 60,
           "everyOptions": [15, 60, 180, 1440], "runOn": "preferPhone" }]
```

```js
export async function job({ id, reason, lastRunMs, attempt }) {
  const data = await refreshSomething(); // a few requests, one at a time
  kino.storage.set("feed", JSON.stringify(data)); // or kino.shared, for "preferPhone"
}
```

### El campo `jobs` del manifiesto { #jobs-manifest }

Obligatorio con la capacidad `schedule` y rechazado sin ella: de 1 a 3 trabajos, cada uno así:

```json
{ "id": "refresh", "label": { "es": "Actualizar noticias", "en": "Refresh news" }, "everyMin": 60,
  "everyOptions": [15, 30, 60, 180, 720, 1440] }
```

| Campo | Qué es |
| --- | --- |
| `id` | De 1 a 24 caracteres (`a-z`, `0-9`, `-`), único. |
| `label` | `{ es, en? }`: `es` de 1 a 40 caracteres, `en` opcional con el mismo límite (se quitan los caracteres de control y de dirección). |
| `everyOptions` | De 1 a 6 minutos enteros distintos, de 15 (el mínimo de Android para un trabajo periódico) a 1440. |
| `everyMin` | El valor por defecto: uno de `everyOptions`. |
| `runOn` | Opcional: `"any"` (por defecto) o `"preferPhone"`; mira [abajo](#prefer-phone). |
| `enabledBy` | Opcional: la clave de uno de tus ajustes `toggle`; mira [abajo](#enabled-by). |

Cualquier otra clave de un trabajo se ignora. Los textos con que se rechaza un manifiesto:

| Problema | Texto |
| --- | --- |
| `jobs` sin `schedule` | `The "jobs" field needs the "schedule" capability` |
| `schedule` sin `jobs` | `The "schedule" capability needs a "jobs" list with 1 to 3 jobs` |
| `jobs` no es una lista válida | `The "jobs" field must be a list of 1 to 3 jobs` |
| `id` | `Each job needs an "id" of 1 to 24 characters: a-z, 0-9 and -` / `Two jobs have the same "id"` |
| `label` | `Each job needs a "label" object whose "es" is 1 to 40 characters ("en" optional, the same limit)` |
| `everyOptions` | `Each job's "everyOptions" must list 1 to 6 different whole numbers of minutes from 15 to 1440` |
| `everyMin` | `Each job's "everyMin" must be one of its "everyOptions"` |
| `runOn` | `Each job's "runOn" must be "any" or "preferPhone"` |
| `enabledBy` | `Each job's "enabledBy" must name one of the plugin's toggle settings` |

### Cómo corre { #jobs-run }

- Kino corre `job(ctx)` sin interfaz, con el WorkManager de Android, cada `everyMin` minutos mientras la persona tiene
  ese trabajo encendido: **cada trabajo empieza apagado** (la persona lo enciende), y vuelve a apagarse después de
  cualquier hueco en su aprobación (desinstalado, una actualización sin él, una reinstalación).
- `ctx` es `{ id, reason, lastRunMs, attempt }`: `id` es el del manifiesto; `reason` es `scheduled` o `manual`
  («Ejecutar ahora»); `lastRunMs` es cuándo corrió por última vez en este aparato (`null` antes de la primera vez);
  `attempt` es 1 más sus fallas seguidas.
- **Su respuesta nunca se lee y nada de un trabajo se muestra**: escribe en `kino.storage` (o en
  [`kino.shared`](#shared)) y deja que tu pantalla lo lea al abrir (mostrar lo guardado y refrescar después).
- Nunca empieza mientras corre una llamada de tu pantalla, tu panel o tu catálogo (espera hasta 30 s y luego cede).
- Necesita red y batería no baja; «Solo con Wi-Fi» está encendido por defecto (por plugin).
- Se detiene si el plugin se desactiva, se quita o se actualiza (después corre como un trabajo nuevo), si el trabajo se
  apaga o queda en pausa, o si Kino apaga las pantallas de plugins.

### Topes por ejecución { #jobs-caps }

| Qué | Tope |
| --- | --- |
| Tiempo | 20 s |
| Peticiones | 10, hechas una a la vez (la siguiente responde `rate_limited`) |
| Cuerpos de respuesta | 2 MB en total (una respuesta que lo pasaría se rechaza con `too_large`, nunca se entrega) |
| Escritura en `kino.storage` | 256 KB (bytes UTF-8 de claves y valores; el siguiente `set` lanza `too_large`) |
| Ejecuciones | 96 al día por plugin (UTC), todos sus trabajos juntos |

Un tope cruzado corta la ejecución y cuenta como falla. Una falla espera 15 minutos, duplicándose hasta 6 h; **3 seguidas
pausan el trabajo** hasta que la persona lo apague y lo encienda, o una ejecución manual salga bien. Kino nombra la falla
con sus propias palabras (`timeout`, `cap_fetches`, `cap_bytes`, `cap_storage`, `network` solo cuando `kino.fetch` mismo no
llegó a un sitio, `plugin_error`).

### Las APIs de un trabajo { #jobs-apis }

Una lista permitida:

- `kino.fetch` (tus hosts declarados y todas las reglas y cupos de siempre), `kino.storage`, `kino.log`, `kino.config`
  (solo lectura), `kino.cookies`, `kino.crypto`, `kino.sleep`, `kino.html`, `kino.secret`, `kino.error`, `kino.rank`.
- [`kino.library`](rooms.md#library), con su propia aprobación (la misma regla de +18, redondeo y ritmo).
- [`kino.ai`](#ai), con su propia aprobación; cada pregunta es una de las 10 peticiones de la ejecución.
- [`kino.shared`](#shared).
- [`kino.seed`](kino-api.md#seed), con las mismas reglas de siempre: el mismo consentimiento de telemetría, el mismo
  filtro y los mismos topes. Así una contribución puede pasar de después de Inicio a un trabajo (con
  [`enabledBy`](#enabled-by) en tu ajuste de contribución, corre justo mientras la persona deje ese ajuste encendido).
- Los valores simples: `kino.apiVersion`, `kino.appVersion`, `kino.lang`, `kino.device`, `kino.fetchAnyHost`,
  `kino.screen`.

Todo lo demás (`kino.room`, `kino.qr`, `kino.browser`, `kino.ws`, `kino.meta`, `kino.tmdb`, `kino.nuvio`,
`kino.catalog`, `kino.sync`, `kino.cloudstream` y cualquier API posterior) responde `not_allowed` (con una línea en el
registro). De un trabajo no puede salir ninguna interfaz, `go`, aviso, acción del reproductor ni sala. Cuando la ejecución
terminó (respondió o se cortó), toda API rechaza lo que su evaluación todavía intente.

### Las filas de Kino en Ajustes { #jobs-rows }

En la pestaña de tu plugin en Ajustes Kino dibuja, para cada trabajo (tú no dibujas nada): su interruptor, su frecuencia
(solo tus `everyOptions`), «Solo con Wi-Fi», la última ejecución y «Ejecutar ahora» (`reason: "manual"`, con los mismos
topes; apagado el permiso, ni una ejecución manual corre). Las elecciones de la persona (encendido, frecuencia, solo Wi-Fi)
se sincronizan entre sus aparatos.

Una actualización nunca hace que un trabajo encendido corra más seguido que antes: queda la elección de la persona si
sigue siendo una opción, si no la opción más cercana que sea al menos tan lenta como el nuevo `everyMin` y como el periodo
con que corría; cuando ninguna opción es tan lenta, el trabajo se apaga y su fila le pide a la persona elegir de nuevo.

### `runOn: "preferPhone"` { #prefer-phone }

`runOn: "any"` (por defecto): cada aparato que tiene el plugin corre su propio trabajo, para su propio `kino.storage`.

`runOn: "preferPhone"`: **UNO** de los aparatos vinculados de la persona lo corre, primero un celular vinculado:

- Una TV nunca lo corre mientras un celular que lo corrió **con éxito** en los últimos dos periodos pueda hacerlo. Sin
  celular, o sin una ejecución exitosa en el celular durante dos periodos (su trabajo en pausa o apagado allá, sin Wi-Fi con
  «Solo con Wi-Fi», la app detenida), el aparato que tiene el plugin (la TV) lo corre él mismo.
- Cada aparato decide solo, a partir de un registro sincronizado (sin votaciones); en un aparato que no le toca, el aviso
  de ejecución se salta de una vez (sin red y sin contar como falla). Un solapamiento raro lo corre dos veces, sin daño con
  resultados donde gana la última escritura.
- Escribe el resultado con [`kino.shared`](#shared) para que la pantalla de la TV lo lea, y lee `kino.device` en el
  trabajo para hacer un lote más liviano cuando sí lo corre la TV (Kino no impone nada más; valen los topes del trabajo).
- La fila de Kino agrega «Hacer el trabajo en» con dos opciones, «Este aparato» y «El celular si está vinculado» (por
  defecto), y «Última ejecución en: {device}». «Ejecutar ahora» corre en el aparato donde se presiona.

### Un ajuste que lo enciende (`enabledBy`) { #enabled-by }

Un trabajo puede nombrar uno de tus ajustes `toggle`, `"enabledBy": "contribute"`: ese ajuste pasa a ser el encendido y
apagado de la persona para el trabajo, en lugar del interruptor propio del trabajo (sin un segundo interruptor que buscar).

- El trabajo está encendido mientras el ajuste está encendido (cuenta su `default`) y la fila del trabajo en Ajustes no
  tiene un apagado de la persona: la fila igual puede apagarlo, y ese apagado gana hasta que la persona vuelva a encender la
  fila. Con el ajuste apagado, el trabajo nunca corre.
- La fila de Kino dice qué ajuste lo maneja: «Lo enciende y lo apaga el ajuste «{label}» del plugin; aquí también puedes
  apagarlo.»
- Cualquier cosa que no sea la clave de uno de tus ajustes `toggle` rechaza el manifiesto (`Each job's "enabledBy" must
  name one of the plugin's toggle settings`); en un bloque de `enhancements`, el bloque se descarta.
- La línea de consentimiento, el interruptor del permiso, la frecuencia, «Solo con Wi-Fi» y todos los topes siguen igual.

### Probarlo con el kit { #jobs-kit }

```
node sdk/run.mjs <carpeta> job [jobId] [scheduled|manual]        # one job run, with Kino's caps
node sdk/run.mjs --device phone <carpeta> job refresh manual      # the job, as the phone
node sdk/run.mjs --device tv <carpeta> screen                     # ...then read what the job shared, as the TV
```

## Resultados compartidos entre aparatos (`shared`) { #shared }

Una capacidad declarativa (sin export) que nunca va sola, con una línea de consentimiento **simple** (no roja, nunca
espera: son los datos de la persona en sus propios aparatos; una actualización que solo agrega `shared` se aplica sin
hoja).

```js
kino.shared.set("digest", { at: Date.now(), items: top });  // true when stored, false when it was already that value
const digest = kino.shared.get("digest");                   // the value or null; never throws for a stored value
kino.shared.set("digest", null);                            // removes it
```

- `kino.shared.get(key)` responde el valor o `null` (nunca lanza por un valor guardado: uno que este motor no puede leer
  responde `null`). `kino.shared.set(key, value)` responde `true` cuando lo guardó y `false` cuando ya era ese valor (no
  se escribe ni se envía nada); `set(key, null)` lo quita.
- Síncrono, como `kino.storage`, desde pantallas, paneles, ajustes y trabajos (en un trabajo no cuenta contra su tope de
  `kino.storage`, sino contra estos límites).
- Detéctalo con `typeof kino.shared === "object"`.

### Límites { #shared-limits }

| Qué | Límite |
| --- | --- |
| Claves | hasta 4 por plugin, `^[A-Za-z0-9_.-]{1,40}$` |
| Un valor | JSON estricto de máximo 64 KB (UTF-8) y 16 niveles |
| Todo el plugin | 128 KB de valores |
| Escrituras | 30 por minuto por plugin (`rate_limited`) |
| Viaje | el valor nuevo de una clave viaja como mucho una vez por minuto, y como mucho 4 de tus claves por minuto |

- Los valores se sincronizan entre los aparatos vinculados de la persona, en las dos vías, **por perfil** (una TV con los
  perfiles de varias personas nunca le pasa los valores de una al celular de otra); gana la última escritura según un reloj
  que asigna Kino. Un trabajo programado (que es de todo el aparato) escribe en el perfil en uso. Las lecturas en este
  aparato ven el valor nuevo de una vez.
- Un aparato que no está vinculado con ningún otro los guarda como un almacenamiento local normal.
- Se borran (en todos los aparatos vinculados) cuando se quita el plugin. Cada plugin alcanza solo sus propias claves.
- Errores (lanzados como errores de Kino): `not_allowed` (sin la capacidad, el plugin apagado, un valor sellado),
  `bad_request` (una clave mala, un valor que no es JSON, una clave que parece secreta), `too_large`, `rate_limited`.

!!! warning "Nunca un secreto en `shared`"
    Nunca pongas ahí un token, una contraseña, una cookie ni una sesión: se copia a cada aparato vinculado. Una clave con
    una palabra así (`token`, `secret`, `password`, `cookie`, `session`, `auth`, `apiKey`, también en plural; `author` sí
    vale) se rechaza, y también un valor que contenga un secreto sellado. Esos van en `kino.storage` o en tus ajustes.

!!! warning "Lo que responde `get` no es de fiar"
    Lo escribió otro aparato, quizás con otra versión de tu plugin. Valida su forma, sus tamaños y cada campo antes de
    usarlo.

### Probarlo con el kit { #shared-kit }

`--device phone` y `--device tv` son dos aparatos simulados que comparten `.kino-shared.json`:

```
node sdk/run.mjs --device phone <carpeta> job
node sdk/run.mjs --device tv <carpeta> screen
node sdk/run.mjs <carpeta> shared                                 # what the simulated phone and TV hold
```

## La IA de texto de Kino (`ai`) { #ai }

`kino.ai.ask({ prompt, system?, json?, maxChars? })` envía un texto corto a la IA de texto de Kino (los modelos gratis
de Kilo, el mismo destino fijo que el asistente propio de Kino; sin llave y sin un servidor tuyo) y responde
`{ ok: true, text, model }` o `{ ok: false, error, message }`. **Nunca lanza.**

```js
const answer = await kino.ai.ask({
  system: "Classify each headline as sports, politics or other.",
  prompt: headlines.map((h, i) => `${i}. ${h.title}`).join("\n"),
  json: true,
  maxChars: 1000,
});
if (!answer.ok) return fallback(); // unavailable, rate_limited, too_large, timeout or refused
```

- Una sola vez: sin memoria entre preguntas, sin streaming, sin herramientas, sin imágenes ni archivos; Kino no agrega
  una personalidad y no guarda nada (sus registros llevan solo tamaños y códigos).
- `model` es solo el nombre del modelo que respondió: nunca una dirección, una llave ni un encabezado. `message` es el
  detalle en inglés de Kino para ti, nunca para la persona.
- `json: true` solo **PIDE** JSON (Kino agrega una instrucción al texto de sistema); el texto vuelve como lo escribió el
  modelo, se pueda leer o no.
- Detéctalo con `typeof kino.ai === "object"`.

### Límites { #ai-limits }

| Qué | Límite |
| --- | --- |
| `prompt` | no vacío, máximo 8192 bytes UTF-8 |
| `system` | máximo 2048 bytes UTF-8 |
| `maxChars` | de 1 a 4096 (por defecto 2048): la respuesta se corta ahí |
| Por plugin | 10 preguntas en cualquier minuto, 100 al día (UTC), una a la vez (la siguiente es `rate_limited`, nunca se encola), 20 s cada una |
| Todo el aparato | 300 al día y 2 a la vez para todos los plugins juntos, para que los plugins nunca dejen sin cupo al asistente propio de Kino (que comparte el cupo anónimo de Kilo) |

Los errores: `unavailable` (ningún modelo pudo responder: sin internet, todos los modelos gratis ocupados),
`rate_limited`, `too_large`, `timeout`, `refused` (todo lo demás: no aprobada, apagada, el plugin desactivado, un origen
equivocado, una petición mal formada).

### Cuándo se puede preguntar { #ai-when }

- **Solo después del toque de la persona**: una `action` de los ajustes, un `panelAction`, un `screenEvent` que sigue a un
  toque o un envío. Nunca desde el `open` de una pantalla, un tick, un «cargar más», un cambio, un `playerEvent`, Inicio,
  la búsqueda ni la reproducción.
- **O desde tu [trabajo](#jobs)**: cada pregunta es una de las 10 peticiones de la ejecución, y se rechaza cuando la
  ejecución terminó.
- Un evento de pantalla sigue acotado por los 60 s de su sesión: pregunta una vez por evento y junta los elementos en un
  solo texto.

!!! warning "La respuesta no es de fiar"
    El modelo leyó lo que le mandaste, y un texto que tomaste de la web o de la persona puede dirigirlo (inyección de
    instrucciones). Valida cada campo contra lo que enviaste (descarta los ids y las categorías que no pediste), nunca la
    ejecutes, nunca sigas instrucciones que traiga, nunca abras una URL que venga en ella sin revisarla, y ten un plan B
    para cuando la IA esté apagada o no disponible. Kino nunca muestra una respuesta por su cuenta: tu pantalla muestra lo
    que tú decidas.

Lo que envías sale del aparato: dilo en tu propia interfaz.

### Probarlo con el kit { #ai-kit }

El kit responde un texto de prueba. Las variables `KINO_AI_REPLY` (la respuesta), `KINO_AI_ERROR` (un error) y
`KINO_AI_REVOKED=1` (la capacidad apagada) simulan lo que pasa en el aparato.

## Límites en un lugar { #limits }

| Qué | Límite |
| --- | --- |
| Trabajos (`schedule`) | de 1 a 3 trabajos, cada 15 a 1440 minutos; una ejecución máximo 20 s, 10 peticiones una a la vez, 2 MB de respuestas y 256 KB escritos en `kino.storage`; 96 ejecuciones al día por plugin; una falla espera 15 minutos, duplicándose hasta 6 h, y 3 seguidas pausan el trabajo |
| `kino.shared` | 4 claves de máximo 40 caracteres por plugin; un valor de máximo 64 KB y 16 niveles, 128 KB en total; 30 escrituras por minuto; el valor nuevo de una clave viaja como mucho una vez cada 60 s |
| `kino.ai` | un `prompt` de máximo 8192 bytes, `system` 2048; la respuesta cortada en `maxChars` (1 a 4096, por defecto 2048); 10 preguntas en cualquier minuto, 100 al día y 1 a la vez por plugin; 300 al día y 2 a la vez para todos los plugins del aparato juntos; 20 s por pregunta |
