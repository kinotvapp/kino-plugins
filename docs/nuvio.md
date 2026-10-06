# Scrapers de Nuvio

Kino puede instalar los scrapers de un repositorio de proveedores de Nuvio sin que nadie escriba un
plugin de Kino: convierte el scraper elegido en un plugin de Kino en el dispositivo, al instalarlo.
Esta página cuenta cómo los agrega la gente, qué hace la conversión y hasta dónde llega. No necesitas
nada de esto para escribir tu propio plugin; te sirve si mantienes un repositorio de Nuvio, o si
quieres saber por qué un plugin convertido se porta distinto de uno escrito a mano.

## Cómo los agrega la gente { #add }

1. En Kino, Ajustes ▸ Plugins (en el televisor también se llega con el botón "Plugins" de Inicio),
   "Agregar plugin", y se escribe la dirección del repositorio, `owner/repo`, igual que para un
   plugin de Kino. La dirección pegada también puede ser una URL `github.com/owner/repo`, una
   `/tree/<ref>/<carpeta>`, o una URL `raw.githubusercontent.com/owner/repo/<ref>/.../manifest.json`
   (también `github.com/.../blob/...` o `/raw/...` hacia un archivo `.json`): Kino toma la carpeta
   donde está ese archivo. Cualquier otro archivo se rechaza.
2. Kino lee `manifest.json` en la raíz del repositorio. Si está en el formato propio de Nuvio (un
   objeto con un arreglo `scrapers`), la dirección es un repositorio de Nuvio; si no, Kino la trata
   como un plugin de Kino (`kino-plugin.json`). Si la rama principal tiene un `manifest.json` que no
   está en ese formato (algunos repositorios guardan ahí una plantilla), Kino prueba también la rama
   `main` y luego la `master`. El repositorio no tiene que estar en GitHub: mira
   [Dónde puede estar el repositorio](#where).
3. Un selector a pantalla completa lista **todos** los scrapers del manifiesto, con su logo, tipos,
   idioma, versión y autor, y filtra por tipo (Todas, Películas, Series, Anime) y por idioma. Cada
   tarjeta dice "Agregar", "Instalado" o "No disponible" (un scraper que el manifiesto desactiva, o
   desactiva en Android) o "No compatible" (un scraper de fuentes P2P, con o sin debrid: "Kino no admite
   scrapers de torrents, ni siquiera con debrid", desde Kino 0.9.51). Un repositorio sin nada instalable
   dice "Este repositorio de Nuvio no tiene scrapers instalables en Android".
4. "Agregar" convierte ese scraper y abre la [hoja de consentimiento](what-people-see.md) de siempre;
   después de "Instalar" el selector sigue abierto para agregar otro. Cada scraper queda como su
   propio plugin, listado en Ajustes ▸ Plugins como cualquier otro.

El selector avisa que los scrapers se convierten desde Nuvio y que su código original tiene licencia
GPL-3.0; la descripción del plugin dice lo mismo ("Convertido desde el plugin de Nuvio …; código
original GPL-3.0").

### Dónde puede estar el repositorio (Kino 0.9.53) { #where }

- **En GitHub**: `owner/repo`, una página de github.com, o su `manifest.json` en
  raw.githubusercontent.com o en jsDelivr (`/gh/`). El `filename` de cada scraper es una ruta dentro
  del repositorio, que se lee de raw.githubusercontent.com.
- **En cualquier servidor público por https** (desde Kino 0.9.53): pega la URL de su `manifest.json`.
  Una URL pegada se lee una sola vez y se juzga por lo que contiene, en la pestaña que sea: una lista
  `scrapers` (entradas con `id` y `filename`) es un repositorio de Nuvio, `resources` es un addon de
  Stremio, si tiene las dos se abre lo que diga la pestaña elegida, y si no tiene ninguna se rechaza.
  La dirección debe ser `https` con un nombre público: `http`, una dirección IP, `localhost`, un nombre
  local (`.local`, `.lan`…) o un nombre que apunta a la red de la persona se rechazan, y también las
  credenciales dentro de la URL. El manifiesto pesa como máximo 256 KiB.
- **Archivos de los scrapers**: un `filename` relativo se resuelve contra la URL del manifiesto; uno
  absoluto `https://` puede estar en otro servidor público (un CDN), con las mismas reglas. Los
  `filename` `http://`, de un servidor local, `/relativos-a-la-raíz`, `//relativos-al-protocolo` o con
  `../` se rechazan con un mensaje que dice por qué. Los archivos hermanos de un scraper se leen del
  servidor donde está su propio archivo.

Kino 0.9.52 y anteriores solo leen repositorios en GitHub.

## Qué arma la conversión { #conversion }

El JavaScript del scraper se conserva byte por byte, envuelto con una capa de compatibilidad y un
pequeño adaptador, y se instala con un manifiesto generado:

- `apiVersion` 6 (4 antes de Kino 0.9.51), `version` `1.<revisión del convertidor>.0` (hoy `1.4.0`,
  mira [Actualizaciones](#updates)), capacidades `search`, `episodes`, `resolve` y `download`.
- Los `settings` del plugin, cuando el scraper tiene `onSettings` (Kino 0.9.51): ver
  [Ajustes del scraper](#settings).
- Los tipos que sirve el scraper salen de su `supportedTypes`, con las formas de escribirlos más
  comunes unificadas: `movie`, `movies`, `film`, `films` son películas; `tv`, `series`, `show`,
  `shows` son series; `anime` es anime (sin importar mayúsculas). Un scraper que declara
  `["movie", "series"]` también sirve series.
- `hosts`: se detectan solos en el código del scraper (y en una lista remota de dominios que nombre,
  si la tiene), siempre con `api.themoviedb.org` de primero. Un manifiesto admite máximo 20: si hay
  más, van primero las direcciones que parecen del propio sitio del scraper, y la descripción avisa
  "se detectaron más de 20 dominios; algunos quedaron fuera". Un scraper cuyo código no nombra ningún
  dominio no se puede convertir ("No encontré ningún dominio en el código de …").
- `"streamHosts": "any"`: sus películas y episodios se pueden reproducir desde cualquier servidor
  público ([la regla](manifest.md#stream-hosts)).
- `"fetchHosts": "any"`: su `kino.fetch` puede llegar a cualquier servidor **público**, sin una
  pregunta por cada host. Los nombres locales, las direcciones privadas, de loopback y link-local, y
  los nombres que resuelven dentro de la red de la casa siguen rechazados, en cada salto de
  redirección. Este campo se respeta **solo** en estas instalaciones convertidas; en un plugin escrito
  a mano no hace nada ([por qué](manifest.md#stream-hosts)).

Por eso la hoja de consentimiento de un scraper convertido muestra, en rojo, "Puede reproducir video
desde cualquier servidor que indique" y "Puede conectarse a cualquier servidor de internet", además de
"Puede descargar videos para verlos sin conexión". Nada de él corre antes de que la persona acepte.

## Cómo se porta un scraper convertido { #behavior }

Los scrapers de Nuvio no tienen catálogo ni búsqueda por texto: solo responden "streams para este id
de TMDB". Así que el adaptador trabaja desde TMDB:

- **Sin filas de Inicio.** El plugin aparece en los resultados de búsqueda, nunca como filas de
  Inicio.
- **`search` con id de TMDB** responde un ítem, para el id de TMDB que Kino está buscando, con el
  póster, el fondo, el año y la sinopsis de TMDB cuando TMDB responde a tiempo. Un scraper solo
  responde por los tipos que declara su manifiesto: uno sin películas (o sin series) no se ofrece como
  fuente para ellas.
- **`search` sin id de TMDB** (una búsqueda escrita, por ejemplo en el televisor) le pregunta el
  texto a la búsqueda de TMDB (`/search/multi`, o solo películas o solo series cuando es lo único que
  sirve el scraper o Kino pidió una serie) y responde hasta 10 coincidencias, ordenadas por qué tan
  parecido es su título a lo buscado y, si empatan, por popularidad en TMDB. El scraper no se llama
  hasta que la persona escoge una. Si TMDB falla, la búsqueda no responde nada, en vez de un error.
- **`episodes`** lista las temporadas y capítulos desde TMDB, sin la temporada 0 (especiales) y sin
  los capítulos que todavía no se han emitido.
- **`resolve`** llama al `getStreams` del scraper exactamente como lo hace Nuvio y se queda solo con
  las copias `http`/`https` (Kino no tiene cliente BitTorrent). Desde Kino 0.9.51 **cada copia
  reproducible** se ofrece: la primera se reproduce y hasta 8 más van como
  [copias alternativas con etiqueta](contract.md#lazy-copies) en el menú **Servidor**, en este orden:
  archivos de video antes que páginas de embed, y dentro de eso primero 1080p, luego 720p, luego
  cualquier otra y 2160p/4K de último (la mayoría de celulares y televisores de acá no decodifican 4K
  HEVC). La etiqueta es la calidad con el nombre del servidor ("1080p · Servidor X"), así que dos copias
  de la misma calidad se distinguen. Una dirección al estilo Kodi, `url|User-Agent=…&Referer=…`, se
  parte: lo que va después de `|` se vuelve encabezados de la petición. Cuando no queda nada, la persona
  lee por qué: "sin resultados", "solo enlaces P2P" o "error del scraper: …" con lo que el scraper dejó
  en el log.
- **Las descargas** funcionan en celulares como en cualquier plugin con `download`
  ([Descargas](manifest.md#downloads)), con las mismas reglas de hosts que al reproducir.

## Límites que cambian frente a un plugin escrito a mano { #limits }

| Qué | Scraper de Nuvio convertido | Plugin escrito a mano |
| --- | --- | --- |
| Tiempo de `resolve` | 75 s (el reproductor muestra la espera en pantalla) | 20 s |
| Peticiones de `kino.fetch` por llamada | 250 | 60 |
| Hosts a los que llega `kino.fetch` | cualquier host público (`fetchHosts`) | `hosts`, servidores escritos por la persona y hosts aprobados uno por uno |
| Dónde puede estar el video | cualquier host público (`streamHosts`) | `hosts`, salvo `streamHosts` o el permiso amplio de video |

Todo lo demás -- memoria, tamaños de cuerpo, los rechazos de la red de la casa, los otros límites de
tiempo -- es igual.

## El entorno que recibe un scraper { #runtime }

La capa de compatibilidad reconstruye, encima de `kino`, lo que espera un scraper de Nuvio:
`module`/`exports`/`require` de CommonJS, un `fetch` con forma de navegador, `axios`, `process.env`,
`global`, `setTimeout`/`clearTimeout`, `AbortController`/`AbortSignal`, `require("crypto")` (el de
Node, en lo que usan los scrapers), la API Web Crypto del navegador (`crypto.subtle`,
`crypto.getRandomValues`, `crypto.randomUUID`), `TMDB_API_KEY`, y los `cheerio-without-node-native`,
`crypto-js` y `Buffer` reales, incluidos solo cuando el código del scraper los necesita.

Desde Kino 0.9.51 (compatibilidad de Nuvio v2) también:

- **Los globales de Nuvio**: `window`, `self` y `SCRAPER_ID`; `getStreams` se encuentra en
  `module.exports`, `exports.getStreams`, `default` o como global; el código async compilado con
  regenerator funciona, y un `require` dentro de un `try` o un `if` también.
- **Un subconjunto de Node**: `path`, `url`, `util`, `events`, `querystring`, `timers`, `buffer` y
  `http`/`https`/`undici` (sobre `kino.fetch`), más `setInterval`, `setImmediate` y `queueMicrotask`.
  `fs`, `child_process`, `net`, `os`, `stream` y parecidos cargan como módulos vacíos: todo miembro se
  lee como `undefined`, así que la propia revisión del scraper cae a `fetch`, y llamarlo igual es un
  `TypeError`.
- **Scrapers de varios archivos**: los archivos hermanos que pide con `require` se leen del mismo
  repositorio (o, si el archivo del scraper está en otro servidor, de ese servidor) y por el mismo
  camino (ningún destino nuevo). Máximo 16 archivos y 1 MiB en total; `../` dentro del repositorio
  sirve, una ruta que se sale del repositorio o de la raíz del servidor (también codificada con `%`)
  se rechaza. Un hermano que falla al cargar se reintenta.
- **Tiempos**: 30 s por petición. Un temporizador que el scraper deja corriendo se borra apenas
  `getStreams` termina, así que la llamada no lo espera.

Un `require` de algo que no está en esa lista ni es un archivo hermano falla con "Nuvio compat:
require('…') was not bundled with this scraper".

La clave de TMDB de Kino nunca se escribe en el código del plugin convertido: `TMDB_API_KEY` tiene
una marca fija, y Kino pone la clave real en su lugar solo en peticiones `https` a
`api.themoviedb.org` (el mismo mecanismo de [secretos sellados](manifest.md#secrets) que usan las
claves de un plugin). Una petición que lleve la marca a cualquier otro lado se rechaza antes de salir,
y la clave se borra de toda respuesta, error y log que el plugin vea.
Esa marca es solo para scrapers convertidos. Un plugin que escribes tú le pregunta a TMDB por medio de
[`kino.tmdb`](kino-api.md#tmdb) (Kino 0.9.53): la llave de Kino detrás de su caché y sus límites, la de la persona solo
cuando la de Kino falla, y ninguna llave en tu código.

Todo eso existe **solo** dentro de un scraper convertido. Un plugin que escribes tú recibe el motor de
Kino tal cual: ninguno de esos globales ([Límites y trampas del motor](engine-limits.md#not-node)). Lo
mismo pasa con el arreglo de los ayudantes async de [la trampa del rechazo](engine-limits.md#rejection-trap).

## Ajustes del scraper { #settings }

Desde Kino 0.9.51, el `onSettings` de un scraper se vuelve el [formulario de ajustes](settings-form.md)
del plugin convertido, en su propia pestaña de Ajustes, y lo que la persona escoge se sincroniza entre
sus aparatos como cualquier ajuste de plugin. El scraper lo recibe en `SCRAPER_SETTINGS`, con sus
propias llaves. Si el formulario del scraper no cabe en los límites de Kino, la hoja de consentimiento
avisa "Algunos ajustes del scraper no caben y quedaron fuera". Un ajuste que pide una cuenta de debrid
hace que el scraper se rechace (ver arriba).

## Qué se rechaza { #refused }

**Los scrapers de fuentes P2P, con o sin debrid** (Kino 0.9.51): Kino no maneja torrents, así que su
tarjeta dice "No compatible" y "Kino no admite scrapers de torrents, ni siquiera con debrid"; se juzga
igual que un [addon P2P de Stremio](stremio.md). Uno instalado antes se apaga en su siguiente revisión
de actualizaciones.

## Actualizaciones { #updates }

La versión de un plugin convertido es `1.<revisión del convertidor>.0`: solo cambia cuando cambia el
convertidor de Kino (hoy `1.4.0`), porque los campos `version` de Nuvio no son confiables. Para
encontrar actualizaciones Kino no compara versiones: "Buscar actualizaciones" (y la revisión en
segundo plano) vuelve a hacer toda la conversión desde el repositorio y compara el código y el
manifiesto que salen con los instalados, así que un cambio en el scraper se encuentra aunque la
versión siga igual. Un cambio que solo toca
el código se instala solo; uno que agrega hosts o un permiso espera la aprobación de la persona, como
cualquier [actualización](publish.md#updates). Un plugin convertido por un Kino más viejo pide
aprobación una vez por lo que agregan las conversiones nuevas (`fetchHosts`, descargas).

## Para quienes mantienen un repositorio de Nuvio { #maintainers }

- Deja `manifest.json` en la raíz de la rama principal (o, desde Kino 0.9.53, en cualquier dirección
  pública por https: [dónde puede estar](#where)), con entradas `scrapers[]` que tengan `id`,
  `name`, `filename` e idealmente `supportedTypes`, `contentLanguage`, `version`, `author`,
  `description` y `logo`: el selector los muestra y filtra por ellos.
- Usa `enabled: false` o `disabledPlatforms: ["android"]` para los scrapers que no se deben ofrecer.
- Devuelve direcciones `http`/`https` de video directo cuando las tengas: van antes que las páginas de
  embed. Ponle `quality` y `name` a cada copia, que son su etiqueta en el menú Servidor.
- Escribe la dirección del propio sitio como un literal en el código (o en una lista remota de
  dominios): así es como Kino encuentra los hosts que va a declarar.
