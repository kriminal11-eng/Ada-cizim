// Harf / rakam izleme ekranı.
// Çocuk, yeşil başlangıç noktasından başlayıp oku takip ederek çizer;
// parmağı yolun üzerinde ilerledikçe seçtiği kalemle renklenir.

import { sfx } from './audio.js';
import { burst } from './effects.js';

const W = 1400, H = 1050;
const GW = 100, GH = 130;
const S = (H * 0.86) / GH;
const OX = (W - GW * S) / 2, OY = (H - GH * S) / 2;
const tx = (x) => OX + x * S;
const ty = (y) => OY + y * S;

const STEP = 0.8;   // örnekleme aralığı (harf birimi)
const TOL = 12;     // yoldan ne kadar uzak sayılır (harf birimi)
const LOOK = 16;    // bir anda en fazla ne kadar ileri atlanabilir
const TAU = Math.PI * 2;

const measure = document.getElementById('measure');

function samplePath(d) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', d);
  measure.appendChild(el);
  const L = el.getTotalLength();
  const n = Math.max(2, Math.ceil(L / STEP) + 1);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const q = el.getPointAtLength((L * i) / (n - 1));
    pts.push({ x: tx(q.x), y: ty(q.y) });
  }
  el.remove();
  pts.len = L;
  return pts;
}

const seeded = (k) => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };

export const INKS = [
  { id: 'rainbow', label: '🌈', name: 'Gökkuşağı' },
  { id: 'gold', label: '✨', name: 'Simli' },
  { id: 'neon', label: '💖', name: 'Neon' },
  { id: '#ff3b30', name: 'Kırmızı' },
  { id: '#007aff', name: 'Mavi' },
  { id: '#34c759', name: 'Yeşil' },
  { id: '#8e5cf7', name: 'Mor' },
  { id: '#ff9500', name: 'Turuncu' },
];

export class Tracer {
  constructor(canvas, { onDone } = {}) {
    this.cv = canvas;
    canvas.width = W; canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.bg.width = W; this.bg.height = H;
    this.bgx = this.bg.getContext('2d');
    this.onDone = onDone || (() => {});
    this.ink = 'rainbow';
    this.strokes = [];
    this.raf = null;
    this.pid = null;

    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', (e) => this._up(e));
    canvas.addEventListener('pointercancel', (e) => this._up(e));
  }

  load(item) {
    this.item = item;
    this.strokes = item.strokes.map(samplePath);
    this.restart();
  }

  restart() {
    this.cur = 0;
    this.prog = 0;
    this.done = false;
    this.demo = null;
    this.lastNote = 0;
    this.dirty = true;
    this.start();
  }

  setInk(id) { this.ink = id; this.dirty = true; }

  start() {
    if (this.raf) return;
    const loop = (t) => { this.draw(t / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  showDemo() {
    if (this.done) return;
    this.demo = { i: this.cur, t0: performance.now() / 1000 };
  }

  // ---- dokunma ------------------------------------------------------------

  _pt(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }

  _down(e) {
    if (this.pid !== null || this.done) return;
    e.preventDefault();
    this.demo = null;
    this.pid = e.pointerId;
    try { this.cv.setPointerCapture(e.pointerId); } catch { /* yok say */ }
    this._track(this._pt(e));
  }

  _move(e) {
    if (e.pointerId !== this.pid) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of evs.length ? evs : [e]) this._track(this._pt(ev));
  }

  _up(e) {
    if (e.pointerId === this.pid) this.pid = null;
  }

  _track(p) {
    if (this.done) return;
    const pts = this.strokes[this.cur];
    if (!pts) return;
    const tol = TOL * S;
    const tol2 = tol * tol;
    const end = Math.min(pts.length - 1, this.prog + Math.round(LOOK / STEP));
    let best = -1;
    for (let j = this.prog; j <= end; j++) {
      const dx = pts[j].x - p.x, dy = pts[j].y - p.y;
      if (dx * dx + dy * dy <= tol2) best = j;
    }
    if (best > this.prog) {
      this.prog = best;
      this.dirty = true;
      const step = Math.floor((best * STEP) / 14);
      if (step > this.lastNote) { this.lastNote = step; sfx.note(step); }
    }
    if (this.prog >= pts.length - 1 - Math.round(2 / STEP)) {
      this.prog = pts.length - 1;
      this._strokeDone();
    }
  }

  _toClient(pt) {
    const r = this.cv.getBoundingClientRect();
    return { x: r.left + (pt.x * r.width) / W, y: r.top + (pt.y * r.height) / H };
  }

  _strokeDone() {
    const pts = this.strokes[this.cur];
    const c = this._toClient(pts[pts.length - 1]);
    burst(c.x, c.y, { n: 16, speed: 6 });
    sfx.chime(this.cur * 2);
    this.cur++;
    this.prog = 0;
    this.lastNote = 0;
    this.dirty = true;
    this.pid = null;
    if (this.cur >= this.strokes.length) {
      this.done = true;
      this.onDone(this.item);
    }
  }

  // ---- çizim --------------------------------------------------------------

  _path(c, pts, a, b) {
    c.beginPath();
    c.moveTo(pts[a].x, pts[a].y);
    for (let k = a + 1; k <= b; k++) c.lineTo(pts[k].x, pts[k].y);
    if (a === b) c.lineTo(pts[a].x + 0.1, pts[a].y);
  }

  _ink(c, pts, upto) {
    if (upto < 1 && pts.length > 2) return;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = 11 * S;
    const ink = this.ink;
    if (ink === 'rainbow') {
      const chunk = 4;
      for (let a = 0; a < upto; a += chunk) {
        c.strokeStyle = `hsl(${(a * 2.2) % 360},92%,56%)`;
        this._path(c, pts, a, Math.min(a + chunk, upto));
        c.stroke();
      }
    } else if (ink === 'gold') {
      this._path(c, pts, 0, upto);
      c.strokeStyle = '#f2b100';
      c.stroke();
      c.lineWidth = 4 * S;
      c.strokeStyle = '#ffe680';
      c.stroke();
    } else if (ink === 'neon') {
      this._path(c, pts, 0, upto);
      c.shadowColor = '#ff2d9a';
      c.shadowBlur = 5 * S;
      c.strokeStyle = '#ff3fa4';
      c.stroke();
      c.stroke();
      c.shadowBlur = 0;
      c.lineWidth = 3.5 * S;
      c.strokeStyle = '#fff';
      c.stroke();
    } else {
      this._path(c, pts, 0, upto);
      c.strokeStyle = ink;
      c.stroke();
      c.translate(-1.6 * S, -1.6 * S);
      c.lineWidth = 3 * S;
      c.strokeStyle = 'rgba(255,255,255,0.45)';
      c.stroke();
    }
    c.restore();
  }

  _twinkles(c, pts, upto, t) {
    for (let k = 0; k <= upto; k += 6) {
      const r1 = seeded(k + 1), r2 = seeded(k + 7);
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + k);
      const x = pts[k].x + (r1 - 0.5) * 9 * S, y = pts[k].y + (r2 - 0.5) * 9 * S;
      const r = (1.2 + 2.4 * tw) * S;
      c.fillStyle = '#fff';
      c.beginPath();
      c.moveTo(x, y - r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.quadraticCurveTo(x, y, x, y + r);
      c.quadraticCurveTo(x, y, x - r, y);
      c.quadraticCurveTo(x, y, x, y - r);
      c.fill();
    }
  }

  _renderStatic() {
    const c = this.bgx;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#fffdf7';
    c.fillRect(0, 0, W, H);

    // Defter çizgileri
    c.lineWidth = 4;
    c.strokeStyle = '#ffc6de';
    for (const yy of [20, 110]) {
      c.beginPath(); c.moveTo(40, ty(yy)); c.lineTo(W - 40, ty(yy)); c.stroke();
    }
    c.setLineDash([18, 14]);
    c.strokeStyle = '#bfe0ff';
    c.beginPath(); c.moveTo(40, ty(65)); c.lineTo(W - 40, ty(65)); c.stroke();
    c.setLineDash([]);

    // Harfin gölge yolu
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const [w, col] of [[19, '#d9ccef'], [15.5, '#f4effb']]) {
      c.lineWidth = w * S;
      c.strokeStyle = col;
      for (const pts of this.strokes) { this._path(c, pts, 0, pts.length - 1); c.stroke(); }
    }

    // Henüz çizilmemiş kısımlar: kesik çizgi
    c.setLineDash([2.2 * S, 2.8 * S]);
    c.lineWidth = 1.3 * S;
    c.strokeStyle = '#b3a2d4';
    this.strokes.forEach((pts, i) => {
      if (i < this.cur) return;
      const from = i === this.cur ? this.prog : 0;
      if (from < pts.length - 1) { this._path(c, pts, from, pts.length - 1); c.stroke(); }
    });
    c.setLineDash([]);

    // Çizilen kısımlar
    this.strokes.forEach((pts, i) => {
      if (i < this.cur) this._ink(c, pts, pts.length - 1);
      else if (i === this.cur && this.prog > 0) this._ink(c, pts, this.prog);
    });
    this.dirty = false;
  }

  draw(t) {
    if (this.dirty) this._renderStatic();
    const c = this.ctx;
    c.drawImage(this.bg, 0, 0);

    if (this.ink === 'gold') {
      this.strokes.forEach((pts, i) => {
        if (i < this.cur) this._twinkles(c, pts, pts.length - 1, t);
        else if (i === this.cur && this.prog > 0) this._twinkles(c, pts, this.prog, t);
      });
    }

    if (!this.done && this.strokes[this.cur]) {
      const pts = this.strokes[this.cur];
      const n = pts.length;
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);

      // Yön oku
      if (pts.len > 6) {
        const ia = Math.min(this.prog + Math.round(10 / STEP), n - 1);
        const ib = Math.min(ia + Math.round(3 / STEP), n - 1);
        const ia2 = ib === ia ? Math.max(0, ia - Math.round(3 / STEP)) : ia;
        const ang = Math.atan2(pts[ib].y - pts[ia2].y, pts[ib].x - pts[ia2].x);
        if (ia > this.prog + 2) {
          const ap = pts[ia];
          c.save();
          c.translate(ap.x, ap.y);
          c.rotate(ang);
          c.globalAlpha = 0.55 + 0.45 * pulse;
          c.fillStyle = '#8e5cf7';
          c.beginPath();
          c.moveTo(5 * S, 0);
          c.lineTo(-3.5 * S, -4.5 * S);
          c.lineTo(-1.5 * S, 0);
          c.lineTo(-3.5 * S, 4.5 * S);
          c.closePath();
          c.fill();
          c.restore();
        }
      }

      if (this.prog === 0) {
        // Başlangıç noktası (numaralı yeşil daire)
        const p0 = pts[0];
        const r = (8 + pulse * 1.5) * S;
        c.save();
        c.fillStyle = 'rgba(65,201,122,0.25)';
        c.beginPath(); c.arc(p0.x, p0.y, r * 1.5, 0, TAU); c.fill();
        c.fillStyle = '#41c97a';
        c.strokeStyle = '#fff';
        c.lineWidth = 1.4 * S;
        c.beginPath(); c.arc(p0.x, p0.y, r, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#fff';
        c.font = `bold ${11 * S}px ui-rounded, system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(this.cur + 1), p0.x, p0.y + 0.6 * S);
        c.restore();
      } else {
        // Parmağın gideceği nokta
        const pp = pts[this.prog];
        c.save();
        c.fillStyle = '#fff';
        c.strokeStyle = '#8e5cf7';
        c.lineWidth = 1.6 * S;
        c.beginPath(); c.arc(pp.x, pp.y, (6 + pulse) * S, 0, TAU); c.fill(); c.stroke();
        c.restore();
      }
    }

    // "Göster" animasyonu: yıldız yolu gezer
    if (this.demo) {
      const dm = this.demo;
      const pts = this.strokes[dm.i];
      if (!pts) { this.demo = null; return; }
      const dur = Math.max(0.5, pts.len / 75);
      const frac = Math.max(0, Math.min(1, (t - dm.t0) / dur));
      const idx = Math.floor(frac * (pts.length - 1));
      c.save();
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = 4 * S;
      c.strokeStyle = 'rgba(142,92,247,0.55)';
      this._path(c, pts, 0, Math.max(idx, 0));
      c.stroke();
      c.font = `${20 * S}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('⭐', pts[idx].x, pts[idx].y);
      c.restore();
      if (frac >= 1) {
        dm.i++;
        dm.t0 = t + 0.35;
        if (dm.i >= this.strokes.length) this.demo = null;
      }
    }
  }
}
