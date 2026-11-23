# Test it like the app (real render)

The Node kit checks your plugin with Kino's rules and runs its functions, but it **does not draw it**: `run.mjs . screen`
prints the tree Kino would resolve, not what the person sees. That is what **`kino-parity`** is for: a companion to the
kit that puts your plugin in front of the same renderer the app carries inside and drives it — it opens the screen,
taps by `key`, types, goes back and records what changed on every frame.

The kit stays dependency-free: the companion is **another repository** that clones the kit inside itself and works
with it, without touching a line of `sdk/`.

## What it lets you see

| With the kit | With the companion |
|---|---|
| the validated tree (`run.mjs . screen`) | the screen **drawn** by the APK's renderer |
| one `screenEvent` at a time | a **session**: open → tap → frame → type → frame → back |
| a fake `kino.fetch` or `--record` | **real network** with `--net live`, recorded into `cassette.json` and replayable offline with `--net cassette` |
| nothing compared between versions | **goldens** of tree, text, HTML and pixels, plus `diff` between two runs |
| no screenshots, no report | **one folder per step**: `screen.txt`, `root.html`, `shot.png`, `report.md` |

Whatever the renderer does not know shows up in `unsupported()`: a valid tree can still draw wrong, lose nodes or break
focus, and that is exactly what the kit cannot see.

What the table does not include, because it **needs a device or data work**: the comparison with the app's Kotlin resolver
(it needs the app's repository), the contrast with the phone (`device`, which needs `adb` and a connected device) and the
corpus for the catalog plugins, added one at a time and reviewed by hand. Pixel goldens need a browser that starts;
without one it compares tree, text and HTML, and the step says so instead of pretending it passed.

## Install

You need **Node 22 or newer** and `git`. Chromium is optional (see [levels](#levels-testing-without-a-browser)).

```bash
git clone https://github.com/kinotvapp/kino-parity
cd kino-parity
npm ci                    # jsdom; playwright-core, pixelmatch and pngjs are optional
npx kino-parity setup     # clones the kit into vendor/, verifies it and checks it starts
npx kino-parity doctor    # what is installed and how far you can go (N0/N1/N2)
```

`setup` leaves the kit **pinned by commit**: `compat.json` holds the commit, the contract's `apiVersion` and a hash of
the `sdk/` tree, and `setup` refuses to run against another kit. If the clone does not match, it replaces it whole; if
the smoke test afterwards fails, it **restores the previous one** and exits with code 3. It never runs `git pull` inside
`vendor/` and never runs `npm install` in the kit.

```bash
npx kino-parity setup --frozen      # CI: fails if anything does not match, touches nothing
npx kino-parity setup --try-latest  # tries the kit's main without moving the pin
npx kino-parity setup --self-update # updates the companion and re-pins both
```

## The APK as the oracle

The renderer and the built-in plugin come from the published APK, not from a copy:

```bash
npx kino-parity apk --file kino.apk --update   # extracts assets/web and pins its sha256 in oracle.lock.json
npx kino-parity apk --file kino.apk --verify   # fails if the APK is not the one in the lock
```

A new APK is a PR that updates the lock and the goldens together, reviewed by hand: a change in the app never sneaks in
as "the test was wrong".

## Driving a screen

```bash
npx kino-parity open  --plugin ../my-plugin --device tv --size compact --out runs/my-plugin
npx kino-parity digest --run runs/my-plugin        # the screen as text
npx kino-parity tap   --run runs/my-plugin --key sk:play
npx kino-parity type  --run runs/my-plugin --key query --text "dune" --submit
npx kino-parity back  --run runs/my-plugin
npx kino-parity shot  --run runs/my-plugin --why "check the focus"
npx kino-parity close --run runs/my-plugin
```

Every command prints **one JSON envelope** (text goes to stderr, exit codes `0` ok, `2` failed assertion, `3`
environment) and leaves its folder:

```
runs/my-plugin/
  session.json
  steps/00-open/{state.json, screen.txt, root.html, shot.png}
  steps/01-tap:sk-play/{action.json, state.json, screen.txt, root.html, shot.png}
  report.md
  result.json
```

`digest` gives you the screen as text, which is what you need to decide the next step:

```
Screen "Kino · Search"  device=tv size=compact focus=results.0 rows=7 popup=no toast=no
col key=auto-0
├ search key=query value="dune" [tap] →submit(q)
├ list key=auto-3 columns=1 items=7
│  ├ row key=n1 [tap] →play(1)  (0)
│  └ row key=n2 [tap] →play(2)  (1)
focus_order=n1,n2
```

Keys are stable and an agent taps by `key`, never by coordinates: a size, a theme or an engine change does not move
them.

## Network and goldens

```bash
# the plugin's network, recorded and replayable offline
npx kino-parity open --plugin ../my-plugin --net live --out runs/my-plugin
npx kino-parity open --plugin ../my-plugin --net cassette --cassette runs/my-plugin/cassette.json --out runs/other

# pin the screen and compare it on every change
npx kino-parity goldens ../my-plugin --update   # tree, text, HTML and PNG
npx kino-parity goldens ../my-plugin            # exits 2, with the diff, if anything changed
```

An incomplete cassette fails with exit `2` and says why: it is a cassette to complete by recording, not a plugin bug.
Goldens are regenerated with `--update` only when the change is the intended one, in the same PR that causes it.

## Levels: testing without a browser

| Level | What you have | What you can do | What you cannot |
|---|---|---|---|
| **N0** | Node only | the kit's tree and a `screen.txt` derived from it | see the drawing, real focus, events |
| **N1** | Node + `npm ci` (jsdom) | real render: DOM, focus, `unsupported()`, events, report | PNG |
| **N2** | N1 + a Chromium that starts | everything, plus `shot.png` and pixel goldens | nothing relevant |

Without a browser, `shot` **is not an error**: it answers `{"png":null,"skipped":"no-chromium"}` with exit `0`, and the
step still writes `root.html` and `screen.txt`. `doctor` says which level you are in and why (for instance, a container
where Chromium cannot start for lack of `libnss3`). If you want to require it, `--pixels require` turns the absence into
exit 3.

## For agents

The companion is built to be driven by an agent: `AGENTS.md` describes the loop, and every step leaves `screen.txt`, the
JSON envelope and one screenshot per new frame (deduplicated by hash, with `--shot-scale` to save tokens). The picture
confirms; the text decides. A tap that produces no new frame (`changed:false`) is a finding, not "nothing happened".

## Limits, said plainly

- The TV runs Chromium 79: no `flex-gap`, no `aspect-ratio`. The companion pins a Chromium version and marks what it
  cannot test.
- jsdom has no layout: structure, focus and events yes; geometry and pixels only in Chromium.
- Native things (player, DRM, file picker, QR, vault, the TV slot overlay) are not simulated: those still need a
  device.
- Real hosts have limits and outages: live network is read-only and cannot be a merging requirement.

The full contract, with every flag: the companion's `README.md`.
