/*
 * Lupa de rayos X del hero.
 *
 * La capa de delante (.hero__front) es la web normal. En la de detrás (.hero__back)
 * se clona el mismo contenido con estilo "rayos X" y se dibuja en un <canvas> un
 * esquema del backend con peticiones viajando entre servicios. La capa de detrás
 * solo se ve dentro de un círculo (clip-path) que sigue al cursor.
 *
 * - Ratón: la lupa sigue al cursor y desaparece al salir.
 * - Táctil: la lupa se pasea sola hasta que tocas; luego se queda donde toques.
 * - prefers-reduced-motion: la lupa queda fija y los paquetes no se mueven.
 */
(() => {
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const hero = document.querySelector("[data-lens]");
  if (!hero) return;

  const front = hero.querySelector(".hero__front");
  const back = hero.querySelector(".hero__back");
  const ring = hero.querySelector(".hero__ring");
  const canvas = back.querySelector(".hero__canvas");
  const hintText = hero.querySelector("[data-hint-text]");
  const ctx = canvas.getContext("2d");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const noHover = matchMedia("(hover: none)");

  /* ---------- 1. Clonar el contenido para la capa de rayos X ---------- */
  const clone = front.querySelector(".hero__inner").cloneNode(true);
  clone.querySelectorAll("[data-xray-text]").forEach((el) => {
    el.textContent = el.dataset.xrayText;
  });
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  clone.querySelectorAll("a").forEach((el) => el.setAttribute("tabindex", "-1"));
  back.appendChild(clone);

  if (noHover.matches) {
    hintText.textContent = "Toca la cabecera para mover la lupa";
  }

  /* ---------- 2. Esquema del backend ---------- */
  // Coordenadas en fracciones del hero. Hay un juego para escritorio y otro para móvil.
  const LAYOUTS = {
    wide: {
      web:      { x: 0.60, y: 0.16, label: "Navegador" },
      api:      { x: 0.76, y: 0.40, label: "API" },
      reservas: { x: 0.91, y: 0.20, label: "Reservas" },
      pagos:    { x: 0.92, y: 0.60, label: "Pagos" },
      db:       { x: 0.80, y: 0.80, label: "PostgreSQL" },
      avisos:   { x: 0.60, y: 0.66, label: "Emails y WhatsApp" },
      auth:     { x: 0.36, y: 0.12, label: "Login" },
      cola:     { x: 0.22, y: 0.58, label: "Tareas programadas" },
      backup:   { x: 0.40, y: 0.86, label: "Copias de seguridad" },
    },
    narrow: {
      web:      { x: 0.20, y: 0.10, label: "Navegador" },
      api:      { x: 0.55, y: 0.30, label: "API" },
      reservas: { x: 0.82, y: 0.12, label: "Reservas" },
      pagos:    { x: 0.82, y: 0.56, label: "Pagos" },
      db:       { x: 0.55, y: 0.88, label: "PostgreSQL" },
      avisos:   { x: 0.22, y: 0.70, label: "Emails" },
      auth:     { x: 0.25, y: 0.42, label: "Login" },
      cola:     { x: 0.80, y: 0.76, label: "Tareas" },
      backup:   { x: 0.22, y: 0.94, label: "Backups" },
    },
  };

  const EDGES = [
    ["web", "api"],
    ["api", "reservas"],
    ["api", "pagos"],
    ["api", "db"],
    ["api", "avisos"],
    ["reservas", "db"],
    ["pagos", "db"],
    ["web", "auth"],
    ["auth", "api"],
    ["cola", "avisos"],
    ["db", "backup"],
    ["cola", "db"],
  ];

  let W = 0;
  let H = 0;
  let dpr = 1;
  let nodes = {};
  let paths = [];

  function elbow(a, b, i) {
    // Ruta en "L" como en un diagrama de arquitectura; alterna el codo según la arista.
    const mid = i % 2 === 0 ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
    const pts = [a, mid, b];
    const segs = [];
    let total = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const len = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y);
      segs.push(len);
      total += len;
    }
    return { pts, segs, total };
  }

  function pointAt(path, t) {
    let d = t * path.total;
    for (let k = 0; k < path.segs.length; k++) {
      if (d <= path.segs[k] || k === path.segs.length - 1) {
        const f = path.segs[k] === 0 ? 0 : d / path.segs[k];
        const p = path.pts[k];
        const q = path.pts[k + 1];
        return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
      }
      d -= path.segs[k];
    }
    return path.pts[path.pts.length - 1];
  }

  function layout() {
    const rect = hero.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const set = W < 760 ? LAYOUTS.narrow : LAYOUTS.wide;
    nodes = {};
    for (const [key, n] of Object.entries(set)) {
      nodes[key] = { x: n.x * W, y: n.y * H, label: n.label };
    }
    paths = EDGES.map(([a, b], i) => ({
      ...elbow(nodes[a], nodes[b], i),
      speed: 0.00016 + (i % 3) * 0.00005,
      offset: i * 0.17,
    }));
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Conexiones
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(201, 212, 255, 0.28)";
    for (const p of paths) {
      ctx.beginPath();
      ctx.moveTo(p.pts[0].x, p.pts[0].y);
      for (let k = 1; k < p.pts.length; k++) ctx.lineTo(p.pts[k].x, p.pts[k].y);
      ctx.stroke();
    }

    // Peticiones (ida) y respuestas (vuelta)
    const t = reduceMotion.matches ? 0 : time;
    paths.forEach((p, i) => {
      for (let n = 0; n < 2; n++) {
        let f = (t * p.speed + p.offset + n * 0.5) % 1;
        if (n === 1) f = 1 - f;
        const pt = pointAt(p, f);
        ctx.beginPath();
        ctx.fillStyle = n === 0 ? "rgba(35, 71, 200, 0.45)" : "rgba(159, 177, 245, 0.25)";
        ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = n === 0 ? "#FFFFFF" : "#9FB1F5";
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Servicios
    ctx.font = '600 14px "Schibsted Grotesk", system-ui, sans-serif';
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (const n of Object.values(nodes)) {
      const w = ctx.measureText(n.label).width + 28;
      const h = 34;
      roundRect(n.x - w / 2, n.y - h / 2, w, h, 10);
      ctx.fillStyle = "#1E2D3C";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(201, 212, 255, 0.7)";
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(n.label, n.x, n.y + 1);
    }
  }

  /* ---------- 3. La lupa ---------- */
  const lens = { x: 0, y: 0, r: 0 };
  const target = { x: 0, y: 0, r: 0 };
  let touched = false;

  const radius = () => Math.max(110, Math.min(210, W * 0.17));

  function setFromEvent(e) {
    const rect = hero.getBoundingClientRect();
    target.x = e.clientX - rect.left;
    target.y = e.clientY - rect.top;
    target.r = radius();
  }

  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && !touched) return;
    setFromEvent(e);
  });

  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") touched = true;
    setFromEvent(e);
  });

  hero.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") target.r = 0;
  });

  function restingLens() {
    // Posición de reposo para táctil sin animación o movimiento reducido.
    target.x = W < 760 ? W * 0.62 : W * 0.76;
    target.y = H * 0.42;
    target.r = radius();
  }

  /* ---------- 4. Bucle ---------- */
  let running = false;
  let rafId = 0;

  function frame(time) {
    if (noHover.matches && !touched) {
      if (reduceMotion.matches) {
        restingLens();
      } else {
        target.x = W * (0.5 + 0.3 * Math.sin(time * 0.00035));
        target.y = H * (0.45 + 0.22 * Math.sin(time * 0.0005 + 1));
        target.r = radius();
      }
    }

    const k = reduceMotion.matches ? 1 : 0.16;
    lens.x += (target.x - lens.x) * k;
    lens.y += (target.y - lens.y) * k;
    lens.r += (target.r - lens.r) * k;
    if (Math.abs(lens.r) < 0.5 && target.r === 0) lens.r = 0;

    back.style.clipPath = `circle(${lens.r.toFixed(1)}px at ${lens.x.toFixed(1)}px ${lens.y.toFixed(1)}px)`;
    ring.style.width = ring.style.height = `${(lens.r * 2).toFixed(1)}px`;
    ring.style.transform = `translate(${(lens.x - lens.r).toFixed(1)}px, ${(lens.y - lens.r).toFixed(1)}px)`;
    ring.style.opacity = lens.r > 4 ? "1" : "0";

    if (lens.r > 0) draw(time);

    if (running) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  layout();
  lens.x = target.x = W * 0.7;
  lens.y = target.y = H * 0.45;

  new ResizeObserver(layout).observe(hero);

  new IntersectionObserver(([entry]) => {
    entry.isIntersecting ? start() : stop();
  }).observe(hero);

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layout);
  }
})();
