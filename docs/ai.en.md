# Build a plugin with AI

An AI coding assistant (Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot, Aider…) can write a
Kino plugin for you if it reads the rules first, **even if you cannot program**: you say which source
you want and try the result in Kino; the assistant writes the code, tests it with the kit and tells
you what to do at each step. This site publishes the rules in the shapes those tools read best:

| File | What it is |
| --- | --- |
| [`AGENTS.md`](https://kinotvapp.github.io/kino-plugins/AGENTS.md) | The instructions for the assistant: its role, what to read, the step-by-step workflow, the hard rules with their exact numbers, a checklist and the usual mistakes. Also in [the repository](https://github.com/kinotvapp/kino-plugins/blob/main/AGENTS.md). |
| [`llms-full.txt`](https://kinotvapp.github.io/kino-plugins/llms-full.txt) | This whole guide as one text file (English), plus `AGENTS.md`, `contract.json` and `kino.d.ts`. Built with the site, so it is always the same version as these pages. |
| [`llms.txt`](https://kinotvapp.github.io/kino-plugins/llms.txt) | The short index, in the [llms.txt](https://llmstxt.org/) format. |

!!! tip "Want to use a Nuvio scraper?"
    You do not need this prompt: Kino installs the scrapers of a Nuvio repository directly,
    converting them on the device. See [Nuvio scrapers](nuvio.md). The same goes for a Stremio addon
    ([Stremio addons](stremio.md)) and, from Kino 0.9.54, for the plugins of a CloudStream repository
    ([CloudStream plugins](cloudstream.md)).

## Before you start { #before }

You need five things. All are free except, sometimes, the assistant.

1. **A GitHub account** ([github.com/signup](https://github.com/signup)). Your plugin lives in a
   public GitHub repository; Kino installs it from there.
2. **Node.js 18 or newer** ([nodejs.org](https://nodejs.org/), the "LTS" version). It runs the test
   kit. To check, in a terminal: `node --version` must answer `v18` or a higher number.
3. **Git** ([git-scm.com](https://git-scm.com/downloads)), to download and upload the repository.
   Optional but handy: [GitHub CLI](https://cli.github.com/) (`gh`), with which the assistant can
   create the repository and set its topic for you (the first time, `gh auth login`).
4. **An assistant that can use the terminal**, that is, one that runs commands and reads what they
   answer:
    - in the terminal: Claude Code, Codex CLI, Gemini CLI, Aider;
    - in an editor: Cursor, or VS Code with GitHub Copilot in agent mode.

    **How to open a terminal:** on Windows, Start menu → type "Terminal" (or "PowerShell"); on a
    Mac, Cmd + Space → type "Terminal"; on Linux, Ctrl + Alt + T. Create an empty folder, go into it
    and start the assistant there.

    A chat in the browser, with no terminal, works too, but then you copy each command, run it and
    paste what it answers back into the chat.
5. **Kino on a phone or a TV**, to try the plugin for real before sharing it.

And one more thing: **the right to use the source.** A plugin can only reach what the person could
watch anyway; do not ask an assistant to get around a paywall, someone else's login or DRM.

## The prompt { #prompt }

Copy it (the copy button is at the top right of the block), change what is between `<<<` and `>>>`
and paste it into your assistant. If you do not know what to put on a line, leave it as it is: the
assistant will ask you.

```text
You are going to write a Kino plugin: a public GitHub repository with kino-plugin.json and one
JavaScript ES module (plugin.js) that the Kino app (video, live TV, music and podcasts) runs in a
QuickJS sandbox.

I may not know how to program. Explain each step in plain words, run the commands yourself (tell
me first which one and why), ask me before anything that cannot be undone (deleting, publishing,
pushing to GitHub) and, when I have to do something on GitHub or in Kino, give me the exact clicks.

Before writing anything:
1. Read https://kinotvapp.github.io/kino-plugins/AGENTS.md completely and follow it as your
   instructions.
2. Read https://kinotvapp.github.io/kino-plugins/llms-full.txt (the whole guide, contract.json and
   kino.d.ts). If you cannot open URLs, tell me and I will paste them.
3. Start from a template, with "Use this template" (never Fork): kinotvapp/kino-plugin-archive if my
   plugin is simple, kinotvapp/kino-plugin-own-server if it needs settings, a session, downloads or
   live channels (its plugin.js and kino-plugin.json, "Tu servidor" 1.5.0, are the complete API
   reference, up to apiVersion 7). The template's sdk/ folder is the Node test kit. If my plugin is
   music or podcasts, also read the "Music and podcasts" section of the contract (apiVersion 8, Kino
   0.9.54: https://kinotvapp.github.io/kino-plugins/en/contract/#music-podcasts) and use
   kinotvapp/kino-plugin-archive-audio as the reference audio plugin.

What I want:
- Source: <<< the site or API, e.g. https://example.com >>>
- Content: <<< movies / series / anime / live TV / music / podcasts or audiobooks / a catalog that plays nothing (lists or ratings); language and country >>>
- Access: <<< none / my username and password on the site / an API key of mine (the developer's) that I do not want to publish / the address of a server each person types >>>
- What Kino asks the person when setting it up: <<< nothing / their username and password / their region / their server's address >>>
- Offline downloads: <<< yes / no >>>
- Name in Kino and a short description: <<< e.g. "Mi fuente": "Películas de …, en español" >>>
- Sign the plugin with my own key, so people know every update is mine: <<< yes / no >>>
- My GitHub user: <<< e.g. my-user >>>

Rules you cannot break (the detail and exact numbers are in AGENTS.md):
- Declare in "hosts" every host you know: the API's and the video's, subtitles', audio's, segments'
  and redirects' (*.x does not cover x). If one is missing, Kino asks the person once when a title
  is opened or played; do not rely on it. If the video comes from changing CDNs, use
  "streamHosts": "any" (apiVersion 4; the person approves it at install); for live channels,
  "liveStreamHosts": "any" (apiVersion 3, needs the "channels" capability). If the site or its
  extractors rotate domains and you cannot list them, use "fetchHosts": "any" (apiVersion 8, Kino
  0.9.54; the person approves it in red, it never reaches the home network) and check kino.fetchAnyHost.
  There is no maximum number of hosts from Kino 0.9.45; Kino 0.9.44 and older refuse more than 20, so
  if you declare more than 20, tell me.
- In kino-plugin.json write "entry": "plugin.js" and "icon": "icon.png", NEVER "./plugin.js": Kino
  0.9.45 and older refuse a leading "./" and the plugin does not install.
- It is neither Node nor a browser: no fetch, setTimeout, Buffer, process, require, crypto or Intl;
  use kino.fetch, kino.sleep, kino.crypto, kino.storage. URL, URLSearchParams, atob, btoa,
  TextEncoder, TextDecoder and console do exist. One file, no import.
- Never throw before the first await of an async function (await first, validate after): Kino 0.9.50
  catches it, but 0.9.49 and older abort the whole call, and people update late.
- Use kino.fetch whenever it can find the video. Only if a server's embed builds the address by
  running its own scripts, use the hidden browser ("browser": true, apiVersion 6; it asks me in red)
  and call kino.browser.capture only inside resolve. Never try to solve or get around a captcha or a
  "verify you are human" check: on blocked, move to the next server. If a title has several servers
  or languages, resolve one and list the others as alternatives { label, ref }.
- Limits: search 15 s and the other calls 20 s; 60 requests per call (every redirect hop counts,
  refused ones too) and at most 6 at once; 5 MB bodies; 256 KB of
  kino.storage; 100 search results; Home with 20 rows of 60.
- Errors for the person: kino.error("auth_required" | "not_found" | "geo_blocked" |
  "rate_limited" | "unavailable"). With apiVersion 6 you may add a sentence of your own,
  kino.error(code, detail, { userMessage: "…" }): in Spanish (or in kino.lang's language, see the
  language rule), at most 160 characters, no URL or
  domain, no long numbers, never asking for money, passwords, codes or contact outside Kino, and never
  echoing what the person typed (Kino shows it as "Mensaje de <plugin>: …" only if it passes all its
  rules; a plugin that uses it to ask for money or data breaks the rules and is taken out of the community index).
- 18+ content: mark it with adult: true (apiVersion 6; Kino shows it only with the 18+ code
  unlocked). Never try to get around that lock.
- Everything the person reads is in Spanish from Bogotá with tuteo, never voseo, and the texts the
  code builds (row titles, userMessage) are in kino.lang's language: from Kino 0.9.54 kino.lang may be
  "en-US", and then they go in English (before 0.9.54 it is always "es-CO").
- Music and podcasts (apiVersion 8, Kino 0.9.54): kind "music" is an album, a playlist or a track;
  kind "podcast" is a show, an audiobook or a radio program; "artist" is optional (the artist, or the
  host or author). If the plugin declares "episodes", episodes() must answer for every music and
  podcast ref, even a single track; without "episodes", the item's own ref goes to resolve. Below
  apiVersion 8 such items are dropped.
- Feature-detect what older Kino lacks: kino.meta and kino.tmdb (Kino 0.9.53) only behind
  `typeof kino.meta === "function"` / `typeof kino.tmdb === "function"`, and the hidden browser's
  captureAll options (Kino 0.9.54) only when `kino.browser.captureAll === true`. TMDB goes through
  kino.tmdb, never with a key in the code. Never export a helper named "details": from apiVersion 8
  it is a reserved export.
- Nothing secret in the code or the repository. Each person's username and password go in a
  "password" setting. An API key of mine is sealed: "secrets" in the manifest, sealed with
  `node sdk/seal.mjs --repo USER/REPO --name name`, and kino.secret("name") in the code
  (apiVersion 4).
- Downloads are declarative: if the source allows it, add "download" to "capabilities" (apiVersion
  2) and export nothing extra; Kino calls resolve itself when the download runs. Movies and
  episodes are saved from a plain file (mp4, mkv…) or from HLS that is not live; live channels,
  DASH and anything with DRM, never.
- Signing (only if I said yes): "apiVersion": 5 (needs Kino 0.9.45+). Tell me, in plain words, what
  it is for, and walk me through it: `node sdk/seal.mjs --keygen` ONCE (it writes
  kino-author-key.pem), add `*.pem` to .gitignore BEFORE any commit, and tell me to back the key up
  and never share it (if it is lost, everyone who installed the plugin must uninstall and reinstall
  it). Then `node sdk/seal.mjs --sign --repo USER/REPO` AFTER the last change to plugin.js or
  "version" and again after every later change, never commit the .pem. Never print the key's
  contents in the chat.
- apiVersion: the lowest that works (3 for channels, 4 only for secrets, "streamHosts": "any" or a
  "list" setting, 5 only for a signed plugin, 6 only if you use an apiVersion 6 feature: status lines
  and buttons in the settings, a section of its own, colors, telemetry, migrate, request signing,
  userMessage, adult, channels in Home rows; 6 needs Kino 0.9.50 or newer; 7 only for "tracking" or
  "segments", and it needs Kino 0.9.51 or newer; 8 only for "music" or "podcast" items or the details
  export, and it needs Kino 0.9.54 or newer). A catalog that plays nothing declares "catalogOnly": true
  (Kino 0.9.54) and still exports a resolve that fails with not_found, for older Kino. A new id of my own (never
  "archive-org").
- No "debug": true in a published plugin unless I ask for it: every plugin already has a "Modo debug"
  switch in Kino's Ajustes, and "debug": true only turns it on by default for everyone. "telemetry" only if I agree that the
  plugin's errors reach Kino; log steps and counts, never what the person types.

Work step by step: first explore the source with real requests, then the manifest, then each
function. After each step run `node sdk/validate.mjs .` and `node sdk/run.mjs . <function> …` and
fix everything Kino would drop. Record fixtures with --record and make
`node --test test/plugin.test.mjs` pass offline. Finish with the AGENTS.md checklist, and before
you hand the plugin over run this self-check and tell me the result of each line:
- `node sdk/validate.mjs .` exits 0 with no problems;
- kino-plugin.json: "entry" and "icon" have no leading "./"; "version" raised; apiVersion is the
  lowest that works; no "debug": true unless I asked for it;
- if signing: "signature" is in kino-plugin.json, `validate.mjs` verified it AFTER the last edit, and
  no .pem is tracked (`.gitignore` has *.pem);
- every host (video, subtitles, segments, redirects) is in "hosts" or covered by an "any" field;
- for discovery: the repository is public and not a fork, the topic kino-plugin is set, and the
  manifest has a Spanish "name" and "description";
- if it plays nothing: "catalogOnly": true, and a resolve that fails with not_found for older Kino;
- if it has music or podcasts: "apiVersion": 8, every audio item has kind "music" or "podcast", and
  (with "episodes") episodes() answers every audio ref, even a single track.

At the end, walk me through:
1. Publishing it: a public repository (never a fork) with the files at the root; the topic
   kino-plugin and a GitHub description (About → ⚙ → Description and Topics → Save changes, or
   `gh repo edit USER/REPO --add-topic kino-plugin --description "…"`); and a good "name" and
   "description", in Spanish, in kino-plugin.json, because that is what people see in Kino.
2. Installing it in Kino: on a phone, menu ☰ → Plugins → + button; on a TV, Ajustes → Plugins →
   Agregar. Type USER/REPO → Agregar → read the sheet → Instalar (and Configurar if it asks for data).
3. What to try by hand in Kino, and what to do if something fails.
```

## A filled-in example { #example }

This is the "What I want" part for a simple public source. Paste it instead of the prompt's if you
want to rehearse the whole path before making your own:

```text
What I want:
- Source: https://archive.org, only the film noir collection (https://archive.org/details/Film_Noir)
- Content: movies; in English
- Access: none
- What Kino asks the person when setting it up: nothing
- Offline downloads: yes
- Name in Kino and a short description: "Cine negro": "Películas clásicas de cine negro de archive.org, de dominio público. No pide cuenta."
- My GitHub user: my-user
```

## Getting Kino to find your plugin { #listed }

Installing it by typing its address works from the start. For it to also show up by itself in Kino,
in the "De la comunidad" tab of the Plugins screen, the repository must:

1. be **public** and **not a fork** (create it with "Use this template");
2. have `kino-plugin.json` at its root, valid for `node sdk/validate.mjs .`, with a `name` and a
   `description` in Spanish (that is what the card shows);
3. carry the topic **`kino-plugin`** (About → ⚙ → Topics) and, better, a GitHub description;
4. on Kino 0.9.53 and older, be among the 30 with the most stars on the topic.

From Kino 0.9.54 the app reads the matches 100 at a time, in the order the person picks ("Populares"
or "Recientes"), "Cargar más" reads the next 100, and "Buscar en GitHub" finds a plugin by its
repository's name and description, so a plugin with no stars is found too. Each device searches again
every 12 hours, or when "Actualizar" is tapped. The exact clicks and how
to check it: [Get listed in Kino](listed.md).

## Signed plugins { #signed }

If you want people to know that every update comes from you, ask for a [signed plugin](signed.md)
(`"apiVersion": 5`, Kino 0.9.45+): you make a key once, the assistant signs `plugin.js` with it
after every change, and Kino checks the signature at install and at each update. The private key
stays on your computer: it must **never** go to GitHub (`*.pem` in `.gitignore`), and you should back
it up, because if it is lost, everyone who installed the plugin has to uninstall and reinstall it.
It is optional: an unsigned plugin works the same. [Read the whole page](signed.md).

## If something fails { #troubleshooting }

Paste **the full text** the terminal printed into the assistant (not a summary) and say what you
expected. Some common cases:

| What you see | What to do |
| --- | --- |
| `node: command not found`, "node is not recognized…" | Node is not installed, or you opened the terminal before installing it: install it and open a new terminal. |
| `✗ kino-plugin.json: …` | The manifest breaks a rule; the message is the one Kino gives. Ask the assistant to fix it following AGENTS.md. |
| `[dropped by Kino] …` | Kino would drop those results. Ask which rule of [the contract](contract.md) they break, instead of accepting a blind patch. |
| `[host_not_allowed] …` | A host missing from `hosts`: have it declared. |
| `El campo "entry" debe ser una ruta relativa a un archivo .js` (Kino) or `Quita el "./" del campo "entry"` (kit) | `"entry"` (or `"icon"`) starts with `./`. Write `"plugin.js"`: Kino 0.9.45 and older refuse the `./` ([why](manifest.md#entry-dot-slash)). |
| `La firma del autor no es válida…` | The plugin is [signed](signed.md) and `plugin.js` or `version` changed after signing: run `node sdk/seal.mjs --sign --repo owner/repo` again. |
| `[timeout] …` | The source is slow or there are too many requests: have it make fewer requests per call. |
| Works in the kit but fails in Kino | The Node kit is more permissive than the app ([what it does not reproduce](test-locally.md#differences)): missing globals, a `throw` before the first `await` (on Kino 0.9.49 and older), `kino.html.select`. Give the assistant the exact message Kino shows (or a photo of the screen). |
| Kino says "Configura … en Ajustes ▸ Plugins" | The plugin needs data: tap the message's Configurar button, or go to Plugins → Instalados → your plugin → Configurar. |
| It does not show in "De la comunidad" | See [Get listed in Kino](listed.md). |

**Kino's logs** (for someone with a computer connected to the phone with `adb`):
`adb logcat -s KinoPlugin` shows what the plugin writes with `kino.log`. Never paste passwords or
keys into the chat.

## Tips { #tips }

- **Give the assistant a terminal.** The kit only helps if the assistant can run
  `node sdk/validate.mjs .` and `node sdk/run.mjs …` and read what they print.
- **Try it in the app.** The Node kit is more permissive than Kino
  ([what it does not reproduce](test-locally.md#differences)): install the plugin and check that it
  searches, lists episodes, plays (and downloads, if you declared it) before sharing it.
- **Ask for the reasons.** When the kit reports a dropped item, ask the assistant which rule of
  [the contract](contract.md) it broke, instead of accepting a patch.
- **Raise the version on every change.** Kino only installs an update whose `version` is higher
  ([Publishing](publish.md#updates)).
- **Mind the rights.** A plugin can only reach what the person could watch anyway; do not ask an
  assistant to get around a paywall, a login or DRM.
