import { useEffect, useState } from 'react';

export const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/** Arabic-Indic digits */
export const ar = (n) => Number(n).toLocaleString('ar-EG', { useGrouping: false });

// ───────── storage (this browser only) ─────────
const PREFIX = 'cafe-';
export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(PREFIX + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      if (v === undefined) localStorage.removeItem(PREFIX + k);
      else localStorage.setItem(PREFIX + k, JSON.stringify(v));
      // the 'storage' event only reaches other windows; tell this one too
      window.dispatchEvent(new CustomEvent('cafe-store', { detail: k }));
    } catch {
      /* storage unavailable */
    }
  },
};

/** A stored value that stays in sync across components and windows. */
export function useStored(key, initial) {
  const [v, setV] = useState(() => store.get(key, initial));
  useEffect(() => {
    const read = () => setV(store.get(key, initial));
    const onStorage = (e) => e.key === PREFIX + key && read();
    const onLocal = (e) => e.detail === key && read();
    addEventListener('storage', onStorage);
    addEventListener('cafe-store', onLocal);
    return () => {
      removeEventListener('storage', onStorage);
      removeEventListener('cafe-store', onLocal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = (nv) => {
    const val = typeof nv === 'function' ? nv(store.get(key, initial)) : nv;
    store.set(key, val);
    setV(val);
  };
  return [v, save];
}

// Keys that make up the teacher's backup file
export const BACKUP_KEYS = ['roster', 'groups', 'log', 'ticks', 'custom', 'tlang'];

export function exportBackup() {
  const data = { app: 'conversation-cafe', version: 1, saved: new Date().toISOString() };
  for (const k of BACKUP_KEYS) data[k] = store.get(k, null);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'conversation-cafe-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'conversation-cafe') throw new Error('bad file');
  for (const k of BACKUP_KEYS) if (k in data && data[k] !== null) store.set(k, data[k]);
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ───────── sound ─────────
let ctx;
export function chime() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [659.25, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.28);
      g.gain.linearRampToValueAtTime(0.35, now + i * 0.28 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.28 + 1.1);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.28);
      o.stop(now + i * 0.28 + 1.2);
    });
  } catch {
    /* no sound */
  }
}
export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* no sound */
  }
}

export function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// ───────── timer maths (shared by the teacher window and the projector) ─────────
export const liveSecs = (t) => (t.since ? (Date.now() - t.since) / 1000 : 0);
export function timing(t, seg) {
  const elapsed = t.base + liveSecs(t);
  const remaining = seg.dur - elapsed;
  return {
    elapsed,
    remaining,
    over: remaining <= 0,
    state: remaining <= 0 ? 'over' : remaining <= 60 ? 'warn' : '',
    pct: Math.min(100, (elapsed / seg.dur) * 100),
    sessionElapsed: t.sBase + liveSecs(t),
  };
}

/** Re-render every 250 ms while `on` */
export function useTick(on) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setN((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [on]);
}

// ───────── teacher customisation ─────────
/** Applies the teacher's customisation (order, skipped segments, durations, hidden items) to a session. */
export function effective(s, c = {}) {
  const ids = c.order && c.order.length === s.segments.length ? c.order : s.segments.map((_, i) => i);
  const skip = new Set(c.skip || []);
  const segments = ids
    .filter((i) => !skip.has(i))
    .map((i) => {
      const g = { ...s.segments[i], id: i };
      if (c.dur?.[i]) g.dur = c.dur[i];
      const hide = new Set(c.hide?.[i] || []);
      if (hide.size) {
        const keep = (arr, key) => {
          const f = arr.filter((_, k) => !hide.has(key(k)));
          return f.length ? f : arr;
        };
        if (g.cards) g.cards = keep(g.cards, String);
        if (g.questions) g.questions = keep(g.questions, String);
        if (g.decks) g.decks = g.decks.map((d, di) => ({ ...d, cards: keep(d.cards, (k) => di + '.' + k) }));
      }
      return g;
    });
  return { n: s.n, title: s.title, sub: s.sub, segments };
}

// ───────── projector link ─────────
const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cafe-sync') : null;
export const send = (msg) => ch?.postMessage(msg);
export function onMessage(fn) {
  if (!ch) return () => {};
  const h = (e) => fn(e.data);
  ch.addEventListener('message', h);
  return () => ch.removeEventListener('message', h);
}

/** Is a projector window open? (it pings every 2 s) */
export function useProjector() {
  const [last, setLast] = useState(0);
  useEffect(() => {
    const off = onMessage((m) => m?.type === 'ping' && setLast(Date.now()));
    send({ type: 'who' });
    const id = setInterval(() => setLast((l) => l), 1000);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);
  useTick(true);
  return Date.now() - last < 5000;
}

/** Sends a command to the YouTube player in the projector window, or the local one. */
export function ytCommand(func, args = []) {
  send({ type: 'yt', func, args });
}
export function ytLocal(func, args = []) {
  const f = document.getElementById('yt');
  f?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}
