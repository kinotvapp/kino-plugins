# Crear un plugin con IA

Un asistente de programación con IA (Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot, Aider…)
puede escribirte un plugin de Kino si primero lee las reglas, **aunque tú no sepas programar**: tú
dices qué fuente quieres y pruebas el resultado en Kino; el asistente escribe el código, lo prueba con
el kit y te dice qué hacer en cada paso. Este sitio publica las reglas en los formatos que mejor leen
esas herramientas:

| Archivo | Qué es |
| --- | --- |
| [`AGENTS.md`](https://kinotvapp.github.io/kino-plugins/AGENTS.md) | Las instrucciones para el asistente: su rol, qué leer, el flujo de trabajo paso a paso, las reglas duras con sus números exactos, una lista de chequeo y los errores de siempre. También está en [el repositorio](https://github.com/kinotvapp/kino-plugins/blob/main/AGENTS.md). |
| [`llms-full.txt`](https://kinotvapp.github.io/kino-plugins/llms-full.txt) | Toda esta guía en un solo archivo de texto (en inglés), más `AGENTS.md`, `contract.json` y `kino.d.ts`. Se genera con el sitio, así que siempre es la misma versión de estas páginas. |
| [`llms.txt`](https://kinotvapp.github.io/kino-plugins/llms.txt) | El índice corto, en el formato [llms.txt](https://llmstxt.org/). |

!!! tip "¿Quieres usar un scraper de Nuvio?"
    No necesitas este prompt: Kino instala directamente los scrapers de un repositorio de Nuvio,
    convirtiéndolos en el dispositivo. Mira [Scrapers de Nuvio](nuvio.md).

## Antes de empezar { #before }

Necesitas cinco cosas. Todas son gratis salvo, a veces, el asistente.

1. **Una cuenta de GitHub** ([github.com/signup](https://github.com/signup)). Tu plugin vive en un
   repositorio público de GitHub; de ahí lo instala Kino.
2. **Node.js 18 o más nuevo** ([nodejs.org](https://nodejs.org/), la versión "LTS"). Es lo que corre
   el kit de pruebas. Para comprobarlo, en una terminal: `node --version` tiene que responder `v18`
   o un número mayor.
3. **Git** ([git-scm.com](https://git-scm.com/downloads)), para bajar y subir el repositorio. Opcional
   pero útil: [GitHub CLI](https://cli.github.com/) (`gh`), con el que el asistente puede crear el
   repositorio y ponerle el topic por ti (la primera vez, `gh auth login`).
4. **Un asistente que pueda usar la terminal**, es decir, que ejecute comandos y lea lo que
   responden:
    - en la terminal: Claude Code, Codex CLI, Gemini CLI, Aider;
    - en un editor: Cursor, o VS Code con GitHub Copilot en modo agente.

    **Cómo abrir una terminal:** en Windows, menú Inicio → escribe "Terminal" (o "PowerShell"); en
    Mac, Cmd + Espacio → escribe "Terminal"; en Linux, Ctrl + Alt + T. Crea una carpeta vacía, entra
    en ella y abre ahí el asistente.

    Un chat en el navegador, sin terminal, también sirve, pero ahí te toca a ti copiar cada comando,
    ejecutarlo y pegarle al chat lo que responda.
5. **Kino en un celular o un televisor**, para probar el plugin de verdad antes de compartirlo.

Y una cosa más: **el derecho a usar la fuente.** Un plugin solo puede llegar a lo que la persona
igual podría ver; no le pidas a un asistente que se salte un muro de pago, un login ajeno o un DRM.

## El prompt { #prompt }

Cópialo (el botón de copiar está arriba a la derecha del bloque), cambia lo que está entre `<<<` y
`>>>` y pégalo en tu asistente. Si no sabes qué poner en una línea, déjala como está: el asistente te
lo va a preguntar.

```text
Vas a escribir un plugin de Kino: un repositorio público de GitHub con kino-plugin.json y un
módulo ES de JavaScript (plugin.js) que la app de video Kino ejecuta en un sandbox de QuickJS.

Puede que yo no sepa programar. Explícame cada paso en español sencillo, ejecuta tú los comandos
(antes dime cuál y para qué), pregúntame antes de cualquier cosa que no se pueda deshacer (borrar,
publicar, subir a GitHub) y, cuando algo lo tenga que hacer yo en GitHub o en Kino, dame los clics
exactos.

Antes de escribir nada:
1. Lee completo https://kinotvapp.github.io/kino-plugins/AGENTS.md y síguelo como tus instrucciones.
2. Lee https://kinotvapp.github.io/kino-plugins/llms-full.txt (la guía completa, contract.json y
   kino.d.ts). Si no puedes abrir URL, dímelo y te los pego.
3. Parte de una plantilla, con "Use this template" (nunca Fork): kinotvapp/kino-plugin-archive si mi
   plugin es simple, kinotvapp/kino-plugin-own-server si necesita ajustes, sesión, descargas o canales
   en vivo (su plugin.js y su kino-plugin.json son la referencia completa de la API). La carpeta sdk/
   de la plantilla es el kit de pruebas de Node.

Lo que quiero:
- Fuente: <<< el sitio o la API, p. ej. https://example.com >>>
- Contenido: <<< películas / series / anime / TV en vivo; idioma y país >>>
- Acceso: <<< ninguno / mi usuario y contraseña del sitio / una clave de API mía (del desarrollador) que no quiero publicar / la dirección de un servidor que escribe cada persona >>>
- Qué le pregunta Kino a la persona al configurarlo: <<< nada / su usuario y contraseña / su región / la dirección de su servidor >>>
- Descargas para ver sin conexión: <<< sí / no >>>
- Nombre en Kino y una descripción corta: <<< p. ej. "Mi fuente": "Películas de …, en español" >>>
- Firmar el plugin con mi propia clave, para que la gente sepa que cada actualización es mía: <<< sí / no >>>
- Mi usuario de GitHub: <<< p. ej. mi-usuario >>>

Reglas que no puedes romper (el detalle y los números exactos están en AGENTS.md):
- Declara en "hosts" cada host que conozcas: los de la API y los del video, subtítulos, audio,
  segmentos y redirecciones (*.x no cubre x). Si falta uno, al abrir o reproducir un título Kino le
  pregunta a la persona una sola vez; no cuentes con eso. Si el video sale de CDN que cambian, usa
  "streamHosts": "any" (apiVersion 4; la persona lo aprueba al instalar); para canales en vivo,
  "liveStreamHosts": "any" (apiVersion 3, necesita la capacidad "channels"). No uses "fetchHosts":
  solo sirve en plugins convertidos desde Nuvio. Desde Kino 0.9.45 no hay un máximo de hosts; Kino
  0.9.44 y anteriores rechazan más de 20, así que si declaras más de 20, avísame.
- En kino-plugin.json escribe "entry": "plugin.js" e "icon": "icon.png", NUNCA "./plugin.js": Kino
  0.9.45 y anteriores rechazan un "./" al principio y el plugin no se instala.
- No es Node ni un navegador: no hay fetch, setTimeout, Buffer, process, require, crypto ni Intl;
  usa kino.fetch, kino.sleep, kino.crypto, kino.storage. Sí hay URL, URLSearchParams, atob, btoa,
  TextEncoder, TextDecoder y console. Un solo archivo, sin import.
- Nunca lances un error antes del primer await de una función async (primero await, luego valida).
- Usa kino.fetch siempre que encuentre el video. Solo si el embed de un servidor arma la dirección
  ejecutando sus propios scripts, usa el navegador oculto ("browser": true, apiVersion 6; me lo pregunta
  en rojo) y llama kino.browser.capture solo dentro de resolve. Nunca intentes resolver ni saltarte un
  captcha o una revisión de "confirma que eres humano": con blocked, pasa al siguiente servidor. Si un
  título tiene varios servidores o idiomas, resuelve uno y lista los demás como alternatives
  { label, ref }.
- Límites: search 15 s y las demás llamadas 20 s; 60 peticiones por llamada (cada salto de
  redirección cuenta, también los rechazados) y máximo 6 al mismo tiempo; cuerpos de 5 MB;
  256 KB de kino.storage; 100 resultados de búsqueda; Inicio con 20 filas de 60.
- Errores para la persona: kino.error("auth_required" | "not_found" | "geo_blocked" |
  "rate_limited" | "unavailable"). Con apiVersion 6 puedes agregar una frase propia,
  kino.error(code, detalle, { userMessage: "…" }): en español, máximo 160 caracteres, sin URL ni
  dominios, sin números largos, nunca pidiendo plata, contraseñas, códigos ni contacto por fuera de
  Kino, y nunca repitiendo lo que escribió la persona (Kino la muestra como "Mensaje de <plugin>: …"
  solo si pasa todas sus reglas; un plugin que la usa para pedir plata o datos incumple las reglas y se oculta de la sección de la comunidad).
- Contenido +18: márcalo con adult: true (apiVersion 6; Kino lo muestra solo con el código +18
  desbloqueado). Nunca intentes saltarte ese candado.
- Todo lo que lee la persona, en español de Bogotá con tuteo, nunca voseo.
- Nada secreto en el código ni en el repositorio. El usuario y la contraseña de cada persona van en
  un ajuste de tipo "password". Una clave de API mía va sellada: "secrets" en el manifiesto, sellada
  con `node sdk/seal.mjs --repo USUARIO/REPO --name nombre`, y en el código kino.secret("nombre")
  (apiVersion 4).
- Las descargas son declarativas: si la fuente lo permite, agrega "download" a "capabilities"
  (apiVersion 2) y no exportes nada extra; Kino llama a resolve él mismo cuando corre la descarga.
  Se guardan películas y capítulos en archivo normal (mp4, mkv…) o en HLS que no es en vivo; lo en
  vivo, DASH y lo que tiene DRM, nunca.
- Firmar (solo si dije que sí): "apiVersion": 5 (necesita Kino 0.9.45+). Explícame con palabras
  sencillas para qué sirve y guíame: `node sdk/seal.mjs --keygen` UNA sola vez (escribe
  kino-author-key.pem), agrega `*.pem` al .gitignore ANTES de cualquier commit, y dime que guarde una
  copia de la clave y que nunca la comparta (si se pierde, todos los que instalaron el plugin tienen
  que desinstalarlo y reinstalarlo). Luego `node sdk/seal.mjs --sign --repo USUARIO/REPO` DESPUÉS del
  último cambio en plugin.js o en "version" y otra vez después de cada cambio posterior; nunca subas
  el .pem. Nunca imprimas el contenido de la clave en el chat.
- apiVersion: el más bajo que funcione (3 para canales, 4 solo para secrets, "streamHosts": "any" o un
  ajuste de tipo "list", 5 solo para un plugin firmado, 6 solo si usas algo de apiVersion 6: estados y
  botones en los ajustes, una sección propia, colores, telemetry, migrate, firma por petición,
  userMessage, adult, canales en filas de Inicio; 6 necesita Kino 0.9.50 o más nuevo). Un id nuevo y
  mío (nunca "archive-org").
- "debug": true solo mientras pruebas; quítalo antes de publicar. "telemetry" solo si yo acepto que
  los errores del plugin lleguen a Kino; registra pasos y conteos, nunca lo que escribe la persona.

Trabaja paso a paso: primero explora la fuente con peticiones reales, luego el manifiesto, luego
cada función. Después de cada paso corre `node sdk/validate.mjs .` y `node sdk/run.mjs . <función> …`
y arregla todo lo que Kino descartaría. Graba fixtures con --record y haz que
`node --test test/plugin.test.mjs` pase sin conexión. Termina con la lista de chequeo de AGENTS.md y,
antes de entregarme el plugin, corre esta autocomprobación y dime el resultado de cada línea:
- `node sdk/validate.mjs .` sale con 0 y sin problemas;
- kino-plugin.json: "entry" e "icon" sin "./" al principio; "version" subida; el apiVersion es el más
  bajo que funciona; no queda "debug": true;
- si se firma: "signature" está en kino-plugin.json, `validate.mjs` la verificó DESPUÉS de la última
  edición, y ningún .pem está rastreado (el `.gitignore` tiene *.pem);
- cada host (video, subtítulos, segmentos, redirecciones) está en "hosts" o cubierto por un campo "any";
- para que lo encuentren: el repositorio es público y no es un fork, el topic kino-plugin está puesto,
  y el manifiesto tiene un "name" y una "description" en español.

Al final, llévame de la mano:
1. Publicarlo: repositorio público (nunca fork) con los archivos en la raíz; el topic kino-plugin y
   una descripción en GitHub (About → ⚙ → Description y Topics → Save changes, o
   `gh repo edit USUARIO/REPO --add-topic kino-plugin --description "…"`); y un "name" y una
   "description" buenos, en español, en kino-plugin.json, porque eso es lo que la gente ve en Kino.
2. Instalarlo en Kino: en el celular, menú ☰ → Plugins → botón +; en el televisor, Ajustes →
   Plugins → Agregar. Escribir USUARIO/REPO → Agregar → leer la hoja → Instalar (y Configurar si
   pide datos).
3. Qué probar a mano en Kino y qué hacer si algo falla.
```

## Un ejemplo lleno { #example }

Así queda la parte "Lo que quiero" para una fuente pública y sencilla. Cópiala en lugar de la del
prompt si quieres ensayar el camino completo antes de hacer el tuyo:

```text
Lo que quiero:
- Fuente: https://archive.org, solo la colección de cine negro (https://archive.org/details/Film_Noir)
- Contenido: películas; en inglés
- Acceso: ninguno
- Qué le pregunta Kino a la persona al configurarlo: nada
- Descargas para ver sin conexión: sí
- Nombre en Kino y una descripción corta: "Cine negro": "Películas clásicas de cine negro de archive.org, de dominio público. No pide cuenta."
- Mi usuario de GitHub: mi-usuario
```

## Que Kino encuentre tu plugin { #listed }

Instalarlo escribiendo la dirección funciona desde el primer momento. Para que además salga solo en
Kino, en "De la comunidad" (Plugins → Recomendados), el repositorio tiene que:

1. ser **público** y **no un fork** (créalo con "Use this template");
2. tener `kino-plugin.json` en la raíz, válido para `node sdk/validate.mjs .`, con un `name` y una
   `description` en español (es lo que muestra la tarjeta);
3. tener el topic **`kino-plugin`** (About → ⚙ → Topics) y, mejor, una descripción en GitHub;
4. estar entre los 30 con más estrellas del topic.

Cada dispositivo busca de nuevo cada 12 horas, o al tocar "Actualizar". Los clics exactos y cómo
comprobarlo: [Aparecer en Kino](listed.md).

## Plugins firmados { #signed }

Si quieres que la gente sepa que cada actualización viene de ti, pide un [plugin firmado](signed.md)
(`"apiVersion": 5`, Kino 0.9.45+): creas una clave una vez, el asistente firma `plugin.js` con ella
después de cada cambio, y Kino comprueba la firma al instalar y en cada actualización. La clave
privada se queda en tu computador: **nunca** debe llegar a GitHub (`*.pem` en el `.gitignore`), y
conviene que hagas una copia de seguridad, porque si se pierde, todos los que instalaron el plugin
tienen que desinstalarlo y reinstalarlo. Es opcional: un plugin sin firma funciona igual.
[Lee la página completa](signed.md).

## Si algo falla { #troubleshooting }

Pégale al asistente **el texto completo** que salió en la terminal (no un resumen) y dile qué
esperabas. Algunos casos comunes:

| Lo que ves | Qué hacer |
| --- | --- |
| `node: command not found`, "node no se reconoce…" | Node no está instalado, o abriste la terminal antes de instalarlo: instálalo y abre una terminal nueva. |
| `✗ kino-plugin.json: …` | El manifiesto rompe una regla; el mensaje es el mismo que da Kino. Pídele al asistente que lo arregle según AGENTS.md. |
| `[dropped by Kino] …` | Kino descartaría esos resultados. Pregúntale qué regla de [el contrato](contract.md) rompen, en vez de aceptar un parche a ciegas. |
| `[host_not_allowed] …` | Un host que falta en `hosts`: que lo declare. |
| `El campo "entry" debe ser una ruta relativa a un archivo .js` (Kino) o `Quita el "./" del campo "entry"` (kit) | `"entry"` (o `"icon"`) empieza con `./`. Escribe `"plugin.js"`: Kino 0.9.45 y anteriores rechazan el `./` ([por qué](manifest.md#entry-dot-slash)). |
| `La firma del autor no es válida…` | El plugin está [firmado](signed.md) y `plugin.js` o `version` cambiaron después de firmar: corre otra vez `node sdk/seal.mjs --sign --repo owner/repo`. |
| `[timeout] …` | La fuente es lenta o hay demasiadas peticiones: que haga menos peticiones por llamada. |
| Funciona en el kit pero falla en Kino | El kit de Node es más permisivo que la app ([lo que no reproduce](test-locally.md#differences)): globales que faltan, un `throw` antes del primer `await`, `kino.html.select`. Dale al asistente el mensaje exacto que muestra Kino (o una foto de la pantalla). |
| Kino dice "Configura … en Ajustes ▸ Plugins" | El plugin necesita datos: toca el botón Configurar del mensaje, o ve a Plugins → Instalados → tu plugin → Configurar. |
| No sale en "De la comunidad" | Revisa [Aparecer en Kino](listed.md). |

**Registros de Kino** (para quien tenga un computador conectado al celular con `adb`):
`adb logcat -s KinoPlugin` muestra lo que escribe el plugin con `kino.log`. Nunca pegues contraseñas
ni claves en el chat.

## Consejos { #tips }

- **Dale una terminal al asistente.** El kit solo ayuda si el asistente puede ejecutar
  `node sdk/validate.mjs .` y `node sdk/run.mjs …` y leer lo que imprimen.
- **Pruébalo en la app.** El kit de Node es más permisivo que Kino
  ([lo que no reproduce](test-locally.md#differences)): instala el plugin y revisa que busque, liste
  capítulos, reproduzca (y descargue, si lo declaraste) antes de compartirlo.
- **Pide las razones.** Cuando el kit reporte un ítem descartado, pregúntale al asistente qué regla de
  [el contrato](contract.md) rompió, en vez de aceptar un parche.
- **Sube la versión en cada cambio.** Kino solo instala una actualización si `version` es mayor
  ([Publicar](publish.md#updates)).
- **Ojo con los derechos.** Un plugin solo puede llegar a lo que la persona igual podría ver; no le
  pidas a un asistente que se salte un muro de pago, un login o un DRM.
