# Primer plugin

Dos archivos. `kino-plugin.json`:

```json
{
  "id": "hello-archive",
  "name": "Hola Archive",
  "version": "0.1.0",
  "apiVersion": 1,
  "entry": "plugin.js",
  "description": "Películas de archive.org, en veinte líneas",
  "hosts": ["archive.org", "*.archive.org"],
  "capabilities": ["search", "resolve"]
}
```

`plugin.js`:

```js
const BASE = "https://archive.org";

export async function search(query) {
  const q = "title:(" + query.q + ") AND mediatype:(movies)";
  const url = BASE + "/advancedsearch.php?q=" + encodeURIComponent(q) +
    "&fl%5B%5D=identifier&fl%5B%5D=title&rows=10&output=json";
  const r = await kino.fetch(url);
  if (!r.ok) throw new Error("archive.org respondió " + r.status);
  return r.json().response.docs.map((d) => ({
    id: d.identifier,
    ref: d.identifier,
    title: String(d.title),
    kind: "movie",
    poster: BASE + "/services/img/" + encodeURIComponent(d.identifier),
  }));
}

export async function resolve(ref) {
  const r = await kino.fetch(BASE + "/metadata/" + encodeURIComponent(ref));
  const file = r.json().files.find((f) => f.name.endsWith(".mp4"));
  if (!file) throw new Error("este item no tiene un mp4");
  const path = file.name.split("/").map(encodeURIComponent).join("/");
  return { url: BASE + "/download/" + encodeURIComponent(ref) + "/" + path };
}
```

Ejecútalo (necesita Node 18 o más nuevo; mira [Probar en local](test-locally.md)):

```
node sdk/run.mjs ./plugin.js search "metropolis"
node sdk/run.mjs ./plugin.js resolve TheGiantOfMetropolis1961
```

O deja que el kit te escriba el esqueleto: `node sdk/init.mjs mi-plugin --host example.com` crea
`mi-plugin/` con un manifiesto, un `plugin.js` con todas las funciones, un README y una prueba basada
en respuestas grabadas.

Este es ingenuo a propósito (una consulta con un `/` o un `AND` suelto hace que archive.org responda
con un error, y nada revisa la forma de la respuesta). El plugin de referencia,
[kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive), es la versión
robusta de la misma idea; lee [cómo está hecho](examples.md#reference-plugin) antes de construir
sobre él.

## De dónde sale el `sdk/` { #get-the-sdk }

El **kit** es la carpeta `sdk/` que viene dentro de los plugins de ejemplo. No se instala con npm ni
con nada: son archivos `.mjs` que corres con Node 18 o más nuevo. La forma más fácil de tenerlo es
crear tu plugin a partir de una plantilla, y así el kit ya viene adentro.

**Pasos (recomendado):**

1. Entra a la plantilla que más se parezca a lo que quieres hacer:
    - [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server): el
      ejemplo completo (ajustes, usuario y contraseña, descargas, canales en vivo).
    - [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive): el más
      simple, para un sitio con búsqueda y videos.
2. Arriba a la derecha, oprime el botón verde **Use this template → Create a new repository**.
   Ponle nombre a tu repositorio y déjalo **público**.
3. Descárgalo a tu computador y prueba que el kit funciona:

    ```
    git clone https://github.com/<tu-usuario>/<tu-repositorio>.git
    cd <tu-repositorio>
    node sdk/validate.mjs .
    ```

    Si ves `✓ Kino would accept this plugin`, ya tienes todo listo para empezar a cambiar `plugin.js`
    y `kino-plugin.json`.

!!! warning "Usa la plantilla, no el botón Fork"
    **Use this template** crea un repositorio nuevo e independiente, que es tuyo. **Fork** crea una
    copia enlazada al original, y Kino **no muestra los forks** en "De la comunidad"
    ([Hazte encontrar](publish.md#get-found)). Si le haces fork, tu plugin nunca aparecerá en la
    búsqueda de la app.

**¿Ya tienes tu propio repositorio?** Copia solo la carpeta `sdk/` de cualquiera de las dos
plantillas dentro de tu repositorio (por ejemplo, descargando el ZIP desde el botón **Code →
Download ZIP**). Los comandos son los mismos: `node sdk/validate.mjs .`, `node sdk/run.mjs …`.

## Siguientes pasos { #next }

- [Manifiesto](manifest.md): cada campo y lo que aprueba la persona.
- [Contrato](contract.md): las formas que devuelves y las reglas con las que Kino las revisa.
- [Límites y trampas del motor](engine-limits.md): lee [la trampa del rechazo](engine-limits.md#rejection-trap)
  antes de escribir una función auxiliar.
