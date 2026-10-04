# The `kino` API

`kino` is a global object, frozen, always there. Nothing else from the outside world is.

```js
kino.apiVersion   // 6 -- the highest apiVersion this build of Kino understands, not your manifest's
kino.appVersion   // the version of Kino, for example "1.42.0"
kino.lang         // "es-CO"
```

Kino also provides the web globals QuickJS lacks, written in JavaScript and frozen: `URL`,
`URLSearchParams`, `atob`, `btoa`, `TextEncoder` and `TextDecoder` (UTF-8 only). They behave like the
browser's (checked against Node on a corpus of cases), except that `URL` does not convert
international domain names to punycode. A `URL` can be changed in place with the usual setters
(`protocol`, `username`, `password`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`,
`href`), which, as in a browser, never throw: a value they cannot use leaves the URL as it was.

The whole API is declared in [`kino.d.ts`](reference/index.md) for your editor.

## `await kino.fetch(url, options?)` { #fetch }

```js
const r = await kino.fetch("https://archive.org/metadata/" + encodeURIComponent(id), {
  method: "GET",              // GET (default), POST, PUT, PATCH, DELETE or HEAD
  headers: { Accept: "application/json" },
  body: "a=1&b=2",            // see "Bodies" below; sent only with POST, PUT and PATCH
  redirect: "follow",         // or "manual": get the 3xx itself, with its Location header
  cookies: true,              // false: neither send nor store cookies for this request
  timeoutMs: 20000,           // default 15000, at most 30000
});
r.ok        // true for 200 to 299
r.status    // the HTTP status
r.url       // the final URL, after redirects
r.headers   // { "content-type": "...", ... }: names in lowercase, repeated headers joined with ", "
r.text()    // the body as a string (already downloaded)
r.json()    // JSON.parse of the body
r.base64()  // the body bytes as base64: for anything that is not text
```

Kino hands your code either the text or the bytes of a body, depending on its `Content-Type`; the
other form is converted inside the engine when you ask for it, which for a body of several MB takes
seconds of your call's time. Ask for the form the content is.

- **Bodies.** A string is sent as is (`text/plain` unless you set `Content-Type`).
  `{ json: value }` sends `JSON.stringify(value)` as `application/json`; `{ form: { a: 1 } }` sends
  `application/x-www-form-urlencoded`; `{ base64: "…" }` sends those bytes.
- **https only, and only your hosts.** The host of the request and of **every redirect hop** must
  match `hosts` (`*.x` matches subdomains of `x`, not `x`), or be a server the person typed in your
  settings, exactly as typed. A request to anything else fails before it leaves the device. An `http`
  URL on a declared host fails too, unless you declared that host `{ "host": "…", "insecureHttp": true }`
  (apiVersion 2, [see the manifest](manifest.md#insecure-host)). An IP address or a local name (`localhost`, `.local`, …) is always
  refused unless the person typed it. Kino also refuses a declared name that resolves to an address
  inside the person's own network (loopback, private, link-local, carrier-grade NAT, multicast, and
  the IPv6 prefixes that embed one), and never sends your traffic through a proxy set on the device.
- **Redirects** (301, 302, 303, 307, 308) are followed by Kino, up to 10 hops; each hop is checked
  and counted as a request -- a hop Kino refuses (or asks the person about) counts too. A 303, or a 301/302 after a POST, turns into a GET without a body. With
  `redirect: "manual"` you get the 3xx answer instead (a login form usually answers 302 on success).
- **A host you forgot may be asked about, during `resolve` and `episodes` only.** When one of those
  calls fetches an `https` host you did not declare (a redirect hop included), Kino asks the person
  ("Quiere conectarse por primera vez a `<host>`. ¿Permitir?"). Your call's time limit stops while
  they decide, and the fetch goes on after "Permitir" (the host is then approved for good);
  "Rechazar" or Back fails it as `host_not_allowed` and is remembered. The question comes down
  unanswered, with nothing remembered, if your call ends first (it failed, timed out, or the person
  left). One call asks about at most 3 hosts, and nothing more once the person rejects one in it:
  after that, every other undeclared host of that call just fails as `host_not_allowed`. `search`, `home`, `browse`, the live lists, a download and a call that is already
  over never ask: the fetch just fails as `host_not_allowed`. Don't rely on it: declare your hosts.
- **A non-2xx answer does not throw**: check `r.ok`. Everything else that goes wrong throws an error
  with a `code` you can test (`e.code === "timeout"`):

<!-- contract:fetchErrors:start -->
| `e.code` | When |
| --- | --- |
| `host_not_allowed` | the host (or a redirect hop) is not one you declared or the person typed, or it is `http` on a declared host not marked `insecureHttp` |
| `timeout` | no complete answer within `timeoutMs` |
| `network` | the connection failed, or too many redirects |
| `too_large` | the request over the size cap, or a body over 5 MB |
| `invalid_request` | a bad URL, method, `redirect` or `body`, or more requests than a call allows |
<!-- contract:fetchErrors:end -->

- **Limits:** 15 s per request by default (30 s at most), a body of at most 5 MB (decoded with the
  charset of its `Content-Type`, UTF-8 by default), and at most 60 requests in one call to your
  plugin, redirect hops and refused hops included (a plugin Kino converted from a
  [Nuvio scraper](nuvio.md) gets 250). At most 6 of your fetches run at the same time; the rest wait
  their turn.
- **Headers you set** are sent as given, except `Host`, `Content-Length`, `Transfer-Encoding`,
  `Connection`, `Cookie2` and `Accept-Encoding` (Kino asks for gzip itself and always hands you the
  body decompressed; a copied browser `Accept-Encoding` would get you compressed bytes instead). Unless you set `User-Agent`, Kino sends `Kino/<version> (plugin <id>)`.
  A `Content-Type` header sets the type of the body.
- **Cookies:** each plugin has its own cookie jar. Kino stores what your hosts set (`Set-Cookie`
  never reaches your code) and sends it back on later requests, following the usual rules (domain,
  path, `Secure`, expiry). The jar is saved on the device, so a login survives the sandbox and the app
  restarting; it is deleted when the person changes your settings or uninstalls the plugin.
- **A marker from [`kino.secret`](#secret)** in the URL, a header or the body is swapped for its real
  value right before the request goes out, and that request is then held to a stricter rule than the
  one above: only your manifest's `hosts`, over `https`, on every hop.

## `kino.cookies` { #cookies }

```js
kino.cookies.get("https://site.example/", "session")  // the value, or null
kino.cookies.clear()                                  // forget every cookie of this plugin
```

`get` only answers for URLs your plugin may reach. At most 50 cookies per domain and 64 KB in total.

## `kino.secret(name)` (apiVersion 4) { #secret }

```js
const key = kino.secret("apiKey");   // a marker, not the value; any other name throws
await kino.fetch(`https://api.example.org/v1/list?key=${key}`);
```

A placeholder for a value sealed in your manifest's [`secrets`](manifest.md#secrets) field. Carry the
marker wherever you would carry the value. Kino opens each seal at most once per run and never lets
your code see the plain value. You may call it at the top level of your module
(`const KEY = kino.secret("apiKey");`): the check Kino runs while installing answers a marker for
every name your manifest declares too, so the install goes through.

**Where the marker becomes the value: only inside `kino.fetch`.** In the URL's path and query
(percent-encoded, so the value can't split a segment or add a parameter), inside a JSON body
(JSON-escaped), and as is in headers, a text body or a form field. A marker in the URL's scheme,
userinfo, host, port or fragment is left as text: a value never becomes part of the host Kino
connects to. A header whose value would carry a control character once the secret is in it is
refused rather than sent.

**Where that request may go: only a host your manifest's `hosts` lists, over `https`, on every
redirect hop.** Never a host approved while the plugin runs, never a server the person typed into
your settings, and neither `streamHosts: "any"` nor `liveStreamHosts: "any"` extends to it. A hop
anywhere else fails as `host_not_allowed`: "este plugin no puede enviar datos sellados a `<host>`"
for a host you did not declare, "... sin https a `<host>`" for plain `http` even on a declared one.

**`kino.crypto`.** A marker may be the *entire* `key` of an AES `encrypt`/`decrypt` -- exactly one
marker, nothing else in the string -- or part of a longer HMAC `key` or PBKDF2 `password`/`salt`. It
is always refused, with "no se puede usar un dato sellado aquí", as `data`, `iv` or `aad`, as part of
a longer cipher `key`, and as the key of a non-AES cipher (`des-ede3-*`) -- except a
[typed cipher key](manifest.md#typed-keys) (apiVersion 6), which is the whole key of any cipher,
`des-ede3` included, and nothing else. That is not an arbitrary
line: a known `iv` or `aad` under a sealed key lets a cipher be turned into a way to compute the key
back, and a key padded out with known bytes shrinks the search down to the unknown part alone. HMAC
and PBKDF2 mix their whole input through a hash, so a known prefix or suffix never splits the secret
back out.

**Redaction.** Anything Kino hands back to your code that could carry a sealed value -- `r.text()`,
`r.url`, header values, a text body's `r.base64()`, `kino.cookies.get`, an error message, a
`kino.crypto` answer, and every `kino.log` line -- has the value swapped back for its marker first,
whether or not this run has used the secret yet. The forms caught: raw, URL percent-encoding (strict,
`+` for space and `%20` for space), JSON-escaped (including `\/` for `/` and `\uXXXX` for non-ASCII,
in either hex case, as PHP and Python write them) and base64/base64url. A URL the server returns with
the value inside comes back with the marker instead, so a `Stream` built from it won't play: markers
are swapped only in `kino.fetch` requests, never in what your plugin returns to Kino. Not caught: a
binary response (`r.base64()` of something that was never text), a response header's *name*, a
lowercase `%xx` a server happens to echo, and a value the server transforms on purpose (hashed,
reversed…). A `kino.crypto` error can still say how many bytes a sealed key was, or whether it was
valid hex or base64 -- metadata, never the value. Prefer values of at least 8 bytes: a shorter one is
still masked wherever it shows up inside unrelated text, which gets noisier the shorter it is.

## `kino.crypto` { #crypto }

Synchronous functions for what sites do to hide their links. Every string argument is text in an
encoding you choose (`utf8`, `hex` or `base64`); errors carry `code: "crypto_error"`.

```js
kino.crypto.hash("sha256", "hola")                        // hex by default
kino.crypto.hmac("sha1", "key", "data", { outputEncoding: "base64" })
kino.crypto.decrypt("aes-128-cbc", { key: "0123456789abcdef", iv: "abcdef9876543210", data: b64 })
kino.crypto.encrypt("aes-256-gcm", { key: k, keyEncoding: "hex", iv: n, ivEncoding: "hex", data: "hola" })
kino.crypto.pbkdf2("sha256", "password", "salt", 10000, 32)   // hex
kino.crypto.randomBytes(16)                               // hex
kino.crypto.uuid()
```

- `encrypt` takes text (`utf8`) and returns `base64`; `decrypt` takes `base64` and returns text.
  Change either with `inputEncoding` / `outputEncoding`; keys, IVs and GCM's `aad` take
  `keyEncoding`, `ivEncoding`, `aadEncoding` (default `utf8`).
- CBC and ECB use PKCS#7 padding unless you pass `padding: "none"`. GCM appends its 16-byte tag to
  the ciphertext, and expects it there to decrypt (as most sites send it).
- A wrong key size, a bad padding or a failed GCM tag throws; it never returns garbage silently.
- A [`kino.secret`](#secret) marker is only accepted as the whole `key` of an AES
  `encrypt`/`decrypt`, or as part of an HMAC `key` or `pbkdf2`'s `password`/`salt` -- never in
  `data`, `iv` or `aad`, nor as a `des-ede3` key. A [typed cipher key](manifest.md#typed-keys)
  (apiVersion 6) is the exception: the whole key of any cipher, `des-ede3` included, and nothing else.

<!-- contract:crypto:start -->
| Function | Algorithms |
| --- | --- |
| `hash`, `hmac` | `md5`, `sha1`, `sha256`, `sha512` |
| `encrypt`, `decrypt` | `aes-128-cbc`, `aes-192-cbc`, `aes-256-cbc`, `aes-128-ecb`, `aes-192-ecb`, `aes-256-ecb`, `aes-128-ctr`, `aes-192-ctr`, `aes-256-ctr`, `aes-128-gcm`, `aes-192-gcm`, `aes-256-gcm`, `des-ede3-cbc`, `des-ede3-ecb` |
| `pbkdf2` | `sha1`, `sha256`, `sha512` |
| encodings | `utf8`, `hex`, `base64` |
| `generateKeyPair` (apiVersion 6) | `ec`, `ed25519`, `x25519`; `ec` on `P-256`, `P-384`; at most 64 private keys alive per runtime (a new one drops the oldest) |
| `sign`, `verify` (apiVersion 6) | ECDSA with `SHA-256`, `SHA-384` as `der` or `ieee-p1363`; Ed25519; a signature at most 512 bytes |
| `importKey`, `deriveSharedSecret` (apiVersion 6) | public keys as `jwk`, `spki`, `raw`; ECDH (same curve) and X25519 |
<!-- contract:crypto:end -->

### Key pairs, signatures and key agreement (apiVersion 6) { #key-pairs }

Some players prove they are a real player by signing a challenge: they make a key pair, sign what the
server sends with the private key and send back the public key. `kino.crypto` does that with keys
that never leave Kino:

```js
// Node:      const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
// WebCrypto: await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
async function createAttest(challenge) {
  const { privateKey, publicKey } = kino.crypto.generateKeyPair({ type: "ec", namedCurve: "P-256" });
  // WebCrypto's ECDSA signature is r||s (64 bytes on P-256): format "ieee-p1363". Node's default is "der".
  const signature = kino.crypto.sign({ key: privateKey, data: challenge, hash: "SHA-256", format: "ieee-p1363" });
  return { publicKey: publicKey.jwk, signature };   // signature is base64; pass outputEncoding: "hex" for hex
}
```

- `generateKeyPair({ type: "ec", namedCurve: "P-256" | "P-384" })`, `{ type: "ed25519" }` or
  `{ type: "x25519" }` answers `{ privateKey, publicKey }`. `publicKey` is `{ type, namedCurve?, jwk,
  spki, raw }`: the JWK object in WebCrypto's key order (`{ crv, kty, x, y }`, base64url), the DER
  SubjectPublicKeyInfo as base64, and the raw key as base64 (`04||x||y` for `ec`, 32 bytes otherwise).
- `privateKey` is a handle, `{ type, namedCurve?, handle }`: the key itself stays inside Kino. A handle
  works only in the sandbox that made it: not in [`sign()`](signed-streams.md)'s signing lane, not after
  the plugin restarts (it closes after a few idle minutes), never on another device, so make the key in
  the call that uses it. At most 64 live at once; a new one drops the oldest. Private keys cannot be
  imported or exported.
- `sign({ key, data, encoding?, hash?, format?, outputEncoding? })` reads `data` as `utf8` unless you
  say `hex` or `base64`, and answers base64. `ec`: `hash` `"SHA-256"` (default) or `"SHA-384"`, `format`
  `"der"` (default) or `"ieee-p1363"` (64 bytes on P-256, 96 on P-384). `ed25519`: 64 bytes, no `hash`.
- `verify({ key, data, signature, signatureEncoding?, hash?, format? })` answers `true`/`false`; a
  malformed signature is `false`. `key` is a public key (yours, or a peer's from `importKey`), a bare
  `{ jwk }`, or your own private key.
- `importKey({ format: "jwk", key: jwkObject })`, `{ format: "spki", key: base64 }` or `{ format: "raw",
  key: base64, type, namedCurve? }` answers a public key in the same shape; a point off its curve throws.
- `deriveSharedSecret({ privateKey, publicKey })` is ECDH (both `ec` on the same curve: 32 bytes on
  P-256, 48 on P-384) or X25519 (32 bytes), base64 by default. Hash it (or HKDF it with `hmac`) before
  using it as a key.
- No `kino.secret` marker is accepted anywhere in these five functions.

| Node / WebCrypto | `kino.crypto` |
| --- | --- |
| `generateKeyPairSync("ec", { namedCurve: "P-256" })` / `subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, …)` | `generateKeyPair({ type: "ec", namedCurve: "P-256" })` |
| `generateKeyPairSync("ed25519")` / `generateKeyPairSync("x25519")` | `generateKeyPair({ type: "ed25519" })` / `{ type: "x25519" }` |
| `publicKey.export({ format: "jwk" })` / `subtle.exportKey("jwk", publicKey)` | `publicKey.jwk` |
| `publicKey.export({ format: "der", type: "spki" }).toString("base64")` / `exportKey("spki", …)` | `publicKey.spki` |
| `subtle.exportKey("raw", publicKey)` | `publicKey.raw` (base64) |
| `crypto.sign("sha256", data, privateKey)` | `sign({ key: privateKey, data, hash: "SHA-256" })` (DER) |
| `crypto.sign("sha256", data, { key, dsaEncoding: "ieee-p1363" })` / `subtle.sign({ name: "ECDSA", hash: "SHA-256" }, …)` | `sign({ key, data, hash: "SHA-256", format: "ieee-p1363" })` |
| `crypto.sign(null, data, ed25519Key)` / `subtle.sign("Ed25519", …)` | `sign({ key, data })` |
| `crypto.verify(…)` / `subtle.verify(…)` | `verify({ key: publicKey, data, signature, … })` |
| `createPublicKey({ key: jwk, format: "jwk" })` / `subtle.importKey("jwk", …)` | `importKey({ format: "jwk", key: jwk })` |
| `crypto.diffieHellman({ privateKey, publicKey })` / `subtle.deriveBits({ name: "ECDH" or "X25519", public }, …)` | `deriveSharedSecret({ privateKey, publicKey })` |

Buffers become strings: pass `encoding`/`outputEncoding` (`hex` or `base64`) where Node takes or gives a
Buffer. There is no `kino.crypto.generateKeyPairSync`: a Node or browser library calling it must be
adapted to these calls. A plugin that uses them should declare `"apiVersion": 6`, so a Kino without
them refuses to install it (`validate` says so).

## `kino.browser` (apiVersion 6) { #browser }

Only with `"browser": true` (capture only) or `"browser": "pages"` (capture and page reads) in the
manifest, approved by the person in red. `kino.browser.capture(url,
options?)` opens a page in a hidden web view inside a `resolve` the person started and returns the
video requests it made, with the headers and cookies to play them; `kino.browser.page(url, options?)`
returns a page's HTML once it is past the site's automatic check. Kino never solves a captcha: a page
that asks for a human ends the call with `blocked`. Prefer `kino.fetch` whenever it works. Everything
-- where each may be called, the safety model, timeouts, errors and a complete example -- is on
[Hidden browser](browser.md).

## `kino.sleep(ms)` and `kino.error(code, message?, { userMessage }?)` { #sleep-error }

`await kino.sleep(1500)` waits 0 to 5000 ms (for a site that rate-limits you); the time counts
inside the call's own limit. `kino.error` builds the typed errors of
[Errors people understand](contract.md#errors); its optional `{ userMessage }` (apiVersion 6) is your
own sentence for the person, shown under [its rules](contract.md#user-message) as "Mensaje de &lt;your
plugin&gt;: …".

### Errors your code can catch { #catch }

Every failure a `kino.*` call reports is an ordinary `Error` your `try`/`catch` receives (your own
`throw`s still have [the rejection trap](engine-limits.md#rejection-trap)). Test `e.code`, never the
text of `e.message`: that is Spanish, for the log, and may change.

| Where | `e.code` |
| --- | --- |
| `kino.fetch` | `host_not_allowed`, `timeout`, `network`, `too_large`, `invalid_request` ([the table](#fetch)) |
| `kino.crypto` | `crypto_error` |
| `kino.browser.capture` | `browser_unavailable`, `timeout`, `blocked`, `busy`, `not_allowed`, `invalid_request` |
| `kino.browser.page` | the same, plus `rate_limited` ([Hidden browser](browser.md#page)) |
| inside [`sign()`](signed-streams.md#rules) | `host_not_allowed` from `kino.fetch`; `not_allowed` from `kino.storage`, `kino.cookies` and `kino.sleep` |
| `kino.storage` over 256 KB or a bad `ttlMs`, `kino.html.select` over its limits, `kino.secret` with an undeclared name | no `code`: a plain `Error` with a Spanish message |

From Kino 0.9.50 a **synchronous** `kino.*` call that fails (a full `kino.storage`, a bad cipher key, a
selector that is too long) is caught by your `try`/`catch` like any other error. Kino 0.9.49 and older
ended the whole call there even inside a `try`/`catch`, so on those versions keep an eye on what you
store.

`kino.error(code, message?, { userMessage }?)` builds an `Error` whose `name` is `KinoError_<code>`
(`KinoError_not_found`), with `code` and, when you passed one, `userMessage`. A code that is not one of
the five becomes `code: "unknown"`, and the person reads a plain error. Throw it as it is, or rethrow a
caught one: the code reaches the person only when the error leaves your function with it. Whatever you
throw (an `Error`, a string, anything) reaches Kino as text, cut at 2,000 characters.

```js
try {
  kino.storage.set("cache:" + key, JSON.stringify(rows), { ttlMs: 3600000 });
} catch (e) {
  kino.log("cache: not saved", e.message);   // full storage: keep going without the cache
}

try {
  return await api("/play/" + encodeURIComponent(ref));
} catch (e) {
  if (e.code === "timeout" || e.code === "network") return backupStream(ref);
  throw e;                                     // a kino.error keeps its code and its userMessage
}
```

## `kino.config` { #config }

```js
kino.config.get("server")   // text, url, password, select: a string; toggle: true/false
kino.config.get("sources")  // list (apiVersion 4): [{ url: "https://…", category: "Noticias" }, …]
kino.config.all()           // every setting that has a value, as an object
```

Read-only: the values the person saved, or the `default` of a setting they left alone. A `toggle`
without a `default` is `false` and a `select` without one is its first option, so both always have a
value. A `text` or `password` with no value and no `default`, a `url` the person left empty (it never
has a default) and an empty `list` are `undefined`. A `list` is an array of objects, one per entry,
keyed by its `fields`' keys, trimmed, without all-blank entries. The `section`, `status` and `action`
types hold no value and never appear here. Every type is on [The settings form](settings-form.md#types).

## `kino.html.select(html, css)` { #html }

Parses `html` and returns `[{ text, html, attrs }]` for every element matching the CSS selector
(Jsoup's selector syntax): `text` is its text, `html` its inner HTML, `attrs` an object of its
attributes. Only the first 2,000,000 characters of `html` are read, at most 500 elements come back,
and it throws if the combined text and HTML of the matches goes over 5,242,880 characters (5 MB). A
selector longer than 10,000 characters throws `Error("selector CSS demasiado largo (más de 10000 caracteres)")`. **It
exists only inside Kino**: the Node kit's version throws, so test anything that uses it in the app.

## `kino.storage` { #storage }

```js
kino.storage.get("key")                          // the string, or null
kino.storage.set("key", "v")                     // values are converted to strings
kino.storage.set("key", "v", { ttlMs: 3600000 }) // expires after that many milliseconds
kino.storage.remove("key")
kino.storage.keys()                              // every key, as an array (expired keys are already gone)
```

Synchronous, private to your plugin, and it survives restarts of the sandbox and of the app. At most
256 KB in total (measured as the JSON of all keys and values); going over throws
`Error("almacenamiento del plugin lleno (256 KB)")`. It is deleted when the person uninstalls the
plugin, and it is **not** cleared when they change your settings.

`set`'s third argument is optional: leave it out for a permanent entry, exactly as before this option
existed. Give `{ ttlMs }` to make the entry expire -- after that many milliseconds `get` returns `null`
and `keys()` no longer lists it, even across a restart of the app. `ttlMs` must be a whole number
greater than 0 and at most 2,592,000,000 (30 days); anything else throws before your entry is
touched, the same way an oversized value already does. An expired entry never counts against the
256 KB cap: it is dropped the next time your plugin reads or writes storage. Example, a Home row
cached for an hour:

```js
export async function home() {
  const cached = kino.storage.get("home-rows");
  if (cached) return JSON.parse(cached);
  const rows = await buildHomeRows();
  kino.storage.set("home-rows", JSON.stringify(rows), { ttlMs: 60 * 60 * 1000 });
  return rows;
}
```

## `kino.log(...args)` { #log }

Also `console.log`, `console.info`, `console.warn` and `console.error`: they all go to the log
(tag `KinoPlugin` in `adb logcat`; `KinoPlugin/<your id>` in a debug build of Kino, or in any build
while your plugin's [Modo debug](diagnostics.md#debug) switch is on: `"debug": true` only makes that the default), objects are written as JSON, and a message is cut at 2000
characters. Under the Node kit they go to stderr.

When a call of a plugin whose manifest says `"telemetry": true` or `"verbose"` (apiVersion 6) **fails**
(it throws, times out, returns something unusable, including `sign`, `settingsStatus`, `action` and
`validateSettings`), the lines it logged during that call (the last 30, each cut at 300
characters) travel with the failure report to the maintainers' error tracker as `plugin_log`, so a
`kino.log("home: status", r.status)` before the throw is how you see why it failed on someone else's
phone. Each report is tagged with your plugin's id and version; at most one report per function and
kind of failure an hour. Nothing is sent for a call that succeeds, and no line of any plugin that does
not declare `telemetry` (recommended or not, a converted Nuvio scraper): for those Kino only notes that
the call failed (your id and version, the function, the kind of failure). Today a declared plugin's lines
are always sent; a later Kino build will let the person turn "Enviar registros de errores" off on each
device, and then nothing is sent while it is off. Before it leaves the device
every line has URLs, hostnames, IPs, e-mails, long ids, long hex/base64 runs, credential-shaped text,
the person's setting values and the text of their search or title removed, and the whole is capped at
2 KB (the newest lines win). Still: log what happened (a status, a step, a count), never what the
person typed or a secret, and never a setting's value. Works on every `apiVersion`.

**`kino.log.report(...args)`** (apiVersion 6, with `telemetry`) writes a line like `kino.log` and also
tells the error tracker that your plugin served a **degraded** result even though the call worked: it
fell back to a shared account, used a backup source, trimmed a list. The details (the area, the caps)
are on [Logs and telemetry](diagnostics.md#report).

## `kino.rank` { #rank }

For a search backend that only matches a loose bag of shared words rather than a title as a whole:
asking it a long title can return twenty unrelated results that merely share one common word, with
the real match buried on page two. These three pure functions make a backend like that behave like a
title search, without touching its own JSON shape.

```js
kino.rank.shortQuery(query)
kino.rank.sortBySimilarity(items, query, getTitle?)
kino.rank.filterRelevant(items, query, getTitle?)
```

- **`shortQuery(query)`** returns the title's HEAD, up to its first `:`, `,`, `|`, en dash or em
  dash: ask your backend that instead of the whole title, so its own ranking has less noise to sort
  through. A one- or two-letter head ("El", "A") identifies nothing, so the whole (trimmed) text
  comes back instead; a plain `-` is never a cut point (it would split "Spider-Man"). Try it against
  your backend first -- some do worse with a short query, not better.
- **`sortBySimilarity(items, query, getTitle?)`** reorders `items` so the ones sharing the most words
  with `query` come first; ties keep the backend's own order.
- **`filterRelevant(items, query, getTitle?)`** drops items that only share a stray word with
  `query`. Reordering alone still shows a full page of near-misses when the title genuinely is not on
  the backend; this makes an absent title come back with 0 results instead.

`query` is a title, or an array of several forms of one worth trying together --
`[query.q, query.originalTitle, ...query.altTitles]`, since a backend may only know a title in one
language. `getTitle` reads a title off one of your own `items`; it defaults to
`(item) => item.title`, and may itself return an array the same way `query` can, when an item keeps
a title in more than one field or language (every form's words are combined). Matching folds accents
and case and ignores words of 1-2 letters (the "el", "de", "of" that make unrelated titles look
alike); `filterRelevant` keeps an item once it shares at least 60% of a requested title's distinctive
words.

**Bad input never throws.** Unlike `kino.fetch`/`kino.crypto`/`kino.sleep`, these three never raise a
`kino.error` for a malformed argument: `items` that is not an array answers `[]` from either
function. An item with no usable title -- `null`, `undefined`, `getTitle` returning something that is
not a string (or an array with none in it), or `getTitle` itself throwing -- is treated as "no title"
rather than crashing your call: `filterRelevant` drops it like an actual near-miss, and
`sortBySimilarity` sorts it after every item that does have one, in your list's own order among
themselves.

```js
export async function search(query) {
  const titles = [query.q, query.originalTitle, ...query.altTitles];
  const r = await kino.fetch(BASE + "/search?q=" + encodeURIComponent(kino.rank.shortQuery(query.q)));
  const found = r.json().results; // whatever shape your backend answers with
  const relevant = kino.rank.filterRelevant(found, titles, (x) => x.name);
  return kino.rank.sortBySimilarity(relevant, titles, (x) => x.name).map(toItem);
}
```

If your backend already ranks a full title well, skip `shortQuery` and run only
`filterRelevant`/`sortBySimilarity`, on what it gives you for `query.q` as typed.

Two things left out on purpose. Neither retries with the full title: if `shortQuery`'s head happens
to be a common word (e.g. "Love, Death & Robots" -> "Love") and the backend returns nothing relevant
for it, retry `search` with the full title yourself when the short one comes back empty. And neither
does anything with season numbers or ordering: how a backend spells "season 2" in its own titles
("T2", "Temporada 2", …) is specific to that backend, not something these can fold in.
