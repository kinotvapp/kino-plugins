# Probar en local

El kit de Node es la carpeta `sdk/` de los plugins de ejemplo ([de dónde sacarla](first-plugin.md#get-the-sdk)):
`run.mjs` (ejecuta una función), `validate.mjs` (revisa un plugin como lo hace Kino), `init.mjs` (crea
el esqueleto de uno nuevo), `kino-shim.mjs` (la API `kino` en Node), `contract.mjs` (las reglas,
leídas de `contract.json`), `seal.mjs` (sella un [secreto](manifest.md#secrets) para tu manifiesto, y con `--keygen`/`--sign` firma un [plugin firmado](signed.md)) y
`guide-tables.mjs` (regenera las tablas de la guía). No hay nada que
instalar. Necesita Node 18 o más nuevo (probado en 18.20, 20.11 y 24.14);
`node --test sdk/test/kit.test.mjs` ejecuta sus propias pruebas.

```
node sdk/run.mjs ./plugin.js search "metropolis"
node sdk/run.mjs ./plugin.js home
node sdk/run.mjs ./plugin.js browse films 2
node sdk/run.mjs ./plugin.js episodes 'Dragnet1951'
node sdk/run.mjs ./plugin.js resolve 'Dragnet1951|Dragnet/Season 1/Dragnet (1951) - S01E01 - The Human Bomb.mp4'
```

El primer argumento es tu archivo de entrada (o la carpeta que tiene `kino-plugin.json`), luego la
función, luego su argumento: el texto a buscar, el `ref` para `episodes` y `resolve`, o el `ref` y un
cursor opcional para `browse`. El runner lee tu manifiesto, pone el global `kino`, llama esa única
función como lo hace Kino, **revisa la respuesta con las reglas de la app** e imprime en stdout, como
JSON, lo que Kino conservaría; cada entrada que Kino descartaría sale en stderr con el motivo (`--raw`
imprime tu respuesta sin tocar). Los logs, `console.*` y los errores van a stderr, así que puedes
encadenar el resultado (`... | head -30`, `... | jq`). El código de salida es 0 si todo sale bien, 1
cuando tu código lanza un error y 2 cuando el comando está mal. El runner solo ejecuta funciones que
tu manifiesto declara.

- `--config key=value` (repetible) fija un ajuste; el runner también lee `sdk/config.json`
  (`{ "server": "http://192.168.1.10:8096", "user": "ana" }`; déjalo por fuera de git). Un ajuste
  obligatorio sin valor frena la ejecución con `auth_required`, como en la app.
- `--record fixtures.json` guarda cada respuesta de `kino.fetch`; `--replay fixtures.json` responde
  solo desde ese archivo, sin red. Graba una vez y tus pruebas corren sin conexión y siempre igual (el
  `test/plugin.test.mjs` del esqueleto hace exactamente eso).
- `--device tv|phone` (o `KINO_DEVICE=tv`) fija lo que dice [`kino.device`](kino-api.md#device), para probar el lado de TV de
  tu plugin; por defecto es `"phone"`. Cualquier otro valor frena la ejecución.
- `KINO_TYPE=movie|series|music|podcast|any` fija el `type` de la búsqueda (por defecto `any`; `music` y `podcast` son
  de [apiVersion 8](contract.md#music-podcasts), Kino 0.9.54).
- Para llenar los otros campos de la consulta, pasa la consulta completa como JSON:
  `node sdk/run.mjs ./plugin.js search '{"q":"dragnet","type":"series","year":1951}'`
  (`season`, `episode`, `tmdbId` y `year` son `0` si no).
- En el kit de Node, `kino.storage` es un archivo llamado `.kino-storage.json` y el tarro de cookies
  `.kino-cookies.json`, los dos al lado de tu manifiesto. Agrégalos a tu `.gitignore`. Bórralos para
  empezar de cero. Un plugin con `secrets` también lee `.kino-secrets.json` de la misma carpeta
  ([abajo](#secrets)). `node sdk/init.mjs` ya pone los tres en el `.gitignore` del esqueleto.
- `node sdk/validate.mjs <folder>` revisa el manifiesto con todas las reglas de
  [el manifiesto](manifest.md) (los mismos mensajes en español que muestra la app) y que cada capacidad
  declarada esté exportada, e imprime las líneas extra de la hoja de consentimiento tal como las leerá
  la persona (las rojas, un host `insecureHttp`, `"liveStreamHosts": "any"` o `"streamHosts": "any"`,
  marcadas "(en rojo)"; `secrets` agrega "Usa datos sellados por su autor", con una nota de que solo
  la app puede comprobar para qué repositorio se sellaron);
  `--run <function> [argument]` además la ejecuta y lista lo que Kino descartaría. Con
  `--run liveCategories`, cada lista declarada también se descarga y se analiza: una que no se puede
  descargar o que da 0 canales es un problema, y se listan sus entradas descartadas. Con
  `--run meta <ids>` le pregunta a tu `meta` ([abajo](#meta)). `--run section [tab]`, `--run categories`,
  `--run settingsStatus`, `--run action <key>` y `--run validateSettings '<json>'` (apiVersion 6) las ejecutan como
  `run.mjs` y como las lee la app: la sección y las categorías con lo que se descarta, cada línea de estado y las que
  faltan, lo que muestra una acción (y si refresca o borra ajustes), y si se acepta el guardado. Una llamada que la app
  nunca hace es un problema: no hay `"section"` en el manifiesto, `categories` sin apiVersion 6 y `browse`, una clave de
  acción que ningún ajuste `action` tiene, una función que no se exporta, o una respuesta de `validateSettings` que Kino
  no puede leer. El código de salida 0 significa que Kino la aceptaría.
- La carpeta `sdk/` no tiene que vivir en tu repositorio. Cópiala a cualquier parte y ejecuta
  `node /ruta/a/sdk/run.mjs ./plugin.js ...`.
- Un stack trace nombra un `plugin.mjs` temporal: el runner carga una copia de tu archivo para que
  Node lo trate como módulo ES sin importar su versión ni lo que diga `package.json`. Los números de
  línea son los de tu `plugin.js`.

## Secretos sellados (apiVersion 4) { #secrets }

El kit nunca puede abrir un sello: no tiene la clave privada. Por eso lee los valores en claro
directamente de `.kino-secrets.json` al lado de tu manifiesto (`{ "apiKey": "..." }`; déjalo fuera de
git, como hace el `.gitignore` del esqueleto) y simula todas las reglas de
[`kino.secret`](kino-api.md#secret): los marcadores, el cambio dentro de `kino.fetch`, la revisión de
hosts del manifiesto por https en cada salto, las restricciones de `kino.crypto` y el tapado de lo que
vuelve. `--record` tampoco escribe nunca el valor en claro en un archivo de fixtures: en su lugar va
un marcador fijo, así que una grabación que subes a git nunca lleva un secreto, se reproduzca como se
reproduzca después.

Para hacer el sello: `node sdk/seal.mjs --repo owner/repo --name apiKey`, y escribe el valor en el
prompt oculto (o pásalo por stdin). Sella para el repositorio desde el que la gente va a instalar, y
prueba la versión sellada en la app instalada desde su rama principal, sin `@ref`
([por qué](manifest.md#secrets)).

## Plugins firmados (apiVersion 5) { #signing }

`validate.mjs` comprueba un [plugin firmado](signed.md) como lo hace Kino: la forma del campo
`signature`, la firma misma contra tu archivo de entrada (`--repo owner/repo[/carpeta]`, o el `origin`
de GitHub de la carpeta si lo omites), que ningún `*.pem` esté rastreado por git, e imprime la huella
de la clave del autor y la línea de consentimiento "Firmado por su autor". También rechaza
`"entry": "./plugin.js"` (Kino 0.9.45 y anteriores no lo instalan) y avisa cuando `hosts` tiene más de
20 entradas (Kino 0.9.44 y anteriores lo rechazan). Firma otra vez después de cada cambio en el archivo
de entrada o en la `version`.

## Canales en vivo (apiVersion 3) { #live }

Los exports de `channels` se ejecutan con `live`, con la carpeta del plugin primero:

```
node sdk/run.mjs . live categories
node sdk/run.mjs . live channels noticias
node sdk/run.mjs . live channels noticias 2
node sdk/run.mjs . live guide canal1,canal2
node sdk/run.mjs . live search noticias
node sdk/run.mjs live playlist https://iptv-org.github.io/iptv/countries/co.m3u
node sdk/run.mjs live playlist ./lista.m3u --epg ./guia.xml.gz
```

- `live categories` llama `liveCategories()` e imprime lo que Kino conserva. Luego, por cada
  `{ playlist }` de la respuesta, descarga la lista como lo haría la app (tus `headers`, solo tus
  `hosts` o el servidor de la persona, cada redirección también) e imprime, en stderr, el mismo
  resumen que `live playlist` y los grupos de la lista como las categorías que verá la gente.
- `live channels <categoryId> [cursor]` llama `liveChannels({ categoryId, cursor })` y luego
  reproduce, como lo haría Kino, el primer canal que tenga `ref` y no `stream`: le manda ese `ref` a
  `resolve()` y revisa la respuesta como la de un canal en vivo (así que aplica
  `"liveStreamHosts": "any"`). Con `validate.mjs --run liveChannels`, una respuesta rechazada ahí es un
  problema.
- `live search <consulta>` llama `liveSearch({ query })`, imprime los canales que Kino conserva
  (máximo 100) y reproduce el primero que tenga `ref`, como `live channels`.
- `resolve <ref> --live` revisa una respuesta de `resolve()` como la de un canal en vivo. Sin `--live`
  el kit no puede saber que el `ref` es de un canal y aplica la regla estricta; cuando solo eso frena la
  URL y tu manifiesto tiene `"liveStreamHosts": "any"`, dice "si este ref es de un canal en vivo,
  prueba con --live".
- `live guide <id,id>` llama `guide()` con esos ids y una ventana de 24 horas que empieza dos horas
  atrás.
- `live playlist <url|file>` no necesita plugin: lee cualquier lista M3U con las reglas de Kino e
  imprime `N canales en M categorías; K entradas descartadas; L ocultas (adultos)`, las categorías y los
  primeros 20 canales como `group › name  url`. Con `--epg <url|file>` también muestra qué tiene al aire
  cada uno de esos 20, o "sin guía". Una guía que declara un DOCTYPE se rechaza, como en la app, y el
  comando lo dice: "La guía declara un DOCTYPE; Kino la rechaza por seguridad". Úsalo con una lista
  antes de escribir una sola línea de plugin.

El kit lee listas y guías con `sdk/live-playlist.mjs`, una copia de los lectores de la app amarrada a
los mismos archivos de prueba (`docs/plugins/fixtures/live` en el repositorio de Kino): lo que
conserva es lo que conserva Kino.

## Lo nuevo de apiVersion 6 { #api6 }

```
node sdk/run.mjs . section [tab]                  # necesita "section" en el manifiesto
node sdk/run.mjs . categories                     # necesita la capacidad browse
node sdk/run.mjs . theme                          # tus colores, sus contrastes y sus respaldos
node sdk/run.mjs . settingsStatus
node sdk/run.mjs . action logout
node sdk/run.mjs . validateSettings '{"email":"ana@x.co"}'
node sdk/run.mjs --within '<ref>' ./plugin.js search "texto"   # scopedSearch
node sdk/run.mjs ./plugin.js sign '{"url":"https://cdn.example/seg.ts","kind":"segment","ref":"<ref>","context":"<signContext>"}'
node sdk/run.mjs --retry conflict:1 ./plugin.js resolve '<ref>'  # o conflict:1:409
node sdk/validate.mjs . --run liveSearch noticias  # marca +18 de los resultados de liveSearch
node sdk/run.mjs ./plugin.js migrate '{"kind":"title","ref":"<ref viejo>"}'
```

`run.mjs` muestra como `[dropped by Kino]` lo que Kino descartaría (`clearSettings`, `alternateHosts`),
imprime lo que leería la persona con un [`userMessage`](contract.md#user-message) (o por qué no se
mostraría), y `validate.mjs` avisa de `debug` antes de publicar, de un `scopedSearch` que nunca lee
`within` y de un plugin que usa los pares de llaves de `kino.crypto` sin `"apiVersion": 6`. Las páginas:
[Formulario de ajustes](settings-form.md), [Firma por petición](signed-streams.md),
[Pasar lo guardado](migrate.md), [Sección, categorías y colores](section-theme.md),
[Registro y telemetría](diagnostics.md).

## Describir títulos (`meta`) { #meta }

```
node sdk/run.mjs . meta tt1254207 tmdb:10378        # apiVersion 6, "meta": Kino's verdict field by field and the info page
node sdk/validate.mjs . --run meta tt1254207        # the same, as a check; null is a note, not a problem
```

`meta <ids> [movie|series]` llama tu `meta()` con la consulta que arma Kino para un título que listó otra fuente,
`{ type, ids: { imdb?, tmdb?, kitsu?, mal?, anilist? }, id?, lang? }`: `tt…` es `ids.imdb`, `tmdb:N` es `ids.tmdb`, y
`kitsu:N`, `mal:N`, `anilist:N` fijan ese id y el `id` de la consulta (el id propio de la fuente, como en un anime de
Stremio); `lang=xx` (por defecto `KINO_LANG`, si no `es`), `id=<id de la fuente>`, o la consulta entera como JSON. Nunca
recibe un `ref`: Kino describe un título por sus ids, sea cual sea el plugin que lo listó, y no le pregunta a nadie por un
título sin ids. La llamada tiene los 6 s de Kino; pasado ese tiempo el kit deja de esperar, como la app. Por stderr: la
consulta, tu respuesta tal como la devolviste, el veredicto de Kino campo por campo (`✓` se conserva, `~` se corta o se
conserva en parte, `✗` se descarta, `·` no está, `-` se ignora, con el motivo de cada entrada descartada) y luego cómo la
usaría la ficha; por stdout, lo que Kino conserva (`null` cuando no cuenta como respuesta). Si el manifiesto declara
`meta` y el archivo de entrada no lo exporta, el runner dice que Kino rechaza la instalación. Una ejecución recortada con
el [plugin de referencia del servidor propio](examples.md#reference-plugin) (Tu servidor 1.5.0, con su `server.mjs` corriendo):

```
$ node sdk/run.mjs --config server=http://192.168.2.13:18096 --config user=ana --config password=s3cr3t . meta tt1254207 tmdb:10378
meta({"type":"movie","ids":{"imdb":"tt1254207","tmdb":10378},"lang":"es"})
the plugin answered:
{ … }
Kino's verdict, field by field:
  ✓ title           kept: 14 characters; the page keeps the source's own title, this one is not shown
  ✓ overview        kept: 73 characters; shown as the synopsis when TMDB and AniList have none (HTML tags stripped)
  ✓ poster          kept: http://192.168.2.13:18096/img/poster/bbb.png (a server the person typed); used when the page has no poster
  ✓ year            kept: 2008
  ✓ genres          kept: 2 of 2: Animación, Comedia
  ✓ runtimeMinutes  kept: 10; shown only for a movie (a series' runtime is per episode)
  · episodes        absent: not given
  ✓ ratings         kept: 2 of 2: imdb 6.4, letterboxd 3.4/5
  ✓ cast            kept: 2 of 2
{ … }
How the info page would use it (only where TMDB and AniList left the part blank; their values always win):
  info line: ★ <the page's score>  ·  IMDb 6.4  ·  Letterboxd 3.4/5  ·  2008  ·  10 min
  synopsis: Un conejo enorme y tranquilo contra tres roedores que no lo dejan en paz.
  …
```

Una parte descartada se lee como `✗ backdrop        dropped: 192.168.1.4 is a private, local or reserved IP address: never the home network`,
y una lista con entradas malas como `~ ratings         partly kept: 3 of 4: …` seguida de una línea por entrada. Las mismas
reglas corren sobre los vectores de prueba de la propia app (`docs/plugins/fixtures/meta/vectors.json` en el repositorio
de Kino), así que lo que conserva el kit es lo que conserva Kino.

`validate.mjs --run` también encadena `meta`: con `--run search`, `browse`, `home` o `section` y la capacidad `meta`, a
tu `meta` se le pregunta por el primer título de la respuesta que trae `ids.imdb` o `ids.tmdb` (como arma Kino la
consulta); se lista lo que descarta, y un error o pasarse de 6 s es un problema.

## `kino.meta` y `kino.tmdb` (Kino 0.9.53) { #kino-services }

Las dos funcionan en cualquier función que corra el runner, con los sustitutos del kit (cualquier apiVersion):

```
KINO_META_FIXTURE=meta.json node sdk/run.mjs . home        # kino.meta responde desde meta.json; sin él, null
KINO_TMDB_KEY=<tu llave de TMDB> node sdk/run.mjs . home   # kino.tmdb le pregunta a TMDB con TU llave donde Kino usa la suya (o "tmdbKey" en sdk/config.json)
KINO_TMDB_FIXTURE=tmdb.json node sdk/run.mjs . search matrix   # kino.tmdb responde sin red desde tmdb.json
```

- `meta.json` asocia `"<type>:<idKey>:<valor>"` o `"<idKey>:<valor>"` (`"movie:imdb:tt0133093"`, `"tmdb:1399"`) a una
  respuesta; responde el primer id de la consulta que tenga entrada, o `null` (la consulta de TMDB y AniList de Kino y los
  demás plugins de la persona no existen en Node).
- `tmdb.json` asocia `"<path>?<params ordenados por nombre, codificados>"` o solo `"<path>"` al cuerpo de TMDB
  (`"/trending/movie/week?language=es-MX"`); el archivo hace las veces de TMDB y de una llave, y una ruta que
  no tenga responde `not_found`.
- Tu llave hace las veces de la de Kino, con el límite de la llave de Kino (20 llamadas cada 10 s); el kit no tiene una
  llave de la persona a la que pasar, así que pasado ese límite lanza `rate_limited`.
- Sin llave ni archivo, `kino.tmdb` lanza `no_tmdb_key`, como hace una versión de Kino sin llave propia con una persona sin
  llave, y el runner muestra la frase que Kino mostraría. Tu llave nunca se imprime.
- La validación, los límites, la caché y los códigos de error son los de la app ([`kino.meta`](kino-api.md#meta),
  [`kino.tmdb`](kino-api.md#tmdb)); `node sdk/validate.mjs` avisa si tu código llama cualquiera de las dos sin
  `typeof kino.<nombre> === "function"` (las versiones anteriores de Kino no tienen ninguna). Hay ejemplos de los dos
  archivos en `docs/plugins/fixtures/kino-services/` del repositorio de Kino.

## `kino.device` y `kino.seed` (Kino 0.9.55) { #device }

El kit trae las dos. `kino.device` es `"phone"` salvo que pases `--device tv` (o definas `KINO_DEVICE=tv`), así corres tu
plugin una vez como cada uno. [`kino.seed`](kino-api.md#seed) no envía nada a ningún lado: aplica el mismo filtro que la
app (las claves y límites de `kinoSeed` en el contrato) y registra qué claves conservaría Kino, nunca sus valores, porque
son tokens; sin `"telemetry"` en tu manifiesto, la línea dice que la app no enviaría nada.

## Lo que el kit de Node no reproduce { #differences }

Kino es la autoridad; el kit solo se le aproxima para que puedas iterar rápido. Antes de publicar,
instala el plugin en la app y pruébalo ahí. Las diferencias:

- `kino.html.select` lanza un error (usa Jsoup, que solo existe en la app).
- El lector XMLTV del kit es un recorrido tolerante con expresiones regulares, no el analizador XML de
  la app. Da la misma respuesta que la app en todas las guías de prueba compartidas, pero ante un XML
  mal formado a mitad de documento puede conservar más que la app (que se detiene en el primer error y
  conserva lo que leyó hasta ahí).
- La trampa del rechazo de [Límites y trampas del motor](engine-limits.md#rejection-trap): Node ataja
  lo que Kino 0.9.49 y anteriores no atajarían.
- Node tiene globales que a Kino le faltan (`setTimeout`, `fetch`, `Buffer`, ...): el plugin puede
  pasar en Node y fallar en Kino. El `URL` de Kino no tiene punycode.
- Las reglas de hosts, de redirecciones y de cantidad de peticiones son las mismas, y las de cookies
  también hasta donde llega el análisis propio de Node, pero no se rechazan nombres que resuelven a
  direcciones privadas, los cuerpos siempre se leen como UTF-8, y el tiempo límite de 15 s cubre la
  espera de la respuesta pero no la descarga.
- El kit nunca pregunta por un host: uno no declarado falla como `host_not_allowed` aunque sea
  durante `resolve` o `episodes`, donde la app podría [preguntarle a la persona](kino-api.md#fetch).
  Tampoco tiene el permiso amplio de video; `"streamHosts": "any"` sí lo aplica.
- No se hacen cumplir los límites de tiempo por llamada, el límite de memoria ni los topes de tamaño
  de peticiones, respuestas y selectores, salvo los 6 s de `meta` (ahí Kino se rinde sin avisar, así que el kit lo dice).
- `kino.browser.capture` y `kino.browser.page` siempre responden `browser_unavailable` ([Navegador oculto](browser.md)).
  En el kit `kino.browser.captureAll` es `true`, y revisa las [opciones de captura de Kino 0.9.54](browser.md#capture-all)
  como la app (`invalid_request`) antes de responder eso.
- `kino.lang` es siempre `"es-CO"`; el de la app sigue su idioma desde Kino 0.9.54 ([`kino.lang`](kino-api.md#lang)).
- No hay comando `details`: prueba la exportación [`details`](contract.md#details) (apiVersion 8, Kino 0.9.54) en la
  página de una película en la app.
