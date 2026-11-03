# A browser window the person drives (`visualBrowser`, apiVersion 20) { #visual-browser }

The [hidden browser](browser.md) is hidden: nobody sees it and nobody can type in it. Some things only the person can do on a
web page: sign in, solve a challenge, accept a site's terms, pick something. With `"apiVersion": 20` and
`"visualBrowser": true` your plugin may open **a window the person sees and uses**, `kino.visualBrowser.open`, and get back
what the page left behind (cookies, the page's HTML, its last address), or have Kino write the cookies straight into one of
your `password` settings.

!!! note "Available from Kino 0.9.81"
    `apiVersion` 20 ships with Kino 0.9.81. The window works on an Android phone and tablet, and,
    **experimental**, on Android TV. It does not exist on the desktop app or on a device without a WebView.

## The manifest { #manifest }

```json
{
  "apiVersion": 20,
  "visualBrowser": true,
  "hosts": ["accounts.google.com", "music.youtube.com"],
  "settings": [{ "key": "cookieHeader", "label": "Cookies", "type": "password" }]
}
```

`visualBrowser` is `true` or `false` (default `false`); it is ignored below `apiVersion` 20 and any other value is refused with
`The "visualBrowser" field must be true or false`. It is **not a capability**: nothing is approved at install except a plain
consent line («Puede abrir una ventana web donde inicias sesión o terminas un paso en sus sitios»), because Kino asks the person
in its own sheet **at every open**.

A plugin that keeps an older `apiVersion` (so every Kino still installs it) can offer the window only to a Kino that has it, with
an [enhancement](enhancements.md): `"enhancements": { "20": { "visualBrowser": true } }`. Either way, check
`kino.visualBrowser?.available` before using it.

## `kino.visualBrowser.open(options)` { #open }

```js
if (kino.visualBrowser?.available) {                   // undefined on a Kino without it; false on the desktop and on a device without a WebView
  const r = await kino.visualBrowser.open({
    url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
    title: "YouTube Music",                              // after your plugin's name in Kino's bar
    doneWhen: { cookies: ["SAPISID"] },                  // optional: the window closes by itself when the page holds them
    collect: { cookies: ["SID", "HSID", "SAPISID"], storeAs: { setting: "cookieHeader", format: "header" } },
    userAgent: "browser",                                // or your own string
    timeoutMs: 600000,                                   // at most 10 minutes
  });
  // r = { status: "done" | "closed" | "timeout", finalUrl?, cookies?, html?, stored?, storedNames?, userAgent? }
}
```

`kino.visualBrowser` is `undefined` without the manifest key or on a Kino before 0.9.81; `kino.visualBrowser.available` is `false`
on the desktop and on a device without a WebView.

## What the person sees { #consent }

Kino's own sheet **every time**, in Kino's words (never yours): "&lt;your plugin&gt; wants to open a web window", the sites (your
manifest `hosts`), the cookie **names** you asked for, whether the window identifies itself as a regular browser or with a custom
string, and, with `storeAs`, that Kino keeps the cookies and you do not see them. Only after Continuar does the window open, with
Kino's bar (your plugin's name, your `title`, the host with a lock, Cerrar, and Listo when you gave no `doneWhen`) that you cannot
change. Saying No, Cerrar and Back all give you `{ status: "closed" }`.

## The rules { #rules }

- **Only from the person's own press**: a settings `action`, a `panelAction` or a `screenEvent` that follows the person's tap or
  submit (the same gate as the [QR scanner](qr.md)). From anything else (a search, Home, a timer, a job, a screen's open or
  load-more, a background call) the call throws `forbidden`.
- **Your hosts only.** The first `url` and every page the window moves to must be https on the default port on a host of your
  manifest `hosts` (wildcards as there). Anything else is stopped and Kino says so; the local network is never reachable. A
  sign-in that goes through `accounts.google.com` needs it declared.
- **Cookies.** `collect.cookies` names (at most 32) are read from the hosts the window was on that you declare, HttpOnly ones
  included, at most 64 cookies and 16,384 characters of names and values together; they come back with `done` only.
  `collect.html` is the page's DOM (at most 2,000,000 characters), `collect.finalUrl` its last address.
- **`storeAs`**: Kino writes the cookies itself into your `password` setting `setting` (declared in the manifest) as
  `name=value; name2=value2` (`"header"`) or a JSON object (`"json"`), **after your call has ended** (saving a setting restarts
  your runtime); your script gets `stored` and `storedNames` (the names, never a value). A `password` setting holds 500
  characters: a longer text answers `store_failed` and nothing is stored. Sealed secrets keep their rule: they only travel to
  your declared hosts.
- **`storeAs.spill`** (optional, for a cookie list longer than 500 characters; YouTube Music's needs about 850): an array of 1 to 3
  **more** `password` settings of yours (declared, distinct, none equal to `setting`; else `bad_args`). Kino cuts the formatted
  text at the setting limit (500 characters) and the pieces are the settings' values **in order**: `setting` first, then each
  `spill` one; a setting the text does not reach is emptied, but only if it holds a value now. All of them are saved in **one**
  save (sync records one change), all or nothing: if `(1 + spill.length) x 500` cannot hold the text the answer is `store_failed`
  and nothing is stored. Your script still never sees a value. **To read it back, concatenate the settings' values in that
  order, with no separator** (with `"header"` a cut may fall inside a cookie, so never split or trim a piece):
  `[kino.config.cookieA, kino.config.cookieB, kino.config.cookieC, kino.config.cookieD].join("")`.
- **`storeAs.thenEvent`** (optional): a screen that opened the window cannot see the new account in the same call, because the
  write happens after the call ends. Name a `screenEvent` and Kino sends it to **your open screen** once the setting was written
  successfully, with `arg` = `{ stored: ["SID", ...] }` (cookie names only) and no `value`; handle it by reloading your data.
  The name follows the event-name rules (1 to 128 of `A-Z a-z 0-9 . _ ~ -`, never `open`; else `bad_args`). It is sent only when
  the call came from a screen's `screenEvent` (from a settings action or a `panelAction` the option is accepted and nothing is
  sent), never after a failed write or a window that was not `done`, dropped silently if your screen is closed by then or its
  event queue is full, at most once per call. It is a follow-up, not a press: its answer's `go.url`, `go.copy`,
  `go.titleByIds`, `go.installPlugin`, `share` and `enableJob` are dropped; `state`, `config` and a toast work, with the
  normal event time budget.
- **A clean jar.** The window starts with the cookies of your hosts expired and expires them again when it closes (Android has
  one cookie jar for the app, so a cookie scoped to a path other than `/` survives; it is not your `kino.fetch` jar).
- **Nothing else.** No script of yours in the page, no keystroke exposed, no pop-ups, downloads, file chooser, camera,
  microphone, location or prompts. One window at a time in the whole app (`busy`), at most 10 minutes (`timeoutMs`, brought
  down to 600,000 or up to 5,000), closed when the app is left in the background for a minute or the screen goes.
- **The window's time is its own `timeoutMs`.** While the window is up, the time bound of the call that opened it (a settings
  action's, a `panelAction`'s, a `screenEvent`'s) does not run, so a Google sign-in with 2-step verification can take as long as
  the person needs, up to `timeoutMs`. When the window closes your call has at least 10 seconds left to run the code after
  `open` resolves; a hang after that is stopped as usual.
- **`doneWhen`** closes the window by itself: `cookies` (every named cookie exists) and/or `urlMatches` (the address matches the
  pattern, where `*` is any run of characters and the rest is literal; at most 200 characters).
- **`userAgent`**: `"browser"` is the phone's Chrome string, kept up to date by Kino; or your own, 1 to 300 printable ASCII
  characters, so a site that changes what it accepts is fixed by a plugin update. Either way the WebView marker (`; wv`) is
  removed and `X-Requested-With` is not sent (on a WebView that lets Kino remove it). Absent: the WebView's own.

Errors, as `e.code`: `bad_args` (the options are wrong), `forbidden`, `unavailable` (no WebView on the device, or the desktop),
`busy` and `store_failed`.

## On a TV (experimental) { #tv }

The window also opens on Android TV, driven by the remote: the D-pad moves between the page's links and fields, OK on a text
field opens the TV keyboard, Back goes back in the page and then closes, and Kino's bar (Cerrar, and Listo when you gave no
`doneWhen`) is reachable with Up from the page (or the Menu key) and Down from the bar. Kino's sheet is the same, larger and
focusable. Limits: a site whose controls only answer to a pointer (hover menus, canvas widgets, drag handles) may be hard or
impossible to reach, and a TV box without a WebView answers `available === false`. Keep the paste-the-cookies setting as the
fallback, and remember that the cookies you store travel to the person's other devices with sync, so linking on a phone also
covers the TV.

## Recipe: link an account ("Vincular cuenta") { #recipe-link }

A YouTube Music style login: the plugin keeps its cookies in one `password` setting and offers a button that fills it.

```json
"settings": [
  { "key": "link", "label": "Vincular cuenta", "labelEn": "Link account", "type": "action" },
  { "key": "cookieHeader", "label": "Cookies (pegarlas a mano si no puedes vincular)", "type": "password" }
]
```

```js
async function action(key) {
  if (key !== "link") return;
  if (!kino.visualBrowser?.available) return { message: "Pega las cookies en el campo de abajo" };
  const r = await kino.visualBrowser.open({
    url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
    title: "YouTube Music",
    doneWhen: { cookies: ["SAPISID"] },
    collect: { cookies: ["SID", "HSID", "SSID", "APISID", "SAPISID", "__Secure-3PSID"], storeAs: { setting: "cookieHeader", format: "header" } },
    userAgent: "browser",
  });
  if (r.status !== "done" || !r.stored) return { message: "No se vinculó la cuenta" };
  return { message: "Cuenta vinculada" };   // Kino saves the header once this call returns
}
```

The full YouTube Music cookie list is longer than one `password` setting (about 850 characters), so the plugin declares four
(`cookieA` to `cookieD`) and lets Kino spill the text over them:

```js
const r = await kino.visualBrowser.open({
  url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
  title: "YouTube Music",
  doneWhen: { cookies: ["SAPISID"] },
  collect: {
    cookies: ["SID", "HSID", "SSID", "APISID", "SAPISID", "__Secure-3PSID", "__Secure-3PAPISID", "__Secure-3PSIDTS", "LOGIN_INFO", "VISITOR_INFO1_LIVE", "YSC"],
    storeAs: { setting: "cookieA", spill: ["cookieB", "cookieC", "cookieD"], format: "header", thenEvent: "account_linked" },
  },
  userAgent: "browser",
});
// Later, in any call: the pieces are the settings' values in order, joined with NO separator.
const cookieHeader = [kino.config.cookieA, kino.config.cookieB, kino.config.cookieC, kino.config.cookieD].join("");
```

The same from a **screen** (a button of your tree whose `screenEvent` opens the window); `thenEvent` tells the screen when the
cookies are stored, so it can reload with the new account:

```js
async function screenEvent({ name, arg, state }) {
  if (name === "link") {
    const r = await kino.visualBrowser.open({
      url: "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmusic.youtube.com",
      doneWhen: { cookies: ["SAPISID"] },
      collect: { cookies: ["SID", "HSID", "SAPISID"], storeAs: { setting: "cookieHeader", format: "header", thenEvent: "account_linked" } },
      userAgent: "browser",
    });
    return r.stored ? { toast: "Vinculando..." } : { toast: "No se vinculó la cuenta" };
  }
  if (name === "account_linked") {
    // Kino wrote the cookies after the call above ended; arg.stored lists their names. Now kino.config sees the new account.
    return { state: { account: await loadAccount() }, toast: "Cuenta vinculada" };
  }
}
```

The honest caveat: Google may refuse to sign in inside an embedded window whatever its user agent says, and it can change that
without notice. Keep the paste-the-cookies setting as the fallback, and send `userAgent` as your own string if a newer one works
better (you can ship that in a plugin update, with no Kino release).

## Testing it { #kit }

The Node kit has no window: `node sdk/validate.mjs` checks the manifest key, the options and the consent line, and prints a note;
`kino.visualBrowser.open` answers `unavailable` in `run.mjs` unless a test of your own passes `createKino` a `visualBrowser`
option (it plays the person). Test the real window on a phone or a TV, and keep another way in (pasting the cookies into a
`password` setting). More: [Test it locally](test-locally.md).
