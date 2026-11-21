# Secrets vault: store a secret for your plugin { #secrets-vault }

!!! note "Hosted Kino service"
    The vault lives at **`secrets.kinoverse.app`** and builds on [Identity](identity.md) with a challenge
    (`apiVersion` 15; the attestation for authors that are not Kino arrives with Kino 0.9.88). You need no
    server of your own: you store a JSON from a web panel and your plugin reads it at runtime.

The vault keeps **one JSON secret per repository** —an API key, a config `recipe`, whatever your plugin needs to talk to its
source— **without it living in the public repository**. Only people who are in the Kino group get it; anyone else does not. The
secret is stored **encrypted**, and the only one who sees it in the clear is your plugin, on a member's device, at the moment of
use.

It helps when your plugin needs a value you do not want to publish (and that a copy should not be able to reuse), but you do
not want —or cannot— run a server. If you already have your own server, you do not need it: do the [Identity](identity.md) flow
yourself.

!!! warning "Moderate secrets, not critical"
    The vault stops people who are not members and copies re-signed with another key, but **not** a determined forger (see
    [What it protects and what it doesn't](#trust)). Keep **moderate** secrets in it —better than leaving them in the public
    `plugin.js`— not keys that, leaked, do serious harm.

## 1. Store the secret (the panel) { #store }

Go to **<https://secrets.kinoverse.app>** with your GitHub account. You will see your repositories with the `kino-plugin`
topic that you **own or admin**; you pick one, paste the JSON and save it.

For a repository to show up and be storable, it needs:

- to be **public** and have the **`kino-plugin`** topic (the panel signs in with the `public_repo` scope, so a private
  repository cannot be read to store);
- a **signed `kino-plugin.json`** on the default branch. From it the vault takes the secret's **scope**: the manifest's `id`
  (the `pluginId`) and the author key's fingerprint (`author`), which your plugin will present when it reads.

When you save, the panel shows the two URLs your plugin uses (with a button to copy them):

```
Secret     https://secrets.kinoverse.app/secrets/<owner>/<repo>
Challenge  https://secrets.kinoverse.app/session/challenge
```

The secret is stored **encrypted** (never in the clear in the database or the repository). To **rotate** it, edit it in the
panel: the next read returns the new value (see [Rotation](#rotation)).

## 2. Read it from your plugin (with a challenge) { #read }

The read is the same pattern as [Identity with a challenge](identity.md#challenge), but against the vault: your plugin asks for
a challenge, lets Kino sign and attest who is asking, and the vault returns the secret **only if the person is in the group**.

!!! tip "Send the `token` if your plugin is by a trusted author"
    If your plugin is signed with a [`tokenAuthors`](identity.md) key (e.g. E04E), `kino.identity` gives you a bot-signed
    `token`. **Include it in the body** (`token: who.token`): with it the vault reads your real Telegram id and checks your
    membership **live**, so **any** group member can read. Without the token the vault falls back to a partial check (it only
    recognises members it already knows), and a real member may get `403`.

```js
const VAULT = "https://secrets.kinoverse.app";
const REPO = "<owner>/<repo>";          // where you stored the secret
const PLUGIN_ID = "<your kino-plugin.json id>";

async function getRecipe() {
  const cached = kino.storage.get("recipe");
  if (cached) return cached;                       // cache it: every read spends quota (below)

  // 1. A one-use challenge from the vault (no session, no token)
  const { challenge } = await post(VAULT + "/session/challenge", {});
  // 2. Kino signs the challenge with this device's key and attests who is asking
  const who = await kino.identity.telegram({ challenge });
  // 3. The vault verifies signature + author fingerprint + membership, and returns the secret
  const { secret } = await post(VAULT + "/secrets/" + REPO, {
    pluginId: PLUGIN_ID,
    challenge,
    id: who.id,
    deviceKey: who.deviceKey,
    signature: who.signature,
    author: who.author || "",
    codeHash: who.codeHash || "",
    token: who.token,          // recommended (trusted author): the vault then checks your membership live
  });

  kino.storage.set("recipe", secret, { ttlMs: 60 * 60 * 1000 });  // ~1 h
  return secret;
}
```

`id`, `deviceKey`, `signature`, `author` and `codeHash` come straight from
[`kino.identity.telegram`](identity.md#challenge): you do not compute them. You only add the `pluginId` (your manifest's `id`)
and the `challenge`.

The body of `POST /secrets/<owner>/<repo>`:

| Field | What it is |
| --- | --- |
| `pluginId` | The `id` of your `kino-plugin.json`. Must be the one you registered when you stored it. |
| `challenge` | The one-use nonce `POST /session/challenge` gave you. |
| `id` | The person's [pseudonym](identity.md#call) for your plugin (`who.id`). |
| `deviceKey` | The device's public key (`who.deviceKey`). |
| `signature` | The signature over the challenge (`who.signature`). |
| `author` | The fingerprint of the author key you signed the plugin with (`who.author`). It must match the one in the manifest you stored, and cannot be empty: an **unsigned** plugin cannot read. |
| `codeHash` | The code hash (`who.codeHash`). Advisory in this version; sign over it anyway, but it is not required. |
| `token` | **Recommended.** The `kino.identity` token (trusted authors, like E04E, get it). With it the vault reads your real Telegram id and checks your membership **live** → works for **any** group member. Without it, the vault only recognises members who already did a token login (partial coverage), and a real member may get `403`. |

Response **`200`**: `{ "secret": <your JSON> }` —exactly what you stored in the panel.

## 3. When you can read it, and the quota { #limits }

- **Only inside a call the person started** (what a `screen`, a `screenEvent` or a `panelAction` runs), because
  `kino.identity` only answers there. Never from a timer, Home, search, play or a background job. See
  [When you can call it](identity.md#when).
- **120 reads an hour per person.** More, and the vault answers `429`. Every read spends a challenge and a quota hit, so
  **cache** (in the example, `kino.storage` with a ~1 h TTL) and read once per session, not on every request.
- Always keep a way out if it fails: the person can switch identity off whenever they want, or not be a member. **Do not keep a
  burned-in secret in the code as a fallback** (that breaks the anti-copy); show that access is missing.

## 4. Rotation { #rotation }

The secret is stored with an *upsert*: when you edit it in the panel, **the next read returns the new value** (server-side it is
immediate; plugin-side your cache bounds it). Rotating is just editing the panel. It is the strongest anti-copy lever: if you
rotate the value, any copy that burned it in goes stale.

## 5. What it protects and what it doesn't { #trust }

The `author` and the `pluginId` in the scope make it so that:

- a copy **re-signed with another key** presents a different `author` fingerprint → it does not match the stored one → `403`;
- someone who **is not in the group** → `403`.

But `author` and `pluginId` are **public** (they are in your public `kino-plugin.json`), and the signature is over the
`deviceKey` the device generates (with no root that ties it to the author). A **determined forger** who copies your public
`author` and `pluginId` **and** knows a real member's Telegram id can read. So:

- keep only **moderate** secrets (better than the public `plugin.js`, not critical keys);
- **do not put a burned-in fallback** in the code;
- **rotate** the secret when needed.

What it does give you, together: it stops scrapers and non-members, it stops honest re-signed forks, and rotation kills copies
that burned in the value.

## 6. Errors { #errors }

| Code | When |
| --- | --- |
| `200` | Member and everything valid. `{ "secret": … }`. |
| `404` | No secret stored for that `owner/repo` yet. |
| `403` | The person is not in the group, or the challenge/signature are not valid, or the `author`/`pluginId` do not match the stored scope. |
| `429` | More than 120 reads in an hour for that person. Back off and use your cache. |
| `503` | The vault could not decrypt (an operations problem). Retry later. |

Always detect `typeof kino.identity === "object"` and catch the errors: the read can fail because the person switched identity
off, is not a member, or the vault is rotating. Never break the screen over it.

## Summary { #checklist }

- [ ] Your plugin declares `apiVersion` 15 and the `identity` capability, and is **signed** (Kino 0.9.88 or newer so an author
      that is not Kino gets the attestation).
- [ ] The repository is **public**, with the `kino-plugin` topic and a **signed** `kino-plugin.json`.
- [ ] You stored the JSON at **<https://secrets.kinoverse.app>** (owner/admin of the repo).
- [ ] Your plugin reads with the flow above, **caches** (~1 h) and has **no** burned-in fallback.
