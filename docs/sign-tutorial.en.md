# Sign your plugin, step by step { #sign-tutorial }

This tutorial takes you from an unsigned plugin to a **signed, published** one, and then through
every update. To understand first what a signature is and what it protects, read
[Signed plugins](signed.md); here are only the steps.

!!! info "What you will get"
    Whoever installs your plugin sees **"Firmado por su autor"** on the install sheet, and Kino
    refuses any update that does not come from your key, even if someone gets into your GitHub
    account.

## Before you start { #before }

You need:

- **Node.js 18 or newer** (`node --version`).
- **The `sdk/` kit** inside the plugin's folder. If you created your repository from
  [an example](examples.md) with "Use this template", you already have it.
- Your plugin in a **public GitHub repository**. The signature is bound to that repository: it only
  counts when the plugin is installed from there, not from a manifest URL on another server.
- **Kino 0.9.45 or newer** on the devices of the people who install it.

In the commands below, replace `your-user/your-plugin` with your repository.

## Step 1: create your key (once) { #step-key }

The key is yours for good: you will use it for every version of this plugin. Create it **outside the
repository**, in a private folder:

```bash
mkdir -p ~/.config/kino && chmod 700 ~/.config/kino
cd ~/.config/kino
node /path/to/your-plugin/sdk/seal.mjs --keygen
chmod 600 kino-author-key.pem
```

The command writes `kino-author-key.pem` and prints its **fingerprint**, something like
`07DA-B67F-2ACF-B4D3`. Note it down: it is what Kino shows in your plugin's details.

!!! warning "Back it up now"
    Keep `kino-author-key.pem` in a password manager or on an encrypted disk. **There is no way to
    recover it**: if you lose it, Kino refuses your updates and everyone has to uninstall your plugin
    and install it again ([what happens](signed.md#lost)).

    Use a new key just for this: do not reuse your GitHub SSH key or any other.

## Step 2: protect the repository { #step-gitignore }

Even though the key lives outside the repository, add `*.pem` to `.gitignore` in case you ever copy
it there by mistake:

```bash
cd /path/to/your-plugin
echo '*.pem' >> .gitignore
```

The kit protects you too: `validate.mjs` fails when a `.pem` file is tracked by git.

## Step 3: raise the apiVersion { #step-api }

A signature needs **`"apiVersion": 5` or newer** in `kino-plugin.json`. If your plugin already uses
6, 7 or 8, leave it:

```json
"apiVersion": 8,
"entry": "plugin.js"
```

## Step 4: sign { #step-sign }

Always **after** the last change to `plugin.js` and to `version`:

```bash
node sdk/seal.mjs --sign --repo your-user/your-plugin --key ~/.config/kino/kino-author-key.pem
```

The command writes into your `kino-plugin.json`:

```json
"signature": { "authorKey": "<64 hex characters>", "value": "<128 hex characters>" }
```

- `authorKey` is your **public** key: it is fine for it to be visible.
- If your plugin lives in a folder of the repository, use `--repo your-user/your-repo/folder`.
- Do not edit `signature` by hand.

## Step 5: check { #step-check }

```bash
node sdk/validate.mjs . --repo your-user/your-plugin
```

It must end in `✓ Kino would accept this plugin` and print `Clave del autor: XXXX-XXXX-XXXX-XXXX`
with the fingerprint from step 1. If it says the signature is not valid, see
[When something fails](signed.md#troubleshooting).

## Step 6: publish { #step-publish }

Push `kino-plugin.json` (with the signature) and `plugin.js`. A tag lets people pin a version:

```bash
git add kino-plugin.json plugin.js .gitignore
git commit -m "Signed release 1.0.0"
git tag v1.0.0
git push origin main v1.0.0
```

GitHub takes up to about five minutes to serve the new files.

## Step 7: check it in Kino { #step-kino }

1. In Kino, **Plugins ▸ Agregar plugin**, type `your-user/your-plugin`.
2. The install sheet must say **"Firmado por su autor"**.
3. After installing, the plugin's details (phone: Gestionar; TV: the plugin's actions) show
   **"Clave del autor"** with your fingerprint.

From that first install on, Kino remembers your key for that person.

## Every update { #updates }

Always repeat these four steps, in this order:

1. Make your changes to `plugin.js`.
2. **Raise `version`** in `kino-plugin.json` (for example `1.0.0` → `1.0.1`). Without it, nobody gets
   the update.
3. **Sign again** with the same key ([step 4](#step-sign)) and check ([step 5](#step-check)).
4. Commit, tag and push ([step 6](#step-publish)).

The signature covers your exact `plugin.js`, the `id`, the `version` and the repository: changing a
single byte, even a comment, breaks it. If you only change the README or the screenshots, there is no
need to sign again.

!!! tip "Once you sign, always sign"
    An update that is **unsigned** or signed with **another key** is refused for everyone who already
    has your plugin. If your plugin was published unsigned and you start signing it, Kino asks each
    person to approve that update once.

## Quick checklist { #checklist }

- [ ] The key is outside the repository and backed up.
- [ ] `*.pem` is in `.gitignore`.
- [ ] `"apiVersion"` is 5 or newer.
- [ ] You signed **after** the last change to `plugin.js` and `version`.
- [ ] `validate.mjs --repo …` says `✓` and prints your fingerprint.
- [ ] Kino's install sheet says "Firmado por su autor".

## A real example { #example }

[Internet Archive Audio](https://github.com/kinotvapp/kino-plugin-archive-audio) is signed this way
(fingerprint `07DA-B67F-2ACF-B4D3`): see the `signature` block of its `kino-plugin.json`.

See also: [Signed plugins](signed.md) (what the signature protects, how to look after the key, error
messages), [the manifest's `signature` field](manifest.md#signature) and [Publishing](publish.md).
