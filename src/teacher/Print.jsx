import { useMemo, useState } from 'react';
import { SESSIONS, EPISODES, GUIDE, TF, guideAnswer } from '../data/sessions.js';
import { ar, effective, shuffle, useStored } from '../lib.js';
import { PhraseTable, LETTERS } from '../Segment.jsx';
import Seating from '../Seating.jsx';
import { TopBar } from './Teacher.jsx';

/** Print-ready handouts for a session (A4). Pick the sheets, then print. */
export default function Print({ n, L, lock }) {
  const { t, dir, lang } = L;
  const base = SESSIONS.find((s) => s.n === n);
  const [custom] = useStored('custom', {});
  const eff = useMemo(() => base && effective(base, custom?.[n]), [base, custom, n]);
  const sheets = useMemo(() => (eff ? sheetsFor(eff) : []), [eff]);
  const [off, setOff] = useState(() => new Set());
  const [copies, setCopies] = useState(1);
  if (!base) return null;
  const on = sheets.filter((s) => !off.has(s.key));
  return (
    <div className="t-page print-page" dir={dir} lang={lang}>
      <div className="no-print">
        <TopBar L={L} lock={lock} title={`${t.print} · ${t.session} ${n}: ${base.title}`}>
          <a className="t-btn" href="#/teacher/sessions">
            {t.back}
          </a>
        </TopBar>
        <div className="t-body print-pick">
          {sheets.map((s) => (
            <label key={s.key}>
              <input
                type="checkbox"
                checked={!off.has(s.key)}
                onChange={() => {
                  const o = new Set(off);
                  o.has(s.key) ? o.delete(s.key) : o.add(s.key);
                  setOff(o);
                }}
              />
              {s.label[lang === 'ar' ? 1 : 0]}
              {s.key === 'bingo' && (
                <span className="copies">
                  ×
                  <input type="number" min="1" max="40" value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(40, +e.target.value || 1)))} />
                </span>
              )}
            </label>
          ))}
          <button className="btn primary" onClick={() => window.print()} disabled={!on.length}>
            🖨 {t.printNow}
          </button>
        </div>
      </div>
      <div className="sheets" dir="rtl" lang="ar">
        {on.map((s) => (s.key === 'bingo' ? [...Array(copies)].map((_, i) => <Bingo key={'b' + i} words={s.words} />) : <div key={s.key}>{s.render()}</div>))}
      </div>
    </div>
  );
}

const Sheet = ({ title, sub, children, cut }) => (
  <section className={'sheet' + (cut ? ' cut' : '')}>
    <header className="sheet-head">
      <div className="sadu" />
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
    {children}
  </section>
);

function Bingo({ words }) {
  const w = useMemo(() => shuffle(words), [words]);
  return (
    <Sheet title="اِبْحَثُوا عَنْ هَذِهِ الْكَلِمَاتِ" sub="ضَعُوا عَلَامَةً ✓ عَلَى الْكَلِمَةِ حِينَ تَرَوْنَهَا فِي التَّرْجَمَةِ.">
      <p className="name-line">الِاسْمُ: ……………………………………</p>
      <div className="bingo">
        {w.map((x) => (
          <div key={x}>{x}</div>
        ))}
      </div>
    </Sheet>
  );
}

function sheetsFor(s) {
  const out = [];
  const by = (k) => s.segments.filter((g) => g.kind === k);
  const words = by('video').flatMap((g) => g.spot);
  if (words.length) out.push({ key: 'bingo', label: ['Video word hunt (one per student)', 'البحث عن كلمات الفيديو (لكل طالب)'], words });

  const blocks = by('video');
  if (blocks.length) {
    out.push({
      key: 'guide',
      label: ['Viewing guide (one per student, a page per video block)', 'دليل المشاهدة (لكل طالب، صفحة لكل مشاهدة)'],
      render: () =>
        blocks.map((g, bi) => (
          <Sheet key={bi} title={'دَلِيلُ الْمُشَاهَدَةِ ' + ar(bi + 1)} sub="ضَعْ دَائِرَةً حَوْلَ الْجَوَابِ.">
            <p className="name-line">الِاسْمُ: ……………………………………</p>
            {g.episodes.map((ep) => (
              <div key={ep} className="guide-ep">
                <h2>
                  الْحَلْقَةُ {ar(ep)}: {EPISODES[ep].title}
                </h2>
                <ol>
                  {GUIDE[ep].qs.map((q, k) => (
                    <li key={k}>
                      {q.q}
                      <div className="guide-opts">
                        {(q.t === 'tf' ? TF : q.a).map((o, i) => (
                          <span key={i}>
                            {q.t === 'mc' ? LETTERS[i] + ') ' : '○ '}
                            {o}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <p className="guide-words">
              <b>اِبْحَثُوا عَنْ هَذِهِ الْكَلِمَاتِ:</b> {g.spot.map((w) => '☐ ' + w).join('   ')}
            </p>
          </Sheet>
        )),
    });
    out.push({
      key: 'guide-key',
      label: ['Viewing guide answer key (for you)', 'مفتاح إجابة دليل المشاهدة (للمعلّم)'],
      render: () => (
        <Sheet title="مِفْتَاحُ الْإِجَابَةِ: دَلِيلُ الْمُشَاهَدَةِ">
          {blocks.map((g, bi) => (
            <div key={bi} className="guide-ep">
              <h2>الْمُشَاهَدَةُ {ar(bi + 1)}</h2>
              {g.episodes.map((ep) => (
                <ol key={ep}>
                  {GUIDE[ep].qs.map((q, k) => (
                    <li key={k}>
                      {q.q} ← <b>{guideAnswer(q)}</b>
                    </li>
                  ))}
                </ol>
              ))}
            </div>
          ))}
        </Sheet>
      ),
    });
  }

  by('phrases').forEach((g) =>
    out.push({
      key: 'ph' + g.id,
      label: ['Phrases: ' + g.title, 'عبارات: ' + g.title],
      render: () => (
        <Sheet title={g.title} sub={g.lead}>
          <PhraseTable pairs={g.pairs} heads={g.heads} />
          {g.tiers && (
            <ol className="sheet-tiers">
              {g.tiers.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          )}
        </Sheet>
      ),
    })
  );

  by('coffee').forEach((g) =>
    out.push({
      key: 'coffee',
      label: ['Coffee steps', 'خطوات القهوة'],
      render: () => (
        <Sheet title={g.title}>
          <ol className="sheet-steps">
            {g.steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
          <p className="sheet-fact">{g.fact}</p>
        </Sheet>
      ),
    })
  );

  by('sort').forEach((g) =>
    out.push({
      key: 'sort',
      label: ["Do / don't cards (cut out)", 'بطاقات «افعل أم لا تفعل» (للقصّ)'],
      render: () => (
        <Sheet title={g.title} cut>
          <div className="cards">
            {g.cards.map((c, i) => (
              <div key={i} className="cut-card">
                {c.t}
              </div>
            ))}
          </div>
        </Sheet>
      ),
    })
  );

  by('scenarios').forEach((g) =>
    out.push({
      key: 'scen',
      label: ['Scenario cards (cut out)', 'بطاقات المواقف (للقصّ)'],
      render: () => (
        <Sheet title={g.title} cut>
          <div className="cards">
            {g.cards.map((c, i) => (
              <div key={i} className="cut-card">
                {c}
              </div>
            ))}
          </div>
        </Sheet>
      ),
    })
  );

  by('story').forEach((g) =>
    out.push({
      key: 'story',
      label: ['The sweets-tray story', 'حكاية الصينية'],
      render: () => (
        <Sheet title={g.title} sub={g.proverb}>
          {g.story.map((l, i) => (
            <p key={i} className="sheet-story">
              {l}
            </p>
          ))}
          <p className="sheet-q">{g.question}</p>
        </Sheet>
      ),
    })
  );

  by('seating').forEach((g) =>
    out.push({
      key: 'seat',
      label: ['Majlis seating plan', 'مخطّط المجلس'],
      render: () => (
        <Sheet title={g.title} sub={g.lead}>
          <Seating />
        </Sheet>
      ),
    })
  );

  by('roles').forEach((g) =>
    out.push({
      key: 'roles',
      label: ['Role cards (cut out)', 'بطاقات الأدوار (للقصّ)'],
      render: () => (
        <Sheet title={g.title} cut>
          <div className="cards">
            {g.roles.map((r) => (
              <div key={r.r} className="cut-card role-card">
                <b>{r.r}</b>
                <span>{r.d}</span>
              </div>
            ))}
          </div>
        </Sheet>
      ),
    })
  );

  by('topics').forEach((g) =>
    out.push({
      key: 'topics',
      label: ['Topic cards (cut out, one set per majlis)', 'بطاقات الموضوعات (للقصّ، مجموعة لكل مجلس)'],
      render: () => (
        <Sheet title="مَوْضُوعَاتُ الْمَجْلِسِ" cut>
          <div className="cards">
            {g.decks.flatMap((d, di) =>
              d.cards.map((c, i) => (
                <div key={di + '-' + i} className={'cut-card deck-' + di}>
                  <small>{d.name}</small>
                  {c}
                </div>
              ))
            )}
          </div>
          <p className="sheet-helpers">{g.helpers.join(' · ')}</p>
        </Sheet>
      ),
    })
  );
  return out;
}
