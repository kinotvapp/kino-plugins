# Build a plugin with AI

An AI coding assistant (Claude Code, Cursor, Copilot, Codex, Aider…) can write a Kino plugin for you
if it reads the rules first. This site publishes them in the shapes those tools read best:

| File | What it is |
| --- | --- |
| [`AGENTS.md`](https://kinotvapp.github.io/kino-plugins/AGENTS.md) | The instructions for the assistant: its role, what to read, the step-by-step workflow, the hard rules with their exact numbers, a checklist and the usual mistakes. Also in [the repository](https://github.com/kinotvapp/kino-plugins/blob/main/AGENTS.md). |
| [`llms-full.txt`](https://kinotvapp.github.io/kino-plugins/llms-full.txt) | This whole guide as one text file (English), plus `AGENTS.md`, `contract.json` and `kino.d.ts`. Built with the site, so it is always the same version as these pages. |
| [`llms.txt`](https://kinotvapp.github.io/kino-plugins/llms.txt) | The short index, in the [llms.txt](https://llmstxt.org/) format. |

## The prompt { #prompt }

Copy it, fill in the three lines between `<<<` and `>>>`, and paste it into your assistant, ideally
from inside an empty folder or a repository created from the template
[kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) (the simplest one) or
[kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) (if you need
settings, a session, downloads or live channels).

```text
You are going to write a Kino plugin: a public GitHub repository with kino-plugin.json and one
JavaScript ES module (plugin.js) that the Kino video app runs in a QuickJS sandbox.

Before writing anything:
1. Fetch and read https://kinotvapp.github.io/kino-plugins/AGENTS.md completely and follow it as
   your instructions for this task.
2. Fetch and read https://kinotvapp.github.io/kino-plugins/llms-full.txt (the complete guide,
   contract.json and kino.d.ts). If you cannot fetch URLs, tell me and I will paste them.
3. Read plugin.js and kino-plugin.json of https://github.com/kinotvapp/kino-plugin-own-server (the
   complete API reference: settings, a session, kino.storage, downloads and live channels) -- raw:
   https://raw.githubusercontent.com/kinotvapp/kino-plugin-own-server/main/plugin.js and
   https://raw.githubusercontent.com/kinotvapp/kino-plugin-own-server/main/kino-plugin.json. If my
   plugin is simple (no settings, no session), start from
   https://github.com/kinotvapp/kino-plugin-archive instead. Use either one's sdk/ folder as the
   Node test kit.

What I want:
- Source: <<< the site or API, e.g. https://example.com, and what it has: movies, series, live TV >>>
- Access: <<< none / my user and password / an API key / a server address I type >>>
- Plugin name shown in Kino (Spanish): <<< e.g. "Mi fuente" >>>

Rules you must not break (details in AGENTS.md):
- Only the hosts declared in the manifest are reachable (every redirect, CDN, subtitle and segment
  host included; *.x does not cover x). No Node or browser APIs: no fetch, setTimeout, Buffer,
  process, require, crypto, Intl; use kino.fetch, kino.sleep, kino.crypto, kino.storage.
- Never throw before the first await in an async function (await first, validate after).
- Respect the limits: search 15 s, other calls 20 s, 60 requests per call, 5 MB bodies,
  256 KB storage, 100 search items, 20 Home rows of 60.
- Use kino.error("auth_required" | "not_found" | "geo_blocked" | "rate_limited" | "unavailable").
- Everything the person reads is Spanish from Bogotá with tuteo, never voseo.
- Never hardcode passwords, tokens or keys: ask for them in a "password" setting.
- Use the lowest apiVersion that works, a new id of my own (never "archive-org"), and a
  repository created from the template, not a fork.

Work step by step: explore the source with real requests first, then write the manifest, then
each function. After each step run `node sdk/validate.mjs .` and `node sdk/run.mjs . <function> …`
and fix everything Kino would drop. Record fixtures with --record and make `node --test test/plugin.test.mjs` pass
offline. Finish with the checklist of AGENTS.md, then tell me how to publish (topic kino-plugin)
and what I must try by hand in the Kino app.
```

## Tips { #tips }

- **Give the assistant a terminal.** The kit only helps if the assistant can run
  `node sdk/validate.mjs .` and `node sdk/run.mjs …` and read what they print.
- **Try it in the app.** The Node kit is more permissive than Kino
  ([what it does not reproduce](test-locally.md#differences)): install the plugin from Ajustes >
  Plugins and check it searches, lists episodes and plays before you publish it.
- **Ask for the reasons.** When the kit reports a dropped item, ask the assistant which rule of
  [The contract](contract.md) it broke, rather than accepting a workaround.
- **Mind the rights.** A plugin can only reach what the person could reach anyway; do not ask an
  assistant to get around a paywall, a login or DRM.
