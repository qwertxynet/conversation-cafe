import { useState } from 'react';
import { Stars } from '../components/Card.jsx';
import { CARDS, DAYS, FOLLOWUPS, dayPlan } from '../lib/content.js';
import { useStored } from '../lib/store.js';
import { syncAll } from './sync.js';

/** Hide or reorder the question cards, and hide follow-up starters. Stored as "custom". */
export default function EditTab({ t }) {
  const [custom, setCustom] = useStored('custom', {});
  const [day, setDay] = useState(1);
  const plan = dayPlan(day, custom);
  const { order, hidden } = plan;
  const fuHidden = new Set(custom?.fuHidden || []);

  const saveDay = (patch) => setCustom((prev) => ({ ...(prev || {}), days: { ...(prev?.days || {}), [day]: { order, hidden: [...hidden], ...patch } } }));
  const move = (pos, dlt) => {
    const o = [...order];
    const j = pos + dlt;
    if (j < 0 || j >= o.length) return;
    [o[pos], o[j]] = [o[j], o[pos]];
    saveDay({ order: o });
  };
  const toggled = (set, id) => {
    const s = new Set(set);
    s.has(id) ? s.delete(id) : s.add(id);
    return [...s];
  };

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
          {t.day} {plan.day.n}: {plan.day.en} <Stars n={plan.day.stars} />
        </h2>
        <ol className="h-qlist">
          {order.map((id, pos) => {
            const c = CARDS[id];
            return (
              <li key={id} className={hidden.has(id) ? 'hidden' : ''}>
                <label className="h-check">
                  <input type="checkbox" checked={!hidden.has(id)} onChange={() => saveDay({ hidden: toggled(hidden, id) })} />
                  <span className="sr">{hidden.has(id) ? t.hide : t.shown}</span>
                </label>
                <span className="h-qtext" lang="ar" dir="rtl">
                  {c.q}
                </span>
                <Stars n={c.s} />
                <span className={'h-tag' + (c.src === 'new' ? ' new' : '')}>{c.src === 'new' ? t.newCard : t.approved}</span>
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
        <button className="btn small ghost" onClick={() => setCustom((prev) => ({ ...(prev || {}), days: { ...(prev?.days || {}), [day]: {} } }))}>
          ↺ {t.reset}
        </button>
      </div>

      <div className="panel h-sec">
        <h2>{t.followupsAll}</h2>
        <ul className="h-qlist">
          {FOLLOWUPS.map((f, i) => (
            <li key={i} className={fuHidden.has(i) ? 'hidden' : ''}>
              <label className="h-check">
                <input
                  type="checkbox"
                  checked={!fuHidden.has(i)}
                  onChange={() => {
                    setCustom((prev) => ({ ...(prev || {}), fuHidden: toggled(fuHidden, i) }));
                    setTimeout(syncAll, 0);
                  }}
                />
                <span className="sr">{fuHidden.has(i) ? t.hide : t.shown}</span>
              </label>
              <span className="h-qtext" lang="ar" dir="rtl">
                {f}
              </span>
            </li>
          ))}
        </ul>
        <button className="btn small ghost" onClick={() => setCustom((prev) => ({ ...(prev || {}), fuHidden: [] }))}>
          ↺ {t.resetFu}
        </button>
      </div>
    </section>
  );
}
