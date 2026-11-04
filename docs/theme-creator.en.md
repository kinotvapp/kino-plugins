# Theme creator { #theme-creator }

Build an [app theme](themes.md) while you watch it take shape. On the left is Kino (Home, the side menu, search and a dialog) with
sample data; on the right, the theme's values; below, the code as it gets written. It starts from Kino's own theme: every value you
move changes the view at once, and whatever Kino would drop (for contrast or range) is dropped here too and explained underneath,
in the kit's own words.

Press the three-line menu to open the side menu and **Home** to go back to Home. With **TV** you see the side rail and the focus.
You can also type or paste the JSON below: the controls follow what you write.

<div id="kino-theme-creator" data-lang="en"><noscript>The creator needs JavaScript.</noscript></div>

## Using the result { #use }

1. Download `kino-plugin.json` (or copy the code) and put it in a new GitHub repository, with a `plugin.js` that only says
   `export {};`. A plugin that only ships themes needs no capabilities and no hosts: [A plugin that only brings themes](themes.md#theme-only).
2. Give the repository the `kino-plugin` topic and [publish it](publish.md).
3. Validate with `node sdk/validate.mjs .` (the [kit](test-locally.md)): it prints the same warnings you see here.

The preview is an approximation of Kino made with HTML and CSS: it is good for choosing colors, shapes and borders, but the app has
the last word. The **Player** values are kept in the theme even though the preview only shows a small bar. The logo (`logo`), the
price (`price`), the experience (`experience`) and the person's adjustments (`adjustable`) are written by hand in the code: see
[App themes](themes.md).
