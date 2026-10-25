# QR codes: showing one and scanning one (`qr` and `qrScan`, apiVersion 13) { #qr }

!!! note "apiVersion 13 is in development"
    Nothing on this page is in a released Kino yet. apiVersion 13 arrives in Kino 0.9.74, the next release, together with
    apiVersion 12; it is not published yet. Every Kino before 0.9.74 refuses a manifest with `"apiVersion": 13` ("Este
    plugin necesita una versión más nueva de Kino"). The contract and the kit already know it, so you can write and test a
    plugin now and publish it when Kino 0.9.74 is out.

Some sign-ins are easier with a camera than with a keyboard, above all on a TV: the new device shows a QR code, and a
phone that already holds the account scans it and says "yes, let this device in". Kino gives you both halves, and
neither knows anything about your service:

- **Showing a QR:** the settings form's [`qr` setting](#qr-setting) draws one from a text your `settingsStatus()` returns,
  and asks for it again every `refreshMs`, so a code that expires is replaced in place. It needs no capability.
- **Scanning a QR:** `kino.qr.scan()` opens Kino's own camera scanner full screen on the phone and gives you the decoded
  text. It needs the `qrScan` capability.

## Declaring `qrScan` { #declare }

`qrScan` needs `"apiVersion": 13` and is declarative: nothing to export, no consent line, no approval
at install (the scanner only opens while the person is using your plugin, it names your plugin, and nothing is read
until they point the camera at a code). Below 13 the manifest is refused with "The \"qrScan\" capability needs apiVersion
13". Without the capability there is no `kino.qr` at all (`typeof kino.qr === "undefined"`), and `sign()` never has it.

```json
"capabilities": ["search", "resolve", "qrScan"]
```

## The call { #call }

`await kino.qr.scan({ title?, titleEn? })` resolves with the scanned text, or `null` when the person
closed the scanner (the close button, Back, or leaving the screen). `title` is your line under your plugin's name
(`titleEn` is shown instead when Kino speaks English); each is optional, at most 80 characters, shown on at most two
lines, and may hold no control, bidi or format character (no line break, no right-to-left override, no invisible
character), so it can never pass for one of Kino's own lines. Anything else you pass is dropped.

## What the person sees { #what-people-see }

The camera image with a frame to aim at and, at the top: "<your plugin's name> quiere leer un
código QR" ("… wants to read a QR code"), using the name of the plugin as installed (never a text you send), then your
`title`, then Kino's own instruction ("Apunta la cámara al código QR"), and a close button. The first code the camera
decodes that holds 1 to 4,096 characters answers your call and closes the scanner; a longer code is ignored, the
scanner says "Este código no es válido para <your plugin>" ("This code is not valid for …") and keeps looking. Without the camera permission Kino asks for it; if the person refuses, Kino explains why it needs
the camera, with Retry and Cancel.

## Where it works { #where }

Only on a phone or tablet with a camera, in Kino's phone interface: on a TV (and on any device
without a camera) the scanner never opens and the call fails with `unavailable`. A scan runs
only from a settings `action` or a `panelAction`, that is, when the person pressed one of your buttons: every other
call fails with `not_allowed` ("kino.qr.scan only runs from a settings action or panelAction"), even one the person started (Home, a search, a play, a list, a title
page, your section, `settingsStatus`), so the camera never opens by itself while someone browses. While the scanner is up, that call's own time limit stops (the 30 s of an `action` does not run out
while the person looks for the other device); the scanner itself closes after 120 s with `timeout`. One scanner on
screen at a time, for the whole app: a second scan while one is open, yours or another plugin's, fails at once with
`busy`. Kino checks, in this order: the request (`invalid_request`), the device (`unavailable`), where the call comes from
(`not_allowed`), and the open scan (`busy`).

| Error `code` | When | What to do |
| --- | --- | --- |
| `busy` | A scan is already open (yours or another plugin's). | Wait for it; do not loop. |
| `timeout` | Nothing was scanned in 120 s. | Say so, and let the person try again. |
| `unavailable` | This device cannot scan: no camera, or Kino's TV interface. | Show the code another way: a settings `qr` setting, or a typed code. |
| `not_allowed` | The call is not a settings `action` or a `panelAction` (Home, search, a play, `settingsStatus`…). | Scan from a button: an `action` setting or a panel button. |
| `permission_denied` | The person did not give Kino the camera. | Tell them they can allow it in the phone's settings. |
| `invalid_request` | `title` or `titleEn` is not a string, is over 80 characters or holds a control or formatting character, or the argument is not an object. | Fix the call. |

## Privacy { #privacy }

You get only the text of the one code the person pointed the camera at, never an image or anything else the
camera saw. That text comes from the world: check it (its prefix, its length, its shape) before you act on it. Only your
plugin gets it, and only from the scan your call opened.

## Recipe: sign a new device in with a phone { #recipe }

The new device (say, the TV) shows a login code in its settings; the phone
where the person is already signed in scans it from an action. The service here is a made-up `api.example.com` with three
calls: create a login token, ask whether it was accepted, accept it with a session. Both devices run the same plugin:

```js
// kino-plugin.json (the parts that matter): {"apiVersion": 13, "hosts": ["api.example.com"], "capabilities": ["search", "resolve", "qrScan"], "settings": [{"key": "state", "label": "Cuenta", "labelEn": "Account", "type": "status"}, {"key": "login", "label": "Escanéalo desde tu teléfono", "labelEn": "Scan it from your phone", "type": "qr", "refreshMs": 5000}, {"key": "link", "label": "Vincular otro aparato", "labelEn": "Link another device", "type": "action"}]}
const API = "https://api.example.com";
const PREFIX = "exampleapp://login?token=";

async function api(path, body) {
  const r = await kino.fetch(API + path, body === undefined ? {} : { method: "POST", body: { json: body } });
  if (!r.ok) throw kino.error("unavailable", path + " answered " + r.status);
  return r.json();
}

// The NEW device, not signed in: show a fresh login code, and keep the session once a phone accepted it.
// Kino calls this when the form opens, after every action and every refreshMs (5 s) while the form is on screen.
export async function settingsStatus() {
  if (kino.storage.get("session")) return { state: "Vinculado" }; // no "login" key: no QR is drawn
  let pending = JSON.parse(kino.storage.get("pending") || "null");
  if (pending) {
    const s = await api("/login/status?token=" + encodeURIComponent(pending.token));
    if (s.session) {
      kino.storage.set("session", s.session);
      kino.storage.remove("pending");
      return { state: "Vinculado" };
    }
  }
  if (!pending || pending.expires - Date.now() < 10000) {
    pending = await api("/login/token", {}); // { token, expires }: a new code before the old one runs out
    kino.storage.set("pending", JSON.stringify(pending));
  }
  return { state: "Esperando que lo escanees", login: PREFIX + pending.token };
}

// The phone, signed in: scan the new device's code and accept it with this phone's session.
export async function action(key) {
  if (key !== "link") return null;
  const session = kino.storage.get("session");
  if (!session) return { message: "Primero inicia sesión en este aparato" };
  let text;
  try {
    text = await kino.qr.scan({ title: "Escanea el código del otro aparato", titleEn: "Scan the other device's code" });
  } catch (e) {
    if (e.code === "unavailable") return { message: "Este aparato no puede escanear: hazlo desde tu teléfono" };
    if (e.code === "permission_denied") return { message: "Permite la cámara a Kino en los ajustes del teléfono" };
    if (e.code === "timeout") return { message: "No se leyó ningún código: inténtalo otra vez" };
    throw e;
  }
  if (text === null) return { message: "Cancelado" };
  if (!text.startsWith(PREFIX)) return { message: "Ese código no es de inicio de sesión" };
  await api("/login/accept", { token: text.slice(PREFIX.length), session });
  return { message: "Listo: el otro aparato ya entró" };
}

export async function search() { return []; }
export async function resolve() { throw kino.error("not_found", "this example plays nothing"); }
```

What happens: on the TV the form shows "Esperando que lo escanees" and the QR; every 5 s Kino asks `settingsStatus()`
again, which swaps in a new code before the old one expires and notices when the phone accepted it. On the phone the
person presses "Vincular otro aparato", the scanner opens under the plugin's name, they point it at the TV, and the
action accepts the token. At the TV's next refresh the line turns into "Vinculado" and the QR goes away. Pressing the
button on the TV itself answers "Este aparato no puede escanear" (`unavailable`): the same plugin, no special case.

## The `qr` setting's rules { #qr-setting }

The [settings form](settings-form.md#qr)'s `qr` type, in full: its text is what `settingsStatus()` returns under its key, 1 to
512 characters, no control character; an `http`/`https` address must be https on a public host; any other text, such as
an app link like `exampleapp://login?token=…`, is drawn as it is; a text that would be longer, or that holds one of your sealed
secrets, draws no QR. `"refreshMs"` goes from 2000 to 60000 ms; without it the text is asked only when the form opens
and after an action. A refresh never cancels a `settingsStatus()` still running (that would restart your plugin and
close its sockets): the periodic one is skipped, and the one after an action waits for it and asks once more. The QR on
screen stays up until the new text replaces it.

## In the kit { #kit }

Node has no camera: `createKino(manifest, { qrScan })` takes a fake, `async ({ title, titleEn, invalid })
=>` the text "scanned", or `null` for a cancel; it may throw `kino.error("permission_denied")` and the like. Without one,
and with `device: "tv"`, `kino.qr.scan` fails with `unavailable`, as on a TV. The kit applies the same checks, in the same
order, with the same errors as the app: `not_allowed` unless the call is your plugin's `action` or `panelAction` (the kit
knows which export is running when it is called through `run.mjs` or `loadPlugin`), `busy` for a second scan while one is
open, `invalid_request` for a bad title. A code over 4,096 characters is ignored like on the phone: the kit asks your fake
again with `invalid: true` (the scanner keeps looking), and answers `timeout` after 10 ignored codes.
