# Limits and engine quirks

## Every number in one place { #limits }

<!-- contract:limits:start -->
| What | Limit |
| --- | --- |
| Manifest / entry file / icon | 16 KB / 1 MB / 128 KB |
| Memory / stack, per plugin | 64 MB / 1 MB |
| Time per call | `search` 15 s; `home`, `browse`, `episodes`, `resolve` 20 s each (`resolve` of a plugin Kino itself generates, from a Nuvio scraper or a Stremio addon: 75 s); `liveCategories`, `liveChannels`, `guide` 20 s each; `liveSearch` 15 s; counting all your fetches and sleeps together, but not the time the person spends answering a host question for that call |
| Loading the module (its top level) | 10 s |
| Idle sandbox | closed after 5 minutes without calls |
| Consecutive timeouts | 3 in a row and Kino disables the plugin ("No responde") |
| `kino.fetch` | https only (or the person's own server as typed, or `http` on a host declared `insecureHttp`); 15 s default, 30 s maximum; response body at most 5 MB; the request (URL, headers and body) at most 1,048,576 characters; at most 60 requests per call, every hop counted, refused ones included (250 for a plugin converted from a Nuvio scraper); at most 6 fetches in flight at once; at most 3 host questions per call; at most 10 redirects per request |
| Cookies | 50 per domain, 64 KB in total per plugin |
| `kino.storage` | 256 KB per plugin; an entry's optional `ttlMs` is 1..2,592,000,000 ms (30 days) |
| `kino.sleep` | 0 to 5,000 ms per call |
| `kino.crypto` | data at most 5 MB per call; PBKDF2 at most 100,000 iterations and 64-byte keys; `randomBytes` at most 1,024 |
| `kino.log` / `console.*` | 2,000 characters per message; when a call of a recommended-catalog plugin fails, its last 30 lines (each cut at 300 characters, scrubbed, 2,048 characters in all) go with the failure report |
| What a function returns | at most 2,000,000 characters once turned into JSON |
| Results | `search` 100 items; `home` 20 rows of 60; `browse` 100 per page; `episodes` 5,000 (and 50 `seasons`); `ref` 4,096 characters; `next` 2,048 characters; `id` matches `^[A-Za-z0-9._~-]{1,128}$` |
| Live channels (apiVersion 3) | `liveCategories` 200; `liveChannels` 500 per page, 10 pages at first and 5 more per scroll, 10,000 channels (200 pages) per category; `liveSearch` 100 channels, asked from 2 characters; `guide` 50 channels and 24 h per call, 100 entries per channel; `number` 1..9999 |
| Settings | at most 12; `text` 500, `url` 2,048, `password` 500 characters |
| Error messages | your `kino.error` message is shown as a detail, cut at 200 characters |
| `hosts` | at least 1 entry, no upper limit from Kino 0.9.45 (only the manifest's 16 KB; Kino 0.9.44 and older refuse more than 20); from apiVersion 2, none (`[]`) when a `url` setting exists |
| `secrets` (apiVersion 4) | at most 16; names match `^[A-Za-z][A-Za-z0-9_]{0,31}$`; a value is 1..4,096 bytes |
<!-- contract:limits:end -->

The 60 requests of `kino.fetch` count every hop, refused ones included (a plugin converted from a
[Nuvio scraper](nuvio.md) gets 250); at most 6 of your fetches are in flight at once, and one call
asks the person about at most 3 hosts ([details](kino-api.md#fetch)).

## How your code lives { #lifecycle }

- **One call at a time.** Calls to the same plugin run one after another. The sandbox is reused
  between calls, but Kino throws it away after 5 idle minutes, after a timeout, when a call is
  cancelled (for example a newer search replaces an older one), and when the plugin is updated or
  disabled. Module-level variables are a cache at best: keep anything that must survive in
  `kino.storage`.
- **Load-time code.** When it installs your plugin, Kino loads the module once in a throwaway sandbox
  without network access, to check that every declared capability is an exported function. Keep the
  top level to declarations: a network call there fails, and the install with it.
- **Errors reach people.** If your function throws, that call fails and the person sees an error that
  names your plugin, and the text of your `Error` can be part of it. Write those messages for a
  person, in Spanish, short.
- **Runaway code.** Running out of memory or stack fails the call. A synchronous infinite loop
  (`while (true) {}`) **cannot be interrupted**: at the time limit Kino stops waiting for the call
  and discards the sandbox, but the loop keeps spinning on its own thread until it ends, which for a
  real infinite loop means until the app is closed. Three timeouts in a row disable the plugin.
- **App closed during a call.** A crash inside the engine, or being killed for memory, can take the
  whole app down mid-call, and nothing in-process can catch that. Kino notices at the next start:
  whichever plugins were mid-call at that moment each get an unclean exit counted against them —
  **including a healthy plugin that simply happened to be running at the same time**, not only the
  one that actually caused the crash. Two unclean exits in a row for the same plugin, with no call
  finishing normally in between, switch it off ("No responde") exactly like three timeouts in a
  row; a call that completes normally resets its count.

## The engine is not Node and not a browser { #not-node }

Plugins run in QuickJS. It handles modern JavaScript: `async`/`await`, classes with fields, `?.` and
`??`, regular expressions with lookbehind, named groups and `\p{L}` under the `u` flag, template
literals, spread, `replaceAll`, `Array.prototype.at` and `flat`, `Object.fromEntries`,
`Promise.allSettled`, `Map`, `Set`, `BigInt`. It does **not** have the platform around it:

- **Missing globals** (`typeof` is `"undefined"` inside Kino): `setTimeout`, `setInterval`,
  `setImmediate`, `queueMicrotask`, `Buffer`, `process`, `require`, `fetch`, `AbortController`,
  `structuredClone`, `performance`, `crypto`, `WeakRef` and `Intl`. Use `kino.sleep` to wait,
  `kino.fetch` instead of `fetch` and `kino.crypto` instead of `crypto`. `URL`, `URLSearchParams`,
  `atob`, `btoa`, `TextEncoder`, `TextDecoder` and `console` do exist: Kino provides them.
- **Node has almost all of those**, so code that runs fine under the Node kit can still fail in Kino.
  Before you publish, search your file for the names above.
- **Locale-aware methods do not localize:** `localeCompare` ignores its locale and options (so
  `{ numeric: true }` and `{ sensitivity: "base" }` do nothing; it compares code units), and
  `(1234.5).toLocaleString("es-CO")` gives `"1234.5"`. Write the comparison you need; the reference
  plugin has a small `natural()` for numbered names.
- **Keep function names short.** A function name of millions of characters makes the engine's
  native code crash the whole app. As a best-effort guard, `kino.*`, `console.*`, the web globals and
  the other functions Kino provides are frozen, and on any function `Object.defineProperty`,
  `Object.defineProperties`, `Reflect.defineProperty` and `__defineGetter__`/`__defineSetter__`
  refuse to set `name` to a string longer than 1000 characters, to a getter or setter, or to make
  it writable: they throw a `TypeError` (`Reflect.defineProperty` returns `false`). The guard is not
  airtight (a huge computed key still names a function); a plugin that crashes the app anyway is
  switched off (see "App closed during a call" above). Setting `name` on ordinary objects, and
  `this.name = "MyError"` in an `Error` subclass, work as usual.

## Splitting your code across files { #splitting-files }

Kino loads exactly one file (the manifest's `entry`), and the engine has no `require` and no
module resolver, so an `import` from `plugin.js` to a second file has nothing to resolve against on
the device. That does not mean you must write the whole plugin in one file -- just that the file you
publish has to be the finished, single-file result.

Write it split, normally, then bundle it before you publish:

```
src/
  animeav1.js       a helper module
  plugin.js         the entry point; imports from animeav1.js
kino-plugin.json
package.json
```

```js
// src/animeav1.js
export async function searchAnimeAV1(query) {
  const res = await kino.fetch(`https://animeav1.com/api/search?q=${encodeURIComponent(query.q)}`);
  if (!res.ok) throw new Error("animeav1 respondió " + res.status);
  return res.json().results.map((r) => ({ id: r.slug, ref: r.slug, title: r.title, kind: "series", poster: r.image }));
}
```

```js
// src/plugin.js -- this import is fine: it runs through the bundler, never on the device
import { searchAnimeAV1 } from "./animeav1.js";

export async function search(query) {
  return searchAnimeAV1(query);
}
```

Bundle with [esbuild](https://esbuild.github.io/) (`npm i -D esbuild`), targeting ES module output
(Kino runs the published file as one):

```bash
npx esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js
```

`plugin.js` at the repo root is what comes out of that command, with `src/animeav1.js` inlined into
it and its `export async function search` intact -- that is the file `entry` names and the one Kino
fetches. Add it as an npm script
(`"build": "esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js"`) and run it before
every `sdk/` test or publish. Rollup and webpack work the same way; esbuild needs the least
configuration for a plugin this size.

## The trap: a rejection nobody is listening to yet { #rejection-trap }

The engine aborts the **whole call** when a promise is rejected before anything has a handler on it,
even if your code is inside `try`/`catch`. The Node kit cannot show you this, so learn the rules:

- **Aborts the call:** a `throw` inside an `async` function **before its first `await`**, while the
  caller is wrapped in `try`/`catch`. A `.catch()` on that call, or `Promise.all`/`Promise.allSettled`
  around it, do not rescue it either. Also aborts: `new Promise((_, reject) => reject(e))` rejected
  right away, and `return Promise.reject(e)` from an `async` function.
- **Is caught normally:** a `throw` after any `await` (even `await null;`), a rejection coming from
  `kino.fetch` or `kino.sleep` (for example a refused host), and `await Promise.reject(e)` or
  `Promise.reject(e).catch(...)` (Kino delays `Promise.reject` by one tick so a handler can attach
  in time).
- If nobody catches the error anyway, it is harmless: the call fails with that error either way, and
  a `kino.error` code still reaches the person correctly.
- **Nuvio-converted scrapers get a workaround:** when Kino converts a [Nuvio scraper](nuvio.md) it
  rewrites the async helpers bundlers emit (esbuild's `__async`, TypeScript's `__awaiter`, Babel's
  `_asyncToGenerator`) so a transpiled function's body starts one tick later, and a throw before its
  first `await` is caught normally. A native `async` function (yours, or an untranspiled scraper's)
  still needs the `await` before anything that can throw.

So in a helper that a caller may wrap in `try`/`catch`, do the `await` first and validate afterwards:

```js
// Wrong: in Kino this throw is NOT caught by the caller's try/catch; it aborts the whole call.
async function getJson(url) {
  if (!url.startsWith("https://")) throw new Error("dirección inválida");
  const r = await kino.fetch(url);
  return r.json();
}

// Right: the first await comes before anything that can throw.
async function getJson(url) {
  const r = await kino.fetch(url);
  if (!r.ok) throw new Error("archive.org respondió " + r.status);
  return r.json();
}
```

(If a helper has nothing to await, start it with `await null;`, or check the input in the caller
before it calls the helper.)
