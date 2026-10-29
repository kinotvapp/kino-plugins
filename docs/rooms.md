# Salas, biblioteca y control del reproductor { #rooms }

!!! note "Disponible con Kino 0.9.74"
    Disponible con Kino 0.9.74 (la próxima versión, aún no publicada). Una versión anterior de Kino rechaza estos
    plugins con «Este plugin necesita una versión más nueva de Kino»; para seguir llegando a quien tiene una versión
    anterior usa `enhancements` (ver [Pantallas sin subir tu apiVersion](enhancements.md)).

Tres capacidades le dan a tu plugin un alcance que va más allá de su propia fuente:

- **`library`**: leer lo que la persona vio y guardó en Kino ([abajo](#library)).
- **`playerControl`**: pausar, reanudar y mover el video por sí solo, no solo justo después de que la persona toca un
  botón ([abajo](#player-control)).
- **`room`**: abrir una sala a la que otras personas entran por internet a través del aparato de la persona
  ([abajo](#room)).

Las tres son **declarativas** (no exportas nada nuevo: las declaras en `capabilities`) y las tres tienen una línea de
consentimiento **en rojo** que la persona aprueba. Una pantalla ([`screen`](screens.md)) o una pestaña del
[panel del reproductor](player-panel.md#contributed-tab) es lo que las usa.

El ejemplo de referencia es **Party Chat** (<https://github.com/kinotvapp/kino-plugin-watch-party>): una pestaña del panel
del reproductor, en cualquier título de cualquier plugin, que abre una sala, la comparte con un código y un QR, mantiene a
todos en el mismo punto del video con `playerControl` y lleva un chat. Muestra todo lo de esta página.

## El consentimiento { #consent }

Ninguna de estas capacidades se aprueba sola. Kino le pregunta a la persona **con sus propias palabras**, que tú no puedes
cambiar ni esconder:

| Capacidad | Lo que lee la persona | En rojo, espera aprobación | El interruptor de la persona (tu pestaña en Ajustes) |
| --- | --- | --- | --- |
| `library` | «Podrá leer lo que has visto y guardado en Kino, y enviarlo a sus servicios» | sí | «Dejar que lea lo que he visto y guardado» |
| `playerControl` | «Podrá pausar, reanudar y mover tu video por sí solo» | sí | «Dejar que pause y mueva mi video» |
| `room` | «Podrá abrir una sala a la que se entra por internet a través de este aparato, y enviar los mensajes de la sala a quienes entren» | sí | «Dejar que abra salas por internet» |

- Una línea roja se pregunta al instalar y otra vez en la actualización que la agrega, y **Kino nunca la aprueba por su
  cuenta**; al importar con el kit empieza sin marcar. Hasta que la persona la aprueba, la API rechaza
  (`permission_denied`), así que maneja siempre ese rechazo y funciona sin ella.
- Cada interruptor está en la pestaña de tu plugin en Ajustes, vale para todo el aparato y todos los perfiles, y se
  sincroniza con los demás aparatos de la persona. Apagado, la API rechaza de una vez (una sala se cierra).
- Kino muestra tus hosts declarados junto a la línea: estas líneas son la salvaguarda, no un muro técnico. Un plugin que
  puede hacer `fetch` puede mandar a sus hosts lo que lee.
- Sé honesto también en tu propia interfaz: di qué envías y adónde.

El modelo completo, con las demás capacidades que van con las pantallas, está en [Pantallas](screens.md#consent).

## Leer lo que la persona vio (`library`) { #library }

```json
"apiVersion": 14,
"capabilities": ["screen", "library"]
```

`library` puede ir sola o junto a `screen` (un plugin que solo declara `library` sigue siendo válido, pero nunca puede
leerla: mira [cuándo](#library-when)).

```js
const watched = await kino.library.watched({ limit: 20, kind: "movie", sinceMs: Date.now() - 30 * 86400000 });
const saved = await kino.library.saved({ limit: 50 });
```

`kino.library.watched({ limit?, kind?, sinceMs? })` y `kino.library.saved({ limit?, kind? })` responden lo que el **perfil
activo** vio y guardó, de lo más nuevo a lo más viejo, una entrada por título:

```ts
interface KinoLibraryEntry {
  title: string;                       // as Kino shows it (TMDB's when Kino identified it), at most 200 characters
  year?: number;                       // only when Kino knows it; usually absent on a watched one
  kind: "movie" | "series";
  ids: { tmdb?: number; imdb?: string }; // each only when Kino knows it; may be empty
  progress?: number;                   // watched only: 0..1 in steps of 0.01 (1 when finished)
  watchedAtMs?: number;                // watched only: rounded down to the day (UTC midnight)
  season?: number;                     // watched series only (apiVersion 15): the season of the latest chapter played
  episode?: number;                    // watched series only (apiVersion 15): the number of that chapter
}
```

- **`season` y `episode`** (llegan con Kino 0.9.77): en una **serie vista**, el último capítulo reproducido, solo
  cuando su fuente lo numeró. Nunca en una película ni en una serie sin capítulo numerado.

- `kind` es `movie` o `series` y sirve de filtro; la música y los podcasts quedan fuera.
- `limit`: por defecto 50, máximo 100 (más de 100 da 100). `sinceMs` deja los títulos reproducidos ese día (UTC) o después.
  Un número que no es finito es `bad_request`.

### Lo que nunca llega { #library-never }

- **Nunca**: una URL de video, un `ref` de plugin, un id de Kino, una posición en segundos, un nombre de perfil, nada de
  otro perfil, ni un título +18 (siempre fuera, aunque el código +18 esté desbloqueado; un título cuya fuente este aparato
  no puede ubicar también queda fuera: falla cerrado).
- **Grueso a propósito**: `watchedAtMs` y `sinceMs` se redondean hacia abajo al día (UTC) y `progress` a pasos de 0,01,
  así que no se puede sondear nada más fino. Los títulos vistos el mismo día llegan en el orden de Kino.

### Cuándo se puede leer { #library-when }

- Solo dentro de una llamada que la persona empezó: `screen`, `screenEvent` (los ticks de un temporizador cuentan mientras
  la pantalla está al frente), `home`, `section`, `search`, y un [trabajo en segundo plano](jobs-and-shared.md#jobs) con esta
  aprobación. Nunca en llamadas de precarga ni de sincronización. Por eso un plugin que solo declara `library` nunca puede
  leerla.
- Máximo **30 llamadas por minuto** por plugin.
- Kino no guarda nada de una respuesta; una respuesta de Inicio que armes con ella se guarda en caché como cualquier
  respuesta de Inicio.

### Errores y detección { #library-errors }

- `permission_denied` (no aprobada, o apagada), `rate_limited`, `bad_request`.
- Detéctala con `typeof kino.library === "object"` y **aun así** atrapa `permission_denied`: un plugin cuyo `library` llegó
  por un [`enhancements`](enhancements.md) en un Kino que se actualizó después de instalarlo solo se pregunta con su
  siguiente versión.

```js
async function recentMovies() {
  if (typeof kino.library !== "object") return [];
  try {
    return await kino.library.watched({ limit: 20, kind: "movie" });
  } catch (e) {
    if (e && e.code === "permission_denied") return []; // not approved or switched off: work without it
    throw e;
  }
}
```

- Kit: `KINO_LIBRARY_FIXTURE=<json>` hace de los datos de la persona y `KINO_LIBRARY_REVOKED=1` simula el interruptor apagado.

## Mover el video (`playerControl`) { #player-control }

Una capacidad declarativa (sin export) que **nunca va sola**: solo junto a un panel, el tuyo (`panel`) o una pestaña que
aportas a otros plugins (`"panel": { "contributes": true }` con `playerPanelTab`, mira
[el panel del reproductor](player-panel.md#contributed-tab)). Sin un panel, el manifiesto se rechaza con
"The \"playerControl\" capability needs a \"panel\" ...".

```json
"apiVersion": 14,
"capabilities": ["screen", "playerPanelTab", "playerControl", "room"],
"panel": { "contributes": true, "label": "Party Chat" }
```

Con `playerControl` una acción de `player` puede llevar además `pause`: `true` pausa, `false` reanuda (cualquier otro valor
se descarta). Es una orden de una sola vez: nunca se guarda.

### Sin la capacidad y con ella { #player-control-origins }

Cada acción de `player` tiene un **origen**: `press`, `change` o `submit` (lo que hace la persona en el panel), `refresh`
(el `player` del propio resultado de un panel: al abrirlo, al cambiar de pestaña, en un tick de `refreshMs` o el panel nuevo
de una respuesta de `playerEvent`) y `event` (una respuesta de `playerEvent`).

| Quién | Sin `playerControl` | Con `playerControl` |
| --- | --- | --- |
| El plugin cuyo título suena | Las reglas de apiVersion 9: cualquier campo de `player` después de un `press`, `change` o `submit` de la persona y en una respuesta de `playerEvent`; `pause` solo después de un `press`; el `player` del propio resultado de un panel nunca cuenta. | Cuenta cualquier origen: `press`, `change`, `submit`, `refresh` y `event`. |
| Una pestaña aportada a otro plugin | Solo `seekToMs`, solo después de un `press` en tu pestaña. | `seekToMs`, `pause` y `speed`, desde cualquier origen. |

Así un tick de `refreshMs` puede mantener el video al paso de la sala sin que nadie toque nada.

### Lo que Kino sigue imponiendo { #player-control-limits }

Lo mismo para todo plugin (contract.json `kinoPlayerControl`):

- **Un salto o una pausa por segundo por plugin**, siempre (el panel y sus `playerEvent` juntos).
- Una acción que solo se acepta gracias a la capacidad se descarta mientras Kino no está al frente (el reproductor tapado o
  en segundo plano), mientras hay un diálogo de Kino abierto o mientras la persona está saltando en la barra.
- En una transmisión en vivo, solo `pause`.
- Máximo **30 por minuto**.
- Una pausa se descarta mientras el reproductor del celular está ocupado enviando a otra pantalla (Chromecast o DLNA), y
  también cuando pide el estado en el que el video ya está (sin aviso y sin gastar cupo).
- Un panel anidado en una respuesta no trae su propio `player`.
- Cuando la acción no viene de un `press` de la persona (`refresh` o `event`), Kino muestra un aviso corto con el nombre de
  tu plugin, que no puedes redactar ni suprimir: «Party Chat: pausado», «Party Chat: reanudado, movido a 1:02:03» (las
  partes son «pausado», «reanudado», «movido a {time}» y «velocidad {speed}»; en inglés "paused", "resumed",
  "moved to {time}", "speed {speed}"). Un nombre que se lee como «Kino» se muestra calificado.
- La velocidad que pone una pestaña aportada nunca se guarda: termina con el título, y la velocidad que eligió la persona
  gana.

Las propiedades de `player` (`seekToMs`, `speed`, `resize`…) y quién gana frente a la persona están en
[Controlar el reproductor](player-panel.md#player).

- Kit: `KINO_PLAYER_CONTROL_REVOKED=1` simula el interruptor apagado.

## Salas por internet (`room`) { #room }

Una capacidad declarativa que **nunca va sola**: la maneja una pantalla o una pestaña del panel del reproductor.
`kino.room` es un buzón de corta vida **alojado en el propio aparato de la persona** y alcanzado desde internet por el
mismo túnel rápido de Cloudflare que Kino abre para «Recibir configuración»: ni un servidor tuyo ni uno de Kino, y tu
código nunca ve una dirección.

```js
const { code, words, expiresAtMs } = await kino.room.open({ ttlMin: 120, max: 6, name: "Ana" }); // the host, from a press
const { handle, memberId } = await kino.room.join({ words, code, name: "Beto" });                // a guest, from a press
await kino.room.send({ t: "chat", text: "hola" });                                               // a JSON object
const { events, last, more, reachable } = await kino.room.inbox({ since: state.last });          // poll it from a timer
```

Detéctala con `typeof kino.room === "object"`.

### Las funciones { #room-api }

| Función | Qué hace |
| --- | --- |
| `open({ ttlMin?, max?, name?, codeDigits?, code? })` | Abre el túnel y el buzón. `ttlMin` de 10 a 240 (por defecto 120); `max` miembros contándote, de 2 a 8 (por defecto 6); `name`, tu nombre para los invitados, hasta 40 caracteres. Responde `{ code, words, expiresAtMs }`. |
| `join({ words, code, name? })` | Entra a una sala con las palabras y el código que compartió el anfitrión; `name` hasta 24 caracteres. Responde `{ handle, memberId, host: { name }, expiresAtMs }`. Guarda `handle`: nombra esta sesión en las demás llamadas. |
| `send(payload, { to?, session? })` | Envía un objeto JSON de máximo 8192 bytes y 4 niveles. El anfitrión escribe a un `memberId` o a todos (`to` ausente o `"all"`); un invitado al anfitrión (`to` ausente o `"host"`) o a `"all"` a través del anfitrión, nunca a otro miembro directo. |
| `inbox({ since?, limit?, session? })` | Responde `{ events, last, more, reachable }`: los eventos después de `since` (pasa el `last` de la respuesta la próxima vez), máximo `limit` (1 a 50, por defecto 50). |
| `members({ session? })` | `[{ memberId, name, host }]`: nunca una dirección. |
| `close({ session? })` | Cierra la sesión (o la sala, si eres el anfitrión). |
| `state()` | `{ role: "host" \| "guest" \| "none", joined: [...], hosted: { code, words, expiresAtMs, members } \| null }`: las sesiones de tu plugin en este aparato. |

- `words` son **públicas** (`brave-river-cat-moon`): cualquiera puede verlas. El `code` es el **único secreto** de la sala:
  12 dígitos, o los que pidas con `codeDigits` (de 4 a 12). Muéstralo agrupado, «1234 5678 9012», y como QR; los espacios y
  guiones se ignoran al hacer `join`. `join` necesita las dos cosas.
- Un evento es `{ seq, from, kind, payload?, name? }`: `kind` es `msg`, `join`, `leave` o `closed`; `from` es un `memberId`
  o `"host"`; `payload` (solo en `msg`) es el objeto que mandó el remitente, re-serializado por Kino; `name` (solo en
  `join`) es el nombre del miembro. `seq` solo crece.
- `reachable: false` significa que la última consulta de un invitado a su anfitrión no tuvo respuesta: es tu señal para
  pasar a un respaldo. Un invitado le pregunta al anfitrión como mucho una vez por segundo.
- `session` es `"hosted"` (la sala que aloja este aparato) o un `handle` de `join`. Si falta: la primera sesión unida, si
  no, la alojada.
- Un miembro del que el anfitrión no sabe nada en 2 minutos se da por ido (`leave`).

### Un código corto { #room-short-code }

`open({ codeDigits: 4 })` hace un código que los amigos pueden escribir. Deja afuera a los extraños **solo porque las
palabras no se pueden adivinar** y porque la sala se cierra sola después de 30 códigos equivocados (Kino se lo dice a la
persona; tus siguientes llamadas reciben `room_closed`). Quien capture el tráfico y conozca las palabras, el proveedor del
túnel entre ellos, recupera un código de 4 dígitos sin conexión en milisegundos: esa sala no es privada frente al
proveedor. Los 12 dígitos por defecto lo hacen caro, no imposible. En cualquier caso, que los mensajes de una sala sean de
baja sensibilidad.

### Cuándo se puede llamar { #room-when }

- `open` y `join` **solo desde el toque de la persona** (`screenEvent`, `panelAction`; nunca un tick ni un refresco), así un
  plugin nunca puede meter a la persona en una sala, ni abrir una, a sus espaldas.
- `send`, `inbox` y `members` desde las llamadas de tu pantalla o tu panel (`screen`, `screenEvent`, `panel`, `panelAction`,
  `playerEvent`), ticks incluidos, solo mientras Kino está al frente.
- `close` y `state` desde cualquier llamada en vivo.
- **Nunca desde un [trabajo en segundo plano](jobs-and-shared.md#jobs)** (ahí `kino.room` responde `not_allowed`).

### Límites { #room-limits }

| Qué | Límite |
| --- | --- |
| Un mensaje | máximo 8192 bytes (UTF-8, como el texto JSON de tu plugin) y 4 niveles (el objeto mismo es 1) |
| Ritmo por miembro | 5 mensajes por segundo; 100 mensajes y 256 KB por minuto (lo revisa el Kino que envía y otra vez el anfitrión) |
| Miembros | de 2 a 8 (por defecto 6) |
| Duración | de 10 a 240 minutos (por defecto 120) |
| Buzón | 200 eventos o 15 minutos por miembro |
| Sesiones por aparato | 2 unidas y 1 alojada; máximo 2 de ellas para un mismo plugin (`room_busy`) |
| Códigos equivocados | 5 bloquean las entradas 60 s, duplicándose hasta 30 minutos (`rate_limited`); 30 en total cierran la sala |

Una sala se cierra al llegar a su duración, con `close()`, cuando el plugin se quita, se desactiva o la persona apaga su
interruptor, cuando las pantallas de plugins se apagan en Kino, y después de **30 minutos** de Kino en segundo plano.
Mientras el aparato aloja una sala, Android muestra la notificación propia de Kino «Sala abierta · N personas» con
«Cerrar sala» y mantiene viva la sala, para que el anfitrión pueda salir a pegar la invitación; si la persona descarta Kino
de las apps recientes, la sala se cierra.

Mientras el aparato aloja una sala, tu pestaña en Ajustes la muestra con un botón para cerrarla.

### Errores { #room-errors }

`room_denied`, `room_closed`, `room_full`, `room_unreachable`, `room_busy`, `rate_limited`, `permission_denied`,
`bad_request`. `room_unreachable` (sin internet, una red que lo bloquea, el límite de Cloudflare) y los rechazos de la sala
traen el propio `userMessage` de Kino.

### Seguridad, dicha sin rodeos { #room-security }

- Cada petición va sellada (scrypt N=8192 r=8 del código con las palabras como sal, AES-256-GCM más HMAC-SHA256, llaves
  por miembro) y Kino nunca guarda, registra ni ejecuta los mensajes.
- **El código protege contra el acceso casual, no contra el proveedor del túnel.** Un extraño solo puede adivinar en línea
  (y queda bloqueado), pero el proveedor que termina el TLS, si apunta a una sala, podría romper sin conexión una entrada
  capturada (unos 400 días de GPU en promedio en una GPU de gama alta) y después leerla; no hay secreto hacia adelante.
  **Que los mensajes de una sala sean de baja sensibilidad** (un chat, una posición). Un intercambio autenticado por
  contraseña (CPace o SPAKE2) queda anotado como refuerzo futuro.
- **Los mensajes no son de fiar**: revisa el tipo de cada mensaje, sus campos exactos, tamaños y tipos; limpia los
  nombres; acota los textos; nunca ejecutes uno ni lo dibujes como marcado. Nunca pongas el código en un mensaje ni en
  un registro.

### Lo que es tuyo { #room-yours }

Quién manda, qué significa un mensaje, el historial y el respaldo son tuyos. Con `open({ code })` un miembro abre una
segunda puerta a la misma sala con sus propias palabras (se rechaza con `permission_denied` salvo que tu plugin esté en
esa sala ahora o la haya abierto; su vencimiento no pasa del de la sala); publica sus palabras unos segundos después (un
nombre nuevo tarda un momento en resolverse). Manda una despedida antes de `close()`. Party Chat lo muestra todo.

- Kit: una sala en memoria con dos miembros simulados (`createKitRoom()` en las pruebas: `say`, `leave`) y
  `KINO_ROOM_REVOKED=1` para el interruptor apagado.

## Probarlo con el kit { #kit }

```
node sdk/validate.mjs <carpeta>                                    # the manifest, the exports, every consent line
node sdk/run.mjs --foreign latino:Latino <carpeta> panel <ref>     # a tab you contribute to another plugin's title
node sdk/run.mjs --state '{}' --screen <carpeta> panelAction <ref> <name> press
```

| Variable | Qué simula |
| --- | --- |
| `KINO_LIBRARY_FIXTURE=<json>` | los datos de la persona para `kino.library` |
| `KINO_LIBRARY_REVOKED=1` | `library` apagada |
| `KINO_PLAYER_CONTROL_REVOKED=1` | `playerControl` apagado |
| `KINO_ROOM_REVOKED=1` | `room` apagada |

En los archivos de `node --test`, importa las ayudas del kit (`createKino`, `createKitRoom`…) como hacen las pruebas de
Party Chat. Más en [Probar pantallas con el kit](screens.md#testing).

## Límites en un lugar { #limits }

| Qué | Límite |
| --- | --- |
| `kino.library` | `limit` por defecto 50, máximo 100; máximo 30 llamadas por minuto por plugin; tiempos redondeados al día, `progress` a 0,01 |
| `playerControl` | un salto o una pausa por segundo por plugin; máximo 30 acciones por minuto |
| `kino.room` | un mensaje de máximo 8192 bytes y 4 niveles; 5 mensajes por segundo, 100 y 256 KB por minuto por miembro; de 2 a 8 miembros; de 10 a 240 minutos (por defecto 120); buzón de 200 eventos o 15 minutos; 2 unidas y 1 alojada por aparato, 2 por plugin; 5 códigos equivocados bloquean las entradas 60 s, duplicándose hasta 30 minutos; se cierra tras 30 minutos en segundo plano (una sala alojada muestra mientras tanto la notificación de Kino) |
