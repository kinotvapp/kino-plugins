# Referencia

Dos archivos describen el contrato de los plugins para máquinas. Están copiados tal cual del
repositorio de Kino, donde una prueba los amarra al código de la app, y las tablas de esta guía salen
de `contract.json`.

| Archivo | Qué es | Descarga |
| --- | --- | --- |
| `contract.json` | Cada número y regla que hace cumplir la app: las capacidades y el apiVersion que necesita cada una, los patrones y tamaños del manifiesto, los tipos de ajuste, los límites de tiempo, los límites y códigos de error de `kino.fetch`, los algoritmos de crypto, los topes de resultados, los límites de canales en vivo. `sdk/contract.mjs` lo lee, así que `validate.mjs` y `run.mjs` revisan exactamente estos valores. | [contract.json](contract.json) |
| `kino.d.ts` | Declaraciones de TypeScript de todo el global `kino` y de cada forma que tus funciones reciben y devuelven. Ponlo al lado de `plugin.js` y agrega `/// <reference path="./kino.d.ts" />` al comienzo del archivo: tu editor completa y revisa `kino.*` y tus valores de retorno. | [kino.d.ts](kino.d.ts) |

Los dos archivos también vienen dentro de cada repositorio de plugin de ejemplo, al lado de `sdk/`, y
al final de [`llms-full.txt`](https://kinotvapp.github.io/kino-plugins/llms-full.txt).

## `contract.json` { #contract-json }

??? example "Ver contract.json"

    ```json
    --8<-- "reference/contract.json"
    ```

## `kino.d.ts` { #kino-d-ts }

??? example "Ver kino.d.ts"

    ```ts
    --8<-- "reference/kino.d.ts"
    ```
