import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Card, { Stars } from '../components/Card.jsx';
import { DAYS, dayPlan } from '../lib/content.js';
import { wallCards } from '../lib/game.js';
import { mmss, toArabicDigits, useStored, useTick } from '../lib/store.js';
import './screen.css';

export const joinUrl = (pin) => location.origin + location.pathname + '#/join/' + pin;

/** The projector window: follows the teacher's control window (same browser, shared storage). */
export default function Screen() {
  const [game] = useStored('game', null);
  const [select] = useStored('select', 1);
  const [custom] = useStored('custom', {});
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    addEventListener('keydown', onKey);
    const t = setTimeout(() => setHint(false), 8000);
    return () => {
      removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="scr" dir="rtl" lang="ar">
      {!game ? (
        <SongSelect selected={select} />
      ) : game.phase === 'lobby' ? (
        <Lobby game={game} />
      ) : game.phase === 'question' ? (
        <Question game={game} custom={custom} />
      ) : (
        <Wall game={game} />
      )}
      {hint && <p className="scr-hint ltr">Press F for full screen</p>}
    </div>
  );
}

const ORD = ['الْأَوَّلُ', 'الثَّانِي', 'الثَّالِثُ', 'الرَّابِعُ', 'الْخَامِسُ'];
const dayLabel = (n) => 'الْيَوْمُ ' + ORD[n - 1];

/** osu!-style topic select: the five days as slanted panels, the chosen one highlighted. */
function SongSelect({ selected }) {
  const d = DAYS.find((x) => x.n === selected) || DAYS[0];
  return (
    <div className="ss">
      <div className="ss-left">
        <div className="ss-orb">
          <div className="ring circle-ring" key={d.n} />
          <span className="ss-orb-n">{toArabicDigits(d.n)}</span>
          <span className="ss-orb-l">{dayLabel(d.n)}</span>
        </div>
        <h1 className="ss-title">{d.title}</h1>
        <Stars n={d.stars} className="ss-stars" />
      </div>
      <div className="ss-list">
        <h2 className="brand ss-brand">مَقْهَى الْمُحَادَثَةِ</h2>
        {DAYS.map((x) => (
          <div key={x.n} className={'ss-item' + (x.n === d.n ? ' on' : '')}>
            <span className="ss-item-n">{toArabicDigits(x.n)}</span>
            <span className="ss-item-t">{x.title}</span>
            <Stars n={x.stars} />
          </div>
        ))}
      </div>
    </div>
  );
}

function useQr(text) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#24160e', light: '#ecdfc4' } }).then(setSvg);
  }, [text]);
  return svg;
}

function Lobby({ game }) {
  const d = DAYS.find((x) => x.n === game.day);
  const url = joinUrl(game.pin);
  const svg = useQr(url);
  const players = Object.entries(game.players).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  return (
    <div className="lb">
      <header className="lb-head">
        <span className="brand">مَقْهَى الْمُحَادَثَةِ</span>
        <span>
          {dayLabel(d.n)} · {d.title} <Stars n={d.stars} />
        </span>
      </header>
      <div className="lb-main">
        <div className="lb-join panel">
          <div className="lb-qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div>
            <p className="lb-say">اِمْسَحُوا الرَّمْزَ، أَوِ افْتَحُوا الْمَوْقِعَ وَاكْتُبُوا الرَّقْمَ:</p>
            <div className="lb-pin ltr">{game.pin}</div>
            <p className="lb-url ltr">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
        <div className="lb-players">
          {players.length === 0 && <p className="muted lb-wait">فِي انْتِظَارِ اللَّاعِبِينَ…</p>}
          {players.map(([token, p]) => (
            <div key={token} className={'lb-player' + (p.test ? ' test' : '')}>
              <div className="ring circle-ring" />
              <span className="lb-avatar">{p.name.trim()[0]}</span>
              <span className="lb-name">{p.name}</span>
              {p.test && <span className="lb-tag">تَجْرِبَةٌ</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Question({ game, custom }) {
  useTick(true, 500);
  const plan = useMemo(() => dayPlan(game.day, custom), [game.day, custom]);
  const q = plan.questions[game.q];
  const d = plan.day;
  const elapsed = game.qAt ? (Date.now() - game.qAt) / 1000 : 0;
  const recent = game.plays.slice(-6);
  const last = game.plays[game.plays.length - 1];
  const pop = last && Date.now() - last.at < 4000 ? last : null;
  return (
    <div className="qs">
      <header className="qs-head">
        <span className="brand">مَقْهَى الْمُحَادَثَةِ</span>
        <span className="qs-day">
          {dayLabel(d.n)} · {d.title} <Stars n={d.stars} />
        </span>
        <span className="qs-clock" title="منذ بداية السؤال">
          ⏱ {toArabicDigits(mmss(elapsed))}
        </span>
      </header>
      <main className="qs-main">
        <p className="qs-n">
          السُّؤَالُ {toArabicDigits(game.q + 1)} مِنْ {toArabicDigits(plan.questions.length)}
        </p>
        <h1 className="qs-q" key={game.q}>
          {q?.q}
        </h1>
      </main>
      <footer className="qs-recent">
        {recent.map((p) => (
          <div key={p.at + p.id} className="qs-play">
            <Card id={p.id} size="sm" />
            <span className="qs-who">
              {p.name}
              {p.test ? ' · تَجْرِبَةٌ' : ''}
            </span>
          </div>
        ))}
      </footer>
      {pop && (
        <div className="pop" key={pop.at}>
          <Card id={pop.id} size="lg">
            <div className="ring" />
          </Card>
          <div className="pop-who">
            {pop.name}
            {pop.test ? ' · تَجْرِبَةٌ' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function Wall({ game }) {
  const d = DAYS.find((x) => x.n === game.day);
  const ids = wallCards(game);
  return (
    <div className="wl">
      <header className="lb-head">
        <span className="brand">مَقْهَى الْمُحَادَثَةِ</span>
        <span>
          {dayLabel(d.n)} · {d.title}
        </span>
      </header>
      <h1 className="wl-title">بِطَاقَاتُ الْيَوْمِ</h1>
      {ids.length === 0 ? (
        <p className="muted wl-none">لَمْ تُسْتَعْمَلْ بِطَاقَاتٌ الْيَوْمَ.</p>
      ) : (
        <div className="wl-grid">
          {ids.map((id, i) => (
            <Card key={id} id={id} size="sm" className="wl-card" style={{ animationDelay: Math.min(i * 60, 2400) + 'ms' }} />
          ))}
        </div>
      )}
      <p className="wl-thanks">شُكْرًا لَكُمْ!</p>
    </div>
  );
}
