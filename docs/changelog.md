# Novedades para quienes escriben plugins { #changelog }

Lo que cambió en Kino y que importa cuando escribes un plugin, por versión de la app. Cada número
está en [el contrato](contract.md) y en [los archivos de referencia](reference/index.md).

## Kino 0.9.54: `apiVersion` 8, música y podcasts, plugins de solo catálogo { #v0954 }

<span id="next"></span>(Todavía no publicada.) **`apiVersion` 8 = Kino 0.9.54.** El contrato (`contract.json`) ahora dice
`maxApiVersion` 8 y `kino.apiVersion` informa 8. Kino 0.9.53 y anteriores rechazan un manifiesto con `"apiVersion": 8`
(«Este plugin necesita una versión más nueva de Kino»), así que declara 8 solo si devuelves ítems `music` o `podcast`
o exportas `details`. Todo lo demás de esta lista es aditivo (vale en cualquier `apiVersion` y un Kino anterior lo
ignora), y nada de esto te obliga a cambiar tu plugin. Cómo usar cada cosa y seguir corriendo en un Kino anterior:

| Novedad | Desde | Cómo saberlo |
| --- | --- | --- |
| Ítems `music` / `podcast`, export `details` | Kino 0.9.54, `apiVersion` 8 | declara `"apiVersion": 8` (un Kino anterior rechaza el plugin) |
| `"catalogOnly": true` | Kino 0.9.54, cualquier `apiVersion` | un Kino anterior lo ignora: conserva `resolve` y `search` o `home` |
| `captureAll`, `alsoMatch`, `waitForCookie`, `returnCookiesOnTimeout` en `kino.browser.capture` | Kino 0.9.54, `apiVersion` 6 con `"browser": true` | `kino.browser.captureAll === true` |
| `rating`/`runtimeMinutes` en `episodes().series`, `ids.mal`/`anilist`/`kitsu` | Kino 0.9.54, cualquier `apiVersion` | nada que revisar: un Kino anterior los ignora |
| `kino.lang` en el idioma de la app | Kino 0.9.54 | lee `kino.lang`; antes siempre era `"es-CO"` |

- **Música y podcasts** (apiVersion 8): un ítem puede ser `kind: "music"` (un álbum, una lista o una sola pista) o
  `kind: "podcast"` (un programa o un audiolibro), con un `artist` opcional. Con `episodes` declarada, Kino le pide
  las pistas o los episodios; sin ella, el `ref` del ítem va directo a `resolve`. La persona recibe portadas
  cuadradas en filas propias, páginas de álbum y de podcast con «Reproducir» y «Aleatorio», un reproductor de audio,
  «Seguir escuchando» para podcasts en el Inicio, descargas de audio (con `download`) y envío de audio a Chromecast y
  DLNA. `search` puede recibir `type: "music"` o `"podcast"`, y `migrate` puede responder uno.
  [Música y podcasts](contract.md#music-podcasts).
- **`details(ref)`** (apiVersion 8, opcional, sin capacidad): tu propia sinopsis, arte, géneros, año, nota y duración
  para la página de una película, pedida junto con TMDB con sus propios 20 s y con permiso para usar
  `kino.browser.page`. Desde apiVersion 8 **`details` es un nombre de export reservado**: renombra una función tuya que
  lo tenga. `episodes().series` también acepta `rating` y `runtimeMinutes`, y los `ids` pueden llevar los `mal`,
  `anilist` y `kitsu` de un anime, con los que se consultan AniList y los plugins `meta`. La página del título sigue
  ahora un orden fijo por campo sin importar quién responda primero, con TMDB primero para la sinopsis, el año, los
  géneros, la nota y la duración. [Los detalles propios de un título](contract.md#details).
- **`"catalogOnly": true`** en `kino-plugin.json`: tu plugin muestra y describe títulos, pero no reproduce ninguno (un
  catálogo de TMDB, una lista de estrenos, calificaciones). Kino 0.9.54 manda sus títulos a «Buscar dónde verlo» (las
  otras fuentes de la persona) en vez de abrir el reproductor, nunca lo usa como fuente de un título (la búsqueda, «Ver
  otras fuentes», «Buscar por fuente», el «Servidor» del reproductor), nunca llama su `resolve`, no lo cuenta como fuente
  en «Elige tus fuentes» y la ventana de instalación dice «Solo catálogo: no reproduce videos». Con el campo, `resolve`
  deja de ser obligatorio y basta una de `home`, `browse`, `search` o `meta`; se rechazan `download`, `drm`, `channels`,
  `streamHosts` y `"browser": true` (`"pages"` sí vale).
- **Es aditivo**: vale en cualquier `apiVersion`, y un Kino anterior ignora el campo como ignora cualquier clave que no
  conoce. Para que tu plugin se siga instalando y actualizando en Kino 0.9.53 y anteriores, **sigue declarando y
  exportando `resolve`** (que falle con `kino.error("not_found", …, { userMessage })`) **y `search` o `home`**: esas
  versiones los exigen. `node sdk/validate.mjs` te dice si tu manifiesto sirve también para ellas, y
  `node sdk/run.mjs . resolve <ref>` recuerda que Kino 0.9.54 ya no lo llama.
  [Plugins de solo catálogo](contract.md#catalog-only).
- **`kino.browser.capture` atrapa cada coincidencia**: `captureAll` junta cada petición que coincide (máximo 20)
  hasta que la página se calma, `alsoMatch` agrega hasta 10 patrones más, `waitForCookie` espera una cookie como
  `cf_clearance` (sin `match`, una página solo de cookie) y `returnCookiesOnTimeout` responde lo que la página tenía
  en vez de lanzar `timeout`. La respuesta agrega entonces `requests`, `cookies`, `userAgent` y `timedOut`. Sin
  apiVersion nuevo: revisa primero `kino.browser.captureAll === true`; un Kino anterior ignoraba estos nombres, 0.9.54
  revisa sus tipos (`invalid_request`). [Navegador oculto](browser.md#capture-all).
- **`kino.lang` sigue el idioma de la app.** Kino 0.9.54 habla español o inglés (Ajustes ▸ App ▸ Idioma), y
  `kino.lang` es `"es-CO"` o `"en-US"` según eso (antes siempre `"es-CO"`). Un cambio de idioma cierra tu sandbox y
  la siguiente llamada abre uno con el valor nuevo; la caché de `kino.meta` se vacía y las filas de los plugins en el
  Inicio se vuelven a pedir. Escribe los títulos de tus filas y tu `userMessage` en ese idioma.
  [La API `kino`](kino-api.md#lang).
- **Los mensajes de error de Kino para tu código están en inglés** (el `e.message` de una falla de `kino.fetch`,
  `kino.storage`, `kino.html`, las reglas de la firma) y pueden cambiar: compara con `e.code`, nunca con el texto. Los
  rechazos del manifiesto que la persona lee al instalar quedan como estaban.
  [Errores que tu código puede atrapar](kino-api.md#catch).
- **`telemetry: true`** tiene una nueva línea de consentimiento, «Comparte con Kino registros de errores y datos
  técnicos de algunas reproducciones para corregir fallas», y también envía una pequeña muestra de reproducciones que
  salieron bien (una de cada veinte, máximo 6 hasta que Kino se reinicie), solo después de que la persona aceptó esa
  redacción. La pestaña de tu plugin en Ajustes tiene un interruptor «Enviar registros de errores y de reproducción»,
  encendido por defecto. Los registros de reproducción agregan el códec, la forma de entrega, la causa probable de
  cada pausa y el tipo de red. [Registro y telemetría](diagnostics.md#telemetry).
- **Copias: el mismo video, el mismo idioma.** Cada entrada de `alternatives` tiene que ser el mismo video en el mismo
  idioma (Kino cambia entre ellas por su cuenta). Después de varias pausas para cargar, Kino puede pasar una vez, por
  su cuenta, a una copia claramente más liviana cuando las etiquetas nombran la resolución (`"720p"`, `"Full HD"`).
  [Las reglas del `Stream`](contract.md#stream).
- **Las descargas** que no se pueden guardar ahora terminan como «Este contenido no se puede descargar» (antes «Este
  video no se puede descargar»). [Descargas](manifest.md#downloads).
- **«De la comunidad»** lee 100 plugins por página (antes los 30 con más estrellas), ordenados por «Populares» o
  «Recientes», con «Cargar más» y «Buscar en GitHub» para el texto escrito: un nombre y una descripción claros en tu
  repositorio ayudan a que te encuentren. [Publicar](publish.md#discovery-0954).
- **Plugins de CloudStream**: la persona puede agregar un repositorio de CloudStream y Kino convierte cada plugin que
  elige en un plugin de Kino que corre a través de una app complemento aparte; Music/Audio pasan a `music` y
  Podcast/AudioBook a `podcast`. No tienes nada que escribir: es lo que puede esperar quien mantiene un repositorio de
  CloudStream. Los plugins generados reciben un objeto `kino.cloudstream` que el tuyo nunca tiene.
  [Plugins de CloudStream](cloudstream.md).
- **Corregido: `kino.tmdb` y `kino.meta` después de una llamada abandonada.** Cuando Kino abandonaba una llamada tuya
  (una pantalla que se cerró, un límite de tiempo) pero igual usaba su respuesta tardía, cada `kino.tmdb` o
  `kino.meta` que esa llamada hacía después fallaba con `not_allowed`, así que un catálogo de TMDB podía mostrar una
  sola fila en el Inicio en vez de todas hasta reiniciar. Desde 0.9.54 siguen respondiendo hasta que termina la
  evaluación de esa llamada. [La API `kino`](kino-api.md#tmdb).

## Kino 0.9.53: `kino.meta` y `kino.tmdb` { #v0953 }

Sin `apiVersion` nuevo: sigue siendo 7, y nada de esta lista te obliga a cambiar tu plugin. Las dos
llamadas nuevas existen solo desde Kino 0.9.53, así que compruébalas antes de usarlas
(`typeof kino.meta === "function"`, `typeof kino.tmdb === "function"`); `node sdk/validate.mjs` avisa si tu código llama
alguna sin esa comprobación.

- **`kino.meta(query)`**: pregúntale a Kino qué sabe de un título (`{ type, ids: { imdb, tmdb, tvdb, kitsu, mal, anilist
  }, lang }`) y recibe sinopsis, año, póster, fondo, logo, géneros, duración, capítulos con sus ids, la equivalencia de
  todos los ids, notas y reparto, o `null`. Kino responde con su propia consulta de TMDB, AniList para el anime y los
  demás plugins `meta` de la persona, combinados igual que en la ficha; tu plugin nunca toca una llave de TMDB, y nunca
  se le pregunta a sí mismo. 30 llamadas por minuto, máximo 8 s, en caché 30 minutos.
  [La API `kino`](kino-api.md#meta).
- **`kino.tmdb(path, params)`**: la API v3 de TMDB, solo lectura, **sin una llave en tu plugin**. Primero va la llave
  propia de Kino, detrás de la caché de TMDB de Kino (en disco, la misma de sus pantallas, con una copia de hasta 7 días
  cuando TMDB no responde) y de límites propios (20 llamadas cada 10 s por plugin, 60 cada 10 s entre todos los plugins),
  para que los plugins no gasten la cuota de Kino. Solo cuando la llave de Kino falla (TMDB le responde 401/403/429, o se
  agota uno de esos límites) la misma petición sale otra vez con la llave de la persona: la que escribe en Ajustes ("Tu
  llave de TMDB", opcional, sincronizada entre sus aparatos) o, si no hay, la que configuró en un addon de Stremio
  instalado, si acepta usarla. Una llave que tu plugin guarda en sus propios ajustes nunca se usa. Kino pone la llave; tu
  código nunca ve ninguna, y TMDB no necesita una entrada en tus `hosts`. `no_tmdb_key` (con la frase de Kino para la
  persona en `e.userMessage`: "Agrega tu llave de TMDB en Ajustes, o instala un addon de TMDB de Stremio configurado con
  tu llave.") queda para una versión de Kino sin llave propia y una persona sin llave. Solo rutas de lectura permitidas,
  40 llamadas cada 10 s por plugin conteste la llave que conteste, en caché 10 minutos. Un catálogo hecho con TMDB ya no necesita su propio ajuste de
  llave (déjalo solo como respaldo para versiones anteriores). [La API `kino`](kino-api.md#tmdb),
  [un ejemplo completo](cookbook.md#tmdb-catalog).
- **El kit de Node** corre las dos: `KINO_META_FIXTURE`, `KINO_TMDB_KEY` (o `"tmdbKey"` en `sdk/config.json`) y
  `KINO_TMDB_FIXTURE`. [Probar en local](test-locally.md#kino-services).

## Kino 0.9.51: `apiVersion` 7 { #v0951 }

**`apiVersion` 7 = Kino 0.9.51.** El contrato (`contract.json`) dice ahora `maxApiVersion` 7 y
`kino.apiVersion` reporta 7. Un manifiesto con `"apiVersion": 7` se rechaza en Kino 0.9.50 y anteriores
("Este plugin necesita una versión más nueva de Kino"), así que declara 7 solo si usas `tracking` o
`segments`. Nada más de esta lista te obliga a cambiar tu plugin.

- **`tracking`** (apiVersion 7): tu plugin exporta `track(event)` y Kino le cuenta qué película o
  capítulo suena en ese aparato, de cualquier fuente: `start`, `progress`, `stop` y `watched`, con los
  ids propios del capítulo y los de la serie aparte. Se aprueba en rojo ("Le contará a … qué ves y
  cuándo lo terminas"), trae el interruptor "Enviar lo que veo" en tu pestaña de Ajustes, y los eventos
  esperan en una cola que sobrevive sin conexión y con la app cerrada (reintentos ordenados, 200 por
  plugin, 7 días). Devuelve `{ skipped: true }` para un evento que a tu servicio no le sirve.
  [Contarle a un servicio de seguimiento qué ve la persona](contract.md#tracking).
- **`segments`** (apiVersion 7): tu plugin exporta `segments(query)` y le dice a Kino dónde están la
  intro y los créditos de cualquier película o capítulo; los botones "Saltar intro" y "Saltar outro" y
  el salto automático los usan en celular y TV. Sin aprobación en rojo.
  [Dónde están la intro y los créditos](contract.md#segments).
- **Subtítulos por archivo**: `subtitles()` recibe `file: { hash?, size?, name? }`, lo que Kino sabe del
  archivo que suena (el hash de OpenSubtitles, su tamaño, su nombre, o uno al estilo de un release armado
  con el título), para poner primero la versión exacta. Un addon de Stremio lo recibe como los extras
  `videoHash`, `videoSize` y `filename`. Sin `apiVersion` nuevo.
  [Subtítulos para cualquier título](contract.md#subtitles), [Addons de Stremio](stremio.md#subtitles).
- **`meta` con logo, notas y reparto**: la respuesta de `meta` puede traer `logo` (se muestra en lugar
  del nombre en la ficha), `ratings` (hasta 6, de IMDb, Rotten Tomatoes, Letterboxd…) y `cast` (hasta
  20); un addon de Stremio al estilo de AIOMetadata los da con su `logo`, `imdbRating` y
  `app_extras.cast`. Sin `apiVersion` nuevo: las versiones anteriores los ignoran.
  [Describir otros títulos](contract.md#meta).
- **Los enlaces `stremio:///detail/…` abren el título en Kino** (el "Open in Stremio" de Seenr y
  similares), en vez de ignorarse. [Addons de Stremio](stremio.md#detail-links).
- **"Tu servidor" 1.5.0**, el plugin de referencia, ahora muestra todo lo que un servidor propio puede
  usar hasta apiVersion 7: `tracking`, `segments`, `subtitles` con `file`, `meta` con logo, notas y
  reparto, y lo de apiVersion 6 (sección, categorías, firma por petición, copias, el formulario de
  ajustes completo, una lista con `resolve: true`, `liveSearch` y paginación de canales).
  [Plugins de ejemplo](examples.md#reference-plugin).

- **Compatibilidad de Nuvio v2**: Kino convierte muchos más scrapers de Nuvio. Scrapers de varios
  archivos (los hermanos se leen del mismo repositorio, máximo 16 archivos y 1 MiB), un subconjunto de
  Node (`path`, `url`, `util`, `events`, `querystring`, `timers`, `buffer` y `http`/`https`/`undici`
  sobre `kino.fetch`; `setInterval`, `queueMicrotask`), el `onSettings` de cada scraper como formulario
  de ajustes que se sincroniza entre aparatos, y cada copia reproducible ofrecida como alternativa con
  etiqueta en el menú Servidor (las páginas de embed de últimas). Una dirección al estilo Kodi
  `url|User-Agent=…` se vuelve encabezados. Los scrapers P2P y de debrid se rechazan ("No compatible").
  Nada de esto es para tu propio plugin: es lo que puede dar por hecho un scraper de Nuvio.
  [Scrapers de Nuvio](nuvio.md#runtime).
- **Formulario de ajustes**: el `hint` de una `section` puede tener hasta 300 caracteres y se parte en
  varias líneas (`sectionHintMaxChars` en `contract.json`). Las versiones anteriores a 0.9.51 rechazan
  uno de más de 80, así que mantenlo corto si tu plugin tiene que instalarse en ellas.
  [Formulario de ajustes](settings-form.md#types).
- **Un `%` en el texto de un error ya no tumba la app.** Hasta 0.9.50, un error de tu plugin cuyo texto
  llevaba un `%` (una URL codificada como `?q=Inception%20s` en un "fetch failed") podía cerrar Kino de
  golpe. Ahora el texto de un error puede ser cualquiera; si tu plugin tiene que correr en 0.9.50 y
  anteriores, no metas direcciones codificadas en sus mensajes de error.
  [Errores que tu código puede atrapar](kino-api.md#catch).
- **Recomendados** suma addons de Stremio de utilidad (subtítulos como OpenSubtitles v3 y Subtis,
  catálogos como Cinemeta, TMDB e IMDb) y canales gratis y legales (Pluto TV, Radios). La lista ya no
  se publica en npm: Kino la lee de este repositorio en GitHub, luego de archive.org y luego de la copia
  de jsDelivr del mismo archivo de GitHub. Un addon que reproduce video sigue sin recomendarse.
  [Addons de Stremio](stremio.md#subtitles).
- **La tarjeta de tu plugin ya no lleva la insignia "Kino"** (parecía hecho por Kino); los addons de
  Stremio y los scrapers de Nuvio conservan la suya.
- **Un addon de Stremio cuya descripción niega los torrents ya no se oculta** ("no incluye streams,
  torrents ni contenido P2P"); el id y el nombre siguen estrictos. [Lo que Kino rechaza](stremio.md#refused).

## Kino 0.9.50: `apiVersion` 6 { #v0950 }

**`apiVersion` 6 = Kino 0.9.50.** El contrato (`contract.json`) dice ahora `maxApiVersion` 6 y
`kino.apiVersion` reporta 6. Un manifiesto con `"apiVersion": 6` se rechaza en Kino 0.9.49 y anteriores
("Este plugin necesita una versión más nueva de Kino"), así que declara 6 solo si usas algo de esta
lista. Todo lo que un plugin ahora puede cambiar de cómo lo muestra Kino está reunido en
[Personaliza tu plugin](customize.md).

- **Secretos sellados más grandes y con tipo**: hasta 8.192 bytes, y llaves de cifrado con tipo
  (`use: "cipher-key"`) que sirven también para `des-ede3`. [Manifiesto](manifest.md#typed-keys).
- **`migrate`**: pasar a tu plugin lo que la persona tenía guardado y Kino ya no puede abrir.
  [Pasar lo guardado](migrate.md).
- **Streams firmados por petición**: `signing: "request"`, `signContext`, el export `sign`,
  `resolve(ref, { retry })` y `alternateHosts`. [Firma por petición](signed-streams.md).
- **El formulario de ajustes**: tipos `section`, `status` y `action` (hasta 16, además de los 12 con
  valor), `settingsStatus`, `action` con `clearSettings`, `validateSettings`, la pestaña propia en
  Ajustes y la sincronización entre aparatos. [Formulario de ajustes](settings-form.md).
- **`debug`** y **`telemetry`** (`true` o `"verbose"`), `kino.log.report`, la página Registro, las
  etiquetas de logcat `KinoPlugin/<id>` y `KinoPlay`, y las métricas de reproducción.
  [Registro y telemetría](diagnostics.md).
- **Modo debug en todo plugin**: todo plugin instalado (el tuyo, un addon de Stremio convertido, un
  scraper de Nuvio) tiene un interruptor "Modo debug" en su pestaña de Ajustes, sin que hagas nada:
  encendido, sus fallas se ven en pantalla y su Registro se puede copiar o compartir, así que una persona
  te puede mandar una captura o su Registro. `"debug": true` ahora solo lo deja encendido de entrada; sin
  él arranca apagado. La decisión de la persona se conserva en las actualizaciones y se sincroniza con sus
  otros aparatos. [Modo debug](diagnostics.md#debug).
- **Los rechazos tempranos se atajan**: un `throw` en una función `async` antes de su primer `await` lo
  ataja el `try`/`catch` de quien la llama (o un `.catch()`, un `Promise.all`), como en Node; solo un
  rechazo que nadie maneja nunca sigue haciendo fallar la llamada. Sigue haciendo el `await` primero si tu
  plugin tiene que correr en 0.9.49 y anteriores. [La trampa del rechazo](engine-limits.md#rejection-trap).
- **`section`, `categories` y `theme`**: una sección propia, un grupo en Categorías y tus colores.
  [Sección, categorías y colores](section-theme.md).
- **`scopedSearch`**: responder tú la búsqueda dentro de un "Ver más". [Contrato](contract.md#scoped-search).
- **`kino.error(code, message, { userMessage })`**: tu propia frase para la persona, con reglas de
  seguridad y atribuida a tu plugin. [Contrato](contract.md#user-message).
- **Entradas `adult: true`** detrás del código +18 de la persona (antes se descartaban).
  [Contenido +18](contract.md#adult).
- **Canales en tus filas de Inicio** (`kind: "live"` en `home`; antes se quitaban).
  [Canales en vivo](live-channels.md#home-rows).
- **Pares de llaves en `kino.crypto`**: `generateKeyPair`, `sign`, `verify`, `importKey`,
  `deriveSharedSecret`. [API kino](kino-api.md#key-pairs).
- **El navegador oculto**: `"browser": true` (aprobado en rojo, "Puede abrir páginas web ocultas para
  encontrar el video") y `kino.browser.capture`, que abre un embed en una WebView oculta dentro de la app,
  en un `resolve` que empezó la persona, y devuelve las peticiones de video que hizo, retenidas para que
  sus tokens sigan frescos, con los encabezados y cookies para reproducirlas. Todo su tráfico pasa por un
  proxy con una credencial por captura e IP revisadas y fijas; la red de la casa nunca; una página a la
  vez; cookies y almacenamiento borrados. Una página que pide una persona termina con `blocked`: **Kino
  nunca resuelve un captcha**. El `resolve` de un plugin aprobado tiene 75 s. También,
  con `"browser": "pages"` (su propia línea roja), `kino.browser.page`, que lee el HTML de una página a través del mismo navegador oculto cuando la
  revisión automática del sitio pasa sola (nunca desde `categories`; el documento principal tiene que quedarse
  en tus hosts, revisando cada salto de redirección, o la lectura termina en `blocked`). [Navegador oculto](browser.md).
- **`Stream.label` y copias perezosas con etiqueta**: nombra cada copia ("Latino · Servidor 1") para el
  nuevo menú **Servidor** del reproductor, y lista copias como `{ label, ref }` que Kino resuelve con
  `resolve(ref)` solo cuando la persona escoge una, el cambio automático llega a ella (máximo 20 s cada
  una) o la elección de copia de una descarga la prueba. Si la escogida falla, se vuelve a la copia que
  se estaba viendo. [Copias con etiqueta y perezosas](contract.md#lazy-copies).
- **`meta`**: describir títulos que listaron otras fuentes (sinopsis, imágenes, capítulos) cuando TMDB
  y AniList no tienen nada. [Describir otros títulos](contract.md#meta).

Sin `apiVersion` nuevo (sirve para cualquier plugin):

- **`alternatives`** en un `Stream`: hasta 8 copias del mismo video; Kino pasa a la siguiente cuando una
  no se puede reproducir en el aparato. [Contrato](contract.md#stream).
- **Reproducir en el TV desde el celular**, **capítulos nuevos** de las series seguidas y **"Para ti"**
  funcionan para títulos de cualquier plugin. [Lo que ve la persona](what-people-see.md#v0950).
- **Actualizaciones**: revisión al abrir la app (máximo cada 12 h), insignia de pendientes, y una llamada
  fallida con una actualización pendiente lo dice. [Publicar](publish.md#updates).
- **Un plugin firmado en dos repositorios** cuenta como el mismo con el mismo `id` y la misma llave.
  [Plugins firmados](signed.md#two-addresses).
- **Export `subtitles`**: responder la "Buscar subtítulos en línea" del reproductor para cualquier
  título que Kino conozca por id de IMDb o TMDB, junto a tus videos o como proveedor de subtítulos
  (`"capabilities": ["subtitles"]` sola). [Subtítulos para cualquier título](contract.md#subtitles).
- **`Stream.skip`**: dónde están la entrada y el cierre de este archivo, para "Saltar intro" / "Saltar
  outro"; los tuyos le ganan a AniSkip, una corrección a mano le gana a los tuyos. [Contrato](contract.md#stream).
- **El campo `categories` del manifiesto** (`movies`, `series`, `anime`, `live`, `radio`, `subtitles`,
  `utilities`, `adult`): los chips de categoría de la tienda de plugins. [Manifiesto](manifest.md).
- **Formulario de ajustes**: `settingsStatus()` se vuelve a pedir después de cada acción, así que
  `refresh: true` ya no hace falta. [Formulario de ajustes](settings-form.md#ui-types).
- **Registros**: solo un plugin que declara `telemetry` envía líneas de `kino.log` con una falla,
  recomendado o no; por ahora no hay interruptor para apagarlo. [Registro y telemetría](diagnostics.md#telemetry).
- **"De la comunidad"** es su propia pestaña de la pantalla Plugins. [Publicar](publish.md#get-found).
- **Addons de subtítulos de Stremio** (OpenSubtitles v3, traductores como GTSubs) se instalan como
  proveedores de subtítulos; las traducciones automáticas salen como "Español (traducido)". No tienes
  nada que escribir. [Addons de Stremio](stremio.md#subtitles).
- **Ids reservados**: `live`, `local`, `unknown`, `plugin`, `own`, `subtitle-keys`, `subtitle-prefs` (la lista cambió:
  las versiones anteriores reservan algunos más, así que si una dice "El id … está reservado por Kino",
  escoge otro).
- **Reclamos y retiro de plugins de la comunidad**: [`community-blocklist.json`](claims.md).
- **Enviar a la TV**: todo HLS pasa por el celular; un archivo sin `headers` va directo y, si la TV no
  puede, por el celular. [Enviar a la TV](what-people-see.md#cast).
- **`genre`** en una fila de Inicio, una categoría en vivo o una lista (`peliculas`, `series`, `anime`,
  `infantil`, `documentales`, `deportes`, `noticias`, `musica`, `entretenimiento`, `otros`): Categorías
  agrupa por él las filas navegables de todos los plugins, y En vivo filtra por él entre proveedores.
  Opcional; sin él, Kino lo adivina por el título. [Contrato](contract.md#returns).
- **`streamHeaders`** en una lista: el `User-Agent` o el `Referer` que el reproductor manda para cada
  canal de la lista, aparte de los `headers` de descarga de la propia lista.
  [Canales en vivo](live-channels.md#live-contract).
- **Una llamada `kino.*` síncrona que falla se puede atajar** (un `kino.storage` lleno, un error de
  `kino.crypto`): tu `try`/`catch` recibe un `Error` normal; Kino 0.9.49 terminaba ahí la llamada entera.
  [Errores que tu código puede atrapar](kino-api.md#catch).
- **Después de actualizar Kino**, las actualizaciones de plugins que esperan aprobación se instalan una
  vez, desde la dirección del propio plugin, con un aviso único "Se actualizaron tus plugins" que dice lo
  que cada uno puede hacer ahora. [Publicar](publish.md#updates).
- **El formulario de ajustes, documentado entero**: cada tipo de campo, atributo y valor por defecto,
  con un ejemplo completo. [Formulario de ajustes](settings-form.md#types).

(Las versiones de Kino anteriores a `genre` y `streamHeaders` los ignoran; no se revisó la versión exacta
en que salió cada uno.)

También en esta versión (ya documentado antes en esta página como "próxima versión"):

- **Instalar desde la URL del manifiesto.** La gente puede pegar la URL `https` de un
  `kino-plugin.json` en cualquier servidor público, no solo un `owner/repo` de GitHub. Una instalación
  `url:` así lee `entry` e `icon` al lado del manifiesto, no puede usar `secrets` sellados, siempre
  cuenta como no firmada y nunca sale en "De la comunidad" (el descubrimiento sigue usando el topic de
  GitHub). Una URL de `kino-plugin.json` en GitHub, raw.githubusercontent.com o jsDelivr
  (`cdn.jsdelivr.net/gh/owner/repo@<ref exacta>/…`; `@latest` es la rama por defecto, un rango de
  versiones se rechaza) se vuelve `owner/repo` como antes.
  [Instalar desde la URL del manifiesto](index.md#manifest-url), [Publicar](publish.md#manifest-url).
- **`liveSearch`, un export opcional nuevo para canales en vivo** (sin `apiVersion` nuevo: sigue
  siendo 3 con `channels`). Kino lo pide desde la búsqueda de En vivo mientras algunos de tus canales
  nunca se han listado; devuelve canales como una página de `liveChannels`, máximo 100 conservados,
  desde 2 caracteres escritos, 15 s. [Canales en vivo](live-channels.md#live-search).
- **Los catálogos en vivo grandes siguen paginando.** `liveChannels` recibe 10 páginas al comienzo, y
  5 más cada vez que la persona se acerca al final, hasta 10.000 canales (200 páginas) por categoría.
  Las versiones anteriores se quedan en 10 páginas. Pruébalo con `node sdk/run.mjs . live search <consulta>`.
- **Listas M3U** en UTF-8, Latin-1 o UTF-16; los atributos de `#EXTINF` pueden ir con comillas simples
  o sin comillas; una lista de más de 20 MB o una guía de más de 50 MB se corta en su última línea
  completa en vez de rechazarse. [Canales en vivo](live-channels.md#live-contract).
- **Addons de Stremio**: la gente los puede instalar desde el mismo campo (Kino genera el plugin; no
  tienes nada que escribir). Su `resolve`, como el de un scraper de Nuvio convertido, tiene 75 s.
  Qué se admite, qué se rechaza (torrents y P2P siempre) y cómo hacer que un addon funcione bien:
  [Addons de Stremio](stremio.md).
- `ditu` ya no es un `id` de plugin reservado (las versiones anteriores lo siguen rechazando, así que
  evítalo).

## Kino 0.9.46 a 0.9.49 { #v0946 }

- **Se acepta un `./` al principio de `entry` e `icon`.** Kino lo quita e instala el plugin.
  **Kino 0.9.45 y anteriores lo siguen rechazando** (`El campo "entry" debe ser una ruta relativa a
  un archivo .js`), así que sigue escribiendo `"plugin.js"` e `"icon.png"`. El `validate.mjs` del
  kit rechaza `"./plugin.js"` por eso. [Detalles](manifest.md#entry-dot-slash).
- **Tus logs ayudan cuando falla un plugin recomendado.** En un plugin del catálogo recomendado de
  Kino, las últimas 30 líneas de `kino.log` de una llamada fallida (depuradas, 2 KB) van con el reporte
  del error como `plugin_log`. Registra pasos y estados, nunca lo que la persona escribió ni un
  secreto. [`kino.log`](kino-api.md#log).
- Un canal en vivo nunca muestra el botón de descarga, aunque el plugin declare `download`.

!!! note "Sobre la versión de cada punto"
    Estos puntos están en las versiones publicadas como 0.9.46 a 0.9.49; no se comprobó la versión
    exacta en la que apareció cada uno.

## Kino 0.9.45 { #v0945 }

**Contrato (`contract.json`, `maxApiVersion` 5):**

- **Plugins firmados, `apiVersion` 5.** Firma opcional del autor en `kino-plugin.json`
  (`node sdk/seal.mjs --keygen`, `--sign`; `validate.mjs` la comprueba), clave fijada en la primera
  instalación, "Firmado por su autor" en la hoja de consentimiento, insignia "Firmado", la clave del
  autor en los detalles. Necesita Kino 0.9.45+; las apps más viejas rechazan un manifiesto con
  `apiVersion` 5. Borradores anteriores de estos documentos decían 0.9.46: salió en **0.9.45**.
  [Plugins firmados](signed.md).
- **Sin máximo de `hosts`.** El límite de 20 desapareció (solo lo acota el manifiesto de 16 KB). Kino
  0.9.44 y anteriores siguen rechazando más de 20, y el kit avisa. [Manifiesto](manifest.md).
- **`kino.apiVersion`** reporta 5.

**Comportamiento que puedes notar (sin cambio de manifiesto):**

- **Enviar a la TV (Chromecast y DLNA) funciona para títulos de plugins.** Directo para mp4/webm y HLS
  sin `headers`; por el celular cuando pones `headers`; nunca para DRM, DASH, MPEG-TS progresivo o un
  formato que nada identifica. [Enviar a la TV](what-people-see.md#cast).
- **Los plugins acompañan a la persona entre sus aparatos** (celular y TV): instalaciones, encendidos,
  aprobaciones, ajustes y contraseñas (cifradas) se sincronizan, y el otro aparato instala tu plugin
  desde la misma dirección. [Plugins en otros aparatos](what-people-see.md#sync).
- **Direcciones de instalación**: también sirve una URL `raw.githubusercontent.com/.../kino-plugin.json`
  (o `manifest.json`, para Nuvio) o una `github.com/.../blob/...`; una ref que solo viene de una URL
  pegada no es un pin. [Inicio](index.md), [Scrapers de Nuvio](nuvio.md).
- **Descargas HLS**: `EXT-X-DISCONTINUITY` se deja tal cual salvo que el formato cambie en él; una
  llave mala o un segmento vacío terminan como "Este video no se puede descargar"; un reintento solo
  retoma con el mismo contenido. Las descargas siguen siendo declarativas: `"download"` en
  `capabilities`, nada que exportar. [Descargas](manifest.md#downloads).
- **Headers de canales M3U**: se leen `#EXTHTTP`, `url|User-Agent=...` y los headers de `#KODIPROP`;
  solo se conservan `User-Agent`, `Referer`, `Origin` y `Cookie`. [Canales en vivo](live-channels.md).
- **`kino.fetch`**: los saltos de redirección rechazados cuentan para las 60 peticiones, máximo 6
  fetch en vuelo, máximo 3 preguntas de host por llamada, se rechazan las formas IPv6 de direcciones
  privadas, sin proxy del dispositivo. Un plugin convertido desde un scraper de Nuvio tiene 250
  peticiones y 75 s de `resolve`. [Límites](engine-limits.md).

!!! note "Sobre la versión de cada punto"
    El archivo del contrato fija la versión solo para los plugins firmados y el límite de hosts
    (0.9.45). Los demás puntos están en la compilación que se publicó como 0.9.45; no se verificó en
    qué versión exacta apareció cada uno.

## Ya estaba antes de 0.9.45 { #earlier }

`streamHosts: "any"` (apiVersion 4), `liveStreamHosts: "any"` (apiVersion 3 más la capacidad
`channels`), `fetchHosts: "any"` (lo escribe Kino solo en scrapers de Nuvio convertidos, nunca para tu
plugin), y la pregunta que Kino le hace a la persona la primera vez que un stream usa un host que no
declaraste. Están documentados en [el manifiesto](manifest.md#stream-hosts),
[canales en vivo](live-channels.md) y [el contrato](contract.md#forgotten-host).
