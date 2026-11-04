/* The free AI the docs site uses, shared by the pages that talk to it. Chrome's built-in model first (Gemini Nano, the Prompt API: it
 * runs on the visitor's computer, free, no allowance); when this browser doesn't have it, Pollinations' free anonymous chat, called
 * straight from the visitor's browser (CORS is open, and its allowance of one reply per 45 s counts per visitor, not per site).
 * KinoAi.ask(messages, { lang, onStatus, schema, onChunk }) -> Promise<{ text, local } | null>. messages: [{ role, content }], the first a "system".
 * onChunk(textSoFar), when given (and no schema), is called as the answer streams in; the promise still resolves with the whole text. */
(function () {
  "use strict";
  var REMOTE = "https://text.pollinations.ai/openai", MODEL = "openai-fast", TIMEOUT = 60000, TRIES = 3;

  /* An OpenAI-style server-sent stream: each "data:" line carries a delta; a break mid-way keeps what already arrived. */
  function sse(body, onChunk) {
    var reader = body.getReader(), dec = new TextDecoder(), buf = "", acc = "";
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) return acc.trim() || null;
        buf += dec.decode(r.value, { stream: true });
        var lines = buf.split("\n");
        buf = lines.pop();
        lines.forEach(function (l) {
          l = l.trim();
          if (l.indexOf("data:") !== 0) return;
          var data = l.slice(5).trim();
          if (!data || data === "[DONE]") return;
          try {
            var c = JSON.parse(data).choices[0], t = (c.delta && c.delta.content) || (c.message && c.message.content) || "";
            if (t) { acc += t; onChunk(acc); }
          } catch (e) { void e; }
        });
        return pump();
      });
    }
    return pump().catch(function () { return acc.trim() || null; });
  }

  function remote(messages, onChunk) {
    function once(n) {
      var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, TIMEOUT);
      return fetch(REMOTE, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({ model: MODEL, messages: messages, max_tokens: 3000, stream: !!onChunk }) })
        .then(function (r) {
          /* The free allowance is one reply per 45 s per visitor (a 402 with Retry-After): wait that turn and ask again. */
          if (r.status === 402 || r.status === 429 || r.status >= 500) {
            var wait = Math.min((parseInt(r.headers.get("Retry-After") || "3", 10) || 3) + 1, 50);
            return new Promise(function (ok) { setTimeout(function () { ok(null); }, wait * 1000); });
          }
          if (!r.ok) return null;
          if (onChunk && r.body && /event-stream/.test(r.headers.get("Content-Type") || "")) return sse(r.body, onChunk);
          return r.json().then(function (j) { var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; return t && t.trim() ? t.trim() : null; });
        })
        .catch(function () { return null; })
        .then(function (t) { clearTimeout(timer); return t || (n + 1 < TRIES ? once(n + 1) : null); });
    }
    return once(0);
  }

  function local(messages, lang, onStatus, schema, onChunk) {
    if (typeof LanguageModel === "undefined") return Promise.resolve(null);
    var opts = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: [lang] }] };
    return LanguageModel.availability(opts).then(function (a) {
      if (!a || a === "unavailable" || a === "no") return null;
      var ready = a === "available" || a === "readily";
      if (!ready && onStatus) onStatus();
      var rest = messages.slice(1), last = rest.pop();
      var create = Object.assign({
        initialPrompts: [messages[0]].concat(rest),
        /* Chrome fires downloadprogress on every create(), even with the model already on disk: only show it when a download is real. */
        monitor: function (m) { m.addEventListener("downloadprogress", function (e) { if (!ready && onStatus) onStatus(Math.round((e.loaded || 0) * 100)); }); }
      }, opts);
      return LanguageModel.create(create).then(function (session) {
        var done = function (t) { try { session.destroy(); } catch (e) { void e; } return t && t.trim() ? t.trim() : null; };
        if (onChunk && !schema && session.promptStreaming) {
          var reader = session.promptStreaming(last.content).getReader(), acc = "";
          var pump = function () {
            return reader.read().then(function (r) {
              if (r.done) return done(acc);
              /* Chrome has sent both the text so far and just the new piece: tell them apart. */
              acc = acc && r.value.indexOf(acc) === 0 ? r.value : acc + r.value;
              onChunk(acc);
              return pump();
            });
          };
          return pump().catch(function () { return done(acc); });
        }
        return session.prompt(last.content, schema ? { responseConstraint: schema } : undefined).then(done, function () { return done(null); });
      });
    }).catch(function () { return null; });
  }

  window.KinoAi = {
    ask: function (messages, o) {
      o = o || {};
      return local(messages, o.lang || "es", o.onStatus, o.schema, o.onChunk).then(function (t) {
        if (t) return { text: t, local: true };
        return remote(messages, o.schema ? null : o.onChunk).then(function (r) { return r ? { text: r, local: false } : null; });
      });
    }
  };
})();
