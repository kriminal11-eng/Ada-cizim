// Sesler: Türkçe konuşma (iPad'in kendi sesi) + küçük efekt sesleri (WebAudio).

let ctx = null;
let muted = false;
try { muted = localStorage.getItem('ada-muted') === '1'; } catch { /* yok say */ }

let voice = null;
const hasSpeech = 'speechSynthesis' in window;

function pickVoice() {
  if (!hasSpeech) return;
  const tr = speechSynthesis.getVoices().filter((v) => /^tr/i.test(v.lang));
  voice =
    tr.find((v) => /yelda/i.test(v.name) && /(enhanced|premium|gelişmiş)/i.test(v.name)) ||
    tr.find((v) => /yelda/i.test(v.name)) ||
    tr[0] || null;
}
if (hasSpeech) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export const isMuted = () => muted;

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('ada-muted', m ? '1' : '0'); } catch { /* yok say */ }
  if (m && hasSpeech) speechSynthesis.cancel();
}

/** iPad'de ses ancak ilk dokunuştan sonra açılabilir. */
export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch { /* yok say */ }
}

export function speak(text, { rate = 0.92, pitch = 1.15 } = {}) {
  if (muted || !hasSpeech || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    if (!voice) pickVoice();
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    speechSynthesis.speak(u);
  } catch { /* yok say */ }
}

function tone(freq, when = 0, dur = 0.15, type = 'sine', vol = 0.18, slideTo = null) {
  if (muted || !ctx) return;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur = 0.25, vol = 0.12, freq = 900) {
  if (muted || !ctx) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const flt = ctx.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(flt).connect(g).connect(ctx.destination);
  src.start();
}

const SCALE = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319];

export const sfx = {
  pop() { tone(520, 0, 0.09, 'sine', 0.16, 900); },
  tap() { tone(880, 0, 0.05, 'triangle', 0.08); },
  note(i) { tone(SCALE[Math.max(0, i) % SCALE.length], 0, 0.12, 'sine', 0.07); },
  chime(i = 0) {
    const f = SCALE[i % SCALE.length];
    tone(f, 0, 0.3, 'triangle', 0.18);
    tone(f * 2, 0.05, 0.25, 'sine', 0.06);
  },
  success() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.18));
    tone(1319, 0.48, 0.6, 'sine', 0.12);
  },
  splash() { noise(0.22, 0.14, 1100); tone(320, 0, 0.18, 'sine', 0.1, 760); },
  stamp() { tone(380, 0, 0.1, 'square', 0.05, 190); tone(1250, 0.03, 0.12, 'sine', 0.09); },
  save() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.28, 'sine', 0.15)); },
  undo() { tone(700, 0, 0.12, 'sine', 0.1, 400); },
};
