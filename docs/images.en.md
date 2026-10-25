# Images from the plugin (`imageSource`, apiVersion 13) { #images }

!!! note "apiVersion 13 is in development"
    Nothing on this page is in a released Kino yet. apiVersion 13 is planned for the next Kino version (0.9.75 is
    provisional); today's Kino (0.9.74) supports up to apiVersion 12 and refuses a manifest with `"apiVersion": 13`
    ("Este plugin necesita una versión más nueva de Kino"). The contract and the kit already know it, so you can write and
    test a plugin now and publish it when that version is out.

Kino draws a poster, backdrop or still from a public URL. Some pictures have no such URL: the thumbnail a messaging
service attaches to a video file, the cover inside a private library, an image behind your service's login. With
`imageSource` your plugin hands Kino an **image reference** instead, and Kino asks your plugin for the bytes when the card
comes on screen. Use it when only your plugin can fetch the picture; a public URL stays the better choice when there is
one (Kino loads it itself, without waking your plugin).

## Declaring it { #declare }

`imageSource` needs `"apiVersion": 13` and the export `image`. No consent line and no approval: it
reaches nothing new, it hands Kino pictures. Below 13 the manifest is refused with "The \"imageSource\" capability needs
apiVersion 13"; without the export the install fails with "El plugin no carga: le falta image".

```json
"apiVersion": 13,
"capabilities": ["home", "search", "resolve", "imageSource"]
```

## The reference { #reference }

Wherever these fields are read, a plugin that declares `imageSource` may answer an object instead of
a URL:

```json
{ "source": "plugin", "handle": "thumb:1234" }
```

- Fields: an item's `poster` and `backdrop` (Home rows, search, "Ver más", your section's rows), an
  episode's `still`, the `poster` and `backdrop` of `episodes().series` and of a `details` answer, and a section hero's
  `image`. Anywhere else (a channel logo, a category's `art`, a `meta` answer, a layout image) a reference is ignored like a
  bad URL, and so is a reference from a plugin that does not declare the capability.
- `handle` is yours and opaque to Kino: 1 to 512 characters, no control character. A malformed reference is no image;
  the item itself stays.
- There is no per-answer cap on references: Kino asks only for the pictures that come on screen, one at a time.
- Strings are always URLs. Kino turns your reference into an address of its own that names your plugin, and only Kino's
  own parser can make one: a string that looks like it is ignored, so no plugin can make Kino ask another plugin for an
  image.

## The `image` export { #export }

Kino calls it with the handle you returned and expects the picture, base64-encoded:

```js
export async function image({ handle }) {
  return { bytes: "<base64 of the picture>", mime: "image/jpeg" };   // or "image/png", "image/webp"
}
```

- `bytes` is canonical base64 (the standard alphabet, padded, no whitespace or line breaks), at most 262,144 bytes
  (256 KB) once decoded. `mime` is `image/jpeg`, `image/png` or `image/webp`, and the bytes must really be that type (Kino
  checks their first bytes). A card's picture, not a photo: send the smallest size the service offers.
- It has 10 seconds. It runs in the background: nobody is asked anything, and a slow answer never marks your plugin "No
  responde".
- What it throws (any `kino.error` code), a wrong answer or a timeout: the card shows its placeholder, nothing more. The
  person never reads an error for a picture.

## What Kino does { #what-kino-does }

| What | How |
| --- | --- |
| When | When a card with a reference comes on screen (phone and TV alike), never ahead of it. A card scrolled away before its turn is never asked for. |
| One at a time | At most 1 `image` call in flight for your plugin; the next waits for it. Another plugin's images are asked alongside. |
| Playback first | No `image` call starts while one of your [byte streams](bytes.md) is open (on the phone or served to a TV), or while your `read` is queued or running or ended less than 2 s ago: the video keeps its turn. An image waits up to 20 s for that to end (it starts as soon as the stream closes), then is skipped (asked again the next time the card is drawn). A `read` that comes while an `image` call runs waits for that one call, so answer fast. A timed-out `image` call costs your plugin its sandbox: QuickJS cannot be interrupted, so Kino discards the runtime, and with it any socket or session it holds, and the next call starts a fresh one. |
| Once | The picture goes to Kino's image disk cache, under your plugin, its installed version and the handle: the same handle is not asked again until the cache drops it or your plugin is updated (an update asks again, so a fixed picture shows). |
| Failures | A handle that failed is not asked again for 5 minutes. 2 timeouts in a row pause all your images for 5 minutes (each timeout costs your plugin its sandbox, and the connection it keeps). |
| A call that started | Always runs to its end and is stored, even if the card went away meanwhile: cancelling it would restart your plugin. |

## Privacy { #privacy }

Kino keeps the reference wherever it keeps the title's poster: the library, the history, "Continuar
viendo", the person's lists. Those rows sync to the person's other devices and go into their backups, so never put a secret in a handle (a
token, a password, a signed URL): put an id there and the secret in a [sealed secret](manifest.md#secrets) or
`kino.storage`. A reference only loads on the device that read it from your answer; elsewhere (another of the person's
devices, a restored backup, a shared kit) it shows the placeholder. A reference is never sent to a Chromecast, a DLNA TV, the system's media controls or the TV launcher's rows: those get no
picture.

## Known limits { #known-limits }

- A title saved with a reference (library, history, "Continuar viendo", lists) keeps that poster as saved: on another of
  the person's devices, after a restore, or after this device lost its image key (a reinstall, the app's data cleared),
  that saved poster stays the placeholder. Kino does not rewrite saved rows; your Home rows, search and pages show the
  picture again, because they come from your plugin's new answer on that device.
- A picture Kino refused when the card was drawn (your plugin was switched off, not set up, being updated or not
  installed at that moment, or the address was not this device's) is not asked again while that card stays on screen; it
  is asked the next time the card is drawn.
- Only the pictures on screen are asked, one at a time: a long row of references fills in card by card.

## A complete plugin { #example }

A service whose thumbnails need the person's token: the item's `poster` is the public poster when
the service has one, and a reference otherwise. Kino asks `image` only for the second kind.

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

A plugin that keeps the pictures itself (a thumbnail that came with a message it indexed) answers from `kino.storage`
instead: `const bytes = kino.storage.get(handle); if (!bytes) throw kino.error("not_found"); return { bytes, mime:
"image/jpeg" };`. Kino caches what you answer, so there is no need to keep a copy for Kino's sake.

## In the kit { #kit }

`checkOutput` keeps a reference of a plugin that declares `imageSource` as `{ source: "plugin", handle }`
and drops it otherwise, as Kino does. `askImage(plugin, manifest, ref)` from `sdk/kino-shim.mjs` asks your `image` the way
Kino does: the capability and the export, a valid reference, one call at a time, 10 s, and the answer's checks. It
resolves with `{ bytes, mime }` (a Buffer) or rejects saying why Kino would show the placeholder. It does not mirror
the wait behind playback, the 5-minute memory of a failed handle or the disk cache.
