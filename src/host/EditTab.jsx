import { useState } from 'react';
import Card, { Stars } from '../components/Card.jsx';
import { DAYS, ALL_CARDS } from '../lib/content.js';
import { useStored } from '../lib/store.js';
import { syncAll } from './Host.jsx';

/** Hide or reorder questions and hide cards. Stored as "custom". */
export default function EditTab({ t }) {
  const [custom, setCustom] = useStored('custom', {});
  const [day, setDay] = useState(1);
  const d = DAYS.find((x) => x.n === day);
  const c = custom?.days?.[day] || {};
  const order = c.qOrder && c.qOrder.length === d.questions.length ? c.qOrder : d.questions.map((_, i) => i);
  const qHidden = new Set(c.qHidden || []);
  const cHidden = new Set(c.cardsHidden || []);
  const sHidden = new Set(custom?.sharedHidden || []);

  const saveDay = (patch) => {
    setCustom((prev) => ({ ...(prev || {}), days: { ...(prev?.days || {}), [day]: { ...(prev?.days?.[day] || {}), ...patch } } }));
    setTimeout(syncAll, 0);
  };
  const move = (pos, dlt) => {
    const o = [...order];
    const j = pos + dlt;
    if (j < 0 || j >= o.length) return;
    [o[pos], o[j]] = [o[j], o[pos]];
    saveDay({ qOrder: o });
  };
  const toggle = (set, id) => {
    const s = new Set(set);
    s.has(id) ? s.delete(id) : s.add(id);
    return [...s];
  };
  const dailyIds = d.cards.map((_, i) => `d${day}-${i}`);
  const sharedIds = Object.keys(ALL_CARDS).filter((id) => id.startsWith('s'));

  return (
    <section className="h-edit">
      <p className="muted">{t.editHelp}</p>
      <div className="h-row">
        {DAYS.map((x) => (
          <button key={x.n} className={'btn small' + (x.n === day ? ' primary' : '')} onClick={() => setDay(x.n)} aria-pressed={x.n === day}>
            {t.day} {x.n}: {x.en}
          </button>
        ))}
      </div>

      <div className="panel h-sec">
        <h2>
          {t.day} {d.n}: {d.en} <Stars n={d.stars} />
        </h2>
        <ol className="h-qlist">
          {order.map((i, pos) => {
            const q = d.questions[i];
            return (
              <li key={i} className={qHidden.has(i) ? 'hidden' : ''}>
                <label className="h-check">
                  <input type="checkbox" checked={!qHidden.has(i)} onChange={() => saveDay({ qHidden: toggle(qHidden, i) })} />
                  <span className="sr">{t.shown}</span>
                </label>
                <span className="h-qtext" lang="ar" dir="rtl">
                  {q.q}
                </span>
                <span className="muted small">{q.main ? t.main : t.short}</span>
                <button className="btn small ghost" onClick={() => move(pos, -1)} disabled={pos === 0} aria-label={t.up}>
                  ↑
                </button>
                <button className="btn small ghost" onClick={() => move(pos, 1)} disabled={pos === order.length - 1} aria-label={t.down}>
                  ↓
                </button>
              </li>
            );
          })}
        </ol>
        <h3>{t.daily}</h3>
        <CardGrid t={t} ids={dailyIds} hidden={cHidden} onToggle={(id) => saveDay({ cardsHidden: toggle(cHidden, id) })} />
        <button className="btn small ghost" onClick={() => setCustom((prev) => ({ ...(prev || {}), days: { ...(prev?.days || {}), [day]: {} } }))}>
          ↺ {t.reset}
        </button>
      </div>

      <div className="panel h-sec">
        <h2>{t.shared}</h2>
        <CardGrid t={t} ids={sharedIds} hidden={sHidden} onToggle={(id) => setCustom((prev) => ({ ...(prev || {}), sharedHidden: toggle(sHidden, id) }))} />
        <button className="btn small ghost" onClick={() => setCustom((prev) => ({ ...(prev || {}), sharedHidden: [] }))}>
          ↺ {t.resetShared}
        </button>
      </div>
    </section>
  );
}

function CardGrid({ t, ids, hidden, onToggle }) {
  return (
    <div className="h-cardgrid" dir="rtl">
      {ids.map((id) => (
        <label key={id} className={'h-cardpick' + (hidden.has(id) ? ' hidden' : '')}>
          <Card id={id} size="sm" />
          <span className="h-cardpick-l" dir="ltr">
            <input type="checkbox" checked={!hidden.has(id)} onChange={() => onToggle(id)} /> {hidden.has(id) ? t.hide : t.shown}
          </span>
        </label>
      ))}
    </div>
  );
}
