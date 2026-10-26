// Language: English by default, Chinese on request. The choice is made before first paint (inline script in <head>
// sets window.LANG); here the page swaps its copy. HTML carries each Chinese string next to the English one
// (data-zh = innerHTML, data-zh-<attr> = attribute); scripts pick strings with L(en, zh).
const LANG = window.LANG === "zh" ? "zh" : "en";
const ZH = LANG === "zh";
const L = (en, zh) => (ZH ? zh : en);

const I18n = (() => {
  if (ZH) {
    document.title = "EvoTrias — Where Autonomy Belongs · 中文";
    $$("[data-zh]").forEach((el) => (el.innerHTML = el.dataset.zh));
    $$("*").forEach((el) => {
      for (const a of [...el.attributes]) if (a.name.startsWith("data-zh-")) el.setAttribute(a.name.slice(8), a.value);
    });
  }

  // switcher: remember the choice, reload in the other language and land on the same spot of the same block.
  // Blocks (sections, their direct children, the panels in a pair) are the same in both languages, so the block
  // under the nav is stored by its index plus how far into it the reader was.
  const KEY = "evotrias-pos", TOP = 90;
  const blocks = () => $$("main > section, main > section > *, .duo > *");
  $$(".lang a").forEach((a) => {
    a.classList.toggle("on", a.dataset.l === LANG);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const l = a.dataset.l;
      if (l === LANG) return;
      try { localStorage.setItem("lang", l); } catch (_) { /* private mode: the URL still carries it */ }
      const bs = blocks();
      const above = bs.filter((x) => x.getBoundingClientRect().top <= TOP);
      const s = above.filter((x) => x.getBoundingClientRect().bottom > TOP).pop() || above.pop() || bs[0];
      const b = s.getBoundingClientRect();
      try { sessionStorage.setItem(KEY, JSON.stringify({ i: bs.indexOf(s), f: clamp((TOP - b.top) / b.height) })); } catch (_) {}
      const u = new URL(location.href);
      u.hash = "";
      if (l === "zh") u.searchParams.set("lang", "zh"); else u.searchParams.delete("lang");
      location.replace(u);
    });
  });

  // after a switch: restore the position, and keep re-applying it while the page settles (fonts, charts and the
  // case replays size themselves after load) until the reader takes over
  let pos = null;
  try { pos = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (_) {}
  if (pos && blocks()[pos.i]) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    let held = true;
    const go = () => {
      if (!held) return;
      const b = blocks()[pos.i].getBoundingClientRect();
      scrollTo({ top: Math.round(scrollY + b.top + pos.f * b.height - TOP), behavior: "instant" });
    };
    const release = () => (held = false);
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((t) => addEventListener(t, release, { once: true, passive: true }));
    go();
    document.fonts?.ready.then(go);
    addEventListener("load", () => { go(); requestAnimationFrame(go); });
    [300, 700, 1200, 1800, 2600].forEach((ms) => setTimeout(() => requestAnimationFrame(go), ms));
    setTimeout(release, 3200);
  }
  return { LANG };
})();
