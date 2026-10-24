# Proveedores de sincronización (apiVersion 12, Kino 0.9.74) { #sync-providers }

Kino mantiene al día los aparatos de una persona (biblioteca, historial, progreso, ajustes, sus plugins
y los ajustes de los plugins). De fábrica eso viaja por la **red local**, entre aparatos emparejados.
Desde `"apiVersion": 12` (Kino 0.9.74) un plugin puede ser **el transporte**: un **proveedor de
sincronización** guarda una copia cifrada de esos datos en un servicio con el que habla (un bot, una
API de almacenamiento, un servidor de la persona), y los otros aparatos de la persona la leen de ahí,
desde cualquier red.

El plugin mueve bytes y nada más. Kino decide qué se sincroniza, combina, programa las rondas y cifra la
copia antes de que tu código la vea.

Dos proveedores completos muestran cada parte de esta página: [Sync-Gram](#examples) (un bot de
Telegram de la propia persona) y [Sync Servidor](#examples) (un servidor que corre la persona).

## ¿Es la herramienta correcta? { #when }

- **Sí**, si tu plugin puede guardar un archivo de hasta 4 MiB en un lugar que controla la persona y
  leerlo después, con una API `https` en un host público.
- **No**, para cualquier otra cosa: un proveedor no puede ver ni cambiar lo que sincroniza Kino, no
  puede sincronizar solo algunas tablas y no reemplaza el emparejamiento (el control remoto y el envío
  a la TV siguen por la red local).
- La persona escoge **un** proveedor, o ninguno: en **Ajustes de todos los perfiles ▸ Sincronización ▸
  Proveedor** la lista tiene **Red local** y cada proveedor instalado, cada uno con un interruptor.
  Encender uno apaga el anterior (Kino pregunta antes: "¿Sincronizar con &lt;nombre&gt;?", con
  "Combinar con este aparato"); apagar el activo deja la sincronización apagada. La elección es por
  aparato. La elección y su llave son de ese aparato y nunca se sincronizan: cada aparato enciende su
  proveedor él mismo, con los ajustes que escribió o que [recibió](#provisioning).

## Quién ve qué { #who-sees-what }

Kino comprime la copia y la cifra entera (AES-256-GCM) antes de llamar a tu plugin. El blob que recibe
tu código es texto cifrado. Quién puede descifrarlo depende de un campo del manifiesto,
[`sync.keySecret`](#sync-block):

| | Sin `keySecret` (llave aleatoria) | Con `keySecret` (llave derivada) |
| --- | --- | --- |
| La llave | 32 bytes aleatorios hechos en el aparato, guardados en su almacén de llaves, nunca entregados al plugin | Kino la deriva, en cada aparato, del valor de uno de tus ajustes `password` (HKDF-SHA256) |
| ¿El plugin puede leer los datos? | **No** | **Sí**: tu código lee ese ajuste y la derivación es pública |
| ¿El servicio puede leerlos? | **No** | **Sí**, si tiene ese secreto (Telegram emitió el token del bot, por ejemplo) |
| Línea de consentimiento | "Guardará tu información de sincronización (cifrada; el plugin no puede leerla) en sus servidores", en rojo cuando el plugin también tiene `"fetchHosts": "any"` | siempre en rojo: "Sincronizará tus datos a través de su servicio: el plugin y su servicio podrán leerlos" |
| Un segundo aparato | en Kino 0.9.74 **ninguna pantalla lleva una llave aleatoria a otro aparato** (mira abajo) | solo necesita los mismos ajustes, que "Enviar a otro aparato" le pasa; la llave nunca viaja |

Lo que va en la copia: todo lo que Kino ya sincroniza entre aparatos emparejados por la red local, las
mismas filas (biblioteca, historial, progreso, ajustes, los plugins instalados y sus ajustes), de cada
perfil que sincroniza este aparato.
Las contraseñas de los plugins y los demás secretos que sincroniza Kino también van, cada uno sellado fila
por fila con la llave de sincronización. Los secretos sellados en el manifiesto de un plugin nunca
viajan, como siempre.

**En Kino 0.9.74 un proveedor sin `keySecret` sirve para un solo aparato.** Su llave aleatoria se queda
en el aparato que la hizo, y ninguna pantalla de esta versión se la pasa a otro aparato (el paso de
ajustes lleva ajustes, nunca una llave), así que un segundo aparato lee la copia como "No se puede leer
la copia guardada: se guardó con otra clave o no es de Kino". Por eso los dos proveedores de ejemplo
declaran `keySecret`. Si tu servicio le puede dar a la persona un token largo y aleatorio, úsalo como
`keySecret`, y di en la descripción de tu plugin quién puede leer los datos.

## El contrato { #contract }

Declara la capacidad (puede ser la única) y `"apiVersion": 12`, y exporta dos funciones, más una
tercera opcional:

```json
"apiVersion": 12,
"capabilities": ["syncProvider"],
"hosts": ["api.example.com"],
"sync": { "mode": "poll", "maxBlobBytes": 4194304, "keySecret": "token", "provision": ["token"] }
```

```js
export async function syncPull({ maxBlobBytes }) {
  const r = await kino.fetch(API + "/blob", { headers: auth() });
  if (r.status === 404) return null;                       // todavía no hay nada guardado
  if (r.status === 401) throw kino.error("auth_required", "token refused");
  if (!r.ok) throw kino.error("unavailable", "pull " + r.status);
  return { blob: r.json().blob, version: r.json().version };
}

export async function syncPush({ maxBlobBytes, blob, expectedVersion }) {
  const r = await kino.fetch(API + "/blob", { method: "PUT", headers: { ...auth(), "If-Match": expectedVersion ?? "" },
    body: { json: { blob } } });
  if (r.status === 409) throw kino.error("conflict", "the stored copy changed");
  if (!r.ok) throw kino.error("unavailable", "push " + r.status);
  return { version: r.json().version };
}

export async function syncStatus(_null) {                  // opcional
  if (!kino.config.get("token")) return { ready: false, message: "Falta el token: escríbelo en Conectar" };
  return { ready: true };
}
```

- **Un argumento, un objeto** (`null` en `syncStatus`). `maxBlobBytes` es el valor del manifiesto (como
  mucho 4194304).
- **`blob`** es base64 estándar (RFC 4648, `+` y `/`, con relleno) **sin saltos de línea**, en las dos
  direcciones. Guárdalo y devuélvelo byte por byte; nunca lo decodifiques a texto. Una lectura responde
  `{ blob, version }`, o `null` cuando todavía no hay nada guardado.
- **`version`** es un texto no vacío tuyo (un ETag, el id de un mensaje, un contador). Kino le pasa la
  última que trajo a `syncPush` como `expectedVersion` (`null` si no trajo nada).
- **Conflictos.** Si tu servicio puede saber que la copia remota cambió desde `expectedVersion`, lanza
  `kino.error("conflict", "…")`: Kino trae, combina y vuelve a enviar, como mucho 3 veces más por
  ronda. Si no puede saberlo (no tiene comparar y escribir), ignora `expectedVersion`: la combinación de
  la ronda siguiente arregla la carrera.
- **Falta configuración.** Lanza `auth_required` desde `syncPull`/`syncPush` cuando al plugin le faltan
  sus ajustes o el servicio rechaza las credenciales: la persona lee "al proveedor le falta
  configuración, revísala en Conectar" en vez de una falla genérica.
- **`syncStatus`** responde `{ ready, message? }` para la fila del proveedor. Antes de cada ronda Kino se
  lo pregunta: `ready: false` se salta la ronda (sin falla, sin espera creciente, los cambios
  pendientes se conservan) y Kino vuelve a preguntar un periodo de lectura después, cuando la persona
  abre la pantalla o justo después de que guarda tus ajustes. Sin el export, está listo. Un
  `syncStatus` que lanza `auth_required` también quiere decir que no está listo; cualquier otra falla
  suya muestra el proveedor como no listo pero deja correr la ronda, que falla por su cuenta. Nunca
  descargues el blob ahí: una petición liviana como mucho.
- **Tiempo**: `syncPull` y `syncPush` 60 s cada una, `syncStatus` 15 s. Corren en segundo plano: nadie
  espera en pantalla, y sus tiempos agotados nunca marcan tu plugin como "No responde". Todas las
  reglas de `kino.fetch`, de los hosts y del motor valen como en cualquier otra llamada, salvo los topes
  de tamaño de abajo.
- **Errores**: usa los [códigos de `kino.error`](contract.md#errors) de siempre; `conflict` es el propio.
  Un `userMessage` sigue las [reglas de siempre](contract.md#user-message), así que una frase que nombra
  un token o una marca de la lista bloqueada (Telegram, por ejemplo) se muestra como la línea de Kino.
- Las formas en TypeScript son `KinoSyncPullFn`, `KinoSyncPushFn`, `KinoSyncStatusFn`,
  `KinoSyncContext` y `KinoManifestSync`, en [`kino.d.ts`](reference/index.md).

## El bloque `sync` del manifiesto { #sync-block }

Opcional, desde `apiVersion` 12, y solo con la capacidad `syncProvider` (si no, se rechaza el
manifiesto: `The "sync" field needs the "syncProvider" capability`). Todas las claves son opcionales:

| Clave | Por defecto | Regla |
| --- | --- | --- |
| `mode` | `"poll"` | `"poll"` o `"realtime"` ([cada cuánto](#cadence)) |
| `pullEveryMs` | 600000 (10 min) | un número entero positivo; Kino lo sube a 30 s como mínimo |
| `pushDebounceMs` | 300000 (5 min) | un número entero positivo; Kino lo sube a 5 s como mínimo |
| `maxBlobBytes` | 4194304 | el blob más grande que acepta tu servicio, como mucho 4194304 (4 MiB) |
| `keySecret` | ninguno | la `key` de uno de tus ajustes `password`, que no puede tener `default` |
| `provision` | ninguno | hasta 8 claves distintas de tus ajustes que guardan valor (secretos o no); tiene que incluir `keySecret` si lo declaras |

Los mensajes que da Kino con un bloque mal formado (todos en inglés, al instalar):

- `The "sync" field must be an object with an optional "mode" of "poll" or "realtime" and optional positive whole numbers "pullEveryMs", "pushDebounceMs" and "maxBlobBytes" (at most 4194304)`
- `The "keySecret" of the "sync" field must be the key of one of the plugin's own "password" settings`
- `The setting the "keySecret" of the "sync" field names must not have a "default"`
- `The "provision" of the "sync" field must be a list of at most 8 different keys of the plugin's own settings that hold a value`
- `The "provision" of the "sync" field must include its "keySecret"`

**`keySecret`** tiene que ser un **token largo y aleatorio** (el token de un bot, una API key, un token
que imprime tu servidor), nunca una contraseña que escoge una persona: quien consiga un blob guardado
puede probar adivinanzas sin conexión. Mientras la persona no lo escriba, Kino no corre ninguna ronda
(la fila dice "Falta el token: configúralo en Conectar"). Cambiar su valor cambia la llave: la copia
remota ya no abre ("El token no coincide o los datos guardados no son de Kino") hasta que la persona
corrige el token o restablece la sincronización en un aparato.

**`provision`** nombra lo que "Enviar a otro aparato" le pasa a un segundo aparato ([abajo](#provisioning)).
Nombra todo lo que el segundo aparato necesita para correr el mismo proveedor (en Telegram, el token del
bot **y** el id del chat), y nada que no necesite.

Las versiones anteriores de Kino rechazan `apiVersion` 12 ("Este plugin necesita una versión más nueva
de Kino").

## Cuándo corren las rondas { #cadence }

Una ronda es traer, combinar y enviar. Con `mode: "poll"` Kino corre una:

- cuando la app pasa al frente, y después cada `pullEveryMs` mientras siga ahí;
- `pushDebounceMs` después del **último** cambio local (una ráfaga de cambios es un solo envío), y
  nunca antes de ese tiempo desde la ronda anterior; al pasar a segundo plano, un envío pendiente sale de
  una vez;
- para la posición de reproducción, cuando la reproducción se detiene o la app pasa a segundo plano,
  nunca mientras avanza;
- cuando la persona toca "Sincronizar ahora".

Hay como mucho 60 rondas en cualquier hora, pida quien pida. Una ronda que falla espera el intervalo de
lectura multiplicado por dos por cada falla seguida (hasta 30 minutos); los cambios que llevaba siguen
pendientes.

**`mode: "realtime"`** conserva todo eso y agrega un aviso: cuando tu código se entera de que otro
aparato guardó una copia nueva, llama a [`kino.sync.remoteChanged()`](kino-api.md#sync) y Kino la trae
de una vez. Kino acepta como mucho un aviso cada 30 segundos y descarta uno que llega durante una
lectura. Tu código solo corre mientras Kino lo llama (no hay conexión abierta entre llamadas), así que el
lugar para notar un cambio es `syncStatus`, no `syncPull`.

## Límites de tamaño { #limits }

- El blob mide como mucho `sync.maxBlobBytes` (4 MiB como máximo) **decodificado**. Kino rechaza uno más
  grande en las dos direcciones: una copia más grande que tu límite se rechaza antes de llegarte ("tus
  datos superan el tamaño que admite el proveedor"), y un blob traído que lo supera no se aplica.
- **Solo** dentro de `syncPull` y `syncPush`, una petición de `kino.fetch` (su JSON, con el cuerpo en
  base64) y el cuerpo de una respuesta pueden llegar a ceil(`maxBlobBytes` × 4/3) + 64 KB en vez de 1 MB y
  5 MB, y lo mismo el resultado de la llamada, para que el blob en base64 quepa en una sola petición.
  Todas las demás llamadas del plugin siguen con los topes de siempre; los hosts, los cupos, las
  redirecciones y los tiempos no cambian.
- Por qué 4 MiB: el blob cruza el motor como texto en base64 varias veces. Con 4 MiB un proveedor
  necesita de 25 a 30 MB de los 64 MB de memoria del motor del plugin, así que mantén pequeños tus
  propios datos mientras corren esas llamadas y nunca hagas copias extra del blob (mira cómo Sync-Gram
  arma un cuerpo multipart sin decodificarlo).
- Declara lo que tu servicio de verdad acepta: un `maxBlobBytes` más pequeño también mantiene pequeños
  los topes ampliados.

## Pasar los ajustes a otro aparato { #provisioning }

La persona configura el proveedor en un aparato (el primero nunca necesita un QR). Para el segundo, Kino
lleva los ajustes que tu manifiesto nombra en `sync.provision`, cifrados de punta a punta de un Kino al
otro:

1. En el **segundo** aparato (por ejemplo, la TV): la fila del proveedor ▸ **"Recibir desde otro
   aparato"**. Durante 3 minutos muestra un QR, una dirección en la red local y un código de 6 dígitos.
   Cuando el aparato puede abrir una, también ofrece una ruta **por internet** ("Desde otra red", un túnel
   de Cloudflare de corta vida): unas palabras para escribir con el mismo código.
2. En el **primer** aparato: la misma fila ▸ **"Enviar a otro aparato"**. Lee el QR; sin cámara, o con la
   cámara rechazada, pasa a **"Escribir dirección"**, donde la persona escribe solo el último número de la
   dirección (o, en "Otra red", las palabras) y el código.
3. El segundo aparato pregunta **"Recibido para &lt;plugin&gt;: ¿aplicar?"** y lista los ajustes por sus
   etiquetas, nunca sus valores (un ajuste `url` muestra su dirección, con un aviso cuando está en la red
   local). Solo **Aplicar** los guarda.

Lo que eso significa para tu plugin:

- Solo viajan los ajustes de `sync.provision`, sellados como los escritos a mano; cualquier otro se
  rechaza. La llave de sincronización nunca viaja: con `keySecret` cada aparato la deriva del mismo
  token.
- "Enviar a otro aparato" solo se ofrece cuando este aparato tiene un valor para cada ajuste de
  `provision`. Llena tú mismo los que encuentras (el id de un chat) con
  [`setSettings`](settings-form.md#set-settings), para que la persona nunca los escriba.
- El receptor acepta un solo mensaje válido, se cierra a los 3 minutos, después de 5 códigos incorrectos
  o cuando la persona sale de la pantalla, y pregunta antes de aplicar nada. El plugin tiene que estar
  instalado ahí ("Instala primero &lt;plugin&gt;").
- En redes distintas y sin ruta por internet, la persona instala el plugin en el segundo aparato, abre
  **Conectar** y escribe ahí los mismos ajustes.

## Ajustes, perfiles y lo que lee la persona { #settings }

- **Conectar**, en la fila del proveedor, abre el formulario de ajustes de tu plugin. Usa las
  [ayudas para configurar](settings-form.md#aids): un `help` corto (qué necesita la persona y dónde lo
  consigue) y un `link` al lugar donde lo consigue (`https://t.me/BotFather`, tu guía). Usa
  [`action.link`](settings-form.md#link) cuando una acción encuentra **a quién** vincular ("¿Eres tú,
  @ana?") y [`setSettings`](settings-form.md#set-settings) para guardar lo que encontró.
- El proveedor es por aparato, pero sus llamadas corren con los ajustes del **perfil en uso**, los
  mismos de los que sale la llave derivada. Un perfil sin el token muestra "Este perfil no tiene el
  token"; dos perfiles con tokens distintos leen la copia del otro como llave equivocada. Dile a la
  persona que configure el proveedor en el perfil que usa.
- La fila muestra las líneas de Kino ("Sincronizado hace 3 min", "Esperando la primera sincronización",
  "Falló la última sincronización: …") y, debajo, el `message` de tu `syncStatus`, sin tus secretos.
  Cuando una ronda falla, la persona lee una de las razones de Kino, no el texto de tu error: pon lo que
  la persona tiene que hacer en el `message` de `syncStatus`.
- Nunca pongas un token en un error, una línea de estado o un registro. Kino les quita tus secretos
  guardados a lo que muestra y registra solo el host de cada petición del plugin, pero un valor que armas
  tú (un texto con forma de token en el error del propio servicio) te toca quitarlo a ti.

## Notas de seguridad { #security }

- **El compromiso de `keySecret`.** Las llaves derivadas hacen fácil un segundo aparato (el mismo token y
  nada más) a cambio de la confidencialidad frente al plugin y al servicio. Dilo claro en tu descripción y
  en tu guía; la línea de consentimiento ya lo dice en rojo, y una actualización que agrega `keySecret`
  siempre espera la aprobación de la persona.
- **Revocar el token.** Si un token se filtra o se pierde un aparato, la persona lo revoca en el
  servicio (en Telegram, `/revoke` en @BotFather), escribe el nuevo en un aparato y toca **"Restablecer
  sincronización"**: después de una confirmación, la copia de ese aparato reemplaza a la que ya no se
  puede leer, cifrada con la llave nueva. Después vuelve a enviar los ajustes a los otros aparatos.
  Documenta esos pasos en tu guía.
- **Restablecer la sincronización** reemplaza la copia remota por la de este aparato; nunca borra datos
  del aparato.
- **El servicio puede retener o borrar la copia.** Sin `keySecret` no puede leerla ni falsificarla: un blob
  que no se descifra con la llave del aparato se rechaza, nunca se aplica. Con `keySecret`, quien tenga el
  token puede hacer las dos cosas.
- **Hosts.** `"hosts"` lista lo que alcanza tu código. Un proveedor para un servidor de la persona, en una
  dirección que no puedes conocer, necesita un [ajuste `url`](manifest.md#own-servers) o
  `"fetchHosts": "any"` (consentimiento en rojo, solo `https` público, nunca la red de la casa): Sync
  Servidor usa `fetchHosts` con un ajuste `text` que revisa él mismo.
- **Túneles.** Un plugin nunca llega a la red de la casa. Un servidor en el computador de la persona
  necesita una dirección `https` pública delante (un túnel de Cloudflare, por ejemplo), y la persona debe
  saber quién maneja esa dirección.

## Probar en local { #test }

- `node sdk/validate.mjs .` revisa el bloque `sync` igual que Kino y muestra la línea de consentimiento
  (en rojo con `keySecret`).
- `sdk/run.mjs` no tiene un comando para los exports de sincronización. Pruébalos con `node --test`, como
  los ejemplos: carga el plugin con `loadPlugin` (`sdk/sandbox.mjs`) y `createKino` (`sdk/kino-shim.mjs`),
  córrelo contra una imitación local de tu servicio y revisa cada respuesta con `checkSyncAnswer`
  (`sdk/contract.mjs`). Incluye un blob de 4 MiB en las dos direcciones y un conflicto.
- En un aparato: enciende el proveedor, Conectar, una primera ronda, un cambio en cada aparato, un token
  equivocado, "Restablecer sincronización" y "Enviar a otro aparato" a un segundo aparato.

## Los dos proveedores de ejemplo { #examples }

Los dos están en el repositorio de Kino, en `docs/plugins/examples/`, con una guía en español y en
inglés que una persona puede seguir de principio a fin, y pruebas que no necesitan red.

- **Sync-Gram** (`sync-telegram/`, id `sync-gram`; no oficial, sin relación con Telegram): un bot de
  Telegram que la persona crea con @BotFather. Solo `"hosts": ["api.telegram.org"]`; la copia es un
  documento fijado en el chat privado de la persona con el bot (`sendDocument`, `pinChatMessage`,
  `getChat` para la versión y para revisar una carrera, `getFile` para leerla de vuelta). Muestra un envío
  multipart por `kino.fetch` sin decodificar el blob, cómo vincular el chat con `getUpdates` y
  `action.link`, el chat confirmado guardado con `setSettings`, un `help` corto y un `link` a @BotFather,
  y cada error limpio del token. `keySecret` es el token del bot y `provision` es
  `["botToken", "chatId"]`. Es la referencia para un proveedor sobre un servicio de terceros.
- **Sync Servidor** (`sync-server/`, id `sync-server`): un servidor de Node de un solo archivo y sin
  dependencias (`GET /blob`, `PUT /blob` con `If-Match`, un 409 cuando la versión no coincide, un token de
  portador) y el plugin que habla con él (`"fetchHosts": "any"`, `keySecret` y `provision`, un 409 lanzado
  como `conflict`), al que se llega por un túnel de Cloudflare. Es la referencia para un proveedor sobre el
  servidor propio de la persona. Kino no lo lista: se instala escribiendo su dirección.
