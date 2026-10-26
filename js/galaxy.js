// Background universe: a WebGL spiral galaxy (same look as the film's cosmos) that the whole page scrolls over.
// The three powers orbit it as a triangle — the "Trias" — drawn on a 2D overlay with the same camera.
// Light theme: the page is the inside of a white cabin and the same universe is seen through the hero's porthole —
// both canvases are clipped to the porthole glass and the camera frames the galaxy in it.
const Galaxy = (() => {
  const cv = $("#galaxy");
  const ov = $("#triad");
  const octx = ov.getContext("2d");
  const gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: true, alpha: false, powerPreference: "high-performance" });
  // soft glows don't need retina resolution: cap the GL buffer (fill-rate is the cost) and the 2D overlay separately
  const DPR = Math.min(1.25, window.devicePixelRatio || 1);
  const ODPR = Math.min(1.5, window.devicePixelRatio || 1);
  const st = { time: 0, scroll: 0, mx: 0, my: 0, tmx: 0, tmy: 0, ok: !!gl, intro: 0 };
  let W = 0, H = 0;

  // ------------------------------------------------------------ particles
  const r = rng(7);
  const gauss = () => (r() + r() + r() + r() - 2) * 0.87;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const WARM = ["#ffe2a8", "#fff4dc", "#ffffff", "#ffd08a"].map(hex);
  const ARMC = ["#4fd1e8", "#7fe0cf", "#9fdcff", "#22a889", "#ffffff", "#bff4ff", "#9b8ad0", "#4fd1e8"].map(hex);
  const NEB = ["#4fd1e8", "#22a889", "#2e6fd0", "#9b8ad0", "#ff6fb0", "#e0a24a", "#4fd1e8", "#22a889"].map(hex);
  const pos = [], col = [], ext = [];
  const push = (rad, ang, z, kind, c, a, size, seed) => { pos.push(rad, ang, z, kind); col.push(c[0], c[1], c[2], a); ext.push(size, seed); };
  const ARM = (rad, arm) => arm * Math.PI + Math.log(rad / 0.07) * 2.25;
  for (let i = 0; i < 3600; i++) { // bulge
    const rad = Math.abs(gauss()) * 0.11 + 0.004;
    push(rad, r() * 6.283, gauss() * 0.045 * (1 - rad * 4), 0, WARM[i % 4], 0.55 + r() * 0.45, 1.1 + r() * 1.6, r());
  }
  for (let i = 0; i < 13000; i++) { // spiral arms
    const rad = 0.07 + Math.pow(r(), 0.85) * 1.05;
    const arm = i % 2;
    const ang = ARM(rad, arm) + gauss() * (0.16 + 0.22 * rad);
    const c = rad < 0.18 ? WARM[i % 4] : ARMC[i % ARMC.length];
    push(rad, ang, gauss() * 0.018, 0, r() < 0.02 ? hex("#ff8fc0") : c, 0.35 + r() * 0.65, 0.8 + r() * r() * 3.2, r());
  }
  for (let i = 0; i < 5200; i++) { // smooth disk
    const rad = Math.sqrt(r()) * 1.15;
    push(rad, r() * 6.283, gauss() * 0.03, 0, ARMC[i % ARMC.length], 0.18 + r() * 0.3, 0.7 + r() * 1.2, r());
  }
  for (let i = 0; i < 380; i++) { // nebulae along the arms
    const rad = 0.12 + Math.pow(r(), 0.8) * 0.95;
    const ang = ARM(rad, i % 2) + 0.12 + gauss() * 0.14;
    const knot = i % 5 === 0;
    push(rad, ang, gauss() * 0.01, 1, knot ? NEB[4 + (i % 2)] : NEB[i % 4], knot ? 0.12 + r() * 0.1 : 0.045 + r() * 0.06, knot ? 18 + r() * 26 : 50 + r() * 100, r());
  }
  for (let i = 0; i < 2600; i++) { // far background stars (screen space)
    push(r() * 2.4 - 1.2, r() * 2.4 - 1.2, r(), 2, r() < 0.15 ? WARM[i % 4] : ARMC[i % ARMC.length], 0.25 + r() * 0.6, 0.6 + r() * r() * 2.2, r());
  }
  const COUNT = pos.length / 4;

  const VS = `
  attribute vec4 aPos; attribute vec4 aCol; attribute vec2 aExt;
  uniform float uTime, uAspect, uDpr, uTilt, uYaw, uDist, uFocal, uSpin, uFade, uPx, uIntro;
  uniform vec2 uCenter, uMouse;
  varying vec4 vCol; varying float vKind;
  void main() {
    vKind = aPos.w;
    float tw = 0.72 + 0.28 * sin(uTime * (1.5 + aExt.y * 3.0) + aExt.y * 40.0);
    if (aPos.w > 1.5) {
      vec2 p = aPos.xy + uMouse * (0.02 + aPos.z * 0.05) * vec2(-1.0, 1.0);
      gl_Position = vec4(p, 0.0, 1.0);
      gl_PointSize = aExt.x * uDpr * (0.8 + 0.4 * aPos.z);
      vCol = vec4(aCol.rgb, aCol.a * tw * (0.55 + 0.45 * uFade));
      return;
    }
    float rad = aPos.x * mix(0.2, 1.0, uIntro);
    // rigid rotation: every radius turns by the same angle, so the spiral keeps its shape (a radius-dependent
    // speed would wind the arms tighter every second until they smear into a ring)
    // (the fixed 0.16/(0.18+r) term bakes in the gentle winding the hero shows right after the intro)
    float ang = aPos.y + 0.16 / (0.18 + aPos.x) + uSpin - (1.0 - uIntro) * 2.5 / (0.3 + aPos.x);
    vec3 w = vec3(cos(ang) * rad, sin(ang) * rad, aPos.z);
    float cy = cos(uYaw), sy = sin(uYaw);
    w = vec3(w.x * cy - w.y * sy, w.x * sy + w.y * cy, w.z);
    float ct = cos(uTilt), stt = sin(uTilt);
    w = vec3(w.x, w.y * ct - w.z * stt, w.y * stt + w.z * ct);
    float vz = uDist - w.z;
    float k = uFocal / vz;
    gl_Position = vec4(w.x * k / uAspect + uCenter.x, w.y * k + uCenter.y, 0.0, 1.0);
    float sz = aExt.x * uDpr * (0.7 + k * 0.6);
    if (aPos.w > 0.5) sz = aExt.x * uDpr * k * uPx;
    gl_PointSize = min(sz, 200.0);
    vCol = vec4(aCol.rgb, aCol.a * (aPos.w > 0.5 ? 1.0 : tw) * uFade * uIntro);
  }`;
  const FS = `
  precision mediump float;
  varying vec4 vCol; varying float vKind;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d) * 4.0;
    if (r2 > 1.0) discard;
    float a = vKind > 0.5 && vKind < 1.5 ? exp(-r2 * 3.2) * (1.0 - r2) : exp(-r2 * 6.0) + 0.6 * exp(-r2 * 28.0);
    a *= vCol.a;
    gl_FragColor = vec4(vCol.rgb * a, a);
  }`;

  let program, U = {};
  function init() {
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    program = gl.createProgram();
    gl.attachShader(program, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(program, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);
    gl.useProgram(program);
    const buf = (data, name, n) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    };
    buf(pos, "aPos", 4); buf(col, "aCol", 4); buf(ext, "aExt", 2);
    ["uTime", "uAspect", "uDpr", "uTilt", "uYaw", "uDist", "uFocal", "uSpin", "uFade", "uPx", "uCenter", "uMouse", "uIntro"].forEach((n) => (U[n] = gl.getUniformLocation(program, n)));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
  }

  function resize() {
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ov.width = Math.round(W * ODPR); ov.height = Math.round(H * ODPR);
    if (gl) gl.viewport(0, 0, cv.width, cv.height);
  }

  // ------------------------------------------------------------ porthole (light theme)
  const glass = $(".pt-glass");
  const win = { on: false, x: 0, y: 0, r: 0, shown: false };
  let clipKey = "";
  const setClip = (v) => { if (v !== clipKey) { clipKey = v; cv.style.clipPath = ov.style.clipPath = v; } };
  function readWindow() {
    win.on = document.documentElement.dataset.theme === "light" && !!glass;
    if (!win.on) { setClip(""); return; }
    const b = glass.getBoundingClientRect();
    win.r = b.width / 2; win.x = b.left + win.r; win.y = b.top + win.r;
    win.shown = win.r > 2 && b.bottom > 0 && b.top < H;
    setClip(win.shown ? `circle(${win.r.toFixed(1)}px at ${win.x.toFixed(1)}px ${win.y.toFixed(1)}px)` : "circle(0px at 0px 0px)");
  }
  // the galaxy fills the glass with its arms running past the rim; it is centred when the window is mid-screen and
  // lags the window as it moves away (a far-away object moves less than the wall it is seen through)
  function windowCamera() {
    const k = (1.32 * win.r) / (1.15 * H * 0.5);
    const gy = win.y - (win.y - H / 2) * 0.22;
    return {
      cx: (win.x / W) * 2 - 1, cy: 1 - (gy / H) * 2,
      tilt: 0.98 + st.my * 0.1, yaw: -0.35 + st.mx * 0.12 + st.scroll * 0.08,
      dist: 1.6 / k, focal: 1.6, fade: 1,
    };
  }

  // Camera as a function of scroll: hero → galaxy sits right of the title; later it drifts to the centre, tips over and recedes.
  function camera() {
    if (win.on) return windowCamera();
    const p = st.scroll, hero = E.smooth(prog(p, 0, 1.1));
    const narrow = W < 1000;
    const mx = st.mx, my = st.my;
    return {
      cx: lerp(narrow ? 0 : 0.36, 0, hero), cy: lerp(narrow ? -0.42 : -0.02, 0, hero),
      tilt: lerp(0.98, 0.62, hero) + my * 0.1, yaw: -0.35 + mx * 0.12 + p * 0.08,
      dist: lerp(2.0, 1.75, hero), focal: 1.6, fade: lerp(1, 0.32, E.smooth(prog(p, 0.25, 1.3))),
    };
  }
  function project(x, y, z, c) {
    const ct = Math.cos(c.tilt), stt = Math.sin(c.tilt), cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw);
    let wx = x * cyw - y * syw, wy = x * syw + y * cyw, wz = z;
    const y2 = wy * ct - wz * stt, z2 = wy * stt + wz * ct;
    const k = c.focal / (c.dist - z2);
    const nx = (wx * k) / (W / H) + c.cx, ny = y2 * k + c.cy;
    return { x: (nx * 0.5 + 0.5) * W, y: (0.5 - ny * 0.5) * H, k, z: z2 };
  }

  // ------------------------------------------------------------ triad overlay
  const labels = $$(".triad-labels .tl");
  const dinoEl = $(".dino-float"), copyEl = $(".hero-copy");
  const TRI = [[46, 211, 160], [255, 138, 76], [111, 140, 255]];
  let triadClear = false;
  const labelOp = [-1, -1, -1];
  const setLabel = (i, op) => { const v = Math.round(op * 100) / 100; if (v !== labelOp[i]) { labels[i].style.opacity = String(v); labelOp[i] = v; } };
  function drawTriad(c) {
    const vis = W < 1000 ? 0 : (win.on ? (win.shown ? 1 : 0) : 1 - E.smooth(prog(st.scroll, 0.15, 0.7))) * E.smooth(prog(st.intro, 0.35, 1));
    if (vis <= 0.01) {
      if (!triadClear) { octx.setTransform(ODPR, 0, 0, ODPR, 0, 0); octx.clearRect(0, 0, W, H); labels.forEach((_, i) => setLabel(i, 0)); triadClear = true; }
      return;
    }
    triadClear = false;
    // read layout before any style write this frame (labels step back while passing behind the dino or the hero copy)
    const dr = dinoEl ? dinoEl.getBoundingClientRect() : null, cr = copyEl ? copyEl.getBoundingClientRect() : null;
    octx.setTransform(ODPR, 0, 0, ODPR, 0, 0);
    octx.clearRect(0, 0, W, H);
    const R = win.on ? 0.66 : 1.02, t = st.time;
    const inside = (b, x, y) => b && x > b.left - 20 && x < b.right + 20 && y > b.top - 10 && y < b.bottom + 10;
    const pts = [0, 1, 2].map((i) => {
      const a = -t * 0.065 + (i * Math.PI * 2) / 3 + 0.4; // orbits with the galaxy (clockwise)
      return project(Math.cos(a) * R, Math.sin(a) * R, 0.1 + 0.05 * Math.sin(t * 0.7 + i * 2), c);
    });
    octx.globalCompositeOperation = "lighter";
    // edges + contract pulses travelling G → P → J → G
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3];
      const g = octx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, `rgba(${TRI[i]},${0.32 * vis})`); g.addColorStop(1, `rgba(${TRI[(i + 1) % 3]},${0.32 * vis})`);
      octx.strokeStyle = g; octx.lineWidth = 1.2; octx.setLineDash([4, 7]); octx.lineDashOffset = -t * 20;
      octx.beginPath(); octx.moveTo(a.x, a.y); octx.lineTo(b.x, b.y); octx.stroke();
      octx.setLineDash([]);
      for (let k = 0; k < 3; k++) {
        const u = (t * 0.22 + k / 3 + i * 0.13) % 1;
        const x = lerp(a.x, b.x, u), y = lerp(a.y, b.y, u);
        const rg = octx.createRadialGradient(x, y, 0, x, y, 10);
        rg.addColorStop(0, `rgba(255,255,255,${0.9 * vis * Math.sin(u * Math.PI)})`); rg.addColorStop(0.3, `rgba(${TRI[i]},${0.6 * vis})`); rg.addColorStop(1, "rgba(0,0,0,0)");
        octx.fillStyle = rg; octx.fillRect(x - 10, y - 10, 20, 20);
      }
    }
    pts.forEach((p, i) => {
      const s = 0.8 + p.k * 0.25, pul = 1 + 0.15 * Math.sin(t * 2.4 + i * 2);
      const rg = octx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 46 * s * pul);
      rg.addColorStop(0, `rgba(255,255,255,${0.95 * vis})`); rg.addColorStop(0.12, `rgba(${TRI[i]},${0.9 * vis})`); rg.addColorStop(0.4, `rgba(${TRI[i]},${0.22 * vis})`); rg.addColorStop(1, "rgba(0,0,0,0)");
      octx.fillStyle = rg; octx.fillRect(p.x - 60 * s, p.y - 60 * s, 120 * s, 120 * s);
      octx.strokeStyle = `rgba(${TRI[i]},${0.7 * vis})`; octx.lineWidth = 1.2;
      octx.beginPath(); octx.arc(p.x, p.y, 14 * s * pul, 0, Math.PI * 2); octx.stroke();
      octx.beginPath(); octx.arc(p.x, p.y, 22 * s, t * 1.5 + i, t * 1.5 + i + 1.2); octx.stroke();
      const l = labels[i];
      const behind = inside(dr, p.x, p.y) || inside(cr, p.x, p.y - 40 * s);
      setLabel(i, vis * (behind ? 0.08 : 1));
      l.style.transform = `translate(${p.x}px, ${p.y - 30 * s}px) translate(-50%, -100%)`;
    });
    octx.globalCompositeOperation = "source-over";
  }

  // deep in the page the galaxy is a dim backdrop: while nothing moves, 30 fps is indistinguishable
  let lastScroll = -1, stillFor = 0, odd = false, lastMove = 0;
  addEventListener("pointermove", () => (lastMove = performance.now()), { passive: true });
  function frame(now) {
    requestAnimationFrame(frame);
    const sy = scrollY;
    stillFor = sy === lastScroll ? stillFor + 1 : 0;
    lastScroll = sy;
    odd = !odd;
    if (sy > H * 1.3 && stillFor > 10 && now - lastMove > 300 && odd) return;
    st.time = now / 1000;
    st.mx = lerp(st.mx, st.tmx, 0.04); st.my = lerp(st.my, st.tmy, 0.04);
    st.scroll = scrollY / Math.max(1, H);
    readWindow();
    const c = camera();
    if (win.on && !win.shown) { drawTriad(c); return; } // porthole scrolled away: nothing to draw
    if (gl) {
      gl.clearColor(0.012, 0.024, 0.04, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.uTime, st.time);
      gl.uniform1f(U.uAspect, W / H);
      gl.uniform1f(U.uDpr, DPR);
      gl.uniform1f(U.uTilt, c.tilt);
      gl.uniform1f(U.uYaw, c.yaw);
      gl.uniform1f(U.uDist, c.dist);
      gl.uniform1f(U.uFocal, c.focal);
      // clockwise on screen (negative = clockwise with this camera); one turn every ~100 s, scrolling nudges it on
      gl.uniform1f(U.uSpin, -(st.time * 0.065 + st.scroll * 0.35));
      gl.uniform1f(U.uFade, c.fade);
      gl.uniform1f(U.uPx, Math.min(W, 1800) / 1400);
      gl.uniform1f(U.uIntro, E.smooth(st.intro));
      gl.uniform2f(U.uCenter, c.cx, c.cy);
      gl.uniform2f(U.uMouse, st.mx, st.my);
      gl.drawArrays(gl.POINTS, 0, COUNT);
    }
    drawTriad(c);
  }

  // big-bang intro: the galaxy unwinds from a compact core when the loader lifts
  function start() {
    const t0 = performance.now();
    (function tick(n) { st.intro = clamp((n - t0) / 2600); if (st.intro < 1) requestAnimationFrame(tick); })(t0);
  }

  init();
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { st.tmx = (e.clientX / W) * 2 - 1; st.tmy = (e.clientY / H) * 2 - 1; }, { passive: true });
  if (REDUCED) st.intro = 1;
  requestAnimationFrame(frame);
  return { start, st };
})();
