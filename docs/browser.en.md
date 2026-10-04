# Hidden browser (apiVersion 6)

Some sites never put the video address in their HTML: an embedded player builds it in the page with
its own scripts, and the only way to learn it is to run the page. For those, Kino 0.9.50 lets a
plugin open the page in a **hidden web view on the device** and get back the video requests the
page made: `kino.browser.capture`. It is the last resort, not the first tool.

!!! tip "Prefer `kino.fetch`"
    Try the cheap path first: a [`kino.fetch`](kino-api.md#fetch) of the page or of the embed, and
    the address read from its HTML, its JSON or a script variable ([`kino.html.select`](kino-api.md#html)
    helps). It is faster (no page to start, no player to wait for), it runs in the
    [Node kit](test-locally.md), and it never needs the person's red consent line. Keep the hidden
    browser for the servers that really need a page to run.

## When to use it { #when }

- An embed whose video address only appears once the page runs its own scripts (an obfuscated
  player, a token computed in the page, an address fetched by the player after it loads).
- A site where each server of an episode is a different embed, some of them plain (use `kino.fetch`)
  and some not (use the capture for those only).

When **not** to use it:

- To read a list, a search or a title page: `kino.browser.capture` only exists in `resolve`, and it
  returns video requests, not HTML. (Kino 0.9.50 also has [`kino.browser.page`](#page), with
  `"browser": "pages"`, for reading pages; see below.)
- To get past a site that asks for a human. Kino never solves a captcha, and neither may your
  plugin: see [The hard rule](#no-captcha).

## The permission, and what the person sees { #permission }

```json
"apiVersion": 6,
"browser": true,
"streamHosts": "any"
```

- `"browser": true` needs `"apiVersion": 6`; below it the field is ignored. `"browser": "pages"` also
  allows [`kino.browser.page`](#page), with its own red line. Any other value is refused with "El
  campo \"browser\" debe ser true, false o \"pages\"".
- The consent screen shows it **in red**: "Puede abrir páginas web ocultas para encontrar el video".
  An update that adds it waits for the person to approve again, like a new host.
- A plugin approved for it gets a longer `resolve` limit: **75 s instead of 20 s**, since each page
  may take up to 25 s.
- The page you open must be on a host your `kino.fetch` may reach (your `hosts`), over `https`. The
  page itself may then load from **any public server** (an embed's player lives on hosts you cannot
  list ahead of time), and the video it finds is usually on one of those, so a plugin that plays what
  it captures also needs [`"streamHosts": "any"`](manifest.md#stream-hosts) (another red line).
- While a capture runs, the person sees nothing new: the player shows its usual loading state. The
  page is never on screen.

## Only in a `resolve` the person started { #where }

`kino.browser.capture` works only inside `resolve`, and only a `resolve` the person started: they
pressed play, or they started a download (its choice among your copies included). Anywhere else --
`search`, `home`, `episodes`, or a `resolve` Kino runs in the background, such as an availability
check -- it throws `not_allowed`. Kino never resolves a browser plugin's live channels ahead while the
person zaps.

There is **one page at a time in the whole app**. A capture started while another page is open
throws `busy`; a download's capture never waits for another page (it gets `busy` at once and that
copy is skipped).

## The safety model { #safety }

The page runs on the person's device, so Kino fences it in:

- **A proxy inside Kino.** All of the page's traffic goes through a proxy on the device's loopback,
  open only while that capture runs and answering only that capture's page, through a credential made
  for that one capture. The proxy connects only to the address it checked, so a name cannot answer one
  address to the check and another to the connection (the vetted IP is pinned); the WebView itself
  resolves no name.
- **The home network, never.** Every request the page makes to a local name, a private or loopback
  address, or a public name that resolves into the home network is answered empty. The start page
  itself must be public and `https`, or the capture throws `blocked`.
- **Every method, the same check.** `POST` works, redirects are followed by the page as in a browser,
  and WebSocket connections pass the same check. WebRTC is switched off.
- **Where the top page may go.** A capture's page may navigate anywhere public at the top level (an
  embed's redirect chain hops hosts by design): it only ever returns the video requests the page made
  and the top page's last address, never a document. A [page read](#page) is stricter: its top
  document must stay on your hosts.
- **Clean every time.** Each page starts with no cookies or storage, and everything is wiped when it
  closes. Nothing is shared with [`kino.cookies`](kino-api.md#cookies), with your other captures or
  with any other plugin.
- **Nothing reaches out.** The page cannot open windows, download files, leave http(s), read files,
  ask for location, camera or microphone, or show dialogs, and it is hidden from accessibility
  services. Media is muted.
- **No bridge.** There is no channel from the page to your code: what you get back is only what the
  page requested.
- A device whose WebView cannot be pointed at a proxy still captures, with Kino fetching each
  `GET`/`HEAD` itself (a `POST` then only reaches a public IPv4 address written as such, and WebSocket
  is off). One whose WebView cannot run scripts at document start, or that has no WebView at all
  (some TV boxes), gets `browser_unavailable`.

## The hard rule: Kino never solves a captcha { #no-captcha }

!!! danger "A page that asks for a human ends the capture with `blocked`"
    When the page shows a CAPTCHA, ALTCHA, Turnstile, hCaptcha, a reCAPTCHA checkbox, "Verify you are
    human" or "Confirme que es humano", the capture ends **at once** with `blocked`. Kino never tries to
    solve, click or tick it, and your plugin must not either: no solving services, no fingerprint
    tricks, no retry loop to wear the check down. Treat `blocked` as "this server is not for us right
    now" and move on to your next server, or fail with a clear error.

    Each author is responsible for their own plugin. Kino only **lists** community plugins (its
    community search); it does not recommend or promote them. If a plugin breaks the rules for
    plugins -- for example, it uses `userMessage` to ask for money, passwords or contact data, it is
    malware, or it infringes someone's rights -- Kino removes it from the community index through
    [`community-blocklist.json`](https://github.com/kinotvapp/kino-plugins/blob/main/community-blocklist.json) (at the root of this repository), and anyone can report it
    with the ["Reclamo / retiro de plugin"](https://github.com/kinotvapp/kino-plugins/issues/new?template=reclamo-retiro-plugin.yml) issue template. An installed copy stays installed,
    its card says "Retirado del índice de la comunidad." and it gets no more updates; a fork needs its
    own report. See [Claims and plugin takedowns](claims.md).

## `kino.browser.capture(url, options?)` { #capture }

It opens `url` in the hidden web view, lets the page run (media muted), presses play, and answers the
video requests the page made, manifests (HLS/DASH) first, then MP4s.

| option | |
| --- | --- |
| `timeoutMs` | 1 to 25000 ms; default 18000. The capture ends at the first video request (plus 1 s for its siblings; manifests are returned before MP4s whatever order they came in) or here. |
| `headers` | Extra headers for the first page load only (a `Referer` an embed insists on). `Cookie`, `Host` and the like are dropped. |
| `match` | A regular expression (case-insensitive, 1-500 characters) for what counts as the video; default: `.m3u8`, `.mpd`, `.mp4`, `master.txt`, `videoplayback`, `/hls/`. |
| `autoplay` | Default `true`: start any video, click the usual play/server buttons a few times, and tap the middle of the page every 2 s (a tap reaches a cross-origin embed's player). It never touches a human check: that ends the capture. |

The answer is `{ media: [{ url, mime?, headers }], subtitles: [{ url }], finalUrl }`, at most 8 media
and 10 subtitles.

### Timeouts { #timeouts }

- Each capture: `timeoutMs`, at most 25 s (default 18 s).
- The whole `resolve` of an approved browser plugin: 75 s, your fetches and every capture together.
  Two or three servers fit; plan for the first that answers, not for trying all of them.
- `timeout` means the page showed no video request in time. Try the next server.

### Headers and cookies to pass on { #headers }

A video request is **never fetched by the page**: Kino holds it (the page gets an empty answer), so a
single-use or session-bound token in its address is still unspent when the player asks for it. Each
media entry's `headers` are the ones the page's request carried (Referer, Origin, User-Agent,
Accept-Language, a token header…, at most 12; never `Range`, `Accept-Encoding` or the app's package)
**plus the page's cookies for that address**. Return them as the Stream's `headers` and the player is
served what the page would have been. Without them most of these servers answer 403.

## A complete example { #example }

A source whose episode page lists several servers, each an embed. The list is read with
`kino.fetch`; one server is captured now, the others are offered as
[labelled lazy copies](contract.md#lazy-copies) and captured only if the person picks one or the
first cannot play.

```js
// kino-plugin.json: "apiVersion": 6, "browser": true, "streamHosts": "any",
//                   "hosts": ["example.com"], "capabilities": ["search", "episodes", "resolve"]
const BASE = "https://example.com";

async function listServers(episodeRef) {           // cheap: plain HTML, no page opened
  const r = await kino.fetch(`${BASE}/episode/${episodeRef}`);
  if (!r.ok) throw kino.error("unavailable", `episode ${r.status}`);
  return kino.html.select(r.text, "li[data-embed]").map((li, i) => ({
    id: String(i),
    name: li.attrs.title || `Servidor ${i + 1}`,
    lang: li.attrs["data-lang"] || "Latino",
  }));
}

async function resolveServer(episodeRef, serverId) {
  const page = await kino.browser.capture(`${BASE}/embed/${episodeRef}/${serverId}`, { timeoutMs: 18000 });
  const [first, ...rest] = page.media;              // HLS/DASH first, then MP4
  return {
    url: first.url,
    headers: first.headers,                         // Referer, User-Agent, Cookie...: send them back
    alternatives: rest.map((m) => ({ url: m.url, headers: m.headers })),
    subtitles: page.subtitles.map((s) => ({ url: s.url, lang: "es" })),
  };
}

export async function resolve(ref) {
  // A lazy copy's own ref: "<episode>|<server>". Resolve just that server.
  if (ref.includes("|")) {
    const [episodeRef, serverId] = ref.split("|");
    const { alternatives, ...stream } = await resolveServer(episodeRef, serverId);
    return stream;                                  // a copy's own alternatives are ignored anyway
  }
  const servers = await listServers(ref);
  for (const [i, s] of servers.entries()) {
    try {
      const { alternatives, ...stream } = await resolveServer(ref, s.id);
      return {
        ...stream,
        label: `${s.lang} · ${s.name}`,             // "Latino · Servidor 1"
        alternatives: servers.filter((o) => o !== s).slice(0, 8)
          .map((o) => ({ label: `${o.lang} · ${o.name}`, ref: `${ref}|${o.id}` })),
      };
    } catch (e) {
      if (["blocked", "timeout"].includes(e.code) && i < 2) continue; // next server, within the 75 s
      throw e;
    }
  }
  throw kino.error("unavailable", "no server answered");
}
```

## Common failures { #failures }

| Code | What happened | What to do |
| --- | --- | --- |
| `blocked` | The page asked for a human (captcha), or the start host is not one of yours, not https, or resolves into the home network. | Move on to the next server. Never retry the same one in a loop, never try to solve it. |
| `timeout` | The page showed no video request in `timeoutMs`. | Next server; check `match` if the player uses an unusual address. |
| `busy` | Another hidden page is open (one in the whole app), or a download's capture met an open page. | Fail this copy; Kino moves on. Don't wait in a loop. |
| `browser_unavailable` | No WebView on this device (some TV boxes), or one that cannot run scripts at document start. **Always under the Node kit.** | Keep a `kino.fetch` path for the servers that allow it, so those devices (and the kit) still play something. |
| `not_allowed` | Not approved, not in `resolve`, or a `resolve` nobody started. | Call it only from `resolve`. |
| `invalid_request` | A bad option (`timeoutMs` out of range, a `match` that is not a valid expression…). | Fix the call. |

Debugging: while your plugin's [Modo debug](diagnostics.md#debug) switch is on (`"debug": true` in the
manifest only makes it on by default), Kino's logcat lines for the hidden page (tag `KinoPlugin/<id>`)
name the hosts and paths it loaded; in a release build with the switch off they never do. See [Logs and telemetry](diagnostics.md).

## `kino.browser.page(url, options?)`: reading a page { #page }

Also in Kino 0.9.50 (apiVersion 6), but asked for **by name**:

```json
"apiVersion": 6,
"browser": "pages"
```

`"pages"` includes everything `true` gives (`kino.browser.capture` too). The red line then says so:
"Puede abrir páginas web ocultas para mostrar contenido y encontrar el video". `"browser": true` stays
capture-only, with the old line, and its `kino.browser.page` answers `not_allowed`. A plugin the person
approved with `true` asks again when its update says `"pages"` -- also on the automatic update pass
after a Kino upgrade, and on another device that only approved the old line. Any other value is
refused: "El campo \"browser\" debe ser true, false o \"pages\"".

Some sites answer every plain `kino.fetch` with their automatic browser check (Cloudflare's "Just a
moment…"). `kino.browser.page` loads `url` in the same hidden web view as the capture -- same
start-host rule, same proxy and home-network refusal, fresh cookies and storage, one page at a time in
the whole app -- and returns the page's HTML once it is loaded, is **no longer the site's check page**
(Cloudflare's "Just a moment…", its `cf-chl` markers) and matches `waitFor`.

**Where.** From `search`, `home`, `browse`, `episodes`, `section` or `resolve`, only while the person
is using the app: their own search, the Home row or section they opened, a list, a title, their play (a
`resolve` also for a download they started). A call Kino makes on its own gets `not_allowed`: "Para ti"
checking its suggestions after an episode ends, **`categories`** (always Kino's own call, even while the
person looks at Categorías), the Home rows it prefetches at start, new chapters, the live zap's resolve
ahead, sync, an update check. So does a list's read while the app is not in front.

!!! warning "`categories` cannot read pages"
    Earlier 0.9.50 builds listed `categories` among the exports that may call `kino.browser.page`; it
    was removed. Build your Categorías tiles from data you already have (a `kino.fetch`, or what a
    page read in `home` or `section` left in [`kino.storage`](kino-api.md#storage)).

**The page must stay on your hosts.** Not only the start address: every top-level navigation -- a
redirect, a meta refresh, a script setting `location`, an open redirect -- and the document finally read
must be on a host your `kino.fetch` may reach, over https. The first hop that is not stops the read with
`blocked` ("la página terminó en un host que el plugin no declaró") and no HTML comes back. Frames,
scripts and images inside the page may still load from any public server. Nothing on the page plays
(media needs a gesture that never comes), and the hidden page takes none of the person's touches or
keys.

```js
// A site whose every kino.fetch answers Cloudflare's 403 "Just a moment…" page.
const BASE = "https://example.com";

async function read(url, waitFor) {
  const r = await kino.fetch(url);
  if (r.ok && !/just a moment|cf-chl/i.test(r.text)) return r.text;        // cheap path first
  const page = await kino.browser.page(url, { waitFor, timeoutMs: 12000 });  // under search's 15 s budget
  return page.html;
}

export async function search(query) {
  try {
    const html = await read(`${BASE}/?s=${encodeURIComponent(query.q)}`, "class=\"item");
    return kino.html.select(html, "article.item").map(/* … your items … */);
  } catch (e) {
    // blocked: the site wants a person (a captcha) or never let the device in. Give up quietly.
    if (e.code === "blocked" || e.code === "busy" || e.code === "rate_limited") return [];
    throw e;
  }
}
```

| option | |
| --- | --- |
| `timeoutMs` | 1 to 25000 ms; default 15000. It counts inside your call's own limit (`search` 15 s, your other fetches included; `home`, `browse`, `episodes`, `section` 20 s; `resolve` 75 s for a browser plugin). Kino cuts it to what is left of that limit **minus 1.5 s** for you to use the HTML, so the read ends with its own `timeout` instead of the whole call being cancelled; still, pass about **12000 in `search`** and leave room for your other fetches. |
| `waitFor` | A JavaScript regular expression (a string or a `RegExp`, 1-500 characters, matched case-insensitively against the HTML inside the page; a `RegExp` keeps its `m` and `s` flags, the others change nothing for a test): the page is returned only once it matches. Without it, as soon as the page is loaded and past its check page. Use it for pages that fill in their list with scripts. |

The answer is `{ html, finalUrl, status, truncated }`: the doctype and the DOM's `outerHTML` after the
page's own scripts ran (at most 2,000,000 characters, what `kino.html.select` takes; `truncated` is
`true` when it was cut), the top page's last address, and the HTTP status of its last load.

**Kino never touches the page in page mode.** No click, no tap, no key, no scroll, no autoplay helper.
So the only check that can pass is one that completes by itself, the way it does when a person opens
the site: Cloudflare's automatic check usually does, in a few seconds. A page that asks for a human
ends the read at once with `blocked`, and a page still on its check page when `timeoutMs` runs out is
`blocked` too (the site did not let the device in). Do not retry it in a loop; fall back to another
source or return nothing.

**Limits.** At most **20 page reads a minute** per plugin (`rate_limited` beyond: a site is never
hammered through the hidden browser). Each read opens a fresh page, so cache what you read with
[`kino.storage`](kino-api.md#storage). A list's read waits up to 8 s for its turn when another page is
open (`busy` after that), and the person pressing play ends it.

Errors: `browser_unavailable` (no WebView, and always in the Node kit once the request is valid and the
manifest says `"pages"` -- the kit answers `invalid_request` and `not_allowed` first, the way the app
does; keep a plain `kino.fetch` path so the kit can still run your plugin), `timeout` (the page did not
load, or `waitFor` never matched), `blocked` (a human check, a check page that never passed, a top
document off your hosts; or the start host is not yours, not https, or resolves into the home network),
`busy`, `not_allowed` (no approved `"browser": "pages"` -- `true` is capture-only --, another
function, or nobody is using the app), `rate_limited` and `invalid_request`.

## A real-world example { #real-world }

[**Maratón**](https://github.com/xuper-plugin/maraton) (signed, `apiVersion` 6, `"browser": "pages"`) is a plugin built this way: it
lists each episode's servers and languages with plain `kino.fetch`, plays the first one through
`kino.browser.capture`, and offers the rest as [labelled lazy copies](contract.md#lazy-copies) in the
player's Servidor menu, each captured only when the person picks it. For everything else -- settings,
sessions, downloads, live channels -- "Tu servidor"
([kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server)) stays the
complete reference plugin.
