# The player slot (`playerSlot`, apiVersion 23) { #player-slot }

!!! note "Next Kino release, not published yet"
    apiVersion 23 arrives with the next Kino release (provisionally 0.9.83), which is not published yet. A Kino that does not
    have it refuses a manifest with the `playerSlot` capability or the `slot` block ("Este plugin necesita una versión más
    nueva de Kino"). To keep running on older Kinos, keep your `apiVersion` and add both as an [enhancement](enhancements.md)
    (`enhancements["23"]`: `"capabilities": ["playerSlot"], "slot": { ... }`).

A plugin can put up to **three small things in the top-right corner of the TV player**: a clock, a score, a logo, a button
that opens the plugin's [player panel](player-panel.md). Kino calls two functions of yours, `playerSlot(context)` to fill the
elements and `playerSlotAction({ id, context })` when the person presses a button, and draws what you answer with its own look.
Like a [screen](screens.md), you describe and Kino draws: no views, no colours, no pixels.

- **TV only.** The phone's player is unchanged: no element, no call.
- **Movies, series and En vivo channels.** What changes on a channel is [below](#live).
- **Three elements on screen in all, across every plugin.** `fixed` ones first, then the ones that show with the controls;
  the person's plugin order (Ajustes, "Paneles del reproductor", the same list as the panel tabs) breaks ties and the rest are
  not drawn.
- **No new network destination.** The slot uses the hosts the plugin already declares; an `image` is loaded by Kino from any
  public https address.

The numbers on this page come from [`contract.json`](reference/contract.json) (`playerSlot`); the shapes are in
[`kino.d.ts`](reference/kino.d.ts) (`KinoManifestSlot`, `KinoSlotContext`, `KinoSlotAnswer`, `KinoSlotActionAnswer`).

## A first slot: a clock { #example }

The complete example is the **player clock**: the time and the date in Spanish or English, in one `fixed` text element, with
no network. Its modules live in `src/` and are bundled into `plugin.js` by `scripts/build.mjs` (Kino loads one file).

Downloads: [`kino-plugin.json`](slot-examples/player-clock/kino-plugin.json) ·
[`plugin.js`](slot-examples/player-clock/plugin.js) · [`src/clock.js`](slot-examples/player-clock/src/clock.js) ·
[`src/index.js`](slot-examples/player-clock/src/index.js) · [`scripts/build.mjs`](slot-examples/player-clock/scripts/build.mjs)

**`kino-plugin.json`**

```json
--8<-- "slot-examples/player-clock/kino-plugin.json"
```

**`src/index.js`** (the entry; `src/clock.js` turns a `Date` and `context.lang` into `"21:05\nWed Nov 4"`)

```js
--8<-- "slot-examples/player-clock/src/index.js"
```

- A plugin with only `playerSlot` and its `slot` block is complete: like `screen`, it plays nothing, so it needs neither
  `resolve` nor `search`.
- The manifest rules ask for at least one entry in `hosts`, so it names `kinotvapp.github.io`; the plugin never calls it.
- `playerSlotAction` is required by the capability even though the clock has no button (Kino never calls it here).
- `refreshMs: 60000` is the longest Kino allows: a clock that shows minutes asks once a minute.

```bash
node sdk/run.mjs player-clock playerSlot                              # the frame Kino would keep
node sdk/run.mjs --context '{"lang":"en-US"}' player-clock playerSlot  # in English
node sdk/validate.mjs player-clock                                     # also prints the red consent line
```

## The manifest's `slot` block { #manifest }

```json
{
  "apiVersion": 23,
  "capabilities": ["playerSlot"],
  "slot": { "elements": [
    { "id": "clock", "kind": "text", "mode": "fixed" },
    { "id": "open", "kind": "button", "mode": "overlay" }
  ] }
}
```

| Field | Rule |
| --- | --- |
| `elements` | 1 to 3 objects (a fourth is refused with `The "slot.elements" field must list 1 to 3 elements`). The count, the kinds and the modes are fixed here: your answers change content only. |
| `id` | Lowercase letters, digits, `-` or `_`, starting with a letter, 1 to 24 characters (`^[a-z][a-z0-9_-]{0,23}$`), unique in the block. Your answers use it as the key. |
| `kind` | `text`, `icon`, `image` or `button`. The answer for an element must be of its kind: a `text` element answered with an `icon` is dropped. |
| `mode` | `overlay`: floats over the video and shows **with the controls** (the controls of a movie or series; on a channel, the channel card). `fixed`: holds its place the whole time, paused or buffering too, and asks the person's approval ([consent](#consent)). |

- **The capability and the block need each other**: `The "slot" field needs the "playerSlot" capability`, `The "playerSlot"
  capability needs a "slot" block`. The capability exports `playerSlot` and `playerSlotAction`, both required (otherwise the
  install fails with "El plugin no carga: le falta ...").
- **`playerSlot` may be the plugin's only capability.** A slot-only plugin cannot declare `playerControl`: that one needs a
  `panel`.
- **When Kino draws nothing:** while a plugin panel is open, the audio and subtitles picker is open, a load error shows or the
  player is in picture-in-picture (an ordinary Kino dialog only dims the screen; the elements stay). An 18+ plugin draws only
  while the person's 18+ code is unlocked. `overlay` elements also wait for the controls: on a movie they hide with the
  controls, and while the screen is locked, a cast to a DLNA device is active or the person is marking a time.

## `playerSlot(context)`: what each element shows { #render }

```json
{ "items": [
    { "id": "clock", "text": "21:05\nmié 4 nov" },
    { "id": "mark", "icon": "star" },
    { "id": "logo", "image": "https://example.com/logo.png" },
    { "id": "open", "label": "Marcador", "icon": "tune" }
  ],
  "refreshMs": 30000 }
```

| `kind` | You answer | What Kino keeps and draws |
| --- | --- | --- |
| `text` | `text`: a string; newlines split lines | At most 2 lines (empty ones dropped, each trimmed), 2,000 characters before the split, control and direction characters removed. Never focusable. |
| `icon` | `icon`: one of Kino's [icon names](screen-components.md#icon-names) | The icon at 28 dp. An unknown name drops the item. Never focusable. |
| `image` | `image`: an https address on a public host (never an IP address, `localhost` or a local name) | Drawn small: about 40 dp high and at most 120 dp wide. Anything else drops the item. Never focusable. |
| `button` | `label` (at most 40 characters, control characters removed) and/or `icon` (a known name) | It needs at least one of the two valid. A round button (icon only) or a pill (with a label), focusable on the remote; icon-only reads "Botón del plugin" / "Plugin button" to a screen reader. |

- **`refreshMs`** is when Kino calls `playerSlot` again, counted from the end of the last call: below 2,000 it is raised to
  2,000, above 60,000 lowered to 60,000. Absent (or not a number) means it is never called again, which is fine for a button
  that does not change.
- **Nothing is repaired.** An id you did not declare, an item of the wrong kind, an unknown icon, a bad image and a button with
  nothing to show are dropped; a repeated id keeps the first valid one. If the answer is not an object with an `items` list,
  Kino keeps the last good frame (none the first time).
- **Items come out in declared order**, whatever order you answer in. An element you leave out is simply not drawn.

### Timing, retries and the background { #timing }

- **Each call has 5 s.** Calls are serialized: never two at once for a plugin.
- **The first call can fail without losing the slot:** until Kino has one good answer it calls `playerSlot` again every 5 s, up
  to 4 more times, and then gives up for that playback. After the first answer, a failed or invalid call keeps the last frame
  and the `refreshMs` clock goes on.
- **Calls run unattended.** A `playerSlot` call (the first one included) never counts toward "No responde" (the strike of
  consecutive timeouts); a press does. So there is no breaker for refreshes either: a plugin whose `playerSlot` keeps timing out
  after its first frame is called again every `refreshMs` plus up to about 5 s, for as long as the playback lasts, keeping its
  last frame.
- **Not in the background.** Kino makes no `playerSlot` call while it is in the background (Home pressed, or a Kino page over the
  player) and calls again on return.

## `playerSlotAction({ id, context })`: a press { #action }

It runs when the person presses a button (OK on the remote); `id` is the element's id. Kino calls it only for a declared button
that is on screen. Answer `null` or `{}` to do nothing, or:

```json
{ "openPanel": true, "player": { "pause": true } }
```

| Key | What Kino does |
| --- | --- |
| `openPanel` | `true` opens your plugin's player panel (the one your `panel` export draws: it needs a `panel` block, or a [contributed tab](player-panel.md#contributed-tab)). If the panel is already open it is not switched to your tab. Without a panel of yours in that player it is logged and ignored. |
| `player` | An ordinary panel [`player` action](player-panel.md#player) (`seekToMs`, `pause`, `speed`, `resize`...), read by the panel's own reader and then by the same rules as a press in a panel: the plugin of the title playing keeps its fields, any other plugin only a seek (with the approved [`playerControl`](rooms.md#player-control) capability: a seek, `pause` and `speed`). Kino's gate applies (one seek or pause a second, nothing under a Kino dialog or while the person seeks, 30 controlled actions a minute), and a controlled action shows a notice naming your plugin. |

## The context { #context }

`context` is the player panel's context for the title playing (see [`panel(context)`](player-panel.md#context)) plus
`live: true | false`. Which one you get depends on what plays and who may know it:

| What plays | `context` |
| --- | --- |
| A title of **your own** plugin | The panel's full context: `kind`, `ref`, `title`, ids, position, your saved values... and `live: false`. |
| A title of **another** plugin (never 18+) | The contributed-panel context: an opaque `ref`, `foreign: true`, `source: { pluginId, name }`, and `live: false`. |
| A title that reaches no other plugin (18+, a title no plugin owns such as one of Kino's own sources, or a title Kino cannot confirm is the one playing) | The **bare** context: only `live`, `foreign: true`, `device`, `lang` and `features`. **No `kind`**, not even movie or series: code that reads `context.kind` must cope with it missing. |
| An En vivo channel its provider confirmed | The live panel's context (`kind: "live"`, `live: true`, `channel`, `foreign`, `source`...), see [Your tab on a live channel](player-panel.md#live-kinds). |
| Any other En vivo channel | The bare context with `live: true`. |

Read `live` and `lang` (`es-CO`, `en-US`...: a clock writes its date in it) and treat everything else as possibly missing.

## On an En vivo channel { #live }

- **`fixed` elements always show; `overlay` ones show with the channel card** (the card that comes up on a zap and hides after
  about 3 seconds), and fade with it.
- **Reaching a button: the Menu key.** Up and Down keep zapping channels, so they cannot enter the row. Menu brings the card up
  and focuses the first button; Left and Right walk the buttons, Down or Back return to the video (Back does not close the
  player). While a button has focus the card stays up. **A remote without a Menu key, such as the Chromecast with Google TV's,
  cannot reach a live button**: do not make a live-only function depend on one.
- **A press on a channel can do very little.** On a channel a plugin always counts as another plugin, so Kino keeps only a seek
  (or with `playerControl` also `pause` and `speed`), and a channel has no timeline: `seekToMs`, `seekStepMs`, `speed`, `skip`,
  `markers` and `autoNext` are dropped with a log line, and `resize` is never kept for another plugin. What survives is **`pause`
  (true or false), and only with the approved `playerControl` capability**, which a slot-only plugin cannot hold. `openPanel`
  has an effect only when the channel's player offers plugin panel tabs; on a channel without them (an own M3U channel, for
  example) it is ignored and logged.

## On a movie or a series { #vod }

With the controls up, **Up from the progress bar** reaches the first button of the row; Left and Right move between buttons and
Down returns to the bar. With no button on screen (only texts, icons and images, or no slot plugin) Up does exactly what it did
before. Text, icon and image elements are never focusable.

## How it looks { #look }

Kino draws every element with its own look, so none of the screen kit's style properties (`padding`, `color`, `style`...)
applies, and there is no focus `ring` or `key` to set.

- **A text** sits on a translucent dark pill: the player's small label size, white with a shadow (readable over bare video, since
  a `fixed` element shows with the controls gone), the first line Medium and the second Regular, with tabular figures so a
  ticking clock never changes the pill's width; past the width it ends with an ellipsis.
- **A button** is a round button (icon only) or a pill (with a label), on the same translucent fill until it has focus.
- **Order:** elements keep the order you declared, `overlay` ones to the left of `fixed` ones, so a fixed element never moves
  when the overlay ones come and go.

Kino's own type changed in the same release (lighter weights in its own screens); the slot keeps the look described here, and
[plugin screens](screens.md) keep the type scale they always had: headings are still bold.

## Consent and the switch { #consent }

- **`fixed` is the one that asks.** A plugin with a `fixed` element shows a red line on its install sheet: "Mostrará algo suyo de
  forma permanente en el reproductor mientras ves un video" ("Will keep something of its own on screen in the player while you
  watch a video"). An update that adds a `fixed` element asks again, marked as new, and Kino never approves it on its own; a kit
  import starts it unticked. An overlay-only slot shows no line and needs no approval.
- **Per device.** A `fixed` slot's approval never carries over from a peer device or a backup: the person approves it again on
  each device.
- **The person's switch**, in your plugin's tab in Ajustes: "Dejar que muestre algo en el reproductor" ("Let it show something
  in the player"). It covers the whole device and syncs to the person's other devices; off, Kino stops calling you at once.
- **A press is the person's own action; a `playerSlot` call is not.** The context follows the same privacy rules as a panel's,
  and the bare one is all a title Kino cannot share gets.

## Testing it with the kit { #kit }

```bash
node sdk/run.mjs <folder> playerSlot [ref]                         # the frame: items in declared order, refreshMs clamped; drops on stderr
node sdk/run.mjs <folder> playerSlotAction <ref> <button id>       # the request: { openPanel, player, controlled }
node sdk/run.mjs --foreign <plugin id>[:<name>] <folder> playerSlot <ref>   # a title another plugin owns
node sdk/run.mjs --bare <folder> playerSlot                        # a private title's context (no kind)
node sdk/run.mjs --live-channel tdt:la1:La 1 <folder> playerSlot - # an En vivo channel's
node sdk/run.mjs --bare --live-channel tdt:la1:La 1 <folder> playerSlot -   # a channel Kino cannot confirm
node sdk/validate.mjs <folder>                                      # also prints the red consent line of a fixed element
```

- `--context '<json>'` merges your JSON over the kit's fake context (for example `{"lang":"en-US"}`). The ref is `-` with
  `--live-channel` or `--bare`.
- `validate` checks the `slot` block against the contract and that the entry exports `playerSlot` and `playerSlotAction`, and
  (with `--run playerSlot`) calls the export and reads its answer as Kino does.
- The kit cannot say how a frame looks on a TV: for that, install the plugin on a device with a remote.

See also [Test it locally](test-locally.md) and [The player panel](player-panel.md).
