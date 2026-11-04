/* A chat on every page of the docs that answers questions from the docs themselves. It searches the site's own search index (the
 * sections of every page, in the page's language), hands the best few to the AI as the only source it may answer from, and shows the
 * links of those sections under the answer. The AI is KinoAi (kino-ai.js). */
(function () {
  "use strict";
  if (window.__kinoDocsChat) return;
  window.__kinoDocsChat = 1;

  var script = document.currentScript;
  var BASE = script && script.src ? new URL("../", script.src).href : location.origin + "/kino-plugins/";
  var MAX_EXCERPTS = 4, WINDOW = 1000, STEP = 300;
  var STOP = /^(el|la|los|las|un|una|unos|unas|de|del|al|y|o|u|en|con|por|para|que|se|es|son|como|mi|tu|su|lo|le|les|me|te|si|no|ya|muy|mas|pero|sobre|the|a|an|of|to|and|or|in|on|for|with|is|are|how|do|does|can|my|your|it|this|that|what|i|you|be|by|at|as|from|there)$/;

  var T = {
    es: { fab: "Pregunta a la IA", title: "Pregunta sobre la documentación", hint: "Respondo con lo que dice esta documentación. Es gratis. Si tu Chrome trae IA integrada corre en tu equipo; si no, lo que escribas se envía a Pollinations (servicio de IA de terceros). Verifica en las páginas citadas.", ph: "Ej.: ¿cómo declaro los hosts de mi plugin?", send: "Enviar", close: "Cerrar", thinking: "Buscando y pensando…", searching: "Buscando en la documentación…", download: "Descargando el modelo de Chrome", you: "Tú", ai: "IA", aiLocal: "IA (Chrome, en tu equipo)", unable: "La IA no pudo responder ahora. Inténtalo de nuevo en un momento.", none: "No encontré eso en la documentación. Prueba con otras palabras o usa el buscador del sitio.", sources: "Fuentes", clear: "Nueva conversación",
      chips: ["¿Cómo creo mi primer plugin?", "¿Qué hosts puede usar un plugin?", "¿Cómo firmo mi plugin?"],
      system: "You are the documentation assistant of the Kino plugins site. Answer ONLY from the DOCUMENTATION excerpts below. If they do not contain the answer, say you did not find it in the documentation, and suggest what to search. Never invent APIs, fields, numbers or steps. Answer in neutral Latin American Spanish with tuteo (never voseo), brief and concrete; use short code blocks (```) when the excerpts show code. If the question has nothing to do with Kino plugins, politely say you only answer about this documentation." },
    en: { fab: "Ask the AI", title: "Ask about the documentation", hint: "I answer from what this documentation says. It's free. If your Chrome has built-in AI it runs on your device; otherwise what you type is sent to Pollinations (a third-party AI service). Check the cited pages.", ph: "E.g.: how do I declare my plugin's hosts?", send: "Send", close: "Close", thinking: "Searching and thinking…", searching: "Searching the documentation…", download: "Downloading Chrome's model", you: "You", ai: "AI", aiLocal: "AI (Chrome, on your device)", unable: "The AI couldn't answer right now. Try again in a moment.", none: "I didn't find that in the documentation. Try other words or use the site search.", sources: "Sources", clear: "New conversation",
      chips: ["How do I create my first plugin?", "Which hosts can a plugin use?", "How do I sign my plugin?"],
      system: "You are the documentation assistant of the Kino plugins site. Answer ONLY from the DOCUMENTATION excerpts below. If they do not contain the answer, say you did not find it in the documentation, and suggest what to search. Never invent APIs, fields, numbers or steps. Answer in English, brief and concrete; use short code blocks (```) when the excerpts show code. If the question has nothing to do with Kino plugins, politely say you only answer about this documentation." }
  };

  function lang() { return location.href.indexOf(BASE + "en/") === 0 ? "en" : "es"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /* lower case and no accents, one character for one character so positions line up with the original text */
  function norm(s) {
    return s.toLowerCase().replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n");
  }
  function terms(q) { return norm(q).split(/[^a-z0-9_.]+/).filter(function (w) { return w.length > 2 && !STOP.test(w); }).filter(function (w, i, a) { return a.indexOf(w) === i; }).slice(0, 12); }

  /* the search index keeps the pages' HTML in its text and titles: plain text for the model and for matching */
  function plain(h) {
    return String(h || "").replace(/<[^>]*>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  }

  /* ---------- the sections of the docs ---------- */
  var indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(BASE + "search/search_index.json").then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(function (j) {
        return (j.docs || []).filter(function (d) { return d.text && d.text.trim().length > 40; }).map(function (d) {
          var text = plain(d.text), title = plain(d.title);
          return { loc: d.location, title: title, text: text, n: norm(text), nt: norm(title), en: d.location.indexOf("en/") === 0, news: /(^|\/)changelog\//.test(d.location) };
        });
      });
      indexPromise.catch(function () { indexPromise = null; });
    }
    return indexPromise;
  }

  /* the best sections for the question, each trimmed to the window of text that holds the most of its words */
  function retrieve(docs, question, language) {
    var ts = terms(question);
    if (!ts.length) return [];
    var pool = docs.filter(function (d) { return d.en === (language === "en"); });
    var df = {};
    ts.forEach(function (t) { df[t] = 0; });
    pool.forEach(function (d) { ts.forEach(function (t) { if (d.n.indexOf(t) >= 0 || d.nt.indexOf(t) >= 0) df[t]++; }); });
    var scored = pool.map(function (d) {
      var sc = 0;
      ts.forEach(function (t) {
        if (!df[t]) return;
        var idf = Math.log(1 + pool.length / df[t]), tf = 0, i = -1;
        while (tf < 20 && (i = d.n.indexOf(t, i + 1)) >= 0) tf++;
        if (tf) sc += idf * (1 + Math.log(tf));
        if (d.nt.indexOf(t) >= 0) sc += 3 * idf;
      });
      return { d: d, sc: d.news ? sc * 0.4 : sc };
    }).filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, MAX_EXCERPTS);
    return scored.map(function (x) {
      var d = x.d, best = 0, bestHits = -1;
      for (var s = 0; s < Math.max(1, d.n.length - WINDOW + STEP); s += STEP) {
        var w = d.n.slice(s, s + WINDOW), hits = 0;
        ts.forEach(function (t) { if (w.indexOf(t) >= 0) hits++; });
        if (hits > bestHits) { bestHits = hits; best = s; }
      }
      return { loc: d.loc, title: d.title, text: d.text.slice(best, best + WINDOW) };
    });
  }

  /* ---------- the answer's text: a little markdown, escaped first ---------- */
  function render(text) {
    var out = "", parts = text.split(/```[a-zA-Z]*\n?/);
    parts.forEach(function (p, i) {
      if (i % 2) out += "<pre><code>" + esc(p.replace(/\n$/, "")) + "</code></pre>";
      else out += esc(p).replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
    });
    return out;
  }

  /* ---------- the widget ---------- */
  function mount() {
    var history = [], busy = false;
    var fab = document.createElement("button");
    fab.type = "button"; fab.className = "kdc-fab";
    var panel = document.createElement("div");
    panel.className = "kdc-panel"; panel.hidden = true; panel.setAttribute("role", "dialog");
    document.body.appendChild(fab); document.body.appendChild(panel);

    function s() { return T[lang()]; }
    function build() {
      var t = s();
      fab.textContent = "✨ " + t.fab;
      panel.innerHTML = '<div class="kdc-head"><b>' + esc(t.title) + '</b><span class="grow"></span><button type="button" class="kdc-new" title="' + esc(t.clear) + '">↺</button><button type="button" class="kdc-x" title="' + esc(t.close) + '">×</button></div>' +
        '<div class="kdc-log" aria-live="polite"><p class="kdc-hint">' + esc(t.hint) + "</p></div>" +
        '<div class="kdc-chips">' + t.chips.map(function (c) { return '<button type="button" data-chip>' + esc(c) + "</button>"; }).join("") + "</div>" +
        '<div class="kdc-form"><textarea rows="2" maxlength="500" placeholder="' + esc(t.ph) + '"></textarea><button type="button" class="kdc-send">' + esc(t.send) + "</button></div>";
      log = panel.querySelector(".kdc-log"); input = panel.querySelector("textarea"); sendBtn = panel.querySelector(".kdc-send");
      history = [];
    }
    var log, input, sendBtn, builtFor = "";
    function ensure() { if (builtFor !== lang()) { build(); builtFor = lang(); } }

    function bubble(who, html, loading) {
      var d = document.createElement("div");
      d.className = "kdc-msg " + who + (loading ? " loading" : "");
      d.innerHTML = "<b>" + esc(who === "me" ? s().you : s().ai) + "</b><div class=\"kdc-body\">" + html + "</div>";
      log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
    }
    function done(el, local) { el.classList.remove("loading"); if (local) el.querySelector("b").textContent = s().aiLocal; }

    function send(text) {
      text = (text || "").trim();
      if (!text || busy) return;
      var t = s(), language = lang();
      busy = true; sendBtn.disabled = true; input.disabled = true; input.value = "";
      bubble("me", esc(text));
      var wait = bubble("ai", esc(t.searching), true), body = wait.querySelector(".kdc-body");
      var prev = history.length ? history[history.length - 2] : null;
      loadIndex().then(function (docs) {
        var found = retrieve(docs, text + (prev && prev.role === "user" ? " " + prev.content : ""), language);
        if (!found.length) { body.textContent = t.none; done(wait); return; }
        body.textContent = t.thinking;
        var system = t.system + "\n\nDOCUMENTATION:\n" + found.map(function (f, i) { return "[" + (i + 1) + "] " + f.title + " (" + BASE + f.loc + ")\n" + f.text; }).join("\n\n");
        var messages = [{ role: "system", content: system }].concat(history.slice(-6), [{ role: "user", content: text }]);
        return window.KinoAi.ask(messages, { lang: language, onStatus: function (pct) { body.textContent = pct == null ? t.thinking : t.download + " " + pct + "%"; } }).then(function (res) {
          if (!res) { body.textContent = t.unable; done(wait); return; }
          history.push({ role: "user", content: text }, { role: "assistant", content: res.text });
          var seen = {}, links = found.filter(function (f) { var k = f.loc.split("#")[0]; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 3);
          body.innerHTML = render(res.text) + '<div class="kdc-src"><span>' + esc(t.sources) + ":</span> " + links.map(function (f) { return '<a href="' + esc(BASE + f.loc) + '">' + esc(f.title || f.loc) + "</a>"; }).join(" · ") + "</div>";
          done(wait, res.local);
        });
      }).catch(function () { body.textContent = t.unable; done(wait); }).then(function () {
        busy = false; sendBtn.disabled = false; input.disabled = false; log.scrollTop = log.scrollHeight;
      });
    }

    fab.addEventListener("click", function () { ensure(); panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); });
    panel.addEventListener("click", function (e) {
      var c = e.target.closest("[data-chip]");
      if (c) { send(c.textContent); return; }
      if (e.target.closest(".kdc-x")) panel.hidden = true;
      else if (e.target.closest(".kdc-new")) { if (!busy) { build(); } }
      else if (e.target.closest(".kdc-send")) send(input.value);
    });
    panel.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && e.target.tagName === "TEXTAREA") { e.preventDefault(); send(input.value); } if (e.key === "Escape") panel.hidden = true; });
    ensure();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
