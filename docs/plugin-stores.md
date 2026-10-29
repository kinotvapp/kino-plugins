# Tiendas de plugins { #plugin-stores }

!!! note "Disponible con la próxima versión de Kino"
    `pluginStore` es de `apiVersion` 15 y llega con la próxima versión de Kino (todavía sin publicar), junto con
    [`identity`](identity.md) y [`notifications`](notifications.md). Una versión anterior rechaza estos plugins con
    «Este plugin necesita una versión más nueva de Kino».

Un plugin que declara **`pluginStore`** es una **fuente de plugins** para la tienda de Kino: le entrega a Kino una lista de
plugins que la gente puede instalar, y Kino hace todo lo demás. Cualquiera puede publicar una tienda, respaldada por GitHub,
por su propio servidor o por un archivo JSON estático.

Quien publica un plugin responde por él; **Kino solo lista lo que las tiendas le entregan**. Una tienda nunca instala nada
por sí sola: instalar es siempre el flujo de Kino (vista previa, hoja de consentimiento, instalación).

## Cómo encaja { #how }

- **Kino pinta la tienda, no el plugin.** Kino guarda un **índice local** con las entradas de todas las tiendas, cada fila
  marcada con su tienda, y la pantalla Plugins lee solo ese índice: tarjetas, búsqueda, categorías, orden y paginación son
  consultas locales, instantáneas y iguales sin red.
- **Tu plugin solo entrega entradas.** Se sincroniza (`storeSync`) en segundo plano y, si es una tienda en vivo, responde
  mientras la persona navega (`storeList`, `storeSearch`). No dibuja nada.
- **Cada tarjeta dice de dónde viene**: abajo lleva el ícono de la tienda y «de &lt;nombre de la tienda&gt;». Arriba hay un filtro
  de tiendas: «Todas las tiendas» (por defecto) y luego cada tienda instalada y activa.
- **Kino Plugins** es la tienda que viene en la app: un plugin corriente, firmado, que no se puede desinstalar (sí apagar).
  Es el ejemplo trabajado de una tienda local: ver [abajo](#kino-plugins).

## El manifiesto { #manifest }

```json
{
  "id": "tienda-de-ana", "name": "Tienda de Ana", "version": "1.0.0", "apiVersion": 15, "entry": "plugin.js",
  "hosts": ["plugins.ana.example"],
  "capabilities": ["pluginStore"],
  "pluginStore": { "mode": "local", "name": "Tienda de Ana" }
}
```

- `pluginStore` (la capacidad) necesita `apiVersion: 15`, **puede ir sola** (una tienda no reproduce nada: no necesita
  `resolve` ni `search`), no se ofrece con [`enhancements`](enhancements.md) y necesita la aprobación de la persona al
  instalar y en la actualización que la agrega.
- El bloque `pluginStore` es opcional: `mode` es `"local"` (por defecto) o `"live"`, y `name` (de 1 a 60 caracteres) es cómo
  sale la tienda en el filtro y en las tarjetas (por defecto, el `name` del plugin). El bloque sin la capacidad se rechaza.
- `hosts`: tu tienda solo llega a los hosts que declaras, como cualquier plugin.
- No uses el id `kino-plugins`: es el de la tienda de Kino. Y una entrada cuyo `id` ya lista Kino Plugins desde otro repositorio se descarta (ver [cómo mezcla Kino](#mixing)).

## `storeSync`: todas las tiendas { #store-sync }

```js
export async function storeSync({ reason, since, state }) {
  // reason: "schedule" (el refresco en segundo plano) o "reload" (la persona tocó recargar)
  // since:  cuándo se sincronizó esta tienda por última vez, en ms (ausente la primera vez)
  // state:  lo que devolviste como `state` la vez anterior (como mucho 16 KB de JSON)
  const r = await kino.fetch("https://plugins.ana.example/list.json");
  return { full: true, entries: r.json().plugins.map(toEntry), state: { etag: "…" } };
}
```

Responde `{ full, entries, removed?, state? }`:

| Respuesta | Qué hace Kino |
| --- | --- |
| `full: true` | `entries` es la lista **completa**: Kino reemplaza las filas de tu tienda; lo que falte sale. |
| `full: false` | `entries` son altas o cambios y `removed` las direcciones que se fueron: Kino los aplica. Un cambio vacío (`entries: []`) significa «nada cambió». |
| `state` | Un objeto pequeño (un cursor, un etag, la fecha de tu último índice) que Kino guarda y te devuelve en la siguiente llamada. |

Cómo consigues la lista (GitHub, tu servidor, un archivo estático) es asunto tuyo. `storeSync` corre **solo en segundo
plano**, al ritmo que elija la persona (cada 2 horas por defecto, solo con Wi-Fi), y cuando toca recargar («Actualizar mis
fuentes»); nada espera por él mientras la persona navega. Una tienda con 3 fallos seguidos se pausa hasta la siguiente
recarga.

## Una entrada (`StoreEntry`) { #entry }

| Campo | Qué es |
| --- | --- |
| `address` | De dónde instala Kino: `owner/repo`, `owner/repo/ruta`, `owner/repo@ref` o `url:https://…/kino-plugin.json`. Obligatorio salvo con `stremio`. |
| `id` | El `id` del plugin (el de su `kino-plugin.json`). Obligatorio. |
| `name` | De 1 a 60 caracteres. Obligatorio. |
| `description`, `longDescription` | Hasta 300 y hasta 4000 caracteres. |
| `categories` | `movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `adult`. |
| `tags`, `icon`, `screenshots` | Hasta 10 etiquetas de 30 caracteres; el ícono y hasta 8 capturas, solo `https`. |
| `version`, `author` | Texto corto (40 y 60 caracteres). |
| `popularity`, `updatedAt` | Números: para el orden «Populares» y «Recientes» (`updatedAt` en ms). |
| `stremio`, `requires`, `needsSetup` | Un addon de Stremio se instala por el flujo de Stremio (entonces `address` puede faltar); `requires` lista capacidades que la versión de Kino debe poder correr, o la entrada se oculta; `needsSetup` avisa que pide configuración. |
| `signed`, `authorKey` | **Pistas**: la tarjeta dice «Firmado» y un plugin instalado con ese id y esa llave de autor (64 caracteres hex en minúsculas) sale como instalado. Kino lo vuelve a comprobar al instalar. |
| `recommended` | Solo lo respeta Kino si viene de **Kino Plugins**; en cualquier otra tienda se ignora. |

Una entrada sin `address` ni `stremio`, sin un `id` válido o sin `name` se descarta; los textos largos se cortan; un ícono que
no es `https` se descarta. Pasadas 5000 entradas (contando solo las válidas, sin repetir direcciones) el resto se descarta.
Kino nunca se fía de las pistas de una tienda.

## Local y en vivo { #modes }

| | Tienda **local** (por defecto) | Tienda **en vivo** (`"mode": "live"`) |
| --- | --- | --- |
| Exporta | `storeSync` | `storeSync`, `storeList` y `storeSearch` (las tres) |
| Mientras la persona navega | Nunca toca la red | Responde lo que su lista sincronizada no tiene |
| Lo que ve la persona al instalarla | Una línea normal: «Agrega plugins de sus servidores a tu tienda» | Esa y, **en rojo**: «Lo que busques en la tienda llegará a sus servidores» |

```js
// Tienda en vivo: además de storeSync
export async function storeList({ category, sort, cursor }) { /* sort: "popular" | "recent" */ return { entries, next }; }
export async function storeSearch({ q, category, cursor }) { return { entries, next }; }
```

Cada una responde `{ entries, next? }`; `next` es el cursor de la página siguiente. Una llamada tarda **5 s como máximo** y una
tienda recibe **20 llamadas por minuto**: pasado cualquiera de los dos, esa llamada no agrega nada. Kino guarda una página en
vivo unos **30 minutos**, marcada como caché en vivo: volver a la misma búsqueda o página la muestra al instante, y esas
filas nunca cuentan como la lista sincronizada de la tienda.

### Cómo mezcla Kino las tiendas { #mixing }

1. **Una tienda puede ser las dos cosas.** Una tienda en vivo debería sincronizar también una lista base (sus destacados o
   novedades) para aparecer al instante y sin red; las llamadas en vivo solo agregan lo que esa base no tiene.
2. **Orden estable.** En «Todas las tiendas» primero van las entradas locales, en el orden elegido; las de una tienda en vivo
   se **agregan al final** a medida que llegan. Nada de lo que ya está en pantalla se mueve y el foco (en el TV) no salta.
3. **Sin repetidos.** Una entrada en vivo cuya dirección ya está en la lista se omite; una misma dirección de dos tiendas se
   muestra una vez (la de Kino Plugins primero). Un mismo `id` de plugin con otro repositorio gana el de Kino Plugins.
4. **Un solo «Cargar más».** Pagina primero el índice local y luego le pide a cada tienda en vivo su página siguiente.
5. **Búsqueda.** Los resultados locales se actualizan al escribir; las búsquedas en vivo esperan a que la persona deje de
   escribir (medio segundo) y una búsqueda nueva cancela la anterior.
6. **Una tienda en vivo elegida en el filtro** muestra **solo** sus respuestas en vivo, nada local.

## Lo que Kino hace por su cuenta { #kino-does }

- **La lista de bloqueo.** Kino aplica su lista de bloqueo (`community-blocklist.json`, ver
  [Reclamos y retiro de plugins](claims.md)) a **cada entrada de cada tienda** antes de pintar, y otra vez al instalar. Las
  tiendas no la reciben ni la aplican: como Kino pinta, ninguna tienda puede mostrar un plugin bloqueado.
- **El código +18.** Mientras el código +18 de la persona esté bloqueado, una entrada con la categoría `adult`, o que Kino ya
  conoce como +18, se oculta de Destacados, Populares, la búsqueda, la ficha y los conteos, de todas las tiendas; una tienda
  cuyo propio plugin es +18 no sale en el filtro. Al desbloquear aparecen. Instalar uno pasa por la puerta +18 de siempre.
- **Plugins que desaparecen.** Si un repositorio se borra o pierde el topic, sale de la siguiente lista de su tienda; un
  plugin cuyo manifiesto responde 404 al verlo o instalarlo se descarta al instante. Una tienda que se va **nunca
  desinstala** nada: un plugin instalado sigue funcionando y en Instalados dice «Ya no está en ninguna tienda».
- **Apagar una tienda.** Cada tienda se apaga desde su pestaña en Ajustes (y se desinstala como cualquier plugin, salvo Kino
  Plugins), donde también se elige su intervalo; sus filas salen del índice al instante.
- **Instalar.** Siempre `PluginInstaller`: vista previa de la dirección, hoja de consentimiento («Plugin no verificado…» si no
  está firmado) e instalación. Nada se instala solo.

## Límites { #limits }

| Qué | Límite |
| --- | --- |
| Entradas por `storeSync` | 5000 (las demás se descartan) |
| Tamaño de una respuesta de `storeSync` | 4 MB de JSON |
| `state` | 16 KB de JSON |
| Una corrida de `storeSync` | 60 s, 40 peticiones `kino.fetch` y 8 MB descargados (más que un trabajo programado) |
| Llamadas en vivo (`storeList`, `storeSearch`) | 5 s cada una, 20 por minuto por tienda; caché de 30 minutos |

Los números exactos están en `contract.json` (`kinoStore.limits`).

## Dos tiendas de ejemplo { #examples }

Dos plugins completos y copiables, validados con el kit y con pruebas que corren sin red:
[**Tiendas de ejemplo**](store-examples.md): una tienda **local** cuya lista es un archivo JSON estático y una tienda **en
vivo** con su propia API. Y para armar la tuya:

```
node sdk/init.mjs mi-tienda --host plugins.ana.example --store local     # o --store live
```

## Kino Plugins: la tienda que viene en la app { #kino-plugins }

**Kino Plugins** (`kinotvapp`, firmada con la llave de autor de Kino) es una tienda **local** corriente, con una sola
capacidad, `pluginStore`, y los hosts `api.github.com`, `raw.githubusercontent.com`, `cdn.jsdelivr.net` y `archive.org`.
Su código fuente vive en el repositorio `kinotvapp/kino-plugin-store`. Lo que responde su `storeSync`:

1. **La primera vez**, sin red: la lista que trae el propio plugin (los plugins recomendados del catálogo y los de la
   comunidad), así que la tienda está llena desde el primer arranque. Las entradas del catálogo llevan `recommended`.
2. **Una vez al día**, el `index.json` de `kinotvapp/kino-plugins`: un archivo estático que **se construye cada día** con una
   acción de GitHub que recorre los repositorios con el topic `kino-plugin`. Releerlo trae las estrellas y quita los
   repositorios que perdieron el topic o se borraron.
3. **Entre un índice y el siguiente**, un cambio pequeño (`full: false`): una búsqueda de GitHub de lo que cambió desde la
   última vez, guardando su cursor en `state`.

Es el patrón para una tienda grande: una lista completa de vez en cuando y cambios pequeños entre medias. Para aparecer en
esa lista, ver [Aparecer en Kino](listed.md).

## Probar con el kit { #kit }

```
node sdk/validate.mjs <carpeta>                                  # las líneas de consentimiento y las funciones
node sdk/run.mjs <carpeta> storeSync [--since <ms>] [--state '<json>']
node sdk/run.mjs <carpeta> storeList [popular|recent] [categoría]    # tienda en vivo
node sdk/run.mjs <carpeta> storeSearch "<q>" [categoría]             # tienda en vivo
```

El kit imprime la respuesta como la guardaría el índice de Kino y avisa por stderr lo que Kino descartaría
(`[dropped by Kino] …`). Los tipos están en `kino.d.ts` (`StoreEntry`, `StoreSyncArg`, `StoreSyncAnswer`, `StoreListArg`,
`StoreSearchArg`) y el contrato en `contract.json` (`kinoStore`). Más en [Probar en local](test-locally.md#api15).
