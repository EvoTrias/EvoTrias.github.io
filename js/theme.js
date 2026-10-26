// Light / dark theme. Dark is the default; the choice is made before first paint (inline script in <head> sets
// data-theme on <html>) and remembered in this browser.
// The stylesheet writes every literal colour as var(--hex-xxxxxx, #xxxxxx) / rgba(var(--rgb-xxxxxx, r, g, b), a);
// the light theme defines those variables (css/main.css, "light theme"). Scripts draw SVG with literal colours too,
// so this module maps them the same way: fill / stroke / stop-color attributes and colours in style attributes are
// swapped to their light values (originals kept on the element), for what is on the page and for whatever the
// charts draw later. The terminal keeps its dark look in both themes.
const Theme = (() => {
  const root = document.documentElement;
  const KEY = "theme";
  const ATTRS = ["fill", "stroke", "stop-color", "flood-color"];
  const KEEP = ".term, .film-frame";
  const isLight = () => root.dataset.theme === "light";

  // light value of a literal colour, read from the stylesheet's variables (cached per theme switch)
  let cache = new Map();
  const cs = () => getComputedStyle(root);
  const hex6 = (h) => (h.length === 3 ? [...h].map((c) => c + c).join("") : h).toLowerCase();
  function mapColors(str) {
    if (!/#|rgb/.test(str)) return str;
    let style = null;
    const look = (name) => {
      if (cache.has(name)) return cache.get(name);
      style ||= cs();
      const v = style.getPropertyValue(name).trim();
      cache.set(name, v);
      return v;
    };
    return str
      .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g, (m, r, g, b, a) => {
        const k = [r, g, b].map((x) => (+x).toString(16).padStart(2, "0")).join("");
        const v = look(`--rgb-${k}`);
        if (!v) return m;
        const al = a ? +a.replace(",", "") * (k === "000000" ? +(look("--shadow") || 1) : 1) : 1;
        return `rgba(${v}, ${+al.toFixed(3)})`;
      })
      .replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m, h) => look(`--hex-${hex6(h)}`) || m);
  }

  // swap one element (and its subtree) to the current theme
  function paint(el) {
    if (el.nodeType !== 1 || el.closest(KEEP)) return;
    const light = isLight();
    const one = (e) => {
      let dk = e.__dk;
      for (const a of ATTRS) {
        const v = e.getAttribute(a);
        if (v == null) continue;
        if (light) {
          if (!dk) dk = e.__dk = {};
          if (!(a in dk)) dk[a] = v;
          const m = mapColors(dk[a]);
          if (m !== v) e.setAttribute(a, m);
        } else if (dk && a in dk) e.setAttribute(a, dk[a]);
      }
      const st = e.style;
      if (st && st.length && /#|rgb/.test(e.getAttribute("style") || "")) {
        for (const p of [...st]) {
          const v = st.getPropertyValue(p);
          if (light) {
            if (!dk) dk = e.__dk = {};
            const key = "s:" + p;
            if (!(key in dk)) { if (!/#|rgb/.test(v)) continue; dk[key] = v; }
            const m = mapColors(dk[key]);
            if (m !== v) st.setProperty(p, m);
          } else if (dk && "s:" + p in dk) st.setProperty(p, dk["s:" + p]);
        }
      }
    };
    one(el);
    el.querySelectorAll("[fill], [stroke], [stop-color], [flood-color], [style]").forEach((e) => { if (!e.closest(KEEP)) one(e); });
  }

  const mo = new MutationObserver((recs) => {
    for (const r of recs) for (const n of r.addedNodes) if (n.nodeType === 1) paint(n);
  });
  function sync() {
    cache = new Map();
    mo.disconnect();
    paint(document.body);
    if (isLight()) mo.observe(document.body, { childList: true, subtree: true });
    $('meta[name="theme-color"]')?.setAttribute("content", isLight() ? "#fbfcfc" : "#03060a");
    $$(".theme-btn").forEach((b) => {
      const l = isLight();
      b.setAttribute("aria-label", l ? L("Switch to dark theme", "切换到深色主题") : L("Switch to light theme", "切换到浅色主题"));
      b.title = b.getAttribute("aria-label");
    });
    dispatchEvent(new Event("themechange"));
  }

  function set(mode) {
    if (mode === "light") root.dataset.theme = "light"; else delete root.dataset.theme;
    try { localStorage.setItem(KEY, mode); } catch (_) {}
    sync();
  }
  $$(".theme-btn").forEach((b) => b.addEventListener("click", () => {
    const next = isLight() ? "dark" : "light";
    // crossfade the whole page, including the canvas and the redrawn charts; the crossfade waits for a rendered
    // frame, so a page that is not painting (background tab) switches directly
    if (document.startViewTransition && !REDUCED) {
      document.startViewTransition(() => set(next));
      setTimeout(() => { if (isLight() !== (next === "light")) set(next); }, 300);
    } else set(next);
  }));
  sync();
  return { isLight, mapColors };
})();
