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

The **kit** is the `sdk/` folder inside the example plugins. Nothing to install with npm or anything
else: they are `.mjs` files you run with Node 18 or newer. The easiest way to get it is to create
your plugin from a template, so the kit is already inside.

**Steps (recommended):**

1. Open the template closest to what you want to build:
    - [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server): the
      complete example, "Tu servidor" 1.5.0 (settings, user and password, downloads, live channels, and
      every feature up to apiVersion 7).
    - [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive): the
      simplest, for a site with search and videos.
    - [kinotvapp/kino-plugin-archive-audio](https://github.com/kinotvapp/kino-plugin-archive-audio):
      music and podcasts (apiVersion 8, Kino 0.9.54; see [Music and podcasts](music.md)).
2. Top right, press the green **Use this template → Create a new repository** button. Name your
   repository and keep it **public**.
3. Download it to your computer and check the kit works:

    ```
    git clone https://github.com/<your-user>/<your-repository>.git
    cd <your-repository>
    node sdk/validate.mjs .
    ```

    If you see `✓ Kino would accept this plugin`, you are ready to start changing `plugin.js` and
    `kino-plugin.json`.

!!! warning "Use the template, not the Fork button"
    **Use this template** creates a new, independent repository that is yours. **Fork** creates a
    copy linked to the original, and Kino **does not show forks** in "De la comunidad"
    ([Get found](publish.md#get-found)). If you fork, your plugin will never show up in the app's
    search.

**Already have your own repository?** Copy just the `sdk/` folder from either template into it (for
example by downloading the ZIP from **Code → Download ZIP**). The commands are the same:
`node sdk/validate.mjs .`, `node sdk/run.mjs …`.

## Next steps { #next }

- [The manifest](manifest.md): every field and what the person approves.
- [The contract](contract.md): the shapes you return and the rules Kino checks them with.
- [Limits and engine quirks](engine-limits.md): read [the rejection trap](engine-limits.md#rejection-trap)
  before you write a helper (it matters on Kino 0.9.49 and older).
- [Get listed in Kino](listed.md): once it works, the five steps for people to find it in the app
  without knowing its address.
