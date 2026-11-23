import { useCallback, useEffect, useRef, useState } from 'react';
import { PASSWORD_HASH, T } from './i18n.js';
import { sha256, store, useStored } from '../lib/store.js';
import { audio } from '../lib/audio.js';
import { startHost, stopHost } from '../lib/net.js';
import { onPhoneMessage } from './sync.js';
import GameTab from './GameTab.jsx';
import EditTab from './EditTab.jsx';
import PrintTab from './PrintTab.jsx';
import { LogTab, BackupTab } from './LogTab.jsx';
import './host.css';

// The password is asked every time the control window is opened (kept in memory only).
let unlocked = false;

export function useLang() {
  const [lang, setLang] = useStored('lang', 'en');
  return { lang, t: T[lang] || T.en, dir: lang === 'ar' ? 'rtl' : 'ltr', toggle: () => setLang(lang === 'ar' ? 'en' : 'ar') };
}

export default function Host({ tab }) {
  const L = useLang();
  const [ok, setOk] = useState(unlocked);
  if (!ok)
    return (
      <Gate
        L={L}
        onOk={() => {
          unlocked = true;
          audio.unlock();
          setOk(true);
        }}
      />
    );
  return (
    <Controls
      L={L}
      tab={tab}
      lock={() => {
        unlocked = false;
        setOk(false);
      }}
    />
  );
}

function Gate({ L, onOk }) {
  const { t, dir, lang, toggle } = L;
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="h-gate" dir={dir} lang={lang}>
      <form
        className="panel h-gate-box"
        onSubmit={async (e) => {
          e.preventDefault();
          let good = false;
          try {
            good = (await sha256(pw.trim())) === PASSWORD_HASH;
          } catch {
            good = false;
          }
          if (good) onOk();
          else setErr(true);
        }}
      >
        <h1 className="brand" lang="ar" dir="rtl">
          مَقْهَى الْمُحَادَثَةِ
        </h1>
        <p className="muted">{t.title}</p>
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
        <button className="btn primary">{t.unlock}</button>
        <button type="button" className="h-link" onClick={toggle}>
          {t.lang}
        </button>
      </form>
    </div>
  );
}

const TABS = ['game', 'edit', 'print', 'log', 'backup'];

function Controls({ L, tab, lock }) {
  const { t, dir, lang, toggle } = L;
  const [stored] = useStored('game', null);
  const game = stored?.v === 2 ? stored : null; // a game saved by the old version is ignored
  const [vol, setVol] = useStored('volume', { v: 0.6, muted: false });
  const [net, setNet] = useState('off');
  const [, bump] = useState(0);
  const refresh = useCallback(() => bump((n) => n + 1), []);
  const active = TABS.includes(tab) ? tab : 'game';

  useEffect(() => {
    if (stored && stored.v !== 2) store.set('game', undefined);
  }, [stored]);

  // ───── phones: host the game while one is open ─────
  const pin = game?.pin;
  const handlers = useRef();
  handlers.current = {
    onStatus: setNet,
    onLeave: refresh,
    onMessage: (peerId, m) => onPhoneMessage(peerId, m, refresh),
  };
  useEffect(() => {
    if (!pin) {
      stopHost();
      setNet('off');
      return;
    }
    startHost(pin, {
      onStatus: (s) => handlers.current.onStatus(s),
      onLeave: (tk) => handlers.current.onLeave(tk),
      onMessage: (p, m) => handlers.current.onMessage(p, m),
    });
  }, [pin]);

  // ───── music: plays while a game is open ─────
  useEffect(() => {
    audio.setVolume(vol?.v ?? 0.6);
    audio.setMuted(!!vol?.muted);
  }, [vol]);
  useEffect(() => {
    if (game) audio.startMusic();
    else audio.stopMusic();
  }, [!!game]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => audio.stopMusic(), []);

  return (
    <div className="h" dir={dir} lang={lang} onClick={() => audio.unlock()}>
      <header className="h-top">
        <span className="brand" lang="ar" dir="rtl">
          مَقْهَى الْمُحَادَثَةِ
        </span>
        <button className="btn small" onClick={() => window.open('#/screen', 'cc-screen', 'popup,width=1280,height=720')} title={t.projectorHelp}>
          ⧉ {t.projector}
        </button>
        <span className="h-spacer" />
        <label className="h-vol">
          ♪ {t.music}
          <input type="range" min="0" max="1" step="0.05" value={vol?.v ?? 0.6} onChange={(e) => setVol({ ...vol, v: +e.target.value })} />
        </label>
        <button className="btn small ghost" onClick={() => setVol({ ...vol, muted: !vol?.muted })} aria-pressed={!!vol?.muted}>
          {vol?.muted ? '🔇 ' + t.unmute : '🔈 ' + t.mute}
        </button>
        <button className="btn small ghost" onClick={toggle}>
          {t.lang}
        </button>
        <button className="btn small ghost" onClick={lock}>
          🔒 {t.lock}
        </button>
      </header>
      <nav className="h-tabs">
        {TABS.map((k) => (
          <a key={k} href={'#/host/' + k} className={k === active ? 'on' : ''}>
            {t.tabs[k]}
          </a>
        ))}
      </nav>
      <main className="h-body">
        {active === 'game' && <GameTab t={t} game={game} net={net} />}
        {active === 'edit' && <EditTab t={t} />}
        {active === 'print' && <PrintTab t={t} />}
        {active === 'log' && <LogTab t={t} />}
        {active === 'backup' && <BackupTab t={t} />}
      </main>
    </div>
  );
}
