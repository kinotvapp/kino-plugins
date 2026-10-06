# Límites y trampas del motor

## Todos los números en un solo lugar { #limits }

| Qué | Límite |
| --- | --- |
| Manifiesto / archivo de entrada / ícono | 16 KB / 1 MB / 128 KB |
| Memoria / pila, por plugin | 64 MB / 1 MB |
| Tiempo por llamada | `search` 15 s; `home`, `browse`, `episodes`, `resolve` 20 s cada una (`resolve` de un plugin que genera el propio Kino, desde un scraper de Nuvio o un addon de Stremio: 75 s); `liveCategories`, `liveChannels`, `guide` 20 s cada una; `liveSearch` 15 s; `subtitles` 10 s; `track` 10 s (apiVersion 7); `segments` 8 s (apiVersion 7); `meta` 6 s (apiVersion 6; pasado ese tiempo, no hay respuesta); `section`, `categories` 20 s cada una (apiVersion 6); `migrate` 10 s; `settingsStatus` 10 s, `action` 30 s, `validateSettings` 20 s; `sign` 1,5 s (y 3 s contando su espera); cuentan todos tus fetch y sleep juntos, pero no el tiempo que la persona tarda en responder una pregunta de host de esa llamada |
| Cargar el módulo (su nivel superior) | 10 s |
| Sandbox inactivo | se cierra después de 5 minutos sin llamadas |
| Tiempos agotados seguidos | 3 seguidos y Kino desactiva el plugin ("No responde") |
| `kino.fetch` | solo https (o el servidor propio de la persona tal como lo escribió, o `http` en un host declarado `insecureHttp`); 15 s por defecto, 30 s máximo; cuerpo de la respuesta máximo 5 MB; la petición (URL, headers y cuerpo) máximo 1.048.576 caracteres; máximo 60 peticiones por llamada, contando cada salto, también los rechazados (250 para un plugin convertido desde un scraper de Nuvio); máximo 6 peticiones al mismo tiempo; máximo 3 preguntas de host por llamada; máximo 10 redirecciones por petición |
| Cookies | 50 por dominio, 64 KB en total por plugin |
| `kino.storage` | 256 KB por plugin; el `ttlMs` opcional de una entrada va de 1 a 2.592.000.000 ms (30 días) |
| `kino.sleep` | de 0 a 5.000 ms por llamada |
| `kino.meta` (Kino 0.9.53) | máximo 30 llamadas por minuto por plugin; como mucho 8 s (cada uno de los otros plugins `meta`, 6 s), dentro del límite de tu propia llamada; la consulta máximo 4.096 caracteres; la respuesta máximo 1.000.000 de caracteres; en caché 30 minutos |
| `kino.tmdb` (Kino 0.9.53) | máximo 40 llamadas cada 10 s por plugin; con la llave propia de Kino máximo 20 cada 10 s por plugin y 60 cada 10 s entre todos los plugins (después la llave de la persona, si no la caché o `rate_limited`); 15 s por llamada; un cuerpo de máximo 2 MB; máximo 20 parámetros de máximo 500 caracteres; en caché 10 minutos (cuerpos de hasta 512 KB); no cuenta en las peticiones por llamada de `kino.fetch` |
| `kino.crypto` | datos de máximo 5 MB por llamada; PBKDF2 máximo 100.000 iteraciones y llaves de 64 bytes; `randomBytes` máximo 1.024 |
| `kino.log` / `console.*` | 2.000 caracteres por mensaje; cuando falla una llamada de un plugin cuyo manifiesto declara `telemetry`, sus últimas 30 líneas (cada una cortada a 300 caracteres, depuradas, 2.048 caracteres en total) van con el reporte de la falla |
| Lo que devuelve una función | máximo 2.000.000 caracteres ya convertido a JSON |
| Resultados | `search` 100 ítems; `home` 20 filas de 60; `browse` 100 por página; `episodes` 5.000 (y 50 `seasons`); `ref` 4.096 caracteres; `next` 2.048 caracteres; `id` cumple `^[A-Za-z0-9._~-]{1,128}$` |
| Canales en vivo (apiVersion 3) | `liveCategories` 200; `liveChannels` 500 por página, 10 páginas al comienzo y 5 más por desplazamiento, 10.000 canales (200 páginas) por categoría; `liveSearch` 100 canales, pedido desde 2 caracteres; `guide` 50 canales y 24 h por llamada, 100 entradas por canal; `number` 1..9999 |
| Seguimiento (apiVersion 7) | `progress` como mucho cada 5 minutos de reproducción; `watched` una vez, con 3 minutos o menos por delante y al menos el 90 % visto; máximo 200 eventos en espera por plugin; un evento sin entregar en 7 días se descarta; una falla reintentable espera 30 s, duplicando hasta 6 h, máximo 12 intentos |
| Ajustes | máximo 12 con valor, más máximo 16 `section`/`status`/`action` (apiVersion 6); `text` 500, `url` 2.048, `password` 500 caracteres |
| Mensajes de error | tu mensaje de `kino.error` es un detalle para el log, cortado a 200 caracteres; un `userMessage` para la persona tiene máximo 160 |
| `hosts` | al menos 1 entrada, sin límite máximo desde Kino 0.9.45 (solo lo acota el manifiesto de 16 KB; Kino 0.9.44 y anteriores rechazan más de 20); desde apiVersion 2, ninguna (`[]`) cuando hay un ajuste `url` |
| `secrets` (apiVersion 4) | máximo 16; los nombres cumplen `^[A-Za-z][A-Za-z0-9_]{0,31}$`; un valor tiene de 1 a 4.096 bytes (de 1 a 8.192 desde apiVersion 6); desde apiVersion 6 una llave de cifrado puede tener tipo: `{ seal, use: "cipher-key", encoding: "hex" | "base64" }`, de 16/24/32 bytes |

Desde apiVersion 6, además:

| Qué | Límite |
| --- | --- |
| Stream | `alternatives` 8 (perezosas y concretas juntas); `label` 48 caracteres; `ref` de una copia perezosa 512 caracteres; `alternateHosts` 6; `signContext` 4.096 caracteres; 3 reintentos de `resolve` por reproducción firmada |
| Copias perezosas | el cambio automático espera máximo 20 s el `resolve` de una copia; una copia que la persona escogió tiene todo el límite de `resolve`; la elección de copia de una descarga prueba dentro de 30 s en total |
| Navegador oculto (`"browser": true` o `"pages"`) | `resolve` 75 s; una página a la vez en toda la app; `kino.browser.capture` `timeoutMs` 1..25.000 (18.000 por defecto), máximo 8 media y 10 subtítulos, 12 encabezados por media; `kino.browser.page` (solo `"pages"`) `timeoutMs` 1..25.000 (15.000 por defecto), 20 lecturas por minuto por plugin, HTML de máximo 2.000.000 caracteres. Ver [Navegador oculto](browser.md) |
| `subtitles()` (cualquier apiVersion) | 10 s; se conservan 30 pistas, se listan 15 por plugin; `label` 60 caracteres |
| `meta()` | 6 s por plugin; la primera respuesta en orden de instalación se guarda 30 minutos; desde Kino 0.9.51, `ratings` 6 (una por fuente), `cast` 20 (`name` y `character` de 60 caracteres) |
| `segments()` (apiVersion 7) | 8 s, y Kino espera máximo 12 s; se leen 100 entradas y se conservan 10; cada una de al menos 1 s, con un final de máximo 5 s pasado de la duración; respuesta guardada en la sesión por título, capítulo y duración (10 s); reintento tras 2 minutos si fallaron todos. Ver [`segments`](contract.md#segments) |
| Formulario de ajustes | `settingsStatus` 10 s, `action` 30 s, `validateSettings` 20 s; `status` 200 caracteres, `message` de una acción 300, `confirm` 120, error de un campo 200; `clearSettings` 12 claves |
| Campos de ajustes (cualquier apiVersion) | `key` `^[a-z][a-zA-Z0-9_]{0,31}$`; `label` 40 caracteres; `hint` 80 (300 en una `section` desde Kino 0.9.51); `select` de 1 a 20 `options`, cada `value` y `label` de 40; `list` (apiVersion 4) `max` de 1 a 50 entradas (20 por defecto), de 1 a 4 `fields` de tipo `text` o `url`. Ver [Formulario de ajustes](settings-form.md#types) |
| Sección y categorías | etiqueta de la sección 20 caracteres; 8 pestañas de 24 caracteres; texto del destacado 300; `categories` 24 mosaicos con títulos de 40 caracteres |
| `kino.crypto`, pares de llaves | 64 llaves privadas vivas por runtime; firma de máximo 512 bytes |
| `kino.log.report` | un reporte por plugin y área por hora, 3 por plugin hasta que Kino se reinicia; área de máximo 24 caracteres |
| `telemetry: "verbose"` | 60 eventos por plugin hasta que Kino se reinicia, uno por minuto por área |

Desde Kino 0.9.54, además:

| Qué | Límite |
| --- | --- |
| `details()` (apiVersion 8) | 20 s; puede leer páginas con `kino.browser.page`. Ver [Los detalles propios de un título](contract.md#details) |
| Ítems de audio (apiVersion 8) | `artist` de máximo 200 caracteres; los ítems `music` y `podcast` cuentan en los mismos tamaños de fila y de página que cualquier ítem. Ver [Música y podcasts](contract.md#music-podcasts) |
| `kino.browser.capture` con `captureAll` (comprueba `kino.browser.captureAll`) | máximo 20 peticiones, termina 1 s después de que nada nuevo coincide; `alsoMatch` de 1 a 10 patrones de 1 a 500 caracteres; máximo 64 encabezados por petición; `cookies` máximo 64, 16.384 caracteres en total. Ver [Todas las coincidencias, una cookie, una respuesta al acabarse el tiempo](browser.md#capture-all) |

## Cómo vive tu código { #lifecycle }

- **Una llamada a la vez.** Las llamadas a un mismo plugin corren una detrás de otra. El sandbox se
  reutiliza entre llamadas, pero Kino lo bota después de 5 minutos inactivo, después de un tiempo
  agotado, cuando se cancela una llamada (por ejemplo, una búsqueda nueva reemplaza a una vieja) y
  cuando el plugin se actualiza o se desactiva, y (Kino 0.9.54) cuando la persona cambia el idioma de la app, para que
  la siguiente llamada reciba el [`kino.lang`](kino-api.md#lang) nuevo. Las variables a nivel de módulo son, como mucho, un
  caché: guarda en `kino.storage` lo que tenga que sobrevivir.
- **Código al cargar.** Cuando instala tu plugin, Kino carga el módulo una vez en un sandbox
  desechable sin acceso a la red, para revisar que cada capacidad declarada sea una función exportada.
  Deja el nivel superior solo para declaraciones: una llamada de red ahí falla, y la instalación con
  ella.
- **Los errores le llegan a la gente.** Si tu función lanza un error, esa llamada falla y la persona
  ve un error que nombra tu plugin, y el texto de tu `Error` puede ser parte de él. Escribe esos
  mensajes para una persona, en español, cortos.
- **Código desbocado.** Quedarse sin memoria o sin pila hace fallar la llamada. Un ciclo infinito
  síncrono (`while (true) {}`) **no se puede interrumpir**: al llegar al límite de tiempo Kino deja de
  esperar la llamada y bota el sandbox, pero el ciclo sigue dando vueltas en su propio hilo hasta que
  termine, y para un ciclo infinito de verdad eso es hasta que se cierre la app. Tres tiempos agotados
  seguidos desactivan el plugin.
- **La app se cierra durante una llamada.** Un fallo dentro del motor, o que el sistema la mate por
  memoria, puede tumbar toda la app en plena llamada, y nada dentro del proceso puede atajar eso. Kino
  se da cuenta en el siguiente arranque: a cada plugin que estaba en plena llamada en ese momento se le
  cuenta una salida sucia — **incluido un plugin sano que simplemente estaba corriendo al mismo
  tiempo**, no solo el que de verdad causó el fallo. Dos salidas sucias seguidas del mismo plugin, sin
  una llamada que termine bien entre ellas, lo apagan ("No responde") igual que tres tiempos agotados
  seguidos; una llamada que termina bien reinicia la cuenta.

## El motor no es Node ni un navegador { #not-node }

Los plugins corren en QuickJS. Maneja JavaScript moderno: `async`/`await`, clases con campos, `?.` y
`??`, expresiones regulares con lookbehind, grupos con nombre y `\p{L}` con la bandera `u`, template
literals, spread, `replaceAll`, `Array.prototype.at` y `flat`, `Object.fromEntries`,
`Promise.allSettled`, `Map`, `Set`, `BigInt`. **No** tiene la plataforma alrededor:

- **Globales que faltan** (`typeof` da `"undefined"` dentro de Kino): `setTimeout`, `setInterval`,
  `setImmediate`, `queueMicrotask`, `Buffer`, `process`, `require`, `fetch`, `AbortController`,
  `structuredClone`, `performance`, `crypto`, `WeakRef` e `Intl`. Usa `kino.sleep` para esperar,
  `kino.fetch` en vez de `fetch` y `kino.crypto` en vez de `crypto`. `URL`, `URLSearchParams`, `atob`,
  `btoa`, `TextEncoder`, `TextDecoder` y `console` sí existen: los pone Kino.
- **Node tiene casi todos esos**, así que un código que corre bien en el kit de Node igual puede
  fallar en Kino. Antes de publicar, busca en tu archivo los nombres de arriba.
- **Los métodos que dependen del idioma no localizan:** `localeCompare` ignora su idioma y sus
  opciones (así que `{ numeric: true }` y `{ sensitivity: "base" }` no hacen nada; compara unidades de
  código), y `(1234.5).toLocaleString("es-CO")` da `"1234.5"`. Escribe la comparación que necesitas;
  el plugin de referencia tiene un `natural()` pequeño para nombres numerados.
- **Mantén cortos los nombres de las funciones.** Un nombre de función de millones de caracteres hace
  que el código nativo del motor tumbe toda la app. Como protección de mejor esfuerzo, `kino.*`,
  `console.*`, los globales web y las demás funciones que pone Kino están congelados, y en cualquier
  función `Object.defineProperty`, `Object.defineProperties`, `Reflect.defineProperty` y
  `__defineGetter__`/`__defineSetter__` se niegan a poner como `name` un texto de más de 1000
  caracteres, un getter o un setter, o a volverlo escribible: lanzan un `TypeError`
  (`Reflect.defineProperty` devuelve `false`). La protección no es hermética (una clave calculada
  enorme igual le pone nombre a una función); un plugin que igual tumba la app se apaga (mira "La app
  se cierra durante una llamada" arriba). Poner `name` en objetos normales, y `this.name = "MyError"`
  en una subclase de `Error`, funciona como siempre.

## Dividir tu código en varios archivos { #splitting-files }

Kino carga exactamente un archivo (el `entry` del manifest), y el motor no tiene `require` ni
resolvedor de módulos, así que un `import` de `plugin.js` hacia un segundo archivo no tiene nada que
resolver en el dispositivo. Eso no significa que tengas que escribir todo el plugin en un archivo —
solo que el archivo que publicas tiene que ser el resultado terminado, en uno solo.

Escríbelo dividido, normal, y empaquétalo antes de publicar:

```
src/
  animeav1.js       un módulo auxiliar
  plugin.js         el punto de entrada; importa de animeav1.js
kino-plugin.json
package.json
```

```js
// src/animeav1.js
export async function searchAnimeAV1(query) {
  const res = await kino.fetch(`https://animeav1.com/api/search?q=${encodeURIComponent(query.q)}`);
  if (!res.ok) throw new Error("animeav1 respondió " + res.status);
  return res.json().results.map((r) => ({ id: r.slug, ref: r.slug, title: r.title, kind: "series", poster: r.image }));
}
```

```js
// src/plugin.js -- este import está bien: corre a través del bundler, nunca en el dispositivo
import { searchAnimeAV1 } from "./animeav1.js";

export async function search(query) {
  return searchAnimeAV1(query);
}
```

Empaquétalo con [esbuild](https://esbuild.github.io/) (`npm i -D esbuild`), apuntando a módulo ES
(Kino corre el archivo publicado como uno solo):

```bash
npx esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js
```

`plugin.js` en la raíz del repo es lo que sale de ese comando, con `src/animeav1.js` incluido adentro
y su `export async function search` intacto — ese es el archivo que nombra `entry` y el que Kino
descarga. Agrégalo como script de npm
(`"build": "esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js"`) y córrelo antes de
cada prueba con `sdk/` o antes de publicar. Rollup y webpack funcionan igual; esbuild es el que
necesita menos configuración para un plugin de este tamaño.

## La trampa: un rechazo que nadie está escuchando todavía (Kino 0.9.49 y anteriores) { #rejection-trap }

**Desde Kino 0.9.50** un rechazo se comporta como en Node: un `throw` dentro de una función `async` lo
ataja el `try`/`catch`, el `.catch()`, el `Promise.all` o el `Promise.allSettled` de quien la llama, por
temprano que pase -- aunque sea antes de su primer `await`, y aunque el manejador se enganche unos
`await` después. Lo que sigue haciendo fallar la llamada es un rechazo que **nadie maneja nunca**: uno
que sigue sin manejador cuando el plugin ya solo está esperando a Kino (un `kino.fetch`, un
`kino.sleep`...). Por ejemplo, una función auxiliar que llamas sin `await` y que lanza error, o una
promesa que guardas y solo esperas después de un `kino.fetch`. La llamada falla entonces con ese error,
como Node se detendría con un `unhandledRejection`. Espera lo que arrancas, o ponle un `.catch()` de una.

**Kino 0.9.49 y anteriores** abortan **toda la llamada** cuando una promesa se rechaza antes de que
algo le haya puesto un manejador, aunque tu código esté dentro de un `try`/`catch`. El kit de Node no te
puede mostrar esto. Si tu plugin también tiene que funcionar ahí (la gente actualiza tarde), sigue estas
reglas:

- **Aborta la llamada:** un `throw` dentro de una función `async` **antes de su primer `await`**,
  cuando quien la llama está envuelto en `try`/`catch`. Un `.catch()` sobre esa llamada, o un
  `Promise.all`/`Promise.allSettled` alrededor, tampoco la rescatan. También aborta: un
  `new Promise((_, reject) => reject(e))` rechazado de inmediato, y un `return Promise.reject(e)` desde
  una función `async`.
- **Se ataja normal:** un `throw` después de cualquier `await` (aunque sea `await null;`), un rechazo
  que viene de `kino.fetch` o de `kino.sleep` (por ejemplo, un host rechazado), y `await Promise.reject(e)`
  o `Promise.reject(e).catch(...)` (esas versiones retrasan `Promise.reject` un tick para que un manejador
  alcance a engancharse).
- **Una llamada `kino.*` síncrona que falla** (`kino.storage.set` por encima de 256 KB, un error de
  `kino.crypto`, un selector que `kino.html.select` rechaza) se ataja normal desde Kino 0.9.50. Kino
  0.9.49 y anteriores terminaban ahí la llamada entera, aunque estuviera dentro de `try`/`catch`
  ([Errores que tu código puede atrapar](kino-api.md#catch)).
- Si igual nadie ataja el error, no pasa nada grave: la llamada falla con ese error de todos modos, y
  un código de `kino.error` le llega bien a la persona.
- **Los scrapers convertidos de Nuvio tienen un arreglo:** cuando Kino convierte un
  [scraper de Nuvio](nuvio.md), reescribe los ayudantes async que emiten los empaquetadores
  (`__async` de esbuild, `__awaiter` de TypeScript, `_asyncToGenerator` de Babel) para que el cuerpo
  de una función transpilada arranque un tick después, y un `throw` antes de su primer `await` se
  ataja normal. Una función `async` nativa (la tuya, o la de un scraper sin transpilar) igual necesita
  el `await` antes de cualquier cosa que pueda lanzar error.

Así que, para esas versiones, en una función auxiliar que quien la llama puede envolver en
`try`/`catch`, haz primero el `await` y valida después:

```js
// Wrong before Kino 0.9.50: this throw is NOT caught by the caller's try/catch; it aborts the whole call.
async function getJson(url) {
  if (!url.startsWith("https://")) throw new Error("dirección inválida");
  const r = await kino.fetch(url);
  return r.json();
}

// Right everywhere: the first await comes before anything that can throw.
async function getJson(url) {
  const r = await kino.fetch(url);
  if (!r.ok) throw new Error("archive.org respondió " + r.status);
  return r.json();
}
```

(El primero está mal antes de Kino 0.9.50: ese `throw` NO lo ataja el `try`/`catch` de quien llama y
aborta toda la llamada. El segundo está bien en todas las versiones: el primer `await` va antes de
cualquier cosa que pueda lanzar un error. Si una función auxiliar no tiene nada que esperar, empiézala
con `await null;`, o revisa la entrada en quien la llama antes de llamarla. Los ejemplos de este sitio
lo hacen, así que también corren en versiones viejas.)
