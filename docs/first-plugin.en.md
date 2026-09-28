# A first plugin

Two files. `kino-plugin.json`:

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

Run it (needs Node 18 or newer; see [Test it locally](test-locally.md)):

```
node sdk/run.mjs ./plugin.js search "metropolis"
node sdk/run.mjs ./plugin.js resolve TheGiantOfMetropolis1961
```

Or let the kit write the skeleton for you: `node sdk/init.mjs my-plugin --host example.com` creates
`my-plugin/` with a manifest, a `plugin.js` with every function, a README and a replay-based test.

This one is deliberately naive (a query with a `/` or a lone `AND` makes archive.org answer with
an error, and nothing checks the shape of the reply). The reference plugin,
[kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive), is the robust
version of the same idea; read [how it is built](examples.md#reference-plugin) before you build on it.

## Where the `sdk/` comes from { #get-the-sdk }

The kit is not a package: it is the `sdk/` folder of the example plugins, and there is nothing to
install. Get it in one of these ways:

- Create your repository from the template
  [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) ("Use this
  template"); `sdk/` comes with it.
- Or clone that repository anywhere and copy (or point at) its `sdk/` folder:
  `node /path/to/sdk/run.mjs ./plugin.js ...` works from any folder.

Do not fork the template to publish your plugin: forks are left out of Kino's community search
([Get found](publish.md#get-found)).

## Next steps { #next }

- [The manifest](manifest.md): every field and what the person approves.
- [The contract](contract.md): the shapes you return and the rules Kino checks them with.
- [Limits and engine quirks](engine-limits.md): read [the rejection trap](engine-limits.md#rejection-trap)
  before you write a helper.
