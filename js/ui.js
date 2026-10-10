// Page-wide interaction layer: loader, magnetic buttons, 3D tilt, reveals, nav, counters, film.
const UI = (() => {
  // ------------------------------------------------------------ segmented controls (sliding ink)
  function seg(root, onPick) {
    const ink = root.querySelector(":scope > i");
    const btns = [...root.querySelectorAll("button")];
    const place = (b) => { if (ink) { ink.style.left = `${b.offsetLeft}px`; ink.style.width = `${b.offsetWidth}px`; ink.style.top = `${b.offsetTop}px`; ink.style.height = `${b.offsetHeight}px`; } };
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => x.classList.toggle("on", x === b));
      place(b);
      onPick(b);
    }));
    const on = btns.find((b) => b.classList.contains("on")) || btns[0];
    requestAnimationFrame(() => place(on));
    addEventListener("resize", () => place(btns.find((b) => b.classList.contains("on"))));
    return { select: (i) => btns[i].click(), btns };
  }

  // ------------------------------------------------------------ loader
  function loader(done) {
    const el = $("#loader"), bar = $(".ld-bar i"), pct = $(".ld-pct");
    const word = $(".ld-word");
    typeLoader(word, "EvoTrias");
    const imgs = $$("img").filter((i) => i.loading !== "lazy");
    // the readout chases the real progress: it rolls through every number instead of jumping, never stalls,
    // holds just short of 100 until everything is in, then lands on 100
    let real = 0, shown = 0, ready = false, last = performance.now();
    const t0 = last;
    let n = 0;
    const total = imgs.length + 1;
    const tick = () => { n++; real = Math.min(0.92, n / total); };
    imgs.forEach((im) => (im.complete ? tick() : (im.addEventListener("load", tick, { once: true }), im.addEventListener("error", tick, { once: true }))));
    const roll = (now) => {
      if (out) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const goal = ready ? 1 : Math.max(real, Math.min(0.9, (now - t0) / 2600)); // a slow floor so it always creeps
      shown = Math.min(goal, shown + Math.max((ready ? 0.3 : 0.1) * dt, (goal - shown) * dt * (ready ? 4.5 : 3)));
      const v = Math.round(shown * 100);
      bar.style.width = `${shown * 100}%`;
      pct.textContent = String(v).padStart(3, "0");
      if (ready && v >= 100) { setTimeout(finish, 220); return; }
      requestAnimationFrame(roll);
    };
    let out = false;
    const finish = () => {
      if (out) return;
      out = true;
      bar.style.width = "100%"; pct.textContent = "100";
      el.classList.add("out");
      document.body.classList.remove("is-loading");
      done();
      setTimeout(() => el.remove(), 1400);
    };
    requestAnimationFrame(roll);
    const guard = new Promise((r) => setTimeout(r, 5000)); // never hold the page hostage to a slow asset
    const minShow = new Promise((r) => setTimeout(r, 900));
    Promise.race([guard, Promise.all([minShow, document.fonts.ready, ...imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); })))])]).then(() => { ready = true; setTimeout(finish, 1600); }); // the timer is a backstop if frames are throttled
  }

  // ------------------------------------------------------------ typewriter (loader word): letters strike one by one behind an underscore cursor
  function typeLoader(el, text) {
    el.innerHTML = `<span class="tw-txt"></span><span class="tw-cur">_</span>`;
    const txt = el.firstChild;
    let k = 0;
    (function next() {
      if (k >= text.length) return;
      txt.textContent += text[k++];
      setTimeout(next, 70 + Math.random() * 40);
    })();
  }

  // ------------------------------------------------------------ hero wordmark: per-letter 3D drop-in
  function wordmark() {
    const wm = $(".wordmark");
    let i = 0;
    wm.querySelectorAll("span").forEach((sp) => {
      sp.innerHTML = [...sp.textContent].map((c) => `<span class="ch" style="--i:${i++}">${c}</span>`).join("");
    });
    requestAnimationFrame(() => wm.classList.add("in"));
  }

  // ------------------------------------------------------------ reveals + scrambled headings
  function reveals() {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.hasAttribute("data-scramble") && !e.target.dataset.done) {
        e.target.dataset.done = 1;
        scramble(e.target, e.target.textContent.trim(), 1000);
      }
      io.unobserve(e.target);
    }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }


  // ------------------------------------------------------------ magnetic buttons + 3D tilt cards with light follow
  function magnetic() {
    if (TOUCH) return;
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const b = el.getBoundingClientRect();
        const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
        el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.25}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }
  function tilt() {
    if (TOUCH) return;
    $$("[data-tilt]").forEach((el) => {
      const max = +el.dataset.tilt || 5;
      let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0, active = false;
      const step = () => {
        cx = lerp(cx, tx, 0.12); cy = lerp(cy, ty, 0.12);
        el.style.transform = `rotateX(${-cy * max}deg) rotateY(${cx * max}deg)`;
        if (active || Math.abs(cx) > 0.002 || Math.abs(cy) > 0.002) raf = requestAnimationFrame(step);
        else { el.style.transform = ""; raf = 0; }
      };
      el.addEventListener("pointermove", (e) => {
        const b = el.getBoundingClientRect();
        const u = (e.clientX - b.left) / b.width, v = (e.clientY - b.top) / b.height;
        tx = u * 2 - 1; ty = v * 2 - 1; active = true;
        el.style.setProperty("--mx", `${u * 100}%`); el.style.setProperty("--my", `${v * 100}%`);
        if (!raf) raf = requestAnimationFrame(step);
      });
      el.addEventListener("pointerleave", () => { tx = 0; ty = 0; active = false; if (!raf) raf = requestAnimationFrame(step); });
    });
  }

  // ------------------------------------------------------------ nav: scrolled state, progress, active section
  function nav() {
    const navEl = $("#nav"), bar = $(".nav-progress i");
    const links = $$(".nav-links a");
    const secs = links.map((a) => $(a.getAttribute("href")));
    const hd = $(".hero-dino");
    let queued = false, lastCur = -2;
    const update = () => {
      queued = false;
      // reads
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      let cur = -1, best = -Infinity;
      secs.forEach((s, i) => { const t = s ? s.getBoundingClientRect().top : Infinity; if (t < innerHeight * 0.4 && t > best) { best = t; cur = i; } });
      // writes
      bar.style.transform = `scaleX(${clamp(y / max)})`;
      navEl.classList.toggle("scrolled", y > 30);
      if (cur !== lastCur) { links.forEach((a, i) => a.classList.toggle("on", i === cur)); lastCur = cur; }
      if (hd && y < innerHeight * 1.5) hd.style.translate = `0 ${y * -0.18}px`;
    };
    addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
    // phone menu
    const burger = $(".nav-burger");
    const setOpen = (on) => { navEl.classList.toggle("open", on); burger.setAttribute("aria-expanded", String(on)); };
    burger.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!navEl.classList.contains("open")); });
    links.forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("click", (e) => { if (!navEl.contains(e.target)) setOpen(false); });
  }

  // ------------------------------------------------------------ number counters
  function counters() {
    $$("[data-count]").forEach((el) => onVisible(el, () => {
      const to = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.prefix || "";
      const t0 = performance.now(), D = 1800;
      (function tick(n) {
        const u = E.outQuint(clamp((n - t0) / D));
        el.textContent = pre + fmt(to * u, dec);
        if (u < 1) requestAnimationFrame(tick);
      })(t0);
    }, 0.6));
  }

  // ------------------------------------------------------------ film
  function film() {
    const frame = $(".film-frame"), v = $("#film-video"), btn = $(".film-play");
    btn.addEventListener("click", () => v.play());
    v.addEventListener("play", () => frame.classList.add("playing"));
    v.addEventListener("ended", () => frame.classList.remove("playing"));
  }

  // ------------------------------------------------------------ bibtex, placeholders, confetti
  function misc() {
    $(".bib-copy").addEventListener("click", () => {
      navigator.clipboard?.writeText($("#bibtex").textContent).then(() => toast("BibTeX copied"), () => toast("Copy failed — select the text manually"));
    });
    $$("[data-soon]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast(a.dataset.soon || "Coming soon"); }));
    // confetti around the trophy dino
    const cf = $("#confetti");
    const cols = ["#4fd1e8", "#22a889", "#e0a24a", "#ff8a4c", "#9b8ad0", "#bff4ff"];
    const r = rng(3);
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("i");
      s.style.cssText = `left:${10 + r() * 80}%;top:${r() * 20}%;background:${cols[i % cols.length]};animation-delay:${r() * 3.6}s;--dx:${(r() - 0.5) * 120}px;--rot:${(r() - 0.5) * 720}deg;width:${5 + r() * 5}px;height:${8 + r() * 8}px`;
      cf.appendChild(s);
    }
  }

  // pause CSS animations of sections that are not on screen
  function pauseOffscreen() {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("offscreen", !e.isIntersecting)), { rootMargin: "200px 0px" });
    $$("main > section").forEach((s) => io.observe(s));
  }

  return { seg, loader, wordmark, reveals, magnetic, tilt, nav, counters, film, misc, pauseOffscreen };
})();
