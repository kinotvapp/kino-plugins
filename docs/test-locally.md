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
- `KINO_TYPE=movie|series|any` fija el `type` de la búsqueda (por defecto `any`).
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
  descargar o que da 0 canales es un problema, y se listan sus entradas descartadas. El código de
  salida 0 significa que Kino la aceptaría.
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

## Lo que el kit de Node no reproduce { #differences }

Kino es la autoridad; el kit solo se le aproxima para que puedas iterar rápido. Antes de publicar,
instala el plugin en la app y pruébalo ahí. Las diferencias:

- `kino.html.select` lanza un error (usa Jsoup, que solo existe en la app).
- El lector XMLTV del kit es un recorrido tolerante con expresiones regulares, no el analizador XML de
  la app. Da la misma respuesta que la app en todas las guías de prueba compartidas, pero ante un XML
  mal formado a mitad de documento puede conservar más que la app (que se detiene en el primer error y
  conserva lo que leyó hasta ahí).
- La trampa del rechazo de [Límites y trampas del motor](engine-limits.md#rejection-trap): Node ataja
  lo que Kino no atajaría.
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
  de peticiones, respuestas y selectores.
