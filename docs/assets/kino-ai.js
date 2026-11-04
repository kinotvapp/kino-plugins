/* The free AI the docs site uses, shared by the pages that talk to it. Chrome's built-in model first (Gemini Nano, the Prompt API: it
 * runs on the visitor's computer, free, no allowance); when this browser doesn't have it, Pollinations' free anonymous chat, called
 * straight from the visitor's browser (CORS is open, and its allowance of one reply per 45 s counts per visitor, not per site).
 * KinoAi.ask(messages, { lang, onStatus, schema }) -> Promise<{ text, local } | null>. messages: [{ role, content }], the first a "system". */
(function () {
  "use strict";
  var REMOTE = "https://text.pollinations.ai/openai", MODEL = "openai-fast", TIMEOUT = 60000, TRIES = 3;

  function remote(messages) {
    function once(n) {
      var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, TIMEOUT);
      return fetch(REMOTE, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({ model: MODEL, messages: messages, max_tokens: 3000 }) })
        .then(function (r) {
          /* The free allowance is one reply per 45 s per visitor (a 402 with Retry-After): wait that turn and ask again. */
          if (r.status === 402 || r.status === 429 || r.status >= 500) {
            var wait = Math.min((parseInt(r.headers.get("Retry-After") || "3", 10) || 3) + 1, 50);
            return new Promise(function (ok) { setTimeout(function () { ok(null); }, wait * 1000); });
          }
          if (!r.ok) return null;
          return r.json().then(function (j) { var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; return t && t.trim() ? t.trim() : null; });
        })
        .catch(function () { return null; })
        .then(function (t) { clearTimeout(timer); return t || (n + 1 < TRIES ? once(n + 1) : null); });
    }
    return once(0);
  }

  function local(messages, lang, onStatus, schema) {
    if (typeof LanguageModel === "undefined") return Promise.resolve(null);
    var opts = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: [lang] }] };
    return LanguageModel.availability(opts).then(function (a) {
      if (!a || a === "unavailable" || a === "no") return null;
      if (a !== "available" && a !== "readily" && onStatus) onStatus();
      var rest = messages.slice(1), last = rest.pop();
      var create = Object.assign({
        initialPrompts: [messages[0]].concat(rest),
        monitor: function (m) { m.addEventListener("downloadprogress", function (e) { if (onStatus) onStatus(Math.round((e.loaded || 0) * 100)); }); }
      }, opts);
      return LanguageModel.create(create).then(function (session) {
        var done = function (t) { try { session.destroy(); } catch (e) { void e; } return t && t.trim() ? t.trim() : null; };
        return session.prompt(last.content, schema ? { responseConstraint: schema } : undefined).then(done, function () { return done(null); });
      });
    }).catch(function () { return null; });
  }

  window.KinoAi = {
    ask: function (messages, o) {
      o = o || {};
      return local(messages, o.lang || "es", o.onStatus, o.schema).then(function (t) {
        if (t) return { text: t, local: true };
        return remote(messages).then(function (r) { return r ? { text: r, local: false } : null; });
      });
    }
  };
})();
