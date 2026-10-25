# Sync providers (apiVersion 12, Kino 0.9.74) { #sync-providers }

Kino keeps a person's devices in step (library, history, progress, settings, their plugins and the
plugins' settings). Out of the box that travels over the **local network**, between paired devices.
From `"apiVersion": 12` (Kino 0.9.74) a plugin can be **the transport** instead: a **sync provider**
stores one encrypted copy of that data on a service it talks to (a bot, a storage API, a server the
person runs), and the person's other devices read it back from there, on any network.

The plugin moves bytes and nothing else. Kino decides what syncs, merges, schedules the rounds and
encrypts the copy before your code ever sees it.

Two complete providers show every part of this page: [Sync-Gram](#examples) (a Telegram bot of the
person's own) and [Sync Servidor](#examples) (a server the person runs).

## Is it the right tool? { #when }

- **Yes**, if your plugin can store one file of up to 4 MiB somewhere the person controls and read it
  back later, with an `https` API on a public host.
- **No**, for anything else: a provider cannot see or change what Kino syncs, cannot sync only some
  tables, and does not replace pairing (remote control and sending to the TV stay on the local
  network).
- The person picks **one** provider, or none: in **Ajustes de todos los perfiles ▸ Sincronización ▸
  Proveedor** ("Settings for all profiles ▸ Sync ▸ Provider") the list has **Red local** and every
  installed provider, each with a switch. Turning one on turns the previous one off (Kino asks first:
  "¿Sincronizar con &lt;name&gt;?", with "Combinar con este aparato"); turning the active one off leaves
  sync off. The choice belongs to that device and never syncs: each device turns its provider on
  itself, with the settings it typed or [received](#provisioning). Each provider is drawn as its own
  card there, with its status, its consent line, its buttons and its "Sincronizar cada".
- Your plugin's own page in Ajustes (phone and TV) starts with Kino's button **"Sincronización ▸
  Proveedor"**, which opens that list (on the TV with your provider's card focused); you declare nothing
  for it. Mark the setup the TV cannot do with [`devices`](settings-form.md#devices) so the TV shows only
  what it needs.

## Who sees what { #who-sees-what }

Kino compresses the snapshot and encrypts it as a whole (AES-256-GCM) before calling your plugin. The
blob your code receives is ciphertext, and Kino never hands your code the key. The key, though, always
comes from your plugin's own settings:

- **Every provider declares [`sync.keySecret`](#sync-block)**, the `key` of one of its `password`
  settings. A manifest with `syncProvider` and no `keySecret` is refused (`The "syncProvider" capability
  needs a "sync" field whose "keySecret" is the key of one of the plugin's own "password" settings`), in
  the app and in the kit. There is no random-key mode.
- **Kino derives the sync key** on each device from that setting's value (HKDF-SHA256, host side). A
  second device that has the same value derives the same key, so it opens the same copy and **no key
  ever travels** between devices.
- **So the plugin and its service CAN read the synced data**: the derivation is public and your code
  reads that setting; a service that issued the token (Telegram, for a bot token) can too. The consent
  sheet says so in **one red line**, the same for every provider: "Sincronizará tus datos a través de su
  servicio: el plugin y su servicio podrán leerlos" ("Will sync your data through its service: the
  plugin and its service can read it"). An update that adds the capability always waits for the
  person's approval.
- Say it plainly in your plugin's description and guide too: whoever holds the token can read the data.

What is inside the copy: everything Kino already syncs between paired devices over the local network,
the same rows (library, history, progress, settings, the installed plugins and their settings), for
every profile this device syncs. Plugin passwords and the other secrets Kino syncs are in it too, each
still sealed row by row with the sync key. Secrets sealed in a plugin's manifest never travel, as always.

## The contract { #contract }

Declare the capability (it may be the only one) and `"apiVersion": 12`, and export two functions, plus
an optional third:

```json
"apiVersion": 12,
"capabilities": ["syncProvider"],
"hosts": ["api.example.com"],
"sync": { "mode": "poll", "maxBlobBytes": 4194304, "keySecret": "token", "provision": ["token"] }
```

```js
export async function syncPull({ maxBlobBytes }) {
  const r = await kino.fetch(API + "/blob", { headers: auth() });
  if (r.status === 404) return null;                       // nothing stored yet
  if (r.status === 401) throw kino.error("auth_required", "token refused");
  if (!r.ok) throw kino.error("unavailable", "pull " + r.status);
  return { blob: r.json().blob, version: r.json().version };
}

export async function syncPush({ maxBlobBytes, blob, expectedVersion }) {
  const r = await kino.fetch(API + "/blob", { method: "PUT", headers: { ...auth(), "If-Match": expectedVersion ?? "" },
    body: { json: { blob } } });
  if (r.status === 409) throw kino.error("conflict", "the stored copy changed");
  if (!r.ok) throw kino.error("unavailable", "push " + r.status);
  return { version: r.json().version };
}

export async function syncStatus(_null) {                  // optional
  if (!kino.config.get("token")) return { ready: false, message: "Falta el token: escríbelo en Conectar" };
  return { ready: true };
}
```

- **One argument, an object** (`null` for `syncStatus`). `maxBlobBytes` is the manifest's value (at most
  4194304).
- **`blob`** is standard base64 (RFC 4648, `+` and `/`, padded) **without line breaks**, in both
  directions. Store it and give it back byte for byte; never decode it into text. A pull answers
  `{ blob, version }`, or `null` when nothing is stored yet.
- **`version`** is a non-blank string of yours (an ETag, a message id, a counter). Kino hands the last one
  it pulled back to `syncPush` as `expectedVersion` (`null` when it pulled nothing).
- **Conflicts.** If your service can tell that the remote copy changed since `expectedVersion`, throw
  `kino.error("conflict", "…")`: Kino pulls, merges and pushes again, at most 3 more times per round.
  If it cannot tell (no compare-and-set), ignore `expectedVersion`: the merge of the next round heals
  the race.
- **Setup missing.** Throw `auth_required` from `syncPull`/`syncPush` when the plugin lacks its settings
  or the service refuses the credentials: the person reads "al proveedor le falta configuración,
  revísala en Conectar" instead of a generic failure.
- **`syncStatus`** answers `{ ready, message? }` for the provider's row. Before every round Kino asks
  it: `ready: false` skips the round (no failure, no back-off, pending changes kept) and Kino asks again
  one pull period later, when the person opens the screen, or right after they save your settings. A
  missing export means ready. A `syncStatus` that throws `auth_required` also means not ready; any other
  failure of it shows the provider as not ready but lets the round run and fail on its own. Never
  download the blob in it: one cheap request at most.
- **Time**: `syncPull` and `syncPush` 60 s each, `syncStatus` 15 s. They run in the background: nobody
  waits on screen, and their timeouts never mark your plugin as "No responde". Every rule of
  `kino.fetch`, hosts and the engine applies as in any other call, except the size caps below.
- **Errors**: use the usual [`kino.error` codes](contract.md#errors); `conflict` is the one of its own. A
  `userMessage` follows the [usual rules](contract.md#user-message), so a sentence that names a token or
  a brand on the blocked list (Telegram, for example) shows as Kino's own line.
- The TypeScript shapes are `KinoSyncPullFn`, `KinoSyncPushFn`, `KinoSyncStatusFn`, `KinoSyncContext` and
  `KinoManifestSync` in [`kino.d.ts`](reference/index.md).

## The `sync` block of the manifest { #sync-block }

From `apiVersion` 12, **required** with the `syncProvider` capability and only with it (otherwise the
manifest is refused: `The "sync" field needs the "syncProvider" capability`; a provider without it or
without `keySecret`: `The "syncProvider" capability needs a "sync" field whose "keySecret" is the key of one
of the plugin's own "password" settings`). `keySecret` and `provision` are required; the rest is optional:

| Key | Default | Rule |
| --- | --- | --- |
| `mode` | `"poll"` | `"poll"` or `"realtime"` ([cadence](#cadence)) |
| `pullEveryMs` | 600000 (10 min) | a positive whole number; Kino raises it to at least 30 s |
| `pushDebounceMs` | 300000 (5 min) | a positive whole number; Kino raises it to at least 5 s |
| `maxBlobBytes` | 4194304 | the largest blob your service accepts, at most 4194304 (4 MiB) |
| `keySecret` | **required** | the `key` of one of your own `password` settings, which must not have a `default` |
| `provision` | **required** | at most 8 different keys of your own settings that hold a value (secret or not); must include `keySecret` |

The messages Kino gives for a malformed block (all in English, shown at install):

- `The "sync" field must be an object with an optional "mode" of "poll" or "realtime" and optional positive whole numbers "pullEveryMs", "pushDebounceMs" and "maxBlobBytes" (at most 4194304)`
- `The "keySecret" of the "sync" field must be the key of one of the plugin's own "password" settings`
- `The setting the "keySecret" of the "sync" field names must not have a "default"`
- `The "provision" of the "sync" field must be a list of at most 8 different keys of the plugin's own settings that hold a value`
- `The "provision" of the "sync" field must include its "keySecret"`

**`keySecret`** must be a **long random token** (a bot token, an API key, a token your server prints),
never a password a person picks: anyone who gets a stored blob can try guesses offline. Until the person
types it Kino runs no round (the row says "Falta el token: configúralo en Conectar"). Changing its value
changes the key: the remote copy then no longer opens ("El token no coincide o los datos guardados no
son de Kino", with "Corregir el token" and "Restablecer sincronización") until the person corrects the token
or resets sync on one device. Every other device needs the new value too ("Enviar a otro aparato", or typed).

**`provision`** names what "Enviar a otro aparato" hands to a second device ([below](#provisioning)).
Name everything the second device needs to run the same provider (for Telegram, the bot token **and**
the chat id), and nothing it does not.

Older Kino builds refuse `apiVersion` 12 ("Este plugin necesita una versión más nueva de Kino").

## When rounds run { #cadence }

A round is pull, merge, push. With `mode: "poll"` Kino runs one:

- when the app comes to the front, then every `pullEveryMs` while it stays there;
- `pushDebounceMs` after the **last** local change (a burst of changes is one push), and never sooner
  than that after the previous round; going to the background sends a pending push at once;
- for the playback position, when playback stops or the app goes to the background, never while it
  advances;
- when the person taps "Sincronizar ahora" ("Sync now").

`pullEveryMs` is only the default: each provider's card in Sincronización ▸ Proveedor has **"Sincronizar
cada"** (1, 5, 10, 30 or 60 minutes, starting at your value rounded to the nearest one), chosen per device
and never synced. Your plugin is not told and needs nothing for it; the push debounce stays yours.

There are at most 60 rounds in any hour, whatever asks. A failed round waits the pull interval doubled
per consecutive failure (up to 30 minutes); the changes it carried stay pending.

**`mode: "realtime"`** keeps all of that and adds one signal: when your code learns that another device
stored a new copy, it calls [`kino.sync.remoteChanged()`](kino-api.md#sync) and Kino pulls at once.
Kino accepts at most one signal every 30 seconds and drops one that arrives during a pull. Your code only
runs while Kino calls it (no open connection between calls), so the place to notice a change is
`syncStatus`, not `syncPull`.

## Size limits { #limits }

- The blob is at most `sync.maxBlobBytes` (4 MiB at most) **decoded**. Kino refuses a larger one in both
  directions: a snapshot bigger than your limit is refused before it reaches you ("tus datos superan el
  tamaño que admite el proveedor"), and a pulled blob over it is not applied.
- Inside `syncPull` and `syncPush` **only**, a `kino.fetch` request (its JSON, the base64 body included)
  and a response body may reach ceil(`maxBlobBytes` × 4/3) + 64 KB instead of 1 MB and 5 MB, and so may
  the call's answer, so the base64 blob fits in one request. Every other call of the plugin keeps the
  usual caps; hosts, budgets, redirects and timeouts do not change.
- Why 4 MiB: the blob crosses the engine as base64 text several times. At 4 MiB a provider needs about
  25 to 30 MB of the plugin's 64 MB engine memory, so keep your own data small while those calls run and
  never build extra copies of the blob (see how Sync-Gram builds a multipart body without decoding it).
- Declare what your service really takes: a smaller `maxBlobBytes` also keeps the raised caps small.

## Sending the settings to another device { #provisioning }

The person configures the provider on one device (the first one never needs a QR). For the second,
Kino carries the settings your manifest names in `sync.provision`, encrypted end to end from one Kino
to the other (to a key the receiving device makes for this one session):

1. On the **second** device (say, the TV): the provider's row ▸ **"Recibir desde otro aparato"**
   ("Receive from another device"). For 3 minutes it shows a QR, an address on the local network and a
   6-digit code. In parallel it tries to open a **second route over the internet** ("Desde otra red", a
   Cloudflare quick tunnel); when it comes up, the screen also shows a few hyphenated **words** (the
   tunnel's name). The QR waits for the tunnel at most a few seconds, then shows the local network only.
2. On the **first** device: the same row ▸ **"Enviar a otro aparato"** ("Send to another device"). It
   scans the QR, which lists the local-network addresses first and then
   `https://<words>.trycloudflare.com/t/<token>`; the phone tries the local addresses first, then the
   tunnel. Without a camera, or with the camera refused, it goes to **"Escribir dirección"**: **"Misma
   red"** (the person types only the last number of the address) or **"Otra red"** (only the words;
   Kino fills in `https://` and `.trycloudflare.com`), plus the 6-digit code. The phone accepts only those
   two shapes, so a typo cannot send the settings anywhere else.
3. The second device asks **"Recibido para &lt;plugin&gt;: ¿aplicar?"** and lists the settings by their
   labels, never secret values (a `url` setting shows its address, with a warning when it is on the local
   network). Only **Aplicar** saves them.

**What protects the internet route, plainly.** The tunnel's words are **public**: the TV screen, the
sender's DNS query and TLS name, and Cloudflare all see them. The `/t/<token>` path in the QR is defence
in depth only (the typed route reaches the same session without it). The real gate, on every route, is
the 6-digit code (plus, on a typed route, the receiver's key masked by that code), with **5 attempts** in
all, of which at most 3 can come through the tunnel (after the third, only the tunnel closes and the
local network keeps its attempts), a **single** valid message, a **3-minute** life, a ceiling of **40
requests** on the tunnel, and the person's "¿aplicar?". The transport is never trusted. The residual risk
is a denial of service: anyone who has the words can spend the tunnel's attempts and close that route.

**About the tunnel.** It is the owner's
[cloudflare-quick-tunnel-kotlin](https://github.com/kinotvapp/cloudflare-quick-tunnel-kotlin) library,
built into the app and loaded only when a receiving screen opens. It uses TCP 7844 (TLS 1.3 + HTTP/2) to
Cloudflare's edge, no QUIC; it asks `api.trycloudflare.com` for a tunnel and resolves the edge through
public DNS (1.1.1.1, 1.0.0.1, 8.8.8.8). Cloudflare's quick tunnels are anonymous and meant for testing and
development: no uptime guarantee, they can be rate-limited ("Cloudflare está limitando las rutas por
internet…"), and a network that blocks them leaves the local route only. Your plugin has nothing to do
with any of it.

What this means for your plugin:

- Only the settings in `sync.provision` travel, sealed like typed ones; anything else is refused. The
  sync key never travels: each device derives it from the same token. Received values are saved like
  typed ones but, as with an action's `setSettings`, Kino does **not** run your `validateSettings` on them.
- "Enviar a otro aparato" is offered only when this device holds a value for every setting in
  `provision`. Fill the ones you find yourself (a chat id) with [`setSettings`](settings-form.md#set-settings),
  so the person never types them.
- The plugin must already be installed on the receiving device ("Instala primero &lt;plugin&gt;").
- With no route at all, the person types the same settings in the second device's own form, unless
  your plugin draws them on the phone only ([`devices`](settings-form.md#devices)): then receiving them
  is the TV's way.

## Settings, profiles and what the person reads { #settings }

- **Conectar** on the provider row opens your plugin's own settings form. Use the
  [configuration aids](settings-form.md#aids): a short `help` (what the person needs and where to get
  it) and a `link` to the place they get it (`https://t.me/BotFather`, your guide). Use
  [`action.link`](settings-form.md#link) when an action finds **who** to link ("¿Eres tú, @ana?") and
  [`setSettings`](settings-form.md#set-settings) to store what it found.
- The provider is per device, but its calls run with the settings of the **profile in use**, the same
  ones the derived key comes from. A profile without the token shows "Este perfil no tiene el token";
  two profiles with different tokens read each other's copy as the wrong key. Tell the person to set the
  provider up in the profile they use.
- The row shows Kino's own lines ("Sincronizado hace 3 min", "Esperando la primera sincronización",
  "Falló la última sincronización: …") and, under them, your `syncStatus` `message`, scrubbed of your
  secrets. When a round fails, the person reads one of Kino's reasons, not your error text: put what
  the person must do in the `message` of `syncStatus`.
- Never put a token in an error, a status line or a log. Kino scrubs your stored secrets from what it
  shows and logs only the host of each plugin request, but a value you build yourself (a token-shaped
  string from the service's own error) is yours to remove.

## Security notes { #security }

- **The `keySecret` trade-off.** Derived keys make a second device easy (same token, nothing else) at
  the cost of confidentiality toward the plugin and the service. Say so plainly in your description and
  your guide; the consent line already says it in red.
- **Revoking the token.** If a token leaks or a device is lost, the person revokes it at the service
  (for Telegram, `/revoke` in @BotFather), types the new one on one device, and taps **"Restablecer
  sincronización"** ("Reset sync"): after a confirmation, that device's copy replaces the unreadable one,
  encrypted with the new key. Then they give the other devices the new token ("Enviar a otro aparato", or
  typed on each). Document these steps in your guide.
- **Reset sync** replaces the remote copy with this device's, with the token it has now; it never deletes
  data on the device. Kino's confirmation says so: "Se reemplaza la copia guardada en &lt;name&gt; por la de
  este aparato, con el token que tienes ahora. Tus otros aparatos siguen sincronizando si usan el mismo
  token; si lo cambiaste, pásales el nuevo con «Enviar a otro aparato» o escríbelo en cada uno."
- **The service can withhold or delete the copy**, and whoever holds the token can read it or write a
  new one. A blob that does not decrypt with the device's key is refused, never applied.
- **Hosts.** `"hosts"` lists what your code reaches. A provider for a server the person runs at an
  address you cannot know needs a [`url` setting](manifest.md#own-servers) or `"fetchHosts": "any"` (red
  consent, public `https` only, never the home network): Sync Servidor uses `fetchHosts` with a `text`
  setting it validates itself.
- **Tunnels.** A plugin never reaches the home network. A server on the person's own computer needs a
  public `https` address in front of it (a Cloudflare tunnel, for example), and the person should know
  who runs that address.

## Test it locally { #test }

- `node sdk/validate.mjs .` checks the `sync` block exactly as Kino does and prints the consent line
  (always red).
- `sdk/run.mjs` has no command for the sync exports. Test them with `node --test`, as the examples do:
  load the plugin with `loadPlugin` (`sdk/sandbox.mjs`) and `createKino` (`sdk/kino-shim.mjs`), run it
  against a local imitation of your service, and check every answer with `checkSyncAnswer`
  (`sdk/contract.mjs`). Include a 4 MiB blob both ways and a conflict.
- On a device: turn the provider on, Conectar, a first round, a change on each device, a wrong token,
  "Restablecer sincronización", and "Enviar a otro aparato" to a second device.

## The two example providers { #examples }

Both live in Kino's repository, in `docs/plugins/examples/`, with a guide in English and Spanish that a
person can follow end to end, and tests that need no network.

- **Sync-Gram** (`sync-telegram/`, id `sync-gram`; unofficial, not affiliated with Telegram): a Telegram
  bot the person creates with @BotFather. `"hosts": ["api.telegram.org"]` only; the copy is a document
  pinned in the person's private chat with the bot (`sendDocument`, `pinChatMessage`, `getChat` for the
  version and a race check, `getFile` to read it back). It shows a multipart upload through `kino.fetch`
  without decoding the blob, linking the chat with `getUpdates` and `action.link`, the confirmed chat
  saved with `setSettings`, a short `help` and a `link` to @BotFather, and every error scrubbed of the
  token. `keySecret` is the bot token and `provision` is `["botToken", "chatId"]`. Its setup is
  `"devices": ["phone"]` with numbered section titles, and its confirm action is `linkOnly`. It is the
  reference for a provider on a third-party service. It is also published, signed, as
  [kinotvapp/kino-plugin-sync-gram](https://github.com/kinotvapp/kino-plugin-sync-gram) and listed in
  Kino's recommended plugins from Kino 0.9.74 (`requires: ["syncProvider"]`, so older Kino never shows it).
- **Sync Servidor** (`sync-server/`, id `sync-server`): a single-file Node server with no dependencies
  (`GET /blob`, `PUT /blob` with `If-Match`, a 409 on a version mismatch, a bearer token) and the plugin
  that talks to it (`"fetchHosts": "any"`, `keySecret` and `provision`, a 409 thrown as `conflict`), reached
  through a Cloudflare tunnel. It is the reference for a provider on the person's own server. It is not
  listed in Kino: people install it by its address.
