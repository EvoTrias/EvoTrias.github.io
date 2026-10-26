// Governance case studies: animated replays of the paper's Note-trigger and Meta-guidance figures.
// Data: read off the paper's vector figures (notes_trigger_replay.pdf, meta_guidance_case.pdf); texts condensed from
// the committed Note / direction records quoted in Appendix A.4–A.5.
const Cases = (() => {
  // ================================================================ shared: a scrub-able replay clock
  // it = continuous iteration time. Elements switch on at their own times; CSS transitions do the motion.
  function player(root, { end, rate, holds = [], render, xOf }) {
    const vis = $(".case-vis", root);
    const btn = $(".cs-play", root), track = $(".cs-track", root), fill = $(".cs-fill", root), knob = $(".cs-knob", root);
    let it = 0, playing = false, visible = false, started = false, last = 0, holdUntil = 0, raf = 0;
    const set = (v) => {
      it = clamp(v, 0, end);
      render(it);
      const u = it / end;
      fill.style.width = `${u * 100}%`; knob.style.left = `${u * 100}%`;
      btn.classList.toggle("ended", !playing && it >= end); // finished: the middle button becomes "replay"
    };
    const follow = () => { // on narrow screens the chart scrolls sideways: keep the replay head in view
      if (!xOf || vis.scrollWidth <= vis.clientWidth + 4) return;
      const px = (xOf(it) / 820) * vis.scrollWidth;
      vis.scrollLeft = clamp(px - vis.clientWidth * 0.62, 0, vis.scrollWidth - vis.clientWidth);
    };
    const loop = (now) => {
      raf = 0;
      if (!playing || !visible) return;
      const dt = Math.min(0.12, (now - last) / 1000); last = now;
      if (now >= holdUntil) {
        let next = it + dt * rate;
        const h = holds.find((t) => it < t && next >= t); // pause on story beats so the panel can be read
        if (h) { next = h; holdUntil = now + h.ms; }
        set(next);
        follow();
        if (it >= end) { stop(); return; }
      }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && playing && visible) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const play = () => { if (it >= end) set(0); playing = true; holdUntil = 0; btn.classList.add("playing"); btn.classList.remove("ended"); kick(); };
    const stop = () => { playing = false; btn.classList.remove("playing"); btn.classList.toggle("ended", it >= end); };
    btn.addEventListener("click", () => (playing ? stop() : play()));
    // step one iteration back / forward (pauses the replay)
    const step = (d) => { stop(); set(clamp(Math.floor(it + 0.25) + d, 0, 50)); follow(); };
    $(".cs-prev", root)?.addEventListener("click", () => step(-1));
    $(".cs-next", root)?.addEventListener("click", () => step(1));
    // scrubbing
    let drag = false;
    const seekAt = (e) => { const b = track.getBoundingClientRect(); set(clamp((e.clientX - b.left) / b.width) * end); };
    track.addEventListener("pointerdown", (e) => { drag = true; track.setPointerCapture(e.pointerId); stop(); seekAt(e); });
    track.addEventListener("pointermove", (e) => drag && seekAt(e));
    track.addEventListener("pointerup", () => (drag = false));
    watchVisible(root, (v) => { visible = v; kick(); });
    set(0);
    return {
      seek: (v) => { stop(); set(v); },
      redraw: () => set(it),
      autostart: () => { if (started) return; started = true; if (REDUCED) set(end); else play(); },
      get it() { return it; },
    };
  }
  const hold = (t, ms) => Object.assign(new Number(t), { ms });
  const txt = (el, s) => { el.textContent = s; return el; };
  const pct = (v, d = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(d)}%`;
  // The chart's viewBox height is fitted to the side panel on wide layouts, so the two columns end together
  // (text keeps its size: only the plot area grows). Stacked layouts keep the default height.
  function fitter(root, H0, rebuild) {
    const svg = $(".case-vis svg", root), side = $(".case-side", root), leg = $(".case-vis .cs-leg", root);
    let H = H0, rz = 0;
    const fit = () => {
      let h = H0;
      const sw = svg.getBoundingClientRect().width;
      const stacked = side.getBoundingClientRect().top > svg.getBoundingClientRect().bottom - 20;
      if (!stacked && sw > 200) h = clamp(Math.round((820 * (side.offsetHeight - leg.offsetHeight - 10)) / sw), 360, 640);
      if (Math.abs(h - H) > 3) { H = h; rebuild(H); }
    };
    addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(fit, 150); });
    document.fonts?.ready.then(fit);
    requestAnimationFrame(fit);
    return () => H;
  }

  // ================================================================ 1. Notes: a write gate, not a diary
  const NT = {
    // [iteration, parent, child, band lo, band hi, kind]   kind: root | "" (inside band) | p (positive Note) | n (negative Note)
    rows: [[1,null,0.534,null,null,"root"],[2,null,0.6663,null,null,"root"],[3,null,0.7381,null,null,"root"],[4,null,0.5664,null,null,"root"],[5,0.6663,0.6976,0.633,0.6997,""],[6,0.6663,0.6919,0.633,0.6976,""],[7,0.534,0.7249,0.5073,0.5582,""],[8,0.7381,0.7574,0.7137,0.775,""],[9,0.534,0.654,0.5164,0.5608,""],[10,0.7381,0.7137,0.7012,0.775,""],[11,0.7381,0.7706,0.7137,0.775,""],[12,0.7574,0.7629,0.7323,0.7952,""],[13,0.7137,0.6261,0.6901,0.7494,"n"],[14,0.7574,0.7776,0.7195,0.7952,""],[15,0.7249,0.8144,0.6886,0.7611,"p"],[16,0.7249,0.8007,0.6886,0.7611,"p"],[17,0.654,0.7198,0.6213,0.6867,"p"],[18,0.8144,0.7962,0.7737,0.8551,""],[19,0.5664,0.773,0.5381,0.5947,"p"],[20,0.7776,0.8069,0.7387,0.8165,""],[21,0.8007,0.8098,0.7606,0.8407,""],[22,0.773,0.7888,0.7343,0.8116,""],[23,0.773,0.7991,0.7343,0.8116,""],[24,0.773,0.7943,0.7343,0.8116,""],[25,0.773,0.8013,0.7343,0.8116,""],[26,0.6976,0.8047,0.6628,0.7325,"p"],[27,0.8144,0.8257,0.7737,0.8551,""],[28,0.8144,0.8247,0.7737,0.8551,""],[29,0.8144,0.7673,0.7737,0.8551,"n"],[30,0.8144,0.7537,0.7737,0.8551,"n"],[31,0.8247,0.8247,0.7835,0.866,""],[32,0.8247,0.8247,0.7835,0.866,""],[33,0.8098,0.817,0.7693,0.8503,""],[34,null,0.8024,null,null,"root"],[35,0.8047,0.7877,0.7645,0.845,""],[36,0.8047,0.7985,0.7645,0.845,""],[37,0.7877,0.7934,0.7487,0.824,""],[38,0.8247,0.8254,0.7835,0.8632,""],[39,0.8247,0.8246,0.7853,0.8612,""],[40,0.817,0.8001,0.7762,0.8537,""],[41,0.8254,0.8221,0.7946,0.8611,""],[42,0.8257,0.8221,0.8004,0.8608,""],[43,0.8257,0.8279,0.8041,0.8603,""],[44,0.8257,0.782,0.8045,0.858,"n"],[45,0.8257,0.8287,0.7994,0.8574,""],[46,0.8257,0.8257,0.8033,0.8571,""],[47,0.8279,0.8277,0.8026,0.8593,""],[48,0.8279,0.8287,0.8065,0.859,""],[49,0.8287,0.8271,0.8079,0.859,""],[50,0.8287,0.8315,0.8084,0.8593,""]],
    // the nine committed Notes, ledger values as printed in the paper
    notes: [
      { id: "N1", it: 13, d: "−12.3%", th: "±3.3%", vb: "81.3%", t: "Don't swap the L2 roughness post-filter for an unguarded L1 dead-zone + knot refit",
        l: "The swap lost accuracy and smoothness at once; the permissive knot set added slope changes instead of removing them.", e: "task_013 0.6261 vs parent task_010 0.7137 · slope changes 14.8 → 33.8", tz: "不要把 L2 粗糙度后置滤波换成无保护的 L1 死区 + 节点重拟合", lz: "这次替换同时损失了精度和平滑度；过于宽松的节点集非但没有消除斜率变化，反而增加了它们。" },
      { id: "P1", it: 15, d: "+12.4%", th: "±5.0%", vb: "104.7%", t: "Suppress reversals by post-hoc persistence pruning, not by narrowing bandwidth",
        l: "Smoothness and accuracy trade off only when bandwidth is the sole knob. Persistence pruning plus a monotone PAVA projection after the smoother cut reversals further, without the lag cost.", e: "task_015 0.8144 vs parent task_007 0.7249 · slope changes 18.0 → 5.4", tz: "用事后的持续性剪枝抑制反转，而不是收窄带宽", lz: "只有当带宽是唯一的调节参数时，平滑度与精度才此消彼长。在平滑器之后加上持续性剪枝和单调 PAVA 投影，能进一步减少反转，而且没有滞后代价。" },
      { id: "P2", it: 16, d: "+10.5%", th: "±5.0%", vb: "98.3%", t: "Cut slope changes with a shape-domain post-stage, not a narrower band",
        l: "Reversals dominate fitness. After Whittaker smoothing, 4σ persistence pruning and PAVA cut them at near-zero correlation cost — unlike spectral narrowing.", e: "task_016 0.8007 vs parent task_007 0.7249 · slope changes 18.0 → 7.8", tz: "用形状域的后处理阶段削减斜率变化，而不是更窄的频带", lz: "反转主导着适应度。在 Whittaker 平滑之后，4σ 持续性剪枝与 PAVA 几乎不损失相关性就能削减反转，这是频谱收窄做不到的。" },
      { id: "P3", it: 17, d: "+10.1%", th: "±5.0%", vb: "88.4%", t: "Select the L1 trend-filter λ by a surrogate sweep",
        l: "A 12-rung geometric λ ladder scored by an internal surrogate replaced a fixed discrepancy-principle λ; the idea was adapted from inspiration task_014.", e: "task_017 0.7198 vs parent task_009 0.6540 · slope changes 20.0 → 10.6", tz: "通过代理指标扫描来选择 L1 趋势滤波的 λ", lz: "用内部代理指标为 12 级几何 λ 阶梯打分，取代了按偏差原则固定的 λ；这个想法改编自灵感 task_014。" },
      { id: "P4", it: 19, d: "+36.5%", th: "±5.0%", vb: "94.9%", t: "Select the reversal-pruning level by a surrogate objective",
        l: "Enumerate the full pruning path once and select with exact slope counts, a Cp risk and an accuracy floor — do not hand-tune a significance constant.", e: "task_019 0.7730 vs parent task_004 0.5664 · slope changes 24.4 → 13.8", tz: "通过代理目标选择反转剪枝的强度", lz: "一次性枚举完整的剪枝路径，再用精确的斜率计数、Cp 风险和精度下限来挑选，不要手工调节显著性常数。" },
      { id: "P5", it: 26, d: "+15.3%", th: "±5.0%", vb: "98.8%", t: "Jointly sweep bandwidth and pruning with a Cp surrogate",
        l: "Freeing the smoothing corner as a second knob alongside the pruning level improved every axis at once; the Cp accuracy term prevented over-pruning.", e: "task_026 0.8047 vs parent task_005 0.6976 · false reversals 19 → 7.4", tz: "用 Cp 代理指标联合扫描带宽与剪枝", lz: "把平滑拐点作为与剪枝强度并列的第二个调节参数放开后，各项指标同时提升；Cp 精度项防止了过度剪枝。" },
      { id: "N2", it: 29, d: "−5.8%", th: "±5.0%", vb: "93.0%", t: "Gate L0 changepoint branches on reversal count, not just a 1.30× Cp-risk bar",
        l: "A many-segment fit won on accuracy while tripling reversals — and smoothness dominates this objective.", e: "task_029 0.7673 vs parent task_015 0.8144 · slope changes 5.4 → 15.0", tz: "把关 L0 变点分支时要看反转次数，而不只是 1.30× 的 Cp 风险线", lz: "一个多段拟合在精度上胜出，却让反转次数翻了三倍，而这个目标恰恰由平滑度主导。" },
      { id: "N3", it: 30, d: "−7.5%", th: "±5.0%", vb: "91.4%", t: "Guard the cross-branch surrogate against reversal inflation",
        l: "A changepoint branch raised correlation 0.817 → 0.943 but quadrupled slope changes; the surrogate under-weighted the reversal terms.", e: "child 0.754 vs parent 0.814 · false reversals 3.2 → 19.2", tz: "防止跨分支代理指标被反转次数的膨胀蒙蔽", lz: "一个变点分支把相关性从 0.817 提到 0.943，斜率变化却翻了两番；代理指标低估了反转项的权重。" },
      { id: "N4", it: 44, d: "−5.3%", th: "±2.6%", vb: "94.5%", t: "Validate a replacement selection criterion against realised correlation and noise reduction",
        l: "A five-term plug-in criterion picked over-smoothed shapes: reversals halved while correlation and noise reduction both fell.", e: "task_044 0.7820 vs parent task_027 0.8257 · correlation 0.821 → 0.744", tz: "用实际的相关性和降噪效果来验证替换后的选择准则", lz: "一个五项 plug-in 准则选出了过度平滑的形状：反转次数减半，相关性和降噪效果却双双下降。" },
    ],
  };
  const ROOT_COL = ["#4fd1e8", "#e0a24a", "#2ed3a0", "#6f8cff", "#b49cff"];

  function notes() {
    const root = $("#case-notes");
    if (!root) return;
    const svg = $("#nt-svg", root);
    const W = 820, m = { l: 52, r: 12, t: 22, b: 40 };
    let V = null; // current drawing (rebuilt when the fitted height changes)

    function build(H) {
      const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
      const xs = (i) => x0 + ((i - 0.5) / 50) * (x1 - x0), step = (x1 - x0) / 50;
      const ys = (v) => y0 - ((v - 0.49) / (0.875 - 0.49)) * (y0 - y1);
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = "";
      const defs = S("defs", {}, svg);
      defs.innerHTML = `<clipPath id="nt-clip"><rect id="nt-clip-r" x="${x0}" y="0" width="0" height="${H}"/></clipPath>
        <linearGradient id="nt-scan" x1="0" x2="1"><stop offset="0" stop-color="#4fd1e8" stop-opacity="0"/><stop offset="1" stop-color="#4fd1e8" stop-opacity="0.16"/></linearGradient>`;
      // warm-up zone + grid
      const wu = S("g", { class: "nt-warm" }, svg);
      S("rect", { x: x0, y: y1, width: xs(10.5) - x0, height: y0 - y1, fill: "rgba(255,255,255,0.025)" }, wu);
      S("line", { x1: xs(10.5), x2: xs(10.5), y1, y2: y0, stroke: "rgba(255,255,255,0.18)", "stroke-dasharray": "3 4" }, wu);
      txt(S("text", { x: x0 + 10, y: y0 - 12, class: "cs-lab" }, wu), L("warm-up · no requests fire", "预热期 · 不会触发请求"));
      const ax = S("g", { class: "cs-ax" }, svg);
      [0.55, 0.65, 0.75, 0.85].forEach((v) => { S("line", { x1: x0, x2: x1, y1: ys(v), y2: ys(v) }, ax); txt(S("text", { x: x0 - 10, y: ys(v) + 4, "text-anchor": "end" }, ax), v.toFixed(2)); });
      [1, 10, 20, 30, 40, 50].forEach((i) => txt(S("text", { x: xs(i), y: y0 + 20, "text-anchor": "middle" }, ax), i));
      S("line", { x1: x0, x2: x1, y1: y0, y2: y0, class: "base" }, ax);
      txt(S("text", { x: x1, y: y0 + 38, "text-anchor": "end", class: "cs-lab" }, svg), L("evolution iteration →", "进化迭代 →"));
      txt(S("text", { x: x0 - 44, y: y1 - 6, class: "cs-lab" }, svg), L("fitness ↑", "适应度 ↑"));
      // scan head
      const scan = S("g", { class: "cs-scan" }, svg);
      const scanR = S("rect", { x: x0, y: y1, width: 60, height: y0 - y1, fill: "url(#nt-scan)" }, scan);
      const scanL = S("line", { x1: x0, x2: x0, y1, y2: y0, stroke: "#4fd1e8", "stroke-width": 1.2, opacity: 0.7 }, scan);
      // iterations
      const its = NT.rows.map(([i, p, c, lo, hi, k]) => {
        const g = S("g", { class: `nt-it k-${k || "in"}` }, svg);
        const x = xs(i), o = { i, p, c, lo, hi, k, g, x };
        if (k === "root") {
          const col = ROOT_COL[i === 34 ? 4 : i - 1];
          S("circle", { cx: x, cy: ys(c), r: 5.5, fill: "#071017", stroke: col, "stroke-width": 2.4, class: "cs-pop" }, g);
        } else {
          S("rect", { x: x - step * 0.34, y: ys(hi), width: step * 0.68, height: ys(lo) - ys(hi), rx: 2, class: "nt-band", style: `transform-origin:${x}px ${ys(p)}px` }, g);
          const len = Math.max(0.01, Math.abs(ys(c) - ys(p)));
          S("line", { x1: x, x2: x, y1: ys(p), y2: ys(c), class: "nt-seg", style: `--len:${len}` }, g);
          S("line", { x1: x - 5, x2: x + 5, y1: ys(p), y2: ys(p), class: "nt-cap" }, g);
          S("circle", { cx: x, cy: ys(c), r: k ? 5 : 3.4, class: "nt-dot cs-pop" }, g);
          if (k) {
            const n = NT.notes.find((q) => q.it === i); o.note = n;
            const off = { P1: 44, P2: 18, N3: 44, N2: 18 }[n.id] || 22;
            const up = k === "p", ly = up ? Math.min(ys(c), ys(p)) - off : Math.max(ys(c), ys(p)) + off;
            const chip = S("g", { class: "nt-chip", style: `transform-origin:${x}px ${ly}px` }, g);
            S("line", { x1: x, x2: x, y1: up ? ly + 9 : ly - 9, y2: ys(c) + (up ? -6 : 6), class: "nt-lead" }, chip);
            S("rect", { x: x - 14, y: ly - 10, width: 28, height: 20, rx: 6, class: "nt-pill" }, chip);
            txt(S("text", { x, y: ly + 4.5, "text-anchor": "middle", class: "nt-pill-t" }, chip), n.id);
            S("circle", { cx: x, cy: ys(c), r: 6, class: "nt-ring" }, g);
          }
        }
        const hit = S("rect", { x: x - step / 2, y: y1, width: step, height: y0 - y1, fill: "transparent" }, g);
        hit.addEventListener("pointerenter", () => { if (o.k !== "root" && P.it >= i - 0.25) { gate(o, true); o.g.classList.add("hl"); } });
        hit.addEventListener("pointerleave", () => { gate(null, false); o.g.classList.remove("hl"); });
        return o;
      });
      // running best (dashed, revealed by the replay head)
      let best = -1, d = "";
      its.forEach((o, j) => { const v = Math.max(best, o.c); const y = ys(v).toFixed(1); d += j ? ` H ${xs(o.i - 0.5).toFixed(1)} V ${y}` : `M ${xs(0.5)} ${y}`; best = v; });
      d += ` H ${xs(50.5)}`;
      S("path", { d, class: "nt-best", "clip-path": "url(#nt-clip)" }, svg);
      V = { xs, x0, its, clipR: $("#nt-clip-r", svg), scan, scanL, scanR };
    }

    // ---- side panel: both cards keep one fixed size; only their content changes
    const gEl = $(".nt-gate", root), card = $(".nt-card", root), led = $(".nt-ledger", root);
    gEl.innerHTML = `<div class="g-h mono">${L("THE WRITE GATE", "写入门槛")} <span class="g-it"></span></div>
      <div class="g-stack">
        <p class="g-view g-idle on">${L("Each attempt is judged against a band around its parent's fitness. Only a child that lands <em>outside</em> the band asks for a Note.", "每次尝试都以父代适应度周围的区间为基准来评判。只有落在区间<em>之外</em>的子代，才会请求写入 Note。")}</p>
        <div class="g-view g-data">
          <div class="g-row"><span>${L("parent → child", "父代 → 子代")}</span><b class="mono g-pc"></b></div>
          <div class="g-row"><span>${L("change", "变化")}</span><b class="mono g-d"></b></div>
          <div class="g-row"><span>${L("band", "区间")}</span><b class="mono g-b"></b></div>
          <div class="g-meter"><i class="g-band"></i><i class="g-zero"></i><i class="g-mark"></i></div>
          <span class="v g-v"></span>
        </div>
      </div>`;
    const G = { it: $(".g-it", gEl), idle: $(".g-idle", gEl), data: $(".g-data", gEl), pc: $(".g-pc", gEl), d: $(".g-d", gEl), b: $(".g-b", gEl), band: $(".g-band", gEl), mark: $(".g-mark", gEl), v: $(".g-v", gEl) };
    // evidence lines keep their numbers; only the words are swapped
    const ez = (e) => L(e, e.replace(/ vs parent /g, " vs 父代 ").replace(/^child /, "子代 ").replace(" vs parent", " vs 父代").replace("slope changes", "斜率变化").replace("false reversals", "虚假反转").replace("correlation", "相关性"));
    const kind = (n) => (n.id[0] === "P" ? L("positive", "正向") : L("negative", "负向"));
    const itl = (i) => L(`iteration ${i}`, `迭代 ${i}`);
    card.innerHTML = `<div class="nc nc-empty on"><div class="nc-k mono">${L("NOTES POOL · EMPTY", "NOTES 池 · 空")}</div><p>${L("No Note yet. Small changes are absorbed by the band; the pool only grows when an outcome is surprising enough to teach something.", "还没有 Note。小幅变化会被区间吸收；只有足够出人意料、值得记取的结果，才会让池子增长。")}</p></div>` +
      NT.notes.map((n) => `<div class="nc ${n.id[0] === "P" ? "pos" : "neg"}" data-id="${n.id}"><div class="nc-k mono"><b>${n.id}</b>${kind(n)} Note · ${itl(n.it)}<span>${n.d}</span></div>
        <h4>${L(n.t, n.tz)}</h4><p>${L(n.l, n.lz)}</p><div class="nc-e mono">${ez(n.e)}</div></div>`).join("");
    const cards = $$(".nc", card);
    led.innerHTML = NT.notes.map((n) => `<button class="lg-cell ${n.id[0] === "P" ? "pos" : "neg"}" data-it="${n.it}"><b>${n.id}</b><span class="mono">${itl(n.it)}</span><strong>${n.d}</strong><span class="mono">${L("threshold", "阈值")} ${n.th}</span><span class="mono">${L("vs. best", "相对最优")} ${n.vb}</span></button>`).join("");
    const cells = $$(".lg-cell", led);
    const itOf = (i) => V.its.find((q) => q.i === i);
    cells.forEach((c) => {
      const i = +c.dataset.it;
      c.addEventListener("click", () => P.seek(i + 0.2));
      c.addEventListener("pointerenter", () => { itOf(i).g.classList.add("hl"); if (P.it >= i - 0.25) gate(itOf(i), true); });
      c.addEventListener("pointerleave", () => { itOf(i).g.classList.remove("hl"); gate(null, false); });
    });
    let gateCur = null, gatePin = null, gateAuto = "idle", cardCur = null;
    function gate(o, pin) {
      if (pin === true) gatePin = o; else if (pin === false) gatePin = null; else if (o) gateAuto = o;
      const show = gatePin || gateAuto;
      if (!show || show === gateCur) return;
      gateCur = show;
      const idle = show === "idle" || show.k === "root";
      G.idle.classList.toggle("on", idle); G.data.classList.toggle("on", !idle);
      G.it.textContent = idle ? "" : itl(show.i);
      if (idle) return;
      const { i, p, c, lo, hi, k } = show;
      const dlt = c / p - 1, tm = 1 - lo / p, tp = hi / p - 1;
      G.pc.textContent = `${p.toFixed(4)} → ${c.toFixed(4)}`;
      G.d.textContent = pct(dlt); G.d.className = `mono g-d ${k === "p" ? "c-gov" : k === "n" ? "c-neg" : ""}`;
      G.b.textContent = `−${(tm * 100).toFixed(1)}% / +${(tp * 100).toFixed(1)}%`;
      G.band.style.left = `${50 - tm * 250}%`; G.band.style.width = `${(tm + tp) * 250}%`;
      G.mark.className = `g-mark ${k}`; G.mark.style.left = `${clamp(50 + dlt * 250, 2, 98)}%`;
      const warm = i <= 10;
      G.v.className = `v g-v ${warm ? "warm" : k === "p" ? "pos" : k === "n" ? "neg" : "in"}`;
      G.v.textContent = warm ? L("warm-up · gate closed", "预热期 · 门槛关闭") : k ? L(`outside → ${show.note.id} written`, `区间外 → 写入 ${show.note.id}`) : L("inside band · no Note", "区间内 · 不写 Note");
    }
    function showCard(n) {
      const id = n ? n.id : "";
      if (id === cardCur) return;
      cardCur = id;
      cards.forEach((c) => c.classList.toggle("on", (c.dataset.id || "") === id));
      card.className = `nt-card ${n ? (n.id[0] === "P" ? "pos" : "neg") : "empty"}`;
    }
    const ctr = $(".cs-it", root), cnt = $(".nt-count", root);
    let lastCur = -1;
    const render = (it) => {
      const hx = V.xs(clamp(it + 0.5, 0.5, 50.5));
      V.clipR.setAttribute("width", Math.max(0, hx - V.x0));
      V.scanL.setAttribute("x1", hx); V.scanL.setAttribute("x2", hx); V.scanR.setAttribute("x", hx - 60);
      V.scan.style.opacity = it > 0.05 && it < 50.6 ? 1 : 0;
      for (const o of V.its) {
        const g = o.g.classList;
        g.toggle("b", it >= o.i - 0.8);
        g.toggle("s", it >= o.i - 0.6);
        g.toggle("d", it >= o.i - 0.25);
        if (o.k === "p" || o.k === "n") g.toggle("w", it >= o.i - 0.15);
      }
      const cur = Math.floor(it + 0.25);
      if (cur !== lastCur) {
        lastCur = cur;
        txt(ctr, `${String(clamp(cur, 0, 50)).padStart(2, "0")} / 50`);
        const o = V.its.find((q) => q.i === cur && q.k !== "root");
        if (o) gate(o); else if (cur < 5) gate("idle");
        const done = NT.notes.filter((n) => it >= n.it - 0.15);
        showCard(done[done.length - 1]);
        cells.forEach((c) => c.classList.toggle("on", it >= +c.dataset.it - 0.15));
        const np = done.filter((n) => n.id[0] === "P").length, nn = done.filter((n) => n.id[0] === "N").length;
        cnt.textContent = L(`${np} positive · ${nn} negative`, `${np} 条正向 · ${nn} 条负向`);
      }
    };
    build(420);
    const P = player(root, { end: 50.6, rate: 2.7, holds: NT.notes.map((n) => hold(n.it - 0.1, 1100)).concat([hold(10.6, 700)]).sort((a, b) => a - b), render, xOf: (it) => V.xs(clamp(it + 0.5, 0.5, 50.5)) });
    fitter(root, 420, (H) => { build(H); gateCur = null; lastCur = -1; P.redraw(); });
    onVisible(root, () => P.autostart(), 0.35);
    return P;
  }

  // ================================================================ 2. Meta-guidance: three rounds that break two stalls
  const MG = {
    attempts: [[1,0.770918],[2,0.728627],[3,0.88097],[4,0.927669],[5,0.278886],[6,0.88097],[7,0.873865],[8,0.88097],[9,0.933947],[10,0.993065],[11,0.932291],[12,0.991838],[13,0.88097],[14,0.993065],[15,0.933947],[16,0.993065],[17,0.993065],[18,0.991838],[19,0.990001],[22,0.994819],[27,0.993065],[28,0.993065],[29,0.993726],[30,0.993065],[31,0.990981],[34,0.996266],[39,0.990001],[40,0.997502]],
    rounds: [
      { n: 1, at: 19.5, x: [19.5, 26.5], col: "#2ed3a0", why: "requested after 11 stalled outcomes", whyz: "在 11 次停滞结果后请求", open: "0.9931",
        ds: [
          { id: "D1", t: "Constrained dual program", l: "Drop the smooth surrogate and attack the hard program itself with an active-set SQP solver.", u: [[20, 0.9452], [21, 0.99944]], out: "new best · +0.0064", s: "win", tz: "约束对偶规划", lz: "放弃平滑代理，直接用有效集 SQP 求解器攻克原始的硬规划问题。", oz: "新最优 · +0.0064" },
          { id: "D2", t: "Exact algebraic construction", l: "Build the 14 points from coordinates reported for the Tammes problem.", u: [[23, 0.8803], [24, 0.9331]], out: "retired", s: "ret", tz: "精确代数构造", lz: "用 Tammes 问题已公布的坐标构造这 14 个点。", oz: "已淘汰" },
          { id: "D3", t: "Spherical-code portfolio", l: "Seed from published spherical-code tables, polish each, keep the best.", u: [[25, 0.9913], [26, 0.9332]], out: "retired", s: "ret", tz: "球面码组合", lz: "以已发表的球面码表为种子，逐一精修，保留最优。", oz: "已淘汰" },
        ], foot: "D1's artifact becomes the anchor parent of both later rounds.", footz: "D1 的产物成为后两轮的锚定父代。" },
      { n: 2, at: 31.5, x: [31.5, 38.5], col: "#e0a24a", why: "requested after 20 stalled outcomes", whyz: "在 20 次停滞结果后请求", open: "0.99944",
        ds: [
          { id: "D4", t: "Hybrid global-local polish", l: "Feed the SLSQP artifact back through the surrogate, Nelder-Mead and basin hops.", u: [[32, 0.99944], [33, 0.99944]], out: "returns the anchor", s: "same", tz: "全局-局部混合精修", lz: "把 SLSQP 产物送回代理模型、Nelder‑Mead 和盆地跳跃中再处理。", oz: "回到锚点" },
          { id: "D5", t: "CMA-ES black box", l: "Derivative-free CMA-ES seeded at the anchored best, to cross basins.", u: [[35, 0.99944], [36, 0.99944]], out: "returns the anchor", s: "same", tz: "CMA-ES 黑盒", lz: "以锚定的最优解为种子，运行无导数的 CMA‑ES，尝试跨越盆地。", oz: "回到锚点" },
          { id: "D6", t: "Structured multi-start", l: "SLSQP from 40+ seeds drawn from named symmetry families.", u: [[37, 0.9908], [38, 0.9412]], out: "retired", s: "ret", tz: "结构化多起点", lz: "从若干已知对称族中抽取 40 多个种子，分别运行 SLSQP。", oz: "已淘汰" },
        ], foot: "Two independent families land on the same point to the last digit — the basin looks exhausted.", footz: "两个彼此独立的方法族收敛到同一个点，连最后一位都相同：这个盆地看来已经挖尽了。" },
      { n: 3, at: 40.5, x: [40.5, 46.5], col: "#b49cff", why: "round-2 record carried as failure history", whyz: "第 2 轮的记录作为失败历史带入", open: "0.99944",
        ds: [
          { id: "D7", t: "Dual-anchor ring construction", l: "Closed form: two poles and two staggered rings of six, one root-find.", u: [[42, 0.99944], [44, 0.99944]], out: "same optimum, 3rd family", s: "same", tz: "双锚环构造", lz: "闭式解：两个极点加两圈错开的六点环，只需一次求根。", oz: "同一最优，第 3 个方法族" },
          { id: "D8", t: "Interior-point solver", l: "Keep D1's program, swap the active-set solver for a primal-dual interior-point method.", u: [[41, 1.000013], [43, 1.000013]], out: "crosses f = 1", s: "win", tz: "内点法求解器", lz: "保留 D1 的规划，把有效集求解器换成原始-对偶内点法。", oz: "越过 f = 1" },
          { id: "D9", t: "Perturbation portfolio", l: "Re-run SLSQP from twelve structured perturbations of the anchor.", u: [[45, 1.0000159], [46, 0.99944]], out: "final best", s: "win", tz: "扰动组合", lz: "从锚点的 12 个结构化扰动出发，重新运行 SLSQP。", oz: "最终最优" },
        ], foot: "Both escapes cross the reference; all three new bests after ramp-up come from guided tasks.", footz: "两次突围都越过了参考值；预热期之后的三次新最优全部来自受指导的任务。" },
    ],
  };
  function meta() {
    const root = $("#case-mg");
    if (!root) return;
    const svg = $("#mg-svg", root);
    const W = 820, m = { l: 58, r: 12, t: 40, b: 40 };
    const pts = [...MG.attempts.map(([i, v]) => ({ i, v, k: 0 })), ...MG.rounds.flatMap((r) => r.ds.flatMap((dd) => dd.u.map(([i, v]) => ({ i, v, k: r.n, d: dd.id }))))].sort((a, b) => a.i - b.i);
    let V = null;

    function build(H) {
      const x0 = m.l, x1 = W - m.r, y0 = H - m.b, YT = m.t + 18, YB = y0 - 90, YL = YB + 18;
      const xs = (i) => x0 + ((i - 0.4) / 50.3) * (x1 - x0);
      // axis expanded above 0.99, compressed below (as in the paper)
      const ys = (v) => v >= 0.99 ? YB - ((v - 0.99) / 0.0112) * (YB - YT) : v >= 0.6 ? YL + ((0.99 - v) / 0.39) * 34 : YL + 34 + ((0.6 - v) / 0.35) * (y0 - YL - 38);
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = "";
      const defs = S("defs", {}, svg);
      defs.innerHTML = `<clipPath id="mg-clip"><rect id="mg-clip-r" x="${x0}" y="0" width="0" height="${H}"/></clipPath>
        <filter id="mg-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="mg-scan" x1="0" x2="1"><stop offset="0" stop-color="#bff4ff" stop-opacity="0"/><stop offset="1" stop-color="#bff4ff" stop-opacity="0.13"/></linearGradient>`;
      // rounds (behind everything)
      const rG = MG.rounds.map((r) => {
        const g = S("g", { class: "mg-round" }, svg);
        const bx = xs(r.x[0]), bw = xs(r.x[1]) - bx;
        S("rect", { x: bx, y: m.t - 18, width: bw, height: y0 - m.t + 18, fill: r.col, class: "mg-rband", style: `transform-origin:${bx}px 0px` }, g);
        S("line", { x1: bx, x2: bx, y1: m.t - 18, y2: y0, stroke: r.col, "stroke-opacity": 0.5, "stroke-dasharray": "2 4" }, g);
        const chip = S("g", { class: "mg-rchip" }, g);
        S("rect", { x: bx + bw / 2 - 38, y: m.t - 30, width: 76, height: 22, rx: 7, fill: r.col }, chip);
        txt(S("text", { x: bx + bw / 2, y: m.t - 14.5, "text-anchor": "middle", class: "mg-rchip-t" }, chip), L(`round ${r.n}`, `第 ${r.n} 轮`));
        S("circle", { cx: bx, cy: m.t - 18, r: 6, fill: "none", stroke: r.col, class: "mg-ping" }, g);
        return { r, g };
      });
      // axes
      const ax = S("g", { class: "cs-ax" }, svg);
      [[0.99, "0.99"], [0.995, "0.995"], [1, "1"]].forEach(([v, l]) => { S("line", { x1: x0, x2: x1, y1: ys(v), y2: ys(v) }, ax); txt(S("text", { x: x0 - 10, y: ys(v) + 4, "text-anchor": "end" }, ax), l); });
      [[0.6, "0.6"], [0.3, "0.3"]].forEach(([v, l]) => { S("line", { x1: x0, x2: x1, y1: ys(v), y2: ys(v), "stroke-dasharray": "2 5" }, ax); txt(S("text", { x: x0 - 10, y: ys(v) + 4, "text-anchor": "end" }, ax), l); });
      [1, 10, 20, 30, 40, 50].forEach((i) => txt(S("text", { x: xs(i), y: y0 + 20, "text-anchor": "middle" }, ax), i));
      S("line", { x1: x0, x2: x1, y1: y0, y2: y0, class: "base" }, ax);
      // axis break (double slash) between the expanded and compressed ranges
      S("path", { d: `M ${x0 - 8} ${YB + 9} l 16 -6 M ${x0 - 8} ${YB + 15} l 16 -6`, stroke: "#8ea3a0", "stroke-width": 1.4 }, ax);
      txt(S("text", { x: x1, y: y0 + 38, "text-anchor": "end", class: "cs-lab" }, svg), L("iteration →", "迭代 →"));
      txt(S("text", { x: x0 - 52, y: m.t - 16, class: "cs-lab" }, svg), L("fitness (expanded above 0.99)", "适应度（0.99 以上放大显示）"));
      // f = 1 reference
      S("line", { x1: x0, x2: x1, y1: ys(1), y2: ys(1), class: "mg-ref" }, svg);
      txt(S("text", { x: x0 + 10, y: ys(1) - 8, class: "mg-ref-t" }, svg), L("f = 1 · AlphaEvolve reference", "f = 1 · AlphaEvolve 参考值"));
      // stall brackets
      const bracket = (from, to, y, up) => {
        const g = S("g", { class: "mg-stall" }, svg);
        const ln = S("path", { d: "", class: "mg-br" }, g);
        const t = S("text", { x: 0, y: y + (up ? -8 : 17), "text-anchor": "middle", class: "mg-br-t" }, g);
        return { from, to, y, g, ln, t };
      };
      const st = [bracket(10, 20, ys(0.9931) - 22, true), bracket(21, 40, ys(0.99944) + 22, false)];
      // scan head
      const scan = S("g", { class: "cs-scan" }, svg);
      const scanR = S("rect", { x: x0, y: m.t - 18, width: 60, height: y0 - m.t + 18, fill: "url(#mg-scan)" }, scan);
      const scanL = S("line", { x1: x0, x2: x0, y1: m.t - 18, y2: y0, stroke: "#bff4ff", "stroke-width": 1.2, opacity: 0.6 }, scan);
      // running best
      let best = -1, d = "";
      pts.forEach((p, j) => { const v = Math.max(best, p.v); const y = ys(v).toFixed(1); d += j ? ` H ${xs(p.i).toFixed(1)} V ${y}` : `M ${xs(p.i).toFixed(1)} ${y}`; p.nb = v > best && j > 0 && p.k > 0; best = v; });
      d += ` H ${xs(50.6)}`;
      S("path", { d, class: "mg-best-glow", "clip-path": "url(#mg-clip)" }, svg);
      S("path", { d, class: "mg-best", "clip-path": "url(#mg-clip)" }, svg);
      // outcomes
      const dots = pts.map((p) => {
        const g = S("g", { class: "mg-pt" }, svg);
        const x = xs(p.i), y = ys(p.v);
        if (p.nb) {
          S("circle", { cx: x, cy: y, r: 9, class: "mg-burst", stroke: MG.rounds[p.k - 1].col }, g);
          const dia = (r) => `M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z`;
          S("path", { d: dia(10), fill: "#0a1a17", stroke: MG.rounds[p.k - 1].col, "stroke-width": 2.6, "stroke-linejoin": "round", class: "cs-pop", filter: "url(#mg-glow)" }, g);
          S("path", { d: dia(4.6), fill: MG.rounds[p.k - 1].col, class: "cs-pop" }, g);
        } else if (p.k) S("circle", { cx: x, cy: y, r: 4.6, fill: MG.rounds[p.k - 1].col, class: "cs-pop" }, g);
        else S("circle", { cx: x, cy: y, r: 3.6, fill: "#071017", stroke: "#8a9c9a", "stroke-width": 1.6, class: "cs-pop" }, g);
        const hit = S("circle", { cx: x, cy: y, r: 10, fill: "transparent" }, g);
        const val = p.v >= 0.99 ? p.v.toFixed(p.v > 1 ? 6 : 5) : p.k ? p.v.toFixed(4) : "< 0.99";
        hit.addEventListener("pointermove", (e) => { const tip = $("#tip"); tip.innerHTML = `<div class="th">${L("iteration", "迭代")} ${p.i}${p.k ? ` · ${p.d} · ${L(`round ${p.k}`, `第 ${p.k} 轮`)}` : L(" · unguided", " · 无指导")}</div><div class="tr"><span>${L("fitness", "适应度")}</span><b>${val}</b></div>`; tip.classList.add("on"); tip.style.left = `${e.clientX + 14 > innerWidth - 200 ? e.clientX - 200 : e.clientX}px`; tip.style.top = `${e.clientY}px`; });
        hit.addEventListener("pointerleave", () => $("#tip").classList.remove("on"));
        return { i: p.i, g };
      });
      // annotations on the three guided new bests
      const ann = [
        [21, L("D1 · SLSQP breaks the stall (+0.0064)", "D1 · SLSQP 打破停滞 (+0.0064)"), "#2ed3a0", (x) => x - 14, (y) => y + 36, "end"],
        [41, L("D8 · interior point crosses f = 1", "D8 · 内点法越过 f = 1"), "#c9b8ff", (x) => x - 12, (y) => y - 24, "end"],
        [45, L("D9 · final best", "D9 · 最终最优"), "#c9b8ff", () => x1 - 2, (y) => y + 40, "end"],
      ].map(([i, s, c, fx, fy, anchor]) => {
        const g = S("g", { class: "mg-ann" }, svg);
        const p = pts.find((q) => q.i === i), x = xs(i), y = ys(p.v);
        const tx = fx(x), ty = fy(y), below = ty > y;
        S("path", { d: `M ${x} ${y + (below ? 10 : -10)} L ${Math.min(x, tx + 4)} ${ty + (below ? -13 : 5)}`, stroke: c, "stroke-width": 1, opacity: 0.7 }, g);
        txt(S("text", { x: tx, y: ty, fill: c, "text-anchor": anchor, class: "mg-ann-t" }, g), s);
        return { i, g };
      });
      V = { xs, x0, rG, st, scan, scanL, scanR, dots, ann, clipR: $("#mg-clip-r", svg) };
    }

    // ---- side panel: all four panes are laid out in one cell, so the panel never changes height
    const side = $(".mg-side", root), ctr = $(".cs-it", root), bestEl = $(".mg-bestv", root);
    side.innerHTML = `<div class="mg-pane" data-ph="0"><div class="mg-ph mono">${L("STALL DETECTOR", "停滞检测器")}</div><h4>${L("Watching the running best.", "盯住当前最优。")}</h4>
        <p class="mg-p">${L("A guidance request fires when consecutive windows show no improvement and the newest outcome is not a new best. One request may be pending at a time.", "当连续多个窗口都没有改进、且最新结果也不是新最优时，就会发出 guidance 请求。同一时间最多只有一个待处理的请求。")}</p>
        <div class="mg-stallbox"><span class="mono">${L("stalled outcomes", "停滞结果")}</span><b class="mg-stalln mono">0</b></div></div>` +
      MG.rounds.map((r) => `<div class="mg-pane" data-ph="${r.n}"><div class="mg-ph mono" style="--c:${r.col}"><i></i>${L(`ROUND ${r.n}`, `第 ${r.n} 轮`)} · META-GUIDANCE</div>
        <div class="mg-why">${L(`${r.why} · best <b class="mono">${r.open}</b> when it opened`, `${r.whyz} · 开启时最优为 <b class="mono">${r.open}</b>`)}</div>
        <div class="mg-deck">${r.ds.map((dd, j) => `<div class="dcard s-${dd.s}" style="--c:${r.col};animation-delay:${j * 120}ms" data-id="${dd.id}">
          <div class="dc-h"><b class="mono">${dd.id}</b><span>${L(dd.t, dd.tz)}</span></div><p>${L(dd.l, dd.lz)}</p>
          <div class="dc-u">${dd.u.map(([i, v]) => `<span class="use mono" data-it="${i}"><i></i>${v >= 0.99 ? v.toFixed(v > 1 ? 6 : 5) : v.toFixed(4)}</span>`).join("")}<em class="dc-out mono">${L(dd.out, dd.oz)}</em></div></div>`).join("")}</div>
        <p class="mg-foot">${L(r.foot, r.footz)}</p></div>`).join("");
    const panes = $$(".mg-pane", side), uses = $$(".use", side), dcards = $$(".dcard", side), stallN = $(".mg-stalln", side);
    const bestAt = (it) => { let b = 0; for (const p of pts) if (it >= p.i - 0.25) b = Math.max(b, p.v); return b; };
    let lastCur = -1, phase = -1;
    const render = (it) => {
      const hx = V.xs(clamp(it, 0.4, 50.7)), xs = V.xs;
      V.clipR.setAttribute("width", Math.max(0, hx - V.x0));
      V.scanL.setAttribute("x1", hx); V.scanL.setAttribute("x2", hx); V.scanR.setAttribute("x", hx - 60);
      V.scan.style.opacity = it > 0.05 && it < 50.6 ? 1 : 0;
      for (const p of V.dots) p.g.classList.toggle("on", it >= p.i - 0.25);
      for (const a of V.ann) a.g.classList.toggle("on", it >= a.i);
      for (const { r, g } of V.rG) g.classList.toggle("on", it >= r.at);
      V.st.forEach((s, j) => {
        const on = it >= s.from + (j ? 0.3 : 0);
        s.g.classList.toggle("on", on);
        if (!on) return;
        const xa = xs(s.from), xb = xs(Math.min(it, s.to)), y = s.y, tk = j ? -5 : 5;
        s.ln.setAttribute("d", `M ${xa} ${y + tk} V ${y} H ${xb} V ${y + tk}`);
        const n = clamp(Math.floor(Math.min(it, s.to)) - (j ? 20 : 9), 1, j ? 20 : 11);
        s.t.setAttribute("x", (xa + xb) / 2); s.t.textContent = L(`stalled × ${n}`, `停滞 × ${n}`);
        s.g.classList.toggle("full", it >= s.to);
      });
      const ph = it >= 40.5 ? 3 : it >= 31.5 ? 2 : it >= 19.5 ? 1 : 0;
      if (ph !== phase) { phase = ph; panes.forEach((p) => p.classList.toggle("on", +p.dataset.ph === ph)); }
      const cur = Math.floor(it + 0.25);
      if (cur !== lastCur) {
        lastCur = cur;
        txt(ctr, `${String(clamp(cur, 0, 50)).padStart(2, "0")} / 50`);
        const b = bestAt(it);
        bestEl.textContent = b ? b.toFixed(b > 1 ? 6 : b >= 0.99 ? 5 : 4) : "—";
        bestEl.classList.toggle("over", b > 1);
        stallN.textContent = it >= 10 ? clamp(Math.floor(it) - 9, 1, 11) : 0;
        uses.forEach((u) => u.classList.toggle("on", it >= +u.dataset.it - 0.25));
        dcards.forEach((c) => c.classList.toggle("settled", $$(".use", c).every((u) => u.classList.contains("on"))));
      }
    };
    build(430);
    const P = player(root, { end: 50.6, rate: 2.5, holds: [hold(10.2, 600), hold(19.6, 1900), hold(21.05, 1200), hold(31.6, 1900), hold(40.6, 1900), hold(41.05, 1000), hold(45.05, 1300)], render, xOf: (it) => V.xs(clamp(it, 0.4, 50.7)) });
    fitter(root, 430, (H) => { build(H); lastCur = -1; P.redraw(); });
    onVisible(root, () => P.autostart(), 0.35);
    return P;
  }

  const players = {};
  return { init() { players.notes = notes(); players.meta = meta(); }, players };
})();
