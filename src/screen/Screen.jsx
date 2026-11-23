import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Card3D, { CardBack, Stars } from '../components/Card.jsx';
import Emblem from '../components/Emblem.jsx';
import { DAYS } from '../lib/content.js';
import { askerOf, stackOf, wallCards } from '../lib/game.js';
import { toArabicDigits, useStored } from '../lib/store.js';
import './screen.css';
import './table.css';

export const joinUrl = (pin) => location.origin + location.pathname + '#/join/' + pin;

/** The projector window: follows the teacher's control window (same browser, shared storage). */
export default function Screen() {
  const [stored] = useStored('game', null);
  const game = stored?.v === 2 ? stored : null;
  const [select] = useStored('select', 1);
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
      {!game ? <SongSelect selected={select} /> : game.phase === 'wall' ? <Wall game={game} /> : <TableView game={game} />}
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

/**
 * Where each seat sits on the table (percent of the table top).
 * Seats run in an arc from the right, round the near side, to the left, leaving the far side clear for the card.
 */
export function seatSpot(i, n, r = 1) {
  const span = n >= 5 ? 248 : 224; // a wider arc when the table is full
  const deg = n === 1 ? 90 : 90 - span / 2 + (i * span) / (n - 1);
  const a = (deg * Math.PI) / 180;
  return { x: 50 + 42 * r * Math.cos(a), y: 50 + 40 * r * Math.sin(a), deg };
}
const DECK = { x: 50, y: 34 };
const fresh = (at, ms) => at && Date.now() - at < ms;

function TableView({ game }) {
  const d = DAYS.find((x) => x.n === game.day);
  const lobby = game.phase === 'lobby';
  const t = lobby ? null : game.turn;
  const asker = askerOf(game);
  const n = game.order.length;
  const idx = (tk) => game.order.indexOf(tk);
  const name = (tk) => game.players[tk]?.name;
  const showCard = t && t.card && (t.step === 'front' || t.step === 'back');
  const sp = t ? idx(t.speaker) : -1;
  const spot = sp >= 0 ? seatSpot(sp, n) : null;
  const flying = showCard && t.step === 'front' && fresh(t.drawnAt, 1600);
  const ls = game.lastSaid;
  const settling = ls && fresh(ls.at, 1500) && idx(ls.token) >= 0 ? { ...ls, spot: seatSpot(idx(ls.token), n, 0.66) } : null;

  return (
    <div className={'tv' + (n >= 5 ? ' many' : '')}>
      <header className="tv-head">
        <span className="brand">مَقْهَى الْمُحَادَثَةِ</span>
        {t && (
          <div className="tv-banner" key={t.n + t.step}>
            {t.step === 'ask' && asker ? (
              <>
                <span>سُؤَالٌ لِلْمُتَابَعَةِ</span>
                <Emblem kind={game.players[asker]?.emblem} />
                <b>{name(asker)}</b>
                <span className="tv-arrow">←</span>
                <Emblem kind={game.players[t.speaker]?.emblem} />
                <b>{name(t.speaker)}</b>
              </>
            ) : (
              <>
                <Emblem kind={game.players[t.speaker]?.emblem} />
                <span>
                  دَوْرُ <b>{name(t.speaker)}</b>
                </span>
              </>
            )}
          </div>
        )}
        {!lobby && !t && <p className="tv-banner">فِي انْتِظَارِ اللَّاعِبِينَ…</p>}
        <span className="tv-day">
          {dayLabel(d.n)} · {d.title} <Stars n={d.stars} />
        </span>
      </header>

      {/* the table: a lamp-lit wooden top seen in perspective */}
      <div className="tv-scene">
        <div className="tv-table">
          <div className="tv-floor" />
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="tv-thick" style={{ transform: `translateZ(${-3 - i * 3}px)` }} />
          ))}
          <div className="tv-top">
            <div className="tv-lamp" />
            {spot && <div className="tv-glow" style={{ left: spot.x + '%', top: spot.y + '%' }} key={'g' + t.n} />}
            <Deck count={game.deck.length} />
            {game.order.map((tk, i) => {
              const s = seatSpot(i, n, 0.66);
              const k = stackOf(game, tk) - (settling && settling.token === tk ? 1 : 0);
              return <Stack key={tk} count={k} x={s.x} y={s.y} deg={s.deg} />;
            })}
            {flying && spot && <FlyCard key={'f' + t.n} to={seatSpot(sp, n, 0.66)} />}
            {settling && <SettleCard key={'s' + settling.n} spot={settling.spot} />}
            {game.order.map((tk, i) => {
              const s = seatSpot(i, n);
              const p = game.players[tk];
              const role = t?.speaker === tk ? 'speaker' : asker === tk && t ? 'asker' : '';
              return (
                <div key={tk} className={'tv-seat ' + role} style={{ left: s.x + '%', top: s.y + '%' }}>
                  <div className="tv-seat-in">
                    {role === 'asker' && <span className="tv-ask">يَسْأَلُ</span>}
                    <Emblem kind={p.emblem} />
                    <span className="tv-name">
                      {p.name}
                      {p.test && <small> · تَجْرِبَةٌ</small>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lobby && <LobbyCard game={game} />}
      {showCard && (
        <div className={'tv-stage' + (flying ? ' late' : '')} key={'c' + t.n} style={{ '--from-x': (spot.x - 50) * 0.8 + 'vw' }}>
          <Card3D id={t.card} title={d.title} flipped={t.step === 'back'} size="stage" footer={<>{name(t.speaker)}</>} />
        </div>
      )}
    </div>
  );
}

function Deck({ count }) {
  const layers = Math.min(count, 16);
  return (
    <div className="tv-deck" style={{ left: DECK.x + '%', top: DECK.y + '%' }}>
      {count === 0 && <span className="tv-deck-empty" />}
      {Array.from({ length: layers }, (_, i) => (
        <CardBack key={i} style={{ transform: `translateZ(${i * 2}px) rotate(${(i % 3) - 1}deg)` }} />
      ))}
    </div>
  );
}

function Stack({ count, x, y, deg }) {
  if (count <= 0) return null;
  return (
    <div className="tv-stack" style={{ left: x + '%', top: y + '%', '--r': deg - 90 + 'deg' }}>
      {Array.from({ length: Math.min(count, 10) }, (_, i) => (
        <CardBack key={i} style={{ transform: `translateZ(${i * 2}px) rotate(${((i * 37) % 11) - 5}deg)` }} />
      ))}
    </div>
  );
}

/** The drawn card slides off the deck towards the speaker, then lifts away (the big card takes over). */
function FlyCard({ to }) {
  return (
    <div className="tv-fly" style={{ '--x0': DECK.x + '%', '--y0': DECK.y + '%', '--x1': to.x + '%', '--y1': to.y + '%' }}>
      <CardBack />
    </div>
  );
}

/** After the answer, the card drops onto the speaker's stack. */
function SettleCard({ spot }) {
  return (
    <div className="tv-settle" style={{ left: spot.x + '%', top: spot.y + '%', '--r': spot.deg - 90 + 'deg' }}>
      <CardBack />
    </div>
  );
}

function LobbyCard({ game }) {
  const url = joinUrl(game.pin);
  const svg = useQr(url);
  return (
    <div className="tv-lobby panel">
      <div className="lb-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <p className="lb-say">اِمْسَحُوا الرَّمْزَ، أَوِ افْتَحُوا الْمَوْقِعَ وَاكْتُبُوا الرَّقْمَ:</p>
        <div className="lb-pin ltr">{game.pin}</div>
        <p className="lb-url ltr">{url.replace(/^https?:\/\//, '')}</p>
        {game.order.length === 0 && <p className="muted lb-wait">فِي انْتِظَارِ اللَّاعِبِينَ…</p>}
      </div>
    </div>
  );
}

function Wall({ game }) {
  const d = DAYS.find((x) => x.n === game.day);
  const ids = wallCards(game);
  return (
    <div className="wl">
      <header className="tv-head">
        <span className="brand">مَقْهَى الْمُحَادَثَةِ</span>
        <span className="tv-day">
          {dayLabel(d.n)} · {d.title}
        </span>
      </header>
      <h1 className="wl-title">أَسْئِلَةُ الْيَوْمِ</h1>
      {ids.length === 0 ? (
        <p className="muted wl-none">لَمْ نُجِبْ عَنْ أَيِّ سُؤَالٍ الْيَوْمَ.</p>
      ) : (
        <div className={'wl-grid' + (ids.length > 9 ? ' many' : '')}>
          {ids.map((id, i) => (
            <Card3D
              key={id}
              id={id}
              title={d.title}
              size="wall"
              className="wl-card"
              style={{ animationDelay: Math.min(i * 90, 2400) + 'ms', '--tilt': ((i * 7) % 5) - 2 + 'deg' }}
            />
          ))}
        </div>
      )}
      <p className="wl-thanks">شُكْرًا لَكُمْ!</p>
    </div>
  );
}
