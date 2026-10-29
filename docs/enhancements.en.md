# Screens and newer features without raising your apiVersion { #enhancements-page }

!!! note "Available with Kino 0.9.74"
    Available with Kino 0.9.74 (the next version, not published yet). Only Kino 0.9.74 or later reads the
    `enhancements` block; an older Kino **ignores it**, like any key it does not know, and keeps installing and running
    your plugin as always: it never refuses it because of this block.

A plugin that raises its `apiVersion` to 14 is refused by every older Kino («Este plugin necesita una versión más nueva de
Kino»). To keep those people, leave your `apiVersion` as it is and offer [screens](screens.md) and the other apiVersion 14
features in an optional block only a newer Kino reads.

## The `enhancements` block { #enhancements }

```json
"apiVersion": 8,
"capabilities": ["search", "home", "resolve"],
"enhancements": { "14": { "capabilities": ["screen", "library"], "screen": { "label": "Inicio", "menuOpens": "both" } } }
```

An older Kino ignores the key and never calls `screen`/`screenEvent` (the JS stays one file); this Kino merges the block and
checks it with apiVersion 14's rules. A block that fails is dropped and logged, **never a refusal**.

Another example, with a background job:

```json
"apiVersion": 8,
"enhancements": { "14": {
  "capabilities": ["screen", "schedule", "shared"],
  "screen": { "label": "Mi plugin", "opensFrom": ["settings"] },
  "jobs": [{ "id": "refresh", "label": { "es": "Actualizar", "en": "Refresh" }, "everyMin": 180, "everyOptions": [60, 180, 360] }]
} }
```

### How Kino reads it { #merge }

- **The keys** are the `apiVersion` that brought the feature: today, `"14"`. A Kino that knows the key merges its block
  over the manifest, keys in numeric order. A key above that Kino's apiVersion is ignored.
- **`capabilities` are added.** Only `screen`, `library`, `playerPanelTab`, `playerControl`, `room`, `schedule`, `shared`
  and `ai` can be added this way.
- **`screen`, `settings` (the whole list), `panel` and `jobs` replace** the manifest's. `playerPanelTab` and a `panel` with
  `"contributes": true` come together in one block, and so do `schedule` and its `jobs` (each needs the other). Only a
  block brings `jobs`: a top-level `jobs` below apiVersion 14 is never read.
- Then **everything is checked at that apiVersion**, with the very same rules as the plain fields:
  [`screen`](screens.md#manifest), [`jobs`](jobs-and-shared.md#jobs-manifest), [`panel`](player-panel.md#contributed-tab),
  the [capabilities](screens.md#consent).
- **Your `apiVersion` never moves**, so nothing else changes behaviour.

### When a block is dropped { #dropped }

Your plugin is **never refused** because of an `enhancements` block. The block is dropped (with a log line) and the plugin
runs as its own manifest says when:

- it fails those rules (a bad screen, a capability that cannot be added, any other field);
- its key is at or below your own `apiVersion` (declare each feature once);
- its `settings` change the type of a setting your manifest declares (keep the list a superset of yours: values sync by key
  with devices on an older Kino);
- its `screen.replaces` names Categorías and your own apiVersion lacks them (below 6);
- your script lacks an export the block newly needs (`screen`/`screenEvent`, `job`, or `settingsStatus`/`action` for such
  settings). Kino checks it at install and at every start;
- a job with [`enabledBy`](jobs-and-shared.md#enabled-by) does not name one of your `toggle` settings.

`node sdk/validate.mjs` reports every block Kino would drop as a problem.

### Consent { #consent }

It is a plain manifest's. The red lines of `library`, `playerPanelTab`, `playerControl`, `room`, `schedule` and `ai` are
asked at install and on the update that adds them (shown first and open, [below](#updates)), never approved by Kino on its
own, and unticked in a kit import; `shared` is a plain line.

Their features follow the block: your jobs run, and `kino.shared` and `kino.ai` exist, only on a Kino that read it.
`kino.library` exists on every apiVersion 14 Kino, but until the person approves the line its calls reject with
`permission_denied`: someone who installed your plugin on an older Kino and then updated Kino is asked only with **your
next version**. So `typeof kino.library === "object"` is not enough: catch the refusal and work without it.

On an older Kino none of it exists: keep the work your plugin does without background jobs where it already is.

### A `settings` list in a block { #settings-in-block }

A `settings` list inside a block is read at the block's apiVersion: its English texts (`labelEn`, `hintEn`, `confirmEn`),
`devices`, `linkOnly`, `help`, `link` and `qr` items, `"sync": false` and `unlockWith` all apply on a Kino that read the
block, and are ignored on an older one, which reads your base list. So:

- Keep every key of the base list with its type (else the block is dropped: `settingRetyped`) and its `sync`
  (`"settings" changes "sync" of the setting "<key>"`, also dropped: a value that syncs on one Kino and stays on the device
  on another would differ between the person's devices). A NEW key may say `"sync": false`.
- The two runtime features that depend on what the list may declare follow the list too: a `settingsStatus` answer's
  `hide` and an action's `setSettings` filling a `password` (both from apiVersion 13) are read at the block's apiVersion
  when the block replaced `settings`, and at your own apiVersion otherwise (a block that only adds a screen changes nothing
  for them).
- `setSettings` still fills only a `password` the list in effect declares, still refuses the whole field for an undeclared
  key or another type, never moves an `unlockWith` setting off its default, and the form saves the value as a typed one
  (sealed, never shown back, device-only with `"sync": false`).
- What else reads your own apiVersion stays so on purpose: the sealed `secrets` limit, the cipher key rules, Categorías,
  and every feature outside `settings`.

See also [the settings form](settings-form.md).

## Updates: new consents come first { #updates }

When an update of your plugin adds a red line (one of the capabilities above, `"fetchHosts": "any"`, `browser`,
`tracking`...) or a new host, Kino's update sheet shows it **first and open**, under «Nuevo en esta actualización»:

- By severity: any-host first, then the other capabilities, one grouped line for new insecure hosts, then the new hosts.
- Each line is a D-pad stop on the TV, with a «Hay más abajo» cue.
- What the person already approved stays behind «Ver detalles».

So one tap never approves something unseen. The update waits for the person; a plain line (`shared`) does not hold it back.
On a first install everything stays behind «Ver detalles», as before.

Describe in your release notes why you need the new reach. See also [What people see](what-people-see.md) and
[Publish](publish.md).
