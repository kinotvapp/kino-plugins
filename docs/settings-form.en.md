# The settings form (apiVersion 6)

The usual [settings](manifest.md#settings) hold values your code reads with `kino.config`. From
`"apiVersion": 6` (Kino 0.9.50) the form can also **show** and **do** things, and every plugin with
settings gets its own tab in Ajustes.

## Its own tab in Ajustes { #own-tab }

Every installed plugin that is enabled and has `settings` gets **its own tab in Ajustes** (phone and
TV), named after the plugin; Plugins ▸ Configurar opens the same form. That is why, from Kino 0.9.50,
the `auth_required` error reads "Configura {plugin} en Ajustes ▸ {plugin}" when your plugin declares
settings.

## Three types that hold no value { #ui-types }

From apiVersion 6 there are three types that hold no value (never in `kino.config`, never `required`,
no `default`), at most 16 of them on top of the 12 valued settings:

```json
"settings": [
  { "key": "account", "label": "Tu cuenta", "type": "section", "hint": "Opcional: sin cuenta usas la sesión anónima" },
  { "key": "email", "label": "Correo", "type": "text" },
  { "key": "password", "label": "Contraseña", "type": "password" },
  { "key": "linked", "label": "Estado", "type": "status" },
  { "key": "logout", "label": "Cerrar sesión", "type": "action", "confirm": "¿Cerrar la sesión de esta cuenta?" }
]
```

- **`section`**: a heading; `hint` is its explanation.
- **`status`**: a read-only line. Kino calls your `settingsStatus()` when the form opens (10 s) and
  shows the text you return under that key: `{ linked: "Vinculada como ana@…" }` (at most 200
  characters). Until it answers the line reads "Cargando…"; a missing key or a value that is not a text
  shows "Sin información"; a timeout or an error shows "No se pudo consultar". The rest of the form keeps
  working either way. **Required export** when a `status` setting exists.
- **`action`**: a button. Kino calls your `action(key)` (30 s), one action at a time (the other buttons
  and Guardar wait), and shows the `message` you return (at most 300 characters) or "Listo"; if it throws
  or times out, the person sees the error text instead. Kino asks `settingsStatus()` again after every action (and when the form opens), so the status lines describe what it just did; `refresh: true` is still accepted and changes nothing.
  `confirm` (1 to 120 characters) asks first, with Cancelar focused. **Required export** when an
  `action` setting exists.

## Forgetting settings from an action (`clearSettings`) { #clear-settings }

An action may also **forget settings of your own** with `clearSettings`: up to 12 keys of your declared
valued settings (`text`, `url`, `password`, `toggle`, `select`, `list`). After the action returns, Kino
empties them exactly as if the person had emptied the fields and pressed Guardar (a `password` also
leaves the Keystore), closes your sandbox and forgets cookies and cached Home rows as for any saved
change (`kino.storage` survives), reloads the form and asks `settingsStatus()` again; your `message` is
still shown. It is how a "Cerrar sesión" button stops the next expired token from signing the person in
again with the saved account.

```js
export async function action(key) {
  if (key === "logout") {
    await api.logout();                       // tell the server first: a throw here keeps the saved account
    return { message: "Sesión cerrada", clearSettings: ["email", "password"] };
  }
}
```

(`email` and `password` must be optional settings here; mark the account `required` only if the plugin
cannot work signed out.)

Limits:

- Only the action's own plugin is ever touched.
- An entry that is not a string, is unknown, names a `section`/`status`/`action`, names a `required`
  setting (clearing it would make every later call fail), repeats, or comes after the twelfth is dropped
  with a log line (`run.mjs` shows `[dropped by Kino]`); a value that is not an array is ignored.
- An action that throws or times out clears nothing.

## Checking before saving (`validateSettings`) { #validate }

`validateSettings(values)` (optional, 20 s) runs **before** Kino saves. `values` holds only the valued
settings: strings trimmed, toggles as booleans, lists as arrays of objects.

- Return `null` to accept.
- `{ password: "La contraseña no es correcta" }` refuses with that text under the field (at most 200
  characters), or a text refuses with a general message. A key that is not one of your valued settings
  also refuses, its text shown as the general message.
- Nothing is saved on a refusal and the person keeps what they typed.
- If it throws, times out or answers something Kino cannot read (an array, a number…), nothing is saved
  either, and the form offers **"Guardar sin comprobar"**; that button is offered only then, never after
  a refusal with messages.

## Common rules { #rules }

- Texts you return are shown after Kino removes any of your stored secrets from them.
- These three exports run even while a `required` setting is still empty, so a status line can say what
  is missing.
- Saving any setting closes your sandbox, as always; `kino.storage` survives.
- If you declare `telemetry`, a failure of `settingsStatus`, `action` or `validateSettings` is reported
  like any other function's ([Logs and telemetry](diagnostics.md)).

Try them with the kit (it prints what the app would keep): `node sdk/run.mjs . settingsStatus`,
`node sdk/run.mjs . action logout`, `node sdk/run.mjs . validateSettings '{"email":"ana@x.co"}'` (`--raw`
prints your answer untouched). The kit does not apply the app's secret scrubbing, and
`validateSettings` receives exactly the JSON you type: the app sends only valued settings, trimmed. A
working example is `plugins/sdk/test/settings-demo` in Kino's repository.

## On the person's other devices { #other-devices }

When the person pairs two of their devices (phone and TV), Kino keeps their plugins in step. What
crosses, and what does not:

- **Crosses:** install, updates, on/off, uninstall, and the host approvals. Each device fetches your
  code itself; only the address and the approval travel. The other device installs **silently** when
  what it fetched asks for nothing beyond what the person approved on the first one; if you now ask for
  more (a new host, permission or capability), it waits in "Plugins de tus otros aparatos" for the
  normal consent sheet.
- **Crosses:** the values of `text`, `select`, `toggle`, `url` and `list` settings (a `list` that has a
  `password` field does not travel), and `password` settings, sealed end to end with the key the devices
  agreed when they paired, never readable on the way.
- **Crosses:** clears. A field the person empties, or an action's `clearSettings`, empties it on their
  other devices too (passwords included). A `required` setting is never cleared remotely. A device
  running an older Kino build ignores clears and keeps its value.
- **Never crosses:** `kino.storage`, cookies, the cached Home rows.

A value that arrives this way is applied **without** your `validateSettings`, and, like any saved
change, closes your sandbox. So write the plugin as if a setting can change under it at any time: key
any session you keep in `kino.storage` by the account it belongs to, and never put a device identity in
a setting, because it would be copied to the other device.

```js
const sessionKey = `session:${kino.config.get("email") ?? ""}`;   // not just "session"
```

A [signed](signed.md) plugin installed from two different repositories on two devices counts as the
same plugin when both have the same `id` and the same author key: see
[The same plugin at two addresses](signed.md#two-addresses).
