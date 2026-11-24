// Çizim tahtası: boya katmanı (altta) + kontur katmanı (üstte).
// Kalemler, boya kovası, damga, silgi ve geri alma burada.

import { sfx } from './audio.js';
import { svgUrl } from './pages.js';

export const BOARD_W = 1400;
export const BOARD_H = 1050;

const SIZES = {
  pen: [10, 22, 44],
  glitter: [16, 30, 54],
  neon: [10, 20, 36],
  spray: [30, 55, 90],
  eraser: [26, 50, 96],
  stamp: [80, 130, 200],
  fill: [0, 0, 0],
};

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const fn = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(fn(0) * 255), Math.round(fn(8) * 255), Math.round(fn(4) * 255)];
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export class Board {
  constructor(el) {
    this.el = el;
    this.W = BOARD_W;
    this.H = BOARD_H;
    this.paint = this._canvas('paint');
    this.outline = this._canvas('outline');
    el.append(this.paint, this.outline);
    this.pctx = this.paint.getContext('2d');
    this.octx = this.outline.getContext('2d');
    this.snap = this._canvas('snap');
    this.sctx = this.snap.getContext('2d');
    this.nbase = this._canvas('nbase'); // neon kalem için çizgi öncesi görüntü
    this.nctx = this.nbase.getContext('2d');

    this.tool = 'pen';
    this.color = '#ff3b30';
    this.sizeIdx = 1;
    this.stamp = '⭐';
    this.paper = '#ffffff';
    this.wall = null;
    this.undoStack = [];
    this.dirty = false;
    this.pointerId = null;
    this.hue = 0;
    this.onChange = () => {};

    el.addEventListener('pointerdown', (e) => this._down(e));
    el.addEventListener('pointermove', (e) => this._move(e));
    el.addEventListener('pointerup', (e) => this._up(e));
    el.addEventListener('pointercancel', (e) => this._up(e));
    this.reset();
  }

  _canvas(cls) {
    const c = document.createElement('canvas');
    c.width = this.W;
    c.height = this.H;
    c.className = cls;
    return c;
  }

  get size() { return (SIZES[this.tool] || SIZES.pen)[this.sizeIdx]; }

  reset({ paper = '#ffffff' } = {}) {
    this.paper = paper;
    this.pctx.fillStyle = paper;
    this.pctx.fillRect(0, 0, this.W, this.H);
    this.octx.clearRect(0, 0, this.W, this.H);
    this.wall = null;
    this.undoStack = [];
    this.dirty = false;
    this.onChange();
  }

  /** SVG çizimini konturlara çevirir ve boyama sınırlarını hesaplar. */
  async setOutline(svg) {
    this.octx.clearRect(0, 0, this.W, this.H);
    this.wall = null;
    if (!svg) return;
    const img = await loadImage(svgUrl(svg));
    const t = document.createElement('canvas');
    t.width = this.W; t.height = this.H;
    const tc = t.getContext('2d');
    tc.fillStyle = '#fff';
    tc.fillRect(0, 0, this.W, this.H);
    tc.drawImage(img, 0, 0, this.W, this.H);
    const id = tc.getImageData(0, 0, this.W, this.H);
    const d = id.data;
    const wall = new Uint8Array(this.W * this.H);
    for (let i = 0, j = 0; i < wall.length; i++, j += 4) {
      const a = 255 - (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000;
      d[j] = 38; d[j + 1] = 30; d[j + 2] = 52; d[j + 3] = a;
      if (a > 110) wall[i] = 1;
    }
    this.octx.putImageData(id, 0, 0);
    this.wall = wall;
  }

  async loadPaint(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      this.pctx.drawImage(img, 0, 0, this.W, this.H);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ---- dokunma ------------------------------------------------------------

  _pt(e) {
    const r = this.paint.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * this.W) / r.width, y: ((e.clientY - r.top) * this.H) / r.height };
  }

  _down(e) {
    if (this.pointerId !== null) return; // ikinci parmağı / avucu yok say
    e.preventDefault();
    const p = this._pt(e);
    if (this.tool === 'fill') { this.fill(p.x, p.y); return; }
    if (this.tool === 'stamp') { this._begin(); this._stampAt(p); this._end(); return; }
    this.pointerId = e.pointerId;
    try { this.el.setPointerCapture(e.pointerId); } catch { /* yok say */ }
    this._begin();
    this.last = p;
    this.lastMid = p;
    this._dot(p);
  }

  _move(e) {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of evs.length ? evs : [e]) this._seg(this._pt(ev));
  }

  _up(e) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.nb = null;
    this._end();
  }

  // ---- geri alma ----------------------------------------------------------

  _begin() {
    this.sctx.drawImage(this.paint, 0, 0);
    this.bb = null;
  }

  _grow(x, y, m) {
    const b = this.bb;
    if (!b) this.bb = { x0: x - m, y0: y - m, x1: x + m, y1: y + m };
    else {
      if (x - m < b.x0) b.x0 = x - m;
      if (y - m < b.y0) b.y0 = y - m;
      if (x + m > b.x1) b.x1 = x + m;
      if (y + m > b.y1) b.y1 = y + m;
    }
  }

  _end() {
    const b = this.bb;
    this.bb = null;
    if (!b) return;
    const x0 = Math.max(0, Math.floor(b.x0)), y0 = Math.max(0, Math.floor(b.y0));
    const x1 = Math.min(this.W, Math.ceil(b.x1)), y1 = Math.min(this.H, Math.ceil(b.y1));
    if (x1 <= x0 || y1 <= y0) return;
    this._pushUndo(x0, y0, this.sctx.getImageData(x0, y0, x1 - x0, y1 - y0));
  }

  _pushUndo(x, y, img) {
    this.undoStack.push({ x, y, img });
    if (this.undoStack.length > 40) this.undoStack.shift();
    this.dirty = true;
    this.onChange();
  }

  canUndo() { return this.undoStack.length > 0; }

  undo() {
    const u = this.undoStack.pop();
    if (!u) return false;
    this.pctx.putImageData(u.img, u.x, u.y);
    this.dirty = true;
    this.onChange();
    return true;
  }

  clear() {
    this._begin();
    this.pctx.fillStyle = this.paper;
    this.pctx.fillRect(0, 0, this.W, this.H);
    this.bb = { x0: 0, y0: 0, x1: this.W, y1: this.H };
    this._end();
  }

  // ---- fırçalar -----------------------------------------------------------

  _color() {
    return this.color === 'rainbow' ? `hsl(${this.hue | 0},95%,55%)` : this.color;
  }

  _rgb() {
    return this.color === 'rainbow' ? hslToRgb(Math.random() * 360, 95, 58) : hexToRgb(this.color);
  }

  _dot(p) {
    const c = this.pctx, s = this.size;
    switch (this.tool) {
      case 'neon':
        this.nctx.drawImage(this.paint, 0, 0);
        this.npts = [{ x: p.x, y: p.y, h: this.hue }];
        this._neon();
        break;
      case 'pen':
      case 'eraser':
        this._curve(p, p, { x: p.x + 0.01, y: p.y });
        break;
      case 'glitter':
        this._glitter(p, p);
        break;
      case 'spray':
        this._spray(p);
        break;
      default:
        c.fillStyle = this._color();
        c.beginPath(); c.arc(p.x, p.y, s / 2, 0, Math.PI * 2); c.fill();
        this._grow(p.x, p.y, s);
    }
  }

  _seg(p) {
    const last = this.last;
    const d = Math.hypot(p.x - last.x, p.y - last.y);
    if (d < 1.5) return;
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    switch (this.tool) {
      case 'neon':
        this.npts.push({ x: p.x, y: p.y, h: this.hue });
        this._neon();
        break;
      case 'pen':
      case 'eraser':
        this._curve(this.lastMid, last, mid);
        break;
      case 'glitter':
        this._glitter(last, p);
        break;
      case 'spray':
        this._spray(p);
        break;
    }
    this.hue = (this.hue + d * 0.35) % 360;
    this.last = p;
    this.lastMid = mid;
  }

  _curve(a, ctrl, b) {
    const c = this.pctx, s = this.size;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = s;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y);
    c.strokeStyle = this.tool === 'eraser' ? this.paper : this._color();
    c.stroke();
    c.restore();
    const m = s * 0.6 + 2;
    this._grow(a.x, a.y, m); this._grow(ctrl.x, ctrl.y, m); this._grow(b.x, b.y, m);
  }

  /** Neon: parlayan çizgiyi her harekette baştan, tek parça çizer. */
  _neon() {
    const c = this.pctx, s = this.size, pts = this.npts;
    const last = pts[pts.length - 1];
    const m = s * 2.6 + 4;
    this._grow(last.x, last.y, m);
    if (!this.nb) this.nb = { x0: last.x - m, y0: last.y - m, x1: last.x + m, y1: last.y + m };
    else {
      const b = this.nb;
      b.x0 = Math.min(b.x0, last.x - m); b.y0 = Math.min(b.y0, last.y - m);
      b.x1 = Math.max(b.x1, last.x + m); b.y1 = Math.max(b.y1, last.y + m);
    }
    const b = this.nb;
    const x0 = Math.max(0, Math.floor(b.x0)), y0 = Math.max(0, Math.floor(b.y0));
    const w = Math.min(this.W, Math.ceil(b.x1)) - x0, h = Math.min(this.H, Math.ceil(b.y1)) - y0;
    if (w <= 0 || h <= 0) return;
    c.drawImage(this.nbase, x0, y0, w, h, x0, y0, w, h);

    const path = (from, to) => {
      c.beginPath();
      c.moveTo(pts[from].x, pts[from].y);
      if (from === to) { c.lineTo(pts[from].x + 0.01, pts[from].y); return; }
      for (let i = from + 1; i < to; i++) {
        c.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
      }
      c.lineTo(pts[to].x, pts[to].y);
    };
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = s;
    c.shadowBlur = s * 1.3;
    if (this.color === 'rainbow') {
      for (let i = 0; i < pts.length; i += 3) {
        const col = `hsl(${pts[i].h | 0},95%,55%)`;
        c.strokeStyle = col; c.shadowColor = col;
        path(i, Math.min(i + 3, pts.length - 1));
        c.stroke();
      }
    } else {
      c.strokeStyle = this.color; c.shadowColor = this.color;
      path(0, pts.length - 1);
      c.stroke();
    }
    c.shadowBlur = 0;
    c.lineWidth = s * 0.38;
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    path(0, pts.length - 1);
    c.stroke();
    c.restore();

    // Çok uzun çizgilerde yavaşlamasın: buraya kadarını sabitle.
    if (pts.length > 240) {
      this.nctx.drawImage(this.paint, 0, 0);
      this.npts = pts.slice(-2);
      this.nb = null;
    }
  }

  _glitter(a, b) {
    const c = this.pctx, s = this.size;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(d / 4));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      for (let k = 0; k < 3; k++) {
        const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * s * 0.5;
        const [r0, g0, b0] = this._rgb();
        const f = 0.7 + Math.random() * 0.6;
        c.fillStyle = `rgb(${clamp255(r0 * f + 20)},${clamp255(g0 * f + 20)},${clamp255(b0 * f + 20)})`;
        c.beginPath();
        c.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 1.5 + Math.random() * 3, 0, Math.PI * 2);
        c.fill();
      }
      if (Math.random() < 0.14) {
        const ang = Math.random() * Math.PI * 2, rr = Math.random() * s * 0.5;
        this._sparkle(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, s * (0.2 + Math.random() * 0.2));
      }
      this._grow(x, y, s * 0.8 + 4);
    }
  }

  _sparkle(x, y, r) {
    const c = this.pctx;
    c.save();
    c.fillStyle = '#fff';
    c.shadowColor = 'rgba(255,255,255,0.9)';
    c.shadowBlur = r;
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
    c.restore();
  }

  _spray(p) {
    const c = this.pctx, s = this.size;
    const n = Math.round(s * 0.7);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * s;
      c.fillStyle = this.color === 'rainbow' ? `hsl(${(this.hue + Math.random() * 60) | 0},95%,55%)` : this.color;
      c.fillRect(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, 2.6, 2.6);
    }
    this._grow(p.x, p.y, s + 4);
  }

  _stampAt(p) {
    const c = this.pctx, s = this.size;
    c.save();
    c.translate(p.x, p.y);
    c.rotate((Math.random() - 0.5) * 0.5);
    c.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(this.stamp, 0, 0);
    c.restore();
    this._grow(p.x, p.y, s * 0.85);
    sfx.stamp();
  }

  // ---- boya kovası --------------------------------------------------------

  _nearestOpen(x, y, maxR) {
    const W = this.W, H = this.H, wall = this.wall;
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          if (!wall[yy * W + xx]) return yy * W + xx;
        }
      }
    }
    return -1;
  }

  fill(fx, fy) {
    const W = this.W, H = this.H;
    const x = Math.floor(fx), y = Math.floor(fy);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const wall = this.wall;
    let start = y * W + x;
    if (wall && wall[start]) {
      start = this._nearestOpen(x, y, 24);
      if (start < 0) return;
    }
    const img = this.pctx.getImageData(0, 0, W, H);
    const d = img.data;
    const sr = d[start * 4], sg = d[start * 4 + 1], sb = d[start * 4 + 2];
    const TOL = 60;
    const mark = new Uint8Array(W * H);
    const ok = (i) => {
      if (mark[i] || (wall && wall[i])) return false;
      const j = i * 4;
      return Math.abs(d[j] - sr) + Math.abs(d[j + 1] - sg) + Math.abs(d[j + 2] - sb) <= TOL;
    };

    let minX = W, maxX = -1, minY = H, maxY = -1;
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (!ok(i)) continue;
      const py = (i / W) | 0;
      const row = py * W;
      let xl = i - row, xr = xl;
      while (xl > 0 && ok(row + xl - 1)) xl--;
      while (xr < W - 1 && ok(row + xr + 1)) xr++;
      for (let xx = xl; xx <= xr; xx++) mark[row + xx] = 1;
      if (xl < minX) minX = xl;
      if (xr > maxX) maxX = xr;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      for (const ny of [py - 1, py + 1]) {
        if (ny < 0 || ny >= H) continue;
        let inSpan = false;
        const nrow = ny * W;
        for (let xx = xl; xx <= xr; xx++) {
          if (ok(nrow + xx)) {
            if (!inSpan) { stack.push(nrow + xx); inSpan = true; }
          } else inSpan = false;
        }
      }
    }
    if (maxX < 0) return;

    // Kenarlarda beyaz boşluk kalmasın diye bölgeyi 2 piksel genişlet.
    const P = 2;
    minX = Math.max(0, minX - P); maxX = Math.min(W - 1, maxX + P);
    minY = Math.max(0, minY - P); maxY = Math.min(H - 1, maxY + P);
    for (let pass = 2; pass <= P + 1; pass++) {
      for (let yy = minY; yy <= maxY; yy++) {
        for (let xx = minX; xx <= maxX; xx++) {
          const i = yy * W + xx;
          if (mark[i]) continue;
          const n =
            (xx > 0 && mark[i - 1] && mark[i - 1] < pass) ||
            (xx < W - 1 && mark[i + 1] && mark[i + 1] < pass) ||
            (yy > 0 && mark[i - W] && mark[i - W] < pass) ||
            (yy < H - 1 && mark[i + W] && mark[i + W] < pass);
          if (n) mark[i] = pass;
        }
      }
    }

    // Geri alma için eski hâlini sakla.
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const before = new ImageData(bw, bh);
    for (let yy = 0; yy < bh; yy++) {
      const src = ((minY + yy) * W + minX) * 4;
      before.data.set(d.subarray(src, src + bw * 4), yy * bw * 4);
    }

    // Renk: düz renk ya da gökkuşağı.
    let lut = null, rgb = null;
    if (this.color === 'rainbow') {
      lut = [];
      for (let xx = 0; xx < bw; xx++) lut.push(hslToRgb((xx / Math.max(1, bw - 1)) * 300, 92, 60));
    } else rgb = hexToRgb(this.color);

    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const i = yy * W + xx;
        if (!mark[i]) continue;
        const col = lut ? lut[xx - minX] : rgb;
        const j = i * 4;
        d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
      }
    }
    this.pctx.putImageData(img, 0, 0, minX, minY, bw, bh);
    this._pushUndo(minX, minY, before);
    sfx.splash();
  }

  // ---- dışa aktarma -------------------------------------------------------

  composite() {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const x = c.getContext('2d');
    x.drawImage(this.paint, 0, 0);
    x.drawImage(this.outline, 0, 0);
    return c;
  }

  async toBlobs() {
    const full = this.composite();
    const th = document.createElement('canvas');
    th.width = 400; th.height = 300;
    th.getContext('2d').drawImage(full, 0, 0, 400, 300);
    const toBlob = (cv, type, q) => new Promise((res) => cv.toBlob(res, type, q));
    const [image, thumb, paint] = await Promise.all([
      toBlob(full, 'image/png'),
      toBlob(th, 'image/jpeg', 0.85),
      toBlob(this.paint, 'image/png'),
    ]);
    return { image, thumb, paint };
  }
}
