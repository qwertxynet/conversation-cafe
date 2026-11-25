import { useEffect, useRef, useState } from 'react';
import Card3D, { CardBack } from '../components/Card.jsx';
import Emblem, { EMBLEM_AR } from '../components/Emblem.jsx';
import { connectClient } from '../lib/net.js';
import { EMBLEMS, validName, cleanName } from '../lib/game.js';
import { store, toArabicDigits } from '../lib/store.js';
import './phone.css';

const REASONS = {
  name: 'اُكْتُبِ اسْمَكَ بِالْحُرُوفِ الْعَرَبِيَّةِ (حَرْفَانِ عَلَى الْأَقَلِّ).',
  taken: 'هَذَا الِاسْمُ مُسْتَعْمَلٌ. اِخْتَرِ اسْمًا آخَرَ.',
  full: 'الطَّاوِلَةُ مُمْتَلِئَةٌ.',
  ended: 'انْتَهَتْ هَذِهِ الْجَلْسَةُ.',
  'no-host': 'لَا تُوجَدُ جَلْسَةٌ بِهَذَا الرَّقْمِ الْآنَ.',
};
const keyFor = (pin, test) => 'p-' + pin + (test ? '-test' : '');
const randomToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/** "Your turn in N", with the counted noun in the right form (N is at most 5). */
function untilText(n) {
  if (n === 0) return 'دَوْرُكَ!';
  if (n === 1) return 'أَنْتَ التَّالِي';
  if (n === 2) return 'دَوْرُكَ بَعْدَ دَوْرَيْنِ';
  return `دَوْرُكَ بَعْدَ ${toArabicDigits(n)} أَدْوَارٍ`;
}

/** Students' phones: join with the PIN, an Arabic nickname and an emblem, then follow the turns round the table. */
export default function Phone({ pin: routePin = '', test = false }) {
  const [pin, setPin] = useState(routePin);
  const [rec, setRec] = useState(() => (routePin ? store.get(keyFor(routePin, test), null) : null));
  const [error, setError] = useState('');

  useEffect(() => {
    if (test && routePin && !rec) {
      // the teacher's test player skips the nickname
      const r = { token: randomToken(), name: 'الْمُعَلِّمُ' };
      store.set(keyFor(routePin, true), r);
      setRec(r);
    }
  }, [test, routePin, rec]);

  const leave = (reason) => {
    store.set(keyFor(pin, test), undefined);
    setRec(null);
    setError(REASONS[reason] || '');
  };

  if (!rec)
    return (
      <JoinForm
        pin={pin}
        error={error}
        onJoin={(p, name) => {
          const r = { token: randomToken(), name };
          store.set(keyFor(p, test), r);
          setPin(p);
          setRec(r);
          setError('');
          if (location.hash !== '#/join/' + p) history.replaceState(null, '', '#/join/' + p);
        }}
      />
    );
  return <Play key={pin + rec.token} pin={pin} rec={rec} test={test} onLeave={leave} />;
}

function JoinForm({ pin: pin0, error, onJoin }) {
  const [pin, setPin] = useState(pin0);
  const [name, setName] = useState('');
  const [err, setErr] = useState(error);
  useEffect(() => setErr(error), [error]);
  const submit = (e) => {
    e.preventDefault();
    const p = (pin || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
    if (!/^\d{4}$/.test(p)) return setErr('اُكْتُبْ رَقْمَ الْجَلْسَةِ: أَرْبَعَةُ أَرْقَامٍ.');
    const n = cleanName(name);
    if (!validName(n)) return setErr(REASONS.name);
    onJoin(p, n);
  };
  return (
    <div className="ph ph-join" dir="rtl" lang="ar">
      <h1 className="brand ph-brand">مَقْهَى الْمُحَادَثَةِ</h1>
      <form className="ph-form panel" onSubmit={submit}>
        <label>
          رَقْمُ الْجَلْسَةِ
          <input className="ph-pin ltr" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" />
        </label>
        <label>
          اِسْمُكَ (بِالْعَرَبِيَّةِ)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} autoComplete="off" dir="rtl" lang="ar" />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn primary ph-go">اُدْخُلْ</button>
      </form>
    </div>
  );
}

function Play({ pin, rec: rec0, test, onLeave }) {
  const [rec, setRec] = useState(rec0);
  const [status, setStatus] = useState('connecting');
  const [joined, setJoined] = useState(false);
  const [s, setS] = useState(null); // last sync from the host
  const [pick, setPick] = useState(null); // { taken, again } while choosing an emblem
  const [pending, setPending] = useState(false); // a tap is on its way
  const [noHostCount, setNoHostCount] = useState(0);
  const client = useRef(null);
  const recRef = useRef(rec);
  recRef.current = rec;
  const everJoined = useRef(false);
  const lastSync = useRef(null);

  useEffect(() => {
    const hello = () => {
      const r = recRef.current;
      c.send({ type: 'hello', token: r.token, name: r.name, emblem: r.emblem, test });
    };
    const c = connectClient(pin, {
      onOpen: hello,
      onStatus: (st) => {
        setStatus(st);
        if (st === 'no-host' && !everJoined.current) setNoHostCount((n) => n + 1);
      },
      onMessage: (m) => {
        if (!m || typeof m !== 'object') return;
        if (m.type === 'pick') {
          everJoined.current = true;
          setPick({ taken: m.taken || [], again: !!m.again });
        } else if (m.type === 'welcome') {
          everJoined.current = true;
          setJoined(true);
          setPick(null);
          if (m.emblem && m.emblem !== recRef.current.emblem) {
            const r = { ...recRef.current, emblem: m.emblem };
            store.set(keyFor(pin, test), r);
            setRec(r);
          }
        } else if (m.type === 'sync') {
          everJoined.current = true;
          setJoined(true);
          setPick(null);
          setPending(false);
          const prev = lastSync.current;
          if (m.turn?.mine && m.turn.step === 'draw' && !(prev?.turn?.mine && prev.turn.n === m.turn.n)) navigator.vibrate?.([120, 60, 120]);
          lastSync.current = m;
          setS(m);
        } else if (m.type === 'reject') {
          c.close();
          onLeave(m.reason);
        } else if (m.type === 'end') {
          c.close();
          store.set(keyFor(pin, test), undefined);
          setS((x) => ({ ...(x || {}), phase: 'ended' }));
        }
      },
    });
    client.current = c;
    return () => c.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, rec.token]);

  // never joined and no session at this PIN: back to the form
  useEffect(() => {
    if (noHostCount >= 2 && !everJoined.current) {
      client.current?.close();
      onLeave('no-host');
    }
  }, [noHostCount, onLeave]);

  const online = status === 'open' && (joined || !!pick);
  const send = (act) => {
    if (pending || !s?.turn) return;
    if (client.current?.send({ type: 'act', token: rec.token, act, n: s.turn.n })) setPending(true);
  };
  const choose = (emblem) => {
    const r = { ...rec, emblem };
    store.set(keyFor(pin, test), r);
    setRec(r);
    recRef.current = r;
    client.current?.send({ type: 'hello', token: r.token, name: r.name, emblem, test });
  };

  if (s?.phase === 'ended')
    return (
      <div className="ph ph-center" dir="rtl" lang="ar">
        <h1 className="brand">شُكْرًا لَكُمْ!</h1>
        <p>انْتَهَتِ الْجَلْسَةُ. إِلَى اللِّقَاءِ.</p>
      </div>
    );

  const me = s?.me || (rec.emblem ? { name: rec.name, emblem: rec.emblem } : { name: rec.name });

  return (
    <div className="ph" dir="rtl" lang="ar">
      <header className="ph-head">
        <span className="ph-me">
          {me.emblem && <Emblem kind={me.emblem} />}
          {me.name}
          {test && <span className="muted"> · تَجْرِبَةٌ</span>}
        </span>
        <span className="ph-pinbox">
          <span className={'dot ' + (online ? 'on' : status === 'connecting' ? 'warn' : 'bad')} />
          <span className="muted ltr">{toArabicDigits(pin)}</span>
        </span>
      </header>

      {!online && <p className="ph-status">{joined ? 'انْقَطَعَ الِاتِّصَالُ… نُحَاوِلُ مِنْ جَدِيدٍ' : 'جَارٍ الِاتِّصَالُ…'}</p>}

      {pick && !joined && <EmblemPicker taken={pick.taken} again={pick.again} onPick={choose} />}

      {s && joined && (
        <>
          <Seats seats={s.seats} />
          {s.phase === 'lobby' && (
            <section className="ph-msg">
              <p className="ph-big">أَنْتَ عَلَى الطَّاوِلَةِ!</p>
              <p>اِنْتَظِرْ حَتَّى يَبْدَأَ الْمُعَلِّمُ.</p>
            </section>
          )}
          {s.phase === 'wall' && (
            <section className="ph-msg">
              <p className="ph-big">شُكْرًا!</p>
              <p>اُنْظُرُوا إِلَى الشَّاشَةِ.</p>
            </section>
          )}
          {s.phase === 'table' && <Turn s={s} send={send} pending={pending || !online} />}
        </>
      )}
    </div>
  );
}

function EmblemPicker({ taken, again, onPick }) {
  return (
    <section className="ph-pick">
      <h2>اِخْتَرْ رَمْزَكَ</h2>
      {again && <p className="err">أَخَذَ طَالِبٌ آخَرُ هَذَا الرَّمْزَ. اِخْتَرْ رَمْزًا آخَرَ.</p>}
      <div className="ph-pickgrid">
        {EMBLEMS.map((e) => {
          const off = taken.includes(e);
          return (
            <button key={e} className="ph-pickbtn" disabled={off} onClick={() => onPick(e)}>
              <Emblem kind={e} />
              <span>{EMBLEM_AR[e]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Everyone at the table, in seat order: the speaker glows, the asker is marked. */
function Seats({ seats }) {
  return (
    <ol className="ph-seats">
      {seats.map((p, i) => (
        <li key={i} className={(p.speaker ? 'speaker ' : '') + (p.asker ? 'asker ' : '') + (p.me ? 'me' : '')}>
          <Emblem kind={p.emblem} />
          <span className="ph-seatname">{p.name}</span>
          {p.asker && <span className="ph-seattag">يَسْأَلُ</span>}
          {p.stack > 0 && (
            <span className="ph-minis" aria-hidden="true">
              {Array.from({ length: Math.min(p.stack, 6) }, (_, k) => (
                <CardBack key={k} />
              ))}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Turn({ s, send, pending }) {
  const t = s.turn;
  if (!t) return <p className="ph-msg">فِي انْتِظَارِ اللَّاعِبِينَ…</p>;
  const sp = t.speaker;

  // ───── my turn ─────
  if (t.mine) {
    if (t.step === 'draw')
      return (
        <section className="ph-turn mine">
          <p className="ph-yours">دَوْرُكَ!</p>
          <div className="ph-deck">
            <CardBack />
            <CardBack />
            <CardBack />
          </div>
          {s.deckLeft > 0 ? (
            <button className="btn primary ph-act" onClick={() => send('draw')} disabled={pending}>
              اِسْحَبْ بِطَاقَةً
            </button>
          ) : (
            <p className="muted">انْتَهَتِ الْبِطَاقَاتُ. اِنْتَظِرِ الْمُعَلِّمَ.</p>
          )}
        </section>
      );
    if (t.step === 'front')
      return (
        <section className="ph-turn mine">
          <p className="ph-hint">اِقْرَأِ السُّؤَالَ بِصَوْتٍ عَالٍ، ثُمَّ أَجِبْ عَنْهُ بِكَلِمَاتِكَ.</p>
          <Card3D card={t.card} title={s.title} size="phone" className="ph-card deal" />
          <button className="btn primary ph-act" onClick={() => send('said')} disabled={pending}>
            قُلْتُهَا ✓
          </button>
        </section>
      );
    if (t.step === 'ask')
      return (
        <section className="ph-turn">
          <p className="ph-big">أَحْسَنْتَ!</p>
          <p>
            اِسْتَمِعْ إِلَى سُؤَالِ <b>{t.asker?.name}</b>.
          </p>
        </section>
      );
  }

  // ───── I ask the follow-up ─────
  if (t.asking && t.step === 'ask')
    return (
      <section className="ph-turn mine">
        <p className="ph-yours small">
          اِسْأَلْ <b>{sp.name}</b> سُؤَالًا لِلْمُتَابَعَةِ:
        </p>
        <ul className="ph-fu">
          {t.fu.map((f, i) => (
            <li key={i} style={{ animationDelay: i * 120 + 'ms' }}>
              {f}
            </li>
          ))}
        </ul>
        <button className="btn primary ph-act" onClick={() => send('asked')} disabled={pending}>
          سَأَلْتُ ✓
        </button>
      </section>
    );

  // ───── watching someone else's turn ─────
  return (
    <section className="ph-turn">
      <p className="ph-until">{untilText(s.until)}</p>
      <p className="ph-who">
        <Emblem kind={sp.emblem} />
        <span>
          دَوْرُ <b>{sp.name}</b>
        </span>
      </p>
      {t.card ? (
        <Card3D card={t.card} title={s.title} size="phone" className="ph-card watch" />
      ) : (
        <div className="ph-deck small">
          <CardBack />
          <CardBack />
        </div>
      )}
      {t.step === 'ask' && t.asker && (
        <p className="ph-hint">
          <b>{t.asker.name}</b> · يَسْأَلُ سُؤَالًا لِلْمُتَابَعَةِ
        </p>
      )}
    </section>
  );
}
