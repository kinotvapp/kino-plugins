# Guardar dónde va la persona (`progress`, apiVersion 22) { #progress }

!!! note "Próxima versión de Kino, todavía sin publicar"
    El apiVersion 22 llega con la próxima versión de Kino, que todavía no está publicada. Un Kino que no lo tiene rechaza un
    manifiesto con `"apiVersion": 22` ("Este plugin necesita una versión más nueva de Kino"). Para seguir corriendo en Kinos
    anteriores, conserva tu `apiVersion` y agrega `progress` como [mejora](enhancements.md) (`enhancements["22"]`).

Un plugin cuyos ítems no son videos (un lector de manga, un lector de libros, un podcast que reproduce por su cuenta) puede
pedirle a Kino que recuerde hasta dónde va la persona en cada uno. Declara `progress`, llama a `kino.progress.set` mientras la
persona lee, y vuelve a leer los lugares con `get` y `list`. **Kino no dibuja nada con esto**: ni una fila en Inicio, ni una
tarjeta, ni una pantalla. Tu plugin arma su propio estante (una fila "Seguir leyendo" en su `home()`, una sección de su
pantalla) con lo que responde `list`. Lo que pone Kino es la guarda: los lugares sobreviven a un reinicio, siguen a la persona
entre sus propios aparatos y vuelven con una copia de seguridad.

```json
{ "apiVersion": 22, "capabilities": ["screen", "progress"] }
```

`progress` es declarativa: no hay nada que exportar. **No tiene línea de consentimiento ni aprobación**: solo guarda datos
propios de tu plugin sobre la lectura de la persona. Puede ir sola, junto a `screen` (un plugin cuyas únicas capacidades son
`progress` y `screen` es válido) o junto a cualquier otra capacidad, y el plugin sigue siendo el mismo tipo de plugin. Sin la
capacidad no existe `kino.progress` (`typeof kino.progress === "undefined"`).

## Las llamadas { #calls }

```js
await kino.progress.set({ id: "ch-87", title: "Berserk", fraction: 0.4, label: "Cap. 87 · hoja 12 de 40", resume: { cap: 87, pag: 12 } });
const here = await kino.progress.get("ch-87");              // { id, fraction, title, label, labelEn?, resume: { cap: 87, pag: 12 }, done, updatedAtMs } o null
const shelf = await kino.progress.list({ limit: 15 });      // el último que se guardó primero
await kino.progress.clear("ch-87");                          // olvidarlo
```

| Llamada | Qué hace |
| --- | --- |
| `set({ id, fraction, title?, poster?, label?, labelEn?, resume?, done?, doneAt? })` | Guarda dónde va la persona en el elemento `id` (de 1 a 128 caracteres de `A-Z a-z 0-9 . _ ~ -`, tú lo eliges: un capítulo, un libro, un episodio). `fraction` va de 0 a 1. Se resuelve cuando Kino lo recibió, no cuando ya está en disco. |
| `get(id)` | Lo último que guardaste para él, o `null` (nunca se guardó, o se borró). |
| `clear(id)` | Lo olvida. |
| `list({ limit?, sinceMs? })` | Tus elementos, el último que se guardó primero; `limit` de 1 a 100 (50 por defecto), `sinceMs` (un número finito >= 0, milisegundos desde 1970) deja solo los guardados en ese momento o después. Incluye los terminados (`done: true`). |

Una entrada, de `get` o de `list`, es `{ id, fraction, title?, poster?, label?, labelEn?, resume?, done, updatedAtMs }`: cada
entrada de `list` trae su `id`, y `updatedAtMs` es la hora del último `set`.

- **Textos opcionales.** `title` (hasta 200 caracteres) y `poster` (una dirección https con la regla de una
  [`Image`](screen-components.md#image) de pantalla, o un `KinoImageRef` de tu [`imageSource`](images.md)) son para tu estante;
  un `set` que no los trae conserva lo que había. Un póster que no cumple la regla solo pierde el póster. `label` y `labelEn` son
  una línea corta sobre el lugar, de hasta 80 caracteres cada una ("Cap. 87 · hoja 12 de 40"); `get` y `list` devuelven las dos.
- **Terminado.** Un elemento está terminado (`done: true`) cuando dices `done: true` o, si no lo dices, cuando `fraction` llega a
  `doneAt` (0,9 salvo que des otro). Sigue en `list`; un `set` posterior con una fracción menor lo vuelve a abrir. Un `set`
  idéntico no cambia nada.
- **Llámalo cuantas veces quieras.** Incluso en cada vuelta de página: Kino guarda en memoria el último `set` de cada elemento y
  escribe en disco como máximo cada 2 segundos, y siempre cuando se cierra la pantalla o la app pasa a segundo plano. Más de 20
  llamadas por segundo se agrupan, nunca son un error.

## `resume`: tus propios datos { #resume }

Pon en `resume` lo que te permita volver al lugar exacto: `{ "cap": 87, "pag": 12 }`, una ruta de pantalla con sus argumentos,
un texto. Es **cualquier valor JSON** (un texto, un número, un booleano, un objeto o una lista) de hasta 1024 bytes ya
serializado (uno más largo se rechaza con `too_large`). Kino lo guarda, lo sincroniza y te lo devuelve tal como lo pusiste, pero
**nunca lo lee**. La `fraction` es solo una aproximación que Kino guarda para ti (y para una barra de progreso); la posición
exacta va en `resume`.

```js
// Pequeño y exacto: el capítulo y la página.
await kino.progress.set({ id: manga.id, fraction: 0.4, resume: { cap: 87, pag: 12 } });

// O la ruta de tu propia pantalla, para abrirla otra vez tal como estaba.
await kino.progress.set({ id: book.id, fraction: 0.62, resume: { screen: "reader", args: { book: book.id, at: 18342 } } });
```

- **Deja margen por debajo de 1024.** Kino mide `resume` con el escape de su biblioteca JSON (U+2028 y U+2029 cuentan 6 bytes
  donde `JSON.stringify` los escribe tal cual), así que un valor que `JSON.stringify` mide en 1024 justos puede rechazarse.
- **Valida lo que vuelves a leer.** Lo escribió otro aparato, quizá con otra versión de tu plugin: revisa su forma antes de
  usarlo, y vuelve al principio cuando no encaje.

## Errores { #errors }

Una llamada fallida rechaza con un `KinoError` cuyo `code` es uno de estos:

| `code` | Cuándo | Qué hacer |
| --- | --- | --- |
| `bad_request` | Un `id`, `fraction`, `done`, `doneAt`, texto u opción mal formado. | Corrige la llamada. |
| `too_large` | El `resume` pasa de 1024 bytes serializado. | Guarda solo lo necesario para volver (un capítulo y una página, no el contenido de la página). |
| `not_allowed` | La capacidad no está declarada, la llamada está en un trabajo que corre para un perfil distinto del activo, o Kino no pudo guardarlo en ese momento. | Atrápalo; la lectura tiene que seguir funcionando sin un lugar guardado. |

## Límites { #limits }

| Límite | Valor |
| --- | --- |
| `resume` | 1024 bytes serializado |
| `id` | de 1 a 128 caracteres de `A-Z a-z 0-9 . _ ~ -` |
| `title` | 200 caracteres |
| `label`, `labelEn` | 80 caracteres cada uno |
| Elementos por plugin | 500 (pasado eso se descartan los de actividad más antigua) |
| `list` | 100 como máximo, 50 por defecto |
| Escrituras en disco | como máximo cada 2 segundos por plugin |
| Llamadas a `set` | 20 por segundo, el resto se agrupa |
| Terminado | `done: true`, o una `fraction` de 0,9 o más (`doneAt` lo cambia) |

## De quién es, aparatos y copias de seguridad { #sync }

- **Por plugin y por perfil.** Cada elemento es de tu plugin y del perfil de la persona: otro plugin nunca lo ve, y otro perfil
  del mismo aparato tiene los suyos.
- **Aparte de la biblioteca de Kino.** No suma nada a "Continuar viendo", ni al tiempo visto, ni a lo que responde
  [`kino.library`](rooms.md#library), y [`tracking`](contract.md#tracking) nunca se entera.
- **Se sincroniza y va en las copias.** Se sincroniza por perfil entre los aparatos vinculados de la persona, en las dos
  direcciones, y viaja en las copias de seguridad. Cuando dos aparatos guardan el mismo elemento, gana el último.

## En un trabajo programado { #jobs }

Un [trabajo programado](jobs-and-shared.md) puede llamar a `kino.progress`, pero no un trabajo que corre para un perfil distinto
del activo ([`"perProfile": true`](jobs-and-shared.md#per-profile)): ahí rechaza con `not_allowed`, como `kino.notifications`,
`kino.coins` y `kino.seed`. Atrápalo.

## Kinos anteriores y mejoras { #enhancements }

Detecta la función con `typeof kino.progress === "object"`. Para seguir corriendo en un Kino que no la tiene, conserva tu
`apiVersion` y agrega la capacidad como mejora:

```json
{
  "apiVersion": 14,
  "capabilities": ["screen"],
  "enhancements": { "22": { "capabilities": ["progress"] } }
}
```

Un Kino que conoce el apiVersion 22 agrega `progress`; uno anterior ignora el bloque y tu plugin corre como antes, sin
`kino.progress`. Mira [Pantallas sin subir tu apiVersion](enhancements.md).

## Un ejemplo completo: un lector de manga { #example }

Guarda el lugar en cada vuelta de página, arma su propia fila "Seguir leyendo" con `list` y retoma la página exacta cuando se
abre un manga. Las tres funciones son código propio del plugin en `plugin.js`; `home()` es la exportación de siempre, así que este
plugin también declara `home` (y `search` y `resolve`, como cualquier fuente):

```json
{ "apiVersion": 22, "capabilities": ["search", "home", "resolve", "screen", "progress"] }
```

```js
// Each page turn: the exact place goes in `resume`; the fraction is for a bar and for "done".
async function onPageTurned(manga, chapter, page, pages) {
  await kino.progress.set({
    id: manga.id,                                   // one element per manga, so "keep reading" shows each manga once
    title: manga.title,
    poster: manga.cover,
    fraction: (chapter.index + page / pages) / manga.chapters,
    label: "Cap. " + chapter.number + " · hoja " + page + " de " + pages,
    labelEn: "Ch. " + chapter.number + " · page " + page + " of " + pages,
    resume: { cap: chapter.number, pag: page },     // yours: Kino never reads it
  });
}

// Home: a "keep reading" row built from what Kino kept. Kino draws nothing of its own.
async function home() {
  const rows = [];
  if (typeof kino.progress === "object") {
    const reading = (await kino.progress.list({ limit: 15 })).filter((e) => !e.done);
    if (reading.length) {
      rows.push({
        id: "keep-reading",
        title: "Seguir leyendo",
        items: reading.map((e) => ({ id: e.id, ref: e.id, title: e.title || e.id, kind: "series", poster: e.poster })),
      });
    }
  }
  return rows;                                       // a KinoRow[]; add the plugin's other rows here
}

// Opening a manga: go straight to the place the person left.
async function openManga(manga) {
  const here = await kino.progress.get(manga.id);
  const place = here && here.resume ? here.resume : { cap: 1, pag: 1 };
  return showPage(manga, place.cap, place.pag);
}
```

- `home()` responde una **lista de filas**, cada una con su propio `id`, y cada ítem necesita un `id` (y un `ref`, un `title` y
  un `kind`): mira [el contrato](contract.md).
- `get` responde `null` para un manga que la persona nunca abrió: el ejemplo empieza en el capítulo 1, página 1.
- Si las páginas vienen de un sitio que solo responde a su propia página, dale a la `Image` de cada página los
  [`headers`](screen-components.md#image-headers) que necesita.

## Pruébalo sin celular { #test }

El `kino.progress` del kit de Node guarda los elementos en memoria durante la ejecución, con las mismas revisiones y los mismos
códigos de error que el de Kino (`node --test sdk/test/progress.test.mjs`). Mira [Probar en local](test-locally.md).

## Lo que ve la persona { #what-people-see }

Nada de parte de Kino: ni una fila, ni una tarjeta, ni una línea de consentimiento. Ve tu propio estante, y el lugar donde se
quedó en cada uno de sus aparatos.
