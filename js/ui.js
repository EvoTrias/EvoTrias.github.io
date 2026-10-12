// Page-wide interaction layer: loader, magnetic buttons, 3D tilt, reveals, nav (with hover ink), counters, film, footer spotlight.
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
    scramble(word, "EvoTrias", 1100);
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
      const ready = () => requestAnimationFrame(() => document.documentElement.classList.add("ready"));
      if (document.readyState === "complete") ready(); else addEventListener("load", ready, { once: true });
      done();
      setTimeout(() => el.remove(), 1400);
    };
    requestAnimationFrame(roll);
    const guard = new Promise((r) => setTimeout(r, 5000)); // never hold the page hostage to a slow asset
    const minShow = new Promise((r) => setTimeout(r, 900));
    Promise.race([guard, Promise.all([minShow, document.fonts.ready, ...imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); })))])]).then(() => { ready = true; setTimeout(finish, 1600); }); // the timer is a backstop if frames are throttled
  }

  // ------------------------------------------------------------ hero wordmark: per-letter 3D drop-in
  function wordmark() {
    const wm = $(".wordmark");
    let i = 0;
    wm.querySelectorAll("span").forEach((sp) => {
      sp.innerHTML = [...sp.textContent].map((c) => `<span class="ch" style="--i:${i++}">${c}</span>`).join("");
    });
    // word-wide gradient on "Trias": tell each letter the word width and its own offset (layout, not transforms)
    const tr = $(".wm-trias", wm);
    const measure = () => {
      const chs = $$(".ch", tr), x0 = chs[0].offsetLeft;
      tr.style.setProperty("--tw", `${tr.offsetWidth}px`);
      chs.forEach((c) => c.style.setProperty("--ox", `${c.offsetLeft - x0}px`));
    };
    measure();
    document.fonts?.ready.then(measure);
    addEventListener("resize", measure);
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
    filmPrefetch(v);
  }

  // Have the film ready before anyone presses play. On desktop, once the page has settled, the whole file is pulled
  // in the background (low priority) and, if playback hasn't started yet, the player switches to that in-memory copy:
  // play starts instantly and never buffers. Phones, data-saver and slow links skip the 25 MB download and only let
  // the browser buffer ahead as the section approaches. Pressing play mid-download hands over to normal streaming.
  function filmPrefetch(v) {
    const url = $("source", v).src;
    const conn = navigator.connection || {};
    const lean = TOUCH || conn.saveData || /2g|3g/.test(conn.effectiveType || "");
    const started = () => !v.paused || v.played.length > 0 || v.currentTime > 0;
    const buffer = () => { if (v.preload !== "auto") v.preload = "auto"; };
    let ctl = null, asked = false;
    const full = () => {
      if (asked || started()) return;
      asked = true;
      ctl = new AbortController();
      v.addEventListener("play", () => ctl?.abort(), { once: true });
      fetch(url, { signal: ctl.signal, priority: "low" })
        .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
        .then((b) => { ctl = null; if (!started()) { v.preload = "auto"; v.src = URL.createObjectURL(b); } })
        .catch(() => { ctl = null; if (!started()) buffer(); }); // offline file:// preview, aborted or failed: plain buffering
    };
    // reaching the film (about a screen away) starts whichever path applies, if the idle prefetch hasn't already
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); lean ? buffer() : full(); } }, { rootMargin: "100% 0px" });
    io.observe(v);
    if (lean) return;
    const later = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));
    const kick = () => setTimeout(() => later(full), 1200);
    if (document.readyState === "complete") kick(); else addEventListener("load", kick, { once: true });
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

  // ------------------------------------------------------------ nav: one pill glides to the hovered link
  function navInk() {
    const nl = $(".nav-links");
    const ink = document.createElement("i");
    ink.className = "nav-ink";
    nl.prepend(ink);
    let shown = false;
    const go = (a) => {
      if (!shown) { ink.style.transition = "none"; requestAnimationFrame(() => (ink.style.transition = "")); }
      ink.style.width = `${a.offsetWidth}px`;
      ink.style.transform = `translateX(${a.offsetLeft}px)`;
      shown = true;
    };
    $$("a", nl).forEach((a) => a.addEventListener("pointerenter", () => go(a)));
    nl.addEventListener("pointerleave", () => (shown = false));
  }

  // ------------------------------------------------------------ footer wordmark: spotlight follows the pointer
  function footLight() {
    const w = $(".foot-word"), host = w.closest(".foot");
    let tx = 50, ty = 60, cx = 50, cy = 60, hover = false, vis = false;
    host.addEventListener("pointermove", (e) => {
      const b = w.getBoundingClientRect();
      tx = ((e.clientX - b.left) / b.width) * 100; ty = ((e.clientY - b.top) / b.height) * 100; hover = true;
    });
    host.addEventListener("pointerleave", () => (hover = false));
    const tick = (now) => {
      if (!vis) return;
      if (!hover) { const t = now / 1000; tx = 50 + 36 * Math.sin(t * 0.45); ty = 55 + 18 * Math.sin(t * 0.8); }
      cx = lerp(cx, tx, 0.07); cy = lerp(cy, ty, 0.07);
      w.style.setProperty("--mx", `${cx.toFixed(2)}%`); w.style.setProperty("--my", `${cy.toFixed(2)}%`);
      requestAnimationFrame(tick);
    };
    if (REDUCED) return;
    watchVisible(w, (v) => { if (v && !vis) { vis = true; requestAnimationFrame(tick); } else if (!v) vis = false; });
  }

  // ------------------------------------------------------------ hero → film: scrolling down out of the hero glides onto the film
  function filmSnap() {
    if (REDUCED) return;
    const hero = $(".hero"), sec = $("#film"), label = $(".sec-idx", sec), wrap = $(".film-wrap", sec);
    // resting place: the whole film block (label → video) centred under the nav if it fits, else the label just under the nav
    const target = () => {
      const top = sec.getBoundingClientRect().top + scrollY + label.offsetTop; // offsets ignore the reveal transforms
      const span = wrap.offsetTop + wrap.offsetHeight - label.offsetTop;
      const nav = innerWidth < 700 ? 70 : 84, room = innerHeight - nav - 24;
      return Math.round(top - nav - (span <= room ? (room - span) / 2 : 28));
    };
    // only where the hero is a single screen; a taller hero would have content skipped by the jump
    const armed = () => !document.body.classList.contains("is-loading") && hero.offsetHeight <= innerHeight * 1.15;
    let anim = 0, gliding = false, lockUntil = 0, lockCap = 0, lastDy = 0;
    const glide = (to) => {
      cancelAnimationFrame(anim);
      const from = scrollY, d = to - from, t0 = performance.now();
      const dur = clamp(620 + Math.abs(d) * 0.32, 780, 1250);
      gliding = true;
      const step = (now) => {
        const u = clamp((now - t0) / dur);
        scrollTo({ top: from + d * E.inOut(u), behavior: "instant" });
        if (u < 1) { anim = requestAnimationFrame(step); return; }
        gliding = false;
        lockUntil = now + 220; lockCap = now + 2200; // swallow the tail of a trackpad flick so it doesn't carry past the film
      };
      anim = requestAnimationFrame(step);
    };
    const stop = () => { if (gliding) { cancelAnimationFrame(anim); gliding = false; } };
    const below = () => { const t = target(); return scrollY < t - 30 ? t : null; };

    addEventListener("wheel", (e) => {
      if (e.ctrlKey || !armed()) return;
      const down = e.deltaY > 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      const dy = Math.abs(e.deltaY);
      if (gliding) { if (down) { e.preventDefault(); lastDy = dy; } else stop(); return; }
      const now = performance.now();
      // momentum events keep coming and fade out; a clearly stronger event is a new, deliberate scroll and goes through
      if (down && now < lockUntil && now < lockCap && dy <= lastDy * 1.3 + 4) { e.preventDefault(); lockUntil = now + 160; lastDy = dy; return; }
      lockUntil = 0;
      if (!down) return;
      const t = below();
      if (t == null) return;
      e.preventDefault();
      glide(t);
    }, { passive: false });
    addEventListener("keydown", (e) => {
      if (!["PageDown", " ", "ArrowDown"].includes(e.key) || e.shiftKey || e.altKey || !armed()) return;
      if (e.target.closest?.("input, textarea, select, button, video, [contenteditable]")) return;
      const t = below();
      if (t == null || gliding) return;
      e.preventDefault();
      glide(t);
    });
    // touch: let the flick run natively, then settle onto the film if it came to rest inside the hero heading down
    let lastY = scrollY, dir = 0, idle = 0, touching = false;
    const settle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        if (touching || gliding || dir <= 0 || !armed() || scrollY < 40) return;
        const t = below();
        if (t != null) glide(t);
      }, 140);
    };
    addEventListener("touchstart", () => { touching = true; stop(); }, { passive: true });
    addEventListener("touchend", () => { touching = false; settle(); }, { passive: true });
    addEventListener("scroll", () => {
      if (gliding) return;
      if (scrollY !== lastY) dir = scrollY > lastY ? 1 : -1;
      lastY = scrollY;
      if (TOUCH) settle();
    }, { passive: true });
    // links to the film ("Watch the film", nav, scroll cue) land on the same resting place with the same glide
    $$('a[href="#film"]').forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      glide(target());
      history.replaceState(null, "", "#film");
    }));
  }

  // pause CSS animations of sections that are not on screen
  function pauseOffscreen() {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("offscreen", !e.isIntersecting)), { rootMargin: "200px 0px" });
    $$("main > section").forEach((s) => io.observe(s));
  }

  return { seg, loader, wordmark, reveals, magnetic, tilt, nav, navInk, counters, film, misc, footLight, filmSnap, pauseOffscreen };
})();
