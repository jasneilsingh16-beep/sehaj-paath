/* Sehaj Paath: Sri Guru Granth Sahib Ji, angs 1-1430. No network except the app's own files. */
(function () {
  "use strict";

  var LAST = 1430, CHUNK = 10, KEY = "sehaj.v1", FKEY = "sehaj.fav.v1";
  var DEFAULTS = {
    startAng: 505, endAng: 1430, perDay: 48, startDate: "2026-11-22",
    theme: "dark", eng: true, lari: false, vish: true, gsize: 28, esize: 17,
    pos: 505, done: 504, day: "", base: 504
  };

  /* ---------- storage (never assume localStorage works) ---------- */
  var memS = null, memF = null;
  function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode: memory only */ } }
  function load() {
    var s = readJSON(KEY, memS || {}), out = {}, k;
    for (k in DEFAULTS) out[k] = (k in s && typeof s[k] === typeof DEFAULTS[k]) ? s[k] : DEFAULTS[k];
    return out;
  }
  function save() { memS = JSON.parse(JSON.stringify(st)); writeJSON(KEY, st); }
  var st = load();
  var fav = readJSON(FKEY, {});          // { lineId: { a, g, e, s, n, t } }
  function saveFav() { memF = fav; writeJSON(FKEY, fav); }

  /* ---------- helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var GD = "੦੧੨੩੪੫੬੭੮੯";
  function gdig(n) { return String(n).replace(/\d/g, function (d) { return GD[d]; }); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function utc(s) { var p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dayDiff(a, b) { return Math.round((utc(b) - utc(a)) / 864e5); }
  function addDays(s, n) { var d = new Date(utc(s) + n * 864e5); return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function nice(s) { var p = s.split("-"); return (+p[2]) + " " + MON[+p[1] - 1]; }
  function copyText(text, done) {
    function fallback() {
      var t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(t); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }

  /* ---------- Gurmukhi rendering ---------- */
  /* The data holds ; , . as vishraam marks after a word. They are shown as weight/colour, as in the
     printed saroop PDFs, not as characters. Everything else is the database text, untouched. */
  function gm(text, lari, vish) {
    var words = text.split(" "), out = [], i, w, m, h, cls, n = 0;
    for (i = 0; i < words.length; i++) {
      w = words[i];
      if (!w) continue;
      m = w.match(/^(.*?)([;.,])$/);
      h = esc(m ? m[1] : w);
      if (/^॥.*॥$/.test(w) || /^[੦-੯]+$/.test(w)) h = '<span class="vn">' + h + "</span>";
      else if (m && vish) h = m[2] === ";" ? "<b>" + h + "</b>" : '<span class="' + (m[2] === "," ? "m" : "l") + '">' + h + "</span>";
      if (lari) { cls = n % 2 ? ' class="w1"' : ""; h = "<span" + cls + ">" + h + "</span>"; n++; }
      out.push(h);
    }
    var s = out.join(lari ? "​" : " ");
    // keep a closing ॥ (or ॥੧॥) on the same row as the word before it
    return lari ? s : s.replace(/ (<span class="vn">॥[^<]*<\/span>|<span class="vn">॥<\/span>)$/, "&nbsp;$1");
  }
  function en(t) {
    return esc(t).replace(/ ((?:॥[0-9]+)+॥(?: Rahao)?|Rahao)$/, '&nbsp;<span class="nw">$1</span>');
  }

  /* ---------- data ---------- */
  var cache = {};
  function chunkStart(n) { return Math.floor((n - 1) / CHUNK) * CHUNK + 1; }
  /* The data files normally live in data/. If they were uploaded to the top level instead, use that. */
  var baseP = null;
  function base() {
    if (!baseP) baseP = fetch("data/index.json").then(function (r) { return r.ok ? "data/" : ""; }, function () { return "data/"; });
    return baseP;
  }
  function getJSON(name) {
    return base().then(function (b) {
      return fetch(b + name).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    });
  }
  function getChunk(s) {
    if (!cache[s]) cache[s] = getJSON("a" + ("000" + s).slice(-4) + ".json").catch(function (e) { delete cache[s]; throw e; });
    return cache[s];
  }
  function getAng(n) { return getChunk(chunkStart(n)).then(function (d) { return d[String(n)]; }); }
  var indexP = null;
  function getIndex() {
    if (!indexP) indexP = getJSON("index.json").catch(function (e) { indexP = null; throw e; });
    return indexP;
  }

  /* ---------- reader ---------- */
  var reader = $("reader"), seq = 0, cur = { n: 0, items: [] }, selId = null;
  function markCls(id) { var f = fav[id]; return f ? (f.s ? " sv" : "") + (f.n ? " nt" : "") : ""; }
  function tukHtml(it) {
    var k = it[0], g = gm(it[1], st.lari, st.vish), e = it[2];
    var eh = st.eng && e ? '<p class="e' + (it[3] ? " ns" : "") + '">' + en(e) + "</p>" : "";
    var cls = k === "T" ? "tuk" : k === "R" ? "tuk R" : k === "B" ? "tuk band" : k === "H" ? "tuk hdr" : "tuk mangal";
    var gcls = "g" + (st.lari && (k === "T" || k === "R") ? " lari" : "");
    return '<div class="' + cls + markCls(it[4]) + '" data-id="' + it[4] + '"><div class="' + gcls + '" lang="pa">' + g + "</div>" + eh + "</div>";
  }
  function show(n, o) {
    o = o || {};
    n = clamp(Math.round(n), 1, LAST);
    st.pos = n; save();
    var my = ++seq; selId = null;
    paintHeader(n);
    $("prev").disabled = n <= 1;
    $("next").disabled = n >= LAST;
    getAng(n).then(function (items) {
      if (my !== seq) return;
      cur = { n: n, items: items };
      var h = items.map(tukHtml).join("");
      h += '<div class="endcap"><div class="orn" lang="pa">॥</div>Ang ' + n + " complete" +
        (n < LAST ? '<button id="endNext">Next ang &rsaquo;</button>' : "") + "</div>";
      reader.innerHTML = h;
      var b = $("endNext"); if (b) b.addEventListener("click", goNext);
      var hit = o.id && reader.querySelector('.tuk[data-id="' + o.id + '"]');
      if (hit) { hit.classList.add("hit"); hit.scrollIntoView({ block: "center" }); }
      else if (!o.keep) window.scrollTo(0, 0);
      if (n < LAST) getAng(n + 1).catch(function () {});
      if (n > 1) getAng(n - 1).catch(function () {});
    }).catch(function () {
      if (my !== seq) return;
      reader.innerHTML = '<div class="err">Could not load Ang ' + n + ". Check the connection once, then it works offline.</div>";
    });
  }
  function goNext() { if (st.pos >= LAST) return; if (st.pos === st.done + 1) st.done = st.pos; show(st.pos + 1); }
  function goPrev() { show(st.pos - 1); }

  /* ---------- favourites and notes ---------- */
  function itemById(id) { for (var i = 0; i < cur.items.length; i++) if (cur.items[i][4] === id) return cur.items[i]; return null; }
  function favTouch(id, a, g, e, patch) {
    var f = fav[id] || { a: a, g: g, e: e, s: 0, n: "", t: 0 }, k;
    for (k in patch) f[k] = patch[k];
    f.t = Date.now();
    if (!f.s && !f.n) delete fav[id]; else fav[id] = f;
    saveFav();
  }
  function paintMarks(id) {
    var el = reader.querySelector('.tuk[data-id="' + id + '"]'); if (!el) return;
    el.classList.toggle("sv", !!(fav[id] && fav[id].s));
    el.classList.toggle("nt", !!(fav[id] && fav[id].n));
  }
  function actHtml(id) {
    var f = fav[id];
    return '<div class="act" data-id="' + id + '"><button data-act="save" aria-pressed="' + !!(f && f.s) + '">' + (f && f.s ? "&#9733; Saved" : "&#9734; Save") +
      '</button><button data-act="note">' + (f && f.n ? "Edit note" : "Add note") + '</button><button data-act="copy">Copy</button></div>';
  }
  function selectTuk(el) {
    var old = reader.querySelector(".tuk.sel");
    if (old) { old.classList.remove("sel"); var oa = old.querySelector(".act"); if (oa) oa.remove(); }
    if (!el || el.dataset.id === selId) { selId = null; return; }
    selId = el.dataset.id; el.classList.add("sel"); el.insertAdjacentHTML("beforeend", actHtml(selId));
  }
  reader.addEventListener("click", function (e) {
    var b = e.target.closest(".act button");
    var el = e.target.closest(".tuk");
    if (!el) return;
    var id = el.dataset.id, it = itemById(id);
    if (b) {
      if (!it) return;
      if (b.dataset.act === "save") {
        favTouch(id, cur.n, it[1], it[2], { s: fav[id] && fav[id].s ? 0 : 1 });
        paintMarks(id); var a = el.querySelector(".act"); if (a) a.outerHTML = actHtml(id);
      } else if (b.dataset.act === "note") {
        openNote(id, cur.n, it[1], it[2], "close");
      } else if (b.dataset.act === "copy") {
        copyText(it[1].replace(/[;.,]/g, "") + "\n" + it[2] + "\n(Ang " + cur.n + ")", function (ok) { b.textContent = ok ? "Copied" : "Hold to copy"; });
      }
      return;
    }
    if (e.target.closest(".act")) return;
    var sel = window.getSelection && String(window.getSelection());
    if (sel) return;                       // user is selecting text
    if (el.classList.contains("band") || el.classList.contains("hdr") || el.classList.contains("mangal")) return;
    selectTuk(el);
  });

  /* ---------- plan / today ---------- */
  function ensureDay() {
    var t = ymd(new Date());
    if (st.day !== t) { st.day = t; st.base = st.done; save(); }
  }
  function plan() {
    var t = ymd(new Date()), total = st.endAng - st.startAng + 1, idx = dayDiff(st.startDate, t);
    var P = { total: total, idx: idx, done: clamp(st.done - st.startAng + 1, 0, total) };
    P.finished = st.done >= st.endAng;
    P.perDay = Math.max(1, st.perDay);
    P.finishDate = addDays(st.startDate, Math.ceil(total / P.perDay) - 1);
    P.daysLeft = Math.max(0, dayDiff(t, P.finishDate) + 1);
    if (idx < 0) { P.before = true; P.first = st.startAng; P.last = Math.min(st.endAng, st.startAng + P.perDay - 1); return P; }
    P.first = st.startAng + P.perDay * idx;
    P.last = Math.min(st.endAng, P.first + P.perDay - 1);
    P.over = P.first > st.endAng;
    P.behind = Math.max(0, (P.first - 1) - st.base);
    P.left = Math.max(0, P.last - st.done);
    P.frac = P.over ? 1 : clamp((st.done - (P.first - 1)) / (P.last - P.first + 1), 0, 1);
    return P;
  }
  function paintHeader(n) {
    $("angG").textContent = gdig(n);
    $("angSub").textContent = n + "/" + LAST;
    ensureDay();
    var P = plan(), line, frac;
    if (P.finished) { line = "Paath complete"; frac = 1; }
    else if (P.before) { line = "Starts " + nice(st.startDate); frac = P.total ? P.done / P.total : 0; }
    else if (P.over) { line = P.left + " angs left"; frac = P.done / P.total; }
    else if (P.left === 0) { line = "Today done"; frac = 1; }
    else { line = P.left + " to go today"; frac = P.frac; }
    $("todayLine").textContent = line;
    $("barFill").style.width = Math.round(frac * 100) + "%";
  }

  /* ---------- theme ---------- */
  var THEME_COLOR = { dark: "#14110e", paper: "#f6f0e3", dim: "#0a0806" };
  function applyLook() {
    var r = document.documentElement;
    r.setAttribute("data-theme", st.theme);
    r.style.setProperty("--g", st.gsize + "px");
    r.style.setProperty("--e", st.esize + "px");
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", THEME_COLOR[st.theme] || THEME_COLOR.dark);
  }

  /* ---------- first-letter search ---------- */
  /* Each Gurmukhi letter collapses to a Latin letter that people type for it, so "hkskj" finds a line
     whose words begin ਹ ਕ ਸ ਕ ਜ (and ਖ, ਸ਼ etc. count as k, s). Vowel carriers: a (ਅ ਆ), i/e (ੲ ਇ ਈ ਏ), u/o (ੳ ਉ ਊ ਓ). */
  var SK = {};
  (function () {
    function m(chars, l) { for (var i = 0; i < chars.length; i++) SK[chars[i]] = l; }
    m("ਅਆਐਔ", "a"); m("ੲਇਈਏੴ", "i"); m("ੳਉਊਓ", "u"); m("ਸ", "s"); m("ਹ", "h");
    m("ਕਖਖ਼", "k"); m("ਗਘਗ਼", "g"); m("ਙਞਣਨ", "n"); m("ਚਛ", "c"); m("ਜਝਜ਼", "j");
    m("ਟਠਤਥ", "t"); m("ਡਢਦਧ", "d"); m("ਪਫਫ਼", "p"); m("ਬਭ", "b"); m("ਮ", "m"); m("ਯ", "y");
    m("ਰੜ", "r"); m("ਲਲ਼", "l"); m("ਵ", "v"); m("ਸ਼", "s");
  })();
  var LAT = { e: "i", o: "u", w: "v", z: "j", q: "k", f: "p", x: "k" };
  function skel(text) {
    var ws = text.split(" "), out = "", i, c;
    for (i = 0; i < ws.length; i++) { c = SK[ws[i].charAt(0)]; if (c) out += c; }
    return out;
  }
  function latinLetters(q) { return q.toLowerCase().replace(/[^a-z]/g, "").replace(/[eowzqfx]/g, function (c) { return LAT[c]; }); }
  function gurLetters(q) {
    var out = "", i, ch, c;
    for (i = 0; i < q.length; i++) { ch = q.charAt(i); if (ch === " ") continue; c = SK[ch]; if (!c) return null; out += c; }
    return out;
  }
  function normG(t) { return t.replace(/[\s;.,॥੦-੯]/g, ""); }

  var IDX = null, IDXP = null;
  function buildIndex(progress) {
    if (IDX) return Promise.resolve(IDX);
    if (IDXP) return IDXP;
    var starts = [], s, rec = [];
    for (s = 1; s <= LAST; s += CHUNK) starts.push(s);
    var done = 0;
    IDXP = Promise.all(starts.map(function (s0) {
      return getChunk(s0).then(function (d) {
        done++; if (progress) progress(done / starts.length);
        return d;
      });
    })).then(function (all) {
      all.forEach(function (d) {
        Object.keys(d).forEach(function (a) {
          d[a].forEach(function (it) {
            if (it[0] !== "T" && it[0] !== "R") return;
            rec.push({ a: +a, id: it[4], g: it[1], e: it[2], sk: skel(it[1]), gn: normG(it[1]), el: it[2].toLowerCase(), r: it[0] === "R" });
          });
        });
      });
      rec.sort(function (x, y) { return x.a - y.a; });
      IDX = rec; return rec;
    }).catch(function (e) { IDXP = null; throw e; });
    return IDXP;
  }

  function runSearch(q, mode) {
    var out = { kind: "", list: [], note: "", extra: [] }, qt = q.trim(), i, r, lq, words, m = mode;
    if (!qt) return out;
    var hasG = /[ਁ-੿]/.test(qt);
    if (m === "auto") m = hasG ? (gurLetters(qt) !== null ? "letters" : "gur") : (/\s/.test(qt) ? "eng" : "letters");
    if (m === "letters") {
      lq = hasG ? gurLetters(qt) : latinLetters(qt);
      if (!lq || lq.length < 3) { out.note = "Type at least 3 first letters, one per word."; return out; }
      out.kind = "First letters: " + lq;
      var pre = [], mid = [];
      for (i = 0; i < IDX.length; i++) { r = IDX[i]; var p = r.sk.indexOf(lq); if (p === 0) pre.push(r); else if (p > 0) mid.push(r); }
      out.list = pre.concat(mid);
      if (!hasG && /^[a-z]{4,}$/i.test(qt)) {                   // a single English word typed: offer English matches too
        var w1 = qt.toLowerCase(); for (i = 0; i < IDX.length && out.extra.length < 40; i++) if (IDX[i].el.indexOf(w1) >= 0) out.extra.push(IDX[i]);
      }
    } else if (m === "gur") {
      lq = normG(qt); out.kind = "Gurmukhi";
      if (lq.length < 2) { out.note = "Type a few more letters."; return out; }
      for (i = 0; i < IDX.length; i++) if (IDX[i].gn.indexOf(lq) >= 0) out.list.push(IDX[i]);
    } else {
      words = qt.toLowerCase().split(/\s+/).filter(Boolean); out.kind = "English";
      if (!words.length || (words.length === 1 && words[0].length < 3)) { out.note = "Type a word or two."; return out; }
      for (i = 0; i < IDX.length; i++) {
        var e = IDX[i].el, ok = true, j;
        for (j = 0; j < words.length; j++) if (e.indexOf(words[j]) < 0) { ok = false; break; }
        if (ok) out.list.push(IDX[i]);
      }
    }
    return out;
  }
  function nameMatches(q, data) {
    var k = q.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (k.length < 3) return { banis: [], cont: [] };
    var b = data.banis.filter(function (x) { return (x.n + " " + x.al).toLowerCase().replace(/[^a-z0-9]/g, "").indexOf(k) >= 0 || (x.al && (" " + x.al + " ").replace(/\s+/g, "").indexOf(k) >= 0); });
    var c = data.contents.filter(function (x) { return x.l.toLowerCase().replace(/[^a-z0-9]/g, "").indexOf(k) >= 0; });
    return { banis: b.slice(0, 8), cont: c.slice(0, 10) };
  }
  function segText(segs) {
    if (segs.length > 4) {                                   // interleaved (e.g. a vaar with its saloks): show the span
      var lo = 9999, hi = 0; segs.forEach(function (s) { lo = Math.min(lo, s[0]); hi = Math.max(hi, s[1]); });
      return lo + "–" + hi + " (in parts)";
    }
    var t = segs.slice(0, 4).map(function (s) { return s[0] === s[1] ? s[0] : s[0] + "–" + s[1]; }).join(", ");
    return (segs.length > 4 ? t + ", …" : t);
  }
  function baniHtml(b) { return '<button class="nm" data-act="go" data-a="' + b.s[0][0] + '"><span>' + esc(b.n) + '</span><small>Ang ' + esc(segText(b.s)) + "</small></button>"; }
  function contHtml(c) { return '<button class="nm" data-act="go" data-a="' + c.a + '"><span>' + esc(c.l) + '</span><small>Ang ' + c.a + "</small></button>"; }
  function resHtml(r) {
    var f = fav[r.id];
    return '<button class="rs" data-act="go" data-a="' + r.a + '" data-id="' + r.id + '"><span class="rg" lang="pa">' + gm(r.g, false, true) + "</span>" +
      '<span class="re">' + esc(r.e) + '</span><small>Ang ' + r.a + (f && f.s ? " &middot; saved" : "") + (f && f.n ? " &middot; note" : "") + "</small></button>";
  }

  /* ---------- panel (one bottom sheet for menu / search / saved / note) ---------- */
  var sheet = $("sheet"), scrim = $("scrim"), body = $("sheetBody"), opener = $("openSheet"), mode = "menu", sMode = "auto", lastFocus = null;
  var noteCtx = null, savedFilter = "", moreN = 60, lastOut = null;
  function openPanel(m, title, tall) {
    mode = m; $("sheetTitle").textContent = title; sheet.classList.toggle("tall", !!tall);
    sheet.hidden = false; scrim.hidden = false; sheet.scrollTop = 0;
    lastFocus = document.activeElement;
  }
  function closePanel() { sheet.hidden = true; scrim.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function openMenu() { openPanel("menu", "Sehaj Paath"); renderMenu(); $("closeSheet").focus(); }
  function openSearch() {
    openPanel("search", "Search", true); renderSearch();
    var q = $("q"); if (q) q.focus();
    buildIndex().then(function () { runAndShow(); }).catch(function () {});
  }
  function openSaved() { openPanel("saved", "Saved", true); renderSaved(); }
  function openNote(id, a, g, e, back) {
    var f = fav[id];
    noteCtx = { id: id, a: a, g: g, e: e, back: back };
    openPanel("note", "Note"); renderNote();
    var t = $("noteText"); if (t) t.focus();
    if (f) void 0;
  }

  function seg(name, opts, curv) {
    return '<span class="seg" role="group">' + opts.map(function (o) {
      return '<button data-set="' + name + '" data-val="' + o[0] + '" aria-pressed="' + (String(curv) === String(o[0])) + '">' + o[1] + "</button>";
    }).join("") + "</span>";
  }

  function renderMenu() {
    ensureDay();
    var P = plan(), s = "";
    s += '<div class="sec"><h3>Jump to ang</h3><form class="go" id="goForm"><input id="goIn" type="number" inputmode="numeric" min="1" max="1430" placeholder="1 to 1430" aria-label="Ang number"><button class="btn primary" type="submit">Go</button></form></div>';

    s += '<div class="sec"><h3>Today</h3>';
    if (P.finished) {
      s += '<div class="big">Paath complete</div><p>Angs ' + st.startAng + " to " + st.endAng + " read.</p>";
    } else if (P.before) {
      var dd = -P.idx;
      s += '<div class="big">Starts ' + nice(st.startDate) + "</div><p>" + dd + (dd === 1 ? " day" : " days") + " to go. Day 1 target: Ang " + P.first + " to " + P.last + ".</p>";
    } else if (P.over) {
      s += '<div class="big">' + P.left + ' angs left</div><p>The plan\'s days are used up. Raise angs per day or move the start date below.</p>';
    } else {
      s += '<div class="big">Ang ' + P.first + " to " + P.last + "</div>";
      s += '<div class="meter"><i style="width:' + Math.round(P.frac * 100) + '%"></i></div>';
      s += "<p>" + (P.left === 0 ? "Today's target is complete." : P.left + " angs to go, finishing at Ang " + P.last + ".") + "</p>";
      if (P.behind > 0) s += '<p class="warn">You started today ' + P.behind + " angs behind the plan.</p>";
    }
    s += '<p class="small">Position: Ang ' + st.pos + ". Read up to: Ang " + st.done + ".</p>";
    s += '<div class="row"><label for="doneIn">I have read up to ang</label><input id="doneIn" type="number" inputmode="numeric" min="0" max="1430" value="' + st.done + '"></div>';
    s += '<button class="btn" id="setDone">Update</button>';
    if (!P.finished) s += '<button class="btn" id="goDone">Go to Ang ' + clamp(st.done + 1, 1, LAST) + "</button>";
    s += "</div>";

    s += '<div class="sec"><h3>Plan</h3>';
    s += '<div class="row"><label for="pStart">First ang</label><input id="pStart" type="number" inputmode="numeric" value="' + st.startAng + '"></div>';
    s += '<div class="row"><label for="pEnd">Last ang</label><input id="pEnd" type="number" inputmode="numeric" value="' + st.endAng + '"></div>';
    s += '<div class="row"><label for="pPer">Angs per day</label><input id="pPer" type="number" inputmode="numeric" value="' + st.perDay + '"></div>';
    s += '<div class="row"><label for="pDate">Start date</label><input id="pDate" type="date" value="' + st.startDate + '"></div>';
    s += '<p>At ' + P.perDay + " a day, the paath ends " + nice(P.finishDate) + " (" + P.finishDate.slice(0, 4) + ").</p>";
    s += '<div class="row"><label for="pFit">Finish by</label><input id="pFit" type="date" value="' + P.finishDate + '"></div>';
    s += '<button class="btn" id="fit">Set angs per day to fit that date</button></div>';

    s += '<div class="sec"><h3>Reading</h3>';
    s += '<div class="row"><span class="lbl">English</span>' + seg("eng", [[1, "On"], [0, "Off"]], st.eng ? 1 : 0) + "</div>";
    s += '<div class="row"><span class="lbl">Words</span>' + seg("lari", [[0, "Padched"], [1, "Larivaar"]], st.lari ? 1 : 0) + "</div>";
    s += '<div class="row"><span class="lbl">Vishraam</span>' + seg("vish", [[1, "Shown"], [0, "Plain"]], st.vish ? 1 : 0) + "</div>";
    s += '<div class="row"><span class="lbl">Theme</span>' + seg("theme", [["dark", "Dark"], ["dim", "Dim"], ["paper", "Paper"]], st.theme) + "</div>";
    s += '<div class="row"><span class="lbl">Gurmukhi size</span><span class="seg"><button data-size="gsize" data-d="-2" aria-label="Smaller Gurmukhi">A&minus;</button><button data-size="gsize" data-d="2" aria-label="Larger Gurmukhi">A+</button></span></div>';
    s += '<div class="row"><span class="lbl">English size</span><span class="seg"><button data-size="esize" data-d="-1" aria-label="Smaller English">A&minus;</button><button data-size="esize" data-d="1" aria-label="Larger English">A+</button></span></div>';
    s += '<div class="preview" lang="pa">' + gm("ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ; ਹਰਿ ਨਾਮੁ, ਸਚੁ ਸੋਇ ॥੧॥", st.lari, st.vish) + "</div>";
    s += "</div>";

    var nf = Object.keys(fav).length;
    s += '<div class="sec"><h3>Your place, saves and notes: backed up</h3><p>These live only on this phone (' + nf + ' saved or noted). Copy this code somewhere safe; paste it back to restore, for example on a new phone.</p>';
    s += '<textarea id="backup" readonly aria-label="Backup code"></textarea>';
    s += '<button class="btn" id="copyB">Copy</button> <button class="btn" id="restoreB">Restore from pasted code</button><p class="small" id="bmsg"></p></div>';

    s += '<div class="sec"><h3>About</h3><p class="small">Gurmukhi from the saroop database, ang by ang and line by line. English is a modern-English rendering made from Prof. Sahib Singh\'s Punjabi arth. It is AI-written and not yet checked line by line. No tracking, no accounts, no sound.</p></div>';
    body.innerHTML = s;
    $("backup").value = JSON.stringify({ v: 2, startAng: st.startAng, endAng: st.endAng, perDay: st.perDay, startDate: st.startDate, pos: st.pos, done: st.done, fav: fav });
  }

  function renderSearch() {
    var s = '<div class="srch"><input id="q" type="search" enterkeyhint="search" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="First letters, words, or a bani name" aria-label="Search">' +
      '<div class="chips" role="group">' + [["auto", "Auto"], ["letters", "First letters"], ["eng", "English"], ["gur", "Gurmukhi"]].map(function (o) {
        return '<button data-sm="' + o[0] + '" aria-pressed="' + (sMode === o[0]) + '">' + o[1] + "</button>";
      }).join("") + '</div><div id="res" aria-live="polite"></div></div>';
    body.innerHTML = s;
    $("res").innerHTML = '<p class="small hint">Type the first letter of each word, for example <b>hkskj</b>. Works with English letters or a Gurmukhi keyboard. Or type a bani or raag name.</p>' + browseHtml();
    getIndex().then(function () { if (!$("q").value) $("res").innerHTML = '<p class="small hint">Type the first letter of each word, for example <b>hkskj</b>. Works with English letters or a Gurmukhi keyboard. Or type a bani or raag name.</p>' + browseHtml(); }).catch(function () {});
  }
  var browseCache = "";
  function browseHtml() {
    if (browseCache) return browseCache;
    if (!browseData) { getIndex().then(function (d) { browseData = d; browseCache = ""; var r = $("res"); if (r && mode === "search" && !$("q").value) r.innerHTML = r.firstChild.outerHTML + browseHtml(); }); return ""; }
    browseCache = '<h4>Banis</h4>' + browseData.banis.map(baniHtml).join("") + '<h4>Raags and sections</h4>' + browseData.contents.map(contHtml).join("");
    return browseCache;
  }
  var browseData = null;

  var qTimer = 0;
  function runAndShow() {
    var q = $("q"); if (!q || mode !== "search") return;
    var res = $("res"), val = q.value;
    if (!val.trim()) { res.innerHTML = '<p class="small hint">Type the first letter of each word, for example <b>hkskj</b>. Works with English letters or a Gurmukhi keyboard. Or type a bani or raag name.</p>' + browseHtml(); return; }
    if (!IDX) { res.innerHTML = '<p class="small hint">Preparing search (first time only)&hellip;</p>'; buildIndex().then(runAndShow); return; }
    Promise.resolve(browseData || getIndex()).then(function (d) {
      browseData = d;
      var nm = (sMode === "auto" || sMode === "eng") && !/[ਁ-੿]/.test(val) ? nameMatches(val, d) : { banis: [], cont: [] };
      var o = lastOut = runSearch(val, sMode), h = "";
      if (nm.banis.length || nm.cont.length) h += "<h4>Banis and sections</h4>" + nm.banis.map(baniHtml).join("") + nm.cont.map(contHtml).join("");
      if (o.note) h += '<p class="small hint">' + esc(o.note) + "</p>";
      else if (o.kind) {
        h += '<h4>' + esc(o.kind) + " &middot; " + o.list.length + (o.list.length === 1 ? " match" : " matches") + "</h4>";
        if (!o.list.length && !nm.banis.length && !nm.cont.length) h += '<p class="small hint">No match. First letters match the start of each word, ignoring vowels.</p>';
        h += o.list.slice(0, moreN).map(resHtml).join("");
        if (o.list.length > moreN) h += '<button class="btn more" data-act="more">Show more</button>';
        if (o.extra.length) h += "<h4>Also in English</h4>" + o.extra.map(resHtml).join("");
      }
      res.innerHTML = h;
    });
  }

  function renderSaved() {
    var ids = Object.keys(fav).sort(function (x, y) { return fav[y].t - fav[x].t; }), f = savedFilter.toLowerCase(), s = "";
    s += '<div class="srch"><input id="sq" type="search" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Filter saved lines and notes" aria-label="Filter saved" value="' + esc(savedFilter) + '"></div>';
    var list = ids.filter(function (id) { var x = fav[id]; return !f || (x.g + " " + x.e + " " + x.n).toLowerCase().indexOf(f) >= 0; });
    if (!ids.length) s += '<p class="small hint">Nothing saved yet. Tap any line while reading, then Save or Add note.</p>';
    else s += '<p class="small">' + list.length + " of " + ids.length + '. <button class="lnk" data-act="copyAll">Copy all as text</button> <span id="cmsg"></span></p>';
    s += '<div id="savedList">' + list.map(function (id) {
      var x = fav[id];
      return '<div class="sv-item" data-id="' + id + '"><button class="rs" data-act="go" data-a="' + x.a + '" data-id="' + id + '"><span class="rg" lang="pa">' + gm(x.g, false, true) + '</span><span class="re">' + esc(x.e) + "</span>" +
        (x.n ? '<span class="rn">' + esc(x.n) + "</span>" : "") + "<small>Ang " + x.a + (x.s ? " &middot; saved" : "") + '</small></button>' +
        '<div class="sv-act"><button data-act="editnote" data-id="' + id + '">' + (x.n ? "Edit note" : "Add note") + '</button><button data-act="del" data-id="' + id + '">Remove</button></div></div>';
    }).join("") + "</div>";
    body.innerHTML = s;
  }

  function renderNote() {
    var c = noteCtx, f = fav[c.id];
    body.innerHTML = '<div class="notebox"><div class="rg" lang="pa">' + gm(c.g, false, true) + '</div><div class="re">' + esc(c.e) + '</div><p class="small">Ang ' + c.a + '</p>' +
      '<textarea id="noteText" aria-label="Note" placeholder="Your note on this line">' + esc(f ? f.n : "") + "</textarea>" +
      '<div class="row"><button class="btn primary" data-act="noteSave">Save note</button><button class="btn" data-act="noteCancel">Cancel</button></div>' +
      (f && f.n ? '<button class="lnk" data-act="noteDel">Delete this note</button>' : "") + "</div>";
  }

  function intOr(el, d, a, b) { var v = parseInt(el.value, 10); return isNaN(v) ? d : clamp(v, a, b); }
  function rerender() { applyLook(); show(st.pos, { keep: true }); renderMenu(); }

  function goTo(a, id) { closePanel(); show(a, { id: id }); }

  body.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    var act = t.dataset.act;
    if (t.dataset.sm) { sMode = t.dataset.sm; moreN = 60; [].forEach.call(body.querySelectorAll("[data-sm]"), function (b) { b.setAttribute("aria-pressed", String(b === t)); }); runAndShow(); return; }
    if (t.dataset.set) {
      var k = t.dataset.set, v = t.dataset.val;
      if (k === "theme") st.theme = v; else st[k] = v === "1";
      save(); rerender(); return;
    }
    if (t.dataset.size) {
      var key = t.dataset.size, lim = key === "gsize" ? [20, 48] : [13, 26];
      st[key] = clamp(st[key] + (+t.dataset.d), lim[0], lim[1]); save(); rerender(); return;
    }
    if (act === "go") { goTo(+t.dataset.a, t.dataset.id); return; }
    if (act === "more") { moreN += 60; runAndShow(); return; }
    if (act === "editnote") { var x = fav[t.dataset.id]; if (x) openNote(t.dataset.id, x.a, x.g, x.e, "saved"); return; }
    if (act === "del") { if (window.confirm("Remove this saved line and its note?")) { delete fav[t.dataset.id]; saveFav(); paintMarks(t.dataset.id); renderSaved(); } return; }
    if (act === "copyAll") {
      var txt = Object.keys(fav).sort(function (p, q) { return fav[p].a - fav[q].a; }).map(function (id) {
        var f = fav[id]; return f.g.replace(/[;.,]/g, "") + "\n" + f.e + "\n(Ang " + f.a + ")" + (f.n ? "\nNote: " + f.n : "");
      }).join("\n\n");
      copyText(txt, function (ok) { $("cmsg").textContent = ok ? "Copied." : "Could not copy."; });
      return;
    }
    if (act === "noteSave") {
      var c = noteCtx, val = $("noteText").value.trim();
      favTouch(c.id, c.a, c.g, c.e, { n: val }); paintMarks(c.id);
      if (c.back === "saved") { openSaved(); } else closePanel();
      return;
    }
    if (act === "noteCancel") { if (noteCtx.back === "saved") openSaved(); else closePanel(); return; }
    if (act === "noteDel") { favTouch(noteCtx.id, noteCtx.a, noteCtx.g, noteCtx.e, { n: "" }); paintMarks(noteCtx.id); if (noteCtx.back === "saved") openSaved(); else closePanel(); return; }
    switch (t.id) {
      case "setDone": st.done = intOr($("doneIn"), st.done, 0, LAST); st.base = Math.min(st.base, st.done); save(); renderMenu(); paintHeader(st.pos); break;
      case "goDone": closePanel(); show(st.done + 1); break;
      case "fit": {
        var d = $("pFit").value, t0 = ymd(new Date()), from = dayDiff(st.startDate, t0) < 0 ? st.startDate : t0;
        var days = dayDiff(from, d) + 1, left = st.endAng - Math.max(st.done, st.startAng - 1);
        if (d && days >= 1 && left > 0) { st.perDay = Math.max(1, Math.ceil(left / days)); save(); renderMenu(); paintHeader(st.pos); }
        break;
      }
      case "copyB": {
        var el = $("backup"); el.removeAttribute("readonly"); el.select(); el.setSelectionRange(0, 999999);
        var ok = false; try { ok = document.execCommand("copy"); } catch (x2) { ok = false; }
        el.setAttribute("readonly", ""); $("bmsg").textContent = ok ? "Copied." : "Select the code and copy it by hand.";
        break;
      }
      case "restoreB": {
        var el2 = $("backup"); el2.removeAttribute("readonly"); el2.value = ""; el2.focus();
        $("bmsg").textContent = "Paste the code, then tap Restore again.";
        $("restoreB").id = "restoreGo"; $("restoreGo").textContent = "Restore now";
        break;
      }
      case "restoreGo": {
        try {
          var o = JSON.parse($("backup").value);
          ["startAng", "endAng", "perDay", "pos", "done"].forEach(function (f) { if (typeof o[f] === "number") st[f] = clamp(Math.round(o[f]), 0, LAST); });
          if (/^\d{4}-\d\d-\d\d$/.test(o.startDate)) st.startDate = o.startDate;
          if (o.fav && typeof o.fav === "object") { fav = o.fav; saveFav(); }
          st.base = st.done; save(); applyLook(); show(st.pos); renderMenu(); $("bmsg").textContent = "Restored.";
        } catch (x3) { $("bmsg").textContent = "That code could not be read."; }
        break;
      }
    }
  });
  body.addEventListener("input", function (e) {
    if (e.target.id === "q") { clearTimeout(qTimer); moreN = 60; qTimer = setTimeout(runAndShow, 140); }
    else if (e.target.id === "sq") { savedFilter = e.target.value; var pos = e.target.selectionStart; renderSaved(); var s2 = $("sq"); s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } }
  });
  body.addEventListener("change", function (e) {
    var id = e.target.id, changed = true;
    if (id === "pStart") st.startAng = intOr(e.target, st.startAng, 1, LAST);
    else if (id === "pEnd") st.endAng = intOr(e.target, st.endAng, 1, LAST);
    else if (id === "pPer") st.perDay = intOr(e.target, st.perDay, 1, LAST);
    else if (id === "pDate" && /^\d{4}-\d\d-\d\d$/.test(e.target.value)) st.startDate = e.target.value;
    else changed = false;
    if (changed) {
      if (st.endAng < st.startAng) st.endAng = st.startAng;
      save(); renderMenu(); paintHeader(st.pos);
    }
  });
  body.addEventListener("submit", function (e) {
    e.preventDefault();
    if (e.target.id === "goForm") { var v = parseInt($("goIn").value, 10); if (!isNaN(v)) { closePanel(); show(v); } }
  });

  /* ---------- events ---------- */
  opener.addEventListener("click", openMenu);
  $("openSearch").addEventListener("click", openSearch);
  $("openSaved").addEventListener("click", openSaved);
  $("closeSheet").addEventListener("click", closePanel);
  scrim.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    var typing = /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || "");
    if (e.key === "Escape" && !sheet.hidden) closePanel();
    else if (sheet.hidden && !typing && e.key === "ArrowRight") goNext();
    else if (sheet.hidden && !typing && e.key === "ArrowLeft") goPrev();
  });
  $("next").addEventListener("click", goNext);
  $("prev").addEventListener("click", goPrev);

  /* swipe: deliberate, mostly-horizontal drags only, so a scrolling thumb never turns the ang */
  var tx = 0, ty = 0, tt = 0;
  document.addEventListener("touchstart", function (e) {
    if (!sheet.hidden || e.touches.length !== 1) { tt = 0; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now();
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (!tt || !sheet.hidden) return;
    var c = e.changedTouches[0], dx = c.clientX - tx, dy = c.clientY - ty, dt = Date.now() - tt; tt = 0;
    var sel = window.getSelection && String(window.getSelection());
    if (sel) return;
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 2.5 && dt < 700) { dx < 0 ? goNext() : goPrev(); }
  }, { passive: true });

  /* ---------- start ---------- */
  var h = parseInt((location.hash.match(/(\d+)/) || [])[1], 10);
  applyLook();
  show(!isNaN(h) ? h : st.pos);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
