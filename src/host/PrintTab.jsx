import { useState } from 'react';
import { Stars } from '../components/Card.jsx';
import { CARDS, DAYS, FOLLOWUPS, WEEK, dayPlan } from '../lib/content.js';
import { useStored } from '../lib/store.js';

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/**
 * Paper backup. Fold-over cards: 4 per A4 page, each a strip with the question on one half and the two frames on the other.
 * Cut along the dashed line, fold down the middle (the dotted line), and the card is double-sided.
 */
export default function PrintTab({ t }) {
  const [custom] = useStored('custom', {});
  const [sel, setSel] = useState(() => new Set(['cards1']));
  const toggle = (k) => {
    const s = new Set(sel);
    s.has(k) ? s.delete(k) : s.add(k);
    setSel(s);
  };
  const options = [];
  DAYS.forEach((d) => {
    options.push([`cards${d.n}`, `${t.day} ${d.n}: ${t.printCards}`]);
    options.push([`teacher${d.n}`, `${t.day} ${d.n}: ${t.printTeacher}`]);
  });
  options.push(['fu', t.printFollowups]);

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
        {DAYS.flatMap((d) => {
          const plan = dayPlan(d.n, custom);
          // a flat list of pages, so the last one doesn't leave a blank page behind
          return [
            sel.has(`cards${d.n}`) &&
              chunk(plan.cards, 4).map((page, i) => (
                <section key={d.n + '-' + i} className="sheet fold-sheet">
                  {page.map((id) => (
                    <FoldCard key={id} id={id} title={d.title} />
                  ))}
                </section>
              )),
            sel.has(`teacher${d.n}`) && (
              <section key={'t' + d.n} className="sheet">
                <h1 className="sheet-h" dir="rtl">
                  {d.title} · {d.en}
                </h1>
                <ol className="sheet-qs teacher" dir="rtl" lang="ar">
                  {plan.cards.map((id) => (
                    <li key={id}>
                      <b>{CARDS[id].q}</b>
                      <br />
                      <span>{CARDS[id].a}</span>
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
            ),
          ]
            .flat()
            .filter(Boolean);
        })}
        {sel.has('fu') && (
          <section className="sheet">
            <h1 className="sheet-h" dir="rtl">
              عِبَارَاتُ الْمُتَابَعَةِ
            </h1>
            <ol className="sheet-qs" dir="rtl" lang="ar">
              {FOLLOWUPS.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </section>
  );
}

function FoldCard({ id, title }) {
  const c = CARDS[id];
  return (
    <div className="fold" dir="rtl" lang="ar">
      <div className="fold-half">
        <p className="fold-top">
          <span>{title}</span>
          <Stars n={c.s} />
        </p>
        <p className="fold-q">{c.q}</p>
      </div>
      <div className="fold-half back">
        <p className="fold-f">
          <span className="stars">★</span> {c.f1}
        </p>
        <p className="fold-or">أَوْ</p>
        <p className="fold-f">
          <span className="stars">★★★</span> {c.f3}
        </p>
      </div>
    </div>
  );
}
