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

El kit no es un paquete: es la carpeta `sdk/` de los plugins de ejemplo, y no hay nada que instalar.
Consíguelo de una de estas formas:

- Crea tu repositorio desde la plantilla
  [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) ("Use this
  template"); `sdk/` viene incluido.
- O clona ese repositorio en cualquier parte y copia (o apunta a) su carpeta `sdk/`:
  `node /ruta/a/sdk/run.mjs ./plugin.js ...` funciona desde cualquier carpeta.

No le hagas fork a la plantilla para publicar tu plugin: la búsqueda de la comunidad de Kino deja
los forks por fuera ([Hazte encontrar](publish.md#get-found)).

## Siguientes pasos { #next }

- [Manifiesto](manifest.md): cada campo y lo que aprueba la persona.
- [Contrato](contract.md): las formas que devuelves y las reglas con las que Kino las revisa.
- [Límites y trampas del motor](engine-limits.md): lee [la trampa del rechazo](engine-limits.md#rejection-trap)
  antes de escribir una función auxiliar.
