# Sharing: to Kino Social and with cards { #share }

Any plugin can offer the person a **Compartir** (Share) button. This page has two parts:

- **[Sharing to Kino Social today](#social)** (Kino 0.9.81 or newer, with Kino Social 0.9.7 or later): your plugin proposes a
  post to Kino Social (a text and, if you like, the title the person is watching) through the `wall` door of the
  [plugin protocol](protocol.md). Kino Social keeps it as a **draft**; the person reviews it and posts it there. **Nothing is
  published without the person.**
- **[Share cards](#cards)** (Kino 0.9.84, not published yet): the pieces that let a plugin open another plugin's content from a
  card: [`go.plugin`](#go-plugin), [`openFrom.routes`](#open-from), [`ctx.caller`](#ctx-caller) and
  [`kino.image.thumbnail`](#thumbnail).

Look at Megaplay ([xuper-plugin/kino-plugin-megaplay](https://github.com/xuper-plugin/kino-plugin-megaplay), its
`src/browse/share.js`) as the published example: it shares from a title page and from the bar.

!!! tip "Not the `share` answer"
    A screen's `share` answer (apiVersion 17) opens the device's own share sheet. This page is about something else: sending
    something to Kino Social, or opening another plugin's content.

## Sharing to Kino Social today { #social }

!!! note "Kino 0.9.81 or newer, with Kino Social 0.9.7 or later"
    The `wall` door arrives in Kino Social 0.9.7 ([kinotvapp/kino-social](https://github.com/kinotvapp/kino-social)). It sits in
    its `enhancements["20"]`, so only Kino 0.9.81 or newer opens it. Your plugin uses it as a consumer of the
    [plugin protocol](protocol.md) (`apiVersion` 20, or `consumes` inside `enhancements["20"]`).

**What happens when your plugin shares:**

1. The person presses **Compartir** on your screen, types (or keeps) a text and sends.
2. Your plugin calls `kino.plugins.call("social", "share", { … })`.
3. Kino Social **publishes nothing**: it keeps the proposal as a draft on the device and answers
   `{ status: "draft", draftId, pending }`.
4. Kino's bell announces it («Megaplay quiere publicar en tu muro») and Kino Social's wall shows the draft at the top, with
   **Revisar** and **Descartar**. Revisar opens Kino Social's composer filled in (with the title's poster, if you sent one);
   the person presses **Publicar** themselves, or discards it.

### The manifest { #social-manifest }

```json
"consumes": { "social": { "repo": "kinotvapp/kino-social", "door": "wall", "calls": ["share"] } },
"recommends": ["kinotvapp/kino-social"]
```

- `social` is your local alias, the first argument of `kino.plugins.call`.
- `recommends` names the same repository: `screen` and `screenEvent` then get `installed["kinotvapp/kino-social"]`, so you
  know whether to offer installing it.
- With `"apiVersion": 20` both sit at the top level. If your plugin keeps a lower `apiVersion` to keep installing on older
  Kinos, `consumes` goes inside `enhancements["20"]` and the feature hides behind `typeof kino.plugins === "object"`.
  Megaplay, for example, keeps `apiVersion` 9, declares its screen in `enhancements["14"]` and its `consumes` in
  `enhancements["20"]` (next to `"capabilities": ["screen"]`).
- Sharing needs no host: what you send reaches Kino Social through Kino, not over the network.

### The `share` call { #share-call }

```js
const r = await kino.plugins.call("social", "share", {
  text: "Estoy viendo «Frieren»",                                   // optional, up to 500 characters
  title: { kind: "series", tmdb: 209867, season: 1, episode: 3 },   // optional: a movie or series by its TMDB id
  link: "https://example.com/page",                                 // optional, https only
  from: "My plugin",                                                // optional: your plugin's name
});
// r = { status: "draft", draftId: "…", pending: 1 }
```

| Field | Type | What Kino Social does |
| --- | --- | --- |
| `text` | `string?` | The proposed text. Control characters out, extra blank lines folded, cut at 500 characters (its composer's limit) |
| `title` | `{ kind, tmdb, season?, episode? }?` | The title to attach. `kind` is `"movie"` or `"series"`; `tmdb` a positive whole TMDB id. `season` and `episode` (both positive whole numbers) count only on a series. On review, Kino Social fetches the name, year and poster from TMDB |
| `link` | `string?` | An `https` link (at most 500 characters, no user or password). It goes at the end of the text on review |
| `from` | `string?` | Your name, at most 40 characters. Shown in the notice («My plugin quiere publicar en tu muro») |

- **At least one** of `text`, `title` or `link`. **Text-only** sharing is valid: leave `title` out (Megaplay does so from its
  bar, or when the person switches «Adjuntar el título» off).
- Kino checks the types against the door: an extra field, or a wrong type (`tmdb: "209867"`), is `bad_input`. Kino Social
  checks the meaning: an empty proposal, a `kind` other than `movie` or `series`, or a non-https link is refused, and you get
  `provider_failed`.
- **The answer:** `status` is `"draft"`, `draftId` the draft's id and `pending` how many drafts wait (at most 5: the oldest
  goes). The same proposal twice (same text, title and link) keeps one draft. Drafts older than 14 days are dropped.
- `from` is your own word: Kino Social 0.9.7 does not know which plugin calls and shows what you send. Put your plugin's real
  name.

### Errors and what to do { #share-errors }

| What happens | What to do |
| --- | --- |
| `typeof kino.plugins !== "object"` (Kino before 0.9.81) | Do not call: a toast «Actualiza Kino para compartir en Kino Social» |
| `provider_missing` and `installed["kinotvapp/kino-social"]` is not `true` | Kino Social is not installed: answer `go: { installPlugin: { repo: "kinotvapp/kino-social" } }` so Kino opens its install sheet (the person decides) |
| `provider_missing` with `installed[…] === true` | Kino Social is off or needs setting up: say so in a sentence (a `go.installPlugin` of an installed plugin only shows «Ese plugin ya está instalado») |
| `not_declared` | Your `consumes` does not list `share`, or the installed Kino Social is older than 0.9.7 and has no `wall` door: ask the person to update Kino Social |
| `bad_input` | A bug in your code: an extra field or a wrong type |
| `provider_failed` | Kino Social refused the proposal (empty, a bad title or link) or failed: «No se pudo enviar a Kino Social. Inténtalo de nuevo.» |
| `rate_limited`, `timeout` | Offer to try again; never retry in a loop |

Always keep a default sentence for a code you did not expect. The full list of codes is in [Errors](protocol.md#errors).

### Rules { #share-rules }

- **Only from the person's press.** Share when the person pressed Compartir and sent; never from `open`, a timer, a `job`
  (there `kino.plugins.call` answers `not_allowed`) or on your own.
- **Never publish on the person's behalf.** The door only leaves a draft; do not tell the person it was posted. Tell them it
  waits in Kino Social for them to review.
- **Let the person see and change the text** before it goes, and drop the title if they do not want to share it.
- **Nothing private.** What you send reaches Kino Social: no tokens, no setting values, nothing the person typed in a private
  field.
- **Texts in Spanish and English**, like everything the person reads.

### A complete minimal example { #share-example }

A screen with a **Compartir** button (in the bar, text only; and in the content, with the title), a sheet with the text and an
«Adjuntar el título» switch, and the send. Megaplay's shape, simplified.

```json
{
  "id": "mi-plugin",
  "name": "Mi plugin",
  "version": "1.0.0",
  "apiVersion": 20,
  "entry": "plugin.js",
  "hosts": [],
  "capabilities": ["screen"],
  "screen": { "label": "Mi plugin", "labelEn": "My plugin" },
  "recommends": ["kinotvapp/kino-social"],
  "consumes": { "social": { "repo": "kinotvapp/kino-social", "door": "wall", "calls": ["share"] } }
}
```

```js
const SOCIAL = "kinotvapp/kino-social";   // exactly as written in "recommends"
const SHEET = "shareSheet";
const TITLE = { kind: "series", tmdb: 209867, name: "Frieren" };   // the title this page shows

const en = () => String(kino.lang || "").startsWith("en");
const say = (es, english) => ({ toast: es, toastEn: english });

function shareSheet(share) {
  return {
    type: "BottomSheet", key: SHEET, title: "Compartir en Kino Social", titleEn: "Share on Kino Social",
    children: [{ type: "Form", key: "shareForm", onSubmitted: { event: "sendShare", timeoutMs: 15000 }, gap: 12, children: [
      { type: "TextField", key: "shareText", multiline: true, maxLines: 6, maxLength: 500,
        labelText: "Qué quieres contar", labelTextEn: "What do you want to say" },
      ...(share ? [{ type: "Switch", key: "shareTitle", value: true, labelText: "Adjuntar el título", labelTextEn: "Attach the title" }] : []),
      { type: "Text", style: "caption", color: "muted",
        text: "Llega a Kino Social como borrador: allá lo revisas y lo publicas.",
        textEn: "It reaches Kino Social as a draft: you review and post it there." },
      { type: "ElevatedButton", key: "shareSend", icon: "send", submit: true,
        labelText: "Enviar a Kino Social", labelTextEn: "Send to Kino Social" },
    ] }],
  };
}

export async function screen({ state = {} }) {
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar", title: "Mi plugin", titleEn: "My plugin", mergeWithKinoBar: true, dense: true,
      leading: { type: "IconButton", icon: "close", labelText: "Cerrar", labelTextEn: "Close", onPressed: { close: true } },
      actions: [{ type: "IconButton", key: "shareBar", icon: "share", labelText: "Compartir", labelTextEn: "Share",
        onPressed: { event: "openShare", arg: "" } }],                       // from the bar: text only
    },
    body: { type: "SingleChildScrollView", children: [{ type: "Column", padding: 16, gap: 12, children: [
      { type: "Text", text: TITLE.name, textEn: TITLE.name, style: "h3" },
      { type: "ElevatedButton", key: "share", icon: "share", labelText: "Compartir", labelTextEn: "Share", autofocus: true,
        onPressed: { event: "openShare", arg: "title" } },                    // from the title: with the title
      shareSheet(state.share || null),
    ] }] },
  };
}

export async function screenEvent({ name, arg, value, state = {}, installed = {} }) {
  if (name === "openShare") {
    const share = arg === "title" ? TITLE : null;
    const text = share ? (en() ? `I'm watching "${share.name}"` : `Estoy viendo «${share.name}»`) : "";
    return { state: { share, inputs: { shareText: text, shareTitle: !!share } }, ui: [{ open: SHEET }] };
  }
  if (name === "sendShare") {
    // The form's fields come as value; state.inputs holds them too.
    const v = { ...(state.inputs || {}), ...(value && typeof value === "object" ? value : {}) };
    return sendShare(v, state.share || null, installed);
  }
  return null;
}

async function sendShare(v, share, installed) {
  const text = String(v.shareText || "").trim().slice(0, 500);
  const withTitle = !!share && v.shareTitle !== false;
  if (!text && !withTitle) return say("Escribe algo o adjunta el título.", "Write something or attach the title.");
  if (typeof kino.plugins !== "object") return say("Actualiza Kino para compartir en Kino Social.", "Update Kino to share on Kino Social.");
  const arg = { from: "Mi plugin" };
  if (text) arg.text = text;
  if (withTitle) arg.title = { kind: share.kind, tmdb: share.tmdb };
  try {
    await kino.plugins.call("social", "share", arg);
    return { ui: [{ close: SHEET }], state: { share: null },
      ...say("Listo: tienes el borrador en Kino Social para revisarlo y publicarlo.", "Done: the draft waits in Kino Social for you to review and post.") };
  } catch (e) {
    const code = e && e.code;
    if (code === "provider_missing" && installed[SOCIAL] !== true) {
      return { ui: [{ close: SHEET }], go: { installPlugin: { repo: SOCIAL } },
        ...say("Instala Kino Social para compartir.", "Install Kino Social to share.") };
    }
    if (code === "provider_missing") return say("Kino Social está apagado o le falta configurarse: revísalo en Plugins.", "Kino Social is off or needs setting up: check it in Plugins.");
    if (code === "not_declared") return say("Actualiza Kino Social para compartir.", "Update Kino Social to share.");
    return say("No se pudo enviar a Kino Social. Inténtalo de nuevo.", "Could not send to Kino Social. Try again.");
  }
}
```

- The sheet is a [declared pop-up](screen-forms.md#popup): it lives in the tree with its `key` and the answer opens it
  (`ui: [{ open }]`), so it never shows the previous text.
- The `go.installPlugin` comes from the answer to the person's submit, which is exactly where it may come from
  ([`go.installPlugin`](screen-forms.md#go-install-plugin)).
- To try it in the kit without Kino Social:
  `node sdk/run.mjs --state '{"inputs":{"shareText":"hola"}}' . screenEvent sendShare --trigger submit`. Without
  `--provider` every call is `provider_missing` and `installed` is `false`, so you see the install path. Megaplay tests its
  `share.js` with a fake `kino.plugins.call` in `test/share.test.mjs`.

## Share cards { #cards }

!!! note "Available from Kino 0.9.84"
    Not published yet: this arrives with Kino 0.9.84. There is no new `apiVersion`: `go.plugin` and `openFrom` are
    `apiVersion` 20 and an older Kino drops or ignores them; `ctx` and `kino.image` simply do not exist on an older Kino (check
    before using them). Every number is in `contract.json` (`manifest.openFrom`, `manifest.screen.goPlugin`, `protocol.ctx`,
    `kinoImage`).

A plugin that shows other plugins' content (a wall of shared titles, a feed, a list) can carry a small card per item and let
the person open it in the plugin it came from, without knowing how that plugin lays out its pages. Four pieces fit together:

- **The sender** (the plugin that owns the content) puts its own address in the card: its `repo`, a `route` and `args` that
  mean something to it, and a `query` (usually the title) for when nothing else works.
- **The plugin that shows the cards** draws a button with [`go.plugin`](#go-plugin).
- **The target plugin** says in its manifest which of its screen routes may be opened from outside:
  [`openFrom.routes`](#open-from).
- A protocol **provider** knows who calls it through [`ctx.caller`](#ctx-caller), and whoever receives a picture's address
  shrinks it with [`kino.image.thumbnail`](#thumbnail).

**Kino Social will show these cards in a later version.** Until then, a plugin that wants to share uses the
[`share`](#social) call above. What you can do right away is declare `openFrom.routes`, so cards can open your content when
they arrive.

### `go.plugin`: opening another plugin's content { #go-plugin }

From `apiVersion` 20 (Kino 0.9.84): a button on your screen that opens another plugin's screen, or its search, from its GitHub
repository.

```js
{ type: "ElevatedButton", labelText: "Ver en Mi anime", labelTextEn: "Open in Mi anime", onPressed: { go: { plugin: {
  repo: "your-user/kino-plugin-anime", route: "detail", args: { id: "frieren" }, query: "Frieren" } } } }
```

| Field | Rules |
| --- | --- |
| `repo` | Required. A GitHub `owner/name`, with an optional sub-path (`owner/name/plugins/x`), at most 200 characters. A URL (anything with `://`) or an `@ref` drops the `go`, logged |
| `route` | Optional. A route as [`go.screen`](screen-forms.md#go-screen) takes (at most 64 characters) |
| `args` | Optional. A JSON object, within the same cap as `go.screen`'s `args` (4,096 bytes) |
| `query` | Optional. A text of at most 200 characters for the fallback search |

Any other field drops the `go`, logged. It comes only from **the person's own press or submit on your screen** (a tap, a
submit, the answer to one, a pop-up's button): from `open`, a timer, a change, a load-more, a pop-up's `onClose`, a panel or a
notice it is dropped, logged. Below `apiVersion` 20 too.

**What Kino does when the person presses the button, in this order:**

1. The plugin is **not installed**: Kino shows its install sheet (the same one as `go.installPlugin`) and, once the person
   installs it, continues with the steps below.
2. The plugin is **18+** and adults-only content is locked: nothing opens, and Kino shows its own locked-content toast.
3. The plugin is **off**: Kino asks «¿Activar?» and, if the person accepts, continues.
4. `route` is in the plugin's `openFrom.routes`: that screen opens with `args`.
5. Otherwise, if you sent a `query` and the plugin has a search: Kino's search opens scoped to that plugin, with that `query`.
6. Otherwise (no `query`, or no search): Kino opens the plugin's section, or its screen's default page.
7. If none of that is possible: Kino shows a toast.

A route the target does not list is never opened (step 5 or 6 happens instead), and the card cannot reach any other of its
screens.

### `openFrom.routes`: what of your plugin may be opened { #open-from }

```json
"openFrom": { "routes": ["detail"] }
```

- `apiVersion` 20 and the `screen` capability (counting one from `enhancements`). With `"apiVersion": 20` it sits at the top
  level; with a lower `apiVersion`, inside `enhancements["20"]` (an older Kino ignores it without refusing the plugin). At the
  top level below 20 it is refused: `The "openFrom" block needs apiVersion 20`.
- 1 to 16 different names, each 1 to 64 letters, digits or `. _ ~ -` (the same names a `go.screen` `route` takes). A bad list
  refuses the manifest with a message naming `openFrom.routes`.
- **It says what may be opened, not how.** You decide later, in your screen, how each route reaches its content. So an old
  card keeps working even if you change how your pages are laid out.

**How the target reads the route.** Your screen opens at that route: `screen({ route })` gets `route.name` (the route) and
`route.args` (the card's `args`), and the reserved `open` event comes with the same `route`, so you load what the `args` name
there:

```js
export async function screenEvent({ name, route }) {
  if (name === "open" && route && route.name === "detail") {
    const id = route.args && typeof route.args.id === "string" ? route.args.id : null;
    if (!id) return null;                                   // args from another plugin: always check them
    const detail = await loadDetail(id);                    // your own loader
    return { state: { detail } };
  }
  return null;
}
```

The `args` come from the card, that is, from another plugin: treat them as outside data. Check the type, the length and that
they name something of yours, and have a view for an id that no longer exists.

### `ctx.caller`: who calls your door { #ctx-caller }

From Kino 0.9.84, every `proto_` export of a [provider](protocol.md#exports) gets a second argument, `ctx`, that Kino fills in
and the consumer can neither send nor change. `ctx.caller` is the calling plugin:

| Field | What it is |
| --- | --- |
| `id` | The calling plugin's id |
| `repo` | The address it was installed from, as Kino keeps it: `owner/name`, with `/path` for a plugin in a sub-folder and `@ref` for a pinned branch or tag (`owner/name/dir@v2`); `null` when it came from a manifest URL or a file |
| `name` | Its display name |
| `adult` | Whether it is 18+ (the same test as the 18+ lock) |

```js
export async function proto_wall_share(arg, ctx) {
  const caller = ctx && ctx.caller;   // a Kino before 0.9.84 sends no ctx
  // caller = { id: "my-game", repo: "me/my-game", name: "My game", adult: false }
  return { ok: true, from: caller ? caller.name : null };
}
```

- Treat `repo` as an opaque key, or compare only its `owner/name` part.
- **Before using `repo` in a `go.plugin`, cut the `@ref` off**: `go.plugin` drops a `repo` with an `@ref`.
  `repo.split("@")[0]` leaves `owner/name` or `owner/name/path`.
- A provider that declares only `(arg)` keeps working: JavaScript ignores the extra argument.
- In the kit, `node sdk/run.mjs --repo me/my-game <provider folder> proto <door>.<call>` tries a provider as that plugin;
  the kit passes the same `ctx`: the consumer folder's manifest `id` and `name`, `repo` from `--repo <owner/name>` or that
  folder's git origin (otherwise `null`), and `adult` from its `categories`.

### `kino.image.thumbnail`: a small picture from an address { #thumbnail }

```js
let thumb = null;
if (typeof kino.image === "object") {          // Kino 0.9.84+
  try { thumb = await kino.image.thumbnail(card.image, { maxWidth: 200, maxBytes: 16384 }); }
  catch (e) { /* not_image, too_large, network...: show the card without a picture */ }
}
// thumb is "data:image/jpeg;base64,…" (or null): small enough to send inside a message.
```

A sender passes only a picture's address; the plugin that receives it asks Kino for a thumbnail and gets it as a `data:`
address. A plugin's JavaScript cannot decode and re-encode an image (a library for it runs a 1 GB TV box out of memory), so
Kino does it natively: it downloads the picture, reads it with a sample size (never the whole bitmap), scales it down (never
up) to `maxWidth`, and writes a JPEG at quality 85, 75, 65, 55, then 45 until it fits `maxBytes`. A transparent picture goes
over white.

| | Rules |
| --- | --- |
| `url` | An `https` address (at most 2,048 characters). Anything else is `bad_request` |
| `maxWidth` | A whole number from 32 to 400; default 200 |
| `maxBytes` | A whole number from 2,048 to 32,768; default 16,384 |
| The answer | A string `"data:image/jpeg;base64,…"` |
| The download | Follows **your plugin's own network rules**, exactly those of `kino.fetch`: your `hosts` (or `fetchHosts: "any"` approved by the person), https only, never the home network, and your request budget (in a scheduled job, each call is one of the run's requests). At most 5 MB |
| Rate | At most 20 calls a minute per plugin |
| Where | Every export that may use Kino's services (as `kino.tmdb`), a provider's `proto_*` call and a scheduled job included; never `sign()` |

**Errors** (`e.code`): `bad_request` (not https, or the options are out of range), `host_not_allowed`, `not_found` (404/410),
`network`, `timeout` (the download), `too_large` (the download is over 5 MB, or the picture cannot get under `maxBytes`),
`not_image` (not a JPEG, PNG, WebP or GIF that Android reads), `rate_limited`, `not_allowed` (from `sign()`). Show the card
without a picture on any of them.

No new `apiVersion`: check `typeof kino.image === "object"`. Kino's telemetry counts calls by outcome only, never an address.
Under the Node kit there is no image codec: `kino.image.thumbnail` downloads with your fetch rules and answers the bytes **only
when they already are** a JPEG (or PNG) within `maxWidth` and `maxBytes`; anything else throws `kit_unsupported` with a warning
that the Kino app does it. With `KINO_THUMBNAIL_FIXTURE=<file>` it answers that file as the thumbnail, so you can try your
plugin offline.
