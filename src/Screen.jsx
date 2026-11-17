import { useEffect, useState } from 'react';
import Stage, { Rail } from './Stage.jsx';
import { mmss, onMessage, send, timing, useStored, useTick, ytLocal } from './lib.js';

const ORD = ['الْأُولَى', 'الثَّانِيَةُ', 'الثَّالِثَةُ'];

/** The projector window: shows what the teacher window is doing, with no answers or notes. */
export default function Screen() {
  const [live] = useStored('live', null);
  const [overlay] = useStored('overlay', null);
  const [armed, setArmed] = useState(false);
  useTick(!!live?.run);

  // tell the teacher window we're here, and obey video commands
  useEffect(() => {
    send({ type: 'ping' });
    const id = setInterval(() => send({ type: 'ping' }), 2000);
    const off = onMessage((m) => {
      if (m?.type === 'who') send({ type: 'ping' });
      if (m?.type === 'yt') ytLocal(m.func, m.args);
    });
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    addEventListener('keydown', onKey);
    return () => {
      clearInterval(id);
      off();
      removeEventListener('keydown', onKey);
    };
  }, []);

  const valid = live && live.session?.segments?.[live.idx];

  return (
    <div className="presenter screen" onClick={() => setArmed(true)}>
      {!valid ? (
        <Waiting />
      ) : (
        <>
          <header className="p-top">
            <span className="p-home">مَقْهَى الْمُحَادَثَةِ</span>
            <div className="p-session">
              الْجَلْسَةُ {ORD[live.n - 1]}: <b>{live.session.title}</b>
            </div>
            <div className="p-clock">
              {mmss(timing(live, live.session.segments[live.idx]).sessionElapsed)}{' '}
              <span>/ {mmss(live.session.segments.reduce((n, g) => n + g.dur, 0))}</span>
            </div>
          </header>
          <Rail session={live.session} idx={live.idx} />
          <Stage live={live} />
        </>
      )}
      {overlay && <Groups overlay={overlay} />}
      {!armed && (
        <p className="arm-hint" dir="rtl">
          اُنْقُرْ مَرَّةً وَاحِدَةً هُنَا لِتَعْمَلَ الْفِيدْيُوهَاتُ · F لِمِلْءِ الشَّاشَةِ
        </p>
      )}
    </div>
  );
}

function Waiting() {
  return (
    <div className="waiting" dir="rtl">
      <div className="sadu" />
      <h1>مَقْهَى الْمُحَادَثَةِ</h1>
      <p>أَهْلًا وَسَهْلًا · حَيَّاكُمُ اللهُ</p>
      <div className="sadu" />
    </div>
  );
}

export const ROLE_AR = {
  host: 'الْمُضِيفُ',
  elder: 'كَبِيرُ الْمَجْلِسِ',
  server: 'الْمُقَهْوِي',
  newcomer: 'الْقَادِمُ الْجَدِيدُ',
  guest: 'ضَيْفٌ',
};

/** Pairs or majlis groups shown over everything */
export function Groups({ overlay }) {
  if (overlay.kind === 'qr')
    return (
      <div className="groups qr-overlay" dir="rtl">
        <h2>{overlay.title || 'رَاجِعُوا الْجَلْسَةَ عَلَى هَوَاتِفِكُمْ'}</h2>
        <div className="qr big" dangerouslySetInnerHTML={{ __html: overlay.svg }} />
        {overlay.code && <p className="code-big">{overlay.code}</p>}
      </div>
    );
  if (overlay.kind === 'pairs')
    return (
      <div className="groups" dir="rtl">
        <h2>الْأَزْوَاجُ</h2>
        <ol className="pair-grid">
          {overlay.pairs.map((p, i) => (
            <li key={i}>{p.join(' · ')}</li>
          ))}
        </ol>
      </div>
    );
  return (
    <div className="groups" dir="rtl">
      <h2>الْمَجَالِسُ</h2>
      <div className="majlis-grid">
        {overlay.groups.map((g, i) => (
          <div key={i} className="majlis-box">
            <h3>الْمَجْلِسُ {['الْأَوَّلُ', 'الثَّانِي', 'الثَّالِثُ'][i] || i + 1}</h3>
            <ul>
              {g.map((m) => (
                <li key={m.name} className={'r-' + m.role}>
                  <b>{m.name}</b> <span>{ROLE_AR[m.role]}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
