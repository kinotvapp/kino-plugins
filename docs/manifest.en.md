# The manifest

`kino-plugin.json`, at most 16 KB:

```json
{
  "id": "archive-org",
  "name": "Internet Archive",
  "version": "1.0.0",
  "apiVersion": 1,
  "entry": "plugin.js",
  "description": "Películas de dominio público y televisión clásica de archive.org",
  "author": "kinotvapp",
  "homepage": "https://github.com/kinotvapp/kino-plugin-archive",
  "hosts": ["archive.org", "*.archive.org"],
  "capabilities": ["search", "home", "browse", "episodes", "resolve"],
  "color": "#E0A030",
  "icon": "icon.png"
}
```

If a rule below is broken, Kino refuses to install the plugin and shows a message in Spanish that
names the field.

| Field | Rule |
| --- | --- |
| `id` | Required. `^[a-z0-9][a-z0-9-]{1,39}$` (2 to 40 lowercase letters, digits or hyphens, not starting with a hyphen). Not one of `live`, `local`, `unknown`, `plugin`, `own`, `subtitle-keys`, `subtitle-prefs` (Kino's own names; older versions reserve a few more: if one says "El id … está reservado por Kino", pick another). It is the plugin's identity: never change it once people have installed it. |
| `name` | Required. 1 to 40 characters. |
| `version` | Required. `MAJOR.MINOR.PATCH` and nothing else (no `-beta`, no `+build`), each number up to 6 digits and without leading zeros. |
| `apiVersion` | Required. `1` to `8`. A higher number than Kino supports is refused with "Este plugin necesita una versión más nueva de Kino". Declare the lowest number that has what you use, so your plugin also runs on older Kino builds: `2` for `download`, `drm`, `insecureHttp`, `"hosts": []` or `live` items; `3` for `channels`/`liveStreamHosts`; `4` for a `list` setting, `streamHosts` or `secrets`; `5` only for a [signed plugin](signed.md) (Kino 0.9.45+); `6` (Kino 0.9.50+) for anything on the [apiVersion 6 list](changelog.md#v0950): typed or larger sealed secrets, `migrate`, `scopedSearch`, request-signed streams, the settings form's `section`/`status`/`action`, `debug`, `telemetry`, `section`, `categories`, `theme`, `userMessage`, `adult` entries, channels in Home rows, `kino.crypto`'s key-pair calls, the `meta` capability, [`"browser": true`](browser.md) with `kino.browser.capture` (and `"browser": "pages"` with `kino.browser.page` too), and [labelled and lazy copies](contract.md#lazy-copies); `7` (Kino 0.9.51+) for the [`tracking`](contract.md#tracking) and [`segments`](contract.md#segments) capabilities; `8` (Kino 0.9.54+) for [`music` and `podcast` items](contract.md#music-podcasts) and the [`details`](contract.md#details) export. |
| `entry` | Required. Relative path of the JavaScript file: letters, digits, `.`, `_`, `-` and `/` only, no `..`, at most 200 characters, ends in `.js`. The file is at most 1 MB. **Write `"plugin.js"`, never `"./plugin.js"`**: Kino 0.9.45 and older refuse a leading `./` (see the warning [below](#entry-dot-slash)). |
| `signature` | Optional, from apiVersion 5: `{ "authorKey": "<64 hex>", "value": "<128 hex>" }`, written by `node sdk/seal.mjs --sign`: your signature over the entry file. Needs Kino 0.9.45+. See [Signed plugins](signed.md). Below apiVersion 5 it is ignored. <a id="signature"></a> |
| `hosts` | Required. at least 1 entry, with no upper limit from Kino 0.9.45 (only the manifest's 16 KB bounds it). Kino 0.9.44 and older refuse more than 20, so with more than 20 hosts the kit warns "Más de 20 hosts: Kino 0.9.44 o anterior rechaza este plugin; necesita Kino 0.9.45 o superior". From apiVersion 2 it may be empty, `[]`, when the plugin has a `url` setting: see [The person's own servers](#own-servers)); each a lowercase DNS name (`archive.org`), `*.` plus a DNS name (`*.archive.org`), or (apiVersion 2 only) an object `{ "host": "…", "insecureHttp": true }` (below). Host names only: no scheme, port or path. No bare `*`, no IP addresses, no `localhost`, nothing ending in `.local`, `.lan`, `.internal`, `.localhost` or `.home.arpa`, and at least one dot. **`*.x` covers subdomains only, not `x` itself**: if you need both, list both. The hosts a person approves later, one by one, while your plugin runs ([A host you forgot](contract.md#forgotten-host)) are not counted against the manifest. |
| `capabilities` | Required. A subset of `search`, `home`, `browse`, `episodes`, `resolve`, `download`, `drm`, `channels`, `migrate`, `scopedSearch`, `meta`, `subtitles`, `tracking`, `segments`. Must include `resolve` and at least one of `search` or `home`, except in a [catalog-only plugin](contract.md#catalog-only) (`"catalogOnly": true`, Kino 0.9.54) and a plugin that declares only `subtitles`, `tracking` and/or `segments` (below). `search`, `home`, `browse`, `episodes` and `resolve` must each be an exported function of the entry file, or the install fails with "El plugin no carga: le falta ...". `download` and `drm` need `apiVersion: 2` and are declarative flags instead — the app acts on them, not your code, so nothing extra to export; declaring one shows its consent line ("Puede descargar videos para verlos sin conexión" / "Reproduce video protegido (DRM)") and needs approval again on an update that adds it. `download` gives your titles offline downloads (see [Downloads](#downloads)); `drm` lets a `Stream` carry a Widevine license (see [A Widevine-protected stream](cookbook.md#widevine)). `channels` needs `apiVersion: 3` and the exports `liveCategories` and `liveChannels` (see [Channels in the En vivo tab](live-channels.md#en-vivo-tab)). `migrate` needs `apiVersion: 6` and the export `migrate`; declaring it shows "Revisar lo que tienes guardado (biblioteca, historial, favoritos) para pasarlo a este plugin" and needs approval again on an update that adds it (see [Moving saved titles](migrate.md)). `scopedSearch` needs `apiVersion: 6` and `search` (refused otherwise with "La capacidad \"scopedSearch\" necesita también \"search\""); it exports nothing of its own: your `search` gets `within` when the person searches inside a "Ver más" page (see [Searching inside a "Ver más" page](contract.md#scoped-search)). `meta` needs `apiVersion: 6` and the export `meta`, no consent line (see [Describing other titles](contract.md#meta)). `subtitles` needs the export `subtitles`; `["subtitles"]` alone is a subtitle provider; a plugin that declares only `subtitles`, `tracking` and/or `segments` (a subtitle provider, a tracker, a segment source or a mix of them) is also an exception to "`resolve` and `search` or `home`" (see [Subtitles for any title](contract.md#subtitles)). `tracking` needs `apiVersion: 7` and the export `track`; declaring it shows a red line naming your hosts ("Le contará a seenr.app qué ves y cuándo lo terminas") and needs approval again on an update that adds it, even when Kino approves other updates on its own (see [Telling a tracker what the person watches](contract.md#tracking)). `segments` needs `apiVersion: 7` and the export `segments`; declaring it shows "Agrega el botón para saltar la intro y los créditos", not in red and with no approval of its own (see [Where the intro and credits are](contract.md#segments)). |
| `settings` | Optional. What the person fills in on your plugin's "Configurar" screen: see below. |
| `permissions` | Optional. A list of names from the closed list in `contract.json`. **The list is empty in this version**: any name is refused with "permiso desconocido: …". It exists so a later version can add permissions (each one shown on the consent screen) without a new `apiVersion`. |
| `color` | Optional `#RRGGBB`: the accent of your plugin's tab and chips. A neutral color by default. |
| `icon` | Optional relative path to a square `.png`, at most 128 KB. An icon that is missing or too big is skipped without failing the install. |
| `discoverable` | Optional `true` or `false` (default `true`), at every `apiVersion`. `false` keeps the plugin out of Kino's community search (see [Get found](publish.md#get-found)); people can still install it by typing its address. Any other value is refused with "El campo \"discoverable\" debe ser true o false". |
| `categories` | Optional, at every `apiVersion`: what your plugin offers, for the category chips of Kino's plugin marketplace (Recomendados, "De la comunidad", "Elige tus fuentes"). A list without repeats of `movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `adult`. When present it replaces Kino's guess from your capabilities (`channels` is `live`, `episodes` is `series`, anything that lists and plays is `movies`); an `adult` plugin's chip only shows while the person's 18+ code is unlocked. Any other value is refused with "El campo \"categories\" debe ser una lista sin repetidos de: movies, series, anime, live, radio, subtitles, utilities, adult". Not the same as the `categories()` export (tiles inside Kino's Categorías, see [Section, categories and colors](section-theme.md)). |
| `catalogOnly` | Optional `true` or `false` (default `false`), at every `apiVersion`, from Kino 0.9.54 (older Kino ignores it). `true` says the plugin lists and describes titles but plays none: `resolve` is no longer required, and Kino never calls it; its titles go to "Buscar dónde verlo". It needs one of `home`, `browse`, `search` or `meta`, and refuses `download`, `drm`, `channels`, `streamHosts` and `"browser": true`. To stay installable on Kino 0.9.53 and older, keep declaring and exporting `resolve` (failing with `not_found`) and `search` or `home`. See [Catalog-only plugins](contract.md#catalog-only). Any other value is refused with "El campo \"catalogOnly\" debe ser true o false". |
| `browser` | Optional `true`, `false` or `"pages"`, from `apiVersion` 6; ignored below. `true` lets the plugin open pages in a hidden web view on the device with `kino.browser.capture` (in `resolve`), shown in red as "Puede abrir páginas web ocultas para encontrar el video"; `"pages"` adds `kino.browser.page`, shown as "Puede abrir páginas web ocultas para mostrar contenido y encontrar el video". An update that adds it, or moves `true` to `"pages"`, waits for approval again; an approved plugin's `resolve` gets 75 s. See [Hidden browser](browser.md). Any other value is refused with "El campo \"browser\" debe ser true, false o \"pages\"". |
| `debug` | Optional `true` or `false` (default `false`), from `apiVersion` 6; ignored below. From Kino 0.9.50 every installed plugin has a "Modo debug" switch in its Ajustes tab (errors on screen and a "Registro" the person can copy or share with you); this field only turns it **on by default**. Without it the switch starts off and each person turns it on when they want to send you a report. The person's own choice wins once they touch it (`validate.mjs` notes what `true` means). See [Logs and telemetry](diagnostics.md#debug). Any other value is refused with "El campo \"debug\" debe ser true o false". |
| `telemetry` | Optional `true`, `false` or `"verbose"` (default `false`), from `apiVersion` 6; ignored below. Asks to share your plugin's diagnostic lines with Kino's error tracker when a call fails, whatever repository the plugin comes from, and turns on `kino.log.report`. It shows on the consent sheet and an update that newly declares it waits for their approval. Up to Kino 0.9.53 the lines of every plugin that declares it are always sent, with no switch; from Kino 0.9.54 your plugin's tab in Ajustes has an "Enviar registros de errores y de reproducción" switch, on by default, and the consent line says "Comparte con Kino registros de errores y datos técnicos de algunas reproducciones para corregir fallas" (`true` also sends a small sample of good playbacks). See [Logs and telemetry](diagnostics.md#telemetry). Any other value is refused with "El campo \"telemetry\" debe ser true, false o \"verbose\"". |
| `section` | Optional `{ "label": "…" }` (1 to 20 characters), from `apiVersion` 6; ignored below. Gives your plugin its own section and requires the `section` export: see [Section, categories and colors](section-theme.md). |
| `theme` | Optional object, from `apiVersion` 6; ignored below. Up to five `#RRGGBB` colors: `accent`, `onAccent`, `background`, `surface`, `highlight`; any other key is refused with "El campo \"theme\" tiene un color desconocido". The manifest only checks the format; the readability guardrails run when Kino uses the colors ([Your colors](section-theme.md#theme)). |
| `fetchHosts` | Not for your plugin: Kino writes `"fetchHosts": "any"` into the manifests it makes when it converts a Nuvio scraper, and honors it **only** on those (after the person approves it in red), so a converted scraper's `kino.fetch` may reach any public host (see [Nuvio scrapers](nuvio.md)). On a plugin written by hand it is ignored: your `kino.fetch` stays on your `hosts`, and `sdk/validate.mjs` warns "fetchHosts solo tiene efecto en plugins convertidos desde Nuvio; en tu plugin se ignora". From `apiVersion: 4` its only value is `"any"`; any other is refused with "El campo \"fetchHosts\" solo admite \"any\"". Below apiVersion 4 it is ignored. |
| `description`, `author`, `homepage` | Optional strings. Trimmed and cut to 300, 60 and 200 characters. Kino shows the name, author, version and description when it asks the person to install. |

Other keys are ignored. `hosts` does three jobs: it is what the person approves, it is the only set
of sites `kino.fetch` can reach, and it is the set a `Stream`'s URLs must be on: the video, its
subtitles, its `audioTracks` and a `drm` block's `licenseUrl` (besides the person's own server).

One more field, `liveStreamHosts`, is read only with `"apiVersion": 3` and only for plugins with the
`channels` capability: see [Channels from any server](live-channels.md#live-stream-hosts). Live
items (apiVersion 2) and the En vivo tab (apiVersion 3) have their own page,
[Live channels](live-channels.md).

## Paths in `entry` and `icon`: no leading `./` { #entry-dot-slash }

!!! danger "Write plugin.js, never ./plugin.js"
    `entry` and `icon` are paths relative to the manifest. **Kino 0.9.45 and older refuse a leading
    `./`**: the install fails with `El campo "entry" debe ser una ruta relativa a un archivo .js`
    (or the same for `"icon"`), and in the app it just looks like the plugin "does not install". An
    AI-generated plugin wrote `"./plugin.js"` and failed for about 35 installs. Kino 0.9.46 and later
    accept a leading `./` and drop it, but people on older versions still exist, so
    always write `"plugin.js"` and `"icon.png"`, with no `./` (a folder is fine: `"src/plugin.js"`).
    The kit's `validate.mjs` refuses it with: `Quita el "./" del campo "entry" (por ejemplo
    "plugin.js"): Kino 0.9.45 y anteriores no instalan el plugin con "./"`.

## Playing from any server (`streamHosts`, apiVersion 4) { #stream-hosts }

Some sources serve their video from CDNs whose domains you cannot list (they change, or sit on bare
TLDs, which a `*.xyz` entry can never cover). With `"apiVersion": 4` a plugin may add:

```json
"apiVersion": 4,
"streamHosts": "any"
```

`"any"` is the only value and no capability is needed; an older manifest ignores the field. It lets
**what the plugin plays** be on **any public host**, over `http` or `https`:

- a movie or an episode: exactly the rule of the
  [broad video permission](contract.md#broad-video) -- the same rule, asked for by you up front
  instead of granted by the person. In the player, the `url` `resolve` returns, everything its
  manifest names, every redirect hop, **and** the `subtitles` and `audioTracks` you return may be on
  any public host, and no video host is ever asked about. A [download](#downloads) of that movie or
  episode follows the same rule;
- a live channel: the rule of [`liveStreamHosts: "any"`](live-channels.md#live-stream-hosts) (the
  stream, its manifest and redirects; your `subtitles` and `audioTracks` stay on your `hosts`).

It changes nothing else: `kino.fetch` (and so every [sealed secret](#secrets)), images and DRM
license servers stay on your declared `hosts`, and local or private addresses (and public names that
resolve into the home network) are still refused. The consent screen shows it in red ("Puede
reproducir video desde cualquier servidor que indique"), and an update that adds it waits for the
person to approve again. Prefer listing the real domains when you can: people trust a narrow list
more.

!!! note "`fetchHosts` is not for you"
    Plugins that Kino builds itself from a Nuvio scraper ([Nuvio scrapers](nuvio.md)) carry one more
    field, `"fetchHosts": "any"`, which lets their `kino.fetch` reach any public server. Kino honours
    it **only** on those converted installs. In a plugin you write, `"any"` is accepted and ignored
    (the consent screen does not show it and `kino.fetch` stays on your `hosts`), and any other value
    is refused. Declare your hosts instead.

## Sealed secrets (apiVersion 4) { #secrets }

A plugin that ships a fixed key (an API token baked into a site's own client, a per-tenant secret its
author owns) can seal it instead of writing it into the manifest as plain text:

```
node sdk/seal.mjs --repo owner/repo --name apiKey
```

(`owner/repo/path` for a plugin that lives in a subfolder.) `--repo` follows the same rules as the
address people install from: a trailing `/` and a `.git` are dropped, but a URL
(`https://github.com/...`) and an `@ref` are refused rather than guessed at. The value is read from a
hidden prompt or piped on stdin -- never as a command-line argument, which would land in shell
history. It must be 1 to 4,096 bytes (UTF-8) -- up to 8,192 with `"apiVersion": 6`; the tool prints one line, `kino-sealed:v1:...`, to paste
into the manifest:

```json
"apiVersion": 4,
"secrets": { "apiKey": "kino-sealed:v1:AbC123..." }
```

- Up to 16 secrets; each name matches `^[A-Za-z][A-Za-z0-9_]{0,31}$`. `secrets` needs
  `"apiVersion": 4`; below that the field is ignored (the plugin installs with no secrets, and
  `kino.secret` throws for every name), and a Kino too old for apiVersion 4 refuses the whole install
  with "Este plugin necesita una versión más nueva de Kino".
- A seal is bound to the repository (and subfolder) you passed `seal.mjs`, lowercased, **never to a
  ref**. At install and at every update Kino opens each seal once against the address the person is
  installing from, only to check it belongs there; each run of the plugin opens them again, in
  memory, for that run alone. A seal made for a different repository, path or name, or one that was
  corrupted, is refused with "Los datos sellados de este plugin no son para este repositorio o están
  dañados"; a build that cannot open seals at all refuses with "Este Kino no puede abrir datos
  sellados".
- **Only from the default branch, never an explicit `@ref`.** GitHub serves any commit reachable in a
  repository's fork network -- a fork's or a pull request's -- through the parent repository's own
  address, and not only for an obvious SHA: a short hex prefix or a git-describe ref resolves the same
  way. So `owner/repo@<anything>` can be someone else's manifest, with their own `hosts`, while the
  seal still reads `owner/repo`. A plugin with secrets installed or updated with any explicit `@ref`
  -- branch, tag, commit -- is refused with "Los datos sellados solo funcionan si instalas el plugin
  desde su rama principal, sin @rama", and a run at such an address gets no secrets.
- A seal trusts the repository's *name*: if its owner is renamed or deleted and someone else
  registers that name, their repository opens your seals. Seal again for the new name, and rotate the
  value if the old one was worth protecting.
- Declaring any secret adds "Usa datos sellados por su autor" to the consent sheet; an update that
  brings secrets to a plugin that had none asks again, exactly like a new host. Adding, changing or
  removing a secret in a plugin that already declared some does not.

### Typed cipher keys (apiVersion 6) { #typed-keys }

A sealed value used as the key of `kino.crypto.encrypt`/`decrypt` can be declared as a key, so Kino
reads its bytes with an encoding fixed in the manifest instead of whatever `keyEncoding` the code
passes. That is what lets a sealed key work for `des-ede3-*` too (an untyped sealed key stays AES-only):

    node sdk/seal.mjs --repo owner/repo --name portalKey --use cipher-key --encoding hex

prints one JSON line to paste as the secret's value:

```json
"apiVersion": 6,
"secrets": { "portalKey": { "seal": "kino-sealed:v1:...", "use": "cipher-key", "encoding": "hex" } }
```

- `use` must be `"cipher-key"`; `encoding` is `"hex"` or `"base64"`; no other field is allowed.
- The value must decode, under that encoding, to a 16, 24 or 32-byte key: `seal.mjs` refuses anything
  else, and Kino refuses the install with "El secreto "portalKey" debe ser una clave de 16, 24 o 32 bytes".
- `kino.secret("portalKey")` works as the **whole** `key` of any `encrypt`/`decrypt`; the `keyEncoding`
  you pass is ignored. It is refused, with "a sealed value can't be used here", as an HMAC key, a
  `pbkdf2` input, anywhere in `data`/`iv`/`aad`, and anywhere in a `kino.fetch` request (the URL,
  header names or values, a text, JSON or form body): a typed key is for `kino.crypto` only and never
  goes on the wire.
- Below apiVersion 6 an object here is not a seal: the manifest is refused.
- The SDK kit simulates all of this from the plain value in `.kino-secrets.json`; the key's bytes, in
  hex (either case) or base64, are also redacted from anything a server sends back.

**What this protects, and what it does not.** This is obfuscation, not secrecy: the private key that
opens a seal ships inside every copy of Kino. Sealing a value keeps it out of your manifest and your
repository's history; it does not stop someone from pulling Kino apart and opening the seal
themselves, any more than it stops the site you call from seeing the plain value on its own end.
Don't bother sealing a value that is already public (a key already sitting in that site's own player
JavaScript gains nothing from being sealed in yours), and never seal **the person's** credentials:
those belong in a `password` [setting](#settings).

**Using it.** [`kino.secret(name)`](kino-api.md#secret) answers a marker, not the value; Kino swaps
the marker for the real value only inside `kino.fetch`, toward your manifest's own `hosts` over
`https`, and redacts the value from everything that comes back to your code. The full rules
(where the marker is swapped, `kino.crypto`, redaction) are on [The `kino` API](kino-api.md#secret);
testing with the Node kit is on [Test it locally](test-locally.md#secrets).

## Settings { #settings }

`settings` is a list of at most 12 entries that hold a value (plus, from apiVersion 6, at most 16 that
only show or do something: see [The settings form](settings-form.md)). Each one becomes a field on the plugin's "Configurar"
screen (Ajustes ▸ Plugins), and your code reads its value with `kino.config.get(key)`:

```json
"settings": [
  { "key": "server", "label": "Servidor", "type": "url", "required": true, "hint": "http://192.168.1.10:8096" },
  { "key": "user", "label": "Usuario", "type": "text", "required": true },
  { "key": "password", "label": "Contraseña", "type": "password", "required": true },
  { "key": "quality", "label": "Calidad", "type": "select", "default": "hd",
    "options": [{ "value": "hd", "label": "Alta" }, { "value": "sd", "label": "Normal" }] },
  { "key": "subs", "label": "Subtítulos", "type": "toggle", "default": true }
]
```

<!-- contract:settings:start -->
| type | value | can be `required` | can have a `default` | longest value |
| --- | --- | --- | --- | --- |
| `text` | text | yes | yes | 500 characters |
| `url` | text | yes | no (use `hint` for an example) | 2,048 characters |
| `password` | text | yes | yes | 500 characters |
| `toggle` | `true` / `false` | no (always has a value) | yes | — |
| `select` | one of the `options` values | no (always has a value) | yes | — |
| `list` | a list of entries, each an object of the list's `fields` | yes | no | — |
| `section` | none (apiVersion 6) | no (holds no value) | no | — |
| `status` | none (apiVersion 6) | no (holds no value) | no | — |
| `action` | none (apiVersion 6) | no (holds no value) | no | — |
<!-- contract:settings:end -->

- `key` matches `^[a-z][a-zA-Z0-9_]{0,31}$` and is unique; `label` is 1 to 40 characters; `hint`
  (the example under the field) at most 80.
- `select` needs `options` (1 to 20, each a `value` and a `label` of at most 40 characters); its
  `default` must be one of the values. A `toggle` default is `true` or `false`.
- `list` (apiVersion 4) is a list the person builds with an "Agregar" button: each entry is a
  text line with an "Editar" button, and the dialog to add or edit one shows the list's `fields`
  (1 to 4, each with a `key`, `label`, a `type` of `text` or `url`, and optionally `hint` and
  `required`; no `default`). `max` (1 to 50, default 20) caps the entries. `kino.config.get(key)`
  returns an array of objects `{ [field.key]: string }`, trimmed, without all-blank entries; an
  empty list is `undefined`. A `required` list needs at least one entry. The `url` fields of the
  entries become hosts your plugin may reach, exactly like a `url` setting (so `hosts` may be `[]`).
  ```json
  { "key": "sources", "label": "Direcciones", "type": "list", "max": 30,
    "fields": [ { "key": "url", "label": "Dirección", "type": "url", "required": true },
                { "key": "category", "label": "Categoría", "type": "text" } ] }
  ```
- **A `url` setting has no `default`**: a server the person types becomes a host your plugin may
  reach, so only the person can choose it. A manifest with a `default` on a `url` setting is
  refused; put an example address in `hint` instead.
- **A `required` setting with no value** stops every call to your plugin before it runs: the plugin
  shows "Falta configurar", its Home rows are not asked for, and anything the person opens from it
  says "Configura &lt;name&gt; en Ajustes ▸ Plugins" with a button to that screen.
- **Passwords** are stored encrypted on the device. Your code can read them (it has to send them),
  which is why the consent screen says "Este plugin usa tu usuario y contraseña". Kino never writes
  any setting to its log; do not do it yourself.
- **Changing any setting** closes your plugin's sandbox, deletes its cookies and its cached Home
  rows, so the next call starts a new session with the new values. `kino.storage` is **not** cleared:
  if you keep a token there, key it by the user and server it belongs to (the cookbook does).
- Uninstalling deletes the settings, passwords included.
- From apiVersion 6 the form can also show a status, run action buttons and check values before saving,
  and settings travel between the person's devices: see [The settings form](settings-form.md).

## The person's own servers { #own-servers }

A `url` setting is how a plugin talks to a server that is not on the internet: a media server at
home, for instance. **The server the person types becomes one more host your plugin may reach**,
exactly as typed: its scheme (`http` is allowed here, because home servers rarely have a
certificate), host and port. Nothing else on that machine or network is allowed, redirects from it
may only go to the same server or to your declared `hosts`, and your stream and image URLs may point
at it. The consent screen warns "Se conectará a los servidores que escribas en su configuración", and
Ajustes lists what each plugin reaches ("Se conectará a: …").

A plugin whose **only** reach is that server (it never calls a site of its own) declares
`"hosts": []` from `"apiVersion": 2`, as long as it has at least one `url` setting: the consent
screen then lists no host at all, only the line about the servers the person types, and Ajustes says
"Se conectará solo a los servidores que escribas en su configuración" until one is typed. An empty
`hosts` with no `url` setting is refused (`El campo "hosts" solo puede estar vacío si el plugin
tiene un ajuste de tipo "url"`), and on `"apiVersion": 1` it is refused as always. (Kino never lists
a host under the reserved `.invalid` domain either, the placeholder older manifests used.)

Only the scheme, host and port count: any path on that server is reachable, and
`kino.config.get` returns the value as typed. Kino refuses, with a message under the field, a value
that is not an `http`/`https` URL, or whose host is `localhost`, a loopback address (`127.0.0.1`,
`::1`), a link-local one (`169.254.x.x`, `fe80::`) or `0.0.0.0`. Addresses in the person's own network (`192.168.x.x`,
`10.x.x.x`, a `.local` name) are allowed: that is the point.

## Declaring an insecure host (apiVersion 2) { #insecure-host }

A `hosts` entry can also be an object, for a site of yours that has no certificate:

```json
"hosts": ["archive.org", { "host": "cdn.example.org", "insecureHttp": true }]
```

This needs `"apiVersion": 2`. `insecureHttp: true` is the only thing it can carry beyond `host`, and
it marks the only *declared* hosts (not the person's own server, above) allowed over plain `http`:
`kino.fetch`, a `Stream`'s `url`, its `subtitles`, its `audioTracks` and a `drm` block's `licenseUrl`
all accept `http://cdn.example.org/…` once it is declared this way, and every redirect hop is judged
by the same rule. Every other declared host stays https-only, `https` keeps working on the insecure
one, and the host is matched exactly: `sub.cdn.example.org` is not covered. The same rules as a plain
string still apply (public DNS name, no `*`, no IP, nothing private/LAN; a name that resolves into
the person's own network is still refused) plus one more: **no `*.` wildcard** — an insecure host is
named exactly. The consent screen shows it in red, "Conexión sin cifrar con cdn.example.org", and an
update that newly marks a host this way waits for approval like a brand new host would. See
[A site of yours without a certificate](cookbook.md#insecure-site).

## Downloads (apiVersion 2) { #downloads }

Declare `"download"` in `capabilities` (with `"apiVersion": 2`) and Kino offers your titles for
offline viewing: "Descargar" on the info page and "Guardar en el dispositivo" in the library, on
phones (Kino never downloads on a TV). Nothing extra to export. When the person saves a title, Kino
calls your `resolve(ref)` when the download actually runs, exactly as playing would, and saves the
`Stream` as **one file**, with your `headers` on every request, through the same host gate as the player
for that stream: https on your `hosts` or the person's own server -- or any public host when your
manifest has [`streamHosts: "any"`](#stream-hosts) or the person gave your plugin the
[broad video permission](contract.md#broad-video) -- every redirect hop checked, never the home
network. A download never asks about a host. A server the gate refuses ends the download for good
(no "Reintentar": it is not network trouble), with a sentence that names the server; when it is one
that playing would have asked about, the sentence says to play the title once to approve it, and
after that a new download works.
Your `subtitles` are saved next to it. `audioTracks` are **not** saved: the offline copy has
only the audio inside the video file, so a source that dubs through separate tracks is heard in its
main audio when offline.

What downloads, and what does not:

- A progressive file (`mp4`, `mkv`, `webm`, `ts`, …) downloads. The saved file takes its extension
  from your `mime` when you give one, else from the URL, else `mp4`; the player sniffs the bytes anyway.
- An HLS VOD stream (`.m3u8`, an `mpegurl` `mime`, or a response that turns out to be a playlist)
  downloads too, saved as one file: MPEG-TS segments become a `.ts`, fMP4 ones (`EXT-X-MAP`) an
  `.mp4`. From a master playlist Kino takes the highest variant up to 1080p whose audio is inside the
  video; AES-128 keys and byte ranges are handled, and your `headers` go on the playlists, the key
  and every segment. At an `EXT-X-DISCONTINUITY` the segments are kept as they are (the timestamps
  restart there and the player follows; seeking right at the splice may land a little off), unless
  the video or audio format changes at it (e.g. H.264 → HEVC, a track added or gone): that is
  refused like below. Metadata streams (ID3, SCTE-35, private data) don't count as a change, and the
  same formats arriving under other stream numbers (PIDs) after the splice are written back under the
  first segment's ones, so the saved `.ts` plays to the end. A retry resumes at the first missing
  segment when it gets the same content (same variant, same first bytes), even from another CDN;
  different content starts over.
- Audio (Kino 0.9.54, apiVersion 8 [`music` and `podcast` items](contract.md#music-podcasts)):
  progressive audio files and audio-only HLS download too, and a downloaded album plays offline in the
  audio player.
- What cannot be saved ends as "Este contenido no se puede descargar" ("Este video no se puede
  descargar" up to Kino 0.9.53), a final state with no
  "Reintentar" (it would refuse the same way) that the person can only remove, and the partial file
  is deleted: a DASH or Smooth manifest (`.mpd`, `application/dash+xml`, …), a live HLS playlist (no
  `EXT-X-ENDLIST`), SAMPLE-AES or any DRM key, a key that is not 16 bytes or does not decrypt, an
  empty segment (asked for 3 times first), a master whose every video variant needs a separate audio
  rendition (Kino does not save a silent video), a DRM-protected stream and a live channel (a live channel never even shows a download button, also in
  a plugin that declares both `channels` and `download`). Subtitle renditions inside the
  playlist are not saved (your `subtitles` are). There is no separate "resolve for download" call:
  if your source offers DASH and also a file or HLS, prefer those, or accept that those titles play
  but do not download.
- The queue downloads one title at a time, so a `ref` may wait a while before `resolve` is called:
  keep something stable in it and look the fresh link up inside `resolve` (as recommended in
  [The contract](contract.md#id-and-ref)). A retry resumes the partial file even when your URL
  changed. A `resolve` the queue makes that times out fails that download only: it does not count
  toward the three timeouts in a row that switch your plugin off ("No responde"), which only calls
  made for the person on screen do.
- A plugin that is disabled, waiting for its settings, or uninstalled downloads nothing: its titles
  show no download button, and a title already queued fails with "Este plugin ya no puede descargar
  videos". Files already downloaded keep playing offline and stay removable in Descargas, whatever
  happens to the plugin afterwards.

Declaring `download` shows "Puede descargar videos para verlos sin conexión" on the consent sheet,
and an update that newly declares it waits for the person's approval ([Publishing](publish.md#updates)).
