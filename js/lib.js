// Shared helpers.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const prog = (x, a, b) => clamp((x - a) / (b - a));
const E = {
  out: (u) => 1 - Math.pow(1 - u, 3),
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outQuint: (u) => 1 - Math.pow(1 - u, 5),
  smooth: (u) => u * u * u * (u * (6 * u - 15) + 10),
};
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
// SVG font stacks (attributes can't use the CSS variables).
const MONO = '"JetBrains Mono", Consolas, monospace';
const DISP = '"Space Grotesk", "Segoe UI", sans-serif';
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TOUCH = matchMedia("(hover: none), (pointer: coarse)").matches;

// SVG element factory: S("circle", {cx, cy, r}, parent)
const SVGNS = "http://www.w3.org/2000/svg";
function S(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
}

// Run cb once when el scrolls into view (threshold as fraction of el).
function onVisible(el, cb, threshold = 0.25) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.disconnect(); cb(e.target); } }), { threshold });
  io.observe(el);
}
// Track in/out of view (for pausing animation loops).
function watchVisible(el, cb) {
  const io = new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), { threshold: 0 });
  io.observe(el);
}

const GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEFXYZ";
const escHTML = (c) => (c === "<" ? "&lt;" : c === "&" ? "&amp;" : c);
// Decode-style text reveal, same effect as the film's tagline.
// Layout always uses the real characters (the glyph is painted over a transparent copy), so line breaks never change
// mid-animation — otherwise a heading near its wrap point flips between line counts and the page jumps.
function scramble(el, text, dur = 900) {
  const t0 = performance.now();
  const r = rng(text.length * 97 + 13);
  (function tick(now) {
    const u = clamp((now - t0) / dur);
    let out = "";
    for (let i = 0; i < text.length; i++) {
      const at = (i / text.length) * 0.7;
      const c = text[i];
      if (c === " " || u >= at + 0.3) out += escHTML(c);
      else if (u >= at) out += `<span class="scr-g" data-g="${escHTML(GLYPHS[Math.floor(r() * GLYPHS.length)])}">${escHTML(c)}</span>`;
      else out += `<span style="opacity:0">${escHTML(c)}</span>`;
    }
    el.innerHTML = out;
    if (u < 1) requestAnimationFrame(tick);
    else el.textContent = text;
  })(t0);
}

function fmt(v, dec) { return v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }

// Method palette shared by every chart (EvoTrias is the bright cyan one).
const METHOD_COLORS = {
  OpenEvolve: "#7f8e99", EvoX: "#9b8ad0", AdaEvolve: "#5fb3d9", "CORAL-1": "#e0a24a", "CORAL-4": "#ff7a45", EvoTrias: "#4fd1e8",
};

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove("on"), 1800);
}
