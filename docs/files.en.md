# Files on the person's device (`files`, apiVersion 21) { #files }

!!! note "Available from Kino 0.9.82"
    apiVersion 21 arrives in Kino 0.9.82. A Kino before 0.9.82 refuses a manifest with `"apiVersion": 21` ("Este plugin
    necesita una versión más nueva de Kino"). Declare 21 only if you use `files`.

A plugin that reads books, plays music or shows videos the person already keeps on their phone or TV declares `files`. The
person picks a file (or a whole folder) with Kino's own picker. The plugin gets an opaque **handle**, never an address, and
reads the file by ranges or hands it to the player. **Nothing is uploaded or sent anywhere by this capability**: the bytes
stay on the device unless your own code sends them somewhere you declared in `hosts`.

```json
{ "apiVersion": 21, "capabilities": ["screen", "files"] }
```

`files` is declarative: nothing to export. Its consent line at install is "Can keep and read the files you pick from this
device, or a whole folder if you pick one" ("Podrá guardar y leer los archivos que tú elijas de este aparato, o una carpeta
entera si la eliges"). Without the capability there is no `kino.files` (`typeof kino.files === "undefined"`). Below 21 the
manifest is refused with "The \"files\" capability needs apiVersion 21". It can stand alone (a plugin that only reads local
files needs no `search`, `home` or `resolve`), and an [enhancement](enhancements.md) may add it.

## The calls { #calls }

```js
// From a press (a screenEvent that follows a tap): the picker.
const [book] = await kino.files.pick({ kinds: ["book"] });            // [] when the person cancels
const head = await kino.files.read(book.id, { start: 0, end: 1000 });  // a Uint8Array, at most 2,000,000 bytes a call
const mine = await kino.files.list();                                  // your handles, newest first
```

| Call | What it does |
| --- | --- |
| `pick({ kinds?, multiple?, copy? })` | Opens the system picker and answers the handles of what was picked (`[]` when the person cancels). `kinds` narrows what the picker offers: `video`, `audio`, `book`, `image`, `subtitle`, `other`. `copy: true` copies the bytes into your plugin's own store (up to 64 MB a file, 1 GB in all); the default keeps a **reference** (a persisted grant), which stops working if the person moves or deletes the file. |
| `pickFolder({ kinds? })` | One grant for a whole folder. List its files with `list({ folder })`. |
| `list({ folder?, kinds? })`, `folders()`, `info(id)` | What you hold, newest first: handles (`list`), the folders picked (`folders`) and one handle's record (`info`). A handle is `{ id, name, size, mime, kind, copied, addedAt, folder? }`; a folder is `{ id, name, addedAt }`. |
| `read(id, { start?, end? })`, `readText(id, { start?, end? })` | The bytes (a `Uint8Array`) or the UTF-8 text of a range, at most 2,000,000 bytes a call. A bigger file is read in several calls. |
| `forget(id)` | Drops a handle (and the copy, if the file was imported with `copy: true`). |
| `url(id)` | `kino-file:<id>`, to use as a stream's or an audio track's `url`: the player plays the file itself. The host rules do not apply to it. |

A handle is an opaque string that belongs to your plugin: another plugin cannot use it (`denied`).

## When the picker may open { #press }

`pick` and `pickFolder` only run from a settings `action`, a `panelAction` or a `screenEvent` that follows the person's own tap or
submit (the same rule as [`kino.qr.scan`](qr.md#where)). Everywhere else (Home, a search, the `open` event, a timer tick, a
`playerEvent`) they reject with `not_allowed`. Listing, reading, `info`, `url` and `forget` need no press: a handle exists only
for what the person picked.

## Playing a local file { #play }

Put `kino.files.url(id)` in a stream (`resolve`) or an audio track and the player plays the file; Kino handles seeking. A local
file is played by Kino itself: it **cannot be cast** to a Chromecast or a DLNA renderer by address, so do not offer Cast for it.

```js
export async function resolve({ ref }) {
  const id = ref.replace(/^f:/, "");
  return { streams: [{ url: kino.files.url(id), label: "On this device" }] };
}
```

## Errors { #errors }

A failed call rejects with an error whose `code` is one of:

| `code` | When | What to do |
| --- | --- | --- |
| `unavailable` | This device has no picker. | Say the feature is not available here. |
| `not_allowed` | `pick` or `pickFolder` outside a press. | Call it from the button's `screenEvent`. |
| `busy` | A picker is already open (yours or another plugin's). | Wait; do not loop. |
| `timeout` | The picker closed after 3 minutes without an answer. | Let the person try again. |
| `invalid_request` | A malformed argument. | Fix the call. |
| `gone` | The file was moved or deleted, or the grant was lost. | Say so in a line and offer to pick it again; do not show an error screen. |
| `too_large` | A `copy: true` file over the per-file limit. | Offer to keep a reference instead. |
| `denied` | The handle is not yours. | Never keep another plugin's ids. |
| `quota` | You hold too many handles, folders or copied bytes. | `forget` the ones you no longer need. |

## Limits { #limits }

| Limit | Value |
| --- | --- |
| Bytes of one `read` or `readText` | 2,000,000 |
| Handles you may hold | 500 |
| Folders you may hold | 20 |
| Files read from one folder | 5,000 |
| Files in one `pick` | 50 |
| One imported file (`copy: true`) | 64 MB |
| All your imported copies | 1 GB |
| The picker stays open | 3 minutes |

- **Not synced.** A handle means nothing on another device. Sync what you save *about* a file (a reading place, a play position)
  under something that identifies the file (its name and size) and not under the handle.
- **Pictures.** To draw a book's cover, read the bytes and give an `Image` a `data:image/png;base64,…` address (see
  [Image](screen-components.md#image)).

## Test with no phone { #test }

The Node kit's `kino.files` answers from the folder named by the `KINO_FILES_DIR` environment variable (default `./.kino-files`):
`pick` hands out the files that are there, in name order. `node sdk/run.mjs` and the kit's tests exercise `pick`, `read`, `list`,
`forget` and the errors without a device; see [Test it locally](test-locally.md).

## What the person sees { #what-people-see }

Android's own file picker, opened over your screen. Kino shows no list of your handles of its own. If the file or the grant is gone
later, your next call answers `gone`.
