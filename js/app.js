// Ada'nın Çizim Defteri — ekranlar arası geçiş ve düğmeler.

import { unlock, speak, sfx, isMuted, setMuted } from './audio.js';
import { confetti, burst } from './effects.js';
import { Board } from './drawing.js';
import { Tracer, INKS } from './trace.js';
import { PAGES, CATEGORIES, pageById, svgUrl } from './pages.js';
import { LETTERS, DIGITS } from './letters.js';
import * as db from './gallery.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

// ---- genel ----------------------------------------------------------------

const RAINBOW = ['#ff3b30', '#ff9500', '#f5b800', '#34c759', '#20b8d8', '#007aff', '#8e5cf7', '#ff4fa3'];
document.querySelectorAll('[data-rainbow]').forEach((h) => {
  let i = 0;
  h.innerHTML = [...h.dataset.rainbow]
    .map((ch) => (ch === ' ' ? ' ' : `<span style="color:${RAINBOW[i++ % RAINBOW.length]}">${ch}</span>`))
    .join('');
});

let current = 'splash';
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (current === 'trace' && id !== 'trace') tracer.stop();
  current = id;
}

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('contextmenu', (e) => e.preventDefault());

function fitToStage(stage, box) {
  const fit = () => {
    const r = stage.getBoundingClientRect();
    let w = r.width, h = (r.width * 3) / 4;
    if (h > r.height) { h = r.height; w = (h * 4) / 3; }
    box.style.width = Math.floor(w) + 'px';
    box.style.height = Math.floor(h) + 'px';
  };
  new ResizeObserver(fit).observe(stage);
  fit();
}

function dialog({ emoji = '', text = '', say = null, buttons = [] }) {
  return new Promise((resolve) => {
    const d = $('#dialog');
    d.innerHTML = '';
    const card = el('div', 'dlg-card');
    card.append(el('div', 'dlg-emoji', emoji), el('div', 'dlg-text', text));
    const row = el('div', 'dlg-btns');
    for (const b of buttons) {
      const btn = el('button', b.cls || 'btn wide', b.label);
      if (b.style) btn.style.cssText = b.style;
      btn.onclick = () => { sfx.pop(); d.classList.remove('open'); resolve(b.value); };
      row.append(btn);
    }
    card.append(row);
    d.append(card);
    d.classList.add('open');
    if (say) speak(say);
  });
}

const fmtDate = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

// ---- açılış + ana sayfa ----------------------------------------------------

$('#splash').addEventListener('click', () => {
  unlock();
  sfx.success();
  speak('Merhaba Ada! Bugün ne yapmak istersin?');
  db.persist();
  show('home');
});

function updateMute() { $('#btnMute').textContent = isMuted() ? '🔇' : '🔊'; }
updateMute();
$('#btnMute').onclick = () => { setMuted(!isMuted()); updateMute(); if (!isMuted()) speak('Ses açık'); };

document.querySelectorAll('[data-home]').forEach((b) => { b.onclick = () => { sfx.pop(); show('home'); }; });

const goActions = {
  letters: () => openPicker('letters'),
  digits: () => openPicker('digits'),
  pages: () => openPages(),
  free: () => startFree(),
  gallery: () => openGallery(),
};
document.querySelectorAll('[data-go]').forEach((b) => {
  b.onclick = () => {
    sfx.pop();
    speak(b.querySelector('.card-lbl').textContent);
    goActions[b.dataset.go]();
  };
});

// ---- yıldızlar (tamamlanan harfler) ----------------------------------------

let stars = {};
try { stars = JSON.parse(localStorage.getItem('ada-stars') || '{}'); } catch { stars = {}; }
const saveStars = () => { try { localStorage.setItem('ada-stars', JSON.stringify(stars)); } catch { /* yok say */ } };

// ---- harf / rakam seçimi ---------------------------------------------------

let traceMode = 'letters';
const traceList = () => (traceMode === 'letters' ? LETTERS : DIGITS);

function openPicker(mode) {
  traceMode = mode;
  $('#pickerTitle').textContent = mode === 'letters' ? 'Harfler' : 'Rakamlar';
  const grid = $('#pickGrid');
  grid.innerHTML = '';
  const list = traceList();
  list.forEach((item, i) => {
    const b = el('button', 'pick', item.ch);
    b.style.color = RAINBOW[i % RAINBOW.length];
    if (stars[item.ch]) b.append(el('span', 'badge', '⭐'));
    b.onclick = () => { sfx.pop(); openTrace(i); };
    grid.append(b);
  });
  const n = list.filter((it) => stars[it.ch]).length;
  $('#pickerStars').textContent = `⭐ ${n} / ${list.length}`;
  show('picker');
}

// ---- izleme ----------------------------------------------------------------

const tracer = new Tracer($('#traceCanvas'), { onDone: traceDone });
fitToStage($('#traceStage'), $('#traceBoard'));
let traceIdx = 0;

function itemSpeech(item) {
  if (traceMode === 'digits') return item.count ? `${item.say}. ${item.say} ${item.word}` : `${item.say}. Hiç yok!`;
  return `${item.say}. ${item.word}`;
}

function itemLabel(item) {
  if (traceMode === 'digits') return item.count ? item.emoji.repeat(item.count) : '🫙 Hiç yok!';
  return `${item.emoji} ${item.word}`;
}

function openTrace(i) {
  const list = traceList();
  traceIdx = (i + list.length) % list.length;
  const item = list[traceIdx];
  $('#traceWord').textContent = itemLabel(item);
  $('#donePop').classList.remove('open');
  show('trace');
  tracer.load(item);
  speak(itemSpeech(item));
  setTimeout(() => { if (current === 'trace' && tracer.item === item) tracer.showDemo(); }, 900);
}

function traceDone(item) {
  stars[item.ch] = true;
  saveStars();
  confetti(120);
  sfx.success();
  const praise = ['Harika', 'Süper', 'Aferin', 'Çok güzel', 'Bravo'][Math.floor(Math.random() * 5)];
  speak(`${praise} Ada! ${traceMode === 'letters' ? item.say + ' harfini' : item.say + ' rakamını'} yazdın!`);
  $('#doneEmoji').textContent = traceMode === 'letters' ? item.emoji : '⭐';
  $('#doneText').textContent = `${praise}! ${item.ch}`;
  setTimeout(() => $('#donePop').classList.add('open'), 700);
}

const ink = $('#inkPalette');
INKS.forEach((k, i) => {
  const b = el('button', 'swatch' + (i === 0 ? ' active' : ''));
  if (k.label) { b.classList.add(k.id === 'rainbow' ? 'rainbow' : 'emoji'); if (k.id !== 'rainbow') b.textContent = k.label; }
  else b.style.background = k.id;
  if (k.id === 'gold') b.style.background = 'linear-gradient(135deg,#fff3a6,#f2b100)';
  if (k.id === 'neon') b.style.background = 'radial-gradient(#fff 0 25%, #ff3fa4 60%)';
  b.onclick = () => {
    sfx.tap();
    ink.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
    b.classList.add('active');
    tracer.setInk(k.id);
    speak(k.name);
  };
  ink.append(b);
});

$('#traceBack').onclick = () => { sfx.pop(); openPicker(traceMode); };
$('#btnSay').onclick = () => speak(itemSpeech(tracer.item));
$('#btnShow').onclick = () => { sfx.tap(); tracer.showDemo(); };
$('#btnRetry').onclick = () => { sfx.undo(); $('#donePop').classList.remove('open'); tracer.restart(); };
$('#tracePrev').onclick = () => { sfx.pop(); openTrace(traceIdx - 1); };
$('#traceNext').onclick = () => { sfx.pop(); openTrace(traceIdx + 1); };
$('#doneAgain').onclick = () => { sfx.pop(); $('#donePop').classList.remove('open'); tracer.restart(); };
$('#doneNext').onclick = () => { sfx.pop(); openTrace(traceIdx + 1); };

// ---- boyama sayfası seçimi -------------------------------------------------

let currentCat = CATEGORIES[0].id;

function renderPages() {
  const tabs = $('#catTabs');
  tabs.innerHTML = '';
  for (const cat of CATEGORIES) {
    const t = el('button', 'cat-tab' + (cat.id === currentCat ? ' active' : ''), `<span class="ce">${cat.emoji}</span><span class="cn">${cat.name}</span>`);
    t.onclick = () => { sfx.tap(); speak(cat.name); currentCat = cat.id; renderPages(); };
    tabs.append(t);
  }
  const grid = $('#pageGrid');
  grid.innerHTML = '';
  for (const pg of PAGES.filter((x) => x.cat === currentCat)) {
    const b = el('button', 'page-tile');
    const img = el('img');
    img.src = svgUrl(pg.svg);
    img.alt = pg.name;
    b.append(img, el('div', 'pn', pg.name));
    b.onclick = () => { sfx.pop(); speak(pg.name); openDraw({ pageId: pg.id }); };
    grid.append(b);
  }
  $('#pages .scroll').scrollTop = 0;
}

function openPages() { renderPages(); show('pages'); }

// ---- çizim / boyama --------------------------------------------------------

const board = new Board($('#drawBoard'));
fitToStage($('#drawStage'), $('#drawBoard'));
let drawState = null;

const TOOLS = [
  { id: 'pen', icon: '✏️', name: 'Kalem' },
  { id: 'glitter', icon: '✨', name: 'Simli' },
  { id: 'neon', icon: '💡', name: 'Neon' },
  { id: 'spray', icon: '💨', name: 'Sprey' },
  { id: 'fill', icon: '🪣', name: 'Boya' },
  { id: 'stamp', icon: '🌟', name: 'Damga' },
  { id: 'eraser', icon: '🧽', name: 'Silgi' },
];
const COLORS = [
  '#ff3b30', '#ff9500', '#ffcc00', '#8bd346', '#34c759', '#1fb5a8', '#5ac8fa', '#007aff', '#8e5cf7',
  '#ff6fb5', '#ffb3d9', '#a2672d', '#ffd1a4', '#8e8e93', '#1c1c1e', '#ffffff', 'rainbow',
];
const STAMPS = ['⭐', '❤️', '🌸', '🦋', '🌈', '☀️', '🍓', '🐞', '🎈', '👑', '💎', '🐾', '🍭', '🦄', '🐱', '🌙'];

const toolsEl = $('#tools');
TOOLS.forEach((t) => {
  const b = el('button', 'tool', `${t.icon}<span class="lbl">${t.name}</span>`);
  b.dataset.tool = t.id;
  b.onclick = () => { sfx.tap(); speak(t.name); setTool(t.id); };
  toolsEl.append(b);
});
const sizesEl = el('div', 'sizes');
[14, 24, 36].forEach((px, i) => {
  const b = el('button', 'tool size', `<i style="width:${px}px;height:${px}px"></i>`);
  b.dataset.size = i;
  b.onclick = () => { sfx.tap(); board.sizeIdx = i; refreshTools(); };
  sizesEl.append(b);
});
toolsEl.append(sizesEl);

function setTool(id) {
  board.tool = id;
  refreshTools();
  renderPalette();
}

function refreshTools() {
  toolsEl.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === board.tool));
  toolsEl.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', +b.dataset.size === board.sizeIdx));
  sizesEl.style.visibility = board.tool === 'fill' ? 'hidden' : 'visible';
}

function renderPalette() {
  const pal = $('#palette');
  pal.innerHTML = '';
  if (board.tool === 'stamp') {
    STAMPS.forEach((s) => {
      const b = el('button', 'swatch emoji' + (s === board.stamp ? ' active' : ''), s);
      b.onclick = () => { sfx.tap(); board.stamp = s; renderPalette(); };
      pal.append(b);
    });
    return;
  }
  COLORS.forEach((col) => {
    const b = el('button', 'swatch' + (col === board.color ? ' active' : ''));
    if (col === 'rainbow') b.classList.add('rainbow');
    else b.style.background = col;
    b.onclick = () => {
      sfx.tap();
      board.color = col;
      if (board.tool === 'eraser' || board.tool === 'stamp') board.tool = 'pen';
      refreshTools();
      renderPalette();
    };
    pal.append(b);
  });
}

board.onChange = () => { $('#btnUndo').disabled = !board.canUndo(); };

async function openDraw({ pageId = null, paper = '#ffffff', record = null }) {
  const page = pageId ? pageById(pageId) : null;
  board.reset({ paper: record?.paper || paper });
  if (page) await board.setOutline(page.svg);
  if (record?.paint) await board.loadPaint(record.paint);
  board.undoStack = [];
  board.dirty = false;
  board.onChange();
  drawState = {
    pageId,
    recordId: record?.id || null,
    createdAt: record?.createdAt || null,
    name: record?.name || page?.name || 'Serbest Çizim',
    paper: board.paper,
  };
  $('#drawTitle').textContent = drawState.name;
  setTool(page ? 'fill' : 'pen');
  show('draw');
}

async function startFree() {
  const papers = [
    ['#ffffff', ''], ['#1c1c2e', '🌙'], ['#dff1ff', ''], ['#ffe3f1', ''], ['#fff6cc', ''], ['#e4fbe6', ''],
  ];
  const paper = await dialog({
    emoji: '📄',
    text: 'Kâğıdının rengini seç!',
    say: 'Kâğıdının rengini seç!',
    buttons: [
      ...papers.map(([col, ic]) => ({ label: ic, value: col, cls: 'paper-btn', style: `background:${col}` })),
      { label: '⬅️', value: null, cls: 'btn' },
    ],
  });
  if (!paper) return;
  await openDraw({ paper });
  if (paper === '#1c1c2e') setTool('neon');
}

async function saveDrawing() {
  const { image, thumb, paint } = await board.toBlobs();
  const now = Date.now();
  const rec = {
    id: drawState.recordId || 'd' + now,
    name: drawState.name,
    pageId: drawState.pageId,
    paper: drawState.paper,
    createdAt: drawState.createdAt || now,
    updatedAt: now,
    image, thumb, paint,
  };
  await db.put(rec);
  drawState.recordId = rec.id;
  drawState.createdAt = rec.createdAt;
  board.dirty = false;
  sfx.save();
  confetti(90);
  const r = $('#btnSave').getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, { emoji: '⭐', n: 12 });
  speak('Resmin kaydedildi! Çok güzel olmuş!');
}

$('#btnSave').onclick = () => saveDrawing().catch((err) => { console.error(err); speak('Kaydedemedim, tekrar dene'); });
$('#btnUndo').onclick = () => { if (board.undo()) sfx.undo(); };
$('#btnClear').onclick = async () => {
  const ok = await dialog({
    emoji: '🗑️', text: 'Hepsini silelim mi?', say: 'Hepsini silelim mi?',
    buttons: [{ label: '✅ Evet', value: true, cls: 'btn wide danger' }, { label: '❌ Hayır', value: false, cls: 'btn wide go' }],
  });
  if (ok) { board.clear(); sfx.splash(); }
};

$('#drawBack').onclick = async () => {
  sfx.pop();
  if (board.dirty) {
    const ans = await dialog({
      emoji: '⭐', text: 'Resmini kaydedelim mi?', say: 'Resmini kaydedelim mi?',
      buttons: [
        { label: '⭐ Kaydet', value: 'save', cls: 'btn wide go' },
        { label: '🗑️ Kaydetme', value: 'discard', cls: 'btn wide danger' },
        { label: '✏️ Çizmeye dön', value: 'stay', cls: 'btn wide' },
      ],
    });
    if (ans === 'stay') return;
    if (ans === 'save') await saveDrawing();
  }
  if (drawState?.recordId && current === 'draw' && returnToGallery) { returnToGallery = false; openGallery(); return; }
  if (drawState?.pageId) openPages(); else show('home');
};

// ---- galeri ----------------------------------------------------------------

let urls = [];
let returnToGallery = false;
const freeUrls = () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; };

async function openGallery() {
  freeUrls();
  const grid = $('#galleryGrid');
  grid.innerHTML = '';
  show('gallery');
  let list = [];
  try { list = await db.all(); } catch (err) { console.error(err); }
  $('#galleryCount').textContent = `🖼️ ${list.length}`;
  if (!list.length) {
    grid.append(el('div', 'empty', '<div class="big">🎨</div>Henüz resim yok.<br>Hadi bir şey çizelim!'));
    speak('Henüz resim yok. Hadi bir şey çizelim!');
    return;
  }
  for (const rec of list) {
    const b = el('button', 'page-tile');
    const img = el('img');
    const u = URL.createObjectURL(rec.thumb || rec.image);
    urls.push(u);
    img.src = u;
    b.append(img, el('div', 'pn', rec.name), el('div', 'pd', fmtDate(rec.updatedAt)));
    b.onclick = () => { sfx.pop(); openViewer(rec.id); };
    grid.append(b);
  }
}

let viewing = null;
let viewUrl = null;

async function openViewer(id) {
  const rec = await db.get(id);
  if (!rec) return openGallery();
  viewing = rec;
  if (viewUrl) URL.revokeObjectURL(viewUrl);
  viewUrl = URL.createObjectURL(rec.image);
  $('#viewerImg').src = viewUrl;
  $('#viewerTitle').textContent = rec.name;
  speak(rec.name);
  show('viewer');
}

$('#viewerBack').onclick = () => { sfx.pop(); openGallery(); };
$('#vEdit').onclick = () => {
  sfx.pop();
  returnToGallery = true;
  openDraw({ pageId: viewing.pageId, record: viewing });
};
$('#vShare').onclick = async () => {
  const name = (viewing.name || 'resim').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'resim';
  const file = new File([viewing.image], `${name}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: viewing.name });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(viewing.image);
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
};
$('#vRename').onclick = async () => {
  const n = prompt('Resmin adı:', viewing.name);
  if (n == null || !n.trim()) return;
  viewing.name = n.trim().slice(0, 40);
  await db.put(viewing);
  $('#viewerTitle').textContent = viewing.name;
  speak(viewing.name);
};

// Silmek için 1,5 saniye basılı tutmak gerekir (yanlışlıkla silinmesin).
(() => {
  const btn = $('#vDelete');
  let timer = null;
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.classList.add('holding');
    speak('Silmek için basılı tut');
    timer = setTimeout(async () => {
      cancel();
      await db.remove(viewing.id);
      sfx.undo();
      speak('Resim silindi');
      openGallery();
    }, 1500);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, cancel));
})();

// ---- çevrimdışı çalışma -----------------------------------------------------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Test ve hata ayıklama için
window.ada = { board, tracer, show, openTrace, openDraw, openGallery, openPicker };
