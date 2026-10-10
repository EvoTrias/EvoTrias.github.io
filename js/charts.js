// Native SVG redraws of the paper's figures, styled like the rest of the page. Data: window.PAPER (js/data.js).
const Charts = (() => {
  const P = window.PAPER;
  const METHODS = P._meta.method_display_names;
  const tip = $("#tip");
  const FONT = "JetBrains Mono, monospace";

  // ------------------------------------------------------------ primitives
  const scale = (d0, d1, r0, r1) => { const f = (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0); f.inv = (p) => d0 + ((p - r0) / (r1 - r0)) * (d1 - d0); return f; };
  function niceTicks(lo, hi, n = 5) {
    const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || mag * 10;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(10));
    return out;
  }
  // On narrow containers (phones) charts get a taller aspect and their own margins (mN) so labels keep their size.
  function frame(host, W0, H0, m, mN) {
    const W = Math.max(280, Math.round(host.clientWidth || W0)), narrow = W < 480;
    const H = Math.round(((W * H0) / W0) * (narrow ? 1.3 : 1));
    if (narrow && mN) m = mN;
    host.style.aspectRatio = `${W} / ${H}`;
    host.innerHTML = "";
    host.classList.remove("in");
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" }, host);
    const defs = S("defs", {}, svg);
    // EvoTrias bars use the page's signature cyan → teal → amber gradient (same as the host-portability bars)
    const stops = `<stop offset="0" stop-color="#4fd1e8"/><stop offset="0.55" stop-color="#22a889"/><stop offset="1" stop-color="#e0a24a"/>`;
    defs.innerHTML = `<filter id="glow-${host.id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="evoh-${host.id}" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>
      <linearGradient id="evov-${host.id}" x1="0" y1="1" x2="0" y2="0">${stops}</linearGradient>`;
    return { svg, defs, W, H, m, narrow, x0: m[3], x1: W - m[1], y0: H - m[2], y1: m[0], glow: `url(#glow-${host.id})`, evoH: `url(#evoh-${host.id})`, evoV: `url(#evov-${host.id})` };
  }
  function axes(f, xs, ys, xt, yt, { xfmt = (v) => v, yfmt = (v) => v, xlab, ylab, grid = true } = {}) {
    const g = S("g", { class: "ax" }, f.svg);
    if (yt) yt.forEach((v) => {
      const y = ys(v);
      if (grid) S("line", { x1: f.x0, x2: f.x1, y1: y, y2: y }, g);
      const t = S("text", { x: f.x0 - 8, y: y + 4, "text-anchor": "end" }, g); t.textContent = yfmt(v);
    });
    if (xt) xt.forEach((v) => {
      const x = xs(v);
      const t = S("text", { x, y: f.y0 + 18, "text-anchor": "middle" }, g); t.textContent = xfmt(v);
    });
    S("line", { x1: f.x0, x2: f.x1, y1: f.y0, y2: f.y0, class: "base" }, g);
    if (xlab) { const t = S("text", { x: f.x1, y: f.y0 + 36, "text-anchor": "end", class: "lab" }, f.svg); t.textContent = xlab; }
    if (ylab) { const t = S("text", { x: f.x0 - 8, y: f.y1 - 12, "text-anchor": "start", class: "lab" }, f.svg); t.textContent = ylab; }
    return g;
  }
  function drawable(path, delay = 0) {
    const len = path.getTotalLength ? path.getTotalLength() : 1000;
    path.classList.add("draw");
    path.style.setProperty("--len", len);
    path.style.setProperty("--dl", `${delay}s`);
    return path;
  }
  const stepPath = (pts, xs, ys) => pts.map((p, i) => (i ? `H ${xs(p[0]).toFixed(1)} V ${ys(p[1]).toFixed(1)}` : `M ${xs(p[0]).toFixed(1)} ${ys(p[1]).toFixed(1)}`)).join(" ");
  const linePath = (pts, xs, ys) => pts.map((p, i) => `${i ? "L" : "M"} ${xs(p[0]).toFixed(1)} ${ys(p[1]).toFixed(1)}`).join(" ");
  // draw when first visible, redraw (without replaying the intro) when the layout width changes
  const mounted = [];
  function mount(host, draw) {
    onVisible(host, () => { draw(); mounted.push([host, draw]); requestAnimationFrame(() => host.classList.add("in")); }, 0.3);
  }
  let rz = 0, lastW = innerWidth;
  addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (Math.abs(innerWidth - lastW) < 2) return; lastW = innerWidth; mounted.forEach(([h, d]) => { d(); h.classList.add("in"); }); }, 220);
  });
  function tipShow(html, e) { tip.innerHTML = html; tip.classList.add("on"); tipMove(e); }
  function tipMove(e) {
    const w = tip.offsetWidth, x = e.clientX + 16 + w > innerWidth ? e.clientX - w - 20 : e.clientX;
    tip.style.left = `${x}px`; tip.style.top = `${e.clientY}px`;
  }
  const tipHide = () => tip.classList.remove("on");
  const tr = (m, v, ours) => `<div class="tr ${m === "EvoTrias" || ours ? "ours" : ""}"><span><i style="background:${METHOD_COLORS[m] || "#fff"}"></i>${m}</span><b>${v}</b></div>`;
  function legend(host, methods, hidden, onToggle) {
    host.innerHTML = "";
    methods.forEach((m) => {
      const b = document.createElement("button");
      b.className = (m === "EvoTrias" ? "ours " : "") + (hidden.has(m) ? "off" : "");
      b.innerHTML = `<i style="background:${METHOD_COLORS[m]};${m === "EvoTrias" ? "box-shadow:0 0 8px " + METHOD_COLORS[m] : ""}"></i>${m}`;
      b.addEventListener("click", () => { hidden.has(m) ? hidden.delete(m) : hidden.add(m); b.classList.toggle("off"); onToggle(); });
      host.appendChild(b);
    });
  }
  // vertical crosshair + tooltip over a plot area
  function hover(f, xs, onMove) {
    const line = S("line", { class: "xh", y1: f.y1, y2: f.y0, opacity: 0 }, f.svg);
    const hit = S("rect", { x: f.x0, y: f.y1, width: f.x1 - f.x0, height: f.y0 - f.y1, fill: "transparent" }, f.svg);
    const pt = f.svg.createSVGPoint();
    hit.addEventListener("pointermove", (e) => {
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(f.svg.getScreenCTM().inverse());
      const xv = xs.inv(p.x);
      const snapped = onMove(xv, e);
      line.setAttribute("x1", xs(snapped)); line.setAttribute("x2", xs(snapped)); line.setAttribute("opacity", 1);
    });
    hit.addEventListener("pointerleave", () => { line.setAttribute("opacity", 0); tipHide(); });
  }
  const lineStyle = (m) => ({ stroke: METHOD_COLORS[m], "stroke-width": m === "EvoTrias" ? 3 : 1.7, fill: "none", opacity: m === "EvoTrias" ? 1 : 0.85, "stroke-linejoin": "round" });

  // ------------------------------------------------------------ main table
  function mainTable() {
    const T = P.main_table.backbones;
    const table = $("#main-table");
    const short = { OpenEvolve: "OpenE.", AdaEvolve: "AdaE." };
    function render(bb) {
      const D = T[bb];
      const phone = innerWidth < 700;
      const order = phone ? [5, 0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
      const dHead = `<th title="EvoTrias vs best baseline">${phone ? "Δ best" : "Δ vs best baseline"}</th>`;
      const heads = order.map((i) => { const m = D.methods[i]; return `<th class="${m === "EvoTrias" ? "ours" : ""}">${short[m] || m}</th>` + (phone && i === 5 ? dHead : ""); }).join("");
      let html = `<thead><tr><th>Task</th>${heads}${phone ? "" : dHead}</tr></thead><tbody>`;
      let grp = null, ri = 0;
      D.rows.forEach((r) => {
        if (r.group !== grp) { grp = r.group; html += `<tr class="grp"><td colspan="${D.methods.length + 2}">${grp.toUpperCase()}</td></tr>`; }
        const ours = r.values[5], base = r.values.slice(0, 5);
        const bestB = r.lower_is_better ? Math.min(...base) : Math.max(...base);
        let dl = ((ours - bestB) / Math.abs(bestB)) * 100 * (r.lower_is_better ? -1 : 1);
        const cls = Math.abs(dl) < 0.005 ? "even" : dl > 0 ? "up" : "down";
        const dtxt = Math.abs(dl) < 0.005 ? "±0.00%" : `${dl > 0 ? "+" : "−"}${Math.abs(dl) < 0.1 ? Math.abs(dl).toFixed(3) : Math.abs(dl).toFixed(2)}%`;
        html += `<tr style="animation-delay:${ri++ * 40}ms"><td>${r.task}${r.lower_is_better ? ' <span class="dim">↓</span>' : ""}</td>`;
        const dCell = `<td class="delta ${cls}">${dtxt}</td>`;
        order.forEach((i) => { html += `<td class="${i === 5 ? "ours " : ""}${r.first.includes(i) ? "first" : r.second.includes(i) ? "second" : ""}"><span class="v">${r.display[i]}</span></td>` + (phone && i === 5 ? dCell : ""); });
        html += `${phone ? "" : dCell}</tr>`;
      });
      table.innerHTML = html + "</tbody>";
    }
    UI.seg($("#bb-seg"), (b) => render(b.dataset.bb));
    render("GLM-5.2");
  }

  // ------------------------------------------------------------ Frontier-CS survival curves
  function frontier() {
    const host = $("#ch-frontier");
    const F = P.frontier;
    const hidden = new Set();
    const order = F.ecdf_legend_order || METHODS;
    const surv = (m, x) => F.scores[m].filter((v) => v >= x - 1e-9).length / F.scores[m].length;
    function draw() {
      const f = frame(host, 640, 380, [18, 16, 44, 46]);
      const xs = scale(0, 100, f.x0, f.x1), ys = scale(0, 1, f.y0, f.y1);
      axes(f, xs, ys, [0, 20, 40, 60, 80, 100], [0, 0.25, 0.5, 0.75, 1], { yfmt: (v) => `${v * 100}%`, xlab: "score s", ylab: "problems with score ≥ s" });
      const ms = METHODS.filter((m) => !hidden.has(m)).sort((a) => (a === "EvoTrias" ? 1 : -1));
      ms.forEach((m, k) => {
        const vals = [...new Set(F.scores[m])].sort((a, b) => a - b);
        const pts = [[0, surv(m, 0)]];
        vals.forEach((v) => { pts.push([v, surv(m, v)]); pts.push([v, surv(m, v + 1e-6)]); });
        pts.push([100, surv(m, 100.0001)]);
        const d = pts.map((p, i) => `${i ? "L" : "M"} ${xs(p[0]).toFixed(1)} ${ys(p[1]).toFixed(1)}`).join(" ");
        const path = S("path", { d, ...lineStyle(m), filter: m === "EvoTrias" ? f.glow : null }, f.svg);
        drawable(path, k * 0.12);
      });
      // mid-range band where EvoTrias leads
      const band = S("rect", { x: xs(50), y: f.y1, width: xs(95) - xs(50), height: f.y0 - f.y1, fill: "rgba(79,209,232,0.05)", class: "pop", style: "--dl:1.4s" }, f.svg);
      f.svg.insertBefore(band, f.svg.children[1]);
      const t = S("text", { x: xs(72.5), y: f.y1 + 14, "text-anchor": "middle", class: "ann pop", style: "--dl:1.6s" }, f.svg); t.textContent = f.narrow ? "EvoTrias leads" : "EvoTrias above every baseline";
      hover(f, xs, (x, e) => {
        x = clamp(Math.round(x), 0, 100);
        tipShow(`<div class="th">score ≥ ${x}</div>` + METHODS.filter((m) => !hidden.has(m)).map((m) => tr(m, `${Math.round(surv(m, x) * 100)}%`)).join(""), e);
        return x;
      });
      host.classList.add("in");
    }
    legend($("#lg-frontier"), order, hidden, draw);
    mount(host, draw);
  }

  function medians() {
    const host = $("#ch-median");
    const F = P.frontier;
    mount(host, () => {
    const f = frame(host, 640, 380, [12, 70, 30, 110], [10, 54, 46, 84]);
    const ms = METHODS.slice().sort((a, b) => F.median[b] - F.median[a]);
    const xs = scale(0, 90, f.x0, f.x1);
    const bh = (f.y0 - f.y1) / ms.length;
    [0, 20, 40, 60, 80].forEach((v) => { const t = S("text", { x: xs(v), y: f.y0 + 18, "text-anchor": "middle", class: "lab" }, f.svg); t.textContent = v; S("line", { x1: xs(v), x2: xs(v), y1: f.y1, y2: f.y0, stroke: "rgba(255,255,255,0.05)" }, f.svg); });
    ms.forEach((m, i) => {
      const y = f.y1 + i * bh + bh * 0.2, h = bh * 0.6, ours = m === "EvoTrias";
      const lt = S("text", { x: f.x0 - 10, y: y + h / 2 + 4, "text-anchor": "end", fill: ours ? "#fff" : "#a9bab7", "font-family": FONT, "font-size": 12.5, "font-weight": ours ? 700 : 400 }, f.svg); lt.textContent = m;
      S("rect", { x: f.x0, y, width: xs(90) - f.x0, height: h, rx: h / 2, fill: "rgba(255,255,255,0.03)" }, f.svg);
      const bar = S("rect", { x: f.x0, y, width: xs(F.median[m]) - f.x0, height: h, rx: h / 2, fill: ours ? f.evoH : METHOD_COLORS[m], opacity: ours ? 1 : 0.7, class: "grow", style: `--dl:${i * 0.08}s`, filter: ours ? f.glow : null }, f.svg);
      const mk = S("line", { x1: xs(F.mean[m]), x2: xs(F.mean[m]), y1: y - 4, y2: y + h + 4, stroke: "#fff", "stroke-width": 2, opacity: 0.7, class: "pop", style: `--dl:${0.8 + i * 0.08}s` }, f.svg);
      const vt = S("text", { x: xs(F.median[m]) + 10, y: y + h / 2 + 5, fill: ours ? "#4fd1e8" : "#c3d2cf", "font-family": FONT, "font-size": 14, "font-weight": 700, class: "pop", style: `--dl:${0.6 + i * 0.08}s` }, f.svg);
      vt.textContent = F.median[m].toFixed(2);
      [bar, mk].forEach((el) => {
        el.addEventListener("pointermove", (e) => tipShow(`<div class="th">${m}</div><div class="tr"><span>median</span><b>${F.median[m].toFixed(2)}</b></div><div class="tr"><span>mean</span><b>${F.mean[m].toFixed(2)}</b></div>`, e));
        el.addEventListener("pointerleave", tipHide);
      });
    });
    const k = f.narrow ? S("text", { x: f.x0, y: f.y0 + 38, "text-anchor": "start", class: "lab" }, f.svg) : S("text", { x: f.x1 + 64, y: f.y0 + 18, "text-anchor": "end", class: "lab" }, f.svg);
    k.textContent = "bar = median · tick = mean";
    });
  }

  // ------------------------------------------------------------ best-so-far vs iteration
  function iterCurves() {
    const host = $("#ch-iter");
    const IC = P.iteration_curves;
    const hidden = new Set();
    let task = "signal_processing";
    const order = IC.legend_order;
    function draw() {
      const C = IC.curves[task], lower = IC.lower_is_better[task];
      const f = frame(host, 640, 320, [16, 16, 40, 58]);
      const all = Object.values(C).flat();
      const at5 = Object.values(C).map((c) => c[Math.min(4, c.length - 1)][1]);
      let lo = lower ? Math.min(...all.map((p) => p[1])) : Math.min(...at5);
      let hi = lower ? Math.max(...at5) : Math.max(...all.map((p) => p[1]));
      const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      const xs = scale(1, 50, f.x0, f.x1);
      const ys = lower ? scale(hi, lo, f.y0, f.y1) : scale(lo, hi, f.y0, f.y1);
      const dec = hi - lo < 0.1 ? 3 : hi - lo < 2 ? 2 : 0;
      axes(f, xs, ys, [1, 10, 20, 30, 40, 50], niceTicks(lo, hi, 5), { yfmt: (v) => v.toFixed(dec), xlab: "iteration", ylab: lower ? "best transfer cost (↓ better, axis flipped)" : "best-so-far score" });
      const clip = S("clipPath", { id: `cl-${host.id}` }, f.defs);
      S("rect", { x: f.x0, y: f.y1 - 6, width: f.x1 - f.x0 + 6, height: f.y0 - f.y1 + 6 }, clip);
      const g = S("g", { "clip-path": `url(#cl-${host.id})` }, f.svg);
      METHODS.filter((m) => !hidden.has(m) && C[m]).sort((a) => (a === "EvoTrias" ? 1 : -1)).forEach((m, k) => {
        drawable(S("path", { d: stepPath(C[m], xs, ys), ...lineStyle(m), filter: m === "EvoTrias" ? f.glow : null }, g), k * 0.1);
      });
      const ev = C.EvoTrias[C.EvoTrias.length - 1];
      const endDot = S("circle", { cx: xs(50), cy: ys(ev[1]), r: 5, fill: "#4fd1e8", class: "pop", style: "--dl:2s", filter: f.glow }, f.svg);
      hover(f, xs, (x, e) => {
        const it = clamp(Math.round(x), 1, 50);
        tipShow(`<div class="th">iteration ${it}</div>` + METHODS.filter((m) => !hidden.has(m) && C[m]).map((m) => {
          const p = C[m].filter((q) => q[0] <= it).pop();
          return tr(m, p ? p[1].toFixed(dec + 2) : "—");
        }).join(""), e);
        return it;
      });
      requestAnimationFrame(() => host.classList.add("in"));
    }
    legend($("#lg-iter"), order, hidden, draw);
    UI.seg($("#it-seg"), (b) => { task = b.dataset.task; draw(); });
    mount(host, draw);
  }

  // ------------------------------------------------------------ wall clock
  function wallclock() {
    const host = $("#ch-wall");
    const Wd = P.wallclock;
    const hidden = new Set();
    function draw() {
      const f = frame(host, 640, 380, [18, 20, 44, 50]);
      const cut = Wd.cutoff_min;
      const xs = scale(0, cut, f.x0, f.x1), ys = scale(0.49, 0.75, f.y0, f.y1);
      axes(f, xs, ys, [0, 30, 60, 90, 120], [0.5, 0.55, 0.6, 0.65, 0.7, 0.75], { yfmt: (v) => v.toFixed(2), xlab: "wall-clock (min)", ylab: "best-so-far fitness" });
      METHODS.filter((m) => !hidden.has(m)).sort((a) => (a === "EvoTrias" ? 1 : -1)).forEach((m, k) => {
        const pts = Wd.curves[m].slice();
        const last = pts[pts.length - 1];
        const end = Math.min(cut, Wd.curve_end_min?.[m] ?? cut);
        if (last[0] < end) pts.push([end, last[1]]);
        drawable(S("path", { d: stepPath(pts, xs, ys), ...lineStyle(m), filter: m === "EvoTrias" ? f.glow : null }, f.svg), k * 0.1);
        if (m === "OpenEvolve" && end < cut) {
          const c = S("circle", { cx: xs(end), cy: ys(last[1]), r: 3.5, fill: METHOD_COLORS[m], class: "pop", style: "--dl:1.8s" }, f.svg);
          const t = S("text", { x: xs(end) + 8, y: ys(last[1]) + 4, class: "lab pop", style: "--dl:1.9s" }, f.svg); t.textContent = f.narrow ? "" : "50 iterations done";
        }
      });
      S("line", { x1: xs(15), x2: xs(15), y1: f.y1, y2: f.y0, stroke: "rgba(79,209,232,0.35)", "stroke-dasharray": "3 4" }, f.svg);
      const a = S("text", { x: xs(15) + 6, y: f.y1 + 12, class: "ann pop", style: "--dl:1.5s" }, f.svg); a.textContent = "EvoTrias leads from ~15 min";
      const e = S("text", { x: f.x1, y: ys(Wd.final_best.EvoTrias) - 10, "text-anchor": "end", class: "ann pop", style: "--dl:2.2s", "font-weight": 700 }, f.svg);
      e.textContent = `0.737`;
      hover(f, xs, (x, ev) => {
        x = clamp(x, 0, cut);
        tipShow(`<div class="th">${x.toFixed(0)} min</div>` + METHODS.filter((m) => !hidden.has(m)).map((m) => {
          const p = Wd.curves[m].filter((q) => q[0] <= x).pop();
          return tr(m, p ? p[1].toFixed(4) : "—");
        }).join(""), ev);
        return x;
      });
      host.classList.add("in");
    }
    legend($("#lg-wall"), METHODS, hidden, draw);
    mount(host, draw);
  }

  function tokens() {
    const host = $("#ch-token");
    const T = P.token_cost.cost_usd;
    mount(host, () => {
    const f = frame(host, 640, 380, [14, 30, 58, 110], [10, 10, 60, 84]);
    const ms = METHODS.slice(); // paper order: … CORAL-1, CORAL-4, EvoTrias last
    const xs = scale(0, f.narrow ? 170 : 125, f.x0, f.x1);
    const bh = (f.y0 - f.y1) / ms.length;
    (f.narrow ? [0, 50, 100] : [0, 25, 50, 75, 100, 125]).forEach((v) => { S("line", { x1: xs(v), x2: xs(v), y1: f.y1, y2: f.y0, stroke: "rgba(255,255,255,0.05)" }, f.svg); const t = S("text", { x: xs(v), y: f.y0 + 18, "text-anchor": "middle", class: "lab" }, f.svg); t.textContent = `$${v}`; });
    const yOf = {};
    ms.forEach((m, i) => {
      const y = f.y1 + i * bh + bh * 0.2, h = bh * 0.6, ours = m === "EvoTrias";
      yOf[m] = y + h / 2;
      const agentic = m.startsWith("CORAL") || ours;
      const lt = S("text", { x: f.x0 - 10, y: y + h / 2 + 4, "text-anchor": "end", fill: ours ? "#fff" : "#a9bab7", "font-family": FONT, "font-size": 12.5, "font-weight": ours ? 700 : 400 }, f.svg); lt.textContent = m;
      S("rect", { x: f.x0, y, width: xs(T[m]) - f.x0, height: h, rx: 6, fill: ours ? f.evoH : METHOD_COLORS[m], opacity: ours ? 1 : agentic ? 0.8 : 0.45, class: "grow", style: `--dl:${i * 0.1}s`, filter: ours ? f.glow : null }, f.svg);
      const vt = S("text", { x: xs(T[m]) + 10, y: y + h / 2 + 5, fill: ours ? "#4fd1e8" : "#c3d2cf", "font-family": FONT, "font-size": 14, "font-weight": 700, class: "pop", style: `--dl:${0.7 + i * 0.1}s` }, f.svg);
      vt.textContent = `$${T[m].toFixed(2)}`;
      if (ours) {
        const bt = S("tspan", { dx: 12, fill: "#2ed3a0", "font-family": "Space Grotesk, sans-serif", "font-size": 16 }, vt);
        bt.textContent = f.narrow ? "−64%" : "−64% vs CORAL-4";
      }
    });
    const n1 = S("text", { x: f.x0, y: f.y0 + 36, class: "lab" }, f.svg); n1.textContent = "CORAL 1 → 4 agents: ×3.9 cost";
    const n2 = S("text", { x: f.x0, y: f.y0 + 52, class: "lab" }, f.svg); n2.textContent = "EvoTrias c = 1 → 8: < 5% change";
    });
  }

  // ------------------------------------------------------------ OR-Tools
  function ortools() {
    const host = $("#ch-ortools");
    const O = P.ortools;
    const SER = [["all300", "#4fd1e8", "all 300 instances"], ["subset60", "#e0a24a", "60-instance subset"]];
    mount(host, () => {
    const f = frame(host, 640, 380, [18, 60, 44, 46]);
    const LO = -12, HI = 20;
    const xs = scale(1, 50, f.x0, f.x1), ys = scale(LO, HI, f.y0, f.y1);
    axes(f, xs, ys, [1, 10, 20, 30, 40, 50], [-10, -5, 0, 5, 10, 15, 20], { yfmt: (v) => `${v > 0 ? "+" : ""}${v}%`, xlab: "iteration", ylab: "gain over unpatched CP-SAT" });
    S("line", { x1: f.x0, x2: f.x1, y1: ys(0), y2: ys(0), stroke: "rgba(255,255,255,0.25)" }, f.svg);
    SER.forEach(([k, c], si) => {
      O[k].per_iteration.forEach((v, i) => {
        const vv = Math.max(LO + 0.5, v);
        S("circle", { cx: xs(i + 1), cy: ys(vv), r: v < LO ? 3.5 : 2.3, fill: c, opacity: 0.35, class: "pop", style: `--dl:${0.2 + i * 0.02}s` }, f.svg);
      });
      S("line", { x1: f.x0, x2: f.x1, y1: ys(O.one_shot_mean[k]), y2: ys(O.one_shot_mean[k]), stroke: c, "stroke-dasharray": "2 5", "stroke-width": 1.5, opacity: 0.8 }, f.svg);
      const pts = O[k].best_so_far.map((v, i) => [i + 1, v]);
      drawable(S("path", { d: stepPath(pts, xs, ys), stroke: c, "stroke-width": 3, fill: "none", filter: f.glow }, f.svg), si * 0.3);
      const fin = O.final[k];
      const t = S("text", { x: f.x1 + 8, y: ys(pts[pts.length - 1][1]) + 5, fill: c, "font-family": "Space Grotesk, sans-serif", "font-size": 17, "font-weight": 700, class: "pop", style: `--dl:${2 + si * 0.2}s` }, f.svg);
      t.textContent = `+${fin}%`;
    });
    const tail = S("text", { x: xs(42) + 6, y: ys(LO + 0.5) + 4, class: "lab" }, f.svg); tail.textContent = "↓ −62%";
    hover(f, xs, (x, e) => {
      const it = clamp(Math.round(x), 1, 50);
      tipShow(`<div class="th">iteration ${it}</div>` + SER.map(([k, c, lab]) => `<div class="tr"><span><i style="background:${c}"></i>${lab}</span><b>${O[k].best_so_far[it - 1] > 0 ? "+" : ""}${O[k].best_so_far[it - 1].toFixed(1)}%</b></div>`).join(""), e);
      return it;
    });
    });
    const lg = $("#lg-ortools");
    lg.innerHTML = SER.map(([k, c, lab]) => `<button><i style="background:${c}"></i>${lab} · best-so-far</button>`).join("") + `<button><i style="background:repeating-linear-gradient(90deg,#aaa 0 3px,transparent 3px 6px)"></i>one-shot agent</button>`;
    // code-rain + line counter
    const code = $("#repo-code");
    const SNIP = [
      "namespace operations_research::sat {", "", "// Feasibility jump local search.", "bool FeasibilityJumpSolver::DoSomeGeneralIterations() {",
      "  if (!evaluator_->ViolatedConstraints().empty()) {", "    ++num_restarts_;", "  }", "  for (int i = 0; i < params_.num_violation_ls(); ++i) {",
      "    const int var = SelectVariableToJump();", "    if (var == -1) break;", "    const int64_t delta = ComputeBestJump(var);", "    ApplyJump(var, delta);",
      "    UpdateViolatedConstraintWeights();", "  }", "  return true;", "}", "", "void LsEvaluator::UpdateScoreOnWeightUpdate(int c) {",
      "  const double w = jump_weights_[c];", "  for (const int var : constraint_to_vars_[c]) {", "    jump_scores_[var] += w * ScoreDelta(c, var);", "  }", "}", "",
      "int64_t CompoundMoveBuilder::Backtrack(int* var) {", "  DCHECK(!stack_.empty());", "  *var = stack_.back().var;", "  stack_.pop_back();", "  return value;", "}",
    ];
    const r = rng(9);
    let txt = "";
    for (let i = 0; i < 120; i++) {
      const s = SNIP[i % SNIP.length].replace(/(bool|void|int|const|return|for|if|double|int64_t)\b/g, '<span class="kw">$1</span>');
      txt += (r() < 0.07 ? `<span class="hl">${s || " "}</span>` : s) + "\n";
    }
    code.innerHTML = txt + txt;
    code.animate([{ transform: "translateY(0)" }, { transform: "translateY(-50%)" }], { duration: 60000, iterations: Infinity });
    const loc = $("#loc");
    onVisible(code, () => {
      const t0 = performance.now();
      (function tick(n) { const u = E.outQuint(clamp((n - t0) / 2200)); loc.textContent = Math.round(680000 * u).toLocaleString("en-US"); if (u < 1) requestAnimationFrame(tick); })(t0);
    }, 0.4);
  }

  // ------------------------------------------------------------ evaluator exposure
  function shiftMap() {
    const host = $("#ch-shift");
    const SM = P.exposure.shift_map.points;
    mount(host, () => {
    const f = frame(host, 520, 447, [16, 20, 46, 52]);
    const xs = scale(0.62, 0.82, f.x0, f.x1), ys = scale(0.62, 0.76, f.y0, f.y1);
    axes(f, xs, ys, [0.64, 0.68, 0.72, 0.76, 0.8], [0.62, 0.66, 0.7, 0.74], { xfmt: (v) => v.toFixed(2), yfmt: (v) => v.toFixed(2), xlab: "Original score", ylab: "OOD held-out score" });
    // y = x: zero OOD gap
    const dg = S("line", { x1: xs(0.62), y1: ys(0.62), x2: xs(0.76), y2: ys(0.76), stroke: "rgba(255,255,255,0.35)", "stroke-dasharray": "5 5" }, f.svg);
    const ang = (-Math.atan2(ys(0.62) - ys(0.76), xs(0.76) - xs(0.62)) * 180) / Math.PI;
    const dl = S("text", { x: xs(0.655), y: ys(0.655) + 16, "text-anchor": "start", class: "lab", transform: `rotate(${ang} ${xs(0.655)} ${ys(0.655) + 16})` }, f.svg);
    dl.textContent = "zero gap (OOD = Original)";
    S("polygon", { points: `${xs(0.62)},${ys(0.62)} ${xs(0.76)},${ys(0.76)} ${xs(0.62)},${ys(0.76)}`, fill: "rgba(46,211,160,0.05)" }, f.svg);
    const up = S("text", { x: xs(0.63), y: ys(0.755), class: "lab", fill: "#2ed3a0" }, f.svg); up.textContent = "transfers ↑"; up.setAttribute("fill", "#2ed3a0");
    const arrows = [];
    Object.entries(SM).forEach(([m, v], i) => {
      const c = METHOD_COLORS[m];
      const [px, py] = [xs(v.protected[0]), ys(v.protected[1])], [ex, ey] = [xs(v.exposed[0]), ys(v.exposed[1])];
      // the shaft stops just short of the exposed dot so the head is never hidden under it
      const L = Math.hypot(ex - px, ey - py), ux = (ex - px) / L, uy = (ey - py) / L;
      const tx = ex - ux * 10, ty = ey - uy * 10, sx = px + ux * 10, sy = py + uy * 10;
      const ar = S("path", { d: `M ${sx} ${sy} L ${tx} ${ty}`, stroke: "#ff7a59", "stroke-width": 1.8, fill: "none", opacity: 0.85, "stroke-linecap": "round" }, f.svg);
      const hd = S("path", { d: "M -9 -5.2 L 1.5 0 L -9 5.2 Z", fill: "#ff7a59", "stroke-linejoin": "round", opacity: 0 }, f.svg);
      arrows.push({ ar, hd, sx, sy, tx, ty, len: Math.hypot(tx - sx, ty - sy), ang: (Math.atan2(uy, ux) * 180) / Math.PI, dl: 0.5 + i * 0.25 });
      S("circle", { cx: px, cy: py, r: 8, fill: "#071017", stroke: c, "stroke-width": 3, class: "pop", style: `--dl:${0.2 + i * 0.2}s`, filter: m === "EvoTrias" ? f.glow : null }, f.svg);
      S("circle", { cx: ex, cy: ey, r: 7, fill: c, opacity: 0.85, class: "pop", style: `--dl:${1.4 + i * 0.25}s` }, f.svg);
      const t = S("text", { x: px - 12, y: py + (m === "CORAL-1" ? 20 : -12), "text-anchor": "end", fill: c, "font-family": FONT, "font-size": 12, "font-weight": 700, class: "pop", style: `--dl:${0.4 + i * 0.2}s` }, f.svg);
      t.textContent = m;
      const hit = S("circle", { cx: (px + ex) / 2, cy: (py + ey) / 2, r: 40, fill: "transparent" }, f.svg);
      hit.addEventListener("pointermove", (e) => tipShow(`<div class="th">${m}</div><div class="tr"><span>protected (orig → OOD)</span><b>${v.protected[0].toFixed(3)} → ${v.protected[1].toFixed(3)}</b></div><div class="tr"><span>exposed (orig → OOD)</span><b>${v.exposed[0].toFixed(3)} → ${v.exposed[1].toFixed(3)}</b></div>`, e));
      hit.addEventListener("pointerleave", tipHide);
    });
    const lg = S("g", { transform: `translate(${f.x1 - 150} ${f.y0 - 44})` }, f.svg);
    S("circle", { cx: 6, cy: 0, r: 6, fill: "#071017", stroke: "#fff", "stroke-width": 2 }, lg);
    const l1 = S("text", { x: 18, y: 4, class: "lab" }, lg); l1.textContent = "protected";
    S("circle", { cx: 6, cy: 20, r: 6, fill: "#fff", opacity: 0.8 }, lg);
    const l2 = S("text", { x: 18, y: 24, class: "lab" }, lg); l2.textContent = "exposed";
    // shaft and head are driven together: the head rides the growing tip of its line
    const ease = bezier(0.22, 1, 0.36, 1), D = 2200, t0 = performance.now();
    const set = (a, u) => {
      const d = a.len * u;
      a.ar.setAttribute("stroke-dasharray", `${a.len} ${a.len}`);
      a.ar.setAttribute("stroke-dashoffset", a.len - d);
      a.hd.setAttribute("transform", `translate(${(a.sx + (a.tx - a.sx) * u).toFixed(2)} ${(a.sy + (a.ty - a.sy) * u).toFixed(2)}) rotate(${a.ang.toFixed(2)}) scale(${(0.35 + 0.65 * Math.min(1, u * 4)).toFixed(3)})`);
      a.hd.setAttribute("opacity", u > 0 ? Math.min(1, u * 6) : 0);
    };
    arrows.forEach((a) => set(a, REDUCED ? 1 : 0));
    if (!REDUCED) (function tick(now) {
      let live = false;
      arrows.forEach((a) => { const r = (now - t0 - a.dl * 1000) / D; set(a, r <= 0 ? 0 : ease(Math.min(1, r))); if (r < 1) live = true; });
      if (live && host.isConnected) requestAnimationFrame(tick);
    })(t0);
    });
  }
  // CSS-equivalent cubic-bezier easing (so JS-driven pieces match the stylesheet's --ease)
  function bezier(x1, y1, x2, y2) {
    const B = (s, a, b) => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
    const dB = (s, a, b) => 3 * a * (1 - s) * (1 - s) + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s * s;
    return (t) => {
      let s = t;
      for (let k = 0; k < 8; k++) { const e = B(s, x1, x2) - t, d = dB(s, x1, x2); if (Math.abs(e) < 1e-5 || !d) break; s = clamp(s - e / d); }
      return B(s, y1, y2);
    };
  }

  function exposureBars() {
    const host = $("#ch-exposure");
    const rows = P.exposure.rows;
    let mode = "protected";
    function draw(anim) {
      const f = frame(host, 640, 380, [26, 16, 50, 46]);
      const ys = scale(0.6, 0.82, f.y0, f.y1);
      axes(f, null, ys, null, [0.6, 0.65, 0.7, 0.75, 0.8], { yfmt: (v) => v.toFixed(2) });
      const ms = ["CORAL-1", "CORAL-4", "EvoTrias"], ks = ["original", "iid", "ood"], KC = ["rgba(255,255,255,0.55)", "#9fdcff", "#4fd1e8"];
      const gw = (f.x1 - f.x0) / ms.length, bw = gw * 0.2;
      ms.forEach((m, i) => {
        const r = rows.find((q) => q.method === m && q.evaluator.toLowerCase() === mode);
        const gx = f.x0 + i * gw + gw * 0.15;
        ks.forEach((k, j) => {
          const x = gx + j * (bw + 6), y = ys(r[k]);
          S("rect", { x, y, width: bw, height: f.y0 - y, rx: 4, fill: j === 2 ? (m === "EvoTrias" ? f.evoV : METHOD_COLORS[m]) : KC[j], opacity: j === 2 ? 1 : 0.55, class: "growy", style: `--dl:${i * 0.12 + j * 0.05}s` }, f.svg);
          const t = S("text", { x: x + bw / 2, y: y - 6, "text-anchor": "middle", fill: "#c3d2cf", "font-family": FONT, "font-size": 10.5, class: "pop", style: `--dl:${0.6 + i * 0.12}s` }, f.svg);
          t.textContent = f.narrow && j !== 2 ? "" : r[k].toFixed(3);
        });
        const lt = S("text", { x: gx + (bw * 3 + 12) / 2, y: f.y0 + 20, "text-anchor": "middle", fill: m === "EvoTrias" ? "#fff" : "#a9bab7", "font-family": FONT, "font-size": 12.5, "font-weight": m === "EvoTrias" ? 700 : 400 }, f.svg);
        lt.textContent = m;
        const good = r.gap >= 0;
        const gt = S("text", { x: gx + (bw * 3 + 12) / 2, y: f.y0 + 40, "text-anchor": "middle", fill: good ? "#2ed3a0" : "#ff7a59", "font-family": FONT, "font-size": 13, "font-weight": 700, class: "pop", style: `--dl:${0.9 + i * 0.12}s` }, f.svg);
        gt.textContent = `gap ${good ? "+" : "−"}${Math.abs(r.gap).toFixed(3)}`;
      });
      const lg = S("g", { transform: `translate(${f.x0} ${f.y1 - 16})` }, f.svg);
      ["Original", "IID", "OOD"].forEach((n, j) => {
        S("rect", { x: j * 90, y: -8, width: 10, height: 10, rx: 2, fill: j === 2 ? "#4fd1e8" : KC[j], opacity: j === 2 ? 1 : 0.55 }, lg);
        const t = S("text", { x: j * 90 + 16, y: 1, class: "lab" }, lg); t.textContent = n;
      });
      if (anim) requestAnimationFrame(() => host.classList.add("in"));
    }
    UI.seg($("#ex-seg"), (b) => { mode = b.dataset.ex; draw(true); });
    mount(host, () => draw(true));
  }

  // ------------------------------------------------------------ concurrency
  function concurrency() {
    const host = $("#ch-conc");
    const C = P.concurrency;
    const pick = $("#conc-pick"), read = $("#conc-read");
    let sel = C.c.indexOf(C.knee_c);
    C.c.forEach((c, i) => {
      const b = document.createElement("button");
      b.textContent = c;
      if (c === C.knee_c) b.classList.add("knee");
      b.addEventListener("click", () => { sel = i; draw(false); });
      pick.appendChild(b);
    });
    function draw(anim) {
      $$("button", pick).forEach((b, i) => b.classList.toggle("on", i === sel));
      const c = C.c[sel];
      read.innerHTML = `c = <b>${c}</b> · <b>${C.wallclock_min[sel].toFixed(0)}</b> min · <b>${C.speedup[sel].toFixed(1)}×</b> faster · fitness <b class="${C.fitness_change[sel] < -0.02 ? "neg" : ""}">${C.fitness_change[sel] === 0 ? "±0" : C.fitness_change[sel].toFixed(4)}</b>`;
      const f = frame(host, 640, 340, [30, 56, 40, 50]);
      const xs = (i) => f.x0 + ((i + 0.5) / C.c.length) * (f.x1 - f.x0);
      const ys = scale(0, 520, f.y0, f.y1);
      const yf = scale(-0.035, 0.002, f.y0 - 10, f.y1);
      axes(f, null, ys, null, [0, 100, 200, 300, 400, 500], { ylab: "wall-clock (min)" });
      const bw = (f.x1 - f.x0) / C.c.length * 0.46;
      C.c.forEach((cv, i) => {
        const on = i === sel;
        const y = ys(C.wallclock_min[i]);
        S("rect", { x: xs(i) - bw / 2, y, width: bw, height: f.y0 - y, rx: 6, fill: on ? "#4fd1e8" : "rgba(79,209,232,0.25)", class: anim ? "growy" : null, style: `--dl:${i * 0.08}s`, filter: on ? f.glow : null }, f.svg);
        const t = S("text", { x: xs(i), y: y - 8, "text-anchor": "middle", fill: on ? "#fff" : "#8ea3a0", "font-family": FONT, "font-size": 12, "font-weight": 700 }, f.svg);
        t.textContent = C.published_labels.wallclock[i];
        const xl = S("text", { x: xs(i), y: f.y0 + 20, "text-anchor": "middle", fill: on ? "#fff" : "#8ea3a0", "font-family": FONT, "font-size": 13, "font-weight": on ? 700 : 400 }, f.svg);
        xl.textContent = `c=${cv}`;
      });
      // fitness change line (right axis)
      const fp = C.c.map((cv, i) => [xs(i), yf(C.fitness_change[i])]);
      const pl = S("path", { d: fp.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" "), stroke: "#e0a24a", "stroke-width": 2.2, fill: "none" }, f.svg);
      if (anim) drawable(pl, 0.5);
      fp.forEach((p, i) => S("circle", { cx: p[0], cy: p[1], r: i === sel ? 6 : 4, fill: i === sel ? "#e0a24a" : "#071017", stroke: "#e0a24a", "stroke-width": 2 }, f.svg));
      [0, -0.01, -0.02, -0.03].forEach((v) => { const t = S("text", { x: f.x1 + 8, y: yf(v) + 4, fill: "#b8905a", "font-family": FONT, "font-size": 10.5 }, f.svg); t.textContent = v === 0 ? "0" : v.toFixed(2); });
      const rl = S("text", { x: f.x1 + 50, y: f.y1 - 14, "text-anchor": "end", fill: "#e0a24a", "font-family": FONT, "font-size": 11 }, f.svg); rl.textContent = "Δ fitness";
      const ki = C.c.indexOf(C.knee_c);
      const kn = S("text", { x: xs(ki), y: f.y1 - 14, "text-anchor": "middle", class: "ann" }, f.svg); kn.textContent = "knee";
      S("line", { x1: xs(ki), x2: xs(ki), y1: f.y1 - 8, y2: f.y0, stroke: "rgba(191,244,255,0.3)", "stroke-dasharray": "3 4" }, f.svg);
      if (anim) requestAnimationFrame(() => host.classList.add("in"));
      else host.classList.add("in");
    }
    mount(host, () => draw(true));
  }

  // ------------------------------------------------------------ ablation
  function ablation() {
    const host = $("#ch-ablation");
    const rows = P.ablation.rows;
    let key = "signal";
    function draw() {
      const std = key === "signal" ? "sp_std" : "cp_std";
      const f = frame(host, 640, 320, [8, 70, 26, 190], [6, 48, 24, 132]);
      const vals = rows.map((r) => r[key]);
      const lo = Math.min(...rows.map((r) => r[key] - r[std])), hi = Math.max(...rows.map((r) => r[key] + r[std]));
      const pad = (hi - lo) * 0.1;
      const xs = scale(lo - pad, hi + pad, f.x0, f.x1);
      const bh = (f.y0 - f.y1) / rows.length;
      const full = rows[0][key];
      niceTicks(lo - pad, hi + pad, 5).forEach((v) => { S("line", { x1: xs(v), x2: xs(v), y1: f.y1, y2: f.y0, stroke: "rgba(255,255,255,0.05)" }, f.svg); const t = S("text", { x: xs(v), y: f.y0 + 16, "text-anchor": "middle", class: "lab" }, f.svg); t.textContent = v.toFixed(key === "signal" ? 2 : 3); });
      S("line", { x1: xs(full), x2: xs(full), y1: f.y1, y2: f.y0, stroke: "#4fd1e8", "stroke-dasharray": "4 4", opacity: 0.7 }, f.svg);
      rows.forEach((r, i) => {
        const y = f.y1 + i * bh + bh * 0.22, h = bh * 0.56, v = r[key], d = (v - full) / full;
        const ours = i === 0, host2 = r.group.startsWith("Level 2");
        const col = ours ? "#4fd1e8" : d > 0.002 ? "#2ed3a0" : d < -0.002 ? (host2 ? "#e0a24a" : "#ff7a59") : "#8ea3a0";
        const lt = S("text", { x: f.x0 - 10, y: y + h / 2 + 4, "text-anchor": "end", fill: ours ? "#fff" : "#a9bab7", "font-family": FONT, "font-size": f.narrow ? 9.5 : 11.5, "font-weight": ours ? 700 : 400 }, f.svg);
        lt.textContent = r.config.replace("Initial directions ", "").replace("n_dir", "n_dir").replace("w/o adaptation (Pi_0)", "w/o adaptation (Π₀)");
        if (f.narrow) lt.textContent = lt.textContent.replace("ClaudeCode", "CC").replace("OpenCode", "OC").replace("w/o adaptation", "w/o adapt.").replace("w/o Meta-guidance", "w/o Meta-guid.");
        // lollipop from the full-system reference: honest on a truncated axis
        const cyy = y + h / 2;
        S("line", { x1: xs(v - r[std]), x2: xs(v + r[std]), y1: cyy, y2: cyy, stroke: "rgba(255,255,255,0.35)", "stroke-width": 1.2, class: "pop", style: `--dl:${0.8 + i * 0.05}s` }, f.svg);
        if (!ours) S("line", { x1: xs(full), x2: xs(v), y1: cyy, y2: cyy, stroke: col, "stroke-width": 3, "stroke-linecap": "round", opacity: 0.85, class: "pop", style: `--dl:${0.3 + i * 0.06}s` }, f.svg);
        S("circle", { cx: xs(v), cy: cyy, r: ours ? 7 : 5.5, fill: ours ? "#4fd1e8" : "#071017", stroke: col, "stroke-width": 2.5, class: "pop", style: `--dl:${0.4 + i * 0.06}s`, filter: ours ? f.glow : null }, f.svg);
        const vt = S("text", { x: f.x1 + 8, y: y + h / 2 + 4, fill: col, "font-family": FONT, "font-size": f.narrow ? 10 : 11.5, "font-weight": 700, class: "pop", style: `--dl:${0.6 + i * 0.06}s` }, f.svg);
        vt.textContent = ours ? v.toFixed(4) : `${d >= 0 ? "+" : "−"}${Math.abs(d * 100).toFixed(Math.abs(d) < 0.001 ? 2 : 1)}%`;
        if (i === 1 || i === 6) {
          const gy = f.y1 + i * bh;
          S("line", { x1: f.x0 - 180, x2: f.x1 + 60, y1: gy, y2: gy, stroke: "rgba(255,255,255,0.08)" }, f.svg);
        }
      });
      requestAnimationFrame(() => host.classList.add("in"));
    }
    UI.seg($("#ab-seg"), (b) => { key = b.dataset.ab; draw(); });
    mount(host, draw);
  }

  function init() {
    mainTable(); frontier(); medians(); iterCurves(); wallclock(); tokens(); ortools(); shiftMap(); exposureBars(); concurrency(); ablation();
  }
  return { init };
})();
