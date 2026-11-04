/* The Kino theme creator's GitHub sign-in: the two device-flow calls a browser cannot make itself.
 *
 * github.com/login/* sends no CORS headers, so the static page cannot call it; this Worker does, from a runtime that can.
 * It holds the OAuth app's client id (a public value, no secret: the device flow needs none), stores nothing and logs
 * nothing. The token it gets back goes straight to the browser and stays in that tab.
 *
 * Everything is set below: paste this file into a Worker in the Cloudflare dashboard and deploy, or deploy the folder
 * with `npx wrangler deploy`. There are no variables to configure.
 */

const CONFIG = {
  /* The OAuth app's Client ID (GitHub → Settings → Developer settings → OAuth Apps). Public, not a secret. */
  CLIENT_ID: "Ov23li2ZzZnKBCQsfVsd",
  /* public_repo: create a public repository, write its files and set its topics. */
  SCOPE: "public_repo",
  /* The only pages allowed to call this Worker. Add an origin (comma-free, one per entry) to test somewhere else. */
  ALLOWED_ORIGINS: ["https://kinotvapp.github.io"],
};

const GITHUB = "https://github.com/login";

export default {
  async fetch(request) {
    const allowed = CONFIG.ALLOWED_ORIGINS;
    const origin = request.headers.get("Origin") || "";
    const headers = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
      "Content-Type": "application/json",
    };

    /* A plain visit in the browser (no Origin): says the Worker is alive, which is how the URL gets checked. */
    if (request.method === "GET" && !origin) {
      return json({ ok: true, service: "kino-theme-creator-oauth", endpoints: ["/device", "/token"] }, 200, headers);
    }

    if (!allowed.includes(origin)) return json({ error: "origin_not_allowed" }, 403, headers);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);
    if (!CONFIG.CLIENT_ID) return json({ error: "client_id_missing" }, 500, headers);

    const path = new URL(request.url).pathname;
    let body = {};
    try { body = await request.json(); } catch { body = {}; }

    if (path === "/device") {
      const res = await fetch(`${GITHUB}/device/code`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: CONFIG.CLIENT_ID, scope: CONFIG.SCOPE }),
      });
      return json(await res.json(), res.status, headers);
    }

    if (path === "/token") {
      if (!body.device_code) return json({ error: "device_code_missing" }, 400, headers);
      const res = await fetch(`${GITHUB}/oauth/access_token`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CONFIG.CLIENT_ID,
          device_code: String(body.device_code),
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });
      return json(await res.json(), res.status, headers);
    }

    return json({ error: "not_found" }, 404, headers);
  },
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
