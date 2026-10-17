# Aplicaciones resolutoras externas { #resolver }

Todo lo demás de esta guía corre dentro del sandbox de Kino: un plugin lee un sitio, una API JSON o tu propio
servidor y le entrega a Kino una URL. Hay fuentes que no se pueden convertir en una URL así. Necesitan un
programa de verdad en el aparato: un motor de descargas, una tubería de medios que convierte un formato que el
celular no decodifica, un ayudante que habla un protocolo al que el sandbox no llega. Kino no trae esos
programas ni sabe cómo funciona ninguno. Lo que tiene es un **protocolo abierto** pequeño: un plugin dice *qué*
encontró, y una app de Android instalada por separado, un **resolutor externo**, lo convierte en algo que Kino
puede reproducir.

Esta página es para tres lectores: quien escribe un plugin y quiere usar un resolutor, quien quiere construir
uno y quien necesita saber qué esperar. Requiere `"apiVersion": 11` (Kino 0.9.66) y la capacidad
`externalResolve`.

## Qué es y qué no es { #what }

- **Es** un salto más en la vida de un `resolve()`: tu plugin responde `{ external: { protocol, ref } }` en vez
  de una `url`; Kino le pasa `protocol` y `ref` a una app instalada que dice atender `protocol`; esa app
  responde con el mismo tipo de objeto que responde un plugin (`url`, `headers`, `subtitles`, `mime`... más
  `media` y `portable`); Kino reproduce eso.
- **No es** una forma de llegar a otra app en general, una API de plugins ni una puerta trasera a las reglas de
  hosts: Kino nunca le manda a la app nada más que `protocol` y `ref`, nunca amplía los hosts aprobados de tu
  plugin por eso, y la app no sabe de qué plugin, título o persona se trata más allá de lo que pongas en `ref`.
- **No es parte de Kino.** El código de Kino nunca ramifica según el valor de `protocol` y no hay registro de
  nombres: un nombre de protocolo es una cadena que un plugin y un resolutor acuerdan por convención
  (`my-protocol` en los ejemplos). Quién construye el resolutor, de dónde saca su contenido y si tú puedes usarlo
  para el tuyo es asunto tuyo y de su autor.
- **No está garantizado que exista.** Nada asegura que haya una app instalada ([qué esperar](#expect)).

## Quién hace qué { #roles }

| Pieza | Hace | Nunca hace |
| --- | --- | --- |
| **Tu plugin** | Encuentra el título, produce un `ref` opaco, responde `{ external: { protocol, ref } }` (y puede nombrar la app: `resolver`, o el `externalResolver` del manifiesto). | Ver la app, su respuesta ni cómo se reprodujo. |
| **Kino** | Busca la app, le pregunta a la persona una vez, la enlaza, muestra el progreso en vivo con *Cancelar*, valida la respuesta con las mismas reglas que las de un plugin, la reproduce (y la envía a la TV) y le muestra a la persona un error legible. | Interpretar `ref`, ampliar tus hosts, reintentar un fallo que la app explicó, pedirle a una app una descarga, una precarga o un refresco en segundo plano. |
| **La app resolutora** | Hace el trabajo real, mantiene vivo su propio servidor mientras el reproductor lee, responde `onResult` / `onError` y puede explicar por qué falló una petición posterior. | Correr en el sandbox de Kino ni hablar con tu plugin. |

## El flujo, paso a paso { #flow }

```
plugin  resolve("title-42")  ->  { external: { protocol: "my-protocol", ref: "<opaco>", resolver?: "com.example.resolver" } }
Kino    busca una app que declare "my-protocol"; la primera vez: le pregunta a la persona (Permitir / No permitir)
Kino    enlaza el servicio de la app  ->  IExternalResolver.resolve("my-protocol", "<opaco>", callback)
app     onProgress(40, "Preparando...")  ...  Kino muestra "Abriendo con <app>" con una barra y Cancelar
app     onResult(json)  o  onError(code, message)         (exactamente uno; el límite de Kino es 120 s para toda la llamada)
Kino    valida el json como una respuesta de plugin, desenlaza de inmediato, reproduce la url
player  lee la url mientras la app sigue sirviendo (un servicio en primer plano)
```

1. **La respuesta.** `external` puede ser toda la respuesta de `resolve()` (entonces `url` puede faltar) o una
   entrada de las `alternatives` de un Stream, junto a una copia concreta `{ url }` o una perezosa `{ ref }`
   ([copias con etiqueta y perezosas](contract.md#lazy-copies)). `protocol` tiene de 1 a 64 caracteres de
   `a-z 0-9 . _ -`; `ref` tiene de 1 a 2048 caracteres sin caracteres de control; `resolver` es un nombre de
   paquete de Android. Un plugin por debajo de `apiVersion` 11, o que no declara `externalResolve`, tiene su
   `external` ignorado y falla como una respuesta sin `url`. Un `external` mal formado se descarta, nunca se
   lee a medias.
2. **Buscar la app.** Una app instalada es candidata cuando su manifiesto declara un `<service>` con la acción
   `com.arkiv.player.action.RESOLVE_EXTERNAL` y un `<meta-data
   android:name="com.arkiv.player.meta.RESOLVER_PROTOCOLS" android:value="my-protocol,another">` que nombra
   `protocol`. Cuando `resolver` (o el `externalResolver.package` del manifiesto) está puesto, solo esa app es
   candidata; si no está instalada, Kino lo dice o ofrece su descarga ([más abajo](#expect)).
3. **Consentimiento.** La primera vez se le pregunta a la persona, nombrando tu plugin y la app, y se le avisa
   que la app no es de Kino. La respuesta se guarda por *(plugin, protocolo, app)*, vale de ahí en adelante y se
   puede revocar en Ajustes, en la sección "Fuentes externas". Con más de una candidata y sin `resolver`, la
   persona elige ("Elige qué aplicación usar") y esa elección se recuerda como la misma decisión; Kino
   vuelve a preguntar solo cuando se vuelve ambigua. Un "no" también se recuerda: ese título dice entonces
   "No autorizaste resolver este contenido con ...". Es el único consentimiento: la hoja de instalación de tu
   plugin no cambia por `externalResolve`.
4. **Enlazar y llamar.** Kino enlaza el servicio y llama `resolve(protocol, ref, callback)`. Una llamada a la
   vez por enlace. La app responde con cualquier cantidad de `onProgress(percent, message)` y después con
   exactamente uno de `onResult(json)` / `onError(code, message)`.
5. **Progreso.** Kino muestra el último `onProgress` en vivo: `percent` de 0 a 100 como barra (cualquier otro
   valor significa "indeterminado"), `message` como una línea corta (espacios colapsados, caracteres de control
   fuera, cortada a 80 caracteres; vacío muestra el "Buscando..." de Kino). La persona puede pulsar *Cancelar*
   o salir del reproductor: Kino llama `cancel()`, desenlaza e ignora lo que la app mande después.
6. **El plazo.** Pasados 120 s Kino llama `cancel()` y reporta `timeout`.
7. **El resultado.** El JSON de `onResult` lo valida el mismo código que valida la respuesta de `resolve()` de un
   plugin. Solo se diferencia en los hosts ([más abajo](#answer)), en que **se rechaza el DRM** y en que un
   segundo `external` dentro es `bad_response`: un solo salto, nunca una cadena.
8. **Después de la respuesta.** Kino desenlaza de inmediato. La app tiene que mantenerse viva (un servicio en
   primer plano) mientras el reproductor lea de la URL. Si tiene que rechazar una petición posterior, explica
   por qué en una cabecera de la respuesta ([errores](#errors)).

## Qué puede hacer una app resolutora { #can }

Cualquier cosa que termine en una URL que Kino pueda reproducir, por ejemplo:

- **Servir contenido que va trayendo mientras el reproductor lee.** Un ayudante que descarga mientras ves y
  responde con una URL de su propio servidor en el aparato (el caso de [loopback](#loopback)).
- **Convertir lo que el aparato no puede abrir.** Un video de 10 bits, un contenedor raro o un códec de audio
  que nadie decodifica se puede responder como un HLS de H.264 de 8 bits y AAC, producido bajo demanda, para que
  el reproductor igual tenga imagen y sonido.
- **Agregar pistas.** `subtitles` y `audioTracks` en la respuesta o, en un HLS, las renditions que el propio
  manifiesto lista (`#EXT-X-MEDIA`).
- **Describir el archivo.** [`media`](#media) dice qué contiene el archivo, para que Kino lo muestre y lo use de
  pista.
- **Ofrecer una copia universal para TV.** [`portable`](#portable).
- **Explicar los fallos** con una frase que la persona lee, antes de la respuesta (`onError`) y después
  (`X-Resolver-Error`).

Lo que no puede hacer: cambiar los hosts aprobados de tu plugin, pedirle algo a la persona a través de Kino,
llegar a otros plugins, devolver DRM ni que se le pida algo fuera de cuando una persona le da reproducir.

## La respuesta { #answer }

`onResult` lleva el mismo JSON que [la respuesta de `resolve()` de un plugin](contract.md#stream):

| Campo | Notas |
| --- | --- |
| `url` | El video. Obligatorio. Mira *Hosts* abajo. |
| `mime`, `headers`, `subtitles`, `audioTracks`, `durationMs`, `expiresInSeconds` | Como en un plugin; las URL de `subtitles` y de las pistas de audio se revisan como `url`. |
| `media` | Opcional, informativo: qué contiene el archivo ([abajo](#media)). |
| `portable` | Opcional: una copia HLS universal del mismo video ([abajo](#portable)). |
| `drm`, `external` | Rechazados (`bad_response`). |

**Hosts.** La `url` vino de la app, no de tu plugin, así que tus hosts declarados no aplican: se acepta
cualquier host público, por `https` o `http`, para el video, sus subtítulos y pistas de audio y todo lo que su
manifiesto nombre mientras se reproduce; nunca una dirección de la red de la casa, un nombre local ni una IP
privada. Ese permiso es de esta única reproducción y nunca se agrega a los hosts aprobados de tu plugin; Kino
nunca le pide a la persona que los amplíe por eso.

### El origen loopback { #loopback }

Una app que tiene el contenido en el aparato puede responder con la URL de su propio servidor:
`http://127.0.0.1:<puerto>/...`, http plano, host exactamente `127.0.0.1`, puerto 1024 o mayor, sin
credenciales. Ese único origen, tomado de esta misma respuesta, se acepta para esa reproducción (nunca
`localhost`, otra dirección, IPv6, https en loopback ni un puerto bajo; una redirección desde otro lado hacia él
se rechaza). Pon un token imposible de adivinar en la ruta: cualquier app del aparato puede llegar a loopback. El
servidor debe responder `GET` y `HEAD` con `Range` (así busca el reproductor).

### `media` { #media }

Opcional e informativo; la respuesta de `resolve()` de un plugin puede llevar el mismo objeto (mira
[Las reglas del `Stream`](contract.md#stream)). Todos los campos son opcionales y se limpian: texto de una línea
cortado a 120 caracteres (`codec`/`container` 40, `language` 20), números acotados, como máximo 16 pistas y 4
`notes`; un objeto sin nada útil se descarta, nunca es un error.

```json
"media": {
  "title": "Movie.mkv", "sizeBytes": 1234567890, "container": "matroska,webm",
  "video": { "codec": "h264", "profile": "High 10", "width": 1920, "height": 1080, "fps": 23.976, "bitDepth": 10, "hdr": false },
  "audio": [ { "codec": "eac3", "channels": 6, "language": "eng", "title": "Original", "default": true } ],
  "subtitles": [ { "codec": "subrip", "language": "eng", "title": "", "text": true } ],
  "converted": true, "notes": ["no decoder for H.264 High 10 on this device"]
}
```

Las pistas son las *del archivo*, la app las haya convertido o no para el reproductor (`converted`). Kino
registra un resumen (códecs y cantidades, nunca un título ni una nota), lleva `media` hasta el reproductor y puede
usarlo de pista cuando decide cómo enviar a la TV. Nunca se fía de él para nada que pueda perjudicar a la
persona. Mostrárselo a la persona todavía no está hecho.

### `portable` { #portable }

`{ "url": "...", "mime": "application/x-mpegURL" }`: **una versión universal del mismo video**, que la app puede
fabricar bajo demanda y que reproduce cualquier receptor de TV: HLS, H.264 de 8 bits hasta 1080p, AAC estéreo,
sus pistas de audio y subtítulos de texto como renditions HLS. No debe costar nada hasta que algo la lea. Se
revisa como `url`; un `mime` que no sea HLS, o una URL que no pase las revisiones, descarta el `portable` y
conserva el resto de la respuesta. Se ignora junto a DRM o a la firma por petición. El reproductor del celular
nunca la usa.

## Errores que lee la persona { #errors }

| Cuándo | Qué manda la app | Qué ve la persona |
| --- | --- | --- |
| Antes de la respuesta | `onError(code, message)`, con `code` uno de `unavailable`, `timeout`, `cancelled`, `unsupported`, `bad_response`, `other` (cualquier otro se lee como `other`) | "No se pudo resolver este contenido (`code`): `message`." El mensaje es la frase de la propia app, limpiada a una línea de 120 caracteres como máximo y mostrada como palabras de la app: que sea corta y clara. |
| Después de la respuesta, cuando su servidor no puede atender una petición | Un HTTP 4xx/5xx con la cabecera `X-Resolver-Error: <code>; <message>` (ASCII, 120 caracteres como máximo) | La línea de error del reproductor "La aplicación que ofrece este video dijo: `message`", y Kino no lo reintenta. Solo se leen así las respuestas de este origen. |
| Fallos propios de Kino | Nada | Solo el código: "No se pudo resolver este contenido (`unavailable`)" cuando no se puede enlazar la app, `timeout` pasados 120 s, `bad_response` para un JSON que no pasa las revisiones. Su detalle en inglés va al registro, nunca a la pantalla. |
| Sin app, una negativa, la app elegida ya no está | Nada | "Este contenido necesita una aplicación externa que no tienes instalada.", "No autorizaste resolver este contenido con ...", "La aplicación que elegiste ya no está instalada." |

## Enviar a la TV un título de un resolutor { #cast }

Una TV nunca puede llegar a `127.0.0.1`, así que un título de un resolutor jamás se le entrega a la TV por su
propia URL. Kino lo sirve por su propio proxy de cast en el celular, que lee el origen del resolutor y le da a la
TV una URL con token en la red local ([Enviar a la TV](what-people-see.md#cast)). Eso significa:

- el servidor de la app debe responder `GET` y `HEAD` con `Range`; cada lectura que pasa por el proxy le llega
  como una petición normal (así mantiene viva su cuenta de inactividad);
- una respuesta HLS se reescribe para el receptor, renditions incluidas (audio `#EXT-X-MEDIA` y subtítulos
  WebVTT), y un archivo progresivo va como cualquier archivo de un plugin (el proxy, o el remux del celular
  cuando el método de envío lo pide);
- cuando la ruta propia del título exigiría una conversión, o `media` dice que el video no es algo que un
  receptor tome tal cual (no es H.264, tiene más de 8 bits, supera 1080p, es HDR, o su audio principal es DTS o
  TrueHD) y el stream no es ya una conversión, Kino envía en su lugar la copia **`portable`** de la app, si
  ofreció una. El celular sigue reproduciendo el título por su cuenta;
- un título con DRM, firma por petición, un canal en vivo o música nunca usa `portable`.

Esto está cubierto por las pruebas de Kino con un resolutor falso. **Todavía no se ha probado con un Chromecast
ni un receptor DLNA reales**, así que espera asperezas hasta entonces: si un receptor acepta el HLS reescrito
con sus renditions de subtítulos, buscar desde la TV y una app que sobreviva a que se apague la pantalla del
celular son las preguntas abiertas.

## Qué esperar { #expect }

- **Puede que no haya ninguna app instalada.** Tu plugin no se entera. La persona lee "Este contenido necesita
  una aplicación externa que no tienes instalada." (o, cuando tu manifiesto nombra la app con un `apk`, se le
  ofrece descargarla). Di en tu descripción que tu plugin la necesita y dale una alternativa real cuando
  puedas: una `url` que tu propio código pueda producir, dejando `external` en una de varias `alternatives`.
- **Solo mientras la persona reproduce.** Nunca para una precarga, un refresco en segundo plano ni una
  descarga: un título resuelto de forma externa dice que solo se puede reproducir ("Este contenido lo abre una
  aplicación externa: solo se puede reproducir.").
- **120 segundos** para toda la llamada, un solo salto, nunca DRM.
- **Cada app es decisión de la persona, no tuya.** Puede decir que no, elegir otra o revocar después.
- **Nunca sabes qué app lo atendió ni cómo.** O el stream se reproduce, o `resolve` falla como cualquier otro
  fallo.
- **Ofrecer la descarga.** Cuando el [`externalResolver`](manifest.md#external-resolver) de tu manifiesto trae
  un `apk` (`url` de un archivo de un release de GitHub, `sha256`, `label` opcional) y falta la app, Kino
  muestra una hoja: puede descargarla de GitHub, comprueba que el archivo tenga exactamente ese `sha256` (si no,
  lo borra y no ofrece nada) y se lo entrega al instalador de Android, que le pregunta a la persona como con
  cualquier app. Kino no comprueba quién la firmó ni la ha revisado; la hoja lo dice.

## Usar un resolutor desde tu plugin { #use }

1. **Manifiesto:** `"apiVersion": 11`, `"externalResolve"` en `capabilities` y, para nombrar la app,
   `externalResolver`:

   ```json
   {
     "apiVersion": 11,
     "capabilities": ["search", "home", "resolve", "externalResolve"],
     "externalResolver": {
       "package": "com.example.resolver",
       "apk": { "url": "https://github.com/example/resolver/releases/download/v1.0.0/resolver.apk", "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "label": "My Resolver" }
     }
   }
   ```

   `hosts` sigue siendo el conjunto de sitios a los que llega *tu* código (tu catálogo), no a los que llega el
   resolutor. Un manifiesto debe nombrar al menos uno, aunque el plugin no use la red.
2. **`resolve(ref)`** responde el traspaso:

   ```js
   export async function resolve(ref) {
     const entry = CATALOG[ref];
     if (!entry) throw kino.error("not_found", "ya no está");
     return { external: { protocol: "my-protocol", ref: entry.reference } };   // agrega resolver: "com.example.resolver" para forzar esa app
   }
   ```

3. **Varias copias** (calidades, versiones): como `alternatives`, cada copia perezosa `{ label, ref }` que
   resuelve tu propio `resolve` y responde `external` otra vez, o una entrada `{ external, label }` directa
   ([copias con etiqueta y perezosas](contract.md#lazy-copies)). La persona pasa a la siguiente copia cuando una
   falla.
4. **Prueba sin red** con el kit: `node sdk/run.mjs . resolve <ref>` aplica las reglas de salida de Kino, así
   que ves si tu `external` sobrevive (se ignora sin `apiVersion` 11 y la capacidad) y cómo quedan `media` y
   `portable`. El kit no puede correr una app resolutora: para ver todo el traspaso necesitas la app instalada
   en un aparato ([Probar en local](test-locally.md)).

## Construir un resolutor { #build }

El otro lado es una app de Android con un servicio enlazado. El contrato es pequeño:

```aidl
package com.arkiv.player.resolver.contract;

interface IExternalResolver {
    /** protocol: 1..64 chars [a-z0-9._-]+. ref: 1..2048 chars, opaque. At most one resolve() in flight per binding. */
    oneway void resolve(String protocol, String ref, IExternalResolverCallback callback);
    /** Best effort: whatever resolve() is running ends with onError("cancelled", ...). */
    oneway void cancel();
}

interface IExternalResolverCallback {
    /** Zero or more times. percent: -1 = indeterminate, else 0..100. message: shown verbatim, trusted only as display text. */
    oneway void onProgress(int percent, String message);
    /** Exactly one of onResult/onError ends a resolve() call. */
    oneway void onResult(String resultJson);
    /** code: one of "unavailable","timeout","cancelled","unsupported","bad_response","other". */
    oneway void onError(String code, String message);
}
```

Declara el servicio para que Kino lo encuentre:

```xml
<service android:name=".MyResolverService" android:exported="true" android:foregroundServiceType="dataSync">
  <intent-filter><action android:name="com.arkiv.player.action.RESOLVE_EXTERNAL" /></intent-filter>
  <meta-data android:name="com.arkiv.player.meta.RESOLVER_PROTOCOLS" android:value="my-protocol" />
</service>
```

En resumen: implementa `resolve(protocol, ref, callback)` fuera del hilo del binder (responde rápido con
progreso, termina con exactamente un `onResult` o `onError`), mantén vivo tu servidor en un servicio en primer
plano mientras el reproductor lee, responde `Range` y `HEAD`, pon un token imposible de adivinar en tus URL,
responde a una petición que no puedes atender con un error HTTP y un `X-Resolver-Error: <code>; <message>`
legible, y devuelve la misma URL cuando se resuelve de nuevo el mismo contenido (un reproductor que aún tiene
la URL vieja no debe quedarse en una muerta). El protocolo es abierto: nada comprueba quién firmó tu app y
cualquiera puede implementarlo. El contrato completo a nivel de cable, con todos los límites, está en
`resolver-contract/PROTOCOL.md` del repositorio de código de Kino.

## Modelo de seguridad { #security }

- El protocolo es **abierto**: nada comprueba quién firmó la otra app y cualquiera puede implementarlo. El
  consentimiento por app de la persona y el aviso de instalación de Android son las decisiones de confianza.
- Kino le manda a la app solo `protocol` y `ref`, y solo después del consentimiento.
- El texto de la app llega a la pantalla solo como una línea limpia y acotada; sus códigos están en una lista
  cerrada.
- Sus URL pasan las revisiones de una respuesta de plugin; la única dirección local que se acepta es el origen
  loopback de esa respuesta, para esa reproducción, para la primera petición (nunca como destino de una
  redirección).
- Se rechazan el DRM y las cadenas; un fallo nunca se reintenta una vez que la app lo explicó.

## Preguntas frecuentes { #faq }

**¿Mi plugin puede comprobar que hay un resolutor instalado?** No. Kino se lo dice a la persona; tu plugin no se
entera. Ten una alternativa.

**¿El resolutor ve los ajustes o secretos de mi plugin?** No. Recibe `protocol` y `ref`, nada más.

**¿Un mismo `ref` puede servir a varias apps?** Solo por convención: `ref` es tuyo y el nombre del protocolo es
una cadena que compartes con quien construye la app. Nombra la app en `externalResolver` cuando solo sirva una.

**¿Por qué la `url` puede ser `http://127.0.0.1:...`?** Porque una app que sirve el contenido desde el aparato lo
necesita; se acepta para esa única respuesta, con un token imposible de adivinar en la ruta, y para nada más.

**¿Se envía a la TV?** Por el proxy de Kino, sí en el código y en sus pruebas; los receptores reales todavía no
se han probado ([arriba](#cast)).

**¿Dónde veo lo que dijo `media`?** En el registro de Kino, como un resumen de una línea. Una pantalla para eso
todavía no está hecha.
