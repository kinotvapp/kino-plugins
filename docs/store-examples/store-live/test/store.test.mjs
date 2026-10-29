// The live store example run with Kino's Node kit (plugins/sdk). Nothing reaches the network: the API is sample-api.json,
// served by a fake fetch that also records the addresses asked. The imports expect the kit (sdk/ from kino-plugin-sdk)
// in this folder (copy sdk/ and contract.json here).
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
const API = readFileSync(join(DIR, "sample-api.json"), "utf8");
const manifest = validateManifest(readFileSync(join(DIR, "kino-plugin.json"), "utf8")).manifest;

async function rig() {
  const asked = [];
  const fetchImpl = async (url) => { asked.push(String(url)); return new Response(API, { status: 200, headers: { "content-type": "application/json" } }); };
  const { kino } = createKino(manifest, { fetchImpl });
  const { plugin } = await loadPlugin(join(DIR, "plugin.js"), kino);
  const kept = async (fn, arg) => {
    const { value, drops } = checkOutput(fn, await plugin[fn](arg), manifest);
    assert.deepEqual(drops, []);
    return value;
  };
  return { asked, kept };
}

test("the manifest and the three exports are accepted by the kit", async () => {
  const r = await validate(DIR);
  assert.deepEqual(r.problems, []);
});

test("storeSync hands over the featured list as a full list", async () => {
  const { asked, kept } = await rig();
  const out = await kept("storeSync", { reason: "reload" });
  assert.equal(out.full, true);
  assert.equal(out.entries.length, 3);
  assert.deepEqual(asked, ["https://plugins.example.org/api/featured"]);
});

test("storeList passes the category, the sort and the cursor, and returns the next cursor", async () => {
  const { asked, kept } = await rig();
  const out = await kept("storeList", { category: "series", sort: "popular", cursor: "page-1" });
  assert.equal(out.next, "page-2");
  assert.deepEqual(asked, ["https://plugins.example.org/api/plugins?category=series&sort=popular&cursor=page-1"]);
});

test("storeSearch passes what the person typed, encoded", async () => {
  const { asked, kept } = await rig();
  const out = await kept("storeSearch", { q: "ver series" });
  assert.equal(out.entries[0].id, "live-series");
  assert.deepEqual(asked, ["https://plugins.example.org/api/search?q=ver%20series"]);
});
