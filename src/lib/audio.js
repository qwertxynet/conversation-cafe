// Original background music and sounds, generated in the browser (no recordings).
// A calm lo-fi loop in maqam Hijaz on D: an oud-like pluck melody, a low pad, and a soft maqsum rhythm (dum-tek).

const HIJAZ = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33]; // D Eb F# G A Bb C D
const ROOTS = [73.42, 65.41, 58.27, 55.0]; // bar roots: D, C, Bb, A (a descending tetrachord)
const BPM = 76;
const STEP = 60 / BPM / 2; // eighth note
// maqsum over one 4/4 bar of eighths: Dum Tek . Tek Dum . Tek .
const RHYTHM = ['D', 'T', null, 'T', 'D', null, 'T', null];

let ctx = null;
let master, musicBus, sfxBus, lowpass;
let volume = 0.6;
let muted = false;
let playing = false;
let timer = null;
let nextTime = 0;
let step = 0;
let phrase = [];
let phraseRepeat = 0;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 4200; // warm, slightly muffled lo-fi top end
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.32;
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.7;
  musicBus.connect(lowpass);
  sfxBus.connect(master);
  lowpass.connect(master);
  master.connect(ctx.destination);
  applyVolume();
  return ctx;
}

function applyVolume() {
  if (!master) return;
  master.gain.setTargetAtTime(muted ? 0 : volume * 0.55, ctx.currentTime, 0.05);
}

export const audio = {
  /** Call from a click/keypress: browsers only allow sound after a user gesture. */
  unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  },
  setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    applyVolume();
  },
  setMuted(m) {
    muted = !!m;
    applyVolume();
  },
  startMusic() {
    const c = ensure();
    if (!c || playing) return;
    playing = true;
    nextTime = c.currentTime + 0.1;
    step = 0;
    phrase = [];
    timer = setInterval(schedule, 25);
  },
  stopMusic() {
    playing = false;
    clearInterval(timer);
    timer = null;
  },
  isPlaying: () => playing,
  sfx(kind) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + 0.01;
    if (kind === 'join') {
      pluck(HIJAZ[4], t, 0.5, sfxBus, 0.9);
      pluck(HIJAZ[7], t + 0.12, 0.5, sfxBus, 1.1);
    } else if (kind === 'play') {
      [HIJAZ[0], HIJAZ[2], HIJAZ[4]].forEach((f, i) => pluck(f, t + i * 0.035, 0.45, sfxBus, 1.3));
      bell(HIJAZ[7] * 2, t + 0.12, 0.18);
    } else if (kind === 'next') {
      pluck(HIJAZ[3], t, 0.4, sfxBus, 0.8);
      pluck(HIJAZ[4], t + 0.1, 0.4, sfxBus, 0.8);
      pluck(HIJAZ[7], t + 0.2, 0.45, sfxBus, 1.2);
    }
  },
};

// ───────── voices ─────────
function pluck(freq, t, gain = 0.35, bus = musicBus, decay = 0.9) {
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = 'sawtooth';
  o2.type = 'triangle';
  o1.frequency.value = freq;
  o2.frequency.value = freq * 1.003;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(freq * 9, t);
  f.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o1.connect(f);
  o2.connect(f);
  f.connect(g).connect(bus);
  o1.start(t);
  o2.start(t);
  o1.stop(t + decay + 0.05);
  o2.stop(t + decay + 0.05);
}

function bell(freq, t, gain) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + 0.85);
}

function pad(root, t, dur) {
  [root * 2, root * 3].forEach((fr) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = fr;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
}

function dum(t) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.22);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(musicBus);
  o.start(t);
  o.stop(t + 0.4);
}

let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function tek(t, gain = 0.12) {
  const s = ctx.createBufferSource();
  s.buffer = noise();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2600;
  f.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  s.connect(f).connect(g).connect(musicBus);
  s.start(t);
  s.stop(t + 0.07);
}

// ───────── composition ─────────
/** A two-bar melody (16 eighths): a gentle random walk in Hijaz that ends on D or A. */
function makePhrase() {
  const notes = Array(16).fill(null);
  let deg = [0, 2, 4][Math.floor(Math.random() * 3)];
  for (let i = 0; i < 16; i++) {
    const onBeat = i % 2 === 0;
    if (Math.random() < (onBeat ? 0.55 : 0.25)) {
      deg = Math.max(0, Math.min(HIJAZ.length - 1, deg + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
      notes[i] = deg;
    }
  }
  notes[14] = Math.random() < 0.5 ? 0 : 4;
  notes[15] = null;
  return notes;
}

function schedule() {
  if (!playing) return;
  while (nextTime < ctx.currentTime + 0.15) {
    const inBar = step % 8;
    const bar = Math.floor(step / 8);
    const swing = step % 2 === 1 ? STEP * 0.12 : 0;
    const t = nextTime + swing;

    if (inBar === 0) {
      const root = ROOTS[bar % ROOTS.length];
      pad(root, t, STEP * 8);
      pluck(root * 2, t, 0.22, musicBus, 1.6); // soft bass pluck
    }
    const r = RHYTHM[inBar];
    if (r === 'D') dum(t);
    else if (r === 'T') tek(t, inBar === 6 ? 0.1 : 0.07);

    const pos = step % 16;
    if (pos === 0) {
      if (!phrase.length || phraseRepeat >= 2) {
        phrase = makePhrase();
        phraseRepeat = 0;
      }
      phraseRepeat++;
    }
    const n = phrase[pos];
    if (n !== null && n !== undefined && bar % 8 < 6) pluck(HIJAZ[n], t, 0.2, musicBus, 1.0); // rests for 2 of every 8 bars

    nextTime += STEP;
    step++;
  }
}
