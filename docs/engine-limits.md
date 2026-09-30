# Límites y trampas del motor

## Todos los números en un solo lugar { #limits }

| Qué | Límite |
| --- | --- |
| Manifiesto / archivo de entrada / ícono | 16 KB / 1 MB / 128 KB |
| Memoria / pila, por plugin | 64 MB / 1 MB |
| Tiempo por llamada | `search` 15 s; `home`, `browse`, `episodes`, `resolve` 20 s cada una (`resolve` de un plugin convertido desde un scraper de Nuvio: 75 s); `liveCategories`, `liveChannels`, `guide` 20 s cada una; cuentan todos tus fetch y sleep juntos, pero no el tiempo que la persona tarda en responder una pregunta de host de esa llamada |
| Cargar el módulo (su nivel superior) | 10 s |
| Sandbox inactivo | se cierra después de 5 minutos sin llamadas |
| Tiempos agotados seguidos | 3 seguidos y Kino desactiva el plugin ("No responde") |
| `kino.fetch` | solo https (o el servidor propio de la persona tal como lo escribió, o `http` en un host declarado `insecureHttp`); 15 s por defecto, 30 s máximo; cuerpo de la respuesta máximo 5 MB; la petición (URL, headers y cuerpo) máximo 1.048.576 caracteres; máximo 60 peticiones por llamada; máximo 10 redirecciones por petición |
| Cookies | 50 por dominio, 64 KB en total por plugin |
| `kino.storage` | 256 KB por plugin; el `ttlMs` opcional de una entrada va de 1 a 2.592.000.000 ms (30 días) |
| `kino.sleep` | de 0 a 5.000 ms por llamada |
| `kino.crypto` | datos de máximo 5 MB por llamada; PBKDF2 máximo 100.000 iteraciones y llaves de 64 bytes; `randomBytes` máximo 1.024 |
| `kino.log` / `console.*` | 2.000 caracteres por mensaje |
| Lo que devuelve una función | máximo 2.000.000 caracteres ya convertido a JSON |
| Resultados | `search` 100 ítems; `home` 20 filas de 60; `browse` 100 por página; `episodes` 5.000 (y 50 `seasons`); `ref` 4.096 caracteres; `next` 2.048 caracteres; `id` cumple `^[A-Za-z0-9._~-]{1,128}$` |
| Canales en vivo (apiVersion 3) | `liveCategories` 200; `liveChannels` 500 por página y 10 páginas por categoría; `guide` 50 canales y 24 h por llamada, 100 entradas por canal; `number` 1..9999 |
| Ajustes | máximo 12; `text` 500, `url` 2.048, `password` 500 caracteres |
| Mensajes de error | tu mensaje de `kino.error` se muestra como detalle, cortado a 200 caracteres |
| `hosts` | de 1 a 20 entradas; desde apiVersion 2, ninguna (`[]`) cuando hay un ajuste `url` |
| `secrets` (apiVersion 4) | máximo 16; los nombres cumplen `^[A-Za-z][A-Za-z0-9_]{0,31}$`; un valor tiene de 1 a 4.096 bytes |

## Cómo vive tu código { #lifecycle }

- **Una llamada a la vez.** Las llamadas a un mismo plugin corren una detrás de otra. El sandbox se
  reutiliza entre llamadas, pero Kino lo bota después de 5 minutos inactivo, después de un tiempo
  agotado, cuando se cancela una llamada (por ejemplo, una búsqueda nueva reemplaza a una vieja) y
  cuando el plugin se actualiza o se desactiva. Las variables a nivel de módulo son, como mucho, un
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
solo que el archivo que publicás tiene que ser el resultado terminado, en uno solo.

Escribilo dividido, normal, y empaquetalo antes de publicar:

```
src/
  scraper.js        un módulo auxiliar
  plugin.js         el punto de entrada; importa de scraper.js
kino-plugin.json
package.json
```

```js
// src/scraper.js
export async function searchSite(query) {
  const res = await kino.fetch(`https://site.example/api/search?q=${encodeURIComponent(query)}`);
  return JSON.parse(res.text()).results.map((r) => ({ id: r.slug, title: r.title, poster: r.image }));
}
```

```js
// src/plugin.js -- este import está bien: corre a través del bundler, nunca en el dispositivo
import { searchSite } from "./scraper.js";

export async function search(query) {
  return searchSite(query);
}
```

Empaquetalo con [esbuild](https://esbuild.github.io/) (`npm i -D esbuild`), apuntando a módulo ES
(Kino corre el archivo publicado como uno solo):

```bash
npx esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js
```

`plugin.js` en la raíz del repo es lo que sale de ese comando, con `src/scraper.js` incluido adentro
y su `export async function search` intacto — ese es el archivo que nombra `entry` y el que Kino
descarga. Agregalo como script de npm
(`"build": "esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js"`) y correlo antes de
cada prueba con `sdk/` o antes de publicar. Rollup y webpack funcionan igual; esbuild es el que
necesita menos configuración para un plugin de este tamaño.

## La trampa: un rechazo que nadie está escuchando todavía { #rejection-trap }

El motor aborta **toda la llamada** cuando una promesa se rechaza antes de que algo le haya puesto un
manejador, aunque tu código esté dentro de un `try`/`catch`. El kit de Node no te puede mostrar esto,
así que apréndete las reglas:

- **Aborta la llamada:** un `throw` dentro de una función `async` **antes de su primer `await`**,
  cuando quien la llama está envuelto en `try`/`catch`. Un `.catch()` sobre esa llamada, o un
  `Promise.all`/`Promise.allSettled` alrededor, tampoco la rescatan. También aborta: un
  `new Promise((_, reject) => reject(e))` rechazado de inmediato, y un `return Promise.reject(e)` desde
  una función `async`.
- **Se ataja normal:** un `throw` después de cualquier `await` (aunque sea `await null;`), un rechazo
  que viene de `kino.fetch` o de `kino.sleep` (por ejemplo, un host rechazado), y `await Promise.reject(e)`
  o `Promise.reject(e).catch(...)` (Kino retrasa `Promise.reject` un tick para que un manejador alcance
  a engancharse).
- Si igual nadie ataja el error, no pasa nada grave: la llamada falla con ese error de todos modos, y
  un código de `kino.error` le llega bien a la persona.
- **Los scrapers convertidos de Nuvio tienen un arreglo:** cuando Kino convierte un
  [scraper de Nuvio](nuvio.md), reescribe los ayudantes async que emiten los empaquetadores
  (`__async` de esbuild, `__awaiter` de TypeScript, `_asyncToGenerator` de Babel) para que el cuerpo
  de una función transpilada arranque un tick después, y un `throw` antes de su primer `await` se
  ataja normal. Una función `async` nativa (la tuya, o la de un scraper sin transpilar) igual necesita
  el `await` antes de cualquier cosa que pueda lanzar error.

Así que en una función auxiliar que quien la llama puede envolver en `try`/`catch`, haz primero el
`await` y valida después:

```js
// Wrong: in Kino this throw is NOT caught by the caller's try/catch; it aborts the whole call.
async function getJson(url) {
  if (!url.startsWith("https://")) throw new Error("dirección inválida");
  const r = await kino.fetch(url);
  return r.json();
}

// Right: the first await comes before anything that can throw.
async function getJson(url) {
  const r = await kino.fetch(url);
  if (!r.ok) throw new Error("archive.org respondió " + r.status);
  return r.json();
}
```

(El primero está mal: en Kino ese `throw` NO lo ataja el `try`/`catch` de quien llama y aborta toda
la llamada. El segundo está bien: el primer `await` va antes de cualquier cosa que pueda lanzar un
error. Si una función auxiliar no tiene nada que esperar, empiézala con `await null;`, o revisa la
entrada en quien la llama antes de llamarla.)
