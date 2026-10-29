# Identity: knowing who the person is without a sign-up { #identity }

!!! note "Available with Kino 0.9.77"
    `identity` is `apiVersion` 15 and arrives with Kino 0.9.77. An older version refuses these
    plugins with «Este plugin necesita una versión más nueva de Kino».

`identity` lets your plugin's server know **who the person is without asking for a username or a password**. It is a
**declarative** capability (you export nothing new), cannot stand alone (a [screen](screens.md) or a
[panel](player-panel.md) action uses it) and is not offered through [`enhancements`](enhancements.md): the plugin declares
`apiVersion` 15 itself.

!!! warning "Only plugins signed with Kino's own author key"
    `kino.identity.telegram` **answers only plugins signed with Kino's own author key** (`07DA-B67F-2ACF-B4D3`; a debug build
    of Kino answers any author, for development). The token works as a login for every server that trusts Kino's bot and its
    payload names the Telegram account, so a community plugin gets `permission_denied` whatever the person approved. If your
    plugin is not Kino's, it needs another way in; a per-plugin bot key would lift this restriction.

```json
"capabilities": ["screen", "identity"]
```

## The call { #call }

```js
const { id, token } = await kino.identity.telegram();
```

- **`id`** is a **pseudonym of the person for your plugin**: the first 32 hex characters of SHA-256 of
  `"kino-identity-v1\n" + yourPluginId + "\n" + telegramAccountId`. It is the same on every install and every device of the
  person and **different for every plugin**. You never receive the Telegram id or the username.
- **`token`** is the token Kino's bot signed for this device (`base64url(payload).base64url(Ed25519 signature)`). Your server
  verifies it with the bot's public key. It still names the Telegram account, so treat it as a credential: **never log or
  show it**.

## With a challenge: binding the session to this device and to your code { #challenge }

```js
const who = await kino.identity.telegram({ challenge }); // the nonce your server issued
// who = { id, token, deviceKey, signature, author, codeHash }
```

`challenge` is a nonce from your server: 16 to 128 characters of `A-Z a-z 0-9 _ -`. With it, Kino also **signs**
(SHA256withECDSA, curve P-256, with a non-exportable key of its own for **your plugin on this install**, held in the Android
Keystore, created on first use and never synced or backed up) the UTF-8 bytes of:

```
"kino-identity-v2\n" + yourPluginId + "\n" + challenge + "\n" + author + "\n" + codeHash
```

| Field | What it is |
| --- | --- |
| `deviceKey` | The public key (X.509 SubjectPublicKeyInfo DER), base64url without padding. |
| `signature` | The DER signature, base64url without padding. |
| `author` | The fingerprint of the author key Kino verified and pinned when your signed plugin was installed (for example `07DA-B67F-2ACF-B4D3`), or `""` for an unsigned plugin. |
| `codeHash` | The lowercase hex SHA-256 of the entry file Kino runs (the runtime refuses a script whose bytes differ). |

`author` and `codeHash` come from Kino's record of the installed plugin, **never from your code**. So your server can:

1. issue a one-use `challenge`;
2. verify the `token` with the bot's public key;
3. verify the `signature` with `deviceKey` over the bytes above;
4. **require its own fingerprint in `author`** (and, if it wants, a known `codeHash`): a modified copy of your plugin cannot
   log in;
5. bind the session to `deviceKey` and refuse a replayed token.

Keys are per plugin, so two plugins cannot match the person by key. A reinstall makes a new key.

## When you can call it { #when }

Only inside a call **the person started**: what a `screen`, a `screenEvent` or a `panelAction` runs. Never from a screen
timer's tick, a [background job](jobs-and-shared.md#jobs), Home, search, play or sync. At most **10 calls a minute** per
plugin.

## Errors { #errors }

`kino.identity.telegram` rejects with an error carrying one of these `code`s:

| `code` | When |
| --- | --- |
| `permission_denied` | The person did not approve it or switched it off, the plugin is disabled, the owner's switch, the call is not one of the allowed ones, or the plugin is not signed with Kino's key. |
| `not_available` | This device holds no token (the person must validate again in Kino) or the key could not sign. |
| `rate_limited` | More than 10 calls in a minute. |
| `bad_request` | Options that are not an object, an unknown key or a `challenge` that does not match the pattern. |

Detect it with `typeof kino.identity === "object"` and **still** catch the errors. Always keep another way in without it (or
say what is missing): the person can switch it off whenever they want.

## Consent { #consent }

The person reads, **in red**, on the install sheet and on the update that adds it (Kino never approves it on its own; in a kit
import it comes unticked):

- «Podrá saber tu usuario de Telegram y enviarlo a sus servicios» ("Can know your Telegram user and send it to its
  services").

And in your plugin's tab in Ajustes there is a switch, for the whole device and their synced devices: «Dejar que sepa mi
usuario de Telegram» ("Let it know my Telegram user").

## Testing with the kit { #kit }

The kit answers with a fake account:

| Variable | What it does |
| --- | --- |
| `KINO_IDENTITY_TG=<id\|none>` | The fake Telegram account id; `none` simulates a device without a token (`not_available`). |
| `KINO_IDENTITY_TOKEN=<text>` | The token it returns. |
| `KINO_IDENTITY_AUTHOR=<fingerprint>` | The `author` it attests (empty by default: the kit verifies no author signature). |
| `KINO_IDENTITY_REVOKED=1` | The person switched it off (`permission_denied`). |

```
KINO_IDENTITY_TG=401234567 node sdk/run.mjs --device phone . screenEvent open
```

The kit applies the same gates as the app (the capability, the call being the person's, `bad_request`, 10 a minute) but
**not** the Kino author-key rule: in the kit it answers any plugin, so try it in the app, with a signed plugin, before you
depend on it.

The contract is in `contract.json` (`kinoIdentity`) and the types in `kino.d.ts`.

## Worked example: Kino Social { #example }

**Kino Social** (a Kino experiment: a feed to tell what you watch) is a screen plugin that logs in like this, asking for
nothing. It has a server of its own (the plugin holds no key: Kino signs everything):

```js
// 1. When the person opens the screen: the server's one-use challenge
const { challenge } = await post("/session/challenge", {});
// 2. Kino signs the challenge with this device's key and attests who is asking
const who = await kino.identity.telegram({ challenge });
// 3. The server verifies token, signature, author fingerprint and code hash, and answers with its own session
const body = await post("/session", {
  token: who.token, challenge, deviceKey: who.deviceKey, signature: who.signature,
  author: who.author || "", codeHash: who.codeHash || "",
});
kino.storage.set("session", body.session, { ttlMs: SESSION_TTL_MS }); // the session is the server's, not the token
```

If `kino.identity` does not exist or the call fails, the screen says it cannot sign in instead of breaking. The session is
the server's: the Telegram token is neither stored nor sent again.
