# Screens (`screen`, apiVersion 14) { #screens }

!!! note "Available with Kino 0.9.74"
    Available with Kino 0.9.74 (the next version, not published yet). An older Kino refuses these plugins with
    «Este plugin necesita una versión más nueva de Kino»; to keep reaching people on an older version use
    `enhancements` (see [Screens without raising your apiVersion](enhancements.md)).

Everything on this page needs `"apiVersion": 14`.

A plugin can own a **full-screen canvas inside Kino**: a mini-app. The person presses your entry in the menu (or a button
on your settings page), and what opens is a blank screen with Kino's title bar (your plugin's name and a close button) whose
whole body your JavaScript describes: columns, rows, cards, lists, images, text fields, dropdowns, forms, tabs, tables, Home's
own poster cards and rows, pop-ups. Kino draws it with Kino's look, on the phone (touch) and on the TV (the remote and its
focus), **from the same JSON**: the contract names no Android type and no pixel unit only one platform understands.

Three ideas carry the whole guide:

- **You describe, Kino draws.** `screen()` returns a tree of plain objects (nodes). Kino validates it, drops what is wrong
  with a log line (never a crash), and draws the rest. You never touch a view, a colour value or a font.
- **The state lives in Kino.** Your runtime closes after a while idle, so nothing you keep in a variable survives. Kino keeps
  the screen's state, hands it to every call, and calls `screen()` again whenever an answer changes it.
- **The person always gets out.** The close button and Back are Kino's and always work, whatever your code answers or while
  it is still running.

On an older Kino `kino.screen` is `undefined`. This page is the guide; every component, with its properties, a JSON tree,
its phone and TV behaviour and its limits, is in the reference: [Layout, content and actions](screen-components.md),
[Forms, pop-ups and navigation](screen-forms.md) and [Data, behaviour and limits](screen-reference.md). The
[gallery example](#examples) draws all of them on a device.

## A first screen { #first-screen }

`kino-plugin.json`:

```json
{
  "id": "hello-screen",
  "name": "Hola",
  "version": "1.0.0",
  "apiVersion": 14,
  "entry": "plugin.js",
  "hosts": ["example.org"],
  "capabilities": ["screen"],
  "screen": { "label": "Hola", "labelEn": "Hello", "icon": "star", "menuOpens": "screen" }
}
```

`plugin.js`:

```js
export async function screen({ state, lang }) {
  const children = [
    { type: "Text", text: "Hola", textEn: "Hello", style: "h1" },
    { type: "TextField", key: "name", labelText: "Tu nombre", labelTextEn: "Your name", onSubmitted: "greet" },
    { type: "ElevatedButton", labelText: "Saludar", labelTextEn: "Greet", onPressed: "greet" },
  ];
  if (state.greeting) children.push({ type: "Text", text: state.greeting, style: "h3", color: "primary" });
  return { type: "Column", padding: { compact: 16, expanded: 32 }, gap: 12, children };
}

export async function screenEvent({ name, state, lang }) {
  if (name !== "greet") return null;                 // the reserved "open" event comes first: nothing to load here
  const who = String(state.inputs.name ?? "").trim(); // every input's value, by its key
  if (!who) return { toast: lang === "es" ? "Escribe tu nombre" : "Type your name" };
  return { state: { greeting: (lang === "es" ? "Hola, " : "Hello, ") + who } }; // Kino merges it and calls screen() again
}
```

```
node sdk/validate.mjs .
node sdk/run.mjs . screen
node sdk/run.mjs --state '{"inputs":{"name":"Ana"}}' . screenEvent greet
node sdk/run.mjs --device tv . screen
```

A `screen` plugin needs no `resolve`, `search` or `home`: the capability may be its only one, and it adds **no consent line**
(it reaches nothing your `hosts` did not already). `hosts` still needs one entry when there is no `url` setting, even if the
screen never fetches (the calculator example names its docs site).

## The manifest's `screen` block { #manifest }

| Field | Rule |
| --- | --- |
| `label` | Required, 1 to 20 characters: the menu entry's name (`labelEn` the English one). |
| `icon` / `iconFile` | One of Kino's icon names (the 50 of the [icon table](screen-components.md#icon-names), `refresh` among them) or a 96×96 px PNG with a transparent background, at most 24 KB, never both. Not needed without `"menu"` in `opensFrom`. |
| `menuOpens` | What the menu entry opens: `"section"` (Kino's rows of cards, needs your `section`), `"screen"` (the canvas) or `"both"` (two entries, needs `section`). Default: `"section"` when you declare a `section` (nothing changes for an existing plugin), else `"screen"`. A target without its export is refused at install. |
| `opensFrom` | Where the screen opens from: `"menu"` (the icon: the TV sidebar, the phone's Inicio strip) and/or `"settings"` (a button at the top of your plugin's settings page). Default `["menu"]`, never empty. Without `"menu"` there is no icon and no entry: `icon`, `iconFile` and `menuOpens` are ignored. |
| `settingsButton` | `{ "label", "labelEn" }`, each 1 to 40 characters: that settings-page button's name (default Kino's «Abrir pantalla» / "Open screen"). |
| `settingsIn` | Where your settings show: `"settings"` (Kino's form in Ajustes), `"screen"` (only your screen: Kino hides its form in your tab, on your «Mis plugins» card and in a sync provider's Configurar while the screen can open, and those open your screen instead) or `"both"` (default). `"screen"` needs a way in (`menuOpens` `"screen"`/`"both"`, or `"settings"` in `opensFrom`); see [Settings inside a screen](#settings-in-screen). |
| `replaces` | `["categories"]`: your screen takes the place of your group in Kino's Categorías; see [`go`](#go). Needs the `browse` capability and the `categories` export. |
| `every` | Timers that run while the screen is open, like a tree root's [`every`](#timers). A bad one is dropped and logged, never refused. |
| `adult` | `true`: the entry shows only while the person's 18+ code is unlocked. |

Where the entry shows: on the TV sidebar after Categorías and the sections (the first 3 plugin screens directly, the others
under «Más pantallas»), and as a chip on the phone's Inicio strip; only for an enabled plugin that needs no setup, like a
`section`. With `opensFrom: ["settings"]` the plugin has no icon at all: its settings page shows the button at the top, and
with `settingsIn: "screen"` that button is all the page shows besides Kino's own switches (the form comes back whenever the
screen cannot open: screens switched off, 18+ locked, settings to fill). Back returns to the settings page. Kino keeps a
remote switch for every plugin screen: off, the entries hide at once and an open screen closes; the same switch stops
[rooms](rooms.md#room) and [jobs](jobs-and-shared.md#jobs).

## The exports: `screen` and `screenEvent` { #exports }

```js
export async function screen({ state, route, device, size, lang }) { return /* the root node */; }
export async function screenEvent({ name, arg, value, state, route, device, lang }) { return /* an answer, or null */; }
```

- **`screen` is a pure view.** Given the state, it returns the tree. Kino calls it when the screen opens, after every answer
  that carries a `state` patch, after a route change, and when the window changes size class (a rotation, a resize). Do no
  network work here: return what the state holds (a `Skeleton` while it loads).
- **`screenEvent` reacts.** Kino calls it when the person acts on a node that names an event. The first call after the
  screen opens is the **reserved event `open`**: load your data there (with `kino.fetch`, your cache), and answer a `state`
  patch. `open` is reserved: no node may use that name.
- **`state`**: Kino's copy, as JSON: your own keys, plus `inputs` (every input on screen by key, see
  [Actions, events and state](#state)) and `ui` (what Kino did locally: `hidden`, `enabled`, `open`).
  At most 64 KB. It lives for this opening only: closing the screen drops it, so keep what must survive in `kino.storage`.
- **`route`**: `{ name, params, args? }`, `{ name: "main", params: {} }` at the root. An answer's
  `route: { push: "detail", params }` goes one screen deeper inside your canvas, `{ pop: true }` back; Back pops a pushed
  route before it closes the canvas. `args` come from a [`go.screen`](#go) that opened it.
- **`device`** `"phone"`, `"tv"` or `"desktop"`; **`size`** `{ widthClass, heightClass, orientation }` with the Material
  window classes (`compact` under 600 dp, `medium` 600 to 839, `expanded` 840 and up); **`lang`** `"es"` or `"en"`.
  You may return a different tree per device, but [per-size values](#layout) usually do it better.
- **One runtime per plugin.** `kino.storage`, `kino.config`, cookies and secrets are shared with your other exports, so a
  catalog (`home`, `search`...) can feed the screen and the reverse; calls are serialised with your other calls.
- **Failures.** A call that times out (20 s), or a first render Kino cannot draw, shows the screen's error state (your
  name, «Reintentar», close), never a blank screen; later, a render over budget keeps the last good frame and three failures
  in a row show the error state. A screen's timeout never counts toward "No responde": a broken mini-app never switches off
  your catalog, and the reverse.

**Mixing.** `screen` is one capability among the others, never a kind of plugin: one manifest may declare a catalog,
`channels`, `subtitles`, a `section`, the player `panel` and `screen` together. The exports have distinct names, so nothing
collides; with `menuOpens: "both"` the person gets your section and your screen as two entries.

## Nodes and widgets { #nodes }

Every node is `{ type, ...properties }`. These properties work on any node (the full list is in
[common properties](screen-reference.md#common-properties) and [shared properties](screen-reference.md#shared-properties)):

- `key`: its id, unique on the screen. **Required on inputs** (it names the value in `state.inputs`), on a `popup`, an
  `ExpansionTile` and a dismissible `MaterialBanner`; other nodes get a generated `auto-<n>` key (the `auto-` prefix is
  Kino's: do not use it). A missing or repeated input key drops the node.
- `onTap`, `onLongPress` (a button's tap is `onPressed`), `arg`: what a press does, see
  [Actions, events and state](#state).
- `enabled`, `hidden`: the node's starting look; local `ui` operations and later trees change it.
- `devices` (`["tv"]`, `["phone", "desktop"]`) and `sizes` (`["expanded"]`): the node is drawn only there. An unknown name
  drops the node.
- `testKey` (1 to 64 characters): for tests and tooling, never drawn.
- Shared by a family of nodes, one meaning everywhere: `autofocus` (a node that takes focus: where focus goes when a render
  left it nowhere; the TV's remote lands there), `selected` (a button or a card with `onTap`: Kino's selected look; `ui`
  `set` and `toggle` with `prop: "selected"` change it) and `badge` (`"dot"` or `{ text, textEn?, color? }` on a button, a
  card with `onTap`, a `TabBar` tab and a panel's drawer tab).
- `visible: false` (hides it, as `hidden: true`) and `tooltip` (`tooltipEn`; a node that does something: Kino's hint on a
  long press, after a moment of TV focus and for a screen reader, at most 80 characters, never essential information)
  ([tooltip](screen-components.md#tooltip)).
- The style properties of the [next section](#layout), among them `alignSelf`, `textAlign`, `border`, `elevation`,
  `background`, `minWidth`/`maxWidth`/`maxHeight`, `positioned` on a `Stack`'s child, `opacity` and `animate`.

Kino's own texts are always its own; yours take an English twin with the `En` suffix (`text`/`textEn`,
`labelText`/`labelTextEn`, `title`/`titleEn`...), picked by the person's language.

| Name | Older name | What it is | Its own properties | As an input |
| --- | --- | --- | --- | --- |
| `Column` | `col` | its children in a column |  |  |
| `Row` | `row` | its children in a row; `wrap: true` is the twelve-column layout | `stackOnNarrow`, `wrap` |  |
| `Stack` | `box` | its children stacked on each other |  |  |
| `Card` | `card` | Kino's card around its children | `variant`, `flush` |  |
| `Spacer`, `SizedBox` | `spacer` | empty space (`SizedBox` its `width`/`height`, `Spacer` its `flex` share) |  |  |
| `Divider` | `divider` | a thin rule |  |  |
| `SingleChildScrollView` | `scroll` | its children, scrolling | `direction` |  |
| `GridView` | `grid` | its children in `columns` | `columns` |  |
| `Text` | `text` | plain text (`text`, `textEn`) | `style`, `maxLines`, `bold`, `time`, `timeFormat` |  |
| `Image` | `image` | an https picture on a public host (`url`, `alt`, `fallback`) | `aspect` |  |
| `Icon` | `icon` | one of Kino's icons (`name`) |  |  |
| `Badge` | `badge` | a small label (`text`) |  |  |
| `LinearProgressIndicator` | `progress` | a progress bar (`value`, `labelText`) |  |  |
| `CircularProgressIndicator` | `loading` | Kino's spinner (`text`) |  |  |
| `ListView` | `list` | a lazy list of `items` (nodes), `empty` when there are none, load more | `columns`, `stickToBottom`, `onEndReached`, `loadingMore`, `done`, `newItemsHint` |  |
| `Button`, `ElevatedButton`, `TextButton`, `IconButton` | `button` | a button (`labelText`, `icon`, `onPressed`, `confirm`, `submit`) | `variant` |  |
| `TextField` | `textInput` | a text field (`kind`, `maxLength`, `value`, `onSubmitted`; a `trailingIcon` inside it with `trailingLabel` and `onTrailingTap`; `obscureText` masks it) | `trailingIcon`, `obscureText` | value in `state.inputs`; form rules: `required`, `minLength`, `maxLength`, `pattern`, `errorText`; `bind` holds a `text` setting |
| `TextField` (several lines) | `textArea` | a text field of several lines (`multiline: true` or `maxLines` above 1) |  | value in `state.inputs`; form rules: `required`, `minLength`, `maxLength`, `pattern`, `errorText`; `bind` holds a `text` setting |
| `DropdownButton` | `dropdown` | a choice among `options` |  | value in `state.inputs`; form rules: `required`, `errorText`; `bind` holds a `select` or `text` setting |
| `Switch` | `toggle` | an on/off switch |  | value in `state.inputs`; form rules: `required`, `errorText`; `bind` holds a `toggle` setting |
| `Checkbox` | `checkbox` | a check box |  | value in `state.inputs`; form rules: `required`, `errorText`; `bind` holds a `toggle` setting |
| `RadioGroup` | `radioGroup` | one choice among `options` |  | value in `state.inputs`; form rules: `required`, `errorText`; `bind` holds a `select` or `text` setting |
| `Slider` | `slider` | a number between `min` and `max` (`step`) |  | value in `state.inputs`; `bind` holds a `text` setting |
| `Chips` | `chips` | one or several (`multiple`) choices among `options` |  | value in `state.inputs`; form rules: `required`, `minLength`, `maxLength`, `errorText`; `bind` holds a `select` or `text` setting |
| `TabBar` | `tabs` | a row of tabs (`tabs`, `value`, `onChanged`); its value is NOT in `state.inputs` |  |  |
| `emptyState` | `emptyState` | Kino's empty state (`title`, `text`, `icon`) |  |  |
| `errorState` | `errorState` | Kino's error state (`title`, `text`, `icon`) |  |  |
| `titleCard` | `titleCard` | one Home poster card for an `item` | `size` |  |
| `titleRail` | `titleRail` | a Home row: `title`, `items`, `ref` for its "Ver más" | `size`, `onEndReached`, `loadingMore`, `done` |  |
| `titleGrid` | `titleGrid` | Home cards in a grid (`items`) | `columns`, `onEndReached`, `loadingMore`, `done` |  |
| `heroCard` | `heroCard` | a section's banner: `title`, `text`, `image`, at most 2 `buttons` |  |  |
| `popup`, `AlertDialog`, `BottomSheet`, `PopupMenuButton` | `popup` | a pop-up declared in the tree (`key`, `kind`), opened with a `ui` operation | `onClose`, `buttons`, `items`, `anchor` |  |
| `Form` | `form` | fields with one submit, checked by Kino before your code (`onSubmitted`) |  |  |
| `settings` | `settings` | Kino's own settings form for your plugin (`keys`, `onSaved`) | `onSaved` |  |
| `MaterialBanner` | `banner` | a line of news in a role's colour (`role`, `title`, `text`, `action`, `dismissible`) |  |  |
| `ExpansionTile` | `accordion` | sections that open and close (`key`, `items`, `multiple`) |  |  |
| `Skeleton` | `skeleton` | a placeholder while something loads | `shape`, `lines` |  |
| `QrImage` | `qr` | a QR code Kino draws on the device (`value`; `expiresInMs` or `expiresAt` with Kino's countdown, `onExpire`, `renewBeforeMs`) | `size`, `expiresInMs`, `expiresAt`, `renewBeforeMs`, `onExpire` |  |
| `NumberStepper` | `stepper` | a number drawn `[ − ] value [ + ]` (`min`, `max`, `step`, `decimals`, `editable`) |  | value in `state.inputs`; form rules: `required`, `errorText`; no `bind` |
| `DataTable` | `table` | a table of `TableRow`s holding `TableCell`s (`text` or `children`, `colSpan`, `crossAxisAlignment`) | `header`, `wrap`, `zebra`, `columns` |  |
| `FloatingActionButton` | `fab` | Kino's floating button over the screen's bottom (`icon`, `labelText`, `onPressed`), one per screen | `fabPosition` |  |
| `ListTile` | `listTile` | one row of a list: `leading`, `title`, `subtitle`, `trailing`, one press | `dense`, `leading`, `trailing`, `subtitle` |  |
| `CircleAvatar` | `avatar` | a circle with a picture, initials or an icon (`image`, `text`, `icon`, `backgroundColor`) | `borderRadius`, `backgroundColor` |  |
| `PageView` | `pageView` | pages swiped across with Kino's dots (`initialPage`, `onPageChanged`, `autoPlayMs`); `viewportFraction` < 1 is a carousel | `viewportFraction`, `padEnds`, `initialPage`, `onPageChanged`, `autoPlayMs` |  |
| `Scaffold` | `scaffold` | a screen's root with an `appBar`, a `body`, a `floatingActionButton` and a `bottomNavigationBar` (drawn in layout fill) |  |  |
| `AppBar` | `appBar` | a Scaffold's top bar: `title`, `leading`, up to four `actions`, a `bottom` TabBar |  |  |
| `NavigationBar` | `navigationBar` | a Scaffold's bottom bar of 2 to 5 `items` (`value`, `onChanged`) |  |  |
| `steps` | `steps` | a setup flow in Kino's look: `items` done, current (open, its `children`) or pending; `onStepTap` lets a done step be pressed | `items`, `onStepTap` |  |

A masked `TextField` (`obscureText: true`) is the exception to its row: it binds only to a `password` setting (see
[secret fields](screen-forms.md#secret-field)). The `Scaffold`'s bar sits under Kino's own title bar, which no plugin
replaces or covers ([Scaffold](screen-components.md#scaffold)).

An unknown `type` is dropped with a log line and the rest is drawn. **Feature-detect before you rely on a widget a newer
Kino adds**: `kino.screen.names` lists the type names this Kino draws as this guide spells them, `kino.screen.widgets` the
same by their older names, and `kino.screen.version` is the screen contract's own number (1 for now).

```js
const has = (name) => typeof kino.screen === "object" && kino.screen.names.includes(name);
const table = has("DataTable") ? { type: "DataTable", /* ... */ } : { type: "Column", /* the same rows as text */ };
```

Not in this version: pull-to-refresh, segmented buttons, autocomplete and combo boxes, date and time pickers, a range
slider, a rating, dismissible and reorderable list items, rich text, charts, continue-watching and channel cards and file
inputs.

## Flutter-style names and the older ones { #flutter-names }

Authors who know Flutter find the same names: `Column`, `Row`, `Text`, `TextField`, `Switch`, `ListView`, `AlertDialog`,
and the properties `width`, `height`, `mainAxisAlignment`, `crossAxisAlignment`, `flex`, `borderRadius`, `onPressed`,
`onChanged`, `onSubmitted`, `hintText`, `labelText`. They are the documented spelling (this guide, `kino.d.ts`, the
examples). The older lowercase names (`col`, `row`, `textInput`, `w`, `justify`, `onTap` on a button...) stay accepted as
aliases: both spellings read to the same tree. The full alias table is in
[Flutter-style names](screen-reference.md#flutter-style-names). The rules:

- Give one spelling. When a node has both, the Flutter-style one wins and the clash is logged (a Flutter-style `null`
  counts as absent).
- A type that implies something sets it: `ElevatedButton`, `TextButton`, `IconButton` are a `Button` with `variant`
  `primary`, `text`, `icon`; `AlertDialog`, `BottomSheet`, `PopupMenuButton` are a `popup` with `kind` `dialog`, `sheet`,
  `menu`. A different value you give is replaced, logged. `secondary` has no other name: `{ type: "Button", variant: "secondary" }`.
- A `TextField` with `multiline: true` or a `maxLines` above 1 in any size class takes several lines.
- `onPressed` is a button's only; elsewhere it is ignored, logged.
- Only nodes are renamed. The fields of an answer's `dialog`, `sheet` and `menu`, a dialog's `buttons`, a menu's `items`,
  a banner's `action` and the entries of `options` and `tabs` keep `label` and `onTap`.
- Kino's own components keep their names (`titleCard`, `titleRail`, `titleGrid`, `heroCard`, `emptyState`, `errorState`,
  `popup`, `settings`).
- Flutter's `Stepper` is another widget (a wizard): that name is unknown here (dropped); the `[−] n [+]` control is
  `NumberStepper`. `OutlinedButton` and `Wrap` do not exist (a `Row` with `wrap: true` is the twelve-column layout).
- **Log lines name the older spelling** ("button dropped", "textInput needs a key"), the one Kino reads internally.

## Layout, style and per-size values { #layout }

Style comes from fixed scales, never from free values; a value off its scale is dropped and logged.

| Property | Older name | Values |
| --- | --- | --- |
| `padding` |  | 0, 4, 8, 12, 16, 24, 32, 48, or per side (`x`, `y`, `top`, `end`, `bottom`, `start`) |
| `margin` |  | 0, 4, 8, 12, 16, 24, 32, 48, or per side |
| `gap` |  | 0, 4, 8, 12, 16, 24, 32, 48 |
| `borderRadius` | `radius` | `none`, `small`, `medium`, `large`, `full`, or per corner (`topStart`, `topEnd`, `bottomStart`, `bottomEnd`; an omitted one `medium`) |
| `width` | `w` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `height` | `h` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `minHeight` | `minH` | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `fill` |  | `true`: the parent's whole width |
| `flex` | `weight` | 1 to 12: its share of a `Row` or `Column` |
| `crossAxisAlignment` | `align` | `start`, `center`, `end`, `stretch`: across the main axis (on a `Text`, the paragraph) |
| `mainAxisAlignment` | `justify` | `start`, `center`, `end`, `spaceBetween`, `spaceAround`: along the main axis |
| `color` |  | `primary`, `secondary`, `surface`, `muted`, `warning`, `error`, `onPrimary`, `primaryContainer`, `surfaceVariant` |
| `span` |  | 1 to 12 or `"auto"`, in a `Row` with `wrap: true` |
| `offset` |  | 0 to 11, in a `Row` with `wrap: true` |
| `maxWidthFraction` |  | 0.25 to 1 in steps of 0.05: at most that share of the parent's width (exactly, with `fill`) |
| `alignSelf` |  | `start`, `center`, `end`, `stretch`: this child across its `Row` or `Column` |
| `textAlign` |  | `start`, `center`, `end`, `justify`: a text's paragraph |
| `border` |  | `{ width?, color? }` on a box: 0 to 8 dp, a colour role |
| `elevation` |  | 0 to 24 on a `Card` or a `Stack`: Kino's shadow |
| `background` |  | a colour role: a box's fill |
| `minWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `maxWidth` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `maxHeight` |  | 16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640 |
| `positioned` |  | `{ top?, left?, right?, bottom?, width?, height? }` on a `Stack` child, dp or `"25%"` |
| `opacity` |  | 0 to 1 |
| `animate` |  | `{ duration?, curve? }`: changes glide |

Each of these is described in detail in [Style](screen-reference.md#style).

**Every style or layout property of every node may be a per-size map**: `{ compact?, medium?, expanded? }`. A class missing
from the map takes the next smaller one that is present, else Kino's default. Kino resolves the maps before drawing, so a
renderer only ever sees plain values ([per-size values](screen-reference.md#per-size-values)):

```js
{ type: "GridView", columns: { compact: 1, medium: 2, expanded: 3 }, gap: { compact: 8, expanded: 16 }, children }
```

Two consequences: a node whose value is invalid **in any one size class is dropped whole** (in every class), and a
per-size map that mixes classes with other keys is dropped. Use `devices`/`sizes` to draw a node only somewhere.

- `crossAxisAlignment` on a container aligns its children across its main axis (a `Row`'s height, a `Column`'s width); on
  a `Text` it is the paragraph's alignment. `stretch` in a plain `Row` draws as `start` (rows have no intrinsic measuring).
- **The canvas does not scroll by itself**: a root `Column` taller than the window is cut. Put a long page in a
  `SingleChildScrollView` (or a `ListView`, which is lazy). A `ListView` or a rail inside something that scrolls the same
  way is drawn all at once (and capped: 60 titles).
- **The twelve-column layout** (Bootstrap's grid, [twelve-column row](screen-components.md#wrap-row)): a `Row` with
  `wrap: true` lays its children on lines of 12 columns. Each child takes its `span` (1 to 12, or `"auto"`, the default)
  after its `offset`; one that does not fit what is left of a line starts the next; the `auto`s of a line share what the
  fixed spans leave, an `auto` button, `Badge` or `Icon` never under its own width (it starts the next line instead, its
  label never cut); `gap` goes between cells and between lines; a hidden child leaves no gap. A line is as tall as its
  tallest cell and, by default (or with `crossAxisAlignment: "stretch"`), every `Card` or container cell (`Column`, `Row`,
  `Stack`, `GridView`, `Form`) without a fixed `width`/`height` is drawn that tall, so a grid of cards is even; a button, a
  badge or an image with a size keeps its own height at the top; `start`, `center` or `end` keep every cell at its own
  height. A line holding something that cannot be measured (a lazy list, a rail, tabs, a table, the settings form) is left
  unstretched. In a wrapping row `flex`, `mainAxisAlignment` and `stackOnNarrow` mean nothing; a child takes its natural
  width unless `fill: true`. `span` and `offset` anywhere else are ignored, logged. Inside a sideways scroll the twelve
  columns are laid out on 600 dp.
- `Card` with `flush: true` drops its own padding and clips its children to its rounded shape, so an `Image` at its top
  runs edge to edge; pad the text children yourself ([Card](screen-components.md#card)).

A card grid, one card per line on a phone, two on a medium window, three on a TV:

```js
{ type: "Row", wrap: true, gap: 12, children: stories.map((s) => ({
  type: "Card", key: "story-" + s.id, flush: true, span: { compact: 12, medium: 6, expanded: 4 },
  onTap: { event: "read", arg: s.id },
  children: [
    // No picture: leave url out and the fallback is drawn (an empty url draws it too, but logs).
    { type: "Image", ...(s.image ? { url: s.image } : {}), aspect: "16:9", alt: s.title,
      fallback: { type: "Stack", color: "surface", children: [{ type: "Text", text: s.source, style: "h3" }] } },
    { type: "Column", padding: 12, gap: 4, children: [
      { type: "Text", text: s.title, style: "h4", maxLines: 3 },
      { type: "Text", text: s.source, style: "caption", color: "muted" },
    ] },
  ],
})) }
```

An `Image` takes only https URLs on a public host (no declaration needed, as every image in Kino). Its `fallback` is one
node drawn in the image's box when the picture fails or there is no `url` (with a fallback, an image whose `url` is missing
or refused is kept): only `Column`, `Row`, `Stack`, `Card`, `Spacer`, `SizedBox`, `Divider`, `Text`, `Icon`, `Badge`,
`Skeleton` and `Image`, at any depth, and nothing in it is pressed. Without one a failed picture shows Kino's mark
([Image](screen-components.md#image)).

## Text and colours { #text-colours }

- A `Text`'s `style` is `h1` to `h5`, `p` (the default), `caption` or `label`; the older names `display`, `title`,
  `subtitle` and `body` read as `h1`, `h3`, `h4` and `p`, and an unknown one is `p`, logged. Kino maps them onto its own type
  scale (on the phone `h1` is headlineLarge down to `p` bodyMedium), and on the TV every step grows by 1.25, so the order
  holds at ten feet. The person's font scale is respected.
- Headings are bold already; `bold: true` makes any style bold, `bold: false` never thins a heading. `maxLines` cuts with
  an ellipsis.
- **A plugin never sets a font family, a size, italic or a free colour.** `color` takes a role (`primary`, `secondary`,
  `surface`, `muted`, `warning`, `error`, `onPrimary`, and the container roles `primaryContainer` and `surfaceVariant`,
  whose box gives its text the matching on-colour), painted with Kino's palette (your manifest's `theme` tints
  `primary` where it passes the contrast rules). A role that would not read on its surface is nudged toward the surface's
  own text colour until it does (4.5:1); `onPrimary`, which cannot read on a plain surface, falls back to the default,
  logged once per node.
- Text is plain: nothing in it is a link or markup, newlines are kept. Right-to-left follows the app.

The details are in [Text](screen-components.md#text) and [Colours](screen-components.md#colors).

## Actions, events and state { #state }

What a press does is an **action**: a node's `onTap`, `onLongPress`, `onPressed`, an input's `onChanged` and `onSubmitted`,
a form's `onSubmitted`. Four shapes:

```js
onTap: "refresh"                                        // an event for screenEvent; its arg is the node's arg
onTap: { event: "read", arg: "story-42" }               // an event with its arg (at most 4,096 characters)
onTap: { ui: [{ toggle: "details" }], event: "seen" }   // local operations first (no plugin call), then the event
onTap: { go: { title: { ref, kind: "movie" } } }        // somewhere in Kino, no plugin call (also { ui, go } and a bare go object)
```

**Local `ui` operations** run at once, with no round trip, on nodes of the same screen by `key`: `show`, `hide`,
`toggle`, `enable`, `disable`, `focus`, `set` (`{ set: { key, value } }`: a string up to 2,000 characters, a boolean, a
number, or up to 500 strings for `Chips`), `clear` (an input's value), and `open` / `close` (a declared pop-up). At most 8
per action; an unknown key is ignored, logged. What they do is kept in `state.ui` (`hidden` and `enabled` by key, `open` for
each `ExpansionTile`'s open items), so you see it on your next call and a re-render keeps it; you may set those keys
yourself in a `state` patch. A button's or a tappable card's `selected` is the one exception: `{ toggle: key, prop:
"selected" }` flips it and `set` with `true` or `false` sets it, kept only until your next render says it again
([local `ui` operations](screen-components.md#ui-ops)).

**`screenEvent`** gets `name` (the event), `arg`, `value` (the value of the input that fired), `state`, `route`, `device`
and `lang`.

**`state.inputs`** holds every input on screen by key: what the person or your code set, else the value the tree shows
(filled in on every call, never stored, so a tree that changes a default is what the next call carries). Types: a
`TextField` a string, `Switch` and `Checkbox` a boolean, `Slider` a number, `DropdownButton` and `RadioGroup` the option's
value (or `null`), `Chips` a value (or a list with `multiple`), `NumberStepper` its value as text (`"2.50"`). To set what a
field shows (clear a search box, prefill a form, pick an option), answer `{ state: { inputs: { <key>: value } } }`: it
shows at once and fires no event. **A `TabBar` is not an input**: its `value` is not in `state.inputs`; keep the chosen tab
from its `onChanged` event's `value` in a state key of yours.

How events flow:

- One event at a time per screen; the next waits (at most 8 waiting) and they are spaced 100 ms apart, never dropped for
  coming fast. A newer `onChanged` of the same field replaces an older one still waiting. An answer that arrives after the
  screen closed is dropped.
- On the phone a text field's `onChanged` is debounced (300 ms); on the TV it fires once, when the person accepts the text
  dialog ([On the TV](#tv-focus)).
- A `state` patch is merged key by key (`null` removes a key) into the state your answer was computed from; a patch that
  would take the state over 64 KB is refused and the old state kept, logged. `screen()` runs again only after an answer
  that carries `state` (or a route change).
- A call that times out shows the error state at once. A call that throws or answers something Kino cannot read counts:
  three in a row show the error state (the first one already, while there is no frame yet); a good answer resets the count.

## What an answer may carry { #answers }

Every field is optional; `null` means nothing to do.

| Field | What it does |
| --- | --- |
| `state` | A patch merged into the state; then `screen()` runs again. |
| `toast` / `toastEn` | A short message at the bottom: a string, or `{ text, textEn?, role?, action?: { label, labelEn?, event, arg? }, ms? }` (`ms` 2,000 to 8,000, default 3,500). One at a time: a newer one replaces it; its action sends its event once. |
| `dialog`, `sheet`, `menu` | A pop-up built by the answer ([Pop-ups](#popups)). With more than one, the dialog wins, then the sheet. |
| `ui` | Local operations, the same as an action's (at most 8): `{ open: "story" }` opens a declared pop-up, `{ close: "story" }` closes it. |
| `go` | Somewhere in Kino ([`go`](#go)). |
| `route` | `{ push: "<name>", params? }` or `{ pop: true }`: a screen of your own deeper in the canvas. |
| `focus` | The `key` of the node that should take focus. |
| `close` | `true` closes the screen. |
| `config` | Your settings to write ([Settings inside a screen](#settings-in-screen)). |

Some answers are not the person's, so they keep less: the answer to the reserved `open` drops its `go` (except
`go.screen`), so opening a screen never plays or pushes anything by itself; a [timer's](#timers) keeps only `state`,
`toast`, `close` and `config`; a load-more's never changes the route; a pop-up's `onClose` keeps no pop-up, `focus`, `go` or
`route`. Dropped fields are logged.

## Pop-ups, toasts and banners { #popups }

One pop-up at a time; opening another replaces it; Back closes it before anything else; it never covers Kino's title bar,
and Kino always draws its close: an X alone (a screen reader says «Cerrar», «Close» in English). Two ways to show one:

- **From an answer**: `dialog` (`title`, `body` as text or nodes, at most 3 `buttons`; a button without `event` closes
  it), `sheet` (a bottom sheet on the phone, a side drawer on the TV; `body` text or nodes) or `menu` (1 to 8 `items`:
  `label`, `icon`, `onTap`; the menu closes first). An answer's pop-up never holds a `Form`, an `ExpansionTile`, `bind` or
  the `settings` node. See [Dialog](screen-forms.md#dialog), [Sheet](screen-forms.md#sheet) and
  [Menu](screen-forms.md#menu).
- **Declared in the tree**: a `popup` node (`AlertDialog`, `BottomSheet`, `PopupMenuButton`) with a `key`, hidden until a
  `ui` operation opens it. Its body is part of your tree: it can hold forms and inputs, and your next render updates it
  ([declared pop-ups](screen-forms.md#popup)).

The robust way to open a declared pop-up with new content is **from the answer**, not from the tap: the tap sends the event,
the answer patches the state and carries `ui: [{ open: "story" }]`; Kino opens it once the new tree is drawn, so the pop-up
never shows the last story's body (Back before then cancels it). After the pop-up's own Save, close it the same way:

```js
// tap:            { type: "Card", onTap: { event: "read", arg: s.id }, ... }
// in screenEvent: case "read":  return { state: { reading: arg }, ui: [{ open: "story" }] };
//                 case "saved": return { state: { terms }, ui: [{ close: "addTerm" }], toast: "Guardado" };
{ type: "AlertDialog", key: "story", onClose: "storyClosed", children: [/* built from state.reading */],
  buttons: [{ label: "Cerrar", labelEn: "Close" }] }
```

- `onClose` (an event name, or `{ ui?, event?, arg? }`) runs after the **person** dismissed the pop-up (Back, Kino's close,
  a tap outside), never after its own buttons, a menu item, your `close` or another pop-up replacing it. Use it to clear
  `state.reading`. Its event is no press: no `kino.qr.scan`, no `go.titleByIds` or `go.url`, and its answer opens no pop-up,
  moves no focus and goes nowhere (dropped, logged); a `go`, `open` or `focus` inside `onClose` itself is dropped.
- `title` is optional: with one, Kino's X ends the title's row; without one (a blank one counts as none) no empty row is
  drawn and the X starts (left) the bottom row, your buttons together at its end (right), so the X never sits beside your
  main action; buttons that do not fit wrap to more lines, still at the end. Do not pass `" "` to hide it.
- A pop-up whose node is `hidden` cannot open. Whether a pop-up is open is not in `state.ui`.
- A menu is not anchored to what opened it: on the phone it is an action list at the bottom of the canvas, on the TV it is
  centred.
- On the TV a long body scrolls with Down and Up; keep a button at its end (the D-pad lands there after the text).

A **`MaterialBanner`** is a line of news across the screen in Kino's colour for its `role` (`info`, `warning`, `error`,
`success`), with an optional `title`, one `action` button and, when `dismissible` (it needs a `key`), Kino's close: that
hides it at once (`state.ui.hidden`) and sends the event `dismiss` with the banner's key as `arg`
([MaterialBanner](screen-components.md#banner)). A **toast** with an `action` is reachable on the TV without stealing
focus: Down from the bottom of the tree reaches it (Up or Back leaves it), and the remote's Menu or Play/Pause key runs it;
the toast says so in words ([Toasts](screen-components.md#toast)).

## Lists, load more and Kino's own cards { #lists }

A `ListView` is lazy: give it `items` (nodes, each with a `key` of its own, at most 500), an `empty` node for no items, and
`columns` for a grid of items. Load more with `onEndReached` on a `ListView`, `titleRail` or `titleGrid`
([ListView](screen-components.md#list-view)):

```js
{ type: "ListView", items, onEndReached: { event: "more" }, loadingMore: state.loading === true, done: state.done === true }
```

Kino sends it once when the last item comes into view, and again only after you answered, the tree you asked for is drawn,
and the list grew or its `loadingMore` went from true to false (a load that finished with nothing new). Never more than once
a second per list, never while the screen is hidden (a title page or the player on top, the background: it asks once the
screen shows again), never for an empty list, never at 500 items (or 60 for a rail or grid drawn all at once). `loadingMore:
true` draws Kino's spinner after the items, `done: true` stops asking. Two consequences: a timer that turns `loadingMore`
off on every tick with nothing new makes Kino ask again once per tick, and a list a timer's render shrinks never asks again
until the person acts.

**Kino's own components** take data, never styling, in the very shape a `home` or `browse` row returns (`KinoItem`: `id`,
`ref`, `title`, `kind`, `poster`, `backdrop`, `year`, `rating`, `badges`, `progress`, `adult`), read by the same rules: a
series needs your `episodes` capability, posters and backdrops are https only (else Kino's placeholder), and 18+ items show
only while the person's 18+ code is unlocked.

- `titleCard` (one Home poster card; `size` small, medium or large), `titleRail` (a Home row with a `title` and, with a
  `ref`, its "Ver más"), `titleGrid` (cards in `columns`, default 3), `heroCard` (a section's banner: `title`, `text`, an
  https `image`, at most 2 buttons). See [titleCard](screen-components.md#title-card),
  [titleRail](screen-components.md#title-rail), [titleGrid](screen-components.md#title-grid) and
  [heroCard](screen-components.md#hero-card).
- A card's tap opens its title the way Home's card does, with that very item, so "Continuar viendo", the saved lists and
  the progress know it; `onTap` may replace it with an event, a `go` or `ui` operations. An item's `open: { screen }` starts
  your screen again at that route instead.
- At most 1,000 titles in a tree, and 60 in a grid or rail drawn all at once (inside a scroll, a list, a pop-up or a table
  cell).

## Forms and validation { #forms }

A `Form` groups fields and gives them one submit, **checked by Kino before anything reaches your code**
([Form](screen-forms.md#form), [Validation](screen-forms.md#validation)):

```js
{ type: "Form", key: "contact", onSubmitted: "send", children: [
  { type: "TextField", key: "email", kind: "email", labelText: "Correo", labelTextEn: "Email", required: true,
    pattern: "^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$", errorText: "Revisa el correo", errorTextEn: "Check the email" },
  { type: "TextField", key: "msg", labelText: "Mensaje", labelTextEn: "Message", multiline: true, maxLength: 500, required: true },
  { type: "ElevatedButton", labelText: "Enviar", labelTextEn: "Send", submit: true },
] }
```

- Fields: `TextField` (`required`, `minLength`, `maxLength`, `pattern`, `errorText`), `DropdownButton`, `Switch`,
  `Checkbox`, `RadioGroup`, `NumberStepper` (`required`, `errorText`), `Chips` (`required`, and `minLength`/`maxLength`
  count the chips picked). `required` means a text not blank, a choice made, a toggle on, a chip picked; an empty field
  that is not required passes every check. `errorText`/`errorTextEn` is what the person reads under a failing field, else
  Kino's own text; a `RadioGroup`'s or `Chips`' error shows on the group.
- The button with `submit: true` submits (its own `onPressed` is ignored); it is off while a required field is empty. An
  invalid form never calls your code: the errors show under each field and focus goes to the first. A valid one runs the
  form's `onSubmitted`, whose `value` is every field's value by key.
- **Enter does not submit a form**, and a field's own `onSubmitted` inside a form runs without the form's check. Rules on a
  field outside a form are not used. A form without `onSubmitted` is dropped; forms do not nest (the rule is strict:
  rewrite a nested form as two siblings); an answer's pop-up takes none.
- Values of fields that are `hidden` or disabled are still sent, unchecked; a required field in a hidden `TableRow` is not
  checked; a required field in a closed `ExpansionTile` item does not keep the button off, but the submit checks it and, if
  it fails, opens the item and focuses it. A `NumberStepper` always has a value, so its `required` always passes.
- **The pattern engine is Kino's own** (a linear-time matcher, the same in the app and the kit), never the platform's regex,
  so a hostile pattern cannot freeze the device. A pattern (at most 200 characters) must match the **whole** value, in a
  safe subset: literals, `.`, `^`, `$`, `|`, groups `( )` and `(?: )`, classes `[...]`, the escapes `\d \D \w \W \s \S \b
  \B \n \r \t` and escaped punctuation, the quantifiers `* + ? {n} {n,} {n,m}` (counts up to 1,000, optionally lazy), which
  may nest. No backreferences, no lookarounds. The meanings are ASCII: `\d` is `[0-9]`, `\w` `[A-Za-z0-9_]`, `\s` ASCII
  whitespace, `.` any character but a newline. A pattern may expand to at most 500 steps once its counts are expanded, so
  `[a-z]{1,600}` is refused: write `[a-z]+` and set `maxLength: 600`. A pattern outside the subset is dropped, logged (the
  field still checks its other rules). One submit runs at most 16 patterns and 4,000,000 matcher steps; past either, the
  remaining patterns pass. Kino's verdict is the one that counts: check again in your code only what your own logic needs
  ([Patterns](screen-forms.md#pattern)).

## Settings inside a screen: `settings`, `bind` and `config` { #settings-in-screen }

Your screen can be your plugin's settings window, or hold it as one tab of a bigger interface. The values stay your real
settings (the same store, the same sync between the person's devices, read with `kino.config`); nothing is copied to
`kino.storage`. The reference is [settings node](screen-forms.md#settings-node) and
[bind and config](screen-forms.md#bind-and-config).

- **The `settings` node** draws Kino's own settings form for your plugin, the very one Ajustes shows, on phone and TV:
  every setting type, `devices`, both languages, validation, Kino's fields for secrets and its buttons for actions (an
  `action` runs as it does there), "Enviar a otro aparato", its own save. `keys: [...]` shows only those settings, in that
  order. It sends you no event and your code never sees what is typed in it (its `onSaved` only tells you the person
  saved). Each setting shows at most once per screen, so several `settings` nodes are fine. Never inside a `Form` or an
  answer's pop-up.
- **`bind: "<settingKey>"`** on a field shows the stored value when the screen opens and writes the person's change back
  itself: a choice on change, a text on commit (the keyboard's action, focus leaving it, the TV dialog's accept), never per
  keystroke, only when it differs; you still get the field's events. What each field may hold is in the widget table's last
  column. A plain settings tab needs no JavaScript at all.
- **`config: { <settingKey>: value }`** in an answer writes settings from your code: only keys your manifest declares, at
  most 32 per answer, each value fitting its type (`text` a string, blank or `null` empties it unless required; `toggle` a
  boolean; `select` one of its option values; `list` an array of records of its fields; `password` a string).
- **A `password`** is kept exactly as given (never trimmed); `null`, `""` or blanks empty it (never a `required` one); at
  most 500 characters. A screen never reads one back (`bind` never prefills it, `state` never holds it) and Kino never
  writes its text in a log line, only its key. Bind one only with a masked field
  ([secret fields](screen-forms.md#secret-field)).
- **Never from a screen:** a `url` setting (an address the person stores becomes a server your plugin may reach, the home
  network included, so only the person types one, in the `settings` node), an `action` or a `help` setting, a value holding
  one of your sealed secrets, a `list` write that adds an address to a `url` field (entries may be removed, reordered or
  retitled), and a setting with [`unlockWith`](settings-form.md#unlock-with) (the 18+ code guards it) moved away from its default (a field never binds one;
  the `settings` node shows it and asks the code). All dropped, logged.
- **Pace:** each setting is written at most once every 500 ms per screen (the newest value wins, the last always lands, even
  when the screen closes mid-write); a timer's answer writes each at most once a minute. `kino.config` in the render an answer
  asked for may still read the previous value of a key written less than 500 ms before; when you need the new value at once,
  read it from your own state.
- **What a write costs:** every write restarts your runtime so `kino.config` reads the new value. A write of only toggles and
  selects keeps your plugin's web session (cookies); any other write is Kino's full Guardar, and the session is forgotten
  (a cookie login logs out).

## Where a screen sends the person: `go` { #go }

A node's action or an answer may carry `go`: one of twelve shapes, **always into this plugin's own content or one of Kino's
own pages**. No shape names an intent or an app, and only `liveChannel` names another plugin (an En vivo provider, for a
plugin whose player tab declares `"kinds": ["live"]`); anything else is dropped. Each shape has its own entry in the
reference, from [`go.title`](screen-forms.md#go-title) to [`go.liveChannel`](screen-forms.md#go-live-channel).

| `go` | What opens | Sent from |
| --- | --- | --- |
| `title` | this plugin's title page (`ref`, `kind`; `id`, `title` and `adult` for a title that is not on the canvas) | a tap, or the answer to an event (never the answer to `open`, to a timer or to a pop-up's `onClose`) |
| `play` | plays this plugin's title (`ref`, `kind`, as `title`) | a tap, or the answer to an event (never the answer to `open`, to a timer or to a pop-up's `onClose`) |
| `search` | Kino's search with `q` (at most 200 characters), only this plugin as the source | a tap, or the answer to an event (never the answer to `open`, to a timer or to a pop-up's `onClose`) |
| `browse` | this plugin's "Ver más" list for a `ref` | a tap, or the answer to an event (never the answer to `open`, to a timer or to a pop-up's `onClose`) |
| `section` | this plugin's section | a tap, or the answer to an event (never the answer to `open`, to a timer or to a pop-up's `onClose`) |
| `categories` | Kino's Categorías with this plugin's group first (its own screen with `screen.replaces`) | a tap, or the answer to an event (never the answer to `open`, to a timer or to a pop-up's `onClose`) |
| `close` | closes the screen | a tap, or the answer to an event (never the answer to `open`, to a timer or to a pop-up's `onClose`) |
| `screen` | this plugin's own screen at `route` (at most 64 characters) with `args` (at most 4,096 bytes of JSON) | a tap, or an answer, the answer to the reserved `open` included (never a timer's or a pop-up's `onClose`) |
| `titleByIds` | Kino's own title page for TMDB or IMDb ids, where the person picks any of their sources | only the person's own press or submit (a tap, a submit, the answer to one, a pop-up's button, a panel press) |
| `url` | an https link in the browser, after Kino's own confirmation sheet (a QR code on a TV) | only the person's own press or submit (a tap, a submit, the answer to one, a pop-up's button, a panel press) |
| `copy` | Kino puts the plugin's text on the clipboard and always shows its own «Copiado» toast (a TV cannot copy) | only the person's own press or submit (a tap, a submit, the answer to one, a pop-up's button, a panel press) |
| `liveChannel` | the player tunes to an En vivo provider's channel (`provider`, `code`), only for a plugin whose player tab declares `"kinds": ["live"]` | only the person's own press or submit (a tap, a submit, the answer to one, a pop-up's button, a panel press) |

- Kino's page opens over your screen; Back returns to it with its state. At most one page-opening `go` every 500 ms (a
  second one meanwhile is dropped, logged).
- **The 18+ gate holds everywhere**: a `title` or `play` of an `adult` item stays hidden while the person's 18+ code is
  locked. A `titleByIds` while it is locked opens only when TMDB says the title is not adult; adult, unknown, a failure or
  12 s passing shows Kino's locked message ("Contenido para adultos: desactiva el control parental en Ajustes").
- `title` / `play`: a title on the canvas opens with that very item (pass its `id` when two items share a `ref`). A title
  that is NOT on the canvas needs its `id` and `title` (and `adult: true` when it is 18+), or Kino cannot know which it is
  and shows its usual error. A live channel plays; a series opens its page (`kind: "episode"` alone and a `series` from a
  plugin without `episodes` show the error); a movie, a track or a podcast episode plays at once.
- `search` opens Kino's search with only your plugin as the source (the person sees its chip and may clear it); a plugin
  without `search` gets it refused. `categories` is refused, logged, for a plugin without its own Categorías tiles.
- `screen: { route?, args? }` opens **this plugin's** screen from its other surfaces: its player panel (answer or button),
  its `home`, `section` and `browse` items and rows (`open: { screen }`), the «Mis plugins» card. The screen gets `route:
  { name, params: {}, args }` (`name` is `"main"` without a route). From inside the screen it starts again at that route
  (pushed routes and an open pop-up go, the state stays) and the reserved `open` comes again with the new route, so one path
  loads what the args name whichever way the person came in; at most one restart a second. With screens off, a card or a
  row does what it did before ([`go.screen`](screen-forms.md#go-screen)).
- **`screen.replaces: ["categories"]`**: while your screen can open, a tile of your group in Kino's Categorías and a
  `categories` go open your screen at the route `categories` with `args: { from, category? }` (`from` is `categories`,
  `screen` or `panel`; `category` is the pressed tile's `ref`). Build it with `titleRail`, `titleGrid`, `heroCard`,
  `TabBar`, `Chips` and `go`. Kino's Categorías stays the fallback: with screens off, the screen hidden, or a FIRST opening
  that fails (Kino then shows the tile's own "Ver más" list and skips your screen for that app session). A `categories` go
  sent from the `categories` route opens Kino's own (no loop).
- **`titleByIds`** (`{ tmdb?, imdb?, kind, season?, episode?, title?, year? }`, at least one id) is how people with
  **different plugins** reach the same title: it opens Kino's own title page (the one a Home TMDB card opens), listing every
  source the person has. It names no plugin, ref or URL (any other field drops it), never plays, tells you nothing back;
  an `imdb` alone costs a TMDB lookup ("Buscando el título…", one at a time); the series opens whole (no episode focus yet)
  ([`go.titleByIds`](screen-forms.md#go-title-by-ids)).
- **`url`** (`{ href, title? }`, a "Ver noticia" button) asks Kino to open an https link in a browser. Nothing opens by
  itself: Kino shows **its own** sheet first («Abrir un enlace», «Lo pide: <your plugin>», the host with its end always
  visible, an international host as its punycode with a warning, your `title` under «Texto del plugin:», then «Cancelar»
  focused first and «Abrir», inert for its first 600 ms). On a TV, or a phone without a browser, the sheet shows the link as a
  QR code to scan with a phone. `href`: `https://` only, at most 2,048 characters of printable ASCII (percent-encode the
  rest), a public DNS name with a dot (never an IP address, `localhost`, `.local`, `.internal`, `.lan`, `.home.arpa`, `nip.io`,
  `sslip.io` and the like), no `user:password@`, no port but 443. An answer that comes more than 5 s after the tap drops the
  link, and the same answer's own pop-ups are dropped so nothing covers Kino's sheet. Nothing comes back to you, not even
  whether the person opened it. No capability is needed ([`go.url`](screen-forms.md#go-url)).
- **From the screen opened over the player** (a panel's `go.screen`): `close` closes it; any other `go` closes it first and
  goes on; the video then does what it does when any Kino page covers it (the TV pauses, a live stream stops).

## Timers: `every` { #timers }

The root of a tree (or the manifest's `screen.every`) may carry `{ ms, event }` or a list of them: Kino sends `screenEvent {
name: event }` every `ms` while the screen is open, shown and Kino in front (a pop-up does not stop it; a title page or the
player on top, or the background, pauses it). `ms` at least 1,000 (a shorter one is raised, logged), at most a day; at most
3 timers per screen (the manifest's first; an event named twice keeps the first).

- Ticks never cost the person anything: a tick runs only while none of the person's events waits or runs, a waiting tick is
  dropped when one arrives, and the next wait starts once the tick and its render are done (twice that time when it took
  longer than `ms`).
- **A tick is nobody's press.** Its answer keeps only `state`, `toast`, `close` and `config` (each setting at most once a
  minute); its pop-ups, `focus`, `go`, `route` and `ui` are dropped, logged. It cannot open the QR scanner, ask the AI, open
  or join a room.
- A tick that fails or times out counts for its timer only; 3 in a row switch that timer off for this opening (logged).
  Ticks never count toward "No responde".
- Typical uses: refresh a feed, poll a [room](rooms.md#room)'s `inbox`, advance a [work queue](#patterns) one small step.

## Accordion, skeleton, QR, number stepper and table { #components-misc }

- **`ExpansionTile`** (`key` required): `items` (1 to 500, each `{ key, title, children, open? }`), one open at a time
  unless `multiple`. Which are open lives in `state.ui.open.<key>`, so it survives a re-render; `open` is only the first
  look. Toggling is Kino's (no call). Each item's header costs one node. When the node budget runs out right after it, the
  accordion is drawn with fewer items (possibly none) ([ExpansionTile](screen-components.md#accordion)).
- **`Skeleton`**: `shape` `line` (with `lines`, 1 to 6), `block`, `circle` or `card`, sized with `width`/`height`; Kino's
  muted colour, pulsing gently, still when the system's animations are off; read as "Cargando…"
  ([Skeleton](screen-components.md#skeleton)).
- **`QrImage`**: `value` 1 to 1,000 characters, drawn as written by Kino's own generator (on the device, no network, black
  on white with its quiet zone), `size` small, medium or large. A value holding one of your plugin's secrets is never drawn
  (Kino's empty state shows, logged); Kino only recognises the secret as it is stored, not split up or re-encoded, so never
  build a QR from a secret. Never pressed, never focused; it may sit in a pop-up ([QrImage](screen-components.md#qr)).
- **`NumberStepper`** (an input): `value`, `min`, `max` (min below max), `step` (default 1), `decimals` (0 to 6), drawn
  `[ − ] value [ + ]`; a button at its limit is off; holding it repeats, slowly faster. Its value in `state.inputs` is text
  (`"2.50"`). `editable: true` lets the person type it with Kino's digits-only entry, only with `decimals: 0` and a `min` of
  0 or more (else ignored, logged). Numbers at most 1e15 either way (clamped, logged). No `bind`
  ([NumberStepper](screen-forms.md#number-stepper)).
- **`DataTable`**: `children` are `TableRow`s (1 to 200, each `{ key?, hidden?, children: [TableCell...] }`), a cell is a
  plain `text` (`textEn`) or `children`, with `colSpan` (1 to 8) and `crossAxisAlignment`. `columns` (at most 20, each with
  a `flex`) or as many as the widest row; `header: true` makes the first row the header; `zebra: true` stripes the rows;
  on a compact width the table scrolls sideways (at least 96 dp a column) unless `wrap: true`. Every property takes per-size
  maps (`colSpan: { compact: 1, expanded: 3 }`). A cell never holds a `ListView`, a `SingleChildScrollView` or a
  `DataTable` (nothing in a cell scrolls; tables do not nest); an `ExpansionTile` may sit in one. A row with fewer cells is
  padded; cells past the last column are dropped (logged). Each row and cell costs one node. A row's `key` lets `ui` show,
  hide or toggle it. It takes no focus: on the TV the D-pad walks what is focusable inside its cells
  ([DataTable](screen-components.md#table)).

## On the TV: text input and focus { #tv-focus }

**Text on the TV is a simulated input**, not a real field: a `TextField` draws as a row showing its value that, pressed,
opens Kino's TV text dialog with its on-screen keyboard (multi-line for a several-line `TextField`; the digits-only pad for
an editable `NumberStepper`). The event fires **once, when the dialog is accepted**: `onChanged` and then `onSubmitted`,
with the final value; there is no per-keystroke event. A hardware keyboard on a TV commits once on Enter or focus loss, the
same events. The phone uses normal fields (the phone's keyboard, a debounced `onChanged`). Your code cannot tell how a
value was entered and never needs to: it only reads `device`. Two differences to know: the TV sends the text untrimmed,
and a several-line `TextField` sends `onSubmitted` on the TV only (the phone's multi-line keyboard has no submit: give it a
button). The dialog's title is your plugin's name, drawn by Kino. Kino never autofills or suggests the person's saved data
in a plugin field.

**Focus is Kino's.** You name no focus order; the D-pad follows the tree, moving by what is drawn:

- The first focus goes to the first focusable node in tree order. An answer's `focus` or a `ui` `focus` moves it.
- A `TabBar` and a `Chips` row walk their items with Left and Right; at their end they go on to the next focusable beside
  them **in the same row** (tabs, then a refresh `IconButton`) and, with nothing there, stay put: never another row, never
  Kino's title bar. The twelve-column grid keeps Left and Right inside itself. Entering a `TabBar` or `Chips` row, from any
  side, lands on the picked item.
- A `Scroll`, `ListView` or grid of titles with a key of yours under the screen's first `TabBar` (a header `Row` counts)
  keeps its scroll per tab, also when you key each tab's body apart (`newsBody`, `settingsBody`).
- Moving onto a node scrolls only as much as it needs to show it whole: a node already in view scrolls nothing, so the
  first line under a header never ends up half hidden. Up (Down) with nothing more to focus that way inside a `Scroll`
  (or a player panel's body) scrolls it by most of a page until its start (end), so text above the first focusable or
  below the last is read with the D-pad alone; at the start (end) the key leaves as before.
- Stacked children (a `Column` of buttons and fields) lead Down and Up to the neighbour's nearest edge, so a narrow button
  under a full-width row is never skipped; button matrices keep their columns.
- A pop-up keeps focus inside (only the top one, when a dropdown's picker sits over it); its first focus is its first
  focusable node, else a body taller than the frame (it scrolls with Down and Up), else its first button, else its close;
  Left and Right move between Kino's X and your buttons; Back closes it and focus returns to what opened it.
- Every focused action has Kino's ring, and only it: never a pop-up's frame, a scrolling body or any other container. The
  same in any player panel, legacy or screen mode: a text, a section, a status, an image or a QR takes no focus on the TV
  (Up and Down page through it). A `NumberStepper` moves between −, the value (only when editable) and + with Left and
  Right, and its buttons at their limit stay focusable (drawn off), so holding OK never drops focus. An `ExpansionTile`
  header takes focus and OK toggles it; Down from an open header enters its content. A `QrImage` and a plain `DataTable`
  take none.
- A toast's action is reached with Down from the bottom of the tree, or run with the remote's Menu or Play/Pause key.
- A new frame that removed the focused node (an answer's new view): focus goes to the focusable now at or after its place,
  else the last one before it; with none, a `Scroll` (or a player panel's body) that scrolls takes focus itself, with no
  ring, so the D-pad still reads it. An answer's `focus` wins. Inside a player panel the TV's text is a step smaller than a
  full screen's (`h1` at `h3`'s size ... `p` 15 sp); the phone is unchanged.
- Back: the open pop-up first, then a pushed route, then the screen.

Design for the TV first: few focus stops, the important action first, short rows, and `onLongPress` only for extras the
person can also reach another way.

## Screen limits { #limits }

| What | Limit |
| --- | --- |
| A tree | depth 10, 600 nodes (an accordion's header, a table's row and cell count as one each); in a panel in screen mode depth 6 and 200 nodes |
| Lists | 500 items in a list, rail, grid, accordion or a choice's `options`; 1000 titles in a whole tree, 60 in a rail or grid drawn all at once (inside a scroll, a list, a pop-up or a table cell) |
| Texts and keys | a text 2,000 characters; `testKey` 64; a text field's `trailingLabel` 40; a `ref` 4,096; the menu entry's `label` 20, the settings button's 40 |
| State | 64 KB as JSON (a bigger patch is refused, the old state kept) |
| Calls | `screen` and `screenEvent` 20 s each; events one at a time, at least 100 ms apart, at most 8 waiting |
| Answers | 8 `ui` operations per action or answer; 32 settings per `config`; 1 pop-up at a time; 3 buttons in a dialog; 8 items in a menu; 2 buttons in a `heroCard` |
| Layout | `flex` 1 to 12; `columns` 1 to 8; the twelve-column row: 12 columns |
| Patterns (forms) | a pattern at most 200 characters, a count at most 1,000, 500 steps once counts are expanded (and 20,000 units of work to read it); one submit runs at most 16 patterns and 4,000,000 matcher steps (past either, the rest pass) |
| Timers (`every`) | 3 per screen, every 1,000 ms to 86,400,000 ms (a day); 3 failures in a row switch one off; a tick's `config` writes a setting at most once every 60 s |
| Toasts | shown 2,000 to 8,000 ms (default 3,500) |
| `QrImage` | `value` 1 to 1,000 characters |
| `NumberStepper` | 6 decimals at most; numbers at most 1,000,000,000,000,000 either way |
| `Skeleton` | 1 to 6 lines |
| `DataTable` | 200 rows, 20 columns, `colSpan` 1 to 8 |
| `go` | `route` 64 characters, `args` 4,096 bytes; `titleByIds`: `tmdb` 1 to 2,147,483,647, `season` 0 to 999, `episode` 1 to 9999, `year` 1870 to 2100, `title` 120; `url`: `href` 2,048, `title` 60, one link a second for all plugins and 10 a minute per plugin, a QR code up to 1,000 characters; `copy`: `text` 500 characters in 6 lines, `label` 40, one copy every 500 ms and 20 a minute per plugin; at most one page-opening `go` every 500 ms |
| Search | `q` 200 characters |

Everything else (`kino.fetch`, `kino.storage`, the memory) is the plugin's usual limits
([Engine limits](engine-limits.md#limits)). All the screen numbers together are also in
[Limits](screen-reference.md#limits).

## Capabilities that go with screens { #consent }

A screen adds no consent line. The capabilities below add reach, so Kino asks the person **in its own words**, which you
cannot change or hide:

| Capability | What the person reads | Red, waits for approval | The person's switch (your tab in Ajustes) |
| --- | --- | --- | --- |
| `screen` | nothing: no line of its own | no | none |
| `library` | "Podrá leer lo que has visto y guardado en Kino, y enviarlo a sus servicios" ("Can read what you have watched and saved in Kino, and send it to its services") | yes | "Dejar que lea lo que he visto y guardado" ("Let it read what I watched and saved") |
| `playerPanelTab` | "Su pestaña en el reproductor verá lo que estás viendo (título, año, identificadores y posición, o el canal en vivo) mientras la tengas abierta, y podrá enviarlo a sus servicios" ("Its tab in the player will see what you are watching (title, year, ids and position, or the live channel) while you have it open, and can send it to its services") | yes | "Mostrar en el reproductor" ("Show in the player") |
| `playerControl` | "Podrá pausar, reanudar y mover tu video por sí solo" ("Can pause, resume and move your video by itself") | yes | "Dejar que pause y mueva mi video" ("Let it pause and move my video") |
| `room` | "Podrá abrir una sala a la que se entra por internet a través de este aparato, y enviar los mensajes de la sala a quienes entren" ("Can open a room that people reach over the Internet through this device, and send the room's messages to whoever joins") | yes | "Dejar que abra salas por internet" ("Let it open rooms over the Internet") |
| `schedule` | "Podrá ejecutarse en segundo plano cada cierto tiempo para actualizar sus datos, usando internet y batería" ("Can run in the background every so often to refresh its data, using your internet and battery") | yes | "Dejar que trabaje en segundo plano" ("Let it work in the background") |
| `ai` | "Podrá enviar texto a un servicio de IA de terceros (Kilo) para que lo resuma o clasifique; lo que envíe sale de tu aparato" ("Can send text to a third-party AI service (Kilo) to have it summarized or classified; what it sends leaves your device") | yes | "Dejar que use la IA de texto" ("Let it use the text AI") |
| `shared` | "Guarda unos pocos resultados que se sincronizan entre tus aparatos vinculados" ("Keeps a few small results that sync between your linked devices") | no | none |

- A red line is asked at install and again on the update that adds it, **never approved by Kino on its own**; the kit's
  import starts it unticked. Until the person approves it the API refuses (`permission_denied`, `refused`), so always handle
  the refusal and work without it.
- Each switch is in your plugin's tab in Ajustes, covers the whole device and every profile, and syncs to the person's
  other devices; off, the API refuses at once (a room closes, a job's work is cancelled).
- Be honest in your own UI too: say what you send and where (the news example's settings say "Los titulares se envían al
  servicio de IA de terceros de Kino").
- These lines are the safeguard, not a technical wall: a plugin that can fetch can send what it reads to its hosts. The
  sheet lists your hosts beside the line for that reason.

Each capability has its own page:

| Capability | What it gives | Where |
| --- | --- | --- |
| `room` | A short-lived mailbox hosted on the person's own device and reached over the Internet: a room others join. | [Rooms](rooms.md#room) |
| `library` | What the active profile watched and saved (titles and ids, never streams or 18+). | [Library](rooms.md#library) |
| `playerControl` | Pause, resume and move the video from a panel (your own or a contributed tab). | [Player control](rooms.md#player-control) |
| `schedule` (`jobs`, `job(ctx)`) | Background jobs that refresh what your screen or catalog shows. | [Jobs](jobs-and-shared.md#jobs) |
| `shared` | A few small results that sync between the person's linked devices. | [Shared](jobs-and-shared.md#shared) |
| `ai` | One short text to Kino's text AI, to summarise or classify. | [AI](jobs-and-shared.md#ai) |
| `qrScan` | `kino.qr.scan` from a `screenEvent` that follows the person's tap or submit. | [QR](qr.md) |
| `playerPanelTab` | Your tab in the player panel of any plugin's title. | [Contributed tab](player-panel.md#contributed-tab) |
| `kino.fetch` `maxBytes` / `stopAt` | Read only the head of a page. | [`kino.fetch`](kino-api.md#fetch) |
| `enhancements` | Screens and the other apiVersion 14 features for a plugin that keeps an older apiVersion; new consents first on an update. | [Enhancements](enhancements.md) |

## Testing screens with the kit { #testing }

```
node sdk/validate.mjs <folder>                                    # the manifest, the exports, every consent line, enhancements
node sdk/run.mjs <folder> screen                                  # the tree as Kino reads it (aliases resolved, drops logged)
node sdk/run.mjs --device tv <folder> screen                      # as a TV
node sdk/run.mjs --state '{"inputs":{"q":"dune"}}' <folder> screenEvent search
node sdk/run.mjs --context '{"route":{"name":"categories","params":{},"args":{"from":"categories"}}}' <folder> screen
node sdk/run.mjs <folder> panel <ref>                             # a panel (legacy or screen format)
node sdk/run.mjs --state '{}' --screen <folder> panelAction <ref> <name> press
node sdk/run.mjs --foreign latino:Latino <folder> panel <ref>     # a tab you contribute to another plugin's title
node sdk/run.mjs --device phone <folder> job refresh manual       # one job run, with Kino's caps
node sdk/run.mjs --device tv <folder> screen                      # ...then read what the job shared, as the TV
node sdk/run.mjs <folder> shared                                  # what the simulated phone and TV hold
```

`run.mjs` prints the tree after Kino's rules (with the older names Kino reads internally, the per-size values resolved in
`byClass`), every dropped node and field, and the answer's fields; `validate.mjs` checks the tree and `go` objects like the
app. The environment variables `KINO_LIBRARY_FIXTURE`, `KINO_LIBRARY_REVOKED`, `KINO_ROOM_REVOKED`,
`KINO_PLAYER_CONTROL_REVOKED`, `KINO_AI_REPLY`, `KINO_AI_ERROR` and `KINO_AI_REVOKED` play the person's data and choices.
In `node --test` files, import the kit's helpers (`createKino`, `createKitRoom`...) as the examples' tests do. The shared
case files in `sdk/test/` (`screen-cases.json`, `room-cases.json`, `job-cases.json`, `ai-cases.json`, `shared-cases.json`,
`player-control-cases.json`, `panel-foreign-cases.json`, `qr-origin-cases.json`) are the very cases Kino's own tests run.
More on the kit in [Test locally](test-locally.md).

## Patterns { #patterns }

- **Compose with plain functions.** A screen is data: one function per tab or card (`newsTab(state)`, `card(story)`), a
  handler map for `screenEvent` (`const on = { open, read, more, save }; return on[name]?.(ev) ?? null;`). The plugin stays
  one file at run time ([split it in `src/` and bundle it](structure.md) when it grows).
- **Keep the state small.** It travels on every call and is capped at 64 KB: keep ids and choices there, and the bulk (a
  feed, articles) in `kino.storage` or `kino.shared`, read in `screen()` by the ids.
- **Work in small steps.** Never do everything in one call: a call has 20 s and a job 20 s and 10 requests. Write one pure
  function, `step(cache, fetch, settings, clock, budget)`, that moves a work queue forward a little (the next batch of
  searches, a few pictures) and stops on its budget, keeping a cursor in the cache. Call it from the job, from the screen's
  `open`, and from an `every` tick; each call resumes where the last stopped. With the clock and the budget as parameters
  your tests prove it stops and resumes. A lighter budget on a TV (`kino.device`).
- **Caches behind an adapter.** Read and write through one small object (`get`, `set`) that tries `kino.shared` and falls
  back to `kino.storage` when it is missing or refuses, so the same code runs with or without the capability, on an older
  Kino, and in tests.
- **Stale-while-revalidate.** Show the cache at once on `open`, then fetch only what is stale; a `Skeleton` for what is not
  there yet; a `MaterialBanner` with «Reintentar» when the network fails, with the old data still shown.
- **Every input is untrusted**: what `kino.shared` and a room answer, an AI reply, a page you fetched, a value from an
  older version of your plugin. Check shapes, sizes and fields; scrub control and direction characters from names.
- **Texts in Spanish and English.** Every text node takes its `En` twin; your toasts read `lang`. Kino's own words are its
  own (in both languages).
- **No secrets where they travel**: never in `kino.shared`, a room message, a `QrImage`, an AI prompt or a log line.
- **Feature-detect** (`kino.screen.names`, `typeof kino.library === "object"`...) and keep a way without each capability:
  the person may refuse it or switch it off.
- **Logic lives in the plugin.** Kino ships generic primitives (the screen kit, the tab host, rooms, player control,
  `titleByIds`, `library`, jobs, `shared`, `ai`); a feature such as a Watch Party is entirely a plugin's protocol on top of
  them.

## The examples { #examples }

Five plugins show this guide at work; each has a README (Spanish and English) and tests that run without a network.

### Gallery { #example-gallery }

[kinotvapp/kino-plugin-ui-gallery](https://github.com/kinotvapp/kino-plugin-ui-gallery) (Kino 0.9.74 and later): every
component of the reference on one screen, a tab per group (Layout, Content, Actions, Forms, Overlays, Navigation, Data),
each component in a section keyed by its anchor in the reference, with interactive demos (pop-ups from an answer and
declared, toasts, form validation, `ui` operations, `bind` and `config`, `go.url`, `go.titleByIds` and `go.screen` with
harmless targets, a timer). Its `screenshot-map.json` says where each component is, for capturing the reference's pictures
from the real renderer.

### News { #example-news }

[kinotvapp/kino-plugin-news](https://github.com/kinotvapp/kino-plugin-news) («Solo noticias»): two tabs. **Noticias**: news
about the movies and series the person watched and their own terms, from Google News RSS, as a twelve-column grid of flush
cards (one, two or three per line) with category chips; a card's tap reads the story and the answer opens a declared pop-up
(`ui: [{ open }]`) with the picture, the text read from the outlet's page (`maxBytes`) and «Ver noticia» (`go.url`; on a TV
also a QR). **Configuración**: the frequency, pictures and texts, sorting with AI, «Usar lo que he visto» with removable
rows, sample titles, and the person's own terms added through a pop-up with a form. It demonstrates `library`, a `schedule`
job with `runOn: "preferPhone"` writing to `kino.shared` through a cache adapter with a `kino.storage` fallback, `ai`
classification in the job or after «Clasificar ahora» with strict validation and a keyword fallback, image `fallback`,
`card.flush`, the twelve-column grid, `bind`, an `every` timer stepping the work queue, and a TV budget. It shows its limits
honestly: Google's article links are resolved with an unofficial call that can break. Its source is split into `src/` and
bundled into `plugin.js` (see [Structure](structure.md)).

### Watch Party { #example-watch-party }

[kinotvapp/kino-plugin-watch-party](https://github.com/kinotvapp/kino-plugin-watch-party): «Party Chat», a tab contributed
to the player panel of any plugin's title (`playerPanelTab`), with `room`, `qrScan` and `playerControl`. A chat (text up to
300 characters and eight reactions) and the playback kept in step: the host broadcasts its position; a guest follows only
when its source plugin (`ctx.source`) and the title's ids match, else «Abrir este título» (`go.titleByIds`). Sharing is the
room's words and code and a QR of both. It shows the room protocol a plugin owns: snapshots every 10 s, backup doors
(`open({ code })`), an election with one tap to move (because `join` needs a press), incremental chat replication, a TV seat
linked from a phone, untrusted peers, and why the tab must be pinned (for the playback) to keep running. Its source is split
into `src/` and bundled into `plugin.js` (see [Structure](structure.md)).

### Calculator { #example-calculator }

The opposite end: no network, no job, no settings. A display card and twenty buttons in a `Row` with `wrap: true`
(`span: 3`), sized with per-size maps for phone, medium and TV; a pure view over `state.calc` and pure exported functions
for the logic, tested with a 94-row table and a property test. On a TV the D-pad walks the button matrix: a regression guard
for focus on a grid. Each key is a JS round trip, so it is also the latency probe of the screen kit.

### Setup flow { #example-setup-flow }

A sign-in in three steps with no network: Kino's `steps` node (a done step pressed goes back), a `QrImage` that expires
(Kino's own countdown and an `onExpire` five seconds before the end that draws a new code), a `Form` with a masked
`TextField` (`obscureText`) whose text is written to the plugin's own `password` setting through `config` and never kept in
the state, and a `settings` node whose `onSaved` tells the screen the person saved. Pure exported functions, tested with the
kit.

## Known limits { #known-limits }

What this version does not do:

- A declared pop-up's body cannot be filled by a second answer: an answer cannot chain an event, so a story that needs a
  slow fetch is read before its pop-up opens (no skeleton-then-text inside one pop-up).
- A load-more's answer can still open a pop-up.
- A contributed tab (a Watch Party) does not work on M3U lists, own channels or other non-plugin content, and runs only
  while it is selected in an open or pinned drawer.
- `go.titleByIds` opens a series whole (no season or episode focus yet).
- No `bind` on a `NumberStepper`; the screen's state is dropped on close. A masked `TextField` (`obscureText`) keeps what
  was typed only in memory and only until the person's next tap or submit carries it
  ([secret fields](screen-forms.md#secret-field)).
- A screen whose fixed sizes are taller than the window does not scroll by itself: put the root in a `scroll` (or size it
  per `heightClass`), as the calculator example does in landscape.
- On a phone in landscape the [pinned panel](player-panel.md#pinned) takes 32 % of the width but never less than 360 dp, so
  a narrow phone gets about 59/41 (video/panel) instead of 68/32.
- The pin lasts for one playback: leaving the player forgets it.
- When even the stacked rows of player buttons do not fit (a very narrow video area), the least important buttons go to one
  more row under them, not to a «⋮» menu.
