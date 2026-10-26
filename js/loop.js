// The contract loop: G → Γt → P → xt → J → yt → ℋ → G, with a packet travelling the triangle and the matching equation lit.
const Loop = (() => {
  const svg = $("#loop-svg");
  const rows = $$(".eq-row");
  const P = { G: [280, 96], P: [96, 392], J: [464, 392] };
  const COL = { G: "#2ed3a0", P: "#ff8a4c", J: "#6f8cff" };
  const IMG = { G: "assets/img/dino/dino_commander.svg", P: "assets/img/dino/dino_builder.svg", J: "assets/img/dino/dino_judge.svg" };
  const NAME = { G: L("Governance", "治理"), P: L("Proposal", "提议"), J: L("Judgment", "评判") };
  const defs = S("defs", {}, svg);
  defs.innerHTML = `<filter id="lg" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="lpk"><stop offset="0" stop-color="#bff4ff" stop-opacity="0.7"/><stop offset="1" stop-color="#4fd1e8" stop-opacity="0"/></radialGradient>
    <radialGradient id="lcore"><stop offset="0" stop-color="#bff4ff" stop-opacity="0.35"/><stop offset="1" stop-color="#4fd1e8" stop-opacity="0"/></radialGradient>`;

  // hook layer: two counter-rotating dashed rings
  const hook = S("g", {}, svg);
  const hr1 = S("circle", { cx: 280, cy: 290, r: 262, fill: "none", stroke: "rgba(224,162,74,0.35)", "stroke-width": 1.4, "stroke-dasharray": "2 9" }, hook);
  const hr2 = S("g", {}, hook);
  S("circle", { cx: 280, cy: 290, r: 250, fill: "none", stroke: "#e0a24a", "stroke-width": 8, "stroke-dasharray": "40 90", opacity: 0.12 }, hr2);
  S("circle", { cx: 280, cy: 290, r: 250, fill: "none", stroke: "#e0a24a", "stroke-width": 2, "stroke-dasharray": "40 90", opacity: 0.6 }, hr2);
  const hl = S("text", { x: 280, y: 580, "text-anchor": "middle", fill: "#e0a24a", "font-family": MONO, "font-size": 10.5, "letter-spacing": 3 }, hook);
  hl.textContent = L("HOOK LAYER", "HOOK 层");
  S("circle", { cx: 280, cy: 290, r: 120, fill: "url(#lcore)" }, svg);
  const ct = S("text", { x: 280, y: 296, "text-anchor": "middle", fill: "#8ea3a0", "font-family": MONO, "font-size": 11, "letter-spacing": 2 }, svg);
  ct.textContent = L("TYPED CONTRACTS", "类型化契约");

  const SEG = [["G", "P", L("Γₜ  context capsule", "Γₜ  上下文胶囊")], ["P", "J", L("xₜ  candidate artifact", "xₜ  候选产物")], ["J", "G", L("yₜ  normalized outcome", "yₜ  归一化结果")]];
  const paths = SEG.map(([a, b, lab], i) => {
    const [x0, y0] = P[a], [x1, y1] = P[b];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const nx = mx + (mx - 280) * 0.28, ny = my + (my - 290) * 0.28; // bow outward
    const d = `M ${x0} ${y0} Q ${nx} ${ny} ${x1} ${y1}`;
    S("path", { d, fill: "none", stroke: "rgba(191,244,255,0.16)", "stroke-width": 2 }, svg);
    const hot = S("g", { opacity: 0 }, svg);
    const hotGlow = S("path", { d, fill: "none", stroke: COL[a], "stroke-width": 10, "stroke-linecap": "round", opacity: 0.22 }, hot);
    const hotCore = S("path", { d, fill: "none", stroke: COL[a], "stroke-width": 3, "stroke-linecap": "round" }, hot);
    // label beside the curve's midpoint, anchored away from it so it never crosses the line
    const qx = 0.25 * x0 + 0.5 * nx + 0.25 * x1, qy = 0.25 * y0 + 0.5 * ny + 0.25 * y1;
    const side = i === 0 ? "end" : i === 2 ? "start" : "middle";
    const lx = qx + (i === 0 ? -18 : i === 2 ? 18 : 0), ly = qy + (i === 1 ? 30 : -4);
    const t = S("text", { x: lx, y: ly, "text-anchor": side, fill: "#c6d6d3", "font-family": "Cambria Math, serif", "font-size": 16 }, svg);
    t.textContent = lab.split("  ")[0];
    const t2 = S("text", { x: lx, y: ly + 16, "text-anchor": side, fill: "#6f8280", "font-family": MONO, "font-size": 10.5 }, svg);
    t2.textContent = lab.split("  ")[1];
    return { el: hot, strokes: [hotGlow, hotCore], len: 0, d };
  });
  paths.forEach((p) => { p.len = p.strokes[1].getTotalLength(); p.strokes.forEach((q) => q.setAttribute("stroke-dasharray", `${p.len}`)); });

  const nodeEls = {};
  for (const k of ["G", "P", "J"]) {
    const [x, y] = P[k];
    const g = S("g", { transform: `translate(${x} ${y})` }, svg);
    const halo = S("circle", { r: 78, fill: COL[k], opacity: 0.08 }, g);
    const ring = S("circle", { r: 66, fill: "#071017", stroke: COL[k], "stroke-width": 2 }, g);
    S("circle", { r: 58, fill: "none", stroke: COL[k], "stroke-opacity": 0.3, "stroke-dasharray": "3 5" }, g);
    const cp = S("clipPath", { id: `lc-${k}` }, defs);
    S("circle", { r: 62 }, cp);
    S("image", { href: IMG[k], x: -58, y: -62, width: 116, height: 124, "clip-path": `url(#lc-${k})`, preserveAspectRatio: "xMidYMid meet" }, g);
    const lab = S("text", { x: k === "G" ? 84 : 0, y: k === "G" ? 6 : 96, "text-anchor": k === "G" ? "start" : "middle", fill: COL[k], "font-family": DISP, "font-size": 16, "font-weight": 600 }, g);
    lab.textContent = NAME[k];
    nodeEls[k] = { halo, ring };
  }
  const packet = S("g", {}, svg);
  S("circle", { r: 20, fill: "url(#lpk)" }, packet);
  S("circle", { r: 6, fill: "#fff" }, packet);

  let alive = false, t0 = performance.now();
  const PH = 1.9;
  function loop(now) {
    const t = (now - t0) / 1000;
    const ph = Math.floor(t / PH) % 3, u = (t % PH) / PH;
    const e = E.inOut(clamp(u / 0.8));
    paths.forEach((p, i) => {
      p.el.setAttribute("opacity", i === ph ? 0.9 : 0);
      if (i === ph) p.strokes.forEach((q) => q.setAttribute("stroke-dashoffset", String(p.len * (1 - e))));
    });
    const pt = paths[ph].strokes[1].getPointAtLength(paths[ph].len * e);
    packet.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    const from = SEG[ph][0], to = SEG[ph][1];
    for (const k in nodeEls) {
      const act = k === to ? E.out(prog(u, 0.75, 1)) : k === from ? 1 - E.out(prog(u, 0, 0.3)) : 0;
      nodeEls[k].halo.setAttribute("opacity", 0.08 + act * 0.25);
      nodeEls[k].halo.setAttribute("r", 78 + act * 10);
    }
    rows.forEach((r, i) => r.classList.toggle("on", i === ph));
    hr1.setAttribute("transform", `rotate(${t * 6} 280 290)`);
    hr2.setAttribute("transform", `rotate(${-t * 14} 280 290)`);
    if (alive) requestAnimationFrame(loop);
  }
  watchVisible(svg, (v) => { if (v && !alive) { alive = true; requestAnimationFrame(loop); } else if (!v) alive = false; });
})();
