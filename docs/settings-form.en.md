# The settings form (apiVersion 6)

The usual [settings](manifest.md#settings) hold values your code reads with `kino.config`. From
`"apiVersion": 6` (Kino 0.9.50) the form can also **show** and **do** things, and every installed plugin
gets its own tab in Ajustes. This page has [every field type](#types), the three types without
a value, the exports that fill and check them, and [a complete example](#example).

## Its own tab in Ajustes { #own-tab }

Every installed plugin that is enabled gets **its own tab in Ajustes** (phone and TV), named after the
plugin, with its [Modo debug](diagnostics.md#debug) switch; when it has `settings` the tab holds their
form too, and Plugins ▸ Configurar opens the same form. That is why, from Kino 0.9.50,
the `auth_required` error reads "Configura {plugin} en Ajustes ▸ {plugin}" when your plugin declares
settings.

## Every field type { #types }

The form shows your settings **in the order of the manifest**, each with its `label` and, under it, its
`hint`. Nine types:

| `type` | What the person sees | What `kino.config.get(key)` returns | Since |
| --- | --- | --- | --- |
| `text` | a text field (at most 500 characters) | the text, or `undefined` | apiVersion 1 |
| `password` | a hidden text field (at most 500), kept encrypted on the device | the text, or `undefined` | apiVersion 1 |
| `url` | an address field (at most 2,048): `http`/`https`; that server becomes a host your plugin may reach ([The person's own servers](manifest.md#own-servers)) | the address as typed, or `undefined` | apiVersion 1 |
| `toggle` | a switch | `true` / `false` (`false` when there is no `default`) | apiVersion 1 |
| `select` | a choice among `options` | the chosen `value` (the first option when there is no `default`) | apiVersion 1 |
| `list` | a list the person builds with "Agregar", each entry a dialog of the list's `fields` | an array of `{ [field key]: string }`, or `undefined` when empty | apiVersion 4 |
| `section` | a heading, with `hint` as its explanation | nothing | apiVersion 6 |
| `status` | a read-only line your `settingsStatus()` fills | nothing | apiVersion 6 |
| `action` | a button that runs your `action(key)` | nothing | apiVersion 6 |

What each entry may carry:

| Attribute | Types | Rule |
| --- | --- | --- |
| `key` | all | required, `^[a-z][a-zA-Z0-9_]{0,31}$`, unique in the list |
| `label` | all | required, 1 to 40 characters |
| `type` | all | required, one of the nine above |
| `hint` | all | optional, at most 80 characters: the example or explanation under the field. On a `section`, up to 300, wrapped over several lines (Kino 0.9.51; builds before 0.9.51 refuse one over 80) |
| `required` | `text`, `password`, `url`, `list` | optional `true`/`false`. A required setting with no value stops every call ("Falta configurar") |
| `default` | `text`, `password`, `toggle`, `select` | optional. Never on `url` or `list` ("… no puede tener valor por defecto: usa "hint"") nor on the three types without a value; it must fit its type (a `select` default is one of its `values`) |
| `options` | `select` only | required: 1 to 20 `{ "value", "label" }`, `value` 1..40 characters and unique, `label` 1..40 |
| `fields` | `list` only | required: 1 to 4, each `{ key, label, type, hint?, required? }` with `type` `"text"` or `"url"`, no `default` ("Solo un ajuste de tipo list tiene "fields"") |
| `max` | `list` only | optional whole number 1..50 (default 20): how many entries |
| `confirm` | `action` only, apiVersion 6 | optional, 1 to 120 characters: asked before the action runs, with Cancelar focused ("Solo un ajuste de tipo action tiene "confirm"") |

Any other key in an entry is ignored. A manifest that breaks a rule is refused at install with a
message that names the setting (`El ajuste "quality" necesita opciones`); a `list` below apiVersion 4
or a `section`/`status`/`action` below apiVersion 6 is refused too. Limits: 12 settings with a value
(`text`, `password`, `url`, `toggle`, `select`, `list`) plus, from apiVersion 6, 16 without one.

There are **no conditional fields**: every setting is always shown, whatever another one holds. Use a
`section` with a `hint` to say which fields go together ("Opcional: sin cuenta ves el catálogo gratis"),
make them optional, and let [`validateSettings`](#validate) refuse a combination that makes no sense.

**`password` or sealed `secrets`?** A `password` setting is **the person's** credential: they type it,
your code reads it, it syncs to their other devices sealed end to end. A key that belongs to **you**, the
author (a fixed API key of the site's own player), goes in the manifest's sealed
[`secrets`](manifest.md#secrets) instead, and your code only ever holds a marker.

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

## A complete example { #example }

An account that is optional, a status line, a "Cerrar sesión" button, a quality choice, a switch and a
list of the person's own mirrors, all read the way [`kino.d.ts`](reference/index.md) declares them:

```json
{
  "id": "mi-cuenta", "name": "Mi cuenta", "version": "1.0.0", "apiVersion": 6, "entry": "plugin.js",
  "hosts": ["api.example.com"],
  "capabilities": ["search", "resolve"],
  "settings": [
    { "key": "account", "label": "Tu cuenta", "type": "section", "hint": "Opcional: sin cuenta ves el catálogo gratis" },
    { "key": "email", "label": "Correo", "type": "text", "hint": "ana@correo.com" },
    { "key": "password", "label": "Contraseña", "type": "password" },
    { "key": "linked", "label": "Estado", "type": "status" },
    { "key": "logout", "label": "Cerrar sesión", "type": "action", "confirm": "¿Cerrar la sesión de esta cuenta?" },
    { "key": "playback", "label": "Reproducción", "type": "section" },
    { "key": "quality", "label": "Calidad", "type": "select", "default": "auto",
      "options": [{ "value": "auto", "label": "Automática" }, { "value": "hd", "label": "Alta" }, { "value": "sd", "label": "Ahorro de datos" }] },
    { "key": "spanishSubs", "label": "Solo subtítulos en español", "type": "toggle", "default": true },
    { "key": "mirrors", "label": "Espejos propios", "type": "list", "max": 5,
      "fields": [{ "key": "url", "label": "Dirección", "type": "url", "required": true, "hint": "https://espejo.example.org" },
                 { "key": "name", "label": "Nombre", "type": "text", "hint": "Espejo de la casa" }] }
  ]
}
```

```js
const API = "https://api.example.com";
// Keyed by the account: settings can change under the plugin (another device, clearSettings).
const sessionKey = () => `session:${kino.config.get("email") ?? ""}`;

async function login(email, password) {
  const r = await kino.fetch(`${API}/login`, { method: "POST", body: { json: { email, password } } });
  if (r.status === 401) throw kino.error("auth_required", "login 401");
  if (!r.ok) throw kino.error("unavailable", `login ${r.status}`);
  return r.json().token;
}

async function session() {
  await null;                                    // the first await before anything can throw
  const email = kino.config.get("email");        // undefined: signed out, free catalog
  if (!email) return null;
  const saved = kino.storage.get(sessionKey());
  if (saved) return saved;
  const token = await login(email, kino.config.get("password") ?? "");
  kino.storage.set(sessionKey(), token, { ttlMs: 12 * 60 * 60 * 1000 });
  return token;
}

export async function settingsStatus() {         // one text per "status" key
  const email = kino.config.get("email");
  if (!email) return { linked: "Sin cuenta: ves el catálogo gratis" };
  try {
    await session();
    return { linked: "Cuenta vinculada" };
  } catch (e) {
    return { linked: e.code === "auth_required" ? "El correo o la contraseña no coinciden" : "No se pudo revisar la cuenta ahora" };
  }
}

export async function action(key) {             // one call per "action" button
  if (key !== "logout") return null;
  const token = kino.storage.get(sessionKey());
  if (token) await kino.fetch(`${API}/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  kino.storage.remove(sessionKey());
  return { message: "Sesión cerrada", clearSettings: ["email", "password"] };
}

export async function validateSettings(values) { // before saving: null accepts
  await null;
  if (values.email && !values.password) return { password: "Escribe la contraseña de esa cuenta" };
  if (values.password && !values.email) return { email: "Escribe el correo de la cuenta" };
  if (values.email) {
    try {
      await login(values.email, values.password);
    } catch (e) {
      if (e.code === "auth_required") return { password: "El correo o la contraseña no coinciden" };
      throw e;                                    // the person may "Guardar sin comprobar"
    }
  }
  return null;
}

export async function search(query) {
  const token = await session();
  const r = await kino.fetch(`${API}/search?q=${encodeURIComponent(query.q)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw kino.error("unavailable", `search ${r.status}`);
  return r.json().results.map((x) => ({ id: String(x.id), ref: String(x.id), title: x.title, kind: "movie" }));
}

export async function resolve(ref) {
  const token = await session();
  const quality = kino.config.get("quality");    // "auto", "hd" or "sd": a select always has a value
  const r = await kino.fetch(`${API}/play/${encodeURIComponent(ref)}?q=${quality}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw kino.error("not_found", `play ${r.status}`);
  const s = r.json();                            // { url, path, subtitles: [{ lang, url }] }
  const mirrors = kino.config.get("mirrors") ?? []; // [{ url, name? }]: each url is a server the person typed
  return {
    url: s.url,
    label: "Principal",
    subtitles: kino.config.get("spanishSubs") ? s.subtitles.filter((t) => t.lang === "es") : s.subtitles,
    alternatives: mirrors.slice(0, 8).map((m) => ({ url: m.url.replace(/\/+$/, "") + s.path, label: m.name || "Espejo" })),
  };
}
```

What the person gets: a tab "Mi cuenta" in Ajustes with two headings; "Estado" reads "Sin cuenta: ves
el catálogo gratis" until they type an account; Guardar checks the account before saving it;
"Cerrar sesión" asks first, then empties the correo and the contraseña on every device of theirs; each
mirror shows up as one more copy in the player's Servidor menu.

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
