/* ============================================================
   O3D · Escena animada
   Impresoras 3D dibujadas en canvas + objetos impresos que
   "saltan" de la cama de impresión, giran y flotan.
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("printScene");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  let W = 0, H = 0, DPR = 1;
  let running = false, visible = true, raf = null, lastTime = 0;
  let time = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ============================================================
     MALLAS 3D
     ============================================================ */
  function normalize(mesh) {
    let max = 0.0001;
    for (const v of mesh.v) {
      const r = Math.hypot(v[0], v[1], v[2]);
      if (r > max) max = r;
    }
    mesh.v = mesh.v.map((v) => [v[0] / max, v[1] / max, v[2] / max]);
    return mesh;
  }

  function cubeMesh() {
    return normalize({
      hue: 18,
      v: [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ],
      f: [
        [0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7],
        [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]
      ]
    });
  }

  function icoMesh() {
    const t = (1 + Math.sqrt(5)) / 2;
    return normalize({
      hue: 24,
      v: [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
      ],
      f: [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
      ]
    });
  }

  function torusMesh() {
    const R = 0.72, r = 0.3, seg = 12, side = 8;
    const v = [], f = [];
    for (let i = 0; i < seg; i++) {
      const u = (i / seg) * TAU;
      for (let j = 0; j < side; j++) {
        const a = (j / side) * TAU;
        v.push([
          (R + r * Math.cos(a)) * Math.cos(u),
          r * Math.sin(a),
          (R + r * Math.cos(a)) * Math.sin(u)
        ]);
      }
    }
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < side; j++) {
        const i2 = (i + 1) % seg, j2 = (j + 1) % side;
        f.push([i * side + j, i2 * side + j, i2 * side + j2, i * side + j2]);
      }
    }
    return normalize({ hue: 12, v, f });
  }

  function gearMesh() {
    const teeth = 10, depth = 0.2;
    const profile = [];
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU;
      const step = TAU / teeth;
      const pts = [
        [a, 0.8], [a + step * 0.16, 1], [a + step * 0.4, 1], [a + step * 0.56, 0.8]
      ];
      for (const [ang, rad] of pts) {
        profile.push([Math.cos(ang) * rad, Math.sin(ang) * rad]);
      }
    }
    const n = profile.length;
    const v = [], f = [];
    for (const [x, z] of profile) v.push([x, depth, z]);
    for (const [x, z] of profile) v.push([x, -depth, z]);
    // tapas
    const top = [], bottom = [];
    for (let i = 0; i < n; i++) top.push(i);
    for (let i = 0; i < n; i++) bottom.push(n + (n - 1 - i));
    f.push(top, bottom);
    // lados
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      f.push([i, j, n + j, n + i]);
    }
    return normalize({ hue: 34, v, f });
  }

  function vaseMesh() {
    const rings = [
      [0.5, -1], [0.78, -0.72], [0.6, -0.34], [0.58, 0.04],
      [0.76, 0.42], [0.66, 0.76], [0.7, 1]
    ];
    const seg = 10;
    const v = [], f = [];
    for (const [rad, y] of rings) {
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * TAU;
        v.push([Math.cos(a) * rad, y, Math.sin(a) * rad]);
      }
    }
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < seg; i++) {
        const i2 = (i + 1) % seg;
        f.push([r * seg + i, r * seg + i2, (r + 1) * seg + i2, (r + 1) * seg + i]);
      }
    }
    // base
    const base = [];
    for (let i = 0; i < seg; i++) base.push(seg - 1 - i);
    f.push(base);
    return normalize({ hue: 28, v, f });
  }

  function bracketMesh() {
    const profile = [
      [-0.9, -0.9], [0.9, -0.9], [0.9, -0.42],
      [-0.4, -0.42], [-0.4, 0.9], [-0.9, 0.9]
    ];
    const n = profile.length, depth = 0.42;
    const v = [], f = [];
    for (const [x, y] of profile) v.push([x, y, depth]);
    for (const [x, y] of profile) v.push([x, y, -depth]);
    const front = [], back = [];
    for (let i = 0; i < n; i++) front.push(i);
    for (let i = 0; i < n; i++) back.push(n + (n - 1 - i));
    f.push(front, back);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      f.push([i, j, n + j, n + i]);
    }
    return normalize({ hue: 8, v, f });
  }

  const MESHES = [cubeMesh(), icoMesh(), torusMesh(), gearMesh(), vaseMesh(), bracketMesh()];
  const randomMesh = () => MESHES[Math.floor(Math.random() * MESHES.length)];

  /* ============================================================
     PROYECCIÓN ISOMÉTRICA
     ============================================================ */
  const IX = 0.866, IY = 0.5;

  function project(p, x, y, z) {
    return {
      x: p.ax + (x - z) * IX * p.s,
      y: p.ay + (x + z) * IY * p.s - y * p.s
    };
  }

  /* ============================================================
     IMPRESORAS
     ============================================================ */
  const PRINTER_W = 95, PRINTER_D = 80, PRINTER_H = 150;
  const HALF_W = PRINTER_W / 2, HALF_D = PRINTER_D / 2;
  const BASE_H = 10, PLATE_Y = 35;

  const printers = [
    { ax: 0, ay: 0, s: 1, phase: 0.4, back: true },
    { ax: 0, ay: 0, s: 1, phase: 2.3 },
    { ax: 0, ay: 0, s: 1, phase: 4.4 }
  ];

  const hoppers = printers.map((p, i) => ({
    p,
    timer: 0.6 + i * 1.35,
    printing: false,
    progress: 0,
    mesh: null
  }));

  function applyLayout() {
    const base = clamp(Math.min(W / 560, H / 560), 0.6, 1.35);
    printers[0].ax = W * 0.5;
    printers[0].ay = H * 0.6;
    printers[0].s = base * 0.8;

    printers[1].ax = W * 0.245;
    printers[1].ay = H * 0.875;
    printers[1].s = base * 1.02;

    printers[2].ax = W * 0.755;
    printers[2].ay = H * 0.875;
    printers[2].s = base * 0.94;
  }

  /* ============================================================
     DIBUJO DE MALLAS
     ============================================================ */
  const LIGHT = (() => {
    const l = [-0.38, 0.74, 0.56];
    const n = Math.hypot(l[0], l[1], l[2]);
    return [l[0] / n, l[1] / n, l[2] / n];
  })();

  function drawMesh(mesh, cx, cy, size, rx, ry, rz, alpha) {
    if (alpha <= 0.01) return;

    const cxr = Math.cos(rx), sxr = Math.sin(rx);
    const cyr = Math.cos(ry), syr = Math.sin(ry);
    const czr = Math.cos(rz), szr = Math.sin(rz);

    const pts = new Array(mesh.v.length);
    for (let i = 0; i < mesh.v.length; i++) {
      const [x0, y0, z0] = mesh.v[i];
      // X
      const y1 = y0 * cxr - z0 * sxr;
      const z1 = y0 * sxr + z0 * cxr;
      // Y
      const x2 = x0 * cyr + z1 * syr;
      const z2 = -x0 * syr + z1 * cyr;
      // Z
      const x3 = x2 * czr - y1 * szr;
      const y3 = x2 * szr + y1 * czr;
      pts[i] = {
        sx: cx + x3 * size,
        sy: cy - y3 * size,
        z: z2
      };
    }

    // halo
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 2.4);
    glow.addColorStop(0, "rgba(255,74,0," + (0.16 * alpha).toFixed(3) + ")");
    glow.addColorStop(0.55, "rgba(255,74,0," + (0.05 * alpha).toFixed(3) + ")");
    glow.addColorStop(1, "rgba(255,74,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 2.4, 0, TAU);
    ctx.fill();

    const faces = [];
    for (const f of mesh.f) {
      let depth = 0;
      for (const idx of f) depth += pts[idx].z;
      depth /= f.length;

      // Normal aproximada con los tres primeros puntos (espacio de pantalla).
      const a = pts[f[0]], b = pts[f[1]], c = pts[f[2]];
      const ux = b.sx - a.sx, uy = b.sy - a.sy, uz = b.z - a.z;
      const vx = c.sx - a.sx, vy = c.sy - a.sy, vz = c.z - a.z;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      const diff = Math.abs(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const shade = 0.32 + diff * 0.68;

      faces.push({ f, depth, shade });
    }
    faces.sort((a, b) => a.depth - b.depth);

    for (const face of faces) {
      const pts2 = face.f.map((idx) => pts[idx]);
      const light = Math.min(1, face.shade);
      const lightness = 22 + light * 46;
      ctx.beginPath();
      ctx.moveTo(pts2[0].sx, pts2[0].sy);
      for (let i = 1; i < pts2.length; i++) ctx.lineTo(pts2[i].sx, pts2[i].sy);
      ctx.closePath();
      ctx.fillStyle = "hsla(" + mesh.hue + ", 92%, " + lightness.toFixed(1) + "%, " + alpha.toFixed(3) + ")";
      ctx.fill();
      ctx.strokeStyle = "rgba(14,5,2," + (0.42 * alpha).toFixed(3) + ")";
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }
  }

  /* ============================================================
     OBJETOS EN VUELO
     ============================================================ */
  const flyers = [];

  function launch(hop) {
    const p = hop.p;
    const size = (26 + Math.random() * 8) * p.s;
    flyers.push({
      mesh: hop.mesh || randomMesh(),
      x: p.ax + (Math.random() - 0.5) * 26 * p.s,
      y: p.ay - PLATE_Y * p.s,
      baseY: p.ay - PLATE_Y * p.s,
      vx: (Math.random() - 0.5) * 150 * p.s,
      vy: -(215 + Math.random() * 120) * p.s,
      g: 310 * p.s,
      size,
      rx: Math.random() * TAU,
      ry: Math.random() * TAU,
      rz: Math.random() * TAU,
      vrx: (Math.random() - 0.5) * 2.6,
      vry: (Math.random() - 0.5) * 2.4,
      vrz: (Math.random() - 0.5) * 1.8,
      t: 0,
      life: 4.4 + Math.random() * 1.8,
      bounces: 0,
      alpha: 1
    });
  }

  function updateFlyers(dt) {
    for (let i = flyers.length - 1; i >= 0; i--) {
      const o = flyers[i];
      o.t += dt;
      o.vy += o.g * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.rx += o.vrx * dt;
      o.ry += o.vry * dt;
      o.rz += o.vrz * dt;

      if (o.y > o.baseY && o.vy > 0 && o.bounces < 2 && o.t < o.life - 0.8) {
        o.y = o.baseY;
        o.vy *= -0.42;
        o.vx *= 0.82;
        o.bounces++;
      }

      if (o.x < 26) { o.x = 26; o.vx = Math.abs(o.vx) * 0.7; }
      if (o.x > W - 26) { o.x = W - 26; o.vx = -Math.abs(o.vx) * 0.7; }

      const fadeStart = o.life - 0.9;
      o.alpha = o.t > fadeStart ? clamp(1 - (o.t - fadeStart) / 0.9, 0, 1) : 1;

      if (o.t >= o.life) flyers.splice(i, 1);
    }
  }

  /* ============================================================
     ESCENA
     ============================================================ */
  const particles = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.5 + Math.random() * 1.7,
    speed: 0.012 + Math.random() * 0.035,
    alpha: 0.06 + Math.random() * 0.22
  }));

  function drawParticles(dt) {
    for (const p of particles) {
      p.y -= p.speed * dt;
      if (p.y < -0.02) p.y = 1.02;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, TAU);
      ctx.fillStyle = "rgba(255,90,20," + p.alpha + ")";
      ctx.fill();
    }
  }

  function drawShadow(p) {
    ctx.save();
    ctx.translate(p.ax, p.ay + 8 * p.s);
    ctx.scale(1, 0.3);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 92 * p.s);
    g.addColorStop(0, "rgba(0,0,0,.55)");
    g.addColorStop(0.55, "rgba(255,74,0,.10)");
    g.addColorStop(1, "rgba(255,74,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 92 * p.s, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function poly(points, fill, stroke, width) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width || 1;
      ctx.stroke();
    }
  }

  function line(a, b, stroke, width) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width || 1;
    ctx.stroke();
  }

  function drawPrinter(p, hop, t) {
    const S = p.s;
    drawShadow(p);

    const bw = HALF_W, bd = HALF_D, bh = BASE_H, top = PRINTER_H;

    // panel trasero (cristal)
    poly(
      [project(p, -bw, bh, -bd), project(p, bw, bh, -bd), project(p, bw, top, -bd), project(p, -bw, top, -bd)],
      "rgba(150,180,210,.028)",
      "rgba(255,255,255,.07)",
      0.8
    );

    // base
    poly(
      [project(p, bw, 0, -bd), project(p, bw, 0, bd), project(p, bw, bh, bd), project(p, bw, bh, -bd)],
      "rgba(9,9,12,.92)",
      "rgba(255,255,255,.12)",
      0.8
    );
    poly(
      [project(p, -bw, 0, bd), project(p, bw, 0, bd), project(p, bw, bh, bd), project(p, -bw, bh, bd)],
      "rgba(15,15,19,.98)",
      "rgba(255,255,255,.2)",
      1
    );
    poly(
      [project(p, -bw, bh, -bd), project(p, bw, bh, -bd), project(p, bw, bh, bd), project(p, -bw, bh, bd)],
      "rgba(23,23,28,1)",
      "rgba(255,255,255,.18)",
      0.8
    );

    // detalle naranja frontal
    line(project(p, -bw + 8, bh - 2, bd + 0.4), project(p, -bw + 34, bh - 2, bd + 0.4), "rgba(255,74,0,.85)", 2 * S);

    // patas traseras
    const posts = [
      [project(p, -bw, bh, -bd), project(p, -bw, top, -bd)],
      [project(p, bw, bh, -bd), project(p, bw, top, -bd)],
      [project(p, -bw, bh, bd), project(p, -bw, top, bd)],
      [project(p, bw, bh, bd), project(p, bw, top, bd)]
    ];
    line(posts[0][0], posts[0][1], "rgba(255,255,255,.22)", 1.1);
    line(posts[1][0], posts[1][1], "rgba(255,255,255,.16)", 1.1);

    // carrete + filamento
    const spool = project(p, -bw + 18, top - 26, -bd + 3);
    const sr = 12 * S;
    ctx.save();
    ctx.translate(spool.x, spool.y);
    ctx.strokeStyle = "rgba(255,90,20,.75)";
    ctx.lineWidth = Math.max(0.8, 1.1 * S);
    ctx.beginPath();
    ctx.arc(0, 0, sr, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, sr * 0.34, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = t * 0.9 + (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * sr * 0.36, Math.sin(a) * sr * 0.36);
      ctx.lineTo(Math.cos(a) * sr * 0.92, Math.sin(a) * sr * 0.92);
      ctx.stroke();
    }
    ctx.restore();

    // cama de impresión
    const plateTop = project(p, 0, PLATE_Y + 2.4, 0);
    const plateGlow = ctx.createRadialGradient(plateTop.x, plateTop.y, 0, plateTop.x, plateTop.y, 40 * S);
    plateGlow.addColorStop(0, "rgba(255,90,20,.20)");
    plateGlow.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = plateGlow;
    ctx.beginPath();
    ctx.arc(plateTop.x, plateTop.y, 40 * S, 0, TAU);
    ctx.fill();

    poly(
      [project(p, -31, PLATE_Y, -25), project(p, 31, PLATE_Y, -25), project(p, 31, PLATE_Y, 25), project(p, -31, PLATE_Y, 25)],
      "rgba(255,74,0,.16)",
      "rgba(255,90,20,.85)",
      1.2
    );
    poly(
      [project(p, -31, PLATE_Y - 3, -25), project(p, 31, PLATE_Y - 3, -25), project(p, 31, PLATE_Y, -25), project(p, -31, PLATE_Y, -25)],
      "rgba(30,14,8,.95)",
      "rgba(255,90,20,.35)",
      0.7
    );

    // objeto imprimiéndose
    if (hop.printing && hop.mesh) {
      const grow = 0.16 + hop.progress * 0.84;
      const objSize = 25 * S * grow;
      const plateScreenY = p.ay - PLATE_Y * S;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, plateScreenY + 1);
      ctx.clip();
      drawMesh(hop.mesh, p.ax, plateScreenY - objSize * 0.72, objSize, 0.18, t * 0.5 + p.phase, 0, 1);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(p.ax - 16 * S, plateScreenY);
      ctx.lineTo(p.ax + 16 * S, plateScreenY);
      ctx.strokeStyle = "rgba(255,190,130,.55)";
      ctx.lineWidth = 1.4 * S;
      ctx.stroke();
    }

    // pórtico y extrusor
    const printingNow = hop.printing;
    const gy = printingNow
      ? 44 + (1 - hop.progress) * 74
      : 82 + Math.sin(t * 0.7 + p.phase) * 9;
    const gx = Math.sin(t * (printingNow ? 2.4 : 0.55) + p.phase) * 24;

    line(project(p, -bw, gy, -bd), project(p, bw, gy, -bd), "rgba(255,255,255,.18)", 1);
    line(project(p, -bw, gy, bd), project(p, bw, gy, bd), "rgba(255,255,255,.3)", 1.3);
    line(project(p, gx, gy, -bd), project(p, gx, gy, bd), "rgba(255,255,255,.24)", 1);

    const head = project(p, gx, gy, 0);
    const head2 = project(p, gx, gy - 9, 0);
    line(head, head2, "rgba(255,120,40,.95)", 2.2 * S);
    ctx.beginPath();
    ctx.arc(head2.x, head2.y, 2.2 * S, 0, TAU);
    ctx.fillStyle = "rgba(255,200,150,.95)";
    ctx.fill();

    // filamento desde el carrete hasta el extrusor
    ctx.beginPath();
    ctx.moveTo(spool.x, spool.y);
    ctx.quadraticCurveTo(
      (spool.x + head.x) / 2 + 20 * S,
      Math.min(spool.y, head.y) - 26 * S,
      head.x,
      head.y
    );
    ctx.strokeStyle = "rgba(255,90,20,.18)";
    ctx.lineWidth = 1 * S;
    ctx.stroke();

    // postes delanteros y marco superior
    line(posts[2][0], posts[2][1], "rgba(255,255,255,.34)", 1.3);
    line(posts[3][0], posts[3][1], "rgba(255,255,255,.26)", 1.2);

    const topCorners = [
      project(p, -bw, top, -bd), project(p, bw, top, -bd),
      project(p, bw, top, bd), project(p, -bw, top, bd)
    ];
    poly(topCorners, "rgba(255,255,255,.012)", "rgba(255,255,255,.24)", 1.1);

    // logo en la base
    const logo = project(p, 12, 5, bd + 0.5);
    ctx.save();
    ctx.fillStyle = "rgba(241,239,234,.36)";
    ctx.font = Math.max(7, 8.5 * S) + "px Anton, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("O3D", logo.x, logo.y);
    ctx.restore();

    // led
    const led = project(p, bw - 12, 6, bd + 0.5);
    const pulse = 0.55 + Math.sin(t * 3 + p.phase) * 0.35;
    ctx.beginPath();
    ctx.arc(led.x, led.y, 1.8 * S, 0, TAU);
    ctx.fillStyle = "rgba(255,90,20," + pulse.toFixed(2) + ")";
    ctx.fill();
  }

  function drawFlyers() {
    const sorted = flyers.slice().sort((a, b) => a.y - b.y);
    for (const o of sorted) {
      const shrink = o.t > o.life - 0.7 ? clamp(1 - (o.t - (o.life - 0.7)) * 0.55, 0.35, 1) : 1;
      drawMesh(o.mesh, o.x, o.y, o.size * shrink, o.rx, o.ry, o.rz, o.alpha);
    }
  }

  function drawScene(dt) {
    ctx.clearRect(0, 0, W, H);

    // parallax suave
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    ctx.save();
    ctx.translate(pointer.x, pointer.y);

    drawParticles(dt);

    for (let i = 0; i < printers.length; i++) drawPrinter(printers[i], hoppers[i], time);
    drawFlyers();

    ctx.restore();
  }

  /* ============================================================
     LOOP
     ============================================================ */
  function step(dt) {
    time += dt;
    for (const hop of hoppers) {
      if (!hop.printing) {
        hop.timer -= dt;
        if (hop.timer <= 0) {
          hop.printing = true;
          hop.progress = 0;
          hop.mesh = randomMesh();
        }
      } else {
        hop.progress += dt / 1.9;
        if (hop.progress >= 1) {
          hop.progress = 1;
          launch(hop);
          hop.printing = false;
          hop.mesh = null;
          hop.timer = 3.4 + Math.random() * 3.2;
        }
      }
    }
    updateFlyers(dt);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    step(dt);
    drawScene(dt);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduceMotion || running) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  /* ============================================================
     ESTÁTICO (reduced motion)
     ============================================================ */
  function drawStatic() {
    time = 1.4;
    flyers.length = 0;
    if (printers[1]) {
      flyers.push({
        mesh: MESHES[1], x: W * 0.30, y: H * 0.30, size: 32 * printers[1].s,
        rx: 0.5, ry: 0.3, rz: 0.8, t: 0, life: 10, alpha: 1
      });
      flyers.push({
        mesh: MESHES[4], x: W * 0.68, y: H * 0.24, size: 30 * printers[2].s,
        rx: 0.8, ry: 1.1, rz: 0.2, t: 0, life: 10, alpha: 1
      });
    }
    drawScene(0.016);
  }

  /* ============================================================
     RESIZE + EVENTOS
     ============================================================ */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    applyLayout();
    pointer.tx = pointer.x = 0;
    pointer.ty = pointer.y = 0;
    if (reduceMotion) drawStatic();
  }

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      },
      { threshold: 0.01 }
    ).observe(canvas);
  }

  if (finePointer) {
    const hero = canvas.closest(".hero") || canvas;
    hero.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      pointer.tx = nx * 10;
      pointer.ty = ny * 8;
    });
    hero.addEventListener("pointerleave", () => {
      pointer.tx = 0;
      pointer.ty = 0;
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible) start();
  });

  resize();
  if (reduceMotion) drawStatic();
  else {
    start();
    // Primer frame inmediato para que no haya flash vacío.
    step(0.016);
    drawScene(0.016);
  }
})();
