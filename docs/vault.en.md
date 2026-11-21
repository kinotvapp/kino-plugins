# Vault: the plugin's own secret { #vault }

!!! note "Available with Kino 0.9.90"
    `vault` is `apiVersion` 28 and arrives with Kino 0.9.90. An older version
    refuses these plugins with "This plugin needs a newer version of Kino".

`vault` lets your plugin read its **own sealed secret** from the Kino secrets vault. It is a **declarative** capability (you
export nothing new), it **requires [`identity`](identity.en.md)** and never stands alone. The idea: your plugin's secret
config (an API base, request‑signing keys, a token) lives in the vault, **not in the code**.

```json
"capabilities": ["screen", "identity", "vault"]
```

## The call { #call }

```js
const secret = await kino.vault.get();   // no arguments; returns the JSON you registered for your plugin
```

Kino runs the **whole exchange from the inside**: it proves who the person is on Telegram and attests which signed plugin is
asking (the same machinery as [`identity`](identity.en.md): the per‑plugin pseudonym, the device‑key signature, your author
fingerprint and `codeHash`, and — for a `tokenAuthors` author — the gate token, with which the vault verifies group
membership **live**), and reads the secret the vault resolves for your `(pluginId, author)`.

**You never see the vault's address, the challenge, nor the `pluginId`/`author` it resolves by:** Kino fills them from its own
install record, so a plugin can only ever read **ITS OWN** secret, and a copy re‑signed with a different key resolves a
different (missing) scope. There is no hardcoded fallback: a non‑member, or a re‑signed copy, gets nothing; and **rotating**
the secret in the vault kills copies that cached an old one.

Because the read is gated by who the person is exactly as `identity` is, `vault` **rides on `identity`'s consent and adds no
approval of its own** — declare both capabilities; Kino even turns identity's switch on for the person on a screen call they
started, so there is nothing extra to approve. Your plugin does not declare the vault's host either: Kino makes the request, not you.

## When, and the errors { #errors }

Only inside a call the person started from `screen`, `screenEvent` or `panelAction` (never a timer tick, a job, Home or
search), 6 a minute. It rejects with:

- `permission_denied` — not approved, or the call isn't an allowed one.
- `not_member` — the person isn't in the Kino group, or the copy's scope doesn't match.
- `not_found` — no secret is registered for your plugin yet.
- `rate_limited` / `unavailable` / `not_available` — transient (no Telegram validation on this device, or the vault couldn't be reached).

**Cache the secret yourself** (in `kino.storage`, ~1 h): each `get()` is a server round trip plus a live membership check.

## A real‑life example { #example }

[**`kinotvapp/kino-plugin-vault-demo`**](https://github.com/kinotvapp/kino-plugin-vault-demo) — the smallest plugin that reads
its secret with `kino.vault.get()` and greets the person with `kino.identity`, handling every error state. One hand‑written,
heavily commented `plugin.js`. See also the [example plugins](examples.en.md).
