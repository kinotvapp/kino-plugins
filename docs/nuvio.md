# Scrapers de Nuvio

Kino puede instalar los scrapers de un repositorio de proveedores de Nuvio sin que nadie escriba un
plugin de Kino: convierte el scraper elegido en un plugin de Kino en el dispositivo, al instalarlo.
Esta página cuenta cómo los agrega la gente, qué hace la conversión y hasta dónde llega. No necesitas
nada de esto para escribir tu propio plugin; te sirve si mantienes un repositorio de Nuvio, o si
quieres saber por qué un plugin convertido se porta distinto de uno escrito a mano.

## Cómo los agrega la gente { #add }

1. En Kino, Ajustes ▸ Plugins (en el televisor también se llega con el botón "Plugins" de Inicio),
   "Agregar plugin", y se escribe la dirección del repositorio, `owner/repo`, igual que para un
   plugin de Kino.
2. Kino lee `manifest.json` en la raíz del repositorio. Si está en el formato propio de Nuvio (un
   objeto con un arreglo `scrapers`), la dirección es un repositorio de Nuvio; si no, Kino la trata
   como un plugin de Kino (`kino-plugin.json`). Si la rama principal tiene un `manifest.json` que no
   está en ese formato (algunos repositorios guardan ahí una plantilla), Kino prueba también la rama
   `main` y luego la `master`.
3. Un selector a pantalla completa lista **todos** los scrapers del manifiesto, con su logo, tipos,
   idioma, versión y autor, y filtra por tipo (Todas, Películas, Series, Anime) y por idioma. Cada
   tarjeta dice "Agregar", "Instalado" o "No disponible" (un scraper que el manifiesto desactiva, o
   desactiva en Android). Un repositorio sin nada instalable dice "Este repositorio de Nuvio no tiene
   scrapers instalables en Android".
4. "Agregar" convierte ese scraper y abre la [hoja de consentimiento](what-people-see.md) de siempre;
   después de "Instalar" el selector sigue abierto para agregar otro. Cada scraper queda como su
   propio plugin, listado en Ajustes ▸ Plugins como cualquier otro.

El selector avisa que los scrapers se convierten desde Nuvio y que su código original tiene licencia
GPL-3.0; la descripción del plugin dice lo mismo ("Convertido desde el plugin de Nuvio …; código
original GPL-3.0").

## Qué arma la conversión { #conversion }

El JavaScript del scraper se conserva byte por byte, envuelto con una capa de compatibilidad y un
pequeño adaptador, y se instala con un manifiesto generado:

- `apiVersion` 4, `version` `1.0.0`, capacidades `search`, `episodes`, `resolve` y `download`.
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
- **`search`** responde un ítem, para el id de TMDB que Kino está buscando (nada cuando Kino no tiene
  id de TMDB), con el póster, el fondo, el año y la sinopsis de TMDB cuando TMDB responde a tiempo. Un
  scraper solo responde por los tipos que declara su manifiesto: uno sin películas (o sin series) no
  se ofrece como fuente para ellas.
- **`episodes`** lista las temporadas y capítulos desde TMDB, sin la temporada 0 (especiales) y sin
  los capítulos que todavía no se han emitido.
- **`resolve`** llama al `getStreams` del scraper exactamente como lo hace Nuvio, descarta los
  resultados que solo son torrent (Kino no tiene cliente BitTorrent) y escoge por calidad: primero
  1080p, luego 720p, luego cualquier otra, y 2160p/4K de último (la mayoría de celulares y televisores
  de acá no decodifican 4K HEVC). Cuando no queda nada, la persona lee por qué: "sin resultados",
  "solo torrents" o "error del scraper: …" con lo que el scraper dejó en el log.
- **Las descargas** funcionan en celulares como en cualquier plugin con `download`
  ([Descargas](manifest.md#downloads)), con las mismas reglas de hosts que al reproducir.

## Límites que cambian frente a un plugin escrito a mano { #limits }

| Qué | Scraper de Nuvio convertido | Plugin escrito a mano |
| --- | --- | --- |
| Tiempo de `resolve` | 45 s (el reproductor muestra la espera en pantalla) | 20 s |
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
`crypto-js` y `Buffer` reales, incluidos solo cuando el código del scraper los necesita. Un scraper que
hace `require` de cualquier otra cosa falla con "Nuvio compat: require('…') was not bundled with this
scraper".

Todo eso existe **solo** dentro de un scraper convertido. Un plugin que escribes tú recibe el motor de
Kino tal cual: ninguno de esos globales ([Límites y trampas del motor](engine-limits.md#not-node)). Lo
mismo pasa con el arreglo de los ayudantes async de [la trampa del rechazo](engine-limits.md#rejection-trap).

## Actualizaciones { #updates }

Un plugin convertido siempre dice versión `1.0.0`, así que Kino no compara versiones: "Buscar
actualizaciones" (y la revisión en segundo plano) vuelve a hacer toda la conversión desde el
repositorio y compara el código y el manifiesto que salen con los instalados. Un cambio que solo toca
el código se instala solo; uno que agrega hosts o un permiso espera la aprobación de la persona, como
cualquier [actualización](publish.md#updates). Un plugin convertido por un Kino más viejo pide
aprobación una vez por lo que agregan las conversiones nuevas (`fetchHosts`, descargas).

## Para quienes mantienen un repositorio de Nuvio { #maintainers }

- Deja `manifest.json` en la raíz de la rama principal, con entradas `scrapers[]` que tengan `id`,
  `name`, `filename` e idealmente `supportedTypes`, `contentLanguage`, `version`, `author`,
  `description` y `logo`: el selector los muestra y filtra por ellos.
- Usa `enabled: false` o `disabledPlatforms: ["android"]` para los scrapers que no se deben ofrecer.
- Escribe la dirección del propio sitio como un literal en el código (o en una lista remota de
  dominios): así es como Kino encuentra los hosts que va a declarar.
