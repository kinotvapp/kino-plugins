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
| `id` | Obligatorio. `^[a-z0-9][a-z0-9-]{1,39}$` (de 2 a 40 letras minúsculas, dígitos o guiones, sin empezar por guion). No puede ser `magis`, `ditu`, `live`, `local`, `unknown` ni `plugin`. Es la identidad del plugin: nunca lo cambies cuando ya haya gente que lo instaló. |
| `name` | Obligatorio. De 1 a 40 caracteres. |
| `version` | Obligatorio. `MAJOR.MINOR.PATCH` y nada más (sin `-beta`, sin `+build`), cada número de hasta 6 dígitos y sin ceros a la izquierda. |
| `apiVersion` | Obligatorio. `1`, `2` o `3`. Un número más alto del que Kino soporta se rechaza con "Este plugin necesita una versión más nueva de Kino". Declara `2` solo si usas algo que lo necesite (abajo); si no, quédate en `1` para que tu plugin también corra en versiones viejas de Kino. |
| `entry` | Obligatorio. Ruta relativa del archivo JavaScript: solo letras, dígitos, `.`, `_`, `-` y `/`, sin `..`, máximo 200 caracteres, termina en `.js`. El archivo pesa máximo 1 MB. |
| `hosts` | Obligatorio. De 1 a 20 entradas (desde apiVersion 2 puede estar vacío, `[]`, cuando el plugin tiene un ajuste de tipo `url`: mira [Los servidores propios de la persona](#own-servers)); cada una es un nombre DNS en minúsculas (`archive.org`), `*.` más un nombre DNS (`*.archive.org`) o (solo apiVersion 2) un objeto `{ "host": "…", "insecureHttp": true }` (abajo). Solo nombres de host: sin esquema, puerto ni ruta. Nada de `*` solo, nada de direcciones IP, nada de `localhost`, nada que termine en `.local`, `.lan`, `.internal`, `.localhost` o `.home.arpa`, y por lo menos un punto. **`*.x` cubre solo los subdominios, no `x` mismo**: si necesitas los dos, pon los dos. |
| `capabilities` | Obligatorio. Un subconjunto de `search`, `home`, `browse`, `episodes`, `resolve`, `download`, `drm`, `channels`. Debe incluir `resolve` y al menos uno de `search` o `home`. `search`, `home`, `browse`, `episodes` y `resolve` tienen que ser, cada una, una función exportada del archivo de entrada, o la instalación falla con "El plugin no carga: le falta ...". `download` y `drm` necesitan `apiVersion: 2` y son banderas declarativas — la app actúa sobre ellas, no tu código, así que no hay nada más que exportar; declarar una muestra su línea de consentimiento ("Puede descargar videos para verlos sin conexión" / "Reproduce video protegido (DRM)") y pide aprobación otra vez en una actualización que la agregue. `download` les da descargas sin conexión a tus títulos (mira [Descargas](#downloads)); `drm` le permite a un `Stream` llevar una licencia Widevine (mira [Un stream protegido con Widevine](cookbook.md#widevine)). `channels` necesita `apiVersion: 3` y los exports `liveCategories` y `liveChannels` (mira [Canales en la pestaña En vivo](live-channels.md#en-vivo-tab)). |
| `settings` | Opcional. Lo que la persona llena en la pantalla "Configurar" de tu plugin: mira abajo. |
| `permissions` | Opcional. Una lista de nombres de la lista cerrada de `contract.json`. **La lista está vacía en esta versión**: cualquier nombre se rechaza con "permiso desconocido: …". Existe para que una versión futura pueda agregar permisos (cada uno visible en la pantalla de consentimiento) sin un `apiVersion` nuevo. |
| `color` | Opcional, `#RRGGBB`: el acento de la pestaña y los chips de tu plugin. Por defecto, un color neutro. |
| `icon` | Opcional, ruta relativa a un `.png` cuadrado de máximo 128 KB. Un ícono que falta o que pesa demasiado se omite sin que falle la instalación. |
| `discoverable` | Opcional, `true` o `false` (por defecto `true`), en cualquier `apiVersion`. `false` deja el plugin por fuera de la búsqueda de la comunidad de Kino (mira [Hazte encontrar](publish.md#get-found)); la gente igual puede instalarlo escribiendo su dirección. Cualquier otro valor se rechaza con "El campo \"discoverable\" debe ser true o false". |
| `description`, `author`, `homepage` | Textos opcionales. Se les quitan los espacios de los extremos y se cortan a 300, 60 y 200 caracteres. Kino muestra el nombre, el autor, la versión y la descripción cuando le pregunta a la persona si quiere instalar. |

Las demás claves se ignoran. `hosts` cumple tres funciones: es lo que la persona aprueba, es el
único conjunto de sitios a los que llega `kino.fetch`, y es el conjunto en el que deben estar las
URL de un `Stream`: el video, sus subtítulos, sus `audioTracks` y la `licenseUrl` de un bloque
`drm` (además del servidor propio de la persona).

Hay un campo más, `liveStreamHosts`, que solo se lee con `"apiVersion": 3` y solo en plugins con la
capacidad `channels`: mira [Canales desde cualquier servidor](live-channels.md#live-stream-hosts).
Los ítems en vivo (apiVersion 2) y la pestaña En vivo (apiVersion 3) tienen su propia página,
[Canales en vivo](live-channels.md).

## Ajustes { #settings }

`settings` es una lista de máximo 12 entradas. Cada una se vuelve un campo en la pantalla
"Configurar" del plugin (Ajustes ▸ Plugins), y tu código lee su valor con `kino.config.get(key)`:

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

- `key` cumple `^[a-z][a-zA-Z0-9_]{0,31}$` y no se repite; `label` tiene de 1 a 40 caracteres; `hint`
  (el ejemplo que sale debajo del campo), máximo 80.
- `select` necesita `options` (de 1 a 20, cada una con un `value` y un `label` de máximo 40
  caracteres); su `default` tiene que ser uno de los valores. El `default` de un `toggle` es `true` o
  `false`.
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
igual que al reproducir, y guarda el `Stream` como **un solo archivo**, con tus `headers` en la
petición, por el mismo filtro de hosts que el reproductor (https en tus `hosts` o el servidor propio
de la persona, cada salto de redirección revisado, nunca la red de la casa). Tus `subtitles` se
guardan al lado. Los `audioTracks` **no** se guardan: la copia sin conexión solo tiene el audio que va
dentro del archivo de video, así que una fuente que dobla con pistas aparte se oye con su audio
principal cuando está sin conexión.

Qué se descarga y qué no:

- Un archivo progresivo (`mp4`, `mkv`, `webm`, `ts`, …) se descarga. El archivo guardado toma su
  extensión de tu `mime` cuando lo das, si no de la URL, y si no `mp4`; el reproductor igual mira los
  bytes.
- Un manifiesto HLS o DASH (`.m3u8`, `.mpd`, un `mime` como `application/vnd.apple.mpegurl` o
  `application/dash+xml`, o una respuesta cuyo `Content-Type` o primeros bytes lo digan, sin importar
  cómo se vea la URL) **no**: la descarga termina como "Este video no se puede descargar", un estado
  final sin "Reintentar" (se negaría igual) que la persona solo puede quitar. Un stream con DRM o un
  canal en vivo se rechazan igual. No hay una llamada aparte de "resolve para descargar": si tu fuente
  ofrece un manifiesto y también un archivo, prefiere el archivo, o acepta que esos títulos se
  reproducen pero no se descargan.
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
