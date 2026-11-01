# App themes (apiVersion 18) { #themes }

!!! note "The next Kino version"
    `appThemes`, `go.useTheme`, `go.setExperience` and `activeTheme` arrive with `"apiVersion": 18`, which
    `contract.json` ties to Kino 0.9.81: the next Kino version, **not in any released Kino**. Every older Kino refuses an
    apiVersion 18 manifest with «Este plugin necesita una versión más nueva de Kino», and `appThemes` is not offered
    through [`enhancements`](enhancements.md). Below apiVersion 18 the field is ignored.

A plugin may offer **whole-app looks**: colours, a background, corner radii, type sizes, shadows, motion, player
control sizes and its own logo, for every screen of Kino on the phone and the TV. A theme is **data in the manifest**: no
code runs, no network is used, no capability is needed. The person picks one theme in **Ajustes ▸ Apariencia** (or with a
button on your own screen), may adjust what you allow, and the choice is per profile and syncs between their devices.

This is not the apiVersion 6 [`theme`](section-theme.md#theme) field, which only colours *your* section, Ajustes tab and
player accent. Both may live in the same manifest.

## A theme-only plugin { #theme-only }

```json
{
  "id": "theme-neon",
  "name": "Neón",
  "version": "1.0.0",
  "apiVersion": 18,
  "entry": "plugin.js",
  "description": "Un tema oscuro con acentos neón",
  "hosts": [],
  "categories": ["themes"],
  "appThemes": [
    {
      "id": "neon",
      "name": { "es": "Neón", "en": "Neon" },
      "colors": { "accent": "#00E5FF", "onAccent": "#000000", "background": "#0A0A14", "surface": "#14142A", "surfaceHigh": "#1E1E3A", "railPanel": "#101026" },
      "background": { "type": "gradient", "colors": ["#0A0A14", "#1A0A2E"], "angle": 180 },
      "shape": { "cardRadius": 14, "channelRadius": 14, "buttonRadius": 24, "chipRadius": 20, "dialogRadius": 20, "inputRadius": 12 },
      "typography": { "scale": 1.1, "titleScale": 1.05, "bodyScale": 1.0 },
      "tv": { "typography": { "scale": 1.0 } },
      "adjustable": {
        "colors.accent": { "swatches": ["#00E5FF", "#7C4DFF", "#FFB300"] },
        "shape.cardRadius": { "min": 0, "max": 20 },
        "typography.scale": { "min": 1.0, "max": 1.3 },
        "background": true
      }
    }
  ]
}
```

`plugin.js` can be empty (`export {};`): Kino loads it and calls nothing. Rules for such a plugin:

- **No capabilities.** A plugin whose only content is `appThemes` may leave `capabilities` out (or add only `screen`, for a
  presentation page: see [Turning a theme on from your screen](#use-theme)).
- **`"hosts": []`** is allowed from apiVersion 18 in a plugin that only ships `appThemes`: it reaches nothing, and its card
  says it doesn't connect to the internet.
- **`"categories": ["themes"]`** lists it under **Temas** in Kino's plugin store. `themes` is one of the nine marketplace
  values (`movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `themes`, `adult`).
- It plays nothing, so it does not open the way past Kino's first source picker.
- No consent line: activating a theme is the person's consent, and a theme grants nothing (no network, no code, no data).
- Any other plugin (a catalog, a live TV plugin) may also carry `appThemes` beside its capabilities.

## The fields of a theme { #fields }

`appThemes` is a list of **1 to 8** themes. Each one:

| Field | Rule |
| --- | --- |
| `id` | Required. `^[a-z0-9][a-z0-9-]{1,39}$`, unique in the plugin. Never change it once published: the person's choice and adjustments hang off it. |
| `name` | Required. `{ "es", "en" }` (one may be missing: it takes the other) or one string for both; at most 40 characters. |
| `colors`, `shape`, `typography`, `elevation`, `motion`, `player` | The token groups below. Every token is optional: what you leave out stays Kino's. |
| `background` | `{ "type": "solid", "colors": [one] }` or `{ "type": "gradient", "colors": [2 to 8], "angle": whole degrees }` (default angle 180). `image` is refused for now: "background.image arrives in a later version of Kino; remove it from this theme". |
| `tv`, `phone` | The same groups and `background`, overriding the theme on that form only. |
| `adjustable` | What the person may change in Ajustes ▸ Apariencia ▸ Personalizar (at most 40 tokens): `true`, `{ "swatches": ["#RRGGBB", …] }` (colours only) or `{ "min", "max" }` (numbers only). |
| `pluginColors` | `"respect"` (default) or `"override"`: what happens to other plugins' own apiVersion 6 `theme` colours. |
| `price` | Optional `{ "kinos": 1 to 1000, "payTo": "<64 lowercase hex>" }`. No `price` is a free theme. See [Priced themes](#price). |
| `experience` | Optional `"light"` or `"full"`: the whole-app experience the theme looks best with. See [The experience](#experience). |
| `logo` | Optional `{ "wordmark"?, "mark"? }`, vector only. See [Your own logo](#logo). |

**A format error refuses the whole manifest**: an unknown field or token, a wrong type (a number where a colour goes), a bad
`id`, two themes with the same `id`, more than 8 themes, a `name` over 40 characters, a malformed `price`, `experience` or
`logo`. **A value out of its range does not refuse anything**: Kino drops that one token with a warning and keeps its own
value, so the theme still works. `node sdk/validate.mjs .` prints those warnings for the phone and the TV.

## Tokens and ranges { #tokens }

The 39 tokens, with the ranges `contract.json` (`manifest.appThemes`) enforces:

| Group | Token | Type and range | Kino's own value |
| --- | --- | --- | --- |
| `colors` | `accent` | `#RRGGBB` | `#E50914` |
| `colors` | `onAccent` (text and icons on the accent) | `#RRGGBB` | `#FFFFFF` |
| `colors` | `background` | `#RRGGBB` (or the `background` field) | `#0E0E0E` |
| `colors` | `surface` (cards, panels) | `#RRGGBB` | `#181818` |
| `colors` | `surfaceHigh` (raised panels) | `#RRGGBB` | `#242424` |
| `colors` | `textPrimary`, `textSecondary` | `#RRGGBB` | `#F5F5F5`, `#B3B3B3` |
| `colors` | `focus`, `onFocus` (the TV focus treatment) | `#RRGGBB` | `#FFFFFF`, `#000000` |
| `colors` | `outline`, `railPanel`, `placeholderTop`, `placeholderBottom`, `success`, `warning`, `error`, `favorite`, `scrim` | `#RRGGBB` | Kino's |
| `shape` | `cardRadius`, `channelRadius`, `buttonRadius`, `chipRadius`, `dialogRadius`, `inputRadius` | number, 0 to 32 | Kino's |
| `typography` | `scale`, `titleScale`, `bodyScale` | number, 0.85 to 1.3 | 1 |
| `elevation` | `cardShadow`, `dialogShadow` | number, 0 to 1 | Kino's |
| `elevation` | `heroScrim` | number, 0.3 to 1 | Kino's |
| `motion` | `focusZoom` | number, 1 to 1.15 | Kino's |
| `motion` | `crossfadeMs` | number, 0 to 800 | Kino's |
| `motion` | `heroDrift` | `"on"` or `"off"` | Kino's |
| `player` | `buttonScale` | number, 0.8 to 1.4 | 1 |
| `player` | `playButtonScale` | number, 0.8 to 1.6 | 1 |
| `player` | `seekBarScale` | number, 0.8 to 2 | 1 |
| `player` | `labelScale` | number, 0.85 to 1.3 | 1 |
| `player` | `buttonShape` | `"circle"`, `"rounded"` or `"square"` | Kino's |

The token is named by its path: `colors.accent`, `shape.cardRadius`, `player.buttonShape` (that is how `adjustable` names
them). `typography.scale` multiplies the system font scale (the combination is capped). On the phone a player button may
look smaller, but its touch target never goes below 48 dp; on the TV the focused button keeps Kino's focus treatment, only
recoloured with `focus` and `onFocus`.

## How Kino resolves a theme { #resolution }

Lowest to highest priority, per token:

1. Kino's own value.
2. The theme, then its `tv` or `phone` block.
3. The person's adjustments, only on tokens in `adjustable`, clamped to its `min`/`max` (or one of its `swatches`) and to
   the ranges above.
4. **The device.** With reduced effects (Ajustes ▸ Experiencia visual) the `motion` tokens do nothing; whether TV cards
   are rounded at all stays the person's "Esquinas redondeadas" switch (off by default on TV for performance; Apariencia
   offers to turn it on when a theme uses a radius). A theme never decides what a device can draw.

### The legibility guardrails { #guardrails }

The same thresholds as the apiVersion 6 `theme` (`minTextContrast` 4.5, `minUiContrast` 3), read on the **effective**
colours (Kino's where your theme changed only one side). A pair that fails falls back to Kino's values on the side your theme
set, with a warning:

| Pair | Needs | When it fails |
| --- | --- | --- |
| The background (every gradient stop) | dark: relative luminance at most 0.05 | Kino's background (light themes arrive later) |
| `accent` on the background | 3:1 | Kino's `accent` and `onAccent`, as a pair |
| `onAccent` on `accent` | 4.5:1 | Kino's `accent` and `onAccent`, as a pair |
| Kino's accent on your background | 3:1 | Kino's background |
| `textPrimary` and `textSecondary` on the background and `surface` | 4.5:1 | Kino's text colours |
| `textPrimary` on `surfaceHigh` | 4.5:1 | Kino's `surfaceHigh` (then the text colours) |
| Text on your `surface` | 4.5:1 | Kino's `surface` |
| `focus` on the background; `onFocus` on `focus` | 3:1; 4.5:1 | Kino's `focus` and `onFocus` |

Unlike the apiVersion 6 `theme`, `appThemes` has no "not close to Kino's red" rule. The person's own adjustments go through
the same checks: Apariencia refuses a colour that would not read, in Kino's words.

### What a theme never restyles { #never }

Kino draws in its own look, whatever theme is active: Ajustes ▸ Apariencia itself, its preview, the purchase and experience
questions, the plugin install and update consent sheets, the 18+ code and setting locks, the `go.url` sheet, the lock screen,
and every other screen that asks the person for a decision. Kino's own logo stays on the splash, the gate and those decision
screens. QR codes stay black on white, and what is drawn over video or artwork keeps its colours.

## `pluginColors` { #plugin-colors }

Other plugins may have their own apiVersion 6 `theme` colours. With `"respect"` (the default) their pages and their player
accent keep them; with `"override"` the active theme's colours win everywhere. The person always has the last word: Apariencia
shows a **Colores de los plugins** switch for every theme, whatever you declared.

## Priced themes (`price`) { #price }

A theme may cost **kinos**, Kino's free coin (the person earns them by watching: 1 every 10 minutes, at most 20 a UTC day).

```json
"price": { "kinos": 50, "payTo": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" }
```

- `kinos` is a whole number from 1 to 1000; `payTo` is **your** coins account: 64 lowercase hexadecimal characters. Both are
  required together; anything else refuses the manifest.
- Before a priced theme turns on (from Apariencia, from your plugin's manage sheet or from your own `go.useTheme`), Kino shows
  its own purchase sheet: «Comprar «name»», «Cuesta N kinos.», the person's balance («Tienes N kinos.»), and **Comprar por N
  kinos**, enabled only when the balance covers it («Te faltan N kinos para comprarlo.» otherwise). A failed purchase charges
  nothing. Apariencia shows the price on the list and on the preview button, and the balance next to priced themes.
- The kinos go to `payTo`. One purchase per theme and account, valid on every device of the person.
- Your plugin never sees the purchase, the balance or the coins session: **you need no `coins` capability to sell a theme.**
  Declare [`coins`](kino-api.md#coins) (apiVersion 16, a red consent line) only if your own screen wants to show the balance
  with `kino.coins.balance()`; when it rejects with `disabled`, show nothing about kinos.
- The price and the account are in your public manifest: they are what Kino charges and pays, not a lock on your files.
- **Your account.** A coins account is the same 64-hex identifier Kino Social calls the author's `user_key`: the coins service
  derives it from the person's Telegram identity with a secret, and never stores the Telegram id. It is the id of the person
  who signed in to Kino with Telegram, so `payTo` must be the account of the person who is paid. In the next Kino version
  (0.9.81, not published yet) you read and copy it in **Ajustes ▸ App ▸ Tu cuenta de kinos** (it needs the Kinos switch on and
  your Telegram sign-in): tap the row to copy the whole 64 characters.
- **Your own theme.** The service refuses a purchase whose buyer and `payTo` are the same account (`self_purchase`): nothing
  is charged. To test the purchase flow, use a second account, or the kit's mocks and a debug build.
- **Refunds.** There are none: a purchase is final, the kinos are already in the author's balance, and the service has no
  refund operation. What a person never pays is a failed purchase: it charges nothing, and buying the same theme twice charges
  once.

## The experience (`experience`, `go.setExperience`) { #experience }

Kino has two whole-app presets in Ajustes ▸ Experiencia visual: **light** (no shadows, no effects, square corners) and
**full** (every effect on, rounded corners).

- A theme that looks best with one says so with `"experience": "light"` or `"full"`. When the person turns the theme on,
  Kino asks («Este tema se ve mejor con la experiencia completa. ¿La usamos también?», with «Usar la completa» and «Dejar la
  actual»). Nothing changes without their yes, and nothing is asked when the app already has it.
- Your own screen may ask too: `go: { setExperience: "light" | "full" }`, only from the person's own press or submit on your
  screen (never `open`, a timer, a change, a load-more, an `onClose`, a panel or a notice). Kino asks first, naming your
  plugin («Tu plugin» pide la experiencia completa. ¿La usamos?). Any other value drops the `go`, logged.

## Your own logo (`logo`) { #logo }

A theme may draw its own logo in place of Kino's in the phone's side menu and header and in the TV's rail. Vector only (no
image file, no network):

```json
"logo": {
  "wordmark": { "size": [120, 30], "paths": [{ "d": "M0 0 L26 15 L0 30 Z", "fill": "accent" },
                                              { "d": "M40 4 H52 V26 H40 Z", "fill": "textPrimary" }] },
  "mark": { "size": [30, 30], "paths": [{ "d": "M15 0 L30 15 L15 30 L0 15 Z", "fill": "accent" }] }
}
```

- At least one of `wordmark` (the long logo: phone menu and header, the TV's open rail) and `mark` (the square one: the TV's
  collapsed rail). What you leave out stays Kino's.
- `size` is `[width, height]`, whole numbers from 1 to 1000, at most 8 times wider than tall (or the reverse).
- 1 to 8 `paths`, each `d` up to 2,000 characters of SVG path data (`M L H V C S Q T A Z`, numbers, spaces, commas, signs);
  `fill` is `accent`, `onAccent`, `textPrimary`, `textSecondary` (they follow the theme and the person's adjustments) or a
  fixed `#RRGGBB`.
- Kino keeps its own logo on the splash, the gate and every screen that asks for a decision.

## Turning a theme on from your screen (`go.useTheme`, `activeTheme`) { #use-theme }

The person activates a theme in **Ajustes ▸ Apariencia** (Tema de Kino is always the first option; a preview shows a Home
row, a dialog and the player controls before **Usar este tema**), from your plugin's manage sheet («Ver temas», «Activar tema
de …»), or from a button on **your own [screen](screens.md)** (the `screen` capability, apiVersion 14+, which a theme plugin
may declare to present its theme):

```js
export async function screen({ activeTheme }) {
  const on = activeTheme === "neon";
  return { type: "ElevatedButton", labelText: on ? "Desactivar" : "Activar", labelTextEn: on ? "Turn off" : "Turn on",
    onPressed: { go: { useTheme: { theme: on ? null : "neon" } } } };
}
export async function screenEvent() { return null; }
```

- `screen` and `screenEvent` receive **`activeTheme`**: the id of your theme active now, else `null`. Kino calls `screen`
  again after any change (one made in Apariencia too), so one button can flip.
- `go: { useTheme: { theme } }`: `theme` is one of your `appThemes` ids (it does what Apariencia's button does: the same
  per-profile choice, the same sync, the person's adjustments kept) or `null` (back to Kino's theme, only while one of yours
  is active: you can never reset another plugin's).
- Only from the person's own press or submit on your screen: dropped, logged, from `open`, a timer, a change, a load-more, a
  pop-up's `onClose`, a panel or a notice, and below apiVersion 18. Refused, logged, with nothing changed, when Apariencia
  does not list that theme as yours (another plugin's id, your plugin off in this profile, 18+ while locked).
- A priced theme the person has not bought opens Kino's purchase sheet first; a theme with `experience` asks about it.
- Kino shows its own toast, «Tema aplicado» or «Volviste al tema de Kino», and repaints the whole app, your screen included.
- A presentation screen that needs no menu icon can open from your settings page only:
  `"screen": { "label": "Neón", "opensFrom": ["settings"], "settingsButton": { "label": "Ver presentación", "labelEn": "See presentation" } }`.

## The person's side { #person }

- One theme is active at a time, per profile; the choice and the adjustments sync between the person's linked devices, both
  ways.
- **Personalizar** lists only what you marked `adjustable` (swatches and a written `#RRGGBB` for colours: swatches are what
  work with a remote; a stepper for numbers), plus «Volver a los valores del tema».
- Disabling or removing your plugin returns to Kino's theme; the choice is kept and comes back on reinstall. An update
  re-resolves the theme, and adjustments to tokens no longer `adjustable` are dropped.
- Any failure resolving a theme gives Kino's own look, never a crash.

## Test it with the kit { #kit }

```
node sdk/validate.mjs .                                                   # format, plus each theme's warnings on phone and TV
node sdk/run.mjs --context '{"activeTheme":"neon"}' . screen              # your presentation screen with your theme on
node sdk/run.mjs . screenEvent activate --trigger tap                     # what Kino does with go.useTheme / go.setExperience
```

`validate.mjs` prints lines such as `appThemes neon (tv): shape.cardRadius: 40.0 is outside 0.0..32.0; Kino's is used` and
`appThemes neon (phone): background: is too light (the background must be dark for now); Kino's is used`: the app's own
warnings, word for word. `screen` prints the tree with any malformed `go` dropped, and `screenEvent` says when a `go.useTheme` in an answer would be dropped (not a tap, not one of your ids, `null` with
none of yours active). The kit draws no colours: look at the theme in Kino (Ajustes ▸ Apariencia ▸ the preview).

## Checklist { #checklist }

- [ ] `"apiVersion": 18` and the person knows it needs the next Kino version.
- [ ] `node sdk/validate.mjs .` passes and prints no warning you did not expect, for phone and TV.
- [ ] Every theme `id` is final; `name` has `es` and `en`.
- [ ] The background is dark and every pair in [the guardrails](#guardrails) reads.
- [ ] `adjustable` offers swatches (not only free colours) so a TV remote can use it.
- [ ] A `price` has your real `payTo`; you did not add `coins` just to sell.
- [ ] A screen that turns the theme on reads `activeTheme` and uses `go.useTheme` only from a tap.
- [ ] `"categories": ["themes"]`, and `"hosts": []` when the plugin only ships themes.
