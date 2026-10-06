# Addons de Stremio

Kino puede instalar un addon de Stremio sin que nadie escriba un plugin de Kino: lee el
`manifest.json` del addon y genera, en el dispositivo, un plugin de Kino que habla con el servidor del
addon. Esta página cuenta cómo lo agrega la gente, cómo se traduce cada recurso de Stremio, qué se
rechaza y hasta dónde llega. Te sirve si mantienes un addon y quieres que funcione bien en Kino, o si
quieres saber por qué un addon se porta distinto de un plugin escrito a mano. Para escribir tu propio
plugin no necesitas nada de esto.

## Cómo lo agrega la gente { #add }

1. En Kino, Ajustes ▸ Plugins (en el televisor también con el botón "Plugins" de Inicio), "Agregar
   plugin", tipo **Stremio**, y se pega la URL del `manifest.json` ("Pega la URL del manifest.json del
   addon de Stremio (o de una colección de addons)"). Si la dirección es claramente de un addon, Kino
   escoge el tipo solo.
2. La dirección se normaliza como lo hace Stremio: `stremio://` es `https://`, una dirección sin
   `manifest.json` al final lo recibe, y un nombre público con `http` pasa a `https`. `http` solo se
   conserva para la red de la persona (una IP, un nombre de una sola parte, `.local`/`.lan`), así que
   un addon en su propio servidor de la casa se agrega escribiendo su dirección. `localhost`, las
   direcciones de loopback y link-local se rechazan, y también una ruta con `.`, `..` o barras
   codificadas.
3. Una dirección en `github.com` o `raw.githubusercontent.com` se lee como un repositorio de GitHub
   (un plugin de Kino o un repositorio de Nuvio), nunca como un addon. Sirve tu `manifest.json` desde
   tu propio dominio.
4. Un enlace `stremio://…/manifest.json` que la persona toca (el botón "Install" de una página de
   addons) abre Kino en Plugins ▸ Agregar con la dirección escrita; Kino no lee nada hasta que la persona
   toca "Agregar", y un enlace solo puede nombrar un host público. En Android 12 y posteriores un enlace
   `https://…/manifest.json` se abre en el navegador (Android solo le da un enlace web a la app que
   verificó ese dominio), así que comparte el enlace `stremio://` o la dirección para pegar.
5. Kino lee el manifiesto, genera el plugin y abre la [hoja de consentimiento](what-people-see.md) de
   siempre. Nada del addon se usa antes de que la persona acepte.

La dirección completa (que muchas veces lleva la configuración del addon, por ejemplo una clave de
debrid) nunca se escribe en el plugin generado ni en los registros: queda en dos ajustes del plugin,
"Servidor del addon" (`addonUrl`, el servidor) y "Configuración del addon" (`addonPath`, el resto de la
ruta, guardado como contraseña en el Keystore). La hoja de consentimiento lo dice: "Guarda la
configuración del addon (puede incluir tu clave) solo en tus aparatos". Esa parte puede tener máximo
2.048 caracteres ("La configuración de ese addon es demasiado larga para guardarla en Kino").

<span id="detail-links"></span>**Enlaces a un título.** Desde Kino 0.9.51 un enlace *detail* de Stremio
abre el título en Kino en vez de ignorarse: `stremio:///detail/movie/<imdb>` o
`stremio:///detail/series/<imdb>[/<imdb>:<temporada>:<capítulo>]` (el "Open in Stremio" de un servicio
de seguimiento, como el de Seenr). Kino encuentra el título con TMDB y abre sus fuentes -- la pantalla
que abre una tarjeta de Inicio, en celular y TV; un capítulo abre su serie. Solo se acepta un id de IMDb
(`tt` y de 5 a 10 dígitos); otro tipo o id, un segmento de más, una consulta o un enlace de más de 200
caracteres se ignora, y un título que TMDB no conoce muestra "No encontré ese título". Los enlaces de
addons (`stremio://…/manifest.json`) funcionan como antes.

## Qué arma la conversión { #conversion }

- Un plugin por addon, con id `stremio-<nombre>-<hash>`: el mismo en todos los aparatos para la misma
  dirección. En Plugins lleva la insignia "Stremio".
- `version` `1.<revisión del convertidor>.0` (hoy `1.10.0`), `apiVersion` 4, o 6 cuando el addon usa
  algo de 6 (búsqueda dentro de una fila, `meta`, contenido +18).
- `hosts`: `api.themoviedb.org` (Kino usa TMDB para pasar de un id de TMDB a uno de IMDb) y los hosts a
  los que **redirigen tus catálogos** ([abajo](#redirects)). El servidor del addon no es un host
  declarado: se llega a él como a un servidor que la persona escribió.
- `"streamHosts": "any"` (y `"liveStreamHosts": "any"` si tiene canales): tu video puede estar en
  cualquier servidor público. La hoja muestra en rojo "Puede reproducir video desde cualquier servidor
  que indique".
- `download` cuando el addon reproduce películas o series, así que en el celular se pueden descargar
  ([Descargas](manifest.md#downloads)); los canales en vivo nunca.
- El `logo` del addon es el ícono del plugin (máximo 128 KB, leído en 5 s; uno que no es PNG se
  convierte, o se deja por fuera).
- La descripción la arma Kino: "Addon de Stremio. Ofrece: catálogo, streams, subtítulos, canales en
  vivo." según lo que tengas.

### Chips de categoría { #categories }

En la tienda de plugins (Instalados, Recomendados, una colección) cada addon cae en los chips de
categoría según lo que declara su manifiesto: un addon con `stream` va a **Películas** (`movie`, o si no
dice nada), **Series** (`series`), **Anime** (`anime`, o ids `kitsu`, `mal`, `anilist`, `anidb`), **En
vivo** (`tv`, `channel`) y **Radio** (`radio`, o un catálogo `music` de radio); un addon sin `stream`
(listas, `meta`, colecciones) va a **Utilidades** (y a Anime si es de anime); `subtitles` suma
**Subtítulos** y `adult` suma **+18**. Declara bien tus `types` e `idPrefixes`: de ahí salen.

Los Recomendados de Kino nunca sugieren un addon que reproduce video (con `stream`), salvo unos pocos
canales gratis y legales revisados a mano ("Gratis y legal"). La gente agrega el tuyo con su dirección.

## Cómo se traduce cada recurso { #resources }

| Recurso de Stremio | En Kino |
| --- | --- |
| `catalog` de `movie`, `series`, `anime` u otro tipo | Filas de Inicio con su "Ver más" (las 20 primeras, 60 títulos por fila), con el tipo en el título: "Popular · Películas", "Popular · Series". |
| `catalog` de `tv`, `channel`, `radio` (o `music` con "radio" en su id o nombre) | Categorías de canales en En vivo (máximo 200), 500 canales por página. Un `radio` sin "radio" en el nombre se muestra como "… · Radio". |
| `catalog` con el extra `search` | La búsqueda escrita (hasta 3 catálogos, 100 resultados) y la búsqueda dentro del "Ver más" de esa fila. Uno de `tv`/`channel` responde la búsqueda de En vivo (hasta 3). |
| `catalog` con `search` obligatorio | Solo búsqueda, nunca fila. |
| `catalog` con otro extra obligatorio (`genre`…) | Se omite: Kino no sabe qué valor mandar. Un `genre` opcional nunca se manda. |
| extra `skip` | Paginación de "Ver más" y de los canales ([abajo](#paging)). |
| `meta` | Ficha y capítulos de tus títulos; además describe títulos de otras fuentes cuando TMDB y AniList no tienen nada ([abajo](#meta)). |
| `stream` | Lo que se reproduce ([Streams](#streams)). |
| `subtitles` | Subtítulos del video y la "Buscar subtítulos en línea" del reproductor ([Subtítulos](#subtitles)). |
| `addon_catalog` | Una colección de addons ([abajo](#collections)). |

Un addon reproduce **exactamente donde Stremio le preguntaría**: los `types` y los `idPrefixes` de su
recurso `stream` (los del objeto del recurso, si no los del manifiesto). Un id o un tipo por fuera nunca
se le pregunta (un `kitsu:` a un addon que solo acepta `tt`). Kino ve el anime como series, y un addon
que solo declara `anime` (o solo `series`) recibe la petición con su propia palabra.

### Ids e identificación { #ids }

Kino reconoce un título por su id de IMDb (`tt…`) y, si lo das, por el de TMDB (`moviedb_id`, como en
Cinemeta). Con eso tu título se junta con el mismo título de otras fuentes, recibe la ficha de TMDB y
puede buscar subtítulos. Un título que la persona abre desde la ficha de TMDB se le pide a tu addon
como `tt…` (o `tt…:temporada:capítulo`), así que **declara `tt` en los `idPrefixes` de `stream`** si
quieres que te pregunten por los títulos de las demás fuentes. Antes de ofrecer tu addon en esa
búsqueda, Kino confirma que tienes el título con una petición a tu `/stream` (máximo 3 títulos por
búsqueda).

### Búsqueda { #search }

- **Búsqueda escrita**: tus catálogos con `search`. Si no tienes ninguno (o no devuelven nada), Kino
  busca el texto en TMDB y ofrece solo lo que tu `stream` puede reproducir por id de IMDb.
- **Ficha de un título** ("Ver otras fuentes"): solo si tu `stream` acepta ids de IMDb para ese tipo.
  Un addon solo de catálogo (Cinemeta, Kitsu) o solo de canales no responde aquí.
- **Dentro de un "Ver más"**: si el catálogo de esa fila acepta `search`, la búsqueda se le hace a tu
  addon con `search=…` y se pagina con `skip`.

### Paginación { #paging }

Kino pide `/catalog/<tipo>/<id>/skip=N.json` con N = cuántos títulos ya mostró (máximo 100 por página).
Para cuando una página llega vacía, cuando un `skip` distinto devuelve exactamente la misma página (un
addon que ignora `skip`) o pasados 20.000 títulos.

### `meta` { #meta }

Con `meta`, los títulos de tu catálogo tienen ficha y capítulos (`videos` con `season` y `episode`
mayores que 0; temporadas hasta 999). Un addon que tiene `meta` también **describe títulos de otras
fuentes** (la capacidad [`meta`](contract.md#meta)): cuando TMDB y AniList dejan algo vacío en una
ficha, Kino te pregunta con el id que cubre tu recurso `meta` (`tt…`, `tmdb:`, `kitsu:`, `mal:`,
`anilist:`). Un addon que solo tiene `meta` sirve para eso y se instala igual. Desde Kino 0.9.51 el
`logo` de un meta, su nota de IMDb (`imdbRating`, o el nombre de su enlace `imdb`, donde lo ponen los
addons al estilo de AIOMetadata) y su reparto (`app_extras.cast`, si no `cast`, si no sus enlaces
`Cast`) pasan a ser el [logo, las notas y el reparto](contract.md#meta) de la ficha.

### Canales en vivo { #live }

Un catálogo `tv`, `channel` o `radio` es una categoría de En vivo; cada `meta` es un canal (su `logo`,
o su `poster`). Se reproduce con el reproductor en vivo, sin barra de progreso ni descarga. No hay guía
de programación. Si una página de canales falla, la persona ve "No pude cargar los canales de este
addon".

## Streams { #streams }

Kino reproduce **solo enlaces directos `http(s)`** en el campo `url`. Se descartan los streams con
`infoHash` (P2P/torrent), `nzbUrl` (Usenet), `rarUrls`, `zipUrls`, `tgzUrls`, `tarUrls`, `servers`,
`ytId` (YouTube) y `externalUrl`.

De los que quedan, Kino ordena del mejor al peor: primero los que no tienen
`behaviorHints.notWebReady`; luego por la resolución que dice tu `name`, `title` o `description` (1080p,
720p, sin etiqueta y 2160p/4K de último, porque la mayoría de aparatos no lo decodifica); dentro de cada
nivel ganan los enlaces `.m3u8`/`.mp4`, se evita HEVC con audio DTS/Dolby y se prefiere 8 bits a 10
bits (Hi10P). Los empates conservan tu orden, así que **pon primero tu mejor stream**. La dirección
nunca cuenta como evidencia: solo lo que el stream dice de sí mismo.

- **Copias y cambio automático.** El mejor se reproduce y hasta 8 más quedan como
  [`alternatives`](contract.md#stream): si uno no se puede reproducir en el aparato, Kino pasa solo al
  siguiente. En el menú **Servidor** del reproductor aparecen como "Opción 1", "Opción 2"…: Kino no usa
  el `name` ni el `title` del stream como etiqueta.
- **Encabezados.** `behaviorHints.proxyHeaders.request` se manda con el video (máximo 20 encabezados,
  solo valores de texto). `proxyHeaders.response` se ignora.
- **`notWebReady`** no se rechaza: Kino no necesita un servidor de streaming para reproducirlo, solo lo
  pone de último.
- **Tipo.** Una dirección que termina en `.m3u8` es HLS y una en `.mpd` es DASH; lo demás lo detecta
  el reproductor.
- **Tiempo.** Tu `/stream` tiene 20 s, y el `resolve` del plugin generado tiene 75 s en total (como un
  [scraper de Nuvio](nuvio.md#limits)), contando la conversión de TMDB a IMDb y los subtítulos.

## Subtítulos { #subtitles }

Los `subtitles` de un stream y los de tu recurso `subtitles` (pedido con 5 s, solo para películas y
capítulos) se juntan: máximo 30, uno por dirección, con su idioma de tres letras pasado a dos (`spa` →
`es`). Un archivo `.vtt` o `.srt` se marca con su formato.

Un addon con `subtitles` también responde la **"Buscar subtítulos en línea"** del reproductor para
cualquier título que Kino conozca por IMDb o TMDB, de cualquier fuente
([subtítulos para cualquier título](contract.md#subtitles)): primero los idiomas de la persona, con el
nombre de la versión (`movieReleaseName` o `subtitleFileName`). Desde Kino 0.9.51 el pedido lleva
lo que Kino sabe del archivo que suena como los extras propios de Stremio,
`/subtitles/{type}/{id}/videoHash=…&videoSize=…&filename=….json` (cada uno solo cuando se conoce,
codificado para URL; `videoSize=0` junto a un `filename` cuyo tamaño no se conoce; nunca la URL del
video), para que el addon ponga primero la versión exacta; sin nada conocido la ruta queda la de
siempre. Un addon que **solo** tiene
`subtitles` (OpenSubtitles v3) se instala como proveedor de subtítulos: no aparece en Inicio, en la
búsqueda ni en En vivo, y su hoja dice "Agrega subtítulos a tus películas y series".

Un traductor (su nombre o descripción dice "translat" o "traduc", o el idioma trae la marca `gt`, como
`esgt` de GTSubs) muestra sus pistas de su propio servidor como "Español (traducido)". Las pistas de
aviso `info:` de GTSubs se saltan. Un traductor se instala con su dirección ya configurada (la que da su
página de configuración, con el idioma en la ruta).

## Lo que Kino rechaza { #refused }

| Qué | Lo que lee la persona |
| --- | --- |
| Un addon de **torrents o P2P**: `behaviorHints.p2p`, o "torrent", "magnet" o "p2p" en su id, nombre o descripción (desde Kino 0.9.51 una descripción que los nombra solo para negarlos, "no incluye streams, torrents ni contenido P2P", no cuenta; el id y el nombre siguen estrictos). **También con debrid.** | "Kino no admite addons de torrents, ni siquiera con debrid" |
| Un manifiesto sin `id` o `name`, o que no es JSON | "Esto no es un addon de Stremio (no encontré su manifest.json)" |
| Un addon sin `catalog`, `meta`, `stream` ni `subtitles` | "Este addon no ofrece nada que Kino pueda usar" |
| Una dirección que no es la de un addon | "Esa dirección no es la de un addon de Stremio" |
| Un manifiesto de más de 256 KB | "La respuesta del addon es demasiado grande: no parece un addon de Stremio" |
| Una redirección a este mismo aparato | "El addon redirige a una dirección de este mismo aparato, y Kino no la sigue" |

Kino nunca reproduce P2P, no tiene cliente BitTorrent ni servidor de streaming local, y no corre ningún
servidor en el aparato: lo que tu addon solo puede entregar a través del servidor de streaming de
Stremio no funciona aquí. Un addon de torrents instalado antes de esta regla se apaga en su siguiente
revisión de actualizaciones y queda en Instalados para que la persona lo quite. Si un título solo tiene
enlaces P2P, el reproductor dice "<addon> solo tiene enlaces P2P de este título".

## Addons configurables { #configurable }

- **`behaviorHints.configurationRequired`**: Kino no lo instala desde su dirección sin configurar ("…
  necesita configurarse en su página antes de instalarlo") y ofrece "Configurar en su página", que abre
  `<dirección>/configure` en el navegador **del celular**. El botón "Install" de esa página devuelve un
  enlace `stremio://` con la dirección configurada, que llena "Agregar" y se instala normal. El
  televisor no abre la página: le dice a la persona que lo haga desde el celular, y la configuración
  le llega por la sincronización.
- **`behaviorHints.configurable`** (o una dirección que ya trae configuración): el plugin instalado
  ofrece "Reconfigurar", que abre la misma página con las opciones actuales. Si la persona instala el
  mismo addon del mismo servidor con otra configuración, Kino actualiza ese plugin en vez de crear otro
  (salvo que tenga dos configuraciones instaladas, o que la nueva dirección venga sin configuración y la
  vieja tenga una: eso nunca borra su clave).
- Para que esto funcione, **tu página de configuración debe terminar en un enlace
  `stremio://…/manifest.json`** con la configuración en la ruta, como lo espera Stremio.
- **Una llave de TMDB en la configuración** (Kino 0.9.53): cuando la configuración trae un campo cuyo nombre contiene
  "tmdb" con una llave de TMDB (una v3 de 32 caracteres o un token de lectura v4; en texto, JSON, base64 o codificada
  en la URL), Kino le ofrece a la persona, una sola vez, usarla para [`kino.tmdb`](kino-api.md#tmdb) ("Usar la llave
  de TMDB de tu addon <nombre>"). Solo si dice que sí, y la llave nunca sale del aparato salvo hacia TMDB. Una
  configuración guardada en tu servidor (solo un id opaco en la dirección) simplemente no se encuentra.

## Addons +18 { #adult }

Un addon con `behaviorHints.adult` se instala detrás del **código de 18+** de la persona (el mismo de
Ajustes): Kino lo pide antes de la hoja de consentimiento, que dice "Contenido para adultos (+18)". Todo
lo que da el addon queda marcado +18 ([contenido +18](contract.md#adult)): se muestra solo mientras el
código está desbloqueado en ese aparato. Mientras está bloqueado, el plugin no aparece en Plugins, en
los filtros de búsqueda ni en las ofertas de los otros aparatos. Si tu addon es para adultos, **declara
`adult`**: un addon que no lo dice se muestra como cualquier otro.

## Colecciones { #collections }

Un addon cuyo único uso es listar otros addons (`addon_catalog`, sin `catalog`, `meta` ni `stream`) es
una colección: no se instala ("… es una colección de addons: elige cuáles agregar"). Kino la guarda en
"Tus colecciones de Stremio" y muestra sus addons como tarjetas, con las mismas reglas de arriba: los de
P2P, los que no ofrecen nada y los +18 con el código bloqueado no aparecen. Cada addon se instala con
su propia hoja. Una colección se lee solo en direcciones `https` públicas y sin configuración en la
ruta; máximo 20 listas por colección y 300 addons por lista. Kino no trae ni agrega ninguna colección
por su cuenta.

## Redirecciones de los catálogos { #redirects }

Algunos addons responden sus catálogos con una redirección a otro servidor (Cinemeta los manda a
`cinemeta-catalogs.strem.io`), y un plugin solo puede seguir una redirección desde el servidor de la
persona hacia ese mismo servidor o hacia un host declarado. Por eso, al instalar, Kino prueba las
direcciones de catálogo que va a usar (la primera página de cada fila y una posterior, cada catálogo de
búsqueda, cada categoría en vivo: máximo 30, unos 10 s en total) y declara cada host público `https` al
que redirigen; la persona los ve en la hoja de consentimiento. Una redirección a una dirección local o
por `http` nunca se declara.

Solo se descubren las redirecciones de los **catálogos**. Si tu `/meta`, `/stream` o `/subtitles`
redirige a otro host, esa petición falla: responde esos recursos desde el servidor del addon (el
video en sí puede estar en cualquier host público).

## Qué se sincroniza { #sync }

El plugin generado y sus ajustes van y vienen entre los aparatos conectados de la persona
([sincronización](what-people-see.md#sync)): el servidor viaja en la fila de sincronización y la parte
con la configuración viaja sellada de punta a punta. El otro aparato vuelve a leer el addon por su
cuenta y genera el mismo plugin. "Tus colecciones de Stremio" también se sincronizan, y quitar una la
quita en los dos. Así, la persona configura en el celular y el TV recibe el addon listo, y "Ver en el
TV" reproduce un título del addon con la copia del propio TV.

## Actualizaciones { #updates }

La versión solo cambia con el convertidor de Kino. "Buscar actualización" (y la revisión en segundo
plano) vuelve a leer el addon en la dirección guardada, repite la prueba de redirecciones, regenera el
plugin y lo compara con el instalado: un cambio que solo toca lo que ya estaba aprobado se instala
solo; uno que agrega hosts, canales o descargas espera la aprobación de la persona. Si la dirección
ahora es de otro addon ("La dirección ahora es de otro addon") o ya no se puede leer, el plugin
instalado sigue como estaba.

## Límites { #limits }

| Qué | Límite |
| --- | --- |
| Leer `manifest.json` | 256 KB, 15 s en total, máximo 5 redirecciones |
| Catálogos que se conservan | 200 (además, si el script generado pasa de 1 MB, se quitan los últimos y la descripción dice "Aviso: el addon tiene demasiados catálogos; N quedaron fuera.") |
| Filas de Inicio | 20 catálogos, 60 títulos cada una |
| Una página de "Ver más" | 100 títulos; hasta `skip` 20.000 |
| Petición a tu catálogo o tu `meta` | 12 s (6 s al describir títulos de otras fuentes) |
| Petición a tu `/stream` | 20 s; `resolve` completo 75 s |
| Petición a tu `/subtitles` | 5 s |
| Respuesta | 5 MB por petición, 60 peticiones por llamada ([límites del motor](engine-limits.md#limits)) |
| Streams usados | el mejor + 8 alternativas |
| Subtítulos | 30 |
| Hosts de redirección declarados | 20 |

## Cuando algo falla { #troubleshooting }

| Lo que ve la persona | Qué pasa |
| --- | --- |
| "No encontré el addon en esa dirección" | `manifest.json` respondió 404. |
| "El addon tardó demasiado en responder. Intenta de nuevo en un rato." | El manifiesto no llegó en 15 s. |
| "No pude conectarme con el addon. Revisa la dirección y tu conexión." | El nombre no resuelve o el servidor no contesta. |
| "El servidor del addon respondió con un error (N)…" | Un estado de error al leer el manifiesto. |
| "<addon> solo trae el catálogo. Busca este título en tus otras fuentes." | El addon no tiene `stream`: es solo catálogo. |
| "<addon> no reproduce este título. Búscalo en tus otras fuentes." | El tipo o el id del título está por fuera de los `types`/`idPrefixes` de tu `stream`. |
| "Esta fuente ya no tiene este título (<addon>)" | Tu `/stream` respondió una lista vacía, o nada reproducible. |
| "<addon> solo tiene enlaces P2P de este título" | Todos los streams eran P2P. |
| "Falta la dirección del addon: escríbela en Configurar" | Al buscar actualización, el ajuste "Servidor del addon" está vacío. |

**Diagnóstico:** el interruptor de modo debug de cada plugin, también los de Stremio, y la página
Registro están en [Registro y telemetría](diagnostics.md). El plugin generado escribe en el registro
solo conteos (cuántos streams llegaron, cuántos eran P2P, cuántos se pueden reproducir) y el host de una
redirección no aprobada, nunca tu dirección ni tus enlaces.

## Cuándo escribir un plugin de Kino { #native }

Un addon de Stremio funciona sin escribir nada, pero un [plugin de Kino](first-plugin.md) puede más:

- **Copias con nombre y perezosas**: "Latino · Servidor 1" en el menú Servidor, y copias que se
  resuelven solo cuando la persona las escoge ([copias con etiqueta](contract.md#lazy-copies)).
- **Su propio formulario de ajustes** dentro de Kino, con estado y acciones, en vez de una página web
  externa ([formulario de ajustes](settings-form.md)).
- **Streams firmados por petición** y cambio de servidor cuando un token vence
  ([firma por petición](signed-streams.md)).
- **El navegador oculto**, para servidores que arman el video con scripts ([navegador oculto](browser.md)).
- **Canales en vivo con guía**, listas M3U/XMLTV y búsqueda en vivo ([canales en vivo](live-channels.md)).
- **Una sección propia, categorías y colores** ([sección, categorías y colores](section-theme.md)),
  Widevine ([recetario](cookbook.md#widevine)), `Stream.skip` para saltar intro, tus propias frases de
  error ([`userMessage`](contract.md#user-message)), sesiones con `kino.storage` y `kino.cookies`.
- **Firma de autor** y aparecer en "De la comunidad" ([plugins firmados](signed.md),
  [aparecer en Kino](listed.md)).
