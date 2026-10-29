# Screen reference: data, style and recipes { #screen-reference }

!!! note "Available with Kino 0.9.74"
    Available with Kino 0.9.74 (the next version, not published yet). An older Kino refuses these plugins with
    «Este plugin necesita una versión más nueva de Kino»; to keep reaching people on an older version use
    `enhancements` (see [Screens without raising your apiVersion](enhancements.md)).

This is the third part of the component catalogue for plugin [screens](screens.md):

- [Layout, content and actions](screen-components.md): `Column`, `Row`, `Card`, `Text`, `Image`, buttons, `ListTile`,
  Kino's title cards and the local `ui` operations.
- [Forms, overlays and navigation](screen-forms.md): `Form`, the inputs, `bind` and `config`, pop-ups, banners and
  `go`.
- **This page**: how data and events flow (state, inputs, events, answers, timers), the per-size values, the
  Flutter-style names, every style property and token, the limits, and recipes to copy.

The guide, [Screens](screens.md), explains the manifest's `screen` block, the `screen()` and `screenEvent()` exports, TV
focus and how to test with the kit. The [gallery example](https://github.com/kinotvapp/kino-plugin-ui-gallery) runs
every component.

## Data and behavior { #data-and-behavior }

### State { #state }

**The state lives in Kino.** Your runtime closes after a while idle, so nothing you keep in a variable survives: Kino keeps
the screen's state, hands it to every call, and calls `screen()` again after every answer that carries a `state` patch. A
patch is merged key by key (`null` removes a key). At most 64 KB; it lives for this opening only (keep what must survive
in `kino.storage`). `screen()` is a pure view: no network work there.

```json
{ "state": { "count": 3, "selected": null } }
```

### Inputs (`state.inputs`) { #inputs }

`state.inputs` holds every input on screen by key: what the person or your code set, else the value the tree shows. To set
what a field shows, answer `{ state: { inputs: { <key>: value } } }`: it shows at once and fires no event.

| Input | Value in `state.inputs` | Form rules | `bind` holds |
| --- | --- | --- | --- |
| [`TextField`](screen-forms.md#text-field) | string | `required`, `minLength`, `maxLength`, `pattern`, `errorText` | `text` |
| [`TextField` (several lines)](screen-forms.md#text-area) | string | `required`, `minLength`, `maxLength`, `pattern`, `errorText` | `text` |
| [`DropdownButton`](screen-forms.md#dropdown) | the option's value or `null` | `required`, `errorText` | `select` or `text` |
| [`Switch`](screen-forms.md#switch) | boolean | `required`, `errorText` | `toggle` |
| [`Checkbox`](screen-forms.md#checkbox) | boolean | `required`, `errorText` | `toggle` |
| [`RadioGroup`](screen-forms.md#radio-group) | the option's value or `null` | `required`, `errorText` | `select` or `text` |
| [`Slider`](screen-forms.md#slider) | number | none | `text` |
| [`Chips`](screen-components.md#chips) | a value or `null` (a list with `multiple`) | `required`, `minLength`, `maxLength`, `errorText` | `select` or `text` |
| [`NumberStepper`](screen-forms.md#number-stepper) | its value as text (`"2.50"`) | `required`, `errorText` | no `bind` |

### Events { #events }

- One event at a time per screen; the next waits (at most 8 waiting), spaced 100 ms apart, never dropped for coming fast.
  A newer `onChanged` of the same field replaces an older one still waiting.
- The first call after the screen opens is the reserved `open`: load your data there and answer a `state` patch.
- A call has 20 s. A call that times out shows the screen's error state; three failures in a row too. A screen's timeout
  never counts toward the plugin's "No responde".

<a id="answer"></a>

### Answers { #answers }

What `screenEvent` (and a timer, a pop-up's `onClose`, a panel's `panelAction`) may answer. Every field is optional;
`null` means nothing to do. Some answers are not the person's, so they keep less: the answer to the reserved `open` drops
its `go` (except `go.screen`), a load-more's never changes the route.

| Field | What it does | In a timer's answer | In an `onClose` answer | In a panel in screen mode |
| --- | --- | --- | --- | --- |
| `state` | a patch merged key by key (`null` removes a key); then `screen()` runs again | kept | kept | kept |
| `dialog` | a pop-up dialog: `title`, `body` (text or nodes), at most 3 `buttons` | dropped | dropped | dropped |
| `sheet` | a bottom sheet on the phone, a side drawer on the TV: `title`, `body` | dropped | dropped | dropped |
| `menu` | a list of 1 to 8 actions: `items` of `{ label, icon?, onTap }` | dropped | dropped | dropped |
| `toast` | a short message: a string or `{ text, textEn?, role?, action?, ms? }` (`ms` 2,000 to 8,000, default 3,500) | kept | kept | kept |
| `toastEn` | the English twin of a string toast | kept | kept | kept |
| `go` | somewhere in Kino ([Navigation](screen-forms.md#navigation)) | dropped | dropped | kept |
| `route` | `{ push: name, params? }` or `{ pop: true }`: a screen of your own deeper in the canvas | dropped | dropped | dropped |
| `close` | `true` closes the screen | kept | kept | kept |
| `focus` | the key of the node that takes the focus | dropped | dropped | kept |
| `config` | your settings to write, at most 32 keys ([bind and config](screen-forms.md#bind-and-config)) | kept | kept | kept |
| `ui` | local operations (at most 8); an `open` waits for the tree the answer asks for | dropped | kept, without `open` and `focus` | kept |

<a id="every"></a>

### Timers (`every`) { #timers }

The root of a tree (or the manifest's `screen.every`) may carry `{ ms, event }` or a list of them: Kino sends that event
every `ms` while the screen is open, shown and Kino in front. A tick is nobody's press: its answer keeps only `state`,
`toast`, `close` and `config`; 3 failures in a row switch that timer off; ticks never count toward "No responde" and never
run while one of the person's events waits.

```json
{ "type": "Column", "every": { "ms": 30000, "event": "refresh" }, "children": [{ "type": "Text", "text": "Se actualiza cada 30 s", "textEn": "Refreshes every 30 s" }] }
```

<a id="responsive"></a>

### Per-size values { #per-size-values }

**Every style or layout property may be a per-size map** `{ compact?, medium?, expanded? }` (the Material window classes:
`compact` under 600 dp, `medium` 600 to 839, `expanded` 840 and up; a TV is `expanded`). A class missing from the map takes
the next smaller one present, else Kino's default. A node whose value is invalid **in any one class is dropped whole**, and
a map that mixes classes with other keys is dropped. `devices` and `sizes` draw a node only somewhere; `ctx.device` and
`ctx.size` let `screen()` return a different tree.

```json
{ "type": "GridView", "columns": { "compact": 1, "medium": 2, "expanded": 3 }, "gap": { "compact": 8, "expanded": 16 }, "padding": { "compact": 16, "expanded": 32 }, "children": [
  { "type": "Text", "text": "Solo en la TV", "textEn": "TV only", "devices": ["tv"] },
  { "type": "Text", "text": "Solo en ventanas anchas", "textEn": "Wide windows only", "sizes": ["expanded"] }
] }
```

<a id="aliases"></a>

### Flutter-style names { #flutter-style-names }

Authors who know Flutter find the same names. They are the documented spelling; the older lowercase names stay accepted
and both read to the same tree. Give one spelling: when a node has both, the Flutter-style one wins and the clash is
logged. Only nodes are renamed: the fields of an answer's `dialog`, `sheet` and `menu`, a dialog's `buttons`, a menu's
`items`, a banner's `action` and the entries of `options` and `tabs` keep `label` and `onTap`. Kino's own components
(`titleCard`, `titleRail`, `titleGrid`, `heroCard`, `emptyState`, `errorState`, `popup`, `settings`) keep their names.

| Flutter-style name | Older name | Implies |
| --- | --- | --- |
| `Column` | `col` |  |
| `Row` | `row` |  |
| `Stack` | `box` |  |
| `Card` | `card` |  |
| `Spacer` | `spacer` |  |
| `SizedBox` | `spacer` |  |
| `Divider` | `divider` |  |
| `SingleChildScrollView` | `scroll` |  |
| `GridView` | `grid` |  |
| `Text` | `text` |  |
| `Image` | `image` |  |
| `Icon` | `icon` |  |
| `Badge` | `badge` |  |
| `LinearProgressIndicator` | `progress` |  |
| `CircularProgressIndicator` | `loading` |  |
| `ListView` | `list` |  |
| `Button` | `button` |  |
| `ElevatedButton` | `button` | `variant: "primary"` |
| `TextButton` | `button` | `variant: "text"` |
| `IconButton` | `button` | `variant: "icon"` |
| `TextField` | `textInput` |  |
| `DropdownButton` | `dropdown` |  |
| `Switch` | `toggle` |  |
| `Checkbox` | `checkbox` |  |
| `RadioGroup` | `radioGroup` |  |
| `Slider` | `slider` |  |
| `Chips` | `chips` |  |
| `TabBar` | `tabs` |  |
| `AlertDialog` | `popup` | `kind: "dialog"` |
| `BottomSheet` | `popup` | `kind: "sheet"` |
| `PopupMenuButton` | `popup` | `kind: "menu"` |
| `Form` | `form` |  |
| `MaterialBanner` | `banner` |  |
| `ExpansionTile` | `accordion` |  |
| `Skeleton` | `skeleton` |  |
| `QrImage` | `qr` |  |
| `NumberStepper` | `stepper` |  |
| `DataTable` | `table` |  |
| `TableRow` | `tr` |  |
| `TableCell` | `td` |  |
| `FloatingActionButton` | `fab` |  |
| `ListTile` | `listTile` |  |
| `CircleAvatar` | `avatar` |  |
| `PageView` | `pageView` |  |
| `Scaffold` | `scaffold` |  |
| `AppBar` | `appBar` |  |
| `NavigationBar` | `navigationBar` |  |
| `TextField` with `multiline: true` or `maxLines` > 1 | `textArea` |  |

| Flutter-style property | Older name | Where |
| --- | --- | --- |
| `width` | `w` | any node |
| `height` | `h` | any node |
| `minHeight` | `minH` | any node |
| `mainAxisAlignment` | `justify` | any node |
| `crossAxisAlignment` | `align` | any node |
| `flex` | `weight` | any node |
| `borderRadius` | `radius` | any node |
| `onChanged` | `onChange` | any node |
| `onSubmitted` | `onSubmit` | any node |
| `hintText` | `hint` | any node |
| `hintTextEn` | `hintEn` | any node |
| `labelText` | `label` | any node |
| `labelTextEn` | `labelEn` | any node |
| `obscureText` | `secret` | any node |
| `onPressed` | `onTap` | a button only (elsewhere ignored, logged) |
| `flex` | `weight` | a `DataTable` column |

### Style { #style }

Style comes from fixed scales, never from free values; a value off its scale is dropped and logged. Every node takes these.

| Property | Older name | Values | Per size |
| --- | --- | --- | --- |
| `padding` |  | 0, 4, 8, 12, 16, 24, 32, 48, or per side `{ x, y, top, end, bottom, start }` | yes |
| `margin` |  | 0, 4, 8, 12, 16, 24, 32, 48, or per side | yes |
| `gap` |  | 0, 4, 8, 12, 16, 24, 32, 48 | yes |
| `borderRadius` | `radius` | `none`, `small`, `medium`, `large`, `full`, or per corner `{ topStart, topEnd, bottomStart, bottomEnd }` (an omitted one `medium`) | yes |
| `width` | `w` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | yes |
| `height` | `h` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | yes |
| `minHeight` | `minH` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | yes |
| `fill` |  | `true`: the parent's whole width | yes |
| `flex` | `weight` | 1 to 12: its share of a `Row` or `Column` | yes |
| `crossAxisAlignment` | `align` | `start`, `center`, `end`, `stretch`: across the main axis (on a `Text`, the paragraph) | yes |
| `mainAxisAlignment` | `justify` | `start`, `center`, `end`, `spaceBetween`, `spaceAround`: along the main axis | yes |
| `color` |  | `primary`, `secondary`, `surface`, `muted`, `warning`, `error`, `onPrimary`, `primaryContainer`, `surfaceVariant` | yes |
| `span` |  | 1 to 12 or `"auto"` (default), only in a `Row` with `wrap: true` | yes |
| `offset` |  | 0 to 11, only in a `Row` with `wrap: true` | yes |
| `maxWidthFraction` |  | 0.25 to 1 in steps of 0.05: at most that share of the parent's width (exactly, with `fill`) | yes |
| `alignSelf` |  | `start`, `center`, `end`, `stretch`: this child across its `Row` or `Column`, over the parent's `crossAxisAlignment` ([box and text properties](#box-and-text-properties)) | yes |
| `textAlign` |  | `start`, `center`, `end`, `justify`: the paragraph of a node that draws text (`Text`, `Button`, `Chips`, `TextField`, `TextField`, `ListTile`) | yes |
| `border` |  | `{ width?, color? }` on a box: width 0 to 8 dp (default 1), a colour role (default Kino's outline) | yes |
| `elevation` |  | 0 to 24 on a `Card` or a `Stack`: Kino's shadow (a card's tonal lift too) | yes |
| `background` |  | a colour role: a box's fill (its content reads in the role's on-colour) | yes |
| `minWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | yes |
| `maxWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | yes |
| `maxHeight` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 | yes |
| `positioned` |  | `{ top?, left?, right?, bottom?, width?, height? }` on a `Stack` child: dp or `"25%"` of the stack ([positioned stack](screen-components.md#positioned)) | yes |
| `opacity` |  | 0 to 1; below 0.38 the node takes no press and no focus ([animations](#animations)) | yes |
| `animate` |  | `{ duration?, curve? }` on a box or a positioned child: changes glide ([animations](#animations)) | yes |

### Common properties { #common-properties }

Every node takes these besides its own and the style.

| Property | Type | Default | Per size | Notes |
| --- | --- | --- | --- | --- |
| `key` | string | `auto-<n>` | no | unique on the screen; required on inputs, pop-ups, an `ExpansionTile` and a dismissible banner; the `auto-` prefix is Kino's |
| `onTap` | action | none | no | a press (a button's is `onPressed`) |
| `onLongPress` | action | none | no | a long press; keep it for extras reachable another way |
| `arg` | string | none | no | the event's `arg` when the action is a bare event name (at most 4,096 characters) |
| `enabled` | boolean | `true` | no | `false` draws it off; `ui` `enable`/`disable` change it |
| `hidden` | boolean | `false` | no | `true` starts it hidden; `ui` `show`/`hide`/`toggle` change it |
| `devices` | `phone`, `tv`, `desktop` (a list) | everywhere | no | drawn only there; an unknown name drops the node |
| `sizes` | `compact`, `medium`, `expanded` (a list) | every size | no | drawn only at those width classes |
| `testKey` | string | none | no | 1 to 64 characters, for tests, never drawn |
| `autofocus` | boolean | `false` | no | a node that takes focus: where focus goes when a render left it nowhere ([shared properties](#shared-properties)) |
| `selected` | boolean | none | no | a button or a card with `onTap`: Kino's selected look; `ui` `set` and `toggle` (`prop: "selected"`) change it |
| `badge` | `"dot"` or `{ text, textEn?, color? }` | none | no | a button, a card with `onTap`, a tab: a count (at most 12 characters) or a dot on its top end corner |
| `visible` | boolean | `true` | no | `false` hides it as `hidden: true` does ([animations](#animations)) |
| `tooltip` | string | none | no | a node that does something: Kino's hint (`tooltipEn`), at most 80 characters; never essential information ([tooltip](screen-components.md#tooltip)) |
| `enabledAt` | epoch ms | none | no | a button, a `FloatingActionButton`, a card or a `ListTile` with `onTap`: off until that time on the device's clock, then on by itself, no call to you ([text with a time](screen-components.md#text-time)) |
| `canRequestFocus` | boolean | `false` | no | any node: on the TV a D-pad stop where the remote rests to read it (Kino's row look, no press); ignored where the node takes focus already and on the phone ([shared properties](#shared-properties)) |
| `loading` | boolean | `false` | no | a button, a `FloatingActionButton`, a card or a `ListTile` with `onTap`: Kino's busy look (a spinner, no press, read as busy); Kino also draws it on the node pressed while its call runs long ([busy and slow presses](screen-components.md#busy)) |

### Shared properties { #shared-properties }

Kino never adds a component per need: a family of nodes shares one property with one meaning everywhere.

- **`autofocus: true`** on a node that takes focus (a button, an input, a `TabBar`, a `titleCard`, or any node with `onTap` or
  `onLongPress`): on a render (a tick or an answer) that left focus nowhere, or on a node that is gone, focus goes to the first
  `autofocus` node in tree order. An answer's own `focus` wins and a node that still holds focus keeps it. This is mostly for
  the TV: a screen that changes on a timer (a download done, a live event over) puts the remote on its one way forward. On a
  phone a text field is never autofocused (no keyboard opens by itself). Elsewhere ignored, logged.
- **`canRequestFocus: true`** (Flutter's name) on any node that takes no focus of its own (a status `Card`, a `Text`, a
  `Row`, a `Column`, a `DataTable`, a `MaterialBanner` without an action): on the TV it becomes a D-pad stop where the remote
  rests to read it, in Kino's row look (a tonal tint and an accent underline, never the white ring), with no press (OK does
  nothing). It takes part in Up, Down, Left, Right and the `Scaffold` rules like any stop, and a screen reader reads its
  content. Ignored on a node that already takes focus and on the phone; never per size. Recipe, a status card as a TV read
  stop: `{ "type": "Card", "key": "status", "canRequestFocus": true, "children": [ ... ] }`. Without it the TV still shows the
  card: a scrolling body pages (80% of its height) before focus moves past a block that has not shown yet.
- **`selected: true | false`** on a button (any variant) or a card with `onTap`: Kino's selected look (filled-tonal; a card
  gets an outline in the primary colour), read as selected by a screen reader. It is state, not an action; `ui` `set` and
  `toggle` with `prop: "selected"` change it without a call ([Local ui operations](screen-components.md#ui-ops)). `Chips` and
  `TabBar` say which is selected with their `value`. On the TV focus is unchanged.
- **`badge`**: the `Badge` node's value, `"dot"` or `{ text, textEn?, color? }` (a count or a short word, at most 12
  characters; `color` a colour role, Kino's primary by default), on a button, a card with `onTap`, a `TabBar` tab (in its
  `tabs` entry) and a panel's drawer tab (in the panel result's `tabs`). It sits on the node's top end corner (beside a tab's
  label) and a screen reader reads it after the node's name («Chat, 3»; a dot reads «nuevo»). Set it on each render.

```json
{ "type": "Column", "children": [
  { "type": "TabBar", "key": "tabs", "value": "chat", "onChanged": "tab", "tabs": [
    { "value": "room", "label": "Sala", "labelEn": "Room" },
    { "value": "chat", "label": "Chat", "badge": { "text": "3" } }] },
  { "type": "Row", "gap": 8, "children": [
    { "type": "IconButton", "key": "mute", "icon": "close", "labelText": "Silencio", "labelTextEn": "Mute", "selected": true,
      "onPressed": { "ui": [{ "toggle": "mute", "prop": "selected" }], "event": "mute" } },
    { "type": "IconButton", "key": "downloads", "icon": "download", "labelText": "Descargas", "labelTextEn": "Downloads", "badge": "dot", "onPressed": "downloads" },
    { "type": "ElevatedButton", "key": "retry", "labelText": "Reintentar", "labelTextEn": "Try again", "autofocus": true, "onPressed": "retry" }] }
] }
```

`maxWidthFraction` (0.25 to 1 in steps of 0.05) and `borderRadius` per corner are [style](#style): every node takes the first,
every node that draws a box the second; the TV's focus ring follows the corners.

<a id="box-props"></a>

### Box and text properties { #box-and-text-properties }

Style properties, every one per size, each a token or a colour role, never a free value:

| Property | Taken by | What it does |
| --- | --- | --- |
| `alignSelf` | a child of a `Row`, `Column`, `Card`, `Form` or scroll | `start`, `center`, `end`, `stretch` across its parent, over the parent's `crossAxisAlignment`; in a row `stretch` draws as `start` (Kino measures no intrinsic heights); elsewhere, a wrapping row's cell too, ignored, logged |
| `textAlign` | `Text`, a button's label, `Chips`, `TextField`, `ListTile` | `start`, `center`, `end`, `justify`; on a `Text` it wins over the older paragraph reading of `crossAxisAlignment`. The TV draws its own field and action entries, sized to their text: there it shows on a `Text` |
| `border` | a box: `Column`, `Row`, `Stack`, `Card`, scroll, `GridView`, `Form`, `ListTile`, `PageView` | `{ width?, color? }`: 0 to 8 dp (default 1, out of range clamped), a colour role (default Kino's outline); follows `borderRadius`; a selected card keeps Kino's primary outline |
| `elevation` | `Card`, `Stack` | 0 to 24 (clamped): Kino's shadow, following the shape; a plain card is also lifted tonally. No free shadows |
| `background` | a box | a colour role: the fill (over `color`, which a box still reads as its fill); text and icons inside read in the role's on-colour, and a `Text` or `Icon` coloured with a role that would not read on that fill is drawn in the fill's readable colour |
| `minWidth`, `maxWidth`, `maxHeight` | any node | the size scale, beside `minHeight`; a minimum above its maximum drops the maximum, logged |

```json
{ "type": "Column", "crossAxisAlignment": "start", "children": [
  { "type": "Card", "border": { "width": 2, "color": "primary" }, "elevation": 3, "maxWidth": 320, "alignSelf": "center",
    "children": [{ "type": "Text", "text": "Centrado", "textEn": "Centred", "textAlign": "center", "fill": true }] },
  { "type": "Stack", "background": "primaryContainer", "padding": 12, "children": [{ "type": "Text", "text": "Destacado", "textEn": "Highlighted" }] }
] }
```

<a id="animate"></a>

### Animations (`animate`, `opacity`, `visible`) { #animations }

Flutter's `AnimatedContainer`, `AnimatedOpacity` and `AnimatedSwitcher` folded into one style property: `animate: {
duration?, curve? }` on a box (or a `positioned` child): changes of its size, its `opacity`, its fill, its place in a stack and
its visibility between two renders glide over `duration` ms (100 to 600, default 250, clamped) along `curve` (`standard`,
`ease`, `decelerate`). `opacity` (0 to 1, any node) fades it; below 0.38 the node takes no press and no focus. `visible:
false` hides a node as `hidden: true` does (`ui` `show` and `hide` still work); with `animate` it fades and folds in and out,
and while it glides out it takes nothing. The device's "remove animations" (animator duration scale 0) makes every one a
jump; an animation never delays a press or focus; at most 24 animating nodes a screen (the rest drop `animate`, logged).

```json
{ "type": "Card", "key": "details", "animate": { "duration": 300, "curve": "decelerate" }, "visible": true,
  "background": "surfaceVariant", "children": [{ "type": "Text", "text": "Más información", "textEn": "More details" }] }
```

### Tokens { #tokens }

| Token | Values |
| --- | --- |
| Spacing (`padding`, `margin`, `gap`) | 0, 4, 8, 12, 16, 24, 32, 48 |
| Sizes (`width`, `height`, `minHeight`) | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| Corners (`borderRadius`) | `none`, `small`, `medium`, `large`, `full` (one for every corner, or a map per corner) |
| Colour roles (`color`) | `primary`, `secondary`, `surface`, `muted`, `warning`, `error`, `onPrimary`, `primaryContainer`, `surfaceVariant` |
| Roles (`MaterialBanner`, a toast) | `info`, `warning`, `error`, `success` |
| Text styles (`Text.style`) | `h1`, `h2`, `h3`, `h4`, `h5`, `p`, `caption`, `label` |
| Card sizes (`titleCard`, `titleRail`, `QrImage`) | `small`, `medium`, `large` |
| Width classes (per-size maps, `sizes`) | `compact`, `medium`, `expanded` |
| Devices (`devices`, `ctx.device`) | `phone`, `tv`, `desktop` |
| Icons (`Icon.name`, a button's `icon`) | `info`, `tune`, `settings`, `star`, `bolt`, `language`, `subtitles`, `list`, `magic`, `heart`, `movie`, `tv`, `sports`, `music`, `bookmark`, `help`, `refresh`, `sync`, `add`, `remove`, `delete`, `edit`, `search`, `close`, `check`, `share`, `play`, `pause`, `download`, `upload`, `link`, `open_in_new`, `home`, `person`, `lock`, `notifications`, `warning`, `error`, `visibility`, `copy`, `arrow_back`, `arrow_forward`, `expand_more`, `expand_less`, `more_vert`, `filter_list`, `calendar`, `schedule`, `send`, `mood` |

Not in this version: pull-to-refresh, segmented buttons, autocomplete and combo boxes, date and time pickers, a range
slider, a rating, dismissible and reorderable list items, rich text, charts, continue-watching and channel cards and file
inputs. Feature-detect a widget a newer Kino adds with `kino.screen.names.includes("DataTable")`.

### Limits { #limits }

| Limit | Value | What |
| --- | --- | --- |
| `maxConfigKeys` | 32 | settings one `config` writes |
| `maxDepth` | 10 | depth of a tree |
| `maxNodes` | 600 | nodes in a tree |
| `maxListItems` | 500 | items in a list, rail, grid, accordion or a choice's options |
| `maxStateBytes` | 65,536 (64 KB) | bytes of state, as JSON |
| `maxTextChars` | 2,000 | characters of a text |
| `minEventIntervalMs` | 100 | ms between two events |
| `callTimeoutMs` | 20,000 | ms per `screen` or `screenEvent` call |
| `maxPopups` | 1 | pop-up open at a time |
| `maxRefChars` | 4,096 | characters of a `ref` or an `arg` |
| `maxSearchQueryChars` | 200 | characters of a `go.search` `q` |
| `eventQueue` | 8 | events waiting |
| `maxUiOps` | 8 | `ui` operations per action or answer |
| `maxDialogButtons` | 3 | buttons in a dialog |
| `maxWeight` | 12 | largest `flex` |
| `maxGridColumns` | 8 | largest `columns` |
| `maxTestKeyChars` | 64 | characters of a `testKey` |
| `maxTrailingLabelChars` | 40 | characters of a text field's `trailingLabel` |
| `maxHeroButtons` | 2 | buttons in a `heroCard` |
| `maxMenuItems` | 8 | items in a menu |
| `maxTitles` | 1,000 | titles in a whole tree |
| `maxFlatTitles` | 60 | titles in a rail or grid drawn all at once |
| `maxPatternChars` | 200 | characters of a `pattern` |
| `maxPatternRepeat` | 1,000 | largest count in a pattern |
| `maxPatternStates` | 500 | steps of a pattern once counts are expanded |
| `maxPatternFields` | 16 | patterns one submit runs |
| `maxPatternCompileWork` | 20,000 | units of work to read one pattern |
| `maxPatternMatchWork` | 4,000,000 | matcher steps one submit runs |
| `minTimerMs` | 1,000 | shortest timer, ms |
| `maxTimerMs` | 86,400,000 | longest timer, ms |
| `maxTimers` | 3 | timers per screen |
| `timerMaxFailures` | 3 | failures in a row that switch a timer off |
| `toastMinMs` | 2,000 | shortest toast, ms |
| `toastMaxMs` | 8,000 | longest toast, ms |
| `toastDefaultMs` | 3,500 | a toast's default, ms |
| `timerConfigWriteIntervalMs` | 60,000 | ms between two writes of one setting from a timer |
| `maxQrChars` | 1,000 | characters of a `QrImage` value |
| `maxStepperDecimals` | 6 | decimals of a `NumberStepper` |
| `maxStepperAbs` | 1,000,000,000,000,000 | largest `NumberStepper` number either way |
| `maxSkeletonLines` | 6 | lines of a `Skeleton` |
| `maxTableColumns` | 20 | columns of a `DataTable` |
| `maxTableRows` | 200 | rows of a `DataTable` |
| `maxColSpan` | 8 | largest `colSpan` |
| `gridColumns` | 12 | columns of the twelve-column row |
| `maxGoRouteChars` | 64 | characters of a `go.screen` `route` |
| `maxGoArgsBytes` | 4,096 (4 KB) | bytes of `go.screen` `args`, as JSON |

## Player panel { #player-panel }

The player panel can be built from the same nodes: `panel(context)` may return `{ format: "screen", root, ... }`, a
screen tree inside Kino's drawer. Everything about it lives in [The player panel](player-panel.md):

- [the panel in screen mode](player-panel.md#screen-mode): the result, the smaller TV text, which answer fields it keeps;
- [contributed tabs](player-panel.md#contributed-tab) (`playerPanelTab`): your tab in the panel of any plugin's title;
- [the pinned panel](player-panel.md#pinned): docked next to the video;
- [`layout: "fill"`](player-panel.md#layout-fill) and a `ListView` with `stickToBottom`: a chat tab whose input row stays
  at the bottom of the panel.

## Recipes { #recipes }

Copy, paste, adapt. Each is a whole `screen` (and its `screenEvent` when it has events); the
[gallery example](https://github.com/kinotvapp/kino-plugin-ui-gallery) runs most of them.

### News card grid { #recipe-news-grid }

One card per line on a phone, two on a medium window, three on a TV; flush cards with a picture and a fallback; a tap
reads the story in a declared pop-up opened from the answer.

```js
const STORIES = [
  { id: "a", title: "Un estreno", source: "Kino", image: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg" },
  { id: "b", title: "Otra noticia", source: "Guía", image: "" },
];

export async function screen({ state }) {
  const reading = STORIES.find((s) => s.id === state.reading);
  const card = (s) => ({
    type: "Card", key: "story-" + s.id, flush: true, span: { compact: 12, medium: 6, expanded: 4 }, onTap: { event: "read", arg: s.id },
    children: [
      { type: "Image", ...(s.image ? { url: s.image } : {}), aspect: "16:9", alt: s.title, fallback: { type: "Stack", color: "surface", children: [{ type: "Text", text: s.source, style: "h3", padding: 12 }] } },
      { type: "Column", padding: 12, gap: 4, children: [{ type: "Text", text: s.title, style: "h4", maxLines: 3 }, { type: "Text", text: s.source, style: "caption", color: "muted" }] },
    ],
  });
  return { type: "Column", children: [
    { type: "SingleChildScrollView", flex: 1, children: [{ type: "Row", wrap: true, gap: 12, padding: 16, children: STORIES.map(card) }] },
    { type: "AlertDialog", key: "story", title: reading ? reading.title : "", onClose: "closed", children: [{ type: "Text", text: reading ? reading.source : "…" }] },
  ] };
}

export async function screenEvent({ name, arg }) {
  if (name === "read") return { state: { reading: arg }, ui: [{ open: "story" }] };
  if (name === "closed") return { state: { reading: null } };
  return null;
}
```

### Settings form with validation { #recipe-settings-form }

A form whose submit Kino checks first; the answer writes your settings with `config` (the manifest declares `greeting` as
a `text` setting and `density` as a `select`).

```js
export async function screen() {
  return { type: "SingleChildScrollView", children: [{ type: "Form", key: "prefs", onSubmitted: "save", gap: 12, padding: 16, children: [
    { type: "TextField", key: "greeting", labelText: "Saludo", labelTextEn: "Greeting", required: true, maxLength: 40, pattern: "^[A-Za-z ]+$", errorText: "Solo letras", errorTextEn: "Letters only" },
    { type: "RadioGroup", key: "density", labelText: "Densidad", value: "normal", options: [{ value: "compact", label: "Compacta" }, { value: "normal", label: "Normal" }, { value: "roomy", label: "Amplia" }] },
    { type: "ElevatedButton", labelText: "Guardar", labelTextEn: "Save", submit: true },
  ] }] };
}

export async function screenEvent({ name, value }) {
  if (name !== "save") return null;
  return { config: { greeting: value.greeting, density: value.density }, toast: "Guardado", toastEn: "Saved" };
}
```

### Confirmation pop-up { #recipe-confirm }

The quick way is a button's `confirm` (Kino asks, then runs the action); the custom way is a dialog from the answer.

```js
export async function screen({ state }) {
  return { type: "Column", gap: 12, padding: 16, children: [
    { type: "Text", text: state.deleted ? "Lista borrada" : "Tu lista" },
    { type: "TextButton", labelText: "Borrar (rápido)", confirm: "¿Borrar la lista?", confirmEn: "Delete the list?", onPressed: "delete" },
    { type: "Button", variant: "secondary", labelText: "Borrar (diálogo)", onPressed: "ask" },
  ] };
}

export async function screenEvent({ name }) {
  if (name === "ask") return { dialog: { title: "¿Borrar la lista?", body: "No se puede deshacer.", buttons: [{ label: "Borrar", event: "delete", variant: "primary" }, { label: "Cancelar", variant: "text" }] } };
  if (name === "delete") return { state: { deleted: true }, toast: { text: "Borrada", role: "success" } };
  return null;
}
```

### Tabs with chips { #recipe-tabs-chips }

A `TabBar` whose value you keep in your state, and `Chips` filtering the tab's list.

```js
const ALL = [{ t: "Big Buck Bunny", k: "movies" }, { t: "Sintel", k: "movies" }, { t: "Una serie", k: "series" }];

export async function screen({ state }) {
  const tab = state.tab === "saved" ? "saved" : "all";
  const filter = typeof state.inputs?.kind === "string" ? state.inputs.kind : "any";
  const list = ALL.filter((x) => filter === "any" || x.k === filter);
  return { type: "Column", children: [
    { type: "TabBar", key: "tabs", value: tab, onChanged: "tab", tabs: [{ value: "all", label: "Todo", labelEn: "All" }, { value: "saved", label: "Guardado", labelEn: "Saved" }] },
    { type: "Chips", key: "kind", value: filter, padding: 8, options: [{ value: "any", label: "Todo" }, { value: "movies", label: "Películas" }, { value: "series", label: "Series" }], onChanged: "filter" },
    { type: "ListView", key: "list", flex: 1, items: list.map((x, i) => ({ type: "Text", key: "x" + i, text: x.t, padding: 12 })), empty: { type: "emptyState", title: "Nada", titleEn: "Nothing" } },
  ] };
}

export async function screenEvent({ name, value }) {
  if (name === "tab") return { state: { tab: value } };
  if (name === "filter") return { state: {} }; // the chip's value is already in state.inputs: just draw again
  return null;
}
```

### Button matrix (calculator style) { #recipe-matrix }

Buttons in a twelve-column row, three columns each (four to a line), each with its own `key`, sized per class: the
D-pad walks it as a matrix on a TV. A whole calculator plugin is built the same way.

```js
const KEYS = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "C", "0", ".", "+"];

export async function screen({ state }) {
  const shown = typeof state.shown === "string" ? state.shown : "0";
  return { type: "Column", gap: 12, padding: 16, children: [
    { type: "Card", variant: "filled", children: [{ type: "Text", text: shown, style: "h1", crossAxisAlignment: "end" }] },
    { type: "Row", wrap: true, gap: 8, children: KEYS.map((k, i) => ({
      type: "Button", key: "k" + i, variant: /\d|\./.test(k) ? "secondary" : "primary", labelText: k,
      onPressed: "key", arg: k, span: 3, fill: true, height: { compact: 80, medium: 64, expanded: 48 },
    })) },
  ] };
}

export async function screenEvent({ name, arg, state }) {
  if (name !== "key") return null;
  const now = typeof state.shown === "string" ? state.shown : "0";
  return { state: { shown: arg === "C" ? "0" : (now === "0" ? "" : now) + arg } };
}
```

### A screen with an app bar, tabs and a floating button { #recipe-scaffold }

A `Scaffold` root: the bar with a back button, a search action and two tabs; a lazy list in the body; a «Nueva» button above
a bottom bar of three sections. Your state keeps the tab and the section (neither is in `state.inputs`).

```js
export async function screen({ state }) {
  const tab = state.tab === "saved" ? "saved" : "all";
  const section = ["home", "lists", "me"].includes(state.section) ? state.section : "home";
  const rows = (tab === "saved" ? ["Guardado 1"] : ["Uno", "Dos", "Tres"]).map((t, i) => ({ type: "ListTile", key: "r" + i, title: t, onTap: "show", arg: String(i) }));
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar", title: "Mis listas", titleEn: "My lists",
      leading: { type: "IconButton", icon: "arrow_back", labelText: "Atrás", labelTextEn: "Back", onPressed: { close: true } },
      actions: [{ type: "IconButton", icon: "search", labelText: "Buscar", labelTextEn: "Search", onPressed: "search" }],
      bottom: { type: "TabBar", key: "tabs", value: tab, onChanged: "tab", tabs: [{ value: "all", label: "Todo", labelEn: "All" }, { value: "saved", label: "Guardado", labelEn: "Saved" }] },
    },
    body: { type: "ListView", key: "rows", items: rows },
    floatingActionButton: { type: "FloatingActionButton", icon: "add", labelText: "Nueva", labelTextEn: "New", onPressed: "newList" },
    bottomNavigationBar: { type: "NavigationBar", value: section, onChanged: "section", items: [
      { key: "home", icon: "home", label: "Inicio", labelEn: "Home" },
      { key: "lists", icon: "list", label: "Listas", labelEn: "Lists" },
      { key: "me", icon: "person", label: "Yo", labelEn: "Me" },
    ] },
  };
}

export async function screenEvent(e) {
  if (e.name === "tab") return { state: { tab: e.value } };
  if (e.name === "section") return { state: { section: e.value } };
  return null;
}
```

### Tabs in the app bar { #recipe-app-bar-tabs }

Kino's own title bar already names the screen, so the app bar can hold the tabs themselves: a `TabBar` as the `title`, beside
the actions, one row tall.

```js
export async function screen({ state }) {
  const tab = ["account", "connection", "help"].includes(state.tab) ? state.tab : "account";
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      title: { type: "TabBar", key: "tabs", value: tab, onChanged: "tab", tabs: [
        { value: "account", label: "Cuenta", labelEn: "Account" },
        { value: "connection", label: "Conexión", labelEn: "Connection" },
        { value: "help", label: "Inicio y ayuda", labelEn: "Start and help" },
      ] },
      actions: [
        { type: "IconButton", icon: "refresh", labelText: "Actualizar", labelTextEn: "Refresh", onPressed: "refresh" },
        { type: "IconButton", icon: "help", labelText: "Ayuda", labelTextEn: "Help", onPressed: "help" },
      ],
    },
    body: { type: "SingleChildScrollView", children: [{ type: "Column", padding: 16, gap: 12, children: [{ type: "Text", text: "Pestaña: " + tab }] }] },
  };
}

export async function screenEvent(e) {
  return e.name === "tab" ? { state: { tab: e.value } } : null;
}
```
