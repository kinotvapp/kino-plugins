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
    converting them on the device. See [Nuvio scrapers](nuvio.md).

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
JavaScript ES module (plugin.js) that the Kino video app runs in a QuickJS sandbox.

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
   live channels (its plugin.js and kino-plugin.json are the complete API reference). The template's
   sdk/ folder is the Node test kit.

What I want:
- Source: <<< the site or API, e.g. https://example.com >>>
- Content: <<< movies / series / anime / live TV; language and country >>>
- Access: <<< none / my username and password on the site / an API key of mine (the developer's) that I do not want to publish / the address of a server each person types >>>
- What Kino asks the person when setting it up: <<< nothing / their username and password / their region / their server's address >>>
- Offline downloads: <<< yes / no >>>
- Name in Kino and a short description: <<< e.g. "Mi fuente": "Películas de …, en español" >>>
- My GitHub user: <<< e.g. my-user >>>

Rules you cannot break (the detail and exact numbers are in AGENTS.md):
- Declare in "hosts" every host you know: the API's and the video's, subtitles', audio's, segments'
  and redirects' (*.x does not cover x). If one is missing, Kino asks the person once when a title
  is opened or played; do not rely on it. If the video comes from changing CDNs, use
  "streamHosts": "any" (apiVersion 4; the person approves it at install). Do not use "fetchHosts": it
  only works on plugins converted from Nuvio.
- It is neither Node nor a browser: no fetch, setTimeout, Buffer, process, require, crypto or Intl;
  use kino.fetch, kino.sleep, kino.crypto, kino.storage. URL, URLSearchParams, atob, btoa,
  TextEncoder, TextDecoder and console do exist. One file, no import.
- Never throw before the first await of an async function (await first, validate after).
- Limits: search 15 s and the other calls 20 s; 60 requests per call; 5 MB bodies; 256 KB of
  kino.storage; 100 search results; Home with 20 rows of 60.
- Errors for the person: kino.error("auth_required" | "not_found" | "geo_blocked" |
  "rate_limited" | "unavailable").
- Everything the person reads is in Spanish from Bogotá with tuteo, never voseo.
- Nothing secret in the code or the repository. Each person's username and password go in a
  "password" setting. An API key of mine is sealed: "secrets" in the manifest, sealed with
  `node sdk/seal.mjs --repo USER/REPO --name name`, and kino.secret("name") in the code
  (apiVersion 4).
- Downloads: if the source allows it, declare "download" (apiVersion 2). Movies and episodes are
  saved from a plain file (mp4, mkv…) or from HLS that is not live; live channels and anything with
  DRM, never.
- apiVersion: the lowest that works (4 only for secrets, "streamHosts": "any" or a "list" setting).
  A new id of my own (never "archive-org").

Work step by step: first explore the source with real requests, then the manifest, then each
function. After each step run `node sdk/validate.mjs .` and `node sdk/run.mjs . <function> …` and
fix everything Kino would drop. Record fixtures with --record and make
`node --test test/plugin.test.mjs` pass offline. Finish with the AGENTS.md checklist.

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
under "De la comunidad" (Plugins → Recomendados), the repository must:

1. be **public** and **not a fork** (create it with "Use this template");
2. have `kino-plugin.json` at its root, valid for `node sdk/validate.mjs .`, with a `name` and a
   `description` in Spanish (that is what the card shows);
3. carry the topic **`kino-plugin`** (About → ⚙ → Topics) and, better, a GitHub description;
4. be among the 30 with the most stars on the topic.

Each device searches again every 12 hours, or when "Actualizar" is tapped. The exact clicks and how
to check it: [Get listed in Kino](listed.md).

## If something fails { #troubleshooting }

Paste **the full text** the terminal printed into the assistant (not a summary) and say what you
expected. Some common cases:

| What you see | What to do |
| --- | --- |
| `node: command not found`, "node is not recognized…" | Node is not installed, or you opened the terminal before installing it: install it and open a new terminal. |
| `✗ kino-plugin.json: …` | The manifest breaks a rule; the message is the one Kino gives. Ask the assistant to fix it following AGENTS.md. |
| `[dropped by Kino] …` | Kino would drop those results. Ask which rule of [the contract](contract.md) they break, instead of accepting a blind patch. |
| `[host_not_allowed] …` | A host missing from `hosts`: have it declared. |
| `[timeout] …` | The source is slow or there are too many requests: have it make fewer requests per call. |
| Works in the kit but fails in Kino | The Node kit is more permissive than the app ([what it does not reproduce](test-locally.md#differences)): missing globals, a `throw` before the first `await`, `kino.html.select`. Give the assistant the exact message Kino shows (or a photo of the screen). |
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
