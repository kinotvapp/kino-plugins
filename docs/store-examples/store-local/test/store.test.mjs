// The local store example run with Kino's Node kit (plugins/sdk). Nothing reaches the network: the list is plugins.json,
// served by a fake fetch. The imports expect the kit (sdk/ and contract.json from kino-plugin-sdk) inside this folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createKino } from "../sdk/kino-shim.mjs";
import { loadPlugin } from "../sdk/sandbox.mjs";
import { validate } from "../sdk/validate.mjs";
import { checkOutput, validateManifest } from "../sdk/contract.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIST = readFileSync(join(DIR, "plugins.json"), "utf8");
const manifest = validateManifest(readFileSync(join(DIR, "kino-plugin.json"), "utf8")).manifest;
const fakeFetch = async () => new Response(LIST, { status: 200, headers: { "content-type": "application/json" } });

async function sync(arg = { reason: "reload" }) {
  const { kino } = createKino(manifest, { fetchImpl: fakeFetch });
  const { plugin } = await loadPlugin(join(DIR, "plugin.js"), kino);
  // What Kino would keep of the answer, and what it dropped (nothing here).
  const { value, drops } = checkOutput("storeSync", await plugin.storeSync(arg), manifest);
  assert.deepEqual(drops, []);
  return value;
}

test("the manifest and the exports are accepted by the kit", async () => {
  const r = await validate(DIR);
  assert.deepEqual(r.problems, []);
});

test("the first sync hands Kino the whole list, with a state", async () => {
  const out = await sync();
  assert.equal(out.full, true);
  assert.deepEqual(out.entries.map((e) => e.id), ["my-movies", "my-subtitles"]);
  assert.deepEqual(out.state, { generatedAt: JSON.parse(LIST).generatedAt });
});

test("a sync with the same state says nothing changed", async () => {
  const out = await sync({ reason: "schedule", since: 1, state: { generatedAt: JSON.parse(LIST).generatedAt } });
  assert.equal(out.full, false);
  assert.deepEqual(out.entries, []);
});
