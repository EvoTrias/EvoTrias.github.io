// Governance, live: replay of the real Cloudcast lineage (50 settled tasks) with the context capsule each task received.
const Lineage = (() => {
  const D = window.PAPER.lineage_cloudcast;
  const svg = $("#lineage-svg"), scroller = svg.parentElement;
  const LC = ["#4fd1e8", "#2ed3a0", "#e0a24a", "#b39cff"]; // lineage colours
  const nodes = D.nodes.slice().sort((a, b) => a.order - b.order);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  nodes.forEach((n) => (n.kids = []));
  nodes.forEach((n) => n.parent && byId[n.parent].kids.push(n));

  // ---- tidy layout: x by generation, y by leaf order inside each lineage band
  const VW = 980, VH = 680, X0 = 40, XS = 128, Y0 = 22, Y1 = VH - 22;
  const roots = [0, 1, 2, 3].map((l) => nodes.find((n) => n.lineage === l && !n.parent));
  let leaf = 0;
  const leafGap = 0.9; // extra gap between lineages, in leaf units
  function place(n) {
    if (!n.kids.length) { n.ly = leaf++; return; }
    n.kids.sort((a, b) => a.order - b.order).forEach(place);
    n.ly = (n.kids[0].ly + n.kids[n.kids.length - 1].ly) / 2;
  }
  roots.forEach((r, i) => { if (i) leaf += leafGap; place(r); });
  const ys = (Y1 - Y0) / (leaf - 1);
  nodes.forEach((n) => { n.x = X0 + n.gen * XS; n.y = Y0 + n.ly * ys; });

  // quality → radius (cost: lower is better)
  const costs = nodes.map((n) => n.cost);
  const cMin = Math.min(...costs), cMax = Math.max(...costs);
  nodes.forEach((n) => (n.q = 1 - (Math.log(n.cost) - Math.log(cMin)) / (Math.log(cMax) - Math.log(cMin))));

  const defs = S("defs", {}, svg);
  defs.innerHTML = `<filter id="ng" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  // lineage band labels + generation guides
  const bg = S("g", {}, svg);
  for (let g = 0; g <= 7; g++) {
    S("line", { x1: X0 + g * XS, y1: 8, x2: X0 + g * XS, y2: VH - 6, stroke: "rgba(255,255,255,0.035)" }, bg);
    const t = S("text", { x: X0 + g * XS, y: VH + 6, "text-anchor": "middle", fill: "#4d5f62", "font-family": MONO, "font-size": 10 }, bg);
    t.textContent = `G${g}`;
  }
  const gEdges = S("g", {}, svg), gInsp = S("g", {}, svg), gNodes = S("g", {}, svg);

  const curve = (a, b) => { const mx = (a.x + b.x) / 2; return `M ${a.x} ${a.y} C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`; };
  nodes.forEach((n) => {
    if (n.parent) {
      const p = byId[n.parent];
      n.edge = S("path", { d: curve(p, n), fill: "none", stroke: LC[n.lineage], "stroke-width": 1.6, opacity: 0.55 }, gEdges);
      n.elen = n.edge.getTotalLength();
      n.edge.setAttribute("stroke-dasharray", n.elen);
      n.edge.setAttribute("stroke-dashoffset", n.elen);
    }
    const g = S("g", { transform: `translate(${n.x} ${n.y})`, opacity: 0, class: "ln-node" }, gNodes);
    const r = 3.8 + n.q * 4.6;
    n.halo = S("circle", { r: r + 10, fill: LC[n.lineage], opacity: 0 }, g);
    n.dot = S("circle", { r, fill: "#071017", stroke: LC[n.lineage], "stroke-width": n.parent ? 2 : 3 }, g);
    if (!n.parent) S("circle", { r: r + 5, fill: "none", stroke: "#fff", "stroke-width": 1.2, opacity: 0.8 }, g);
    S("circle", { r: r * 0.45, fill: LC[n.lineage], opacity: 0.35 + n.q * 0.65 }, g);
    if (n.notes) S("circle", { cx: r * 0.8, cy: -r * 0.8, r: 3.6, fill: "#e0a24a", stroke: "#071017", "stroke-width": 1.5 }, g);
    if (n.guidance) S("rect", { x: -r * 0.9 - 4, y: -r * 0.9 - 4, width: 7, height: 7, fill: "#b39cff", transform: `rotate(45 ${-r * 0.9} ${-r * 0.9})` }, g);
    if (n.id === D.best_id) {
      const cr = S("text", { y: -r - 8, "text-anchor": "middle", "font-size": 15, fill: "#ffd166" }, g);
      cr.textContent = "★";
    }
    n.g = g; n.r = r;
    g.addEventListener("pointerenter", (e) => showTip(n, e));
    g.addEventListener("pointermove", (e) => moveTip(e));
    g.addEventListener("pointerleave", hideTip);
  });

  // ---- tooltip
  const tip = $("#tip");
  function showTip(n, e) {
    if (+n.g.getAttribute("opacity") < 0.5) return;
    tip.innerHTML = `<div class="th">${n.id} · ${L("lineage", "谱系")} ${n.lineage + 1} · G${n.gen}</div>
      <div class="tr"><span>${L("transfer cost", "传输成本")}</span><b>${n.cost.toFixed(2)}</b></div>
      <div class="tr"><span>${L("parent", "父代")}</span><b>${n.parent || L("root", "根")}</b></div>
      ${n.notes ? `<div class="tr"><span>notes</span><b>${n.notes.map(kindName).join(", ")}</b></div>` : ""}
      ${n.guidance ? `<div class="tr"><span>guidance</span><b>${n.guidance}</b></div>` : ""}`;
    tip.classList.add("on");
    moveTip(e);
  }
  function moveTip(e) { tip.style.left = `${e.clientX}px`; tip.style.top = `${e.clientY}px`; }
  function hideTip() { tip.classList.remove("on"); }

  // ---- transient inspiration beams
  function beams(n) {
    (n.insp || []).forEach((id, i) => {
      const a = byId[id];
      if (!a) return;
      const p = S("path", { d: `M ${a.x} ${a.y} Q ${(a.x + n.x) / 2 + 30} ${(a.y + n.y) / 2 - 30} ${n.x} ${n.y}`, fill: "none", stroke: a.lineage === n.lineage ? "#bff4ff" : "#ffffff", "stroke-width": 1, "stroke-dasharray": "2 5", opacity: 0.5 }, gInsp);
      p.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.2 }, { opacity: 0 }], { duration: 1600, delay: i * 90, easing: "ease-out", fill: "forwards" }).onfinish = () => p.remove();
    });
  }

  // ---- note / guidance feed (real texts where the run recorded them)
  const feed = $("#note-feed");
  const EX = {};
  window.PAPER.notes_examples.forEach((x) => { const m = x.source.match(/note_(task_\d+)/); if (m) EX[m[1]] = x; });
  const KC = { error: "#ff7a59", positive: "#2ed3a0", negative: "#ff8fc0", guidance: "#b39cff" };
  // Chinese texts of the run's recorded notes and guidance ideas
  const KZ = { error: "错误", positive: "正向", negative: "负向" };
  const kindName = (k) => L(k, KZ[k] || k);
  const EXZ = {
    task_012: ["运行验证器之前先校验种子字面量", "种子字面量里的一个笔误（0xC10UD，U 不是十六进制数字）在验证器运行算法之前就引发了 SyntaxError。种子只使用十进制整数或合法的十六进制（0-9、A-F）字面量，不要在十六进制字面量里嵌入助记字母。"],
    task_023: ["Dreyfus-Wagner Steiner DP 在 cloudcast 上不如 Prim 贪心局部搜索", "用于有向 Steiner 树的精确 Dreyfus-Wagner 位掩码 DP，在每个配置上都得到了一棵通过验证、但比父代 Prim 贪心局部搜索更贵的树。这说明问题出在 DP 的重建或松弛方向上，而不是策略本身更差。"],
    task_024: ["精确的 Dreyfus-Wagner 有向 Steiner DP 在 cloudcast 上胜过 Prim 贪心", "把 Prim 贪心 + 重路由 / 重挂父节点 / 捷径，替换为基于 Dreyfus-Wagner 位掩码 DP 的精确有向 Steiner 树后，五个基准配置（终端数均 ≤ 7）上的总成本从 660.70 降到 618.10（适应度 +6.88%）。"],
  };
  const IDEAZ = { mg_0001: "通过 Dreyfus-Wagner 位掩码 DP 求精确的有向 Steiner 树", mg_0002: "在树的边交换邻域上做带 Metropolis 准则的模拟退火", mg_0003: "以信息素加权选边的蚁群优化" };
  function card(kind, title, body, meta) {
    feed.querySelector(".nf-empty")?.remove();
    const c = document.createElement("div");
    c.className = "nf-card";
    c.style.setProperty("--k", KC[kind]);
    c.innerHTML = `<div class="nf-k">${meta}</div><div class="nf-t">${title}</div>${body ? `<div class="nf-b">${body}</div>` : ""}`;
    feed.prepend(c);
    while (feed.children.length > 5) feed.lastChild.remove();
  }
  function emptyFeed() { feed.innerHTML = `<div class="nf-empty">${L("notes and meta-guidance appear here as the run distills them", "运行提炼出的 notes 与 meta-guidance 会出现在这里")}</div>`; }

  // ---- state
  const cnt = $("#rp-count"), bestEl = $("#rp-best"), fill = $(".rp-fill"), knob = $(".rp-knob");
  const cap = { task: $("#cap-task"), parent: $("#cap-parent"), insp: $("#cap-insp"), notes: $("#cap-notes"), mg: $("#cap-mg"), cost: $("#cap-cost"), phase: $("#cap-phase") };
  const setCap = (el, v) => { if (el.textContent !== v) { el.textContent = v; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } };
  let shown = 0; // number of settled tasks currently displayed
  function render(k, animate) {
    k = clamp(Math.round(k), 0, nodes.length);
    if (k === shown && animate) return;
    const back = k < shown;
    nodes.forEach((n, i) => {
      const vis = i < k;
      n.g.setAttribute("opacity", vis ? 1 : 0);
      if (n.edge) {
        n.edge.style.transition = animate && !back ? "stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)" : "none";
        n.edge.style.strokeDashoffset = vis ? 0 : n.elen;
      }
    });
    let best = null;
    nodes.slice(0, k).forEach((n) => { if (!best || n.cost < best.cost) best = n; });
    nodes.forEach((n) => n.halo.setAttribute("opacity", n === best ? 0.35 : 0));
    cnt.textContent = k;
    bestEl.textContent = best ? best.cost.toFixed(2) : "—";
    const f = k / nodes.length;
    fill.style.width = `${f * 100}%`; knob.style.left = `${f * 100}%`;
    const n = nodes[k - 1];
    if (n) {
      setCap(cap.task, n.id);
      setCap(cap.parent, n.parent || L("— (root)", "—（根）"));
      setCap(cap.insp, n.insp ? n.insp.map((s) => s.replace("task_", "#")).join(" ") : L("— closed", "— 关闭"));
      setCap(cap.notes, n.notes ? n.notes.map(kindName).join(" · ") : "—");
      setCap(cap.mg, n.guidance || "—");
      setCap(cap.cost, n.cost.toFixed(2));
      const rootsDone = nodes.slice(0, k).filter((x) => !x.parent).length === 4;
      cap.phase.textContent = !rootsDone ? L("root phase · 4 directions", "根阶段 · 4 个方向") : n.guidance ? L("guidance anchoring", "guidance 锚定") : k > 36 ? L("annealing · broad → deep", "退火 · 由广到深") : L("evolution phase", "进化阶段");
    }
    if (n && scroller.scrollWidth > scroller.clientWidth + 4) {
      const target = (n.x / VW) * scroller.scrollWidth - scroller.clientWidth * 0.62;
      if (animate && !back) scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    } else if (k === 0) scroller.scrollLeft = 0;
    if (animate && !back && n) {
      n.g.animate([{ transform: `translate(${n.x}px, ${n.y}px) scale(0)` }, { transform: `translate(${n.x}px, ${n.y}px) scale(1.5)`, offset: 0.6 }, { transform: `translate(${n.x}px, ${n.y}px) scale(1)` }], { duration: 650, easing: "cubic-bezier(.22,1,.36,1)" });
      if (n.is_new_best) {
        const ring = S("circle", { cx: n.x, cy: n.y, r: n.r, fill: "none", stroke: "#bff4ff", "stroke-width": 2 }, gInsp);
        ring.animate([{ r: n.r, opacity: 1 }, { r: n.r + 34, opacity: 0 }], { duration: 1100, easing: "ease-out" }).onfinish = () => ring.remove();
      }
      beams(n);
      if (n.guidance) {
        const gi = D.guidance_ideas[n.guidance];
        const res = n.is_new_best ? L("new best", "新最优") : n.cost > byId[n.parent].cost + 1e-6 ? L("regression", "退化") : L("no gain", "无提升");
        card("guidance", L(gi.idea, IDEAZ[n.guidance] || gi.idea), L(`anchored at the then-best ${n.parent} · ${n.id}: ${res}`, `锚定于当时的最优 ${n.parent} · ${n.id}：${res}`), `meta-guidance ${n.guidance} → ${n.id}`);
      }
      (n.notes || []).forEach((kind) => {
        const ex = EX[n.id];
        const meta = `${kindName(kind)} note · ${n.id}`;
        if (ex && ex.type === kind) card(kind, L(ex.title, EXZ[n.id]?.[0] || ex.title), L(ex.text, EXZ[n.id]?.[1] || ex.text), meta);
        else card(kind, L(`${kind[0].toUpperCase() + kind.slice(1)} note committed`, `${kindName(kind)} note 已提交`), L("validated by Governance and written to the notes pool; later tasks load it by relevance.", "经 Governance 验证后写入 notes 池；后续任务按相关性加载。"), meta);
      });
    }
    if (k === 0) emptyFeed();
    shown = k;
  }

  // ---- playback: play / pause / replay in the middle, single steps either side (stepping pauses)
  const btn = $(".rp-play");
  const END = nodes.length;
  let playing = false, pos = 0, last = 0, userPaused = false;
  const SPEED = 1.9; // tasks per second
  const mark = () => { btn.classList.toggle("playing", playing); btn.classList.toggle("ended", !playing && pos >= END); };
  function loop(now) {
    if (!playing) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    pos = Math.min(END, pos + dt * SPEED);
    render(Math.floor(pos), true);
    if (pos >= END) { play(false); return; } // stop on the last task and offer a replay
    requestAnimationFrame(loop);
  }
  function play(on) {
    playing = on;
    if (on) { if (pos >= END) { pos = 0; render(0, false); } last = performance.now(); requestAnimationFrame(loop); }
    mark();
  }
  btn.addEventListener("click", () => { userPaused = playing; play(!playing); });
  const step = (d) => {
    userPaused = true; play(false);
    const k = clamp(shown + d, 0, END);
    pos = k; render(k, d > 0); mark();
  };
  $(".rp-prev").addEventListener("click", () => step(-1));
  $(".rp-next").addEventListener("click", () => step(1));
  const track = $(".rp-track");
  const seek = (e) => { const b = track.getBoundingClientRect(); pos = clamp((e.clientX - b.left) / b.width) * END; render(Math.floor(pos), false); mark(); };
  track.addEventListener("pointerdown", (e) => { userPaused = true; play(false); seek(e); track.setPointerCapture(e.pointerId); track.onpointermove = seek; });
  track.addEventListener("pointerup", () => { track.onpointermove = null; });
  watchVisible(svg, (v) => { if (v && !playing && !userPaused && pos < END) play(true); else if (!v && playing) play(false); });
  emptyFeed();
  render(0, false);
})();
