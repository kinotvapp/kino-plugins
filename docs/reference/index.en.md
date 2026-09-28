# Reference

Two files describe the plugin contract for machines. They are copied verbatim from Kino's own
repository, where a test pins them to the app's code, and the tables in this guide are generated
from `contract.json`.

| File | What it is | Download |
| --- | --- | --- |
| `contract.json` | Every number and rule the app enforces: capabilities and the apiVersion each needs, manifest patterns and sizes, settings types, time limits, `kino.fetch` limits and error codes, crypto algorithms, result caps, live-channel limits. `sdk/contract.mjs` reads it, so `validate.mjs` and `run.mjs` check exactly these values. | [contract.json](contract.json) |
| `kino.d.ts` | TypeScript declarations of the whole `kino` global and of every shape your functions take and return. Put it next to `plugin.js` and add `/// <reference path="./kino.d.ts" />` at the top of the file: your editor then completes and checks `kino.*` and your return values. | [kino.d.ts](kino.d.ts) |

Both files also ship inside every example plugin repository, next to `sdk/`, and at the end of
[`llms-full.txt`](https://kinotvapp.github.io/kino-plugins/llms-full.txt).

## `contract.json` { #contract-json }

??? example "Show contract.json"

    ```json
    --8<-- "reference/contract.json"
    ```

## `kino.d.ts` { #kino-d-ts }

??? example "Show kino.d.ts"

    ```ts
    --8<-- "reference/kino.d.ts"
    ```
