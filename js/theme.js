// Light / dark theme. Dark is the default; the choice is made before first paint (inline script in <head> sets
// data-theme on <html>) and remembered in this browser.
// The stylesheet writes every literal colour as var(--hex-xxxxxx, #xxxxxx) / rgba(var(--rgb-xxxxxx, r, g, b), a);
// the light theme defines those variables (css/main.css, "light theme"). Scripts draw SVG with literal colours too,
// so this module maps them the same way: fill / stroke / stop-color attributes and colours in style attributes are
// swapped to their light values (originals kept on the element), for what is on the page and for whatever the
// charts draw later. The terminal, the film and the porthole (drawn for the light cabin) keep their own colours.
const Theme = (() => {
  const root = document.documentElement;
  const KEY = "theme";
  const ATTRS = ["fill", "stroke", "stop-color", "flood-color"];
  const KEEP = ".term, .film-frame, .porthole";
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
  // The switch is an aperture on the porthole: going light, the universe closes in around the window (you step back
  // into the cabin); going dark, it opens out of the window until it fills the screen. With the porthole off screen
  // the aperture is centred on the switch. The aperture waits for a rendered frame, so a page that is not painting
  // (background tab) switches directly.
  const glassCircle = () => {
    const g = $(".pt-glass"), b = g && g.getBoundingClientRect();
    return b && b.width > 4 && b.bottom > 0 && b.top < innerHeight ? { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 } : null;
  };
  function toggle(btn) {
    const next = isLight() ? "dark" : "light";
    if (!document.startViewTransition || REDUCED) { set(next); return; }
    const bb = btn.getBoundingClientRect();
    const at = (c) => c || { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2, r: 0 };
    const far = (c) => Math.hypot(Math.max(c.x, innerWidth - c.x), Math.max(c.y, innerHeight - c.y)) + 2;
    const leave = next === "dark" ? at(glassCircle()) : null; // the window we step out through (light layout)
    root.classList.add("vt-iris", next === "light" ? "vt-in" : "vt-out");
    const vt = document.startViewTransition(() => set(next));
    setTimeout(() => { if (isLight() !== (next === "light")) set(next); }, 300);
    vt.ready.then(() => {
      const c = leave || at(glassCircle()); // going light: the window we arrive at
      const big = `circle(${far(c)}px at ${c.x}px ${c.y}px)`, small = `circle(${c.r}px at ${c.x}px ${c.y}px)`;
      const opt = { duration: 1150, easing: "cubic-bezier(0.65, 0, 0.25, 1)", fill: "forwards" };
      if (next === "light") root.animate([{ clipPath: big, opacity: 1 }, { clipPath: small, opacity: 1, offset: 0.8 }, { clipPath: small, opacity: 0 }], { ...opt, pseudoElement: "::view-transition-old(root)" });
      else root.animate([{ clipPath: small, opacity: 0.35 }, { opacity: 1, offset: 0.2 }, { clipPath: big, opacity: 1 }], { ...opt, pseudoElement: "::view-transition-new(root)" });
    }).catch(() => {});
    vt.finished.finally(() => root.classList.remove("vt-iris", "vt-in", "vt-out"));
  }
  $$(".theme-btn").forEach((b) => b.addEventListener("click", () => toggle(b)));
  sync();
  return { isLight, mapColors };
})();
