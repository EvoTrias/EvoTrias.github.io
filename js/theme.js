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
  // into the cabin); going dark, it opens out of the window until it fills the screen. The page itself never moves —
  // only the aperture does. At the same time the dino, lifted out of the page as its own layer, drifts to its place in
  // the new scene the way things float in zero-g: easing out of rest, sweeping along a gentle arc with a slight lean,
  // and settling a moment after the aperture has finished. With the porthole off screen the aperture is centred on
  // the switch. The aperture waits for a rendered frame, so a page that is not painting (background tab) switches
  // directly.
  const APERTURE = 1000, DRIFT = 1450;
  const glassCircle = () => {
    const g = $(".pt-glass"), b = g && g.getBoundingClientRect();
    return b && b.width > 4 && b.bottom > 0 && b.top < innerHeight ? { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 } : null;
  };
  // the browser animates the dino's layer on a straight line from its old box to its new one; replace that with a
  // sampled arc (same end points and sizes) that bows upward, and lean the image a little through the middle
  function drift(keep) {
    const pe = (n) => root.getAnimations({ subtree: true }).find((a) => a.effect?.pseudoElement === n);
    const grp = pe("::view-transition-group(dino)");
    if (!grp) return;
    const kf = grp.effect.getKeyframes(), a = kf[0], b = kf[kf.length - 1];
    if (!a?.transform || !b?.transform) return;
    const A = new DOMMatrix(a.transform), B = new DOMMatrix(b.transform);
    const wA = parseFloat(a.width), wB = parseFloat(b.width), hA = parseFloat(a.height), hB = parseFloat(b.height);
    const dist = Math.hypot(B.e - A.e, B.f - A.f);
    if (!(dist > 4) || [wA, wB, hA, hB].some(isNaN)) return;
    const lift = Math.min(140, dist * 0.32); // the arc's control point sits this far above the midpoint
    const cx = (A.e + B.e) / 2, cy = (A.f + B.f) / 2 - lift;
    const frames = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, u = 1 - t;
      const x = u * u * A.e + 2 * u * t * cx + t * t * B.e, y = u * u * A.f + 2 * u * t * cy + t * t * B.f;
      frames.push({ ...(k === 0 ? a : k === 12 ? b : {}), transform: `matrix(${A.a}, 0, 0, ${A.d}, ${x}, ${y})`, width: `${wA + (wB - wA) * t}px`, height: `${hA + (hB - hA) * t}px`, offset: t });
    }
    const timing = { duration: DRIFT, delay: 0, easing: "cubic-bezier(0.55, 0, 0.3, 1)", fill: "both" };
    grp.effect.setKeyframes(frames);
    grp.effect.updateTiming(timing);
    const lean = B.e > A.e ? 7 : -7; // lean into the direction of travel
    keep(root.animate([{ rotate: "0deg" }, { rotate: `${lean}deg`, offset: 0.45 }, { rotate: "0deg" }],
      { duration: DRIFT, easing: "ease-in-out", fill: "both", pseudoElement: "::view-transition-image-pair(dino)" }));
    ["::view-transition-old(dino)", "::view-transition-new(dino)"].forEach((n) => pe(n)?.effect.updateTiming({ duration: DRIFT * 0.8, delay: DRIFT * 0.1 }));
  }
  let current = 0; // the latest switch; a switch started before it has finished hands over everything to it
  // Animations made with element.animate() on the transition's pseudo-elements outlive the transition: a filled end
  // state (the old page shrunk to the porthole, transparent) would be applied again to the next transition's layer of
  // the same name and blank the outgoing page. Every one is kept here and cancelled when its switch ends.
  let live = [];
  const keep = (a) => (live.push(a), a);
  const drop = () => { live.forEach((a) => a.cancel()); live = []; };
  function toggle(btn) {
    const next = isLight() ? "dark" : "light";
    if (!document.startViewTransition || REDUCED) { set(next); return; }
    const id = ++current;
    drop();
    const bb = btn.getBoundingClientRect();
    const at = (c) => c || { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2, r: 0 };
    const far = (c) => Math.hypot(Math.max(c.x, innerWidth - c.x), Math.max(c.y, innerHeight - c.y)) + 2;
    const leave = next === "dark" ? at(glassCircle()) : null; // the window we step out through (light layout)
    const dino = $(".dino-float"), db = dino.getBoundingClientRect();
    const lift = db.width > 0 && db.bottom > 0 && db.top < innerHeight; // only a dino on screen travels on its own
    dino.style.viewTransitionName = lift ? "dino" : "";
    root.classList.remove("vt-in", "vt-out");
    root.classList.add("vt-iris", next === "light" ? "vt-in" : "vt-out");
    root.classList.toggle("vt-dino", lift);
    const vt = document.startViewTransition(() => set(next));
    setTimeout(() => { if (id === current && isLight() !== (next === "light")) set(next); }, 300);
    vt.ready.then(() => {
      const c = leave || at(glassCircle()); // going light: the window we arrive at
      const o = `${c.x}px ${c.y}px`;
      const big = `circle(${far(c)}px at ${o})`, small = `circle(${c.r}px at ${o})`;
      const opt = { duration: APERTURE, easing: "cubic-bezier(0.65, 0, 0.25, 1)", fill: "forwards" };
      if (next === "light") keep(root.animate([{ clipPath: big, opacity: 1 }, { clipPath: small, opacity: 1, offset: 0.82 }, { clipPath: small, opacity: 0 }], { ...opt, pseudoElement: "::view-transition-old(root)" }));
      else keep(root.animate([{ clipPath: small, opacity: 0.35 }, { opacity: 1, offset: 0.2 }, { clipPath: big, opacity: 1 }], { ...opt, pseudoElement: "::view-transition-new(root)" }));
      if (lift) drift(keep);
    }).catch(() => {});
    vt.finished.finally(() => {
      if (id !== current) return; // a newer switch owns the classes, the animations and the dino's name now
      drop();
      dino.style.viewTransitionName = "";
      root.classList.remove("vt-iris", "vt-in", "vt-out", "vt-dino");
    });
  }
  $$(".theme-btn").forEach((b) => b.addEventListener("click", () => toggle(b)));
  sync();
  return { isLight, mapColors };
})();
