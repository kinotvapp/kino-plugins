# Archivos del aparato de la persona (`files`, apiVersion 21) { #files }

!!! note "Disponible con Kino 0.9.82"
    El apiVersion 21 llega con Kino 0.9.82. Un Kino anterior rechaza un manifiesto con `"apiVersion": 21` ("Este plugin
    necesita una versión más nueva de Kino"). Declara 21 solo si usas `files`.

Un plugin que lee libros, reproduce música o muestra videos que la persona ya guarda en su celular o su TV declara `files`. La
persona elige un archivo (o una carpeta entera) con el selector de Kino. El plugin recibe un **handle** opaco, nunca una
dirección, y lee el archivo por rangos o se lo pasa al reproductor. **Esta capacidad no sube ni envía nada a ninguna parte**: los
bytes se quedan en el aparato, salvo que tu propio código los mande a un host que declaraste en `hosts`.

```json
{ "apiVersion": 21, "capabilities": ["screen", "files"] }
```

`files` es declarativa: no hay nada que exportar. Su línea de consentimiento al instalar es «Podrá guardar y leer los archivos que
tú elijas de este aparato, o una carpeta entera si la eliges». Sin la capacidad no existe `kino.files`
(`typeof kino.files === "undefined"`). Con un apiVersion menor que 21 el manifiesto se rechaza con "The \"files\" capability needs
apiVersion 21". Puede ir sola (un plugin que solo lee archivos locales no necesita `search`, `home` ni `resolve`) y una
[mejora](enhancements.md) puede agregarla.

## Las llamadas { #calls }

```js
// Desde una pulsación (un screenEvent que sigue a un toque): el selector.
const [libro] = await kino.files.pick({ kinds: ["book"] });             // [] si la persona cancela
const inicio = await kino.files.read(libro.id, { start: 0, end: 1000 });  // un Uint8Array, como máximo 2.000.000 bytes por llamada
const mios = await kino.files.list();                                    // tus handles, el más nuevo primero
```

| Llamada | Qué hace |
| --- | --- |
| `pick({ kinds?, multiple?, copy? })` | Abre el selector del sistema y responde los handles de lo elegido (`[]` si la persona cancela). `kinds` acota lo que ofrece el selector: `video`, `audio`, `book`, `image`, `subtitle`, `other`. `copy: true` copia los bytes al almacén propio de tu plugin (hasta 64 MB por archivo, 1 GB en total); lo normal es guardar una **referencia** (un permiso persistido), que deja de servir si la persona mueve o borra el archivo. |
| `pickFolder({ kinds? })` | Un permiso para una carpeta entera. Lista sus archivos con `list({ folder })`. |
| `list({ folder?, kinds? })`, `folders()`, `info(id)` | Lo que tienes, el más nuevo primero: los handles (`list`), las carpetas elegidas (`folders`) y el registro de un handle (`info`). Un handle es `{ id, name, size, mime, kind, copied, addedAt, folder? }`; una carpeta, `{ id, name, addedAt }`. |
| `read(id, { start?, end? })`, `readText(id, { start?, end? })` | Los bytes (un `Uint8Array`) o el texto UTF-8 de un rango, como máximo 2.000.000 bytes por llamada. Un archivo más grande se lee en varias llamadas. |
| `forget(id)` | Suelta un handle (y la copia, si el archivo se importó con `copy: true`). |
| `url(id)` | `kino-file:<id>`, para usar como `url` de un stream o de una pista de audio: el reproductor reproduce el archivo. Las reglas de hosts no le aplican. |

Un handle es un texto opaco que pertenece a tu plugin: otro plugin no puede usarlo (`denied`).

## Cuándo puede abrirse el selector { #press }

`pick` y `pickFolder` solo corren desde una `action` de los ajustes, una `panelAction` o un `screenEvent` que sigue a un toque o un
envío de la persona (la misma regla de [`kino.qr.scan`](qr.md#where)). En cualquier otro sitio (Home, una búsqueda, el evento
`open`, un tick de temporizador, un `playerEvent`) se rechazan con `not_allowed`. Listar, leer, `info`, `url` y `forget` no
necesitan pulsación: un handle solo existe para lo que la persona eligió.

## Reproducir un archivo local { #play }

Pon `kino.files.url(id)` en un stream (`resolve`) o en una pista de audio y el reproductor reproduce el archivo; Kino se encarga
de los saltos. Un archivo local lo reproduce Kino mismo: **no se puede enviar** a un Chromecast ni a un reproductor DLNA por
dirección, así que no ofrezcas Cast para él.

```js
export async function resolve({ ref }) {
  const id = ref.replace(/^f:/, "");
  return { streams: [{ url: kino.files.url(id), label: "En este aparato" }] };
}
```

## Errores { #errors }

Una llamada fallida rechaza con un error cuyo `code` es uno de estos:

| `code` | Cuándo | Qué hacer |
| --- | --- | --- |
| `unavailable` | Este aparato no tiene selector. | Di que la función no está disponible aquí. |
| `not_allowed` | `pick` o `pickFolder` fuera de una pulsación. | Llámalo desde el `screenEvent` del botón. |
| `busy` | Ya hay un selector abierto (el tuyo o el de otro plugin). | Espera; no lo repitas en bucle. |
| `timeout` | El selector se cerró a los 3 minutos sin respuesta. | Deja que la persona lo intente de nuevo. |
| `invalid_request` | Un argumento mal formado. | Corrige la llamada. |
| `gone` | Se movió o se borró el archivo, o se perdió el permiso. | Dilo en una línea y ofrece elegirlo otra vez; no muestres una pantalla de error. |
| `too_large` | Un archivo con `copy: true` que pasa el límite por archivo. | Ofrece guardar una referencia. |
| `denied` | El handle no es tuyo. | No guardes ids de otro plugin. |
| `quota` | Tienes demasiados handles, carpetas o bytes copiados. | Haz `forget` de los que ya no necesitas. |

## Límites { #limits }

| Límite | Valor |
| --- | --- |
| Bytes de un `read` o `readText` | 2.000.000 |
| Handles que puedes tener | 500 |
| Carpetas que puedes tener | 20 |
| Archivos leídos de una carpeta | 5.000 |
| Archivos en un `pick` | 50 |
| Un archivo importado (`copy: true`) | 64 MB |
| Todas tus copias importadas | 1 GB |
| El selector queda abierto | 3 minutos |

- **No se sincroniza.** Un handle no significa nada en otro aparato. Sincroniza lo que guardas *sobre* un archivo (el lugar de
  lectura, la posición de reproducción) con algo que identifique el archivo (su nombre y su tamaño) y no con el handle.
- **Imágenes.** Para dibujar la portada de un libro, lee los bytes y dale a una `Image` una dirección
  `data:image/png;base64,…` (mira [Image](screen-components.md#image)).

## Pruébalo sin celular { #test }

El `kino.files` del kit de Node responde desde la carpeta que indique la variable de entorno `KINO_FILES_DIR` (por defecto
`./.kino-files`): `pick` entrega los archivos que haya ahí, por orden de nombre. `node sdk/run.mjs` y las pruebas del kit ejercitan
`pick`, `read`, `list`, `forget` y los errores sin un aparato; mira [Probar en local](test-locally.md).

## Lo que ve la persona { #what-people-see }

El selector de archivos de Android, abierto sobre tu pantalla. Kino no muestra una lista propia de tus handles. Si el archivo o el
permiso desaparece más tarde, tu siguiente llamada responde `gone`.
