# Novedades para quienes escriben plugins { #changelog }

Lo que cambió en Kino y que importa cuando escribes un plugin, por versión de la app. Cada número
está en [el contrato](contract.md) y en [los archivos de referencia](reference/index.md).

## Kino 0.9.50: `apiVersion` 6 (aún sin publicar) { #v0950 }

<span id="next"></span>**`apiVersion` 6 = Kino 0.9.50.** El contrato (`contract.json`) dice ahora `maxApiVersion` 6 y
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
