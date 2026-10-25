# Imágenes del plugin (`imageSource`, apiVersion 13) { #images }

!!! note "apiVersion 13 está en desarrollo"
    Nada de esta página está todavía en un Kino publicado. apiVersion 13 llega en Kino 0.9.74, la próxima versión, junto
    con apiVersion 12; todavía no está publicada. Todo Kino anterior a 0.9.74 rechaza un manifiesto con `"apiVersion": 13`
    ("Este plugin necesita una versión más nueva de Kino"). El contrato y el kit ya lo conocen, así que puedes escribir y
    probar un plugin desde ya y publicarlo cuando salga Kino 0.9.74.

Kino dibuja un póster, un fondo o una imagen de episodio desde una URL pública. Algunas imágenes no tienen esa URL: la
miniatura que un servicio de mensajería le pone a un archivo de video, la portada dentro de una biblioteca privada, una
imagen detrás del inicio de sesión de tu servicio. Con `imageSource` tu plugin le entrega a Kino una **referencia de
imagen**, y Kino le pide los bytes a tu plugin cuando la tarjeta aparece en pantalla. Úsala cuando solo tu plugin puede
traer la imagen; una URL pública sigue siendo mejor cuando existe (Kino la carga solo, sin despertar a tu plugin).

## Cómo se declara { #declare }

`imageSource` necesita `"apiVersion": 13` y el export `image`. Sin línea de consentimiento y sin aprobación: no llega a
nada nuevo, le entrega imágenes a Kino. Por debajo de 13 el manifiesto se rechaza con "The \"imageSource\" capability
needs apiVersion 13"; sin el export la instalación falla con "El plugin no carga: le falta image".

```json
"apiVersion": 13,
"capabilities": ["home", "search", "resolve", "imageSource"]
```

## La referencia { #reference }

Donde se leen estos campos, un plugin que declara `imageSource` puede responder un objeto en lugar de una URL:

```json
{ "source": "plugin", "handle": "thumb:1234" }
```

- Campos: el `poster` y el `backdrop` de un ítem (filas de Inicio, búsqueda, "Ver más", las filas de tu sección), el
  `still` de un episodio, el `poster` y el `backdrop` de `episodes().series` y de una respuesta de `details`, y la
  `image` del encabezado de una sección. En cualquier otro lugar (el logo de un canal, el `art` de una categoría, una
  respuesta de `meta`, una imagen de un layout) una referencia se ignora como una URL mala, y lo mismo pasa con la
  referencia de un plugin que no declara la capacidad.
- `handle` es tuyo y opaco para Kino: de 1 a 512 caracteres, sin caracteres de control. Una referencia mal formada no es
  imagen; el ítem en sí se queda.
- No hay tope de referencias por respuesta: Kino solo pide las imágenes que aparecen en pantalla, una a la vez.
- Un texto siempre es una URL. Kino convierte tu referencia en una dirección propia que nombra tu plugin, y solo el
  lector de Kino puede armar una: un texto que se le parezca se ignora, así que ningún plugin puede hacer que Kino le
  pida una imagen a otro plugin.

## El export `image` { #export }

Kino lo llama con el handle que devolviste y espera la imagen, en base64:

```js
export async function image({ handle }) {
  return { bytes: "<base64 of the picture>", mime: "image/jpeg" };   // or "image/png", "image/webp"
}
```

- `bytes` es base64 canónico (el alfabeto estándar, con relleno, sin espacios ni saltos de línea), máximo 262.144 bytes
  (256 KB) ya decodificado. `mime` es `image/jpeg`, `image/png` o `image/webp`, y los bytes tienen que ser de verdad de
  ese tipo (Kino revisa sus primeros bytes). Es la imagen de una tarjeta, no una foto: manda el tamaño más pequeño que
  ofrezca el servicio.
- Tiene 10 segundos. Corre en segundo plano: no se le pregunta nada a nadie, y una respuesta lenta nunca marca tu plugin
  como "No responde".
- Lo que lanza (cualquier código de `kino.error`), una respuesta mala o un timeout: la tarjeta muestra su imagen de
  relleno y nada más. La persona nunca lee un error por una imagen.

## Lo que hace Kino { #what-kino-does }

| Qué | Cómo |
| --- | --- |
| Cuándo | Cuando una tarjeta con referencia aparece en pantalla (igual en teléfono y en TV), nunca antes. Una tarjeta que salió de la pantalla antes de su turno nunca se pide. |
| Una a la vez | Máximo 1 llamada a `image` en camino para tu plugin; la siguiente la espera. Las imágenes de otro plugin se piden al mismo tiempo. |
| Primero el video | Ninguna llamada a `image` empieza mientras uno de tus [streams de bytes](bytes.md) está abierto (en el teléfono o servido a un televisor), ni mientras tu `read` está en cola, corriendo o terminó hace menos de 2 s: el video conserva su turno. Una imagen espera hasta 20 s a que eso termine (empieza apenas se cierra el stream), y si no, se salta (se pide otra vez la próxima vez que se dibuje la tarjeta). Un `read` que llega mientras corre una llamada a `image` espera esa llamada, así que responde rápido. Una llamada a `image` con timeout le cuesta a tu plugin su sandbox: QuickJS no se puede interrumpir, así que Kino descarta el runtime, y con él cualquier socket o sesión que tenga, y la siguiente llamada empieza uno nuevo. |
| Una sola vez | La imagen va al caché de imágenes en disco de Kino, bajo tu plugin, su versión instalada y el handle: el mismo handle no se vuelve a pedir hasta que el caché lo suelte o se actualice tu plugin (una actualización vuelve a pedir, así que una imagen corregida se ve). |
| Fallas | Un handle que falló no se vuelve a pedir en 5 minutos. 2 timeouts seguidos pausan todas tus imágenes por 5 minutos (cada timeout le cuesta a tu plugin su sandbox y la conexión que mantiene). |
| Una llamada que empezó | Siempre corre hasta el final y se guarda, aunque la tarjeta se haya ido mientras tanto: cancelarla reiniciaría tu plugin. |

## Privacidad { #privacy }

Kino guarda la referencia donde guarda el póster del título: la biblioteca, el historial, "Continuar viendo", las listas
de la persona. Esas filas se sincronizan con los otros aparatos de la persona y van en sus copias de seguridad, así que
nunca pongas un secreto en un handle (un token, una contraseña, una URL firmada): pon ahí un id y el secreto en un
[secreto sellado](manifest.md#secrets) o en `kino.storage`. Una referencia solo carga en el aparato que la leyó de tu
respuesta; en otro lado (otro aparato de la persona, una copia de seguridad restaurada, un kit compartido) muestra la
imagen de relleno. Una referencia nunca se envía a un Chromecast, a un televisor DLNA, a los controles multimedia del
sistema ni a las filas del lanzador de la TV: esos no reciben imagen.

## Límites conocidos { #known-limits }

- Un título guardado con una referencia (biblioteca, historial, "Continuar viendo", listas) conserva ese póster tal como
  se guardó: en otro aparato de la persona, después de una restauración, o después de que este aparato perdió su llave
  de imágenes (una reinstalación, los datos de la app borrados), ese póster guardado se queda en la imagen de relleno.
  Kino no reescribe filas guardadas; tus filas de Inicio, la búsqueda y las páginas vuelven a mostrar la imagen, porque
  salen de la nueva respuesta de tu plugin en ese aparato.
- Una imagen que Kino rechazó cuando se dibujó la tarjeta (tu plugin estaba apagado, sin configurar, actualizándose o no
  instalado en ese momento, o la dirección no era de este aparato) no se vuelve a pedir mientras esa tarjeta siga en
  pantalla; se pide la próxima vez que se dibuje la tarjeta.
- Solo se piden las imágenes en pantalla, una a la vez: una fila larga de referencias se llena tarjeta por tarjeta.

## Un plugin completo { #example }

Un servicio cuyas miniaturas necesitan el token de la persona: el `poster` del ítem es el póster público cuando el
servicio tiene uno, y una referencia si no. Kino le pide `image` solo para el segundo caso.

```js
// kino-plugin.json (the parts that matter): {"apiVersion": 13, "hosts": ["api.example.com"], "capabilities": ["home", "resolve", "imageSource"], "settings": [{"key": "token", "label": "Token", "type": "password", "required": true}]}
const API = "https://api.example.com";
const auth = () => ({ authorization: "Bearer " + kino.config.get("token") });

export async function home() {
  const videos = (await kino.fetch(API + "/videos", { headers: auth() })).json();
  return [{
    id: "latest",
    title: "Latest",
    items: videos.map((v) => ({
      id: "v" + v.id,
      ref: "video:" + v.id,
      title: v.title,
      kind: "movie",
      // A public poster when there is one; otherwise the thumbnail only this plugin can fetch.
      poster: v.posterUrl || { source: "plugin", handle: "thumb:" + v.id },
    })),
  }];
}

const MIMES = ["image/jpeg", "image/png", "image/webp"];

export async function image({ handle }) {
  const id = /^thumb:(\d{1,12})$/.exec(handle)?.[1];
  if (!id) throw kino.error("not_found", "unknown image handle");
  const r = await kino.fetch(API + "/videos/" + id + "/thumbnail?size=small", { headers: auth() });
  if (!r.ok) throw kino.error("not_found", "no thumbnail (" + r.status + ")");
  const mime = (r.headers["content-type"] || "").split(";")[0].trim();
  if (!MIMES.includes(mime)) throw kino.error("not_found", "not a JPEG, PNG or WebP picture");
  return { bytes: r.base64(), mime };
}

export async function resolve(ref) {
  const video = (await kino.fetch(API + "/videos/" + ref.slice("video:".length), { headers: auth() })).json();
  return { url: video.streamUrl };
}
```

Un plugin que guarda él mismo las imágenes (una miniatura que llegó con un mensaje que indexó) responde desde
`kino.storage`: `const bytes = kino.storage.get(handle); if (!bytes) throw kino.error("not_found"); return { bytes, mime:
"image/jpeg" };`. Kino guarda en caché lo que respondes, así que no hace falta guardar una copia para Kino.

## En el kit { #kit }

`checkOutput` conserva la referencia de un plugin que declara `imageSource` como `{ source: "plugin", handle }` y la
descarta si no, como Kino. `askImage(plugin, manifest, ref)` de `sdk/kino-shim.mjs` le pide la imagen a tu `image` como
lo hace Kino: la capacidad y el export, una referencia válida, una llamada a la vez, 10 s, y las revisiones de la
respuesta. Resuelve con `{ bytes, mime }` (un Buffer) o rechaza diciendo por qué Kino mostraría la imagen de relleno. No
imita la espera detrás del video, la memoria de 5 minutos de un handle que falló ni el caché en disco. Desde la
terminal, `node sdk/run.mjs --out poster.jpg . image <handle>` escribe lo que responde tu `image` (por defecto
`image.<jpg|png|webp>` en la carpeta del plugin), y `node sdk/init.mjs mi-plugin --host example.com --with images` arma
un plugin de apiVersion 13 con un ejemplo de `image` que funciona.
