// Light / dark theme. Light is the default; the choice is made before first paint (inline script in <head> sets
// data-theme on <html>) and remembered in this browser.
// Shared text and surface colours use var(--hex-xxxxxx, #xxxxxx) / rgba(var(--rgb-xxxxxx, r, g, b), a);
// the light theme defines those variables, plus dedicated highlight and gradient styles. Scripts draw SVG with literal colours too,
// so this module maps them the same way: fill / stroke / stop-color attributes and colours in style attributes are
// swapped to their light values (originals kept on the element), for what is on the page and for whatever the
// charts draw later. The terminal, the film and the porthole (drawn for the light cabin) keep their own colours.
const Theme = (() => {
  const root = document.documentElement;
  const KEY = "theme";
  const ATTRS = ["fill", "stroke", "stop-color", "flood-color"];
  const KEEP = ".term, .film-frame, .porthole";
  const isLight = () => root.dataset.theme === "light";

  // Read the complete palette before writing any SVG attributes; interleaved style reads force extra layouts.
  let cache = new Map();
  const hex6 = (h) => (h.length === 3 ? [...h].map((c) => c + c).join("") : h).toLowerCase();
  function mapColors(str) {
    if (!/#|rgb/.test(str)) return str;
    const look = (name) => cache.get(name) || "";
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
    const palette = getComputedStyle(root);
    cache = new Map([...palette].filter((name) => /^--(?:hex-|rgb-|shadow$)/.test(name)).map((name) => [name, palette.getPropertyValue(name).trim()]));
    mo.disconnect();
    paint(document.body);
    if (isLight()) mo.observe(document.body, { childList: true, subtree: true });
    $('meta[name="theme-color"]')?.setAttribute("content", isLight() ? "#fbfcfc" : "#03060a");
    $$(".theme-btn").forEach((b) => {
      const l = isLight();
      b.setAttribute("aria-label", l ? "Switch to dark theme" : "Switch to light theme");
      b.title = b.getAttribute("aria-label");
    });
    dispatchEvent(new Event("themechange"));
  }

  function set(mode) {
    if (mode === "light") root.dataset.theme = "light"; else delete root.dataset.theme;
    try { localStorage.setItem(KEY, mode); } catch (_) {}
    sync();
  }
  // ---------------------------------------------------------------- the switch
  // On the hero, one circle anchored on the porthole glass divides the two themes: the dark one inside it, the light
  // one outside. The page switches at once; still or live copies of its top and nav (rendered by the page's own
  // stylesheet inside shadow trees, which cannot see <html>'s theme, so each keeps the theme its scope says) stand in
  // wherever the real page is in the other theme.
  // The dark side is one round window: the universe itself (opaque space and the live galaxy, which js/galaxy.js
  // re-frames on the same clock, so it zooms in step with the circle and keeps turning) with the dark copy of the page
  // inside it. The window is a square, round-cornered box scaled to the circle's radius, its contents scaled back so
  // they stay put: a rounded-corner clip the GPU applies as it composites. Nothing is clipped by a path or masked,
  // and no layer is restyled or repainted while it moves. (A clip-path on the page itself, tried first, made the
  // browser repaint the clipped page every frame.)
  // The light side is the real page going light; going dark, it is a light copy laid over the (already dark) page,
  // opaque on its own cabin wall, and the dark page shows from the end.
  // The glass reflections and the dark theme's orbit rings and glow, which sit inside the window, fade instead of
  // being cut, and the dino flies between its two places as a copy, its float in phase throughout.
  // The circle is quick (IRIS): a switch is asked for to change light and dark, so that happens at once, while the
  // galaxy's re-framing (SCENE) and the dino's flight (DRIFT) keep their own, slower pace.
  const IRIS = 700, SCENE = 1400, DRIFT = 1750;
  const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;
  const n2 = (v) => +v.toFixed(2);
  // The dino's layer keeps its final size and travels by transform alone, along an arc with a slight lean.
  function flight(a, b, lift) {
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const lean = Math.sign(bx - ax) * Math.min(5, Math.hypot(bx - ax, by - ay) * 0.025);
    return Array.from({ length: 121 }, (_, i) => {
      const t = i / 120, u = ease(t);
      const x = lerp(ax, bx, u), y = lerp(ay, by, u) - 4 * lift * u * (1 - u);
      const sx = lerp(a.width, b.width, u) / b.width, sy = lerp(a.height, b.height, u) / b.height;
      return { offset: t, transform: `translate(${n2(x)}px, ${n2(y)}px) rotate(${n2(lean * Math.sin(Math.PI * u))}deg) scale(${sx}, ${sy}) translate(-50%, -50%)` };
    });
  }
  // Copies start their CSS animations from zero: put each one at its original's time (and hold it there, for stills).
  function inPhase(src, copy, still) {
    const key = (list) => (a) => `${list.indexOf(a.effect.target)}|${a.effect.pseudoElement || ""}|${a.animationName || ""}`;
    const from = [src, ...src.querySelectorAll("*")], to = [copy, ...copy.querySelectorAll("*")];
    const at = new Map(src.getAnimations({ subtree: true }).map((a) => [key(from)(a), a.currentTime]));
    for (const a of copy.getAnimations({ subtree: true })) {
      const t = at.get(key(to)(a));
      if (t != null) a.currentTime = t;
      else if (a.effect.getComputedTiming().endTime !== Infinity) a.finish();
      if (still) a.pause();
    }
  }
  // Two pairs of hosts for the copies (page top and nav), kept in the document so their stylesheet is loaded and parsed
  // long before the first switch: the light side's just under the window, the dark side's inside it.
  const sheet = $('link[rel="stylesheet"][href*="main.css"]');
  const universe = $("#universe"), view = $(".universe-view");
  const hosts = (side, parent, before) => ["page", "nav"].map((kind) => {
    const host = document.createElement("div"), shadow = host.attachShadow({ mode: "open" });
    const link = document.createElement("link"), scope = document.createElement("div");
    host.className = `theme-ghost ${side} ${kind}`; host.setAttribute("aria-hidden", "true"); host.inert = true;
    link.rel = "stylesheet"; link.href = sheet.href; scope.className = "theme-scope";
    shadow.append(link, scope);
    const ghost = { host, scope, ready: false };
    link.addEventListener("load", () => (ghost.ready = true));
    parent.insertBefore(host, before);
    return ghost;
  });
  const lightSide = hosts("light", document.body, universe), darkSide = hosts("dark", view, null);
  // A dark copy on the light page must not inherit the light palette: unset it, and the colours fall back to dark.
  const palette = (name) => /^--(hex-|rgb-|shadow$|wordmark-|evo-bar-|bar-grad$)/.test(name);
  // Copy the page top (the hero and whatever follows it on screen) and the nav as they are now. The light side's page
  // sits in the document; the dark side's in the window, which is the viewport, so it is placed by the scroll.
  function copy([page, bar], still) {
    const main = $("main"), nav = $("#nav"), light = isLight();
    for (const { host, scope } of [page, bar]) {
      scope.innerHTML = ""; scope.removeAttribute("style");
      if (light) scope.dataset.theme = "light"; else delete scope.dataset.theme;
      host.classList.add("on");
    }
    const top = main.cloneNode(false);
    for (const el of main.children) { if (el.getBoundingClientRect().top >= innerHeight) break; top.append(el.cloneNode(true)); }
    // a copied video would fetch the film: keep only its poster
    top.querySelectorAll("video").forEach((v) => { v.removeAttribute("src"); v.preload = "none"; v.querySelectorAll("source").forEach((s) => s.remove()); });
    page.host.style.top = `${main.getBoundingClientRect().top + (page.host.parentNode === view ? 0 : scrollY)}px`;
    // the nav's copy is placed in a host of its own size (plus its shadow)
    const nb = nav.getBoundingClientRect(), navCopy = nav.cloneNode(true), PAD = 64;
    Object.assign(navCopy.style, { position: "absolute", left: `${PAD}px`, top: `${PAD}px`, width: `${nb.width}px`, margin: "0", transform: "none" });
    Object.assign(bar.host.style, { left: `${nb.left - PAD}px`, top: `${nb.top - PAD}px`, width: `${nb.width + 2 * PAD}px`, height: `${nb.height + 2 * PAD}px` });
    page.scope.append(top); bar.scope.append(navCopy);
    inPhase(main, top, still); inPhase(nav, navCopy, still);
  }
  const clear = (side) => side.forEach(({ host, scope }) => { host.classList.remove("on"); host.removeAttribute("style"); scope.innerHTML = ""; });
  let live = [], vt = null;
  async function heroSwitch(next) {
    const toDark = next === "dark", dino = $(".dino-travel"), img = $(".dino-float", dino);
    const sy = scrollY, sx = scrollX, doc = (r) => ({ left: r.left + sx, top: r.top + sy, width: r.width, height: r.height });
    const a = dino.getBoundingClientRect(), filterBefore = getComputedStyle(img).filter;
    const glassBefore = $(".pt-glass").getBoundingClientRect();
    // ---- the outgoing side as it is, then the switch, then (going dark) the incoming dark side, live
    copy(toDark ? lightSide : darkSide, true);
    root.classList.add("theme-moving");
    set(next);
    if (toDark) copy(darkSide, false);
    else {
      const unset = [...getComputedStyle(root)].filter(palette).map((name) => `${name}: initial`).join(";");
      darkSide.forEach(({ scope }) => (scope.style.cssText = unset));
    }
    const b = dino.getBoundingClientRect(), filterAfter = getComputedStyle(img).filter;
    const g = toDark ? glassBefore : $(".pt-glass").getBoundingClientRect();
    // ---- the dino flies on top, unless its arc would cross a nav (it belongs under them): then it switches with its side
    const lift = Math.min(110, Math.hypot(b.left - a.left, b.top - a.top) * 0.25), nb = $("#nav").getBoundingClientRect();
    const fly = a.width > 0 && b.width > 0 && Math.min(a.top, b.top) - lift > nb.bottom + 8;
    let flyer = null;
    if (fly) {
      flyer = dino.cloneNode(true);
      flyer.classList.add("theme-flyer");
      flyer.style.width = `${b.width}px`;
      document.body.append(flyer);
      inPhase(dino, flyer, false);
      dino.style.visibility = "hidden";
      for (const { scope } of [...lightSide, ...darkSide]) $$(".dino-travel", scope).forEach((d) => (d.style.visibility = "hidden"));
    }
    const glass = document.createElement("div");
    glass.className = "pt-glass theme-glass";
    Object.assign(glass.style, { left: `${g.left + sx}px`, top: `${g.top + sy}px`, width: `${g.width}px`, height: `${g.height}px` });
    document.body.append(glass);
    // ---- the window: a square around the circle's centre, big enough for the largest circle of the flight
    const cx = g.left + g.width / 2, cy = g.top + g.height / 2;
    const R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 48;
    Object.assign(universe.style, { width: `${2 * R}px`, height: `${2 * R}px` });
    root.classList.add("theme-iris");
    const page = darkSide[0].host;
    let moved = 0;
    const scene = Galaxy.morphTheme(toDark ? 1 : 0, toDark ? 0 : 1, g, SCENE, (c) => {
      const s = Math.max(1e-3, c.r / R);
      universe.style.transform = `translate(${n2(c.x - R)}px, ${n2(c.y - R)}px) scale(${s})`;
      view.style.transform = `translate(${n2(R - c.x / s)}px, ${n2(R - c.y / s)}px) scale(${1 / s})`;
      // the dark page copy follows the page if it scrolls
      const dy = scrollY - sy;
      if (dy !== moved) { moved = dy; page.style.translate = `0 ${-dy}px`; }
    }, IRIS);
    // ---- fades, on the circle's clock: the glass reflections; the dark theme's orbit rings, and its glow (through its
    // filter: the glow pulses its own opacity)
    const anims = [];
    const fade = (el, at, until, show, filter) => {
      const k = (v) => (filter == null ? { opacity: v } : { filter: `${filter} opacity(${v})`.trim() });
      const [p, q] = show ? [0, 1] : [1, 0];
      anims.push(el.animate([k(p), { ...k(p), offset: at }, { ...k(q), offset: until }, k(q)], { duration: IRIS, fill: "both" }));
    };
    if (toDark) fade(glass, 0, 0.3, false); else fade(glass, 0.7, 1, true);
    const rims = darkSide[0].scope;
    for (const el of $$(".orbit", rims)) toDark ? fade(el, 0.45, 1, true) : fade(el, 0, 0.35, false);
    for (const el of $$(".dino-shadow", rims)) {
      const own = getComputedStyle(el).filter.replace("none", "");
      toDark ? fade(el, 0.45, 1, true, own) : fade(el, 0, 0.35, false, own);
    }
    if (flyer) {
      anims.push(flyer.animate(flight(doc(a), doc(b), lift), { duration: DRIFT, fill: "both" }));
      if (filterBefore !== filterAfter) anims.push($(".dino-float", flyer).animate([{ filter: filterBefore }, { filter: filterAfter }], { duration: SCENE, easing: "cubic-bezier(0.37, 0, 0.63, 1)", fill: "both" }));
    }
    anims.forEach((anim) => anim.pause());
    live = anims;
    const done = () => {
      // the page underneath is the new theme throughout: put the universe back and let the galaxy follow it again
      root.classList.remove("theme-iris", "theme-moving");
      universe.style.width = universe.style.height = universe.style.transform = view.style.transform = "";
      clear(lightSide); clear(darkSide);
      glass.remove();
      Galaxy.finishTheme();
    };
    try {
      // The new theme's first frames are the expensive ones (style, layout, paint and raster, which can hold the next
      // frames back). Everything starts once frames come at their normal pace again, so none of the flight is skipped.
      const frame = () => new Promise(requestAnimationFrame);
      let t0 = await frame();
      for (let i = 0, calm = 0; i < 14 && calm < 2; i++) { const t = await frame(); calm = i >= 2 && t - t0 < 24 ? calm + 1 : 0; t0 = t; }
      if (live !== anims) return; // finished early (a resize, a hidden tab)
      scene.startAt(t0);
      anims.forEach((anim) => (anim.startTime = t0));
      await Promise.all([scene.reached.then(done), ...anims.map((anim) => anim.finished)]);
    } catch (_) {
      // cancelled: fall through to the end state
    } finally {
      done();
      anims.forEach((anim) => anim.cancel());
      live = [];
      dino.style.visibility = "";
      flyer?.remove();
    }
  }
  // When the hero has scrolled away, retain the familiar circular page wipe at the switch itself.
  async function pageTransition(next, btn) {
    const b = btn.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
    const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 3;
    root.classList.add("theme-page", `to-${next}`);
    vt = document.startViewTransition(() => set(next));
    try {
      await vt.ready;
      const frames = [0, far].map((r) => ({ clipPath: `circle(${r}px at ${x}px ${y}px)` }));
      if (next === "light") frames.reverse();
      live = [root.animate(frames, { duration: 1000, easing: "cubic-bezier(.65,0,.25,1)", fill: "both", pseudoElement: `::view-transition-${next === "light" ? "old" : "new"}(root)` })];
      await vt.finished;
    } catch (_) { await vt.updateCallbackDone.catch(() => {}); }
    finally {
      vt = null;
      live.forEach((anim) => anim.cancel()); live = [];
      root.classList.remove("theme-page", `to-${next}`);
    }
  }
  let switching = false, requested = isLight() ? "light" : "dark";
  function toggle(btn) {
    requested = requested === "light" ? "dark" : "light";
    if (!switching) transition(requested, btn);
  }
  async function transition(next, btn) {
    if (REDUCED || document.hidden) { set(next); return; }
    switching = true;
    try {
      const hero = $(".hero").getBoundingClientRect();
      if (hero.bottom > 0 && hero.top < innerHeight && [...lightSide, ...darkSide].every((gh) => gh.ready)) await heroSwitch(next);
      else if (document.startViewTransition) await pageTransition(next, btn);
      else set(next);
    } finally {
      switching = false;
      if (requested !== (isLight() ? "light" : "dark")) transition(requested, btn);
    }
  }
  const finish = () => {
    if (!switching) return;
    const anims = live; live = [];
    anims.forEach((anim) => anim.finish()); vt?.skipTransition(); Galaxy.finishTheme();
  };
  addEventListener("resize", finish);
  document.addEventListener("visibilitychange", () => { if (document.hidden) finish(); });

  $$(".theme-btn").forEach((b) => b.addEventListener("click", () => toggle(b)));
  sync();
  return { isLight, mapColors };
})();
