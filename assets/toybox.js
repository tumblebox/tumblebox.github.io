// Capsule machine on the home page: tap a capsule to pop it, turn the knob to shake.
(() => {
  const canvas = document.getElementById("toy");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const knob = document.getElementById("toy-knob");
  const counter = document.getElementById("toy-count");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const INK = "#1D1A3A";
  const COLORS = ["#FF5C93", "#5B3FD9", "#2FCB8A", "#FFB020", "#3BA7FF"];
  const COUNT = 15;
  const GRAVITY = 2200;
  const STEP = 1 / 120;

  let W = 0, H = 0;
  let balls = [];
  let bits = [];
  let popped = 0;
  let knobTurns = 0;
  let visible = true;
  let frame = 0;
  let lastTime = 0;
  let acc = 0;
  let calmFrames = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const b of balls) {
      b.x = Math.min(Math.max(b.x, b.r), W - b.r);
      b.y = Math.min(b.y, H - b.r);
    }
    draw();
  }

  function baseRadius() {
    return Math.max(16, Math.min(W, H) * 0.12);
  }

  function spawn(fromTop = true) {
    const r = baseRadius() * (0.82 + Math.random() * 0.3);
    balls.push({
      x: r + Math.random() * Math.max(1, W - 2 * r),
      y: fromTop ? -r - Math.random() * H * 0.6 : H - r,
      vx: (Math.random() - 0.5) * 80,
      vy: 0,
      r,
      a: Math.random() * Math.PI * 2,
      va: 0,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }

  function step(dt) {
    for (const b of balls) {
      b.vy += GRAVITY * dt;
      b.vx *= 0.999;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
    }

    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const min = a.r + b.r;
          if (dist === 0 || dist >= min) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const push = (min - dist) / 2;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const impulse = (-(1 + 0.3) * rel) / 2;
            a.vx -= impulse * nx; a.vy -= impulse * ny;
            b.vx += impulse * nx; b.vy += impulse * ny;
          }
        }
        if (a.x < a.r) { a.x = a.r; a.vx = Math.abs(a.vx) * 0.4; }
        if (a.x > W - a.r) { a.x = W - a.r; a.vx = -Math.abs(a.vx) * 0.4; }
        if (a.y > H - a.r) {
          a.y = H - a.r;
          if (a.vy > 0) a.vy = -a.vy * 0.28;
          a.vx *= 0.94;
          a.va = a.vx / a.r; // roll along the floor
        }
      }
    }

    for (const p of bits) {
      p.vy += GRAVITY * 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= dt;
    }
    bits = bits.filter((p) => p.life > 0);
  }

  function drawCapsule(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a);
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, b.r, Math.PI, Math.PI * 2);
    ctx.fillStyle = b.c;
    ctx.fill();
    ctx.fillStyle = "rgba(29, 26, 58, 0.22)";
    ctx.fillRect(-b.r, -b.r * 0.07, b.r * 2, b.r * 0.14);
    ctx.beginPath();
    ctx.arc(0, 0, b.r - 1.5, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(b.x - b.r * 0.38, b.y - b.r * 0.42, b.r * 0.24, b.r * 0.12, -0.7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const b of balls) drawCapsule(b);
    for (const p of bits) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
  }

  function settle() {
    for (let i = 0; i < 600; i++) step(STEP);
    draw();
  }

  function tick(time) {
    frame = 0;
    if (!visible) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 1 / 30) : STEP;
    lastTime = time;
    acc += dt;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    draw();

    // Sleep once everything has come to rest; any tap or knob turn wakes it again.
    const moving = bits.length > 0 || balls.some((b) => Math.abs(b.vx) + Math.abs(b.vy) > 12 || b.y < b.r);
    calmFrames = moving ? 0 : calmFrames + 1;
    if (calmFrames > 45) return;
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (reduceMotion || frame || !visible) return;
    lastTime = 0;
    calmFrames = 0;
    frame = requestAnimationFrame(tick);
  }

  function refill() {
    while (balls.length < COUNT) spawn(true);
    if (reduceMotion) settle();
    else start();
  }

  function pop(ball) {
    balls.splice(balls.indexOf(ball), 1);
    popped++;
    counter.textContent = popped === 1 ? "1 popped" : `${popped} popped`;
    if (!reduceMotion) {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 250 + Math.random() * 350;
        bits.push({
          x: ball.x, y: ball.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 250,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20,
          s: 8 + Math.random() * 8,
          c: i % 2 ? ball.c : COLORS[(COLORS.indexOf(ball.c) + 2) % COLORS.length],
          life: 0.7 + Math.random() * 0.3,
        });
      }
      setTimeout(refill, 450);
    } else {
      refill();
    }
    draw();
  }

  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (Math.hypot(b.x - x, b.y - y) <= b.r) { pop(b); start(); return; }
    }
    for (const b of balls) {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < 120) { b.vy -= 500 * (1 - d / 120); b.vx += (b.x - x) * 4; }
    }
    if (reduceMotion) settle();
    start();
  });

  knob.addEventListener("click", () => {
    knobTurns++;
    knob.style.transform = `rotate(${knobTurns * 180}deg)`;
    for (const b of balls) {
      b.vy -= 700 + Math.random() * 700;
      b.vx += (Math.random() - 0.5) * 900;
    }
    refill();
    if (reduceMotion) settle();
    start();
  });

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }).observe(canvas);

  new ResizeObserver(resize).observe(canvas);

  resize();
  for (let i = 0; i < COUNT; i++) spawn(true);
  if (reduceMotion) settle();
  else start();
})();
