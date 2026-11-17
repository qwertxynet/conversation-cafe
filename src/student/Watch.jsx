import { useState } from 'react';
import { SESSIONS, EPISODES, GUIDE, TF } from '../data/sessions.js';
import { ar } from '../lib.js';
import { LETTERS } from '../Segment.jsx';
import { PreviewBanner, useStudent, useStudentStore } from './Student.jsx';

/**
 * Viewing guide for the session 1 videos, on students' phones (#/watch).
 * Answers stay on the phone; each block has a «check» button for the pair-talk that follows it.
 */
export default function Watch() {
  const { base } = useStudent();
  const blocks = SESSIONS[0].segments.filter((g) => g.kind === 'video');
  const [b, setB] = useState(0);
  const [ans, setAns] = useStudentStore('watch', {});
  const [checked, setChecked] = useStudentStore('watch-checked', {});
  const [seen, setSeen] = useStudentStore('watch-seen', {});
  const block = blocks[b];
  const answers = ans || {};
  const isChecked = !!checked?.[b];

  const qs = block.episodes.flatMap((ep) => (GUIDE[ep]?.qs || []).map((q, k) => ({ ep, k, q, key: ep + '.' + k })));
  const right = (x) => (x.q.t === 'tf' ? answers[x.key] === (x.q.a ? 0 : 1) : answers[x.key] === x.q.c);
  const score = qs.filter(right).length;
  const words = new Set(seen?.[b] || []);

  return (
    <div className="learn watch" dir="rtl" lang="ar">
      <PreviewBanner />
      <header className="learn-top">
        <a href={base}>→ مَقْهَى الْمُحَادَثَةِ</a>
        <h1>
          <small>الْجَلْسَةُ الْأُولَى</small>
          دَلِيلُ الْمُشَاهَدَةِ
        </h1>
      </header>
      <nav className="learn-tabs" role="tablist">
        {blocks.map((g, i) => (
          <button key={i} role="tab" aria-selected={b === i} className={b === i ? 'on' : ''} onClick={() => setB(i)}>
            الْمُشَاهَدَةُ {ar(i + 1)}
          </button>
        ))}
      </nav>

      <main className="learn-body">
        {block.episodes.map((ep) => (
          <section key={ep} className="learn-card">
            <h2>
              الْحَلْقَةُ {ar(ep)}: {EPISODES[ep].title}
            </h2>
            {(GUIDE[ep]?.qs || []).map((q, k) => {
              const key = ep + '.' + k;
              const opts = q.t === 'tf' ? TF : q.a;
              const correct = q.t === 'tf' ? (q.a ? 0 : 1) : q.c;
              return (
                <div key={key} className="wq">
                  <p className="wq-q">{q.q}</p>
                  <div className={'wq-opts' + (q.t === 'tf' ? ' tf' : '')}>
                    {opts.map((o, i) => {
                      const picked = answers[key] === i;
                      let cls = picked ? 'picked' : '';
                      if (isChecked && i === correct) cls = 'right';
                      else if (isChecked && picked) cls = 'wrong';
                      return (
                        <button key={i} className={cls} aria-pressed={picked} disabled={isChecked} onClick={() => setAns((p) => ({ ...(p || {}), [key]: i }))}>
                          {q.t === 'mc' && <span className="letter">{LETTERS[i]}</span>}
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        ))}

        <section className="learn-card">
          <h2>اِبْحَثُوا عَنْ هَذِهِ الْكَلِمَاتِ</h2>
          <ul className="spot-words">
            {block.spot.map((w) => (
              <li key={w}>
                <button
                  className={words.has(w) ? 'seen' : ''}
                  aria-pressed={words.has(w)}
                  onClick={() => {
                    words.has(w) ? words.delete(w) : words.add(w);
                    setSeen((p) => ({ ...(p || {}), [b]: [...words] }));
                  }}
                >
                  {w}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="card-nav watch-check">
          {isChecked ? (
            <>
              <p className="feedback yes">
                {ar(score)} مِنْ {ar(qs.length)} ✓
              </p>
              <button onClick={() => setChecked((p) => ({ ...(p || {}), [b]: false }))}>↺ أُغَيِّرُ أَجْوِبَتِي</button>
            </>
          ) : (
            <button className="primary" onClick={() => setChecked((p) => ({ ...(p || {}), [b]: true }))}>
              تَحَقَّقْ مِنْ أَجْوِبَتِي
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
