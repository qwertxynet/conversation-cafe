import { useState } from 'react';
import Card, { Stars } from '../components/Card.jsx';
import { DAYS, ALL_CARDS, dayPlan, WEEK } from '../lib/content.js';
import { useStored } from '../lib/store.js';

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Paper backup: card decks (8 per A4 page), question sheets, and a teacher page. */
export default function PrintTab({ t }) {
  const [custom] = useStored('custom', {});
  const [sel, setSel] = useState(() => new Set(['shared']));
  const toggle = (k) => {
    const s = new Set(sel);
    s.has(k) ? s.delete(k) : s.add(k);
    setSel(s);
  };
  const options = [['shared', t.printShared]];
  DAYS.forEach((d) => {
    options.push([`deck${d.n}`, `${t.day} ${d.n}: ${t.printDeck}`]);
    options.push([`qs${d.n}`, `${t.day} ${d.n}: ${t.printQs}`]);
    options.push([`teacher${d.n}`, `${t.day} ${d.n}: ${t.printTeacher}`]);
  });
  const sharedIds = Object.keys(ALL_CARDS).filter((id) => id.startsWith('s') && !(custom?.sharedHidden || []).includes(id));

  return (
    <section>
      <div className="no-print">
        <p className="muted">{t.printHelp}</p>
        <div className="h-printopts">
          {options.map(([k, label]) => (
            <label key={k}>
              <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} /> {label}
            </label>
          ))}
        </div>
        <button className="btn primary" onClick={() => window.print()} disabled={!sel.size}>
          🖨 {t.printNow}
        </button>
      </div>

      <div className="sheets">
        {sel.has('shared') && <CardPages title="الْعِبَارَاتُ الْمُشْتَرَكَةُ" ids={sharedIds} />}
        {DAYS.map((d) => {
          const plan = dayPlan(d.n, custom);
          const daily = plan.pool.filter((id) => id.startsWith('d'));
          return (
            <div key={d.n}>
              {sel.has(`deck${d.n}`) && <CardPages title={d.title} ids={daily} />}
              {sel.has(`qs${d.n}`) && (
                <section className="sheet">
                  <h1 className="sheet-h" dir="rtl">
                    {d.title} <Stars n={d.stars} />
                  </h1>
                  <ol className="sheet-qs" dir="rtl" lang="ar">
                    {plan.questions.map((q) => (
                      <li key={q.i}>{q.q}</li>
                    ))}
                  </ol>
                </section>
              )}
              {sel.has(`teacher${d.n}`) && (
                <section className="sheet">
                  <h1 className="sheet-h" dir="rtl">
                    {d.title} · {d.en}
                  </h1>
                  <ol className="sheet-qs teacher" dir="rtl" lang="ar">
                    {plan.questions.map((q) => (
                      <li key={q.i}>
                        <b>{q.q}</b>
                        <br />
                        <span>{q.a}</span>
                      </li>
                    ))}
                  </ol>
                  <h2 className="sheet-h2">Fact notes (as of {WEEK.asOf})</h2>
                  <ul className="sheet-facts">
                    {d.facts.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                  <p className="sheet-src">Sources: {d.sources.map((s) => `${s.name} (${s.url})`).join('; ')}</p>
                </section>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CardPages({ title, ids }) {
  return chunk(ids, 8).map((page, i) => (
    <section key={i} className="sheet cards-sheet">
      <p className="sheet-small" dir="rtl">
        مَقْهَى الْمُحَادَثَةِ · {title}
      </p>
      <div className="cut-grid">
        {page.map((id) => (
          <div key={id} className="cut">
            <Card id={id} size="md" />
          </div>
        ))}
      </div>
    </section>
  ));
}
