// Ekran üstü kutlama efektleri: konfeti ve yıldız patlaması.

const cv = document.getElementById('fx');
const ctx = cv.getContext('2d');
let parts = [];
let running = false;
let dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(innerWidth * dpr);
  cv.height = Math.round(innerHeight * dpr);
}
resize();
addEventListener('resize', resize);

const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#8e5cf7', '#ff6fb5'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function confetti(n = 150) {
  for (let i = 0; i < n; i++) {
    parts.push({
      type: Math.random() < 0.25 ? 'star' : 'rect',
      x: rnd(0, innerWidth), y: rnd(-innerHeight * 0.6, -10),
      vx: rnd(-1.5, 1.5), vy: rnd(2, 5), g: 0.03,
      rot: rnd(0, 6), vr: rnd(-0.2, 0.2),
      w: rnd(8, 16), h: rnd(5, 10), size: rnd(7, 13),
      color: pick(COLORS), life: 1, decay: 0, sway: rnd(0, 6),
    });
  }
  start();
}

export function burst(x, y, { n = 22, emoji = null, speed = 7, colors = COLORS } = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2);
    const s = rnd(speed * 0.4, speed);
    parts.push({
      type: emoji ? 'emoji' : 'star', emoji,
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.18,
      rot: rnd(0, 6), vr: rnd(-0.15, 0.15),
      size: emoji ? rnd(18, 30) : rnd(6, 13),
      color: pick(colors), life: 1, decay: rnd(0.015, 0.025),
    });
  }
  start();
}

function starPath(r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

function start() {
  if (running) return;
  running = true;
  requestAnimationFrame(tick);
}

function tick() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const keep = [];
  for (const p of parts) {
    p.vy += p.g;
    if (p.type === 'rect') { p.sway += 0.08; p.vx += Math.sin(p.sway) * 0.08; }
    p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
    if (p.life <= 0 || p.y > innerHeight + 40) continue;
    keep.push(p);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.type === 'rect') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.sway)));
    } else if (p.type === 'emoji') {
      ctx.font = `${p.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
    } else {
      ctx.fillStyle = p.color;
      starPath(p.size);
      ctx.fill();
    }
    ctx.restore();
  }
  parts = keep;
  if (parts.length) requestAnimationFrame(tick);
  else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}
