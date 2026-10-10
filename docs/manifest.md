# El manifiesto

`kino-plugin.json`, máximo 16 KB:

```json
{
  "id": "archive-org",
  "name": "Internet Archive",
  "version": "1.0.0",
  "apiVersion": 1,
  "entry": "plugin.js",
  "description": "Películas de dominio público y televisión clásica de archive.org",
  "author": "kinotvapp",
  "homepage": "https://github.com/kinotvapp/kino-plugin-archive",
  "hosts": ["archive.org", "*.archive.org"],
  "capabilities": ["search", "home", "browse", "episodes", "resolve"],
  "color": "#E0A030",
  "icon": "icon.png"
}
```

Si se rompe una regla de las de abajo, Kino se niega a instalar el plugin y muestra un mensaje en
español que nombra el campo.

| Campo | Regla |
| --- | --- |
| `id` | Obligatorio. `^[a-z0-9][a-z0-9-]{1,39}$` (de 2 a 40 letras minúsculas, dígitos o guiones, sin empezar por guion). No puede ser `live`, `local`, `unknown`, `plugin`, `own`, `subtitle-keys` ni `subtitle-prefs` (nombres propios de Kino; las versiones anteriores reservan además otros ids: si una dice "El id … está reservado por Kino", escoge otro). Es la identidad del plugin: nunca lo cambies cuando ya haya gente que lo instaló. |
| `name` | Obligatorio. De 1 a 40 caracteres. |
| `version` | Obligatorio. `MAJOR.MINOR.PATCH` y nada más (sin `-beta`, sin `+build`), cada número de hasta 6 dígitos y sin ceros a la izquierda. |
| `apiVersion` | Obligatorio. De `1` a `8`. Un número más alto del que Kino soporta se rechaza con "Este plugin necesita una versión más nueva de Kino". Declara el número más bajo que tenga lo que usas, para que tu plugin también corra en versiones viejas de Kino: `2` para `download`, `drm`, `insecureHttp`, `"hosts": []` o ítems `live`; `3` para `channels`/`liveStreamHosts`; `4` para un ajuste `list`, `streamHosts` o `secrets`; `5` solo para un [plugin firmado](signed.md) (Kino 0.9.45+); `6` (Kino 0.9.50+) para cualquier cosa de la [lista de apiVersion 6](changelog.md#v0950): secretos con tipo o más grandes, `migrate`, `scopedSearch`, streams firmados por petición, `section`/`status`/`action` en los ajustes, `debug`, `telemetry`, `section`, `categories`, `theme`, `userMessage`, entradas `adult`, canales en filas de Inicio, las llamadas de pares de llaves de `kino.crypto`, la capacidad `meta`, [`"browser": true`](browser.md) con `kino.browser.capture` (y `"browser": "pages"` con `kino.browser.page` también), y las [copias con etiqueta y perezosas](contract.md#lazy-copies); `7` (Kino 0.9.51+) para las capacidades [`tracking`](contract.md#tracking) y [`segments`](contract.md#segments); `8` (Kino 0.9.54+) para los [ítems `music` y `podcast`](contract.md#music-podcasts) y el export [`details`](contract.md#details). |
| `entry` | Obligatorio. Ruta relativa del archivo JavaScript: solo letras, dígitos, `.`, `_`, `-` y `/`, sin `..`, máximo 200 caracteres, termina en `.js`. El archivo pesa máximo 1 MB. **Escribe `"plugin.js"`, nunca `"./plugin.js"`**: Kino 0.9.45 y anteriores rechazan un `./` al principio (mira la advertencia [más abajo](#entry-dot-slash)). |
| `signature` | Opcional, desde apiVersion 5: `{ "authorKey": "<64 hex>", "value": "<128 hex>" }`, la escribe `node sdk/seal.mjs --sign`: tu firma sobre el archivo de entrada. Necesita Kino 0.9.45+. Mira [Plugins firmados](signed.md). Por debajo de apiVersion 5 se ignora. <a id="signature"></a> |
| `hosts` | Obligatorio. Al menos 1 entrada, sin tope máximo desde Kino 0.9.45 (solo la acota el manifiesto de 16 KB). Kino 0.9.44 y anteriores rechazan más de 20, así que con más de 20 hosts el kit avisa "Más de 20 hosts: Kino 0.9.44 o anterior rechaza este plugin; necesita Kino 0.9.45 o superior". Desde apiVersion 2 puede estar vacío, `[]`, cuando el plugin tiene un ajuste de tipo `url`: mira [Los servidores propios de la persona](#own-servers)); cada una es un nombre DNS en minúsculas (`archive.org`), `*.` más un nombre DNS (`*.archive.org`) o (solo apiVersion 2) un objeto `{ "host": "…", "insecureHttp": true }` (abajo). Solo nombres de host: sin esquema, puerto ni ruta. Nada de `*` solo, nada de direcciones IP, nada de `localhost`, nada que termine en `.local`, `.lan`, `.internal`, `.localhost` o `.home.arpa`, y por lo menos un punto. **`*.x` cubre solo los subdominios, no `x` mismo**: si necesitas los dos, pon los dos. Los hosts que la persona aprueba después, uno por uno, mientras tu plugin corre ([Un host que se te olvidó](contract.md#forgotten-host)) no cuentan contra el manifiesto. |
| `capabilities` | Obligatorio. Un subconjunto de `search`, `home`, `browse`, `episodes`, `resolve`, `download`, `drm`, `channels`, `migrate`, `scopedSearch`, `meta`, `subtitles`, `tracking`, `segments`. Debe incluir `resolve` y al menos uno de `search` o `home`, salvo en un [plugin de solo catálogo](contract.md#catalog-only) (`"catalogOnly": true`, Kino 0.9.54) y en un plugin que declara solo `subtitles`, `tracking` y/o `segments` (abajo). `search`, `home`, `browse`, `episodes` y `resolve` tienen que ser, cada una, una función exportada del archivo de entrada, o la instalación falla con "El plugin no carga: le falta ...". `download` y `drm` necesitan `apiVersion: 2` y son banderas declarativas — la app actúa sobre ellas, no tu código, así que no hay nada más que exportar; declarar una muestra su línea de consentimiento ("Puede descargar videos para verlos sin conexión" / "Reproduce video protegido (DRM)") y pide aprobación otra vez en una actualización que la agregue. `download` les da descargas sin conexión a tus títulos (mira [Descargas](#downloads)); `drm` le permite a un `Stream` llevar una licencia Widevine (mira [Un stream protegido con Widevine](cookbook.md#widevine)). `channels` necesita `apiVersion: 3` y los exports `liveCategories` y `liveChannels` (mira [Canales en la pestaña En vivo](live-channels.md#en-vivo-tab)). `migrate` necesita `apiVersion: 6` y el export `migrate`; declararla muestra "Revisar lo que tienes guardado (biblioteca, historial, favoritos) para pasarlo a este plugin" y pide aprobación otra vez en una actualización que la agregue (mira [Pasar lo guardado](migrate.md)). `scopedSearch` necesita `apiVersion: 6` y `search` (si no, se rechaza con "La capacidad \"scopedSearch\" necesita también \"search\""); no exporta nada propio: tu `search` recibe `within` cuando la persona busca dentro de un "Ver más" (mira [Buscar dentro de un "Ver más"](contract.md#scoped-search)). `meta` necesita `apiVersion: 6` y el export `meta`, sin línea de consentimiento (mira [Describir otros títulos](contract.md#meta)). `subtitles` necesita el export `subtitles`; `["subtitles"]` sola es un proveedor de subtítulos; un plugin que declara solo `subtitles`, `tracking` y/o `segments` (un proveedor de subtítulos, de seguimiento, de segmentos o una mezcla) también es una excepción a "`resolve` y `search` o `home`" (mira [Subtítulos para cualquier título](contract.md#subtitles)). `tracking` necesita `apiVersion: 7` y el export `track`; declararla muestra una línea en rojo con tus hosts ("Le contará a seenr.app qué ves y cuándo lo terminas") y pide aprobación otra vez en una actualización que la agregue, aunque Kino apruebe otras actualizaciones por su cuenta (mira [Contarle a un servicio de seguimiento qué ve la persona](contract.md#tracking)). `segments` necesita `apiVersion: 7` y el export `segments`; declararla muestra "Agrega el botón para saltar la intro y los créditos", no en rojo y sin aprobación propia (mira [Dónde están la intro y los créditos](contract.md#segments)). |
| `settings` | Opcional. Lo que la persona llena en la pantalla "Configurar" de tu plugin: mira abajo. |
| `permissions` | Opcional. Una lista de nombres de la lista cerrada de `contract.json`. **La lista está vacía en esta versión**: cualquier nombre se rechaza con "permiso desconocido: …". Existe para que una versión futura pueda agregar permisos (cada uno visible en la pantalla de consentimiento) sin un `apiVersion` nuevo. |
| `color` | Opcional, `#RRGGBB`: el acento de la pestaña y los chips de tu plugin. Por defecto, un color neutro. |
| `icon` | Opcional, ruta relativa a un `.png` cuadrado de máximo 128 KB. Un ícono que falta o que pesa demasiado se omite sin que falle la instalación. |
| `discoverable` | Opcional, `true` o `false` (por defecto `true`), en cualquier `apiVersion`. `false` deja el plugin por fuera de la búsqueda de la comunidad de Kino (mira [Hazte encontrar](publish.md#get-found)); la gente igual puede instalarlo escribiendo su dirección. Cualquier otro valor se rechaza con "El campo \"discoverable\" debe ser true o false". |
| `categories` | Opcional, en cualquier `apiVersion`: lo que ofrece tu plugin, para los chips de categoría de la tienda de plugins de Kino (Recomendados, "De la comunidad", "Elige tus fuentes"). Una lista sin repetidos de `movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `adult`. Si está, reemplaza lo que Kino adivina por tus capacidades (`channels` es `live`, `episodes` es `series`, todo lo que lista y reproduce es `movies`); el chip de un plugin `adult` solo se ve mientras el código +18 de la persona está desbloqueado. Cualquier otro valor se rechaza con "El campo \"categories\" debe ser una lista sin repetidos de: movies, series, anime, live, radio, subtitles, utilities, adult". No es lo mismo que el export `categories()` (mosaicos dentro de Categorías de Kino, mira [Sección, categorías y colores](section-theme.md)). |
| `catalogOnly` | Opcional, `true` o `false` (por defecto `false`), en cualquier `apiVersion`, desde Kino 0.9.54 (un Kino anterior lo ignora). `true` dice que el plugin lista y describe títulos pero no reproduce ninguno: `resolve` deja de ser obligatorio y Kino nunca lo llama; sus títulos van a "Buscar dónde verlo". Necesita una de `home`, `browse`, `search` o `meta`, y rechaza `download`, `drm`, `channels`, `streamHosts` y `"browser": true`. Para seguir instalándose en Kino 0.9.53 y anteriores, sigue declarando y exportando `resolve` (que falle con `not_found`) y `search` o `home`. Mira [Plugins de solo catálogo](contract.md#catalog-only). Cualquier otro valor se rechaza con "El campo \"catalogOnly\" debe ser true o false". |
| `browser` | Opcional, `true`, `false` o `"pages"`, desde `apiVersion` 6; por debajo se ignora. `true` deja que el plugin abra páginas en una vista web oculta en el aparato con `kino.browser.capture` (en `resolve`), en rojo como "Puede abrir páginas web ocultas para encontrar el video"; `"pages"` agrega `kino.browser.page`, como "Puede abrir páginas web ocultas para mostrar contenido y encontrar el video". Una actualización que lo agrega, o que pasa de `true` a `"pages"`, espera aprobación de nuevo; el `resolve` de un plugin aprobado tiene 75 s. Mira [Navegador oculto](browser.md). Cualquier otro valor se rechaza con "El campo \"browser\" debe ser true, false o \"pages\"". |
| `debug` | Opcional, `true` o `false` (por defecto `false`), desde `apiVersion` 6; por debajo se ignora. Desde Kino 0.9.50 todo plugin instalado tiene un interruptor "Modo debug" en su pestaña de Ajustes (errores en pantalla y un "Registro" que la persona puede copiar o compartirte); este campo solo lo deja **encendido de entrada**. Sin él arranca apagado y cada persona lo enciende cuando quiere mandarte un reporte. Cuando la persona lo toca, manda su decisión (`validate.mjs` te dice qué significa `true`). Mira [Registro y telemetría](diagnostics.md#debug). Cualquier otro valor se rechaza con "El campo \"debug\" debe ser true o false". |
| `telemetry` | Opcional, `true`, `false` o `"verbose"` (por defecto `false`), desde `apiVersion` 6; por debajo se ignora. Pide compartir las líneas de diagnóstico de tu plugin con el registro de errores de Kino cuando una llamada falla, venga de donde venga el plugin, y enciende `kino.log.report`. Se muestra en la hoja de consentimiento y una actualización que lo declara por primera vez espera su aprobación. Hasta Kino 0.9.53 las líneas de todo plugin que lo declara se envían siempre, sin interruptor; desde Kino 0.9.54 la pestaña de tu plugin en Ajustes tiene un interruptor "Enviar registros de errores y de reproducción", encendido por defecto, y la línea de consentimiento dice "Comparte con Kino registros de errores y datos técnicos de algunas reproducciones para corregir fallas" (`true` también envía una pequeña muestra de reproducciones que salieron bien). Mira [Registro y telemetría](diagnostics.md#telemetry). Cualquier otro valor se rechaza con "El campo \"telemetry\" debe ser true, false o \"verbose\"". |
| `section` | Opcional, `{ "label": "…" }` (de 1 a 20 caracteres), desde `apiVersion` 6; por debajo se ignora. Le da a tu plugin su propia sección y exige el export `section`: mira [Sección, categorías y colores](section-theme.md). Desde `apiVersion` 9 (Kino 0.9.55) puede llevar también `"labelEn"` (de 1 a 20 caracteres): el nombre de la sección cuando la app está en inglés; `label` sigue siendo el texto en español y el de respaldo. Por debajo de 9 se ignora sin revisarlo. Uno vacío, de más de 20 o que no sea texto se rechaza con "El campo \"section.labelEn\" debe tener entre 1 y 20 caracteres". Mira [Textos en inglés](settings-form.md#english). |
| `theme` | Opcional, un objeto, desde `apiVersion` 6; por debajo se ignora. Hasta cinco colores `#RRGGBB`: `accent`, `onAccent`, `background`, `surface`, `highlight`; cualquier otra clave se rechaza con "El campo \"theme\" tiene un color desconocido". El manifiesto solo revisa el formato; las protecciones de lectura corren cuando Kino usa los colores ([Tus colores](section-theme.md#theme)). |
| `panel` | <span id="panel"></span>Opcional, `{ "label", "labelEn?", "icon?" \| "iconFile?" }`, desde `apiVersion` 9 (Kino 0.9.55); por debajo se ignora. Un botón en el reproductor, junto al de subtítulos, mientras suena un título de tu plugin, que abre tu propio panel. `label` de 1 a 24 caracteres; `icon` uno de 16 nombres (`tune` por defecto) o `iconFile`, un PNG de 96×96 con alfa de máximo 24 KB, nunca los dos. Exige el export `panel`; `panelAction` y `playerEvent` son opcionales. Mira [El panel del reproductor](player-panel.md#manifest). |
| `settingsLayout` | Opcional, una lista de filas, columnas y tarjetas con `{ "setting": "<clave>" }`, desde `apiVersion` 9; por debajo se ignora. Acomoda los ajustes que ya declaraste sin quitar ninguno (los que no nombres van al final). Mira [`settingsLayout`](player-panel.md#settings-layout). |
| `fetchHosts` | Opcional, solo `"any"`. Deja que tu `kino.fetch` llegue a **cualquier host público, solo por `https` en el puerto 443**, para scrapers cuyos sitios o redirecciones de extractores cambian de dominio. En un plugin escrito a mano Kino lo respeta **desde `apiVersion` 9 (Kino 0.9.55)**, después de que la persona lo aprueba en rojo ("Puede conectarse a cualquier servidor público de internet (solo https, nunca tu red local)"); `kino.fetchAnyHost` es `true` cuando está activo. Con un cupo de peticiones y sin tocar tus `hosts` declarados. Por debajo de apiVersion 9 solo lo respeta en los manifiestos que arma al convertir un [scraper de Nuvio](nuvio.md); en tu plugin se ignora (tu `kino.fetch` sigue limitado a tus `hosts`) y `sdk/validate.mjs` avisa "fetchHosts only takes effect on plugins converted from Nuvio or, on one written by hand, from apiVersion 9 (Kino 0.9.55); in your plugin it is ignored". Mira [Conectarse a cualquier servidor](#fetch-hosts). Desde `apiVersion: 4` su único valor es `"any"`; cualquier otro se rechaza con `The "fetchHosts" field only takes "any"`. Por debajo de apiVersion 4 se ignora. |
| `description`, `author`, `homepage` | Textos opcionales. Se les quitan los espacios de los extremos y se cortan a 300, 60 y 200 caracteres. Kino muestra el nombre, el autor, la versión y la descripción cuando le pregunta a la persona si quiere instalar. |
| `support` | Opcional. El correo del autor, una sola dirección (`nombre@ejemplo.com`). Con él, la hoja de acciones del plugin ofrece **Reportar un problema**: abre la app de correo de la persona con un mensaje para esa dirección, con el registro limpio del plugin y los datos del aparato en el cuerpo. La persona lo lee y lo edita antes de enviarlo; Kino no envía nada y no tiene servidor. Solo en el teléfono (la TV no tiene correo). Una dirección inválida hace inválido el manifiesto. Para Kino 0.9.58 o más nueva; las anteriores ignoran el campo. |

Las demás claves se ignoran. `hosts` cumple tres funciones: es lo que la persona aprueba, es el
único conjunto de sitios a los que llega `kino.fetch`, y es el conjunto en el que deben estar las
URL de un `Stream`: el video, sus subtítulos, sus `audioTracks` y la `licenseUrl` de un bloque
`drm` (además del servidor propio de la persona).

Hay un campo más, `liveStreamHosts`, que solo se lee con `"apiVersion": 3` y solo en plugins con la
capacidad `channels`: mira [Canales desde cualquier servidor](live-channels.md#live-stream-hosts).
Los ítems en vivo (apiVersion 2) y la pestaña En vivo (apiVersion 3) tienen su propia página,
[Canales en vivo](live-channels.md).

## Rutas en `entry` e `icon`: sin `./` al principio { #entry-dot-slash }

!!! danger "Escribe plugin.js, nunca ./plugin.js"
    `entry` e `icon` son rutas relativas al manifiesto. **Kino 0.9.45 y anteriores rechazan un `./`
    al principio**: la instalación falla con `El campo "entry" debe ser una ruta relativa a un
    archivo .js` (o lo mismo para `"icon"`), y en la app solo parece que el plugin "no se instala".
    Un plugin generado con IA escribió `"./plugin.js"` y falló en unas 35 instalaciones. Kino 0.9.46
    y posteriores aceptan un `./` al principio y lo quitan, pero todavía hay gente con versiones
    más viejas, así que escribe siempre `"plugin.js"` e `"icon.png"`, sin `./` (una carpeta sí vale:
    `"src/plugin.js"`). El `validate.mjs` del kit lo rechaza con: `Quita el "./" del campo "entry"
    (por ejemplo "plugin.js"): Kino 0.9.45 y anteriores no instalan el plugin con "./"`.

## Reproducir desde cualquier servidor (`streamHosts`, apiVersion 4) { #stream-hosts }

Algunas fuentes sirven el video desde CDNs cuyos dominios no puedes listar (cambian, o están en TLDs
sueltos, que una entrada `*.xyz` nunca cubre). Con `"apiVersion": 4` un plugin puede agregar:

```json
"apiVersion": 4,
"streamHosts": "any"
```

`"any"` es el único valor y no hace falta ninguna capacidad; un manifiesto más viejo ignora el campo.
Deja que **lo que el plugin reproduce** esté en **cualquier host público**, por `http` o `https`:

- una película o un episodio: exactamente la regla del
  [permiso amplio de video](contract.md#broad-video) -- la misma regla, pedida por ti de entrada en
  vez de concedida por la persona. En el reproductor, la `url` que devuelve `resolve`, todo lo que
  nombra su manifiesto, cada salto de redirección **y** los `subtitles` y `audioTracks` que
  devuelves pueden estar en cualquier host público, y nunca se pregunta por un host de video. Una
  [descarga](#downloads) de esa película o episodio sigue la misma regla;
- un canal en vivo: la regla de [`liveStreamHosts: "any"`](live-channels.md#live-stream-hosts) (el
  stream, su manifiesto y sus redirecciones; tus `subtitles` y `audioTracks` siguen en tus `hosts`).

No cambia nada más: `kino.fetch` (y por tanto todo [secreto sellado](#secrets)), las imágenes y los
servidores de licencia DRM siguen en los `hosts` que declaraste, y las direcciones locales o privadas
(y los nombres públicos que resuelven dentro de la red de la casa) siguen rechazadas. La pantalla de
consentimiento lo muestra en rojo ("Puede reproducir video desde cualquier servidor que indique"), y
una actualización que lo agrega espera a que la persona apruebe de nuevo. Si puedes, lista los
dominios reales: la gente confía más en una lista corta.

## Conectarse a cualquier servidor (`fetchHosts`, apiVersion 9) { #fetch-hosts }

Hay scrapers que no pueden listar sus hosts: el sitio cambia de dominio cada tanto, o un extractor
redirige a un CDN distinto en cada video. Desde **Kino 0.9.55** un plugin escrito a mano puede pedir:

```json
"apiVersion": 9,
"fetchHosts": "any"
```

Con eso, **tu `kino.fetch`** (cada salto de redirección incluido, y su tarro de cookies) puede llegar a
hosts que no declaraste, sin una pregunta por host, con estas reglas (la tienen los
[scrapers de Nuvio](nuvio.md) que Kino convierte, desde antes):

- **La persona lo aprueba.** La pantalla de consentimiento lo muestra en rojo ("Puede conectarse a
  cualquier servidor público de internet (solo https, nunca tu red local)"), y una actualización que lo
  agrega espera a que la persona apruebe de nuevo. Sin esa aprobación, `kino.fetch` sigue en tus `hosts`.
- **Solo `https`, por el puerto 443, y solo a un nombre con punto o a una IPv4 pública.** Esto vale para un
  host que llega **únicamente** por este permiso (no está en tus `hosts` ni es un servidor que escribió la
  persona), en cada salto de redirección. Un `http://`, otro puerto o un nombre de una sola etiqueta
  (`router`, `nas`) falla con `host_not_allowed` (y `e.host` dice cuál).
- **Un cupo de peticiones.** Esas peticiones (cada salto que sale) gastan un cupo que Kino lleva por plugin
  para toda la app: como mucho **60 por minuto a un mismo sitio** (un dominio y sus subdominios cuentan
  juntos) y **600 cada 10 minutos en total** (250 y 2500 en un plugin convertido de Nuvio); se rellena de forma
  continua. Pasado el cupo, la petición falla al instante con `rate_limited`. Los 60 pedidos por llamada de
  [`kino.fetch`](kino-api.md#fetch) siguen aplicando.
- **Tus `hosts` declarados y los servidores que escribió la persona conservan sus propias reglas** (un host
  `insecureHttp` sigue aceptando `http`, uno declarado cualquier puerto) y **no gastan cupo**. **Declara tus
  sitios principales**: es más rápido, no depende del cupo y la gente confía más en una lista corta.
- **Nunca la red de la casa.** Las direcciones locales o privadas (`localhost`, `192.168.x.x`,
  `10.x.x.x`, `.local`…) y los nombres públicos que resuelven dentro de la red de la casa siguen
  rechazados con `host_not_allowed`, también en un salto de redirección. Una dirección IPv6 escrita
  tal cual (`[2001:db8::1]`) se rechaza siempre, sea local o pública: usa un nombre.
- **Los [secretos sellados](#secrets) no cambian**: un pedido que lleva un valor sellado solo va a los
  `hosts` que declaraste, por `https`, en cada salto.
- **Las páginas ocultas.** Si además declaraste [`"browser"`](browser.md), la dirección inicial de lo que abren
  `kino.browser.capture` y `kino.browser.page`, y cada navegación de la página principal que sigue (una
  redirección, un `location`), siguen **una sola regla**: un host que declaraste o que escribió la persona
  conserva la suya, y uno que llega solo por este permiso tiene que ser `https`, puerto 443 y un nombre con
  punto o una IPv4 pública. La navegación puede salir de tus `hosts` (los embeds saltan de host), y la primera
  que rompe la regla termina la captura o la lectura con `blocked`. Es detección, no siempre prevención: cuando el WebView del
  aparato pasa la página por el proxy de Kino, una redirección de servidor de la página principal puede
  contactar su destino una vez antes de que la captura termine. Lo que la página carga después (frames, scripts, el
  CDN del video) sigue siendo libre (cualquier host público, nunca la red de la casa) y no gasta cupo. Lo que
  reproduces sigue sus propias reglas ([`streamHosts`](#stream-hosts)); las imágenes, las licencias DRM
  y las descargas no cambian.
- **`kino.fetchAnyHost`** es `true` cuando el permiso está activo en esta instalación (declarado, con
  apiVersion 9 y aprobado), `false` si no, y `undefined` en un Kino anterior: úsalo para elegir entre
  ir directo al host nuevo o quedarte con tu propio respaldo. [La API `kino`](kino-api.md#fetch-any-host).

Por debajo de apiVersion 9 un plugin escrito a mano puede declarar el campo (el manifiesto sigue
siendo válido), pero Kino lo ignora: la pantalla de consentimiento no lo muestra y `kino.fetch` sigue
en tus `hosts`. Y como Kino 0.9.54 y anteriores rechazan `"apiVersion": 9`, ese plugin necesita Kino
0.9.55. Si puedes, lista los dominios reales: la gente confía más en una lista corta.

## Secretos sellados (apiVersion 4) { #secrets }

Un plugin que trae una clave fija (un token de API metido en el cliente del propio sitio, un secreto
por cliente que es del autor) puede sellarla en vez de escribirla en texto plano en el manifiesto:

```
node sdk/seal.mjs --repo owner/repo --name apiKey
```

(`owner/repo/ruta` para un plugin que vive en una subcarpeta.) `--repo` sigue las mismas reglas que
la dirección desde la que la gente instala: se quitan un `/` final y un `.git`, pero una URL
(`https://github.com/...`) y un `@ref` se rechazan en vez de adivinar. El valor se lee de un prompt
oculto o por stdin -- nunca como argumento de la línea de comandos, que quedaría en el historial de la
terminal. Debe tener de 1 a 4.096 bytes (UTF-8) -- hasta 8.192 con `"apiVersion": 6`; la herramienta imprime una línea,
`kino-sealed:v1:...`, para pegar en el manifiesto:

```json
"apiVersion": 4,
"secrets": { "apiKey": "kino-sealed:v1:AbC123..." }
```

- Hasta 16 secretos; cada nombre cumple `^[A-Za-z][A-Za-z0-9_]{0,31}$`. `secrets` necesita
  `"apiVersion": 4`; por debajo el campo se ignora (el plugin se instala sin secretos y `kino.secret`
  lanza error con cualquier nombre), y un Kino demasiado viejo para apiVersion 4 rechaza toda la
  instalación con "Este plugin necesita una versión más nueva de Kino".
- Un sello queda atado al repositorio (y subcarpeta) que le pasaste a `seal.mjs`, en minúsculas,
  **nunca a un ref**. Al instalar y en cada actualización, Kino abre cada sello una vez contra la
  dirección desde la que la persona instala, solo para comprobar que es de ahí; cada ejecución del
  plugin los vuelve a abrir, en memoria, solo para esa ejecución. Un sello hecho para otro
  repositorio, ruta o nombre, o uno dañado, se rechaza con "Los datos sellados de este plugin no son
  para este repositorio o están dañados"; una versión que no puede abrir sellos los rechaza con "Este
  Kino no puede abrir datos sellados".
- **Solo desde la rama principal, nunca con un `@ref` explícito.** GitHub sirve cualquier commit
  alcanzable en la red de forks de un repositorio -- el de un fork o el de un pull request -- por la
  dirección del repositorio padre, y no solo con un SHA evidente: un prefijo hexadecimal corto o un
  ref de git-describe resuelven igual. Así, `owner/repo@<lo-que-sea>` puede ser el manifiesto de otra
  persona, con sus propios `hosts`, mientras el sello sigue diciendo `owner/repo`. Un plugin con
  secretos que se instala o actualiza con cualquier `@ref` explícito -- rama, etiqueta o commit -- se
  rechaza con "Los datos sellados solo funcionan si instalas el plugin desde su rama principal, sin
  @rama", y una ejecución desde una dirección así no recibe secretos.
- Un sello confía en el *nombre* del repositorio: si su dueño cambia de nombre o se borra y otra
  persona registra ese nombre, su repositorio abre tus sellos. Vuelve a sellar para el nombre nuevo, y
  cambia el valor si el viejo valía la pena protegerlo.
- Declarar cualquier secreto agrega "Usa datos sellados por su autor" a la hoja de consentimiento;
  una actualización que trae secretos a un plugin que no tenía pide aprobación otra vez, igual que un
  host nuevo. Agregar, cambiar o quitar un secreto en un plugin que ya declaraba alguno no la pide.

### Llaves de cifrado con tipo (apiVersion 6) { #typed-keys }

Un valor sellado que se usa como llave de `kino.crypto.encrypt`/`decrypt` se puede declarar como llave,
para que Kino lea sus bytes con una codificación fijada en el manifiesto en vez del `keyEncoding` que
pase el código. Eso es lo que deja que una llave sellada sirva también para `des-ede3-*` (una llave
sellada sin tipo sigue siendo solo para AES):

    node sdk/seal.mjs --repo owner/repo --name portalKey --use cipher-key --encoding hex

imprime una línea JSON para pegar como valor del secreto:

```json
"apiVersion": 6,
"secrets": { "portalKey": { "seal": "kino-sealed:v1:...", "use": "cipher-key", "encoding": "hex" } }
```

- `use` tiene que ser `"cipher-key"`; `encoding` es `"hex"` o `"base64"`; no se permite ningún otro
  campo.
- El valor, leído con esa codificación, tiene que dar una llave de 16, 24 o 32 bytes: `seal.mjs` rechaza
  cualquier otra cosa, y Kino rechaza la instalación con "El secreto "portalKey" debe ser una clave de
  16, 24 o 32 bytes".
- `kino.secret("portalKey")` sirve como la `key` **completa** de cualquier `encrypt`/`decrypt`; el
  `keyEncoding` que pases se ignora. Se rechaza, con "a sealed value can't be used here", como llave
  de HMAC, como entrada de `pbkdf2`, en cualquier parte de `data`/`iv`/`aad`, y en cualquier parte de una
  petición de `kino.fetch` (la URL, los nombres o valores de los headers, un cuerpo de texto, JSON o
  formulario): una llave con tipo es solo para `kino.crypto` y nunca sale por la red.
- Por debajo de apiVersion 6 un objeto aquí no es un sello: el manifiesto se rechaza.
- El kit de Node simula todo esto a partir del valor en claro de `.kino-secrets.json`; los bytes de la
  llave, en hex (mayúsculas o minúsculas) o base64, también se tapan en todo lo que devuelve un servidor.

**Qué protege y qué no.** Esto es ofuscación, no secreto: la clave privada que abre un sello va dentro
de cada copia de Kino. Sellar un valor lo saca de tu manifiesto y del historial de tu repositorio; no
impide que alguien desarme Kino y abra el sello por su cuenta, igual que no impide que el sitio al que
llamas vea el valor en claro de su lado. No selles un valor que ya es público (una clave que ya está
en el JavaScript del reproductor de ese sitio no gana nada sellada en el tuyo), y nunca selles las
credenciales **de la persona**: esas van en un [ajuste](#settings) de tipo `password`.

**Cómo se usa.** [`kino.secret(name)`](kino-api.md#secret) devuelve un marcador, no el valor; Kino
cambia el marcador por el valor real solo dentro de `kino.fetch`, hacia los `hosts` de tu manifiesto
por `https`, y tapa el valor en todo lo que vuelve a tu código. Las reglas completas (dónde se cambia
el marcador, `kino.crypto`, el tapado) están en [La API kino](kino-api.md#secret); cómo probarlo con
el kit de Node, en [Probar en local](test-locally.md#secrets).

## Ajustes { #settings }

`settings` es una lista de máximo 12 entradas que guardan un valor (más, desde apiVersion 6, máximo 16
que solo muestran o hacen algo: mira [Formulario de ajustes](settings-form.md)). Cada una se vuelve un
campo en la pantalla "Configurar" del plugin (Ajustes ▸ Plugins, y desde Kino 0.9.50 también la propia
pestaña de tu plugin en Ajustes), y tu código lee su valor con `kino.config.get(key)`:

```json
"settings": [
  { "key": "server", "label": "Servidor", "type": "url", "required": true, "hint": "http://192.168.1.10:8096" },
  { "key": "user", "label": "Usuario", "type": "text", "required": true },
  { "key": "password", "label": "Contraseña", "type": "password", "required": true },
  { "key": "quality", "label": "Calidad", "type": "select", "default": "hd",
    "options": [{ "value": "hd", "label": "Alta" }, { "value": "sd", "label": "Normal" }] },
  { "key": "subs", "label": "Subtítulos", "type": "toggle", "default": true }
]
```

| type | valor | puede ser `required` | puede tener `default` | valor más largo |
| --- | --- | --- | --- | --- |
| `text` | texto | sí | sí | 500 caracteres |
| `url` | texto | sí | no (usa `hint` para un ejemplo) | 2.048 caracteres |
| `password` | texto | sí | sí | 500 caracteres |
| `toggle` | `true` / `false` | no (siempre tiene valor) | sí | — |
| `select` | uno de los valores de `options` | no (siempre tiene valor) | sí | — |
| `list` | una lista de entradas, cada una un objeto con los `fields` de la lista | sí | no | — |
| `section` | ninguno (apiVersion 6) | no (no guarda valor) | no | — |
| `status` | ninguno (apiVersion 6) | no (no guarda valor) | no | — |
| `action` | ninguno (apiVersion 6) | no (no guarda valor) | no | — |

- `key` cumple `^[a-z][a-zA-Z0-9_]{0,31}$` y no se repite; `label` tiene de 1 a 40 caracteres; `hint`
  (el ejemplo que sale debajo del campo), máximo 80.
- `select` necesita `options` (de 1 a 20, cada una con un `value` y un `label` de máximo 40
  caracteres); su `default` tiene que ser uno de los valores. El `default` de un `toggle` es `true` o
  `false`.
- `list` (apiVersion 4) es una lista que la persona arma con un botón "Agregar": cada entrada es una
  línea de texto con un botón "Editar", y el diálogo para agregar o editar muestra los `fields` de la
  lista (de 1 a 4, cada uno con `key`, `label`, un `type` `text` o `url`, y opcionalmente `hint` y
  `required`; sin `default`). `max` (de 1 a 50, 20 por defecto) limita las entradas.
  `kino.config.get(key)` devuelve un arreglo de objetos `{ [field.key]: string }`, sin espacios
  sobrantes y sin las entradas totalmente vacías; una lista vacía es `undefined`. Una lista `required`
  necesita al menos una entrada. Los campos `url` de las entradas se vuelven hosts a los que tu plugin
  puede llegar, igual que un ajuste `url` (así que `hosts` puede ser `[]`).
  ```json
  { "key": "sources", "label": "Direcciones", "type": "list", "max": 30,
    "fields": [ { "key": "url", "label": "Dirección", "type": "url", "required": true },
                { "key": "category", "label": "Categoría", "type": "text" } ] }
  ```
- **Un ajuste `url` no tiene `default`**: un servidor que escribe la persona se vuelve un host al que
  tu plugin puede llegar, así que solo la persona puede escogerlo. Un manifiesto con `default` en un
  ajuste `url` se rechaza; pon una dirección de ejemplo en `hint`.
- **Un ajuste `required` sin valor** frena cualquier llamada a tu plugin antes de que corra: el
  plugin muestra "Falta configurar", no se le piden sus filas de Inicio, y todo lo que la persona abra
  de él dice "Configura &lt;name&gt; en Ajustes ▸ Plugins" con un botón a esa pantalla.
- **Las contraseñas** se guardan cifradas en el dispositivo. Tu código puede leerlas (tiene que
  enviarlas), y por eso la pantalla de consentimiento dice "Este plugin usa tu usuario y contraseña".
  Kino nunca escribe un ajuste en su log; no lo hagas tú tampoco.
- **Cambiar cualquier ajuste** cierra el sandbox de tu plugin y borra sus cookies y sus filas de
  Inicio guardadas, así que la siguiente llamada arranca una sesión nueva con los valores nuevos.
  `kino.storage` **no** se borra: si guardas un token ahí, ponle como clave el usuario y el servidor a
  los que pertenece (el recetario lo hace).
- Desinstalar borra los ajustes, contraseñas incluidas.
- Desde apiVersion 6 el formulario también puede mostrar estados, botones de acción y validar antes de
  guardar, y los ajustes viajan entre los aparatos de la persona: mira
  [Formulario de ajustes](settings-form.md).

## Los servidores propios de la persona { #own-servers }

Un ajuste `url` es la forma en que un plugin habla con un servidor que no está en internet: un
servidor multimedia en la casa, por ejemplo. **El servidor que escribe la persona se vuelve un host
más al que tu plugin puede llegar**, exactamente como se escribió: su esquema (aquí se permite
`http`, porque los servidores caseros casi nunca tienen certificado), su host y su puerto. Nada más de
esa máquina o de esa red se permite, sus redirecciones solo pueden ir al mismo servidor o a tus
`hosts` declarados, y las URL de tus streams y de tus imágenes pueden apuntar a él. La pantalla de
consentimiento avisa "Se conectará a los servidores que escribas en su configuración", y Ajustes
lista a qué llega cada plugin ("Se conectará a: …").

Un plugin que **solo** llega a ese servidor (nunca llama a un sitio propio) declara `"hosts": []`
desde `"apiVersion": 2`, siempre que tenga al menos un ajuste `url`: la pantalla de consentimiento
entonces no lista ningún host, solo la línea sobre los servidores que escribe la persona, y Ajustes
dice "Se conectará solo a los servidores que escribas en su configuración" hasta que se escriba uno.
Un `hosts` vacío sin ajuste `url` se rechaza (`El campo "hosts" solo puede estar vacío si el plugin
tiene un ajuste de tipo "url"`), y con `"apiVersion": 1` se rechaza como siempre. (Kino tampoco
lista nunca un host bajo el dominio reservado `.invalid`, el comodín que usaban manifiestos viejos.)

Solo cuentan el esquema, el host y el puerto: cualquier ruta de ese servidor es alcanzable, y
`kino.config.get` devuelve el valor tal como se escribió. Kino rechaza, con un mensaje debajo del
campo, un valor que no sea una URL `http`/`https`, o cuyo host sea `localhost`, una dirección de
loopback (`127.0.0.1`, `::1`), una link-local (`169.254.x.x`, `fe80::`) o `0.0.0.0`. Las direcciones
de la red de la persona (`192.168.x.x`, `10.x.x.x`, un nombre `.local`) sí se permiten: ese es el
punto.

## Declarar un host inseguro (apiVersion 2) { #insecure-host }

Una entrada de `hosts` también puede ser un objeto, para un sitio tuyo que no tiene certificado:

```json
"hosts": ["archive.org", { "host": "cdn.example.org", "insecureHttp": true }]
```

Esto necesita `"apiVersion": 2`. `insecureHttp: true` es lo único que puede llevar además de `host`,
y marca los únicos hosts *declarados* (no el servidor propio de la persona, de arriba) que se
permiten por `http` plano: `kino.fetch`, la `url` de un `Stream`, sus `subtitles`, sus `audioTracks`
y la `licenseUrl` de un bloque `drm` aceptan `http://cdn.example.org/…` cuando se declara así, y cada
salto de redirección se juzga con la misma regla. Todos los demás hosts declarados siguen siendo solo
https, `https` sigue funcionando en el inseguro, y el host se compara exacto: `sub.cdn.example.org`
no queda cubierto. Siguen aplicando las mismas reglas que para un texto simple (nombre DNS público,
sin `*`, sin IP, nada privado ni de LAN; un nombre que resuelve dentro de la red de la persona igual
se rechaza) más una: **sin comodín `*.`** — un host inseguro se nombra exacto. La pantalla de
consentimiento lo muestra en rojo, "Conexión sin cifrar con cdn.example.org", y una actualización que
marque un host así por primera vez espera aprobación, igual que un host nuevo. Mira
[Un sitio tuyo sin certificado](cookbook.md#insecure-site).

## Descargas (apiVersion 2) { #downloads }

Declara `"download"` en `capabilities` (con `"apiVersion": 2`) y Kino ofrece tus títulos para verlos
sin conexión: "Descargar" en la página de información y "Guardar en el dispositivo" en la biblioteca,
en celulares (Kino nunca descarga en un televisor). No hay nada más que exportar. Cuando la persona
guarda un título, Kino llama a tu `resolve(ref)` en el momento en que la descarga de verdad arranca,
igual que al reproducir, y guarda el `Stream` como **un solo archivo**, con tus `headers` en cada
petición, por el mismo filtro de hosts que el reproductor usa con ese stream: https en tus `hosts` o
el servidor propio de la persona -- o cualquier host público cuando tu manifiesto tiene
[`streamHosts: "any"`](#stream-hosts) o la persona le dio a tu plugin el
[permiso amplio de video](contract.md#broad-video) --, cada salto de redirección revisado, nunca la
red de la casa. Una descarga nunca pregunta por un host. Un servidor que el filtro rechaza termina la
descarga para siempre (sin "Reintentar": no es un problema de red), con una frase que nombra el
servidor; cuando es uno por el que reproducir habría preguntado, la frase dice que reproduzcas el
título una vez para aprobarlo, y después una descarga nueva funciona. Tus `subtitles` se
guardan al lado. Los `audioTracks` **no** se guardan: la copia sin conexión solo tiene el audio que va
dentro del archivo de video, así que una fuente que dobla con pistas aparte se oye con su audio
principal cuando está sin conexión.

Qué se descarga y qué no:

- Un archivo progresivo (`mp4`, `mkv`, `webm`, `ts`, …) se descarga. El archivo guardado toma su
  extensión de tu `mime` cuando lo das, si no de la URL, y si no `mp4`; el reproductor igual mira los
  bytes.
- Un stream HLS bajo demanda (`.m3u8`, un `mime` `mpegurl`, o una respuesta que resulta ser una
  playlist) también se descarga, guardado como un solo archivo: los segmentos MPEG-TS quedan en un
  `.ts` y los fMP4 (`EXT-X-MAP`) en un `.mp4`. De una playlist maestra Kino toma la variante más alta
  hasta 1080p cuyo audio va dentro del video; se manejan las llaves AES-128 y los rangos de bytes, y
  tus `headers` van en las playlists, la llave y cada segmento. En un `EXT-X-DISCONTINUITY` los
  segmentos se guardan tal cual (los tiempos arrancan de nuevo ahí y el reproductor los sigue; adelantar
  justo en el empalme puede caer un poco corrido), salvo que ahí cambie el formato del video o del audio
  (por ejemplo H.264 → HEVC, o una pista que aparece o desaparece): eso se rechaza como abajo. Las
  pistas de metadatos (ID3, SCTE-35, datos privados) no cuentan como cambio, y los mismos formatos que
  llegan con otros números de pista (PID) después del empalme se reescriben con los del primer
  segmento, así que el `.ts` guardado se reproduce hasta el final. Un reintento retoma en el primer
  segmento que falta cuando recibe el mismo contenido (la misma variante, los mismos primeros bytes),
  aunque venga de otro CDN; un contenido distinto arranca de cero.
- El audio (Kino 0.9.54, [ítems `music` y `podcast`](contract.md#music-podcasts) de apiVersion 8):
  los archivos de audio progresivos y el HLS solo de audio también se descargan, y un álbum descargado
  se reproduce sin conexión en el reproductor de audio.
- Lo que no se puede guardar termina como "Este contenido no se puede descargar" ("Este video no se
  puede descargar" hasta Kino 0.9.53), un estado final sin
  "Reintentar" (se negaría igual) que la persona solo puede quitar, y el archivo parcial se borra: un
  manifiesto DASH o Smooth (`.mpd`, `application/dash+xml`, …), una playlist HLS en vivo (sin
  `EXT-X-ENDLIST`), SAMPLE-AES o cualquier llave DRM, una llave que no tiene 16 bytes o que no
  descifra, un segmento vacío (pedido 3 veces antes), una maestra en la que toda variante de video necesita una pista de audio aparte
  (Kino no guarda un video mudo), un stream con DRM y un canal en vivo (un canal en vivo ni siquiera muestra el botón de descarga,
  tampoco en un plugin que declara `channels` y `download` a la vez). Los subtítulos que vienen
  dentro de la playlist no se guardan (tus `subtitles` sí). No hay una llamada aparte de "resolve
  para descargar": si tu fuente ofrece DASH y también un archivo o HLS, prefiere esos, o acepta que
  esos títulos se reproducen pero no se descargan.
- La cola descarga un título a la vez, así que un `ref` puede esperar un rato antes de que se llame a
  `resolve`: guarda en él algo estable y busca el enlace fresco dentro de `resolve` (como se recomienda
  en [Contrato](contract.md#id-and-ref)). Un reintento retoma el archivo parcial aunque tu URL haya
  cambiado. Un `resolve` de la cola que se pasa del tiempo hace fallar solo esa descarga: no cuenta
  para los tres tiempos agotados seguidos que apagan tu plugin ("No responde"); eso solo lo cuentan las
  llamadas hechas para la persona que está en pantalla.
- Un plugin desactivado, esperando sus ajustes o desinstalado no descarga nada: sus títulos no
  muestran el botón de descarga, y un título que ya estaba en cola falla con "Este plugin ya no puede
  descargar videos". Los archivos ya descargados se siguen reproduciendo sin conexión y se pueden
  quitar en Descargas, pase lo que pase después con el plugin.

Declarar `download` muestra "Puede descargar videos para verlos sin conexión" en la hoja de
consentimiento, y una actualización que lo declare por primera vez espera la aprobación de la
persona ([Publicar](publish.md#updates)).
