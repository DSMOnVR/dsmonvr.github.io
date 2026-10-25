(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme ---------- */
  var swatches = document.querySelectorAll(".swatch");
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    swatches.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.theme === t)); });
    try { localStorage.setItem("theme", t); } catch (e) {}
  }
  swatches.forEach(function (b) { b.addEventListener("click", function () { setTheme(b.dataset.theme); }); });
  try { var saved = localStorage.getItem("theme"); if (saved) setTheme(saved); } catch (e) {}

  /* ---------- collapse windows ---------- */
  document.querySelectorAll(".win .min").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var win = btn.closest(".win");
      var collapsed = win.classList.toggle("collapsed");
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.textContent = collapsed ? "+" : "-";
    });
  });

  /* ---------- typed greeting ---------- */
  var typed = document.getElementById("typed");
  var full = typed.dataset.text;
  if (reduce) { typed.textContent = full; }
  else {
    var i = 0;
    (function step() {
      typed.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(step, 70);
    })();
  }

  /* ---------- stream countdown ---------- */
  var TZ = "America/New_York";
  var STREAM_DAY = 4;          // Thursday
  var STREAM_HOUR = 17;        // 5pm
  var LIVE_WINDOW = 3 * 3600 * 1000;

  function nyParts(ms) {
    var o = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hourCycle: "h23", year: "numeric", month: "numeric",
      day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"
    }).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; });
    return o;
  }
  function nyOffset(ms) {
    var p = nyParts(ms);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  }
  function nyWallToUtc(y, m, d, h, min) {
    var guess = Date.UTC(y, m, d, h, min);
    var t = guess - nyOffset(guess);
    return guess - nyOffset(t);
  }
  function nextStream(now) {
    var p = nyParts(now);
    for (var i = 0; i < 9; i++) {
      var day = new Date(Date.UTC(p.year, p.month - 1, p.day + i));
      if (day.getUTCDay() === STREAM_DAY) {
        var t = nyWallToUtc(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), STREAM_HOUR, 0);
        if (t + LIVE_WINDOW > now) return t;
      }
    }
  }

  var els = {
    win: document.getElementById("stream"),
    clock: document.getElementById("clock"),
    note: document.getElementById("cd-note"),
    status: document.getElementById("status-text"),
    d: document.getElementById("cd-d"), h: document.getElementById("cd-h"),
    m: document.getElementById("cd-m"), s: document.getElementById("cd-s")
  };
  var cfg = { enabled: false, target: null, message: "" };
  var timer = null;
  function pad(n) { return String(n).padStart(2, "0"); }

  function tick() {
    var now = Date.now();
    var target = cfg.target ? Date.parse(cfg.target) : nextStream(now);
    if (!target || isNaN(target)) return;
    var diff = target - now;
    if (diff <= 0) {
      els.clock.hidden = true;
      els.status.textContent = "stream time! come hang out";
      return;
    }
    els.clock.hidden = false;
    els.status.textContent = "next stream in";
    var s = Math.floor(diff / 1000);
    els.d.textContent = pad(Math.floor(s / 86400));
    els.h.textContent = pad(Math.floor(s % 86400 / 3600));
    els.m.textContent = pad(Math.floor(s % 3600 / 60));
    els.s.textContent = pad(s % 60);
  }

  function apply() {
    clearInterval(timer);
    els.win.classList.toggle("on", !!cfg.enabled);
    els.note.hidden = !(cfg.enabled && cfg.message);
    els.note.textContent = cfg.message || "";
    if (cfg.enabled) { tick(); timer = setInterval(tick, 1000); }
    else {
      els.clock.hidden = true;
      els.status.textContent = "every thursday, 5:00 pm est";
    }
  }

  function load() {
    fetch("countdown.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) {
        cfg = { enabled: !!j.enabled, target: j.target || null, message: j.message || "" };
        apply();
      })
      .catch(function () { cfg.enabled = false; apply(); });
  }
  load();
  setInterval(load, 60000); // picks up changes without a page reload
})();
