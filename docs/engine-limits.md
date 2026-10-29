# Límites y trampas del motor

## Todos los números en un solo lugar { #limits }

| Qué | Límite |
| --- | --- |
| Manifiesto / archivo de entrada / ícono | 16 KB / 1 MB / 128 KB |
| Memoria / pila, por plugin | 64 MB / 1 MB |
| Tiempo por llamada | `search` 15 s; `home`, `browse`, `episodes`, `resolve` 20 s cada una; `details` 20 s (apiVersion 8, Kino 0.9.54) (`resolve` de un plugin que genera el propio Kino, desde un scraper de Nuvio o un addon de Stremio: 75 s); `liveCategories`, `liveChannels`, `guide` 20 s cada una; `liveSearch` 15 s; `subtitles` 10 s; `track` 10 s (apiVersion 7); `segments` 8 s (apiVersion 7); `meta` 6 s (apiVersion 6; pasado ese tiempo, no hay respuesta); `section`, `categories` 20 s cada una (apiVersion 6); `migrate` 10 s; `settingsStatus` 10 s, `action` 30 s, `validateSettings` 20 s; `sign` 1,5 s (y 3 s contando su espera); cuentan todos tus fetch y sleep juntos, pero no el tiempo que la persona tarda en responder una pregunta de host de esa llamada |
| Cargar el módulo (su nivel superior) | 10 s |
| Sandbox inactivo | se cierra después de 5 minutos sin llamadas |
| Tiempos agotados seguidos | 3 seguidos y Kino desactiva el plugin ("No responde") |
| `kino.fetch` | solo https (o el servidor propio de la persona tal como lo escribió, o `http` en un host declarado `insecureHttp`); 15 s por defecto, 30 s máximo; cuerpo de la respuesta máximo 5 MB; la petición (URL, headers y cuerpo) máximo 1.048.576 caracteres; solo dentro de `syncPull` y `syncPush` de un proveedor de sincronización, la petición y el cuerpo de la respuesta pueden llegar al base64 del blob declarado más 64 KB (ceil(`sync.maxBlobBytes` × 4/3) + 65.536); máximo 60 peticiones por llamada, contando cada salto, también los rechazados (250 para un plugin convertido desde un scraper de Nuvio); máximo 6 peticiones al mismo tiempo; máximo 3 preguntas de host por llamada; máximo 10 redirecciones por petición; con [`fetchHosts: "any"`](manifest.md#fetch-hosts), un host que llega solo por ese permiso: `https` por el puerto 443, un nombre con punto o una IPv4 pública, como mucho 60 peticiones por minuto por sitio y 600 cada 10 minutos por plugin (250 / 2500 en un scraper de Nuvio convertido), si no `rate_limited` |
| Cookies | 50 por dominio, 64 KB en total por plugin |
| `kino.storage` | 256 KB por plugin (con `storageLarge`, apiVersion 13: 16 MB en total, 2 MB por valor, 1.000 llaves de máximo 256 caracteres); el `ttlMs` opcional de una entrada va de 1 a 2.592.000.000 ms (30 días) |
| `kino.sleep` | de 0 a 5.000 ms por llamada |
| `kino.meta` (Kino 0.9.53) | máximo 30 llamadas por minuto por plugin; como mucho 8 s (cada uno de los otros plugins `meta`, 6 s), dentro del límite de tu propia llamada; la consulta máximo 4.096 caracteres; la respuesta máximo 1.000.000 de caracteres; en caché 30 minutos |
| `kino.tmdb` (Kino 0.9.53) | máximo 40 llamadas cada 10 s por plugin; con la llave propia de Kino máximo 20 cada 10 s por plugin y 60 cada 10 s entre todos los plugins (después la llave de la persona, si no la caché o `rate_limited`); 15 s por llamada; un cuerpo de máximo 2 MB; máximo 20 parámetros de máximo 500 caracteres; en caché compartida por todos los plugins, por ruta (12 horas para una serie por id y sus temporadas y episodios; 30 días para una película, persona o colección por id, los créditos, imágenes y similares de cualquier título, y para `/find`, `/genre`, `/configuration`; 24 horas para `/search`; 3 horas para `/trending`, `/discover` y las listas; 10 minutos para todo lo demás, una respuesta vacía o un 404), cuerpos de hasta 512 KB; una respuesta de la caché no cuenta en estos límites, y cuando TMDB falla (no cuando rechaza la llave) se sirve la última copia; no cuenta en las peticiones por llamada de `kino.fetch` |
| `kino.crypto` | datos de máximo 5 MB por llamada; PBKDF2 máximo 100.000 iteraciones y llaves de 64 bytes; `randomBytes` máximo 1.024 |
| `kino.ws` (apiVersion 13) | máximo 4 sockets abiertos por plugin (el quinto se rechaza con `limit`); máximo 8 MiB (8.388.608 bytes) de mensajes recibidos sin leer en cola por socket, pasado eso el socket se cierra con `limit`; un frame para enviar de máximo 786.000 bytes ya decodificado, también cuando va como texto `hex` o `base64` (`too_large`); un `recv` espera máximo 60 s; `wss://` solo a un host declarado y aprobado; memoria: lo que está en cola sin leer ocupa memoria de Kino (hasta 32 MiB con todos los sockets llenos), lo que guardas de eso cuenta en tus 64 MB del sandbox; no medido en cajas de TV de 1 GB, así que lee lo que llega y guarda poco |
| `byteSource` (apiVersion 13) | máximo 2 streams abiertos a la vez en el aparato (otro se rechaza), y aparte de ellos máximo 2 servidos a televisores (uno por envío a Chromecast y DLNA); cada `read` pide 1 MiB (1.048.576 bytes) en un offset múltiplo de 1.048.576 (o sea, siempre múltiplo de 4.096), el último pasándose de `size`; se leen 3 trozos por adelantado mientras uno se reproduce; Kino guarda los últimos 8 trozos leídos por stream; `handle` de 1 a 512 caracteres; memoria: cada stream abierto ocupa hasta cerca de 12 MiB de la memoria de Kino (los trozos guardados, los leídos por adelantado y el que está en camino), así que 2 en el aparato más 2 servidos a televisores pueden llegar a cerca de 48 MiB, aparte de tus 64 MB del sandbox; no medido en cajas de TV de 1 GB |
| `kino.catalog` (apiVersion 13) | máximo 100.000 ítems por plugin (después `limit`), siempre que quepan en el archivo: unos 670 bytes por ítem en promedio, así que mantén `data` pequeño; `id` de 1 a 128 caracteres, `title` máximo 300 caracteres, `data` máximo 4.096 bytes de JSON; máximo 500 ítems o ids por llamada; `search`: `q` máximo 256 caracteres, `limit` 50 por defecto, máximo 100, `offset` máximo 1.000.000; el archivo de la base de datos máximo 64 MiB (después `limit`); un archivo SQLite por plugin, solo en el aparato |
| `kino.qr.scan` (apiVersion 13) | un lector en pantalla a la vez (otro escaneo, de cualquier plugin, es `busy`); se cierra a los 120 s (`timeout`); `title` y `titleEn` máximo 80 caracteres; el texto leído de 1 a 4.096 caracteres (un código más largo se ignora); solo desde un ajuste `action`, un `panelAction` o un `screenEvent` que sigue a un toque o un envío de la persona (si no, `not_allowed`), nunca en una TV ni en un aparato sin cámara (`unavailable`); el texto de un ajuste `qr` máximo 512 caracteres, pedido otra vez cada 2.000 a 60.000 ms (`refreshMs`) |
| Imágenes del plugin (`imageSource`, apiVersion 13) | `handle` de 1 a 512 caracteres, sin caracteres de control; `image` responde máximo 256 KB ya decodificado (262.144 bytes), base64 canónico, solo `image/jpeg`, `image/png`, `image/webp`; 10 s por llamada; máximo 1 llamada de imagen en camino por plugin, ninguna mientras uno de tus streams de bytes está abierto o tu `read` está en cola, corriendo o terminó hace menos de 2 s (una imagen espera hasta 20 s, y si no se salta); una llamada con tiempo agotado bota tu sandbox (QuickJS no se puede interrumpir); un handle que falló no se vuelve a pedir en 5 minutos; 2 tiempos agotados seguidos pausan tus imágenes por 5 minutos; cada imagen se pide una vez, y después se guarda en el caché de imágenes en disco de Kino por plugin, versión y handle |
| `kino.log` / `console.*` | 2.000 caracteres por mensaje; cuando falla una llamada de un plugin cuyo manifiesto declara `telemetry`, sus últimas 30 líneas (cada una cortada a 300 caracteres, depuradas, 2.048 caracteres en total) van con el reporte de la falla |
| Lo que devuelve una función | máximo 2.000.000 caracteres ya convertido a JSON (`syncPull` y `syncPush` de un proveedor de sincronización: hasta ceil(`sync.maxBlobBytes` × 4/3) + 65.536, según su blob declarado) |
| Resultados | `search` 100 ítems; `home` 20 filas de 60; `browse` 100 por página; `episodes` 5.000 (y 50 `seasons`); `ref` 4.096 caracteres; `next` 2.048 caracteres; `id` cumple `^[A-Za-z0-9._~-]{1,128}$` |
| Canales en vivo (apiVersion 3) | `liveCategories` 200; `liveChannels` 500 por página, 10 páginas al comienzo y 5 más por desplazamiento, 10.000 canales (200 páginas) por categoría; `liveSearch` 100 canales, pedido desde 2 caracteres; `guide` 50 canales y 24 h por llamada, 100 entradas por canal; `number` 1..9999 |
| Seguimiento (apiVersion 7) | `progress` como mucho cada 5 minutos de reproducción; `watched` una vez, con 3 minutos o menos por delante y al menos el 90 % visto; máximo 200 eventos en espera por plugin; un evento sin entregar en 7 días se descarta; una falla reintentable espera 30 s, duplicando hasta 6 h, máximo 12 intentos |
| Ajustes | máximo 12 con valor, más máximo 16 `section`/`status`/`action`/`link`/`help` (apiVersion 6; `link` y `help` apiVersion 12, máximo 4 de cada uno) y `qr` (apiVersion 13); `text` 500, `url` 2.048, `password` 500 caracteres; la dirección de un `link` 2.048, el título de un `help` 60 y su texto 2.000 |
| Mensajes de error | tu mensaje de `kino.error` es un detalle para el log, cortado a 200 caracteres; un `userMessage` para la persona tiene máximo 160 |
| `hosts` | al menos 1 entrada, sin límite máximo desde Kino 0.9.45 (solo lo acota el manifiesto de 16 KB; Kino 0.9.44 y anteriores rechazan más de 20); desde apiVersion 2, ninguna (`[]`) cuando hay un ajuste `url` |
| `secrets` (apiVersion 4) | máximo 16; los nombres cumplen `^[A-Za-z][A-Za-z0-9_]{0,31}$`; un valor tiene de 1 a 4.096 bytes (de 1 a 8.192 desde apiVersion 6); desde apiVersion 6 una llave de cifrado puede tener tipo: `{ seal, use: "cipher-key", encoding: "hex" | "base64" }`, de 16/24/32 bytes |
| `kino.fetch` `maxBytes` (apiVersion 14) | se leen de 1 a 2.000.000 bytes del cuerpo, el `truncated` de la respuesta dice si se cortó; fuera de rango: `invalid_request` |
| Pantallas (`screen`, apiVersion 14) | profundidad 10, 600 nodos, 500 ítems por lista, estado de 64 KB, un texto de 2.000 caracteres; `screen` y `screenEvent` 20 s cada uno; todos los números en [Límites de una pantalla](screens.md#limits) |
| `kino.library` (apiVersion 14) | `limit` 50 por defecto, máximo 100; máximo 30 llamadas por minuto por plugin; fechas redondeadas al día, `progress` a 0,01 |
| `kino.room` (apiVersion 14) | un mensaje de máximo 8.192 bytes y 4 niveles; 5 mensajes por segundo, 100 y 256 KB por minuto por miembro; de 2 a 8 miembros; de 10 a 240 minutos (120 por defecto); buzón de 200 eventos o 15 minutos; 2 salas unidas y 1 alojada por aparato, 2 por plugin; 5 códigos equivocados bloquean las entradas 60 s, el doble cada vez hasta 30 minutos; se cierra tras 30 minutos en segundo plano (una sala alojada muestra mientras tanto la notificación de Kino) |
| Trabajos (`schedule`, apiVersion 14) | de 1 a 3 trabajos, cada 15 a 1.440 minutos; una ejecución de máximo 20 s, 10 peticiones una a la vez, 2 MB de respuestas y 256 KB escritos en `kino.storage`; 96 ejecuciones al día por plugin; un fallo espera 15 minutos, el doble cada vez hasta 6 h, y 3 seguidos pausan el trabajo |
| `kino.ai` (apiVersion 14) | un prompt de máximo 8.192 bytes, `system` 2.048; la respuesta cortada en `maxChars` (de 1 a 4.096, 2.048 por defecto); 10 preguntas en cualquier minuto, 100 al día y 1 a la vez por plugin; 300 al día y 2 a la vez para todos los plugins del aparato juntos; 20 s por pregunta |
| `kino.shared` (apiVersion 14) | 4 claves de máximo 40 caracteres por plugin; un valor de máximo 64 KB y 16 niveles, 128 KB en total; 30 escrituras por minuto; el valor nuevo de una clave viaja como mucho una vez cada 60 s |
| `kino.identity` (apiVersion 15) | solo dentro de una llamada de la persona; máximo 10 llamadas por minuto por plugin; un `challenge` de 16 a 128 caracteres `A-Z a-z 0-9 _ -`; solo plugins firmados con la llave de autor de Kino ([Identidad](identity.md)) |
| `kino.notifications` (apiVersion 15) | máximo 20 publicaciones por hora por plugin, 30 avisos guardados durante 30 días; un `title` de 1 a 80 caracteres, un `text` de máximo 160; una petición de máximo 8.192 caracteres ([Avisos en la campanita](notifications.md#limits)) |
| Tiendas (`pluginStore`, apiVersion 15) | máximo 5.000 entradas y 4 MB de JSON por `storeSync`, un `state` de 16 KB; una ejecución de `storeSync` de máximo 60 s, 40 peticiones y 8 MB descargados; en una tienda en vivo, 5 s por llamada, 20 llamadas por minuto y un caché de 30 minutos ([Tiendas de plugins](plugin-stores.md#limits)) |

Desde apiVersion 6, además:

| Qué | Límite |
| --- | --- |
| Stream | `alternatives` 8 (perezosas y concretas juntas); `label` 48 caracteres; `ref` de una copia perezosa 512 caracteres; `alternateHosts` 6; `signContext` 4.096 caracteres; 3 reintentos de `resolve` por reproducción firmada |
| Copias perezosas | el cambio automático espera máximo 20 s el `resolve` de una copia; una copia que la persona escogió tiene todo el límite de `resolve`; la elección de copia de una descarga prueba dentro de 30 s en total |
| Navegador oculto (`"browser": true` o `"pages"`) | `resolve` 75 s; una página a la vez en toda la app; `kino.browser.capture` `timeoutMs` 1..25.000 (18.000 por defecto), máximo 8 media y 10 subtítulos, 12 encabezados por media; `kino.browser.page` (solo `"pages"`) `timeoutMs` 1..25.000 (15.000 por defecto), 20 lecturas por minuto por plugin, HTML de máximo 2.000.000 caracteres. Ver [Navegador oculto](browser.md) |
| `subtitles()` (cualquier apiVersion) | 10 s; se conservan 30 pistas, se listan 15 por plugin; `label` 60 caracteres |
| `meta()` | 6 s por plugin; la primera respuesta en orden de instalación se guarda 30 minutos; desde Kino 0.9.51, `ratings` 6 (una por fuente), `cast` 20 (`name` y `character` de 60 caracteres) |
| `segments()` (apiVersion 7) | 8 s, y Kino espera máximo 12 s; se leen 100 entradas y se conservan 10; cada una de al menos 1 s, con un final de máximo 5 s pasado de la duración; respuesta guardada en la sesión por título, capítulo y duración (10 s); reintento tras 2 minutos si fallaron todos. Ver [`segments`](contract.md#segments) |
| Formulario de ajustes | `settingsStatus` 10 s, `action` 30 s, `validateSettings` 20 s; `status` 200 caracteres, `message` de una acción 300, `confirm` 120, error de un campo 200; `clearSettings` 12 claves |
| Campos de ajustes (cualquier apiVersion) | `key` `^[a-z][a-zA-Z0-9_]{0,31}$`; `label` 40 caracteres; `hint` 80 (300 en una `section` desde Kino 0.9.51); `select` de 1 a 20 `options`, cada `value` y `label` de 40; `list` (apiVersion 4) `max` de 1 a 50 entradas (20 por defecto), de 1 a 4 `fields` de tipo `text` o `url`. Ver [Formulario de ajustes](settings-form.md#types) |
| Sección y categorías | etiqueta de la sección 20 caracteres; 8 pestañas de 24 caracteres; texto del destacado 300; `categories` 24 mosaicos con títulos de 40 caracteres |
| `kino.crypto`, pares de llaves | 64 llaves privadas vivas por runtime; firma de máximo 512 bytes |
| `kino.log.report` | un reporte por plugin y área por hora, 3 por plugin hasta que Kino se reinicia; área de máximo 24 caracteres |
| `telemetry: "verbose"` | 60 eventos por plugin hasta que Kino se reinicia, uno por minuto por área |

Desde Kino 0.9.54, además:

| Qué | Límite |
| --- | --- |
| `details()` (apiVersion 8) | 20 s; puede leer páginas con `kino.browser.page`. Ver [Los detalles propios de un título](contract.md#details) |
| Ítems de audio (apiVersion 8) | `artist` de máximo 200 caracteres; los ítems `music` y `podcast` cuentan en los mismos tamaños de fila y de página que cualquier ítem. Ver [Música y podcasts](contract.md#music-podcasts) |
| `kino.browser.capture` con `captureAll` (comprueba `kino.browser.captureAll`) | máximo 20 peticiones, termina 1 s después de que nada nuevo coincide; `alsoMatch` de 1 a 10 patrones de 1 a 500 caracteres; máximo 64 encabezados por petición; `cookies` máximo 64, 16.384 caracteres en total. Ver [Todas las coincidencias, una cookie, una respuesta al acabarse el tiempo](browser.md#capture-all) |

Desde Kino 0.9.74, además:

| Qué | Límite |
| --- | --- |
| Proveedor de sincronización (`syncProvider`, apiVersion 12) | `syncPull` y `syncPush` 60 s cada una, `syncStatus` 15 s; el blob mide como mucho `sync.maxBlobBytes`, como máximo 4.194.304 bytes (4 MiB) decodificado; solo dentro de `syncPull`/`syncPush`, una petición de `kino.fetch`, el cuerpo de una respuesta y el resultado hasta ceil(`maxBlobBytes` × 4/3) + 65.536; `pullEveryMs` sube a 30 s como mínimo, `pushDebounceMs` a 5 s; máximo 60 rondas por hora; `provision` 8 claves. Ver [Proveedores de sincronización](sync-providers.md#limits) |
| `kino.sync.remoteChanged()` | un aviso cada 30 s como mucho; se descarta mientras corre una lectura |
| Ajustes `link` y `help` (apiVersion 12) | 4 de cada uno; la `url` de un link 2.048 caracteres, solo https; el `title` de un help 60 y su `body` 2.000 |
| Respuestas `setSettings` y `link` de una acción (cualquier apiVersion) | `setSettings` 8 claves de ajustes `text`/`select`; el `candidate` de un link de 1 a 64 caracteres |

Desde apiVersion 13 (en desarrollo, la próxima versión de Kino), además:

| Qué | Límite |
| --- | --- |
| `read` (`byteSource`) | 20 s por llamada, una a la vez por plugin; un rango de máximo 1 MiB en un offset múltiplo de 4.096; después de 3 lecturas seguidas con tiempo agotado Kino deja de leer ese stream hasta que se abra otra vez. Mira [Sockets y bytes del plugin](bytes.md#byte-source) |
| `image` (`imageSource`) | 10 s por llamada, en segundo plano (nunca "No responde"); mira la fila de arriba e [Imágenes del plugin](images.md#what-kino-does) |
| Operaciones de bytes de `kino.crypto` (dependen de la versión de Kino, no del manifiesto: revisa si están) | números de `modPow` de máximo 4.096 bits; `aesIge`/`aesIgeVerify` una llave de 32 bytes, un iv de 32 bytes y datos múltiplos de 16 bytes; 5 MB de datos por llamada como el resto de `kino.crypto` |
| Ajuste `qr` | el texto de 1 a 512 caracteres; `refreshMs` de 2.000 a 60.000; cuenta entre los 16 ajustes que no guardan valor |
| `storageLarge` | 16 MB en total, 2 MB por valor, 1.000 llaves de máximo 256 caracteres; solo en el aparato, nunca se sincroniza, no va en ninguna copia de seguridad |

## Cómo vive tu código { #lifecycle }

- **Una llamada a la vez.** Las llamadas a un mismo plugin corren una detrás de otra. El sandbox se
  reutiliza entre llamadas, pero Kino lo bota después de 5 minutos inactivo, después de un tiempo
  agotado, cuando se cancela una llamada (por ejemplo, una búsqueda nueva reemplaza a una vieja) y
  cuando el plugin se actualiza o se desactiva, y (Kino 0.9.54) cuando la persona cambia el idioma de la app, para que
  la siguiente llamada reciba el [`kino.lang`](kino-api.md#lang) nuevo. Las variables a nivel de módulo son, como mucho, un
  caché: guarda en `kino.storage` lo que tenga que sobrevivir.
- **Código al cargar.** Cuando instala tu plugin, Kino carga el módulo una vez en un sandbox
  desechable sin acceso a la red, para revisar que cada capacidad declarada sea una función exportada.
  Deja el nivel superior solo para declaraciones: una llamada de red ahí falla, y la instalación con
  ella.
- **Los errores le llegan a la gente.** Si tu función lanza un error, esa llamada falla y la persona
  ve un error que nombra tu plugin, y el texto de tu `Error` puede ser parte de él. Escribe esos
  mensajes para una persona, en español, cortos.
- **Memoria en una llamada larga (próxima versión de Kino, apiVersion 13 en desarrollo).** Cada plugin tiene 64 MB de
  memoria del motor. Hasta Kino 0.9.74 la respuesta de cada llamada `kino.*` con `await` (el cuerpo de un `kino.fetch`,
  un frame de socket) se quedaba en esa memoria hasta que se cerraba el sandbox, así que un plugin que movía muchos
  megabytes en la vida de un sandbox podía quedarse sin memoria en su segundo video. Desde la próxima versión una
  respuesta se libera cuando tu código ya la tiene, y después de una llamada que deja el motor por encima de la mitad de
  su límite Kino corre su recolector de basura, así que solo cuenta lo que tu código sigue teniendo. Aplica en cualquier
  `apiVersion`. Igual, ten pocos textos grandes vivos a la vez: un texto hex cuesta 2 bytes por byte, y después su base64.
- **Código desbocado.** Quedarse sin memoria o sin pila hace fallar la llamada. Un ciclo infinito
  síncrono (`while (true) {}`) **no se puede interrumpir**: al llegar al límite de tiempo Kino deja de
  esperar la llamada y bota el sandbox, pero el ciclo sigue dando vueltas en su propio hilo hasta que
  termine, y para un ciclo infinito de verdad eso es hasta que se cierre la app. Tres tiempos agotados
  seguidos desactivan el plugin.
- **La app se cierra durante una llamada.** Un fallo dentro del motor, o que el sistema la mate por
  memoria, puede tumbar toda la app en plena llamada, y nada dentro del proceso puede atajar eso. Kino
  se da cuenta en el siguiente arranque: a cada plugin que estaba en plena llamada en ese momento se le
  cuenta una salida sucia — **incluido un plugin sano que simplemente estaba corriendo al mismo
  tiempo**, no solo el que de verdad causó el fallo. Dos salidas sucias seguidas del mismo plugin, sin
  una llamada que termine bien entre ellas, lo apagan ("No responde") igual que tres tiempos agotados
  seguidos; una llamada que termina bien reinicia la cuenta.

## El motor no es Node ni un navegador { #not-node }

Los plugins corren en QuickJS. Maneja JavaScript moderno: `async`/`await`, clases con campos, `?.` y
`??`, expresiones regulares con lookbehind, grupos con nombre y `\p{L}` con la bandera `u`, template
literals, spread, `replaceAll`, `Array.prototype.at` y `flat`, `Object.fromEntries`,
`Promise.allSettled`, `Map`, `Set`, `BigInt`. **No** tiene la plataforma alrededor:

- **Globales que faltan** (`typeof` da `"undefined"` dentro de Kino): `setTimeout`, `setInterval`,
  `setImmediate`, `queueMicrotask`, `Buffer`, `process`, `require`, `fetch`, `AbortController`,
  `structuredClone`, `performance`, `crypto`, `WeakRef` e `Intl`. Usa `kino.sleep` para esperar,
  `kino.fetch` en vez de `fetch` y `kino.crypto` en vez de `crypto`. `URL`, `URLSearchParams`, `atob`,
  `btoa`, `TextEncoder`, `TextDecoder` y `console` sí existen: los pone Kino.
- **El kit ya los quita:** `run.mjs` y `validate.mjs` cargan tu plugin en un entorno aislado donde esos
  nombres no existen (usarlos da `ReferenceError`, igual que en Kino) y `validate` avisa con `!` en qué
  línea los usas y qué poner en su lugar. También rechaza cualquier `import`: Kino carga un solo
  archivo (empaquétalo con esbuild).
- **Los métodos que dependen del idioma no localizan:** `localeCompare` ignora su idioma y sus
  opciones (así que `{ numeric: true }` y `{ sensitivity: "base" }` no hacen nada; compara unidades de
  código), y `(1234.5).toLocaleString("es-CO")` da `"1234.5"`. Escribe la comparación que necesitas;
  el plugin de referencia tiene un `natural()` pequeño para nombres numerados.
- **Mantén cortos los nombres de las funciones.** Un nombre de función de millones de caracteres hace
  que el código nativo del motor tumbe toda la app. Como protección de mejor esfuerzo, `kino.*`,
  `console.*`, los globales web y las demás funciones que pone Kino están congelados, y en cualquier
  función `Object.defineProperty`, `Object.defineProperties`, `Reflect.defineProperty` y
  `__defineGetter__`/`__defineSetter__` se niegan a poner como `name` un texto de más de 1000
  caracteres, un getter o un setter, o a volverlo escribible: lanzan un `TypeError`
  (`Reflect.defineProperty` devuelve `false`). La protección no es hermética (una clave calculada
  enorme igual le pone nombre a una función); un plugin que igual tumba la app se apaga (mira "La app
  se cierra durante una llamada" arriba). Poner `name` en objetos normales, y `this.name = "MyError"`
  en una subclase de `Error`, funciona como siempre.

## Lo que el kit no puede copiar { #kit-differences }

El kit corre tu plugin en el V8 de Node dentro de un sandbox que imita el motor de Kino, y una prueba compara los dos con
un centenar de sondas de lenguaje (`plugins/sdk/test/engine-probes.js` en el repositorio de Kino, medidas contra el motor
real). El kit copia lo que puede: las líneas de `Error.stack`, `Date#toLocale*String` (ignoran sus argumentos e imprimen
`01/15/2024` y `01:05:09 PM`), el `toString` de tres líneas de las funciones nativas, `[object global]`, sin
`ArrayBuffer#resize`/`transfer`, `console` solo con `log`, `info`, `warn` y `error`, y `TextDecoder` solo con utf-8.

Lo que **no** puede copiar, así que un plugin puede pasar en el kit y aun así fallar en Kino:

| Qué | En Kino | En el kit |
|---|---|---|
| Memoria | 64 MB por plugin. Un arreglo de 1e7 elementos, un objeto con 1e6 claves o un `Map` con 1e6 entradas hace fallar la llamada | sin límite |
| Pila | 1 MB: unas 5000 llamadas anidadas ya lanzan `InternalError` (la recursión sin fin es `InternalError`, no `RangeError`) | V8 admite unas 10000 y lanza `RangeError` |
| Bandera `/x/v` | `SyntaxError` | la acepta |
| `sort` con un comparador que se contradice (`() => -1`) | otro orden | el orden de V8. Con comparadores coherentes, y la estabilidad, es idéntico |
| `new URL("http://münchen.de")` | `TypeError` (sin punycode): escribe el host como `xn--mnchen-3ya.de` | lo convierte a `xn--...` |
| `Error.stackTraceLimit` | no existe | existe (V8 lo necesita para armar `stack`) |

Si algo se comporta en Kino distinto que en el kit, es una sonda por añadir: la lista de diferencias conocidas está en
`plugins/sdk/test/engine-probes.known.json`, con una razón por línea.

## Dividir tu código en varios archivos { #splitting-files }

Kino carga exactamente un archivo (el `entry` del manifest), y el motor no tiene `require` ni
resolvedor de módulos, así que un `import` de `plugin.js` hacia un segundo archivo no tiene nada que
resolver en el dispositivo. Eso no significa que tengas que escribir todo el plugin en un archivo —
solo que el archivo que publicas tiene que ser el resultado terminado, en uno solo.

Escríbelo dividido, normal, y empaquétalo antes de publicar:

```
src/
  animeav1.js       un módulo auxiliar
  plugin.js         el punto de entrada; importa de animeav1.js
kino-plugin.json
package.json
```

```js
// src/animeav1.js
export async function searchAnimeAV1(query) {
  const res = await kino.fetch(`https://animeav1.com/api/search?q=${encodeURIComponent(query.q)}`);
  if (!res.ok) throw new Error("animeav1 respondió " + res.status);
  return res.json().results.map((r) => ({ id: r.slug, ref: r.slug, title: r.title, kind: "series", poster: r.image }));
}
```

```js
// src/plugin.js -- este import está bien: corre a través del bundler, nunca en el dispositivo
import { searchAnimeAV1 } from "./animeav1.js";

export async function search(query) {
  return searchAnimeAV1(query);
}
```

Empaquétalo con [esbuild](https://esbuild.github.io/) (`npm i -D esbuild`), apuntando a módulo ES
(Kino corre el archivo publicado como uno solo):

```bash
npx esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js
```

`plugin.js` en la raíz del repo es lo que sale de ese comando, con `src/animeav1.js` incluido adentro
y su `export async function search` intacto — ese es el archivo que nombra `entry` y el que Kino
descarga. Agrégalo como script de npm
(`"build": "esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js"`) y córrelo antes de
cada prueba con `sdk/` o antes de publicar. Rollup y webpack funcionan igual; esbuild es el que
necesita menos configuración para un plugin de este tamaño. Para un plugin más grande (carpetas por responsabilidad, un `plugin.js` generado y revisado con `check:built`), mira [Estructurar un plugin grande](structure.md).

## La trampa: un rechazo que nadie está escuchando todavía (Kino 0.9.49 y anteriores) { #rejection-trap }

**Desde Kino 0.9.50** un rechazo se comporta como en Node: un `throw` dentro de una función `async` lo
ataja el `try`/`catch`, el `.catch()`, el `Promise.all` o el `Promise.allSettled` de quien la llama, por
temprano que pase -- aunque sea antes de su primer `await`, y aunque el manejador se enganche unos
`await` después. Lo que sigue haciendo fallar la llamada es un rechazo que **nadie maneja nunca**: uno
que sigue sin manejador cuando el plugin ya solo está esperando a Kino (un `kino.fetch`, un
`kino.sleep`...). Por ejemplo, una función auxiliar que llamas sin `await` y que lanza error, o una
promesa que guardas y solo esperas después de un `kino.fetch`. La llamada falla entonces con ese error,
como Node se detendría con un `unhandledRejection`. Espera lo que arrancas, o ponle un `.catch()` de una.

**Kino 0.9.49 y anteriores** abortan **toda la llamada** cuando una promesa se rechaza antes de que
algo le haya puesto un manejador, aunque tu código esté dentro de un `try`/`catch`. El kit de Node no te
puede mostrar esto. Si tu plugin también tiene que funcionar ahí (la gente actualiza tarde), sigue estas
reglas:

- **Aborta la llamada:** un `throw` dentro de una función `async` **antes de su primer `await`**,
  cuando quien la llama está envuelto en `try`/`catch`. Un `.catch()` sobre esa llamada, o un
  `Promise.all`/`Promise.allSettled` alrededor, tampoco la rescatan. También aborta: un
  `new Promise((_, reject) => reject(e))` rechazado de inmediato, y un `return Promise.reject(e)` desde
  una función `async`.
- **Se ataja normal:** un `throw` después de cualquier `await` (aunque sea `await null;`), un rechazo
  que viene de `kino.fetch` o de `kino.sleep` (por ejemplo, un host rechazado), y `await Promise.reject(e)`
  o `Promise.reject(e).catch(...)` (esas versiones retrasan `Promise.reject` un tick para que un manejador
  alcance a engancharse).
- **Una llamada `kino.*` síncrona que falla** (`kino.storage.set` por encima de 256 KB, un error de
  `kino.crypto`, un selector que `kino.html.select` rechaza) se ataja normal desde Kino 0.9.50. Kino
  0.9.49 y anteriores terminaban ahí la llamada entera, aunque estuviera dentro de `try`/`catch`
  ([Errores que tu código puede atrapar](kino-api.md#catch)).
- Si igual nadie ataja el error, no pasa nada grave: la llamada falla con ese error de todos modos, y
  un código de `kino.error` le llega bien a la persona.
- **Los scrapers convertidos de Nuvio tienen un arreglo:** cuando Kino convierte un
  [scraper de Nuvio](nuvio.md), reescribe los ayudantes async que emiten los empaquetadores
  (`__async` de esbuild, `__awaiter` de TypeScript, `_asyncToGenerator` de Babel) para que el cuerpo
  de una función transpilada arranque un tick después, y un `throw` antes de su primer `await` se
  ataja normal. Una función `async` nativa (la tuya, o la de un scraper sin transpilar) igual necesita
  el `await` antes de cualquier cosa que pueda lanzar error.

Así que, para esas versiones, en una función auxiliar que quien la llama puede envolver en
`try`/`catch`, haz primero el `await` y valida después:

```js
// Wrong before Kino 0.9.50: this throw is NOT caught by the caller's try/catch; it aborts the whole call.
async function getJson(url) {
  if (!url.startsWith("https://")) throw new Error("dirección inválida");
  const r = await kino.fetch(url);
  return r.json();
}

// Right everywhere: the first await comes before anything that can throw.
async function getJson(url) {
  const r = await kino.fetch(url);
  if (!r.ok) throw new Error("archive.org respondió " + r.status);
  return r.json();
}
```

(El primero está mal antes de Kino 0.9.50: ese `throw` NO lo ataja el `try`/`catch` de quien llama y
aborta toda la llamada. El segundo está bien en todas las versiones: el primer `await` va antes de
cualquier cosa que pueda lanzar un error. Si una función auxiliar no tiene nada que esperar, empiézala
con `await null;`, o revisa la entrada en quien la llama antes de llamarla. Los ejemplos de este sitio
lo hacen, así que también corren en versiones viejas.)
