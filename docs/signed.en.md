# Signed plugins { #signed }

A **signed plugin** carries your signature: a mark that only you can make, because it comes from a
private key that only you have. Kino checks that mark before it installs your plugin and on every
update. Signing is **optional**, it needs **Kino 0.9.45 or newer** and **`"apiVersion": 5` or higher** (6 works too, Kino 0.9.50), and
it changes nothing for plugins that don't use it.

!!! info "In one sentence"
    Your code stays plain, readable JavaScript. The signature only proves that this exact code comes
    from you, and that nobody swapped it on the way.

## What it is, in plain words { #what }

Think of a wax seal on a letter. You make a **key pair** once:

- a **private key**, a small file (`kino-author-key.pem`) that stays on your computer and that you
  never share, and
- a **public key**, written inside your `kino-plugin.json` (`authorKey`), which anyone can read.

Every time you publish, you run one command. It reads your `plugin.js` and writes a **signature**
(`value`) into `kino-plugin.json`. Kino uses the public key to check that the signature really was
made by the private key, over exactly that code. If one byte of `plugin.js` is different, the check
fails and the plugin does not install.

**Signing is not obfuscation.** Nothing is hidden or encrypted: anyone can still read your
`plugin.js`. For keys and tokens keep using [sealed secrets](test-locally.md#secrets).

## Why it matters { #why }

- **People know who it comes from, and that it was not altered.** When someone installs your plugin,
  the consent screen says **"Firmado por su autor"**. The catalog and community cards show a
  **"Firmado"** pill (an installed card says "Activo · Firmado"), and the plugin's details show
  **"Clave del autor: ABCD-EF01-2345-6789"** (phone: Gestionar; TV: the installed plugin's actions).
- **Trust on first use: Kino remembers your key.** The first time someone installs your plugin,
  Kino pins your author key. From then on **every update must be signed with the same key**. An
  update signed with another key, or no longer signed, is refused. That protects your users if
  someone takes over your GitHub account or repository and tries to ship different code: without
  your private key their update does not install.
- **It is optional and backward compatible.** Unsigned plugins keep working, on every apiVersion.
  A signed one simply earns more trust. An unsigned plugin that becomes signed asks the person to
  approve the update again.

What it does **not** do: it does not make the *first* install trustworthy, it does not protect you
if your private key leaks, and it does not hide your code.

## How to sign, step by step { #how }

You need the Node kit that comes with the example plugins (the `sdk/` folder). If you started from
[an example](examples.md) you already have it.

1. **Make your key, once.** From your plugin's folder:

    ```bash
    node sdk/seal.mjs --keygen
    ```

    It writes `kino-author-key.pem` (readable only by you) and prints its fingerprint. If the file
    already exists it refuses to overwrite it.

2. **Keep the key out of git.** Add `*.pem` to your `.gitignore` **before** your next commit. The
   scaffold's `.gitignore` covers the kit's local files but not `*.pem`, and `--keygen` does not
   edit it. See [the key](#key) below.

3. **Set the apiVersion.** In `kino-plugin.json`:

    ```json
    "apiVersion": 5,
    "entry": "plugin.js"
    ```

4. **Sign.** After the last change to `plugin.js` and to `version`:

    ```bash
    node sdk/seal.mjs --sign --repo owner/repo
    ```

    It writes `"signature": { "authorKey": "<64 hex>", "value": "<128 hex>" }` into
    `kino-plugin.json`. For a plugin in a folder of the repo use `--repo owner/repo/folder`. The
    options `--manifest` and `--key` change which manifest and key file it uses (defaults:
    `kino-plugin.json`, `kino-author-key.pem`).

5. **Check.**

    ```bash
    node sdk/validate.mjs . --repo owner/repo
    ```

    It verifies the signature, the exports, and that no `*.pem` is tracked by git. Without
    `--repo` it reads the repository from the folder's GitHub `origin`.

6. **Commit and push** `plugin.js` and `kino-plugin.json` (never the `.pem`).

### What the signature covers, and why you must sign again { #covers }

The signature is made over this text:

```
kino-signed-entry:v1
<owner/repo[/folder], lowercase>
<id>
<version>
<sha256 of plugin.js>
```

So it covers your **exact `plugin.js`**, the **repository** (and folder), the plugin **`id`** and
the **`version`**. Two consequences:

- **Sign again after any change** to `plugin.js` or to `version`, even a comment or a space.
  `validate.mjs` fails until you do.
- The signature cannot be copied onto another repository, another plugin or another version.

The branch or tag is *not* part of it: a signed plugin installs from any branch or tag.

Kino checks the signature **when installing and updating**, never while the plugin runs, so it
costs nothing at runtime. Kino 0.9.44 and older refuse an `apiVersion` 5 manifest ("Este plugin
necesita una versión más nueva de Kino"). Below apiVersion 5 a `signature` field is ignored.

### The same plugin at two addresses { #two-addresses }

A plugin is normally known by the exact address it was installed from: the same `id` from another repo
is another plugin (a second install of that `id` is refused with "Ya hay un plugin con ese id"). A
signed plugin is the exception (Kino 0.9.50): when the person has your plugin from one repo on their
phone and from another repo on their TV, both installs are **the same plugin** when they have the same
`id` and both pinned the **same author key**. Then switching it on or off, the approved hosts, the
settings and passwords (still sealed end to end, per setting), and an uninstall sync between those
devices both ways, exactly as for one address. Each device keeps the address it installed from and
keeps updating from it; nothing is moved.

- An unsigned install on either side, or another key, keeps the exact-address rule: never merged, and
  neither ever receives the other's settings or passwords.
- Your manifest's own sealed `secrets` are bound to each repo and never travel between devices, so sign
  and seal each repo's manifest for that repo.
- If you publish the same plugin at two addresses (a move, a mirror), sign both with the same key.
- In the recommended list, an entry that names your key (`"signed": true, "authorKey": "<64 hex>"`)
  shows "Instalado" for someone who already has your plugin from your other repo; any other plugin with
  that `id` installed here makes the entry say "Ya tienes otro plugin con ese id" ("No disponible",
  nothing to install).

## Keeping your private key safe { #key }

- **Never commit it, never share it.** Put `*.pem` in `.gitignore`. The kit's `validate.mjs` fails
  if a `.pem` file is tracked by git. If one ever leaks, treat the key as lost (below) and make a
  new one.
- **Back it up** somewhere private (a password manager, an encrypted drive). The kit writes the key
  into the folder you run it from (`kino-author-key.pem` by default); that file exists only on your
  computer.
- **There is no recovery.** Kino keeps no copy and nobody can regenerate it. `--keygen` refuses to
  overwrite an existing file, and a new key is a different identity.

### If you lose the key, or change it { #lost }

Kino pinned the old key at each person's first install, so **a plugin signed with a new key is
refused for everyone who already has it installed**: they see *"Esta versión está firmada con otra
clave de autor, así que no se instala. Si confías en el cambio, desinstala el plugin y vuelve a
instalarlo."* The only way through is for each person to **uninstall your plugin and install it
again**, which pins the new key. New installs are not affected.

An update that **drops the signature** is refused the same way (*"Esta versión ya no está firmada por
su autor..."*), also until the person reinstalls. So once you sign, keep signing every version.

!!! warning "Not documented upstream"
    Kino's documentation does not describe any other recovery path (for example rotating the key
    without a reinstall). Plan as if there is none.

## When something fails { #troubleshooting }

| Message | What it means and what to do |
| --- | --- |
| `El campo "signature" debe ser { "authorKey": 64 caracteres hex, "value": 128 caracteres hex } (node sdk/seal.mjs --sign)` | The `signature` field is malformed: it must have exactly `authorKey` (64 hex characters) and `value` (128 hex characters). Don't write it by hand: run `node sdk/seal.mjs --sign --repo owner/repo`. |
| `La firma del autor no es válida: el código no es el que firmó, o no es para este repositorio, este plugin o esta versión` | The signature does not match. Either `plugin.js` changed after you signed, or the `id` or `version` changed, or you signed for another repository (wrong `--repo`). Sign again with the right `--repo`; check with `validate.mjs`. |
| `Esta versión está firmada con otra clave de autor, así que no se instala. Si confías en el cambio, desinstala el plugin y vuelve a instalarlo.` | Shown to a person who has your plugin installed when an update carries a different key than the pinned one. Use the original key; if it is lost, they must reinstall ([above](#lost)). |
| `Esta versión ya no está firmada por su autor, así que no se instala. Si confías en el cambio, desinstala el plugin y vuelve a instalarlo.` | An update came without a signature although the installed version had one. Sign every version. |
| `Este plugin necesita una versión más nueva de Kino` | The person's Kino is older than 0.9.45 and your manifest says `"apiVersion": 5`. |
| `<file> is tracked by git: anyone can read your author key on GitHub...` (kit) | A `.pem` is committed. `git rm --cached <file>`, add `*.pem` to `.gitignore`, and since it leaked, make a new key (everyone reinstalls). |
| `<manifest> needs "apiVersion": 5 or newer to carry a signature` (kit) | `--sign` needs `"apiVersion": 5` in the manifest first. |
| `no author key at kino-author-key.pem: create one once with node sdk/seal.mjs --keygen` (kit) | You haven't made the key yet (or `--key` points at the wrong file). |

See also: [the manifest's `signature` field](manifest.md#signature), [publishing](publish.md#checklist)
and [building with an AI](ai.md).
