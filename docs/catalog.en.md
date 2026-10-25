# Catalog and large storage (`catalog`, `storageLarge`, apiVersion 13) { #catalog }

!!! note "apiVersion 13 is in development"
    Nothing on this page is in a released Kino yet. apiVersion 13 arrives in Kino 0.9.74, the next release, together with
    apiVersion 12; it is not published yet. Every Kino before 0.9.74 refuses a manifest with `"apiVersion": 13` ("Este
    plugin necesita una versión más nueva de Kino"). The contract and the kit already know it, so you can write and test a
    plugin now and publish it when Kino 0.9.74 is out.

A plugin whose source is a big library (every video of a Telegram channel, a site's whole archive, a self-hosted media
folder) needs to find things in thousands of records. Keeping them in `kino.storage` and filtering in JavaScript means
loading the whole list into your plugin's 64 MB of QuickJS memory on every search. `kino.catalog` keeps them in a SQLite
database that Kino owns for your plugin, and searches them there: your code only ever holds the page it asked for.

## Which store to use { #which-store }

| You keep | Use | Why |
| --- | --- | --- |
| Settings, a token, a cursor, a few small JSON values | `kino.storage` | 256 KB, synchronous, carried by a password-protected backup |
| A few big opaque blobs you read whole (a cached index file, a key bundle) | `kino.storage` with [`storageLarge`](#storage-large) | 16 MB, one file per value, device-only |
| Thousands of records you search, sort and page through | `kino.catalog` | up to 100,000 items in a 64 MiB file (about 670 bytes per item on average, so keep `data` small), searched by Kino, never loaded whole |

## Declaring it { #declare }

```json
"apiVersion": 13,
"capabilities": ["search", "resolve", "catalog"]
```

`catalog` is declarative: nothing to export, no consent line and no approval (it is room on this device, not reach to
anyone). An older Kino refuses the manifest ("Este plugin necesita una versión más nueva de Kino"), and a manifest below `apiVersion` 13 is
refused with "The \"catalog\" capability needs apiVersion 13". A plugin that does not declare it has no `kino.catalog` at
all (`typeof kino.catalog === "undefined"`), and neither does `sign()`.

## The operations { #operations }

Every operation is `async` (`await` it) and answers plain JSON values. All six, with their exact shapes:

| Call | Takes | Answers |
| --- | --- | --- |
| `kino.catalog.upsert(items)` | an array of at most 500 `{ id, title, sort?, data? }` | `{ count }`: how many items were written |
| `kino.catalog.search(options?)` | `{ q?, limit?, offset?, order? }`: `q` default `""` (everything), `limit` default 50 (1 to 100), `offset` default 0 (0 to 1,000,000), `order` default `"newest"` | `{ items, total }`: one page of `{ id, title, sort, data }` and the count of every match |
| `kino.catalog.get(ids)` | an array of at most 500 ids | the items found, in the order asked; missing ids are skipped, a repeated id comes once |
| `kino.catalog.remove(ids)` | an array of at most 500 ids | `{ count }`: how many were there and are now gone |
| `kino.catalog.clear()` | nothing | nothing: every item is gone and Kino deletes the file |
| `kino.catalog.count()` | nothing | the number of items |

A whole mini-plugin, runnable as it is (the Node kit's tests run this very code against a fake source). It indexes a
source that pages its videos newest first, a few pages per Home call so no call runs past its time limit; answers
`search` from the catalog only; drops a video the source deleted when someone tries to play it; and starts over once a
week (which also drops what the source deleted) or when the catalog comes back empty after a restore or a reset.

```js
// kino-plugin.json (the parts that matter): {"apiVersion": 13, "capabilities": ["home", "search", "resolve", "catalog"], "hosts": ["api.example.org"]}
const BATCH = 500;                         // maxUpsertBatch
const MAX_TITLE = 300;                     // maxTitleChars
const PAGES_PER_CALL = 3;                  // a few source pages per Home call
const ID_RE = /^[A-Za-z0-9._~-]{1,120}$/;  // fits a Kino Item id (128 characters) once prefixed with "v"
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function sourcePage(cursor) {
  const url = "https://api.example.org/videos" + (cursor ? "?after=" + encodeURIComponent(cursor) : "");
  const r = await kino.fetch(url);
  if (!r.ok) throw kino.error("unavailable", "the source answered " + r.status);
  return r.json(); // { videos: [{ id, caption, date, file, poster }], next }, newest first
}

// At most `max` characters (JavaScript's length, as Kino counts them), never cutting a character in two.
function clip(text, max) {
  let t = String(text).slice(0, max);
  if (/[\uD800-\uDBFF]$/.test(t)) t = t.slice(0, -1);
  return t;
}

// One source video as a catalog item, or null to skip it. A caption can be missing or far longer than 300 characters,
// and one bad item would refuse its whole batch of 500: the title is never empty and always fits, the id fits Kino's
// Item id, and `data` holds only small fields.
function toItem(v) {
  const id = String(v.id);
  if (!ID_RE.test(id)) return null;
  const title = clip(String(v.caption || "").replace(/\s+/g, " ").trim(), MAX_TITLE) || "Video " + id;
  return {
    id,
    title,
    sort: Number.isSafeInteger(v.date) ? v.date : 0, // "newest" = the biggest date first
    data: { file: clip(v.file || "", 200), poster: v.poster ? clip(v.poster, 500) : null },
  };
}

async function upsertAll(items) {
  for (let i = 0; i < items.length; i += BATCH) await kino.catalog.upsert(items.slice(i, i + BATCH));
}

// The catalog stays on this device, but kino.storage travels in a backup: after a restore, on a new device or after a
// "damaged" reset the catalog is empty while the markers still say it was indexed. Start over then.
async function forgetIndexIfEmpty() {
  if (kino.storage.get("indexedAt") !== null && (await kino.catalog.count()) === 0) {
    kino.storage.remove("indexedAt");
    kino.storage.remove("cursor");
  }
}

// One step of indexing, from Home (20 s per call), never from search (15 s, and the person is waiting):
// - not complete yet: go on with the full pass where the last step stopped (a cursor in kino.storage);
// - complete: read from the newest video and stop at the first page holding an item already indexed;
// - a week after the last full pass: clear and index again.
async function indexStep() {
  const at = Number(kino.storage.get("indexedAt"));
  if (at && Date.now() - at > WEEK_MS) {
    await kino.catalog.clear();
    kino.storage.remove("indexedAt");
    kino.storage.remove("cursor");
  }
  const complete = kino.storage.get("indexedAt") !== null;
  let cursor = complete ? null : kino.storage.get("cursor");
  for (let i = 0; i < PAGES_PER_CALL; i++) {
    const page = await sourcePage(cursor);
    const items = page.videos.map(toItem).filter((it) => it !== null);
    const known = complete && items.length > 0 && (await kino.catalog.get(items.slice(0, BATCH).map((it) => it.id))).length > 0;
    await upsertAll(items);
    if (known || !page.next) {
      if (!complete) {
        kino.storage.set("indexedAt", String(Date.now()));
        kino.storage.remove("cursor");
      }
      return;
    }
    cursor = page.next;
    if (!complete) kino.storage.set("cursor", cursor);
  }
}

const toKinoItem = (it) => ({ id: "v" + it.id, ref: it.id, title: it.title, kind: "movie", poster: (it.data && it.data.poster) || undefined });

export async function home() {
  try {
    await forgetIndexIfEmpty();
    await indexStep();
  } catch (e) {
    // The source or the catalog is unavailable right now: show what the catalog already has; the next Home goes on.
    if (e.code !== "unavailable") throw e;
    kino.log("indexing paused: " + e.message);
  }
  const newest = await kino.catalog.search({ limit: 20 });
  return [{ id: "newest", title: "Newest", items: newest.items.map(toKinoItem) }];
}

export async function search(query) {
  // The catalog only: cheap enough for every keystroke, and never the network.
  const page = await kino.catalog.search({ q: String(query.q || "").slice(0, 256), limit: 50 });
  return page.items.map(toKinoItem);
}

export async function resolve(ref) {
  const [item] = await kino.catalog.get([ref]);
  if (!item) throw kino.error("not_found", "no longer in the catalog");
  const r = await kino.fetch("https://api.example.org/files/" + encodeURIComponent(item.data.file));
  if (r.status === 404) {
    await kino.catalog.remove([ref]); // the source deleted it: drop it now, not at the weekly rebuild
    throw kino.error("not_found", "the source deleted this video");
  }
  return { url: r.json().url };
}
```

A Kino `Item`'s `id` must match `^[A-Za-z0-9._~-]{1,128}$`; a catalog `id` can be any string of 1 to 128 characters, so
map it when yours has other characters or would pass 128 once prefixed (the example skips such videos; a hash of the id
works too).

## How search matches { #search }

- **Case and accents do not matter.** Kino keeps each title lower-cased with its accents removed (Unicode NFD without
  the combining marks) and does the same to `q`: `"pelicula"`, `"PELÍCULA"` and `"Película"` all find "Película";
  `"nandu"` finds "Ñandú". Control characters other than whitespace (a NUL, an escape code) are dropped from both, so
  `"ab\u0000zz"` and `"abzz"` find the same items.
- **Every word must be there, in any order, as part of the title.** `q` is split on whitespace; each word must appear
  somewhere in the title: `"rojo gato"` and `"gato rojo"` both find "El gato ROJO", and `"gat roj"` finds it too. There
  is no ranking and no fuzzy match: an item either matches or not.
- **`%`, `_` and `\` are plain characters.** They are never wildcards: `"50%"` finds "50% off" and not "50 off";
  `"a_b"` finds "a_b" and not "axb". No query can run anything: there is no SQL on your side at all.
- **Empty, blank or absent `q` lists everything** (in the order asked).
- **Only `title` is searched**, never `id` or `data`. Put every word a person might type in the title.
- **Order.** `"newest"` (the default): `sort` from biggest to smallest; `"oldest"`: smallest first; `"title"`: by the
  title without case or accents, then the title as written, then the id. Ties are always broken by `id`, so the same
  query pages the same way every time.
- **`items` and `total`.** `items` is the page (at most `limit`); `total` is how many items match in all. There is more
  when `offset + items.length < total`.
- **Paging.** `limit` is 1 to 100 (default 50) and `offset` 0 to 1,000,000, whole numbers (`NaN` or `Infinity` is
  `invalid_request`); an `offset` past the end answers no items and the same `total`. `q` is at most 256 characters.

```js
await kino.catalog.search({ q: "gato rojo" });                                  // newest first, 50 at most
await kino.catalog.search({ q: "gato", order: "title", limit: 20, offset: 40 }); // the third page of 20, A to Z
const { total } = await kino.catalog.search({ q: "2001", limit: 1 });            // just the count of matches
```

## The data model { #data-model }

One table, one row per item: `id` (your key, 1 to 128 characters), `title` (at most 300 characters; the only thing
searched), `sort` (a whole number, default 0: a date in milliseconds, a message number, an episode number) and `data`
(an optional plain object whose JSON is at most 4,096 bytes in UTF-8, given back as you stored it). Put in `data` the
few fields you show or need to play (a poster URL, a duration, a file reference), never blobs, pages of HTML or
credentials. `upsert` with an `id` that is already there **replaces the whole item**: a field you leave out is gone
(the `data` too). A batch is one transaction: if any item in it is refused, nothing of it is written, so clean your items
first (as `toItem` does above) rather than sending what the source gave you as it is.

## How many items fit { #how-many }

Two limits hold at once: 100,000 items and a 64 MiB file. 100,000 items fit only when an item
costs at most about 670 bytes of the file on average: its id, its title twice (as written and without case or
accents), its `data`, and the two search indexes. Measured in Kino's tests with a 50-character title: about 370 bytes
with no `data` (100,000 fit, in 37 MB), about 690 bytes with 300 bytes of `data` (about 96,000 fit), about 920 bytes
with 500 bytes (about 72,000), and about 4,850 bytes with 4,000 bytes (about 13,800). Keep `data` small: a file
reference and a poster URL, not a description.

## Limits and errors { #limits }

| Limit | Value |
| --- | --- |
| Items per plugin | 100,000, if they fit in the file (see "How many items fit") |
| `id` | 1 to 128 characters |
| `title` | at most 300 characters |
| `data` | at most 4,096 bytes of JSON (UTF-8) |
| Items per `upsert`, ids per `get` or `remove` | 500 |
| `search` `limit` | default 50, at most 100 |
| `search` `offset` | at most 1,000,000 |
| `search` `q` | at most 256 characters |
| The database file | at most 64 MiB |

Every refusal is a `KinoError` whose `code` says what to do, and whose message names the limit:

| `code` | When | What to do |
| --- | --- | --- |
| `invalid_request` | A wrong shape or type: `upsert` without an array, an item without a string `id` or `title`, a fractional or non-finite `sort`, a `data` that is not an object, a `limit` of 0 or `NaN`, an unknown `order`. | Fix the call; the message says which item (`item 3`) and which field. |
| `too_large` | One value or one batch over its limit: `"kino.catalog.upsert: at most 500 items per call (maxUpsertBatch)"`, `"kino.catalog.upsert: item 0 data is over 4096 bytes as JSON (maxDataBytes)"`, a long `id` or `title`, `"kino.catalog.search: limit is over 100 (maxSearchLimit)"`, an `offset` or `q` over its limit. | Split the batch, shorten the value, ask a smaller page. |
| `limit` | The catalog is full: `"kino.catalog.upsert: the catalog is full (maxItems 100000)"` or `"kino.catalog.upsert: the catalog file is full (maxDbBytes 64 MiB)"`. | Remove items you no longer need (or `clear` and index less, with smaller `data`), then try again. |
| `unavailable` | Kino could not read or write the file right now (the device's storage failed or is full), or the plugin was just removed. When the file was corrupt, Kino deletes it and starts an empty one, and that call says `"kino.catalog: the catalog file was damaged and has been reset to empty; rebuild it"`. A file a newer Kino wrote (after the person went back to an older Kino) says `"kino.catalog: the catalog file was made by a newer Kino"` on every call until you `clear()` it. | Try again later; after "damaged", index again from your source; after "made by a newer Kino", `clear()` (it deletes that file and starts a new one) and index again. |

A refused `upsert` writes nothing of its batch, so retrying a smaller one is safe. Kino never deletes your catalog on an
I/O error: only a file SQLite reports as corrupt is replaced.

## Isolation and privacy { #privacy }

- **One database file per plugin.** Your catalog is `catalog.db` inside your plugin's own data folder, named from your
  plugin's id alone; Kino picks it when it starts your plugin, and no argument you pass can name another plugin or
  another file. No other plugin can read or change your items, and you cannot read theirs.
- **No SQL from plugins, ever.** You only have the six operations above; every value you send is bound as a parameter.
- **It stays on this device: never synced, and excluded from backups.** It is a rebuildable cache of your source. No
  backup carries it, so on another device, after a restore there, or after the person uninstalls and reinstalls your
  plugin, it is empty: check `kino.catalog.count()` (as `forgetIndexIfEmpty` does above) and index again from your source.
- **Uninstalling the plugin deletes the file**, and a call of yours still running at that moment cannot create it again.
- **Credentials do NOT belong here.** Keep tokens and sessions in [sealed secrets](manifest.md#secrets), the
  person's settings or `kino.storage`, never in `data`.

## Performance { #performance }

- Write in batches of up to 500 items: each `upsert` is one transaction, much faster than one call per item.
- Never load the whole catalog into memory to filter it yourself: ask `search` for a page and let Kino do the
  matching. A page is at most 100 items.
- Page through big results with `limit`/`offset` instead of asking everything; read `total` with `limit: 1` when you only
  need the count.
- What it costs: a search reads every title once (a substring match cannot use an index to find words; the indexes
  carry the searched text so the rows themselves are read only for matches) plus the page asked for. Measured in Kino's
  JVM tests on a desktop computer (an Apple Silicon Mac), not on a phone or a TV box: two searches with their totals over
  50,000 items took 68 to 86 ms, with no `data` and with 500 bytes or 4,000 bytes of `data` per item alike. A phone or
  a 1 GB TV box is slower by a factor nobody has measured yet: test your plugin on the slowest device you support.
- Index from Home or a refresh of your own, a few source pages per call, never inside `search`: every call has its own
  time limit (15 s for `search`, 20 s for `home`) and the person waits for a search.

## Recipes { #recipes }

- **Index a remote library incrementally.** As `indexStep` above: a full pass the first time, a few pages per call with
  a cursor in `kino.storage`; after that, read from the newest item and stop at the first page holding an item already
  indexed (`kino.catalog.get` answers it), `upsert`ing each page as you go. A full rebuild (`clear` then index) is for a
  schedule (once a week drops what the source deleted) or when your source changed shape.
- **Search as the person types.** In a "Ver más" page with `scopedSearch`, Kino waits 400 ms after the person stops
  typing before it calls your `search`, and a new query can follow right after: answer each call straight from
  `kino.catalog.search({ q: query.q })`, never from the network. While the catalog is still empty, answer what it has
  (nothing): Home fills it.
- **Say when older items are not loaded yet.** While the full pass is not complete (the `cursor` marker above is still
  there), add an item to your Home row, or a `userMessage` to an empty search, that says the library is still being
  read; drop it once `indexedAt` is set.

## A bigger storage instead: `storageLarge` { #storage-large }

A plugin that indexes a catalog (thousands of videos of a channel, a library it builds from its source) runs out of
256 KB after a few hundred entries. To **search** thousands of records, use [`kino.catalog`](#catalog)
instead: it never loads them into your memory. Declare `storageLarge` and the same `kino.storage` holds **16 MB in total
(16,777,216 bytes: every key and value, UTF-8), at most 2 MB per value (2,097,152 bytes) and at most 1,000 keys of at
most 256 characters**:

```json
"apiVersion": 13,
"capabilities": ["search", "resolve", "storageLarge"]
```

- Same API and the same `ttlMs` rules. Declarative (nothing to export) and no consent line: it is room on the device,
  not reach.
- **Shard the catalog into values of at most about 512 KB** (`catalog:0`, `catalog:1`, ... plus a small key that says
  how many there are). Every string your plugin holds costs QuickJS memory (a 2 MB string is 4 MB of your 64 MB), and
  Kino keeps each value in its own file: a `get` reads one value, a `set` writes one value, so small shards stay fast on
  a 1 GB TV box.
- Going over throws a `KinoError` with `code` `"too_large"`: `"plugin storage full (2 MB per value)"`,
  `"plugin storage full (16 MB)"` when the whole store would pass 16 MB, `"plugin storage full (1000 keys)"`. A key
  longer than 256 characters is `"invalid_request"`. A refused write changes nothing.
- **It is device-only: never synced and NOT in any backup.** A plugin without the capability has its 256 KB
  `kino.storage` carried by a backup with a password; a plugin with `storageLarge` has nothing of its `kino.storage` in
  a backup, and restoring one leaves it empty. Treat it as a cache you rebuild from your source.
- **Declaring `storageLarge` moves your existing keys into that device-only store.** The first call after an update that
  adds it moves everything your plugin had stored (tokens and sessions included) out of the backed-up store, at most
  1,000 keys of at most 256 characters (the rest is dropped). Keep credentials and sessions in
  [sealed secrets](manifest.md#secrets) or the person's settings, or in a plugin that does not declare
  `storageLarge`.
- An update that drops `storageLarge` starts again from an empty 256 KB store (the larger one stays on the device until
  the capability comes back or the plugin is uninstalled).
- An older Kino refuses a manifest with `storageLarge` ("Este plugin necesita una versión más nueva de Kino").
