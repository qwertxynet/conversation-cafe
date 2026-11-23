import { useEffect, useRef, useState } from 'react';
import Card from '../components/Card.jsx';
import { connectClient } from '../lib/net.js';
import { validName, cleanName } from '../lib/game.js';
import { store, toArabicDigits } from '../lib/store.js';
import './phone.css';

const REASONS = {
  name: 'اُكْتُبِ اسْمَكَ بِالْحُرُوفِ الْعَرَبِيَّةِ (حَرْفَانِ عَلَى الْأَقَلِّ).',
  taken: 'هَذَا الِاسْمُ مُسْتَعْمَلٌ. اِخْتَرِ اسْمًا آخَرَ.',
  full: 'اللُّعْبَةُ مُمْتَلِئَةٌ.',
  ended: 'انْتَهَتْ هَذِهِ اللُّعْبَةُ.',
  'no-host': 'لَا تُوجَدُ لُعْبَةٌ بِهَذَا الرَّقْمِ الْآنَ.',
};
const keyFor = (pin, test) => 'p-' + pin + (test ? '-test' : '');
const randomToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Students' phones: join with PIN + Arabic nickname, then see the question and their 5 cards. */
export default function Phone({ pin: routePin = '', test = false }) {
  const [pin, setPin] = useState(routePin);
  const [rec, setRec] = useState(() => (routePin ? store.get(keyFor(routePin, test), null) : null));
  const [error, setError] = useState('');

  useEffect(() => {
    if (test && routePin && !rec) {
      // the teacher's test player joins straight away
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
    if (!/^\d{4}$/.test(p)) return setErr('اُكْتُبْ رَقْمَ اللُّعْبَةِ: أَرْبَعَةُ أَرْقَامٍ.');
    const n = cleanName(name);
    if (!validName(n)) return setErr(REASONS.name);
    onJoin(p, n);
  };
  return (
    <div className="ph ph-join" dir="rtl" lang="ar">
      <h1 className="brand ph-brand">مَقْهَى الْمُحَادَثَةِ</h1>
      <form className="ph-form panel" onSubmit={submit}>
        <label>
          رَقْمُ اللُّعْبَةِ
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

function Play({ pin, rec, test, onLeave }) {
  const [status, setStatus] = useState('connecting');
  const [joined, setJoined] = useState(false);
  const [s, setS] = useState(null); // last sync from the host
  const [open, setOpen] = useState(null); // card being looked at
  const [leaving, setLeaving] = useState(null);
  const [noHostCount, setNoHostCount] = useState(0);
  const client = useRef(null);
  const everJoined = useRef(false);

  useEffect(() => {
    const c = connectClient(pin, {
      onOpen: () => c.send({ type: 'hello', token: rec.token, name: rec.name, test }),
      onStatus: (st) => {
        setStatus(st);
        if (st === 'no-host' && !everJoined.current) setNoHostCount((n) => n + 1);
      },
      onMessage: (m) => {
        if (!m || typeof m !== 'object') return;
        if (m.type === 'welcome') {
          everJoined.current = true;
          setJoined(true);
        } else if (m.type === 'sync') {
          everJoined.current = true;
          setJoined(true);
          setS(m);
          setLeaving(null);
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

  // never joined and no game at this PIN: back to the form
  useEffect(() => {
    if (noHostCount >= 2 && !everJoined.current) {
      client.current?.close();
      onLeave('no-host');
    }
  }, [noHostCount, onLeave]);

  const online = status === 'open' && joined;
  const usable = online && s?.phase === 'question';

  const use = (id) => {
    if (!usable) return;
    if (client.current?.send({ type: 'play', token: rec.token, id })) {
      setLeaving(id);
      setOpen(null);
    }
  };

  if (s?.phase === 'ended')
    return (
      <div className="ph ph-center" dir="rtl" lang="ar">
        <h1 className="brand">شُكْرًا لَكُمْ!</h1>
        <p>انْتَهَتِ الْجَلْسَةُ. إِلَى اللِّقَاءِ.</p>
      </div>
    );

  return (
    <div className="ph" dir="rtl" lang="ar">
      <header className="ph-head">
        <span className="ph-me">
          <span className={'dot ' + (online ? 'on' : status === 'connecting' ? 'warn' : 'bad')} />
          {rec.name}
          {test && <span className="muted"> · تَجْرِبَةٌ</span>}
        </span>
        <span className="muted ltr">{toArabicDigits(pin)}</span>
      </header>

      {!online && <p className="ph-status">{joined ? 'انْقَطَعَ الِاتِّصَالُ… نُحَاوِلُ مِنْ جَدِيدٍ' : 'جَارٍ الِاتِّصَالُ…'}</p>}

      {s && (
        <>
          <section className="ph-q">
            {s.phase === 'lobby' && <p className="ph-wait">أَنْتَ فِي اللُّعْبَةِ! انْتَظِرْ حَتَّى يَبْدَأَ الْمُعَلِّمُ. هَذِهِ بِطَاقَاتُكَ:</p>}
            {s.phase === 'question' && (
              <>
                <p className="muted ph-qn">
                  السُّؤَالُ {toArabicDigits(s.qn)} مِنْ {toArabicDigits(s.qTotal)}
                </p>
                <p className="ph-qt">{s.question}</p>
              </>
            )}
            {s.phase === 'wall' && <p className="ph-wait">شُكْرًا! اُنْظُرُوا إِلَى الشَّاشَةِ.</p>}
          </section>

          {s.phase !== 'wall' && (
            <section className="ph-hand">
              {s.hand.map((id) => (
                <button key={id} className={'ph-cardbtn' + (leaving === id ? ' leaving' : '')} onClick={() => setOpen(id)} aria-label="افتح البطاقة">
                  <Card id={id} size="md" />
                </button>
              ))}
            </section>
          )}
        </>
      )}

      {open && (
        <div className="ph-modal" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="ph-modal-in" onClick={(e) => e.stopPropagation()}>
            <Card id={open} size="lg" />
            {usable ? (
              <button className="btn primary ph-use" onClick={() => use(open)}>
                اِسْتَعْمَلْتُهَا ✓
              </button>
            ) : (
              <p className="muted">{s?.phase === 'lobby' ? 'تَبْدَأُ اللُّعْبَةُ بَعْدَ قَلِيلٍ.' : 'انْتَظِرِ الِاتِّصَالَ…'}</p>
            )}
            <button className="btn ghost" onClick={() => setOpen(null)}>
              رُجُوعٌ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
