# Plugins de CloudStream

**Kino 0.9.54.** Kino puede instalar los plugins de un repositorio de
CloudStream sin que nadie escriba un plugin de Kino: cada plugin elegido se convierte, en el
dispositivo, en un plugin de Kino que habla con un **complemento**, una app aparte donde corre el
código de CloudStream. Esta página cuenta cómo los agrega la gente, cómo se traduce cada parte y hasta
dónde llega. Te sirve si mantienes un repositorio de CloudStream, o si quieres saber por qué un plugin
convertido se porta distinto de uno escrito a mano. Para escribir tu propio plugin no necesitas nada de
esto.

## Cómo los agrega la gente { #add }

1. En Ajustes ▸ Plugins, «Agregar plugin», la persona pega la dirección del repositorio: la URL de su
   `repo.json` (un objeto con `pluginLists`) o la de un `plugins.json` (la lista de plugins
   directamente). También valen los enlaces `cloudstreamrepo://…` y `https://cs.repo/?…` con los que
   se comparten los repositorios (Kino los reduce a la URL `https` del JSON) y el
   [código corto](#short-code) del repositorio.
2. La dirección debe ser `https`, en un host público (nunca `http`, una IP local, `localhost` ni un
   nombre de la red de la casa), sin usuario ni contraseña, terminar en `.json` y tener a lo sumo 500
   caracteres. Si no es un repositorio de CloudStream, Kino prueba con Nuvio y con un plugin de Kino,
   como con cualquier dirección pegada.
3. Kino lee el `repo.json` (hasta 1 MB, a lo sumo 10 `pluginLists`, una lista rota no tumba las
   demás) y abre un selector con sus plugins (hasta 2000): nombre, tipos, idioma, versión y autor, con
   filtros por tipo (Película, Serie, Anime, En vivo) y por idioma, y un campo «Buscar por nombre».
   Los instalables van primero, luego los que están **en español** (`es`, cualquier `es-*` o `es_*`, y
   también `mx`, `lat` y `latino`, como los escriben muchos repositorios) y después por nombre.
4. Un plugin que no se puede instalar se ve atenuado con el motivo:
    - **«Usa torrents: Kino no los permite»**: cualquier plugin que declare el tipo `Torrent` entre
      sus `tvTypes`, aunque también liste películas o series. No se instala, no se ofrece como fuente
      y uno ya instalado que empiece a declararlo se apaga con ese motivo en vez de actualizarse.
    - **«Desactivado por su autor»**: `status: 0` en la lista.
    - **«Dirección no válida»**: un `internalName` fuera de `^[A-Za-z0-9._-]{1,64}$` o un `url` que no
      es `https` público.
5. Un plugin marcado `NSFW` en `tvTypes` se instala solo detrás del **código 18+** de la app, como un
   [addon de Stremio para adultos](stremio.md): mientras ese código está bloqueado, el selector no lo
   ofrece, y todo lo que muestra queda marcado 18+.
6. «Agregar» descarga el `.cs3`, se lo pasa al complemento para saber qué fuentes registra, genera el
   plugin de Kino y abre la [hoja de consentimiento](what-people-see.md) de siempre. Cada plugin de
   CloudStream queda como **su propio plugin de Kino**, en Ajustes ▸ Plugins como cualquier otro, y el
   repositorio queda en la lista «Repositorios de CloudStream» con su propio nombre (el `name` del
   `repo.json`). «Quitar» un repositorio pregunta antes y no desinstala sus plugins: siguen ahí y
   siguen actualizándose.

### Con un código corto { #short-code }

En la misma casilla, la persona puede escribir el **código corto** de un repositorio, como en
CloudStream: solo letras, números, `_`, `-` y `!` (a lo sumo 64 caracteres; una dirección nunca es un
código). Un código que empieza con `!` es un enlace de **py.md** (`!abc` es `https://py.md/abc`);
cualquier otro, de **cutt.ly** (`abc` es `https://cutt.ly/abc`).

- Kino le pregunta **una sola vez** al acortador, sin cookies ni credenciales y con 10 s como mucho, y
  **no sigue la redirección**: solo lee a dónde apunta. Ninguna otra página del acortador se abre.
- Ese destino se revisa igual que una dirección pegada a mano (también cuando es un enlace
  `cloudstreamrepo://`): tiene que ser una URL `https` pública, sin usuario ni contraseña, que
  termine en `.json`. Si no, «Ese código lleva a una dirección que Kino no abre: solo repositorios en
  https y fuera de la red local.»
- Antes de leer nada del repositorio, Kino muestra la dirección a la que lleva el código para que la
  persona la confirme: «¿Abrir este repositorio?», «El código «abc» lleva a esta dirección:», la URL y
  «Ábrelo solo si confías en quien te pasó el código.». Solo con «Abrir» sigue como en el paso 3.
- Un código que no existe dice «Ese código no lleva a ningún repositorio de CloudStream. Revisa que
  esté bien escrito.»; sin conexión, o si el acortador falla, «No se pudo consultar el código. Revisa
  tu conexión e intenta de nuevo.».
- Ni el código ni su destino van a los registros.

## El complemento { #complement }

El código de CloudStream **nunca corre dentro de Kino**. Corre en una app aparte, el complemento de
CloudStream, que no tiene permiso de internet: todo lo que un plugin pide a la red lo ejecuta Kino, que
decide qué se permite. La primera vez, Kino ofrece instalarlo («Instalar complemento»): lo descarga por
la persona desde los mismos servidores de sus propias actualizaciones, comprueba que sea la copia de
Kino (paquete, versión, huella sha256 y firma) y el sistema pide permiso para instalarlo. Kino también
avisa cuando hay una versión nueva («Actualizar complemento»).

Si falta, está desactualizado o el instalado no es el de Kino, el reproductor, la búsqueda de fuentes y
la lista de episodios no dicen «no está disponible»: dicen qué pasa («Necesitas el complemento de
CloudStream», «Actualiza el complemento de CloudStream», «El complemento instalado no es el de Kino»)
con un botón que abre la hoja del complemento.

Las peticiones de un plugin de CloudStream:

- van a **cualquier host público por `https`**, en cada salto de redirección (a lo sumo 10); nunca
  `http`, nunca un certificado inválido, nunca la red local. Por eso la hoja de consentimiento lo dice
  en rojo, como un plugin con [`"streamHosts": "any"`](manifest.md#stream-hosts);
- tienen un tope por operación: 250 peticiones, un cuerpo enviado de 1 MB y una respuesta de 5 MB; 15 s
  por petición por omisión, 30 s como mucho;
- no llevan credenciales de un origen a otro;
- si el plugin abre una página oculta (su WebView), es solo durante una llamada que la persona
  empezó, con las mismas reglas del [navegador oculto](browser.md): `https`, nunca la red local.

La dirección del repositorio nunca va a los registros, errores ni telemetría: el id del plugin es un
hash.

## Qué arma la conversión { #conversion }

Cada plugin instalado es un plugin de Kino generado: un manifiesto y un adaptador en JavaScript igual
para todos, cuyas llamadas van a [`kino.cloudstream`](kino-api.md#cloudstream) (que solo tienen estos
plugins generados; uno escrito a mano nunca). El manifiesto generado:

- `id`: `cloudstream-<nombre>-<hash>` (a lo sumo 40 caracteres), estable entre dispositivos, a partir
  del repositorio y del `internalName`.
- `version`: `1.<revisión del convertidor>.<version de la entrada>` (hoy la revisión es 4, así que
  `1.4.N`): cambia cuando cambia la entrada del repositorio o el adaptador de Kino.
- `apiVersion` 8, `"streamHosts": "any"` y las capacidades `search`, `episodes`, `resolve` y
  `download`, más `home` y `browse` si alguna fuente tiene página principal, y `channels` si alguna
  lista `Live`.
- La descripción de la entrada, con «(CloudStream, <host del repositorio>)» al final.

Cómo se traduce cada parte:

| CloudStream | Kino |
| --- | --- |
| `search` de cada fuente | La búsqueda de Kino (una fuente que solo lista `Live` no se pregunta: sus canales se buscan en En vivo). Si una fuente falla, las demás siguen. |
| Página principal (`mainPage`), hasta 12 secciones por fuente | Filas de Inicio y de la sección del plugin. **Cada fila** de una sección es su propia fila con su propio «Ver más», que pagina solo esa fila. Una sección rota no esconde las demás. |
| `load` | La página del título: sinopsis (`plot`), póster, fondo, géneros (`tags`), año, calificación y duración, por [`details`](contract.md#details) para una película y por `episodes().series` para una serie. |
| Ids del título (`imdb`, `tmdb`, `mal`, `anilist`, `kitsu`) | Pasan a Kino, que describe el título con TMDB, AniList y los plugins `meta` de la persona, como cualquier otro. Sin ids, Kino busca el título en TMDB por nombre y año (con [`kino.tmdb`](kino-api.md#tmdb)) y toma un id **solo** si hay una única coincidencia exacta del mismo año. Un título 18+ nunca se busca. |
| Tipos `Movie`, `AnimeMovie`, `Documentary` | `movie` |
| `TvSeries`, `Anime`, `OVA`, `Cartoon`, `AsianDrama`, `Others`, o sin tipo | `series` |
| `Music`, `Audio` | `music` (apiVersion 8, ver [Música y podcasts](contract.md#music-podcasts)) |
| `Podcast`, `AudioBook` | `podcast` |
| `Live` | Canales de En vivo: cada sección de la página principal es una categoría, con páginas y búsqueda. |
| `NSFW` | `movie` marcado 18+, solo en un plugin `NSFW`; cualquier otro plugin lo descarta. |
| Otro tipo | Se descarta. |
| `loadLinks` | El `Stream`: solo direcciones `https` públicas de tipo `VIDEO`, `M3U8` o `DASH` (nunca torrents ni magnets), sin repetidos, ordenadas por calidad (a igual calidad, HLS primero). La primera se reproduce y hasta 8 más quedan como alternativas con su nombre en el menú Servidor. Hasta 20 encabezados por enlace y 30 subtítulos. |

Un título con un solo episodio que se lista como película (un título `NSFW`, una serie mal etiquetada)
reproduce el primero. El adaptador guarda unos minutos la respuesta de `load` de los últimos títulos,
así que la página y el «Reproducir» de justo después cuestan una sola llamada.

## Los ajustes de un plugin { #settings }

Algunos plugins de CloudStream traen su propia pantalla de ajustes (la que en CloudStream abre el
engranaje del plugin). En Kino está en Ajustes ▸ Plugins, «Gestionar» del plugin ▸ **«Ajustes del
plugin»**:

- **Solo en un teléfono o una tableta.** En un televisor la opción no aparece.
- Solo si el complemento dijo, al cargar la versión instalada, que el plugin tiene ajustes, y mientras el
  complemento está listo.
- La pantalla es la del propio plugin: la muestra el complemento encima de Kino, una a la vez («Ya hay
  unos ajustes abiertos»). Al guardar, Kino vuelve a leer lo que muestra de ese plugin.
- Los valores quedan en el almacenamiento del plugin ([`kino.storage`](kino-api.md#storage)), así que
  se sincronizan con los otros aparatos de la persona como el resto de su estado.
- Si algo sale mal, la tarjeta del plugin lo dice: «Los ajustes de este plugin fallaron», «El plugin no
  respondió», «Este plugin no es compatible con el complemento» o «No se pudieron abrir los ajustes.
  Inténtalo de nuevo».

## Límites distintos de un plugin escrito a mano { #limits }

- Las llamadas de listas (`search`, `home`, `browse`, `episodes`, `details`) tienen **45 s**
  (`timeoutsMs.cloudstreamList` en `contract.json`) en vez de los 15 o 20 s de siempre: pasan por el
  complemento, que puede arrancar en frío, y después por el sitio.
- El `.cs3` se descarga hasta 20 MB y, si el repositorio publica `fileHash`
  (`sha256-<64 hex>`), tiene que coincidir: si no, «El archivo del plugin no coincide con el del
  repositorio».
- Un plugin que el complemento no puede cargar, o que no trae ninguna fuente que Kino pueda usar, no se
  instala, y no queda nada a medias.

## Actualizaciones { #updates }

Kino vuelve a leer el repositorio en cada revisión de actualizaciones. Si la entrada tiene la misma
`version`, el mismo `fileHash` (cuando lo hay) y el convertidor es el mismo, no hay nada que hacer;
si no, se repite toda la instalación con el `.cs3` nuevo y se aplica, o espera la aprobación de la
persona cuando pide más, como cualquier [actualización](publish.md#updates). Además:

- `status: 0` apaga el plugin instalado con «Desactivado por su autor».
- Una entrada que empieza a declarar `Torrent` lo apaga con «Usa torrents: Kino no los permite»;
  nunca se actualiza a ella.
- Si el repositorio ya no lista el plugin (o no se puede leer), la versión instalada sigue funcionando
  con el adaptador con que se instaló.

## En los otros aparatos de la persona { #sync }

La lista de repositorios y los plugins instalados se sincronizan en las dos vías, como cualquier
plugin. Lo que no viaja es el archivo: **cada aparato baja su propia copia del `.cs3`** desde el
repositorio, y el aparato que lo recibe espera a tener el complemento para instalarlo.

## Para quienes mantienen un repositorio de CloudStream { #maintainers }

- Publica todo por `https` en un host público: el `repo.json`, cada `plugins.json`, cada `.cs3` y su
  `iconUrl`. Nada de eso puede estar en `http` ni en una IP local.
- Declara `tvTypes` con honestidad: Kino los usa para filtrar, para decidir qué va a Inicio y qué a
  En vivo, y para rechazar. Un solo `Torrent` deja fuera **todo** el plugin, aunque también tenga
  películas o series; `NSFW` lo pone detrás del código 18+.
- Pon el `language` del plugin: el selector filtra por idioma y lleva el español arriba
  (`es`, `es-MX`, `es-419`, `mx`, `lat` o `latino` cuentan como español).
- Publica `fileHash` (`sha256-…`) y sube `version` en cada cambio: es lo que Kino compara para
  encontrar una actualización.
- Si puedes, da los ids del título en `load` (IMDb, TMDB, MAL, AniList, Kitsu): con ellos Kino muestra
  la sinopsis, el reparto y la calificación de TMDB y AniList sin adivinar.
- Devuelve enlaces `VIDEO`, `M3U8` o `DASH` con `quality` y un `name` claro: es su etiqueta en el
  menú Servidor.
- Usa `status: 0` para retirar un plugin: se apaga en los aparatos donde ya está instalado.
- Puedes publicar un [código corto](#short-code) de cutt.ly (o de py.md, que se escribe con `!` al
  principio) para tu repositorio: la redirección tiene que llevar **directo** a la URL `https` de tu
  `repo.json` (o a un enlace `cloudstreamrepo://`), porque Kino no sigue una segunda redirección del
  acortador.
- Si tu plugin tiene pantalla de ajustes, la gente la abre en Kino desde un teléfono o una tableta,
  nunca desde un televisor: que el plugin funcione con sus valores por omisión.
