/* The Kino theme creator's optional GitHub sign-in: the two device-flow calls a browser cannot make itself.
 *
 * github.com/login/* sends no CORS headers, so the static page cannot call it; this Worker does, from a runtime that can.
 * It holds the OAuth app's client id (a public value: the device flow needs no secret), stores nothing and logs nothing.
 * It DOES see the access token while it passes from GitHub to the browser, so run it only from an account you control.
 * It forwards only the fields the page needs (never the refresh token) and pins the verification link to github.com.
 */

const CONFIG = {
  /* The OAuth app's Client ID (GitHub -> Settings -> Developer settings -> OAuth Apps). Public, not a secret. */
  CLIENT_ID: "Ov23liucTnzDF7RmUGIL",
  /* public_repo: write a public repository's files and topics. The page also works with a one-repository token instead. */
  SCOPE: "public_repo",
  /* The only pages allowed to call this Worker. */
  ALLOWED_ORIGINS: ["https://kinotvapp.github.io"],
  /* Best-effort limit per client and isolate (Workers have no shared memory): calls per minute. */
  PER_MINUTE: 30,
};

const GITHUB = "https://github.com/login";
const VERIFY_URI = "https://github.com/login/device";
const hits = new Map();

function limited(ip) {
  const now = Date.now(), minute = Math.floor(now / 60000), cur = hits.get(ip);
  if (hits.size > 5000) hits.clear();
  if (!cur || cur.minute !== minute) { hits.set(ip, { minute, n: 1 }); return false; }
  cur.n += 1;
  return cur.n > CONFIG.PER_MINUTE;
}

function pick(obj, keys) {
  const out = {};
  if (obj && typeof obj === "object") for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

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
      "Cache-Control": "no-store",
    };

    /* A plain visit in the browser (no Origin): says the Worker is alive, which is how the URL gets checked. */
    if (request.method === "GET" && !origin) {
      return json({ ok: true, service: "kino-theme-creator-oauth", endpoints: ["/device", "/token"] }, 200, headers);
    }

    if (!allowed.includes(origin)) return json({ error: "origin_not_allowed" }, 403, headers);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);
    if (limited(request.headers.get("CF-Connecting-IP") || "unknown")) return json({ error: "rate_limited" }, 429, headers);

    const path = new URL(request.url).pathname;
    let body = {};
    try {
      const text = await request.text();
      if (text.length > 2048) return json({ error: "body_too_large" }, 413, headers);
      body = text ? JSON.parse(text) : {};
    } catch { body = {}; }

    if (path === "/device") {
      const res = await fetch(`${GITHUB}/device/code`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: CONFIG.CLIENT_ID, scope: CONFIG.SCOPE }),
      });
      const data = pick(await res.json().catch(() => ({})), ["device_code", "user_code", "expires_in", "interval", "error", "error_description"]);
      if (data.device_code) data.verification_uri = VERIFY_URI;
      return json(data, res.status, headers);
    }

    if (path === "/token") {
      if (typeof body.device_code !== "string" || !body.device_code || body.device_code.length > 200) return json({ error: "device_code_missing" }, 400, headers);
      const res = await fetch(`${GITHUB}/oauth/access_token`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CONFIG.CLIENT_ID,
          device_code: body.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });
      const data = pick(await res.json().catch(() => ({})), ["access_token", "token_type", "scope", "expires_in", "interval", "error", "error_description"]);
      return json(data, res.status, headers);
    }

    return json({ error: "not_found" }, 404, headers);
  },
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}
