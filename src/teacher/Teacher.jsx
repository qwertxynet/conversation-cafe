import { useState } from 'react';
import { PASSWORD_HASH, UI } from '../data/teacher.js';
import { sha256, store, useStored } from '../lib.js';
import Dashboard from './Dashboard.jsx';
import Presenter from './Presenter.jsx';
import Customise from './Customise.jsx';
import Print from './Print.jsx';

// The teacher view asks for the password every time you come into it (it is held in memory only,
// and forgotten when you leave the teacher pages or reload).
let unlocked = false;
// The student preview (#/preview/…) only opens in this tab, its preview iframe or tabs opened from it
// (they share sessionStorage), and only while the teacher view is unlocked.
const PREVIEW_KEY = 'cafe-preview-ok';
const allowPreview = (on) => {
  try {
    if (on) sessionStorage.setItem(PREVIEW_KEY, '1');
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* storage unavailable */
  }
};
export const previewAllowed = () => {
  try {
    return sessionStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
};

/** A one-minute token so a new tab opened from the teacher view can enter the preview */
export function previewLink(page) {
  const k = Math.random().toString(36).slice(2, 10);
  store.set('preview-token', { k, exp: Date.now() + 60000 });
  return '#/preview/' + page + '?k=' + k;
}
export function acceptPreviewToken(k) {
  const tok = store.get('preview-token', null);
  if (k && tok && tok.k === k && tok.exp > Date.now()) {
    store.set('preview-token', undefined);
    allowPreview(true);
    return true;
  }
  return false;
}
export const lockTeacher = () => {
  unlocked = false;
  allowPreview(false);
};

export function useLang() {
  const [lang, setLang] = useStored('tlang', 'en');
  const t = UI[lang] || UI.en;
  return { lang, t, dir: lang === 'ar' ? 'rtl' : 'ltr', toggle: () => setLang(lang === 'ar' ? 'en' : 'ar') };
}

export default function Teacher({ path }) {
  const [ok, setOk] = useState(unlocked);
  const L = useLang();
  if (!ok)
    return (
      <Gate
        L={L}
        onOk={() => {
          unlocked = true;
          allowPreview(true);
          setOk(true);
        }}
      />
    );
  const lock = () => {
    lockTeacher();
    setOk(false);
  };
  const [page, arg] = path.split('/');
  if (page === 's') return <Presenter n={+arg} L={L} lock={lock} />;
  if (page === 'custom') return <Customise n={+arg} L={L} lock={lock} />;
  if (page === 'print') return <Print n={+arg} L={L} lock={lock} />;
  return <Dashboard tab={page || 'sessions'} L={L} lock={lock} />;
}

function Gate({ L, onOk }) {
  const { t, dir, toggle, lang } = L;
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    let good = false;
    try {
      good = (await sha256(pw.trim())) === PASSWORD_HASH;
    } catch {
      good = false;
    }
    if (good) onOk();
    else setErr(true);
  };
  return (
    <div className="gate" dir={dir} lang={lang}>
      <form className="gate-box" onSubmit={submit}>
        <div className="sadu" />
        <h1>{t.teacher}</h1>
        <label>
          {t.password}
          <input
            type="password"
            value={pw}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => {
              setPw(e.target.value);
              setErr(false);
            }}
          />
        </label>
        {err && <p className="err">{t.wrong}</p>}
        <button className="primary" type="submit">
          {t.unlock}
        </button>
        <div className="gate-foot">
          <a href="#/">{t.studentSite}</a>
          <button type="button" className="link" onClick={toggle}>
            {t.lang}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Top bar shared by the teacher pages */
export function TopBar({ L, lock, title, children }) {
  const { t, toggle } = L;
  return (
    <header className="t-top">
      <a className="t-brand" href="#/teacher" lang="ar" dir="rtl">
        مَقْهَى الْمُحَادَثَةِ
      </a>
      {title && <span className="t-title">{title}</span>}
      <span className="t-spacer" />
      {children}
      <button className="t-btn" onClick={toggle}>
        {t.lang}
      </button>
      <button className="t-btn" onClick={lock}>
        🔒 {t.lock}
      </button>
    </header>
  );
}
