import { useEffect, useState } from 'react';

// Everything is kept in this browser's localStorage under the "cc-" prefix.
const PREFIX = 'cc-';

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
    } catch {
      /* storage unavailable */
    }
    // the 'storage' event only reaches other windows; tell this one too
    window.dispatchEvent(new CustomEvent('cc-store', { detail: k }));
  },
};

/** A stored value kept in sync across components and windows of this browser. */
export function useStored(key, initial) {
  const [v, setV] = useState(() => store.get(key, initial));
  useEffect(() => {
    const read = () => setV(store.get(key, initial));
    const onStorage = (e) => e.key === PREFIX + key && read();
    const onLocal = (e) => e.detail === key && read();
    addEventListener('storage', onStorage);
    addEventListener('cc-store', onLocal);
    read();
    return () => {
      removeEventListener('storage', onStorage);
      removeEventListener('cc-store', onLocal);
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

/** Re-render every `ms` while `on` */
export function useTick(on = true, ms = 500) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [on, ms]);
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const toArabicDigits = (s) => String(s).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
export const mmss = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

export function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Teacher data saved in the backup file
export const BACKUP_KEYS = ['custom', 'log', 'lang', 'volume'];

export function exportBackup() {
  const data = { app: 'conversation-cafe-cards', version: 1, saved: new Date().toISOString() };
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
  if (data?.app !== 'conversation-cafe-cards') throw new Error('bad file');
  for (const k of BACKUP_KEYS) if (k in data && data[k] !== null) store.set(k, data[k]);
}
