// Plugin demo: `/evolve` typed into the host agent, the plan unfolds, a live best-so-far trace — then the next host.
const Terminal = (() => {
  const body = $("#term-body"), hostName = $("#term-host"), badge = $(".term-badge");
  const hosts = $$(".host");
  const HOSTS = ["Claude Code", "Codex", "OpenCode", "JiuwenSwarm"];
  const CMD = "/evolve", REST = " run the circle_packing problem.";
  const curve = window.PAPER.iteration_curves.curves.circle_packing.EvoTrias.map((p) => p[1]);
  const MENU = [["/evolve", "Run EvoTrias — turn this agent into an evolution system"], ["/review", "Review the current changes"], ["/init", "Initialize project instructions"]];
  let hostIdx = 0, runId = 0, visible = false;
  const wait = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === runId ? res() : rej("stale")), ms));
  const line = (cls, html) => { const d = document.createElement("div"); d.className = `ln ${cls}`; d.innerHTML = html; body.appendChild(d); return d; };

  function setHost(i) {
    hostIdx = i;
    hostName.textContent = `${HOSTS[i]} — ~/evolve/benchmarks`;
    hosts.forEach((h, k) => h.classList.toggle("on", k === i));
  }

  async function run() {
    const id = ++runId;
    try {
      body.innerHTML = "";
      badge.classList.remove("on");
      const box = line("prompt-box", `<span style="color:#8b9a98">&gt;</span> <span class="typed"></span><span class="caret"></span>`);
      const typed = box.querySelector(".typed");
      await wait(700, id);
      for (let i = 1; i <= CMD.length; i++) { typed.innerHTML = `<span class="cmd">${CMD.slice(0, i)}</span>`; await wait(70, id); }
      const menu = line("menu", MENU.map(([c, d], i) => `<div class="${i ? "" : "sel"}"><b>${c}</b><span>${d}</span></div>`).join(""));
      await wait(700, id);
      menu.remove();
      for (let i = 1; i <= REST.length; i++) { typed.innerHTML = `<span class="cmd">${CMD}</span>${REST.slice(0, i)}`; await wait(26, id); }
      await wait(350, id);
      box.remove();
      line("user", `&gt; <span class="cmd">${CMD}</span>${REST}`);
      badge.classList.add("on");
      await wait(450, id);
      line("tool", `<span class="b">●</span> I'll run circle_packing end to end with the <b>EvoTrias</b> evolution loop.`);
      await wait(420, id);
      line("tool", `<span class="b">●</span> <b>configure_run</b>  4 lineages · 4 parallel slots · 50-task budget`);
      await wait(260, id);
      line("sub", `⎿  evaluator stays private · hooks armed`);
      await wait(380, id);
      line("tool", `<span class="b">●</span> <b>init-explorer</b>  → 4 initial directions`);
      await wait(260, id);
      line("sub", `⎿  4 lineage roots seeded`);
      await wait(380, id);
      const ex = line("tool", `<span class="spin">✻</span> <b>task-executor ×4</b>  evolving in parallel…  <span class="dim" id="t-prog">task 0/50</span>`);
      const sp = ex.querySelector(".spin"), tp = ex.querySelector("#t-prog");
      const W = 520, H = 70;
      const svgEl = S("svg", { class: "spark", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
      body.appendChild(svgEl);
      const lo = Math.min(...curve), hi = Math.max(...curve);
      const g = S("linearGradient", { id: "tg", x1: 0, y1: 0, x2: 0, y2: 1 }, S("defs", {}, svgEl));
      S("stop", { offset: 0, "stop-color": "#4fd1e8", "stop-opacity": 0.35 }, g); S("stop", { offset: 1, "stop-color": "#4fd1e8", "stop-opacity": 0 }, g);
      const area = S("path", { fill: "url(#tg)" }, svgEl);
      const pl = S("path", { fill: "none", stroke: "#4fd1e8", "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, svgEl);
      const bestL = line("sub", `⎿  best <b style="color:#4fd1e8">—</b>`);
      const frames = "✻✳✢✶✽";
      for (let k = 1; k <= curve.length; k++) {
        const pts = curve.slice(0, k).map((v, i) => [(i / (curve.length - 1)) * W, H - 6 - ((v - lo) / (hi - lo || 1)) * (H - 14)]);
        const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
        pl.setAttribute("d", d);
        area.setAttribute("d", `${d} L${pts[pts.length - 1][0]} ${H} L0 ${H} Z`);
        tp.textContent = `task ${k}/50`;
        sp.textContent = frames[k % frames.length];
        bestL.innerHTML = `⎿  best <b style="color:#4fd1e8">${curve[k - 1].toFixed(5)}</b>  ·  notes ${Math.floor(k / 4)}  ·  meta-guidance ${k > 30 ? 2 : k > 18 ? 1 : 0}`;
        await wait(55, id);
      }
      sp.textContent = "✓"; sp.style.color = "#2ed3a0";
      await wait(300, id);
      line("banner", `┌─ <b style="color:#fff">EvoTrias UI</b>\n└─ <span class="link">http://127.0.0.1:8765/</span>`);
      await wait(3400, id);
      setHost((hostIdx + 1) % HOSTS.length);
      if (visible) run();
    } catch (e) { /* superseded by a newer run */ }
  }

  hosts.forEach((h, i) => h.addEventListener("click", () => { setHost(i); run(); }));
  // slow orbit of the host logos
  const orbit = $(".host-orbit");
  let spin = 0, spinning = false;
  function rot() { spin += 0.06; orbit.style.setProperty("--spin", `${spin}deg`); if (spinning) requestAnimationFrame(rot); }
  watchVisible(orbit, (v) => { spinning = v; if (v) requestAnimationFrame(rot); });
  setHost(0);
  watchVisible(body, (v) => { const was = visible; visible = v; if (v && !was) run(); if (!v) runId++; });
})();
