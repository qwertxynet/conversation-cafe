import { useEffect } from 'react';
import { EPISODES, GUIDE, TIER_NAMES } from './data/sessions.js';
import { ar, mmss, shuffle } from './lib.js';
import Seating from './Seating.jsx';

/**
 * Renders one segment of a session.
 * st/set: the segment's UI state (which card, revealed or not…), owned by the teacher window.
 * ro: read-only (the projector window just mirrors the teacher).
 * frame: whether to render the YouTube player here (the teacher window skips it when the projector is open).
 */
export default function Segment({ seg, st = {}, set = () => {}, ro = false, frame = true }) {
  const C = KINDS[seg.kind];
  return C ? (
    <div className={ro ? 'ro' : ''}>
      <C seg={seg} st={st} set={set} ro={ro} frame={frame} />
    </div>
  ) : null;
}

const KINDS = {
  welcome: Welcome,
  video: Video,
  talk: Talk,
  phrases: Phrases,
  sort: Sort,
  coffee: Coffee,
  scenarios: Scenarios,
  story: Story,
  seating: SeatingSeg,
  roles: Roles,
  topics: Topics,
  quiz: Quiz,
};

export const ytSrc = (ep) =>
  `https://www.youtube-nocookie.com/embed/${ep.id}?start=${ep.start}` +
  '&cc_load_policy=1&cc_lang_pref=ar&hl=ar&rel=0&modestbranding=1&playsinline=1&enablejsapi=1';

// ───────── shared pieces ─────────
export function Proverb({ text }) {
  return (
    <blockquote className="proverb">
      {text.split(' ... ').map((p, i) => (
        <span key={i}>{p}</span>
      ))}
    </blockquote>
  );
}

export function Tiers({ tiers }) {
  return (
    <div className="tiers">
      {tiers.map((t, i) => (
        <div key={i} className={'tier tier-' + (i + 1)}>
          <span className="tier-name">
            <span className="dots" aria-hidden="true">
              {'●'.repeat(i + 1)}
            </span>
            {TIER_NAMES[i]}
          </span>
          <p>{t}</p>
        </div>
      ))}
    </div>
  );
}

function Fact({ text }) {
  return (
    <p className="fact">
      <span className="fact-tag">الْيُونِسْكُو</span>
      {text}
    </p>
  );
}

const Lead = ({ text }) => (text ? <p className="lead">{text}</p> : null);

// ───────── segments ─────────
function Welcome({ seg }) {
  return (
    <div className={'welcome' + (seg.recall ? ' has-recall' : '')}>
      <Proverb text={seg.proverb} />
      {seg.lines?.map((l, i) => (
        <p key={i} className="lead">
          {l}
        </p>
      ))}
      <p className="question">{seg.question}</p>
      {seg.recall && (
        <div className="recall">
          <h3>تَذَكَّرُوا</h3>
          <ol>
            {seg.recall.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Video({ seg, st, set, ro, frame }) {
  const i = st.ep || 0;
  const ep = EPISODES[seg.episodes[i]];
  const seen = new Set(st.seen || []);
  return (
    <div className="video-seg">
      <div className="video-main">
        <div className="ep-tabs" role="tablist">
          {seg.episodes.map((n, k) => (
            <button key={n} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => !ro && set({ ep: k })}>
              <b>الْحَلْقَةُ {ar(n)}</b>
              <span>{EPISODES[n].title}</span>
              <span className="t">{mmss(EPISODES[n].len - EPISODES[n].start)}</span>
            </button>
          ))}
        </div>
        {frame ? (
          <div className="frame">
            <iframe
              key={ep.id}
              id="yt"
              src={ytSrc(ep)}
              title={ep.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="frame frame-thumb">
            <img src={`https://i.ytimg.com/vi/${ep.id}/hqdefault.jpg`} alt="" />
          </div>
        )}
      </div>
      <aside className="spot">
        {GUIDE[seg.episodes[i]] && (
          <div className="watch-for">
            <h3>👀 اِنْتَبِهُوا إِلَى…</h3>
            <ul>
              {GUIDE[seg.episodes[i]].watch.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <h3>اِبْحَثُوا عَنْ هَذِهِ الْكَلِمَاتِ</h3>
        <ul className="spot-words">
          {seg.spot.map((w) => (
            <li key={w}>
              <button
                className={seen.has(w) ? 'seen' : ''}
                aria-pressed={seen.has(w)}
                onClick={() => {
                  if (ro) return;
                  seen.has(w) ? seen.delete(w) : seen.add(w);
                  set({ seen: [...seen] });
                }}
              >
                {w}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Talk({ seg }) {
  return (
    <div className="talk">
      <p className="lead">تَحَدَّثُوا مَعَ زَمِيلِكُمْ. اِخْتَارُوا سُؤَالًا:</p>
      <Tiers tiers={seg.tiers} />
    </div>
  );
}

export function PhraseTable({ pairs, heads }) {
  const [a, b] = heads || ['التَّحِيَّةُ', 'الرَّدُّ'];
  return (
    <table className="pairs">
      <thead>
        <tr>
          <th>{a}</th>
          <th aria-hidden="true" />
          <th>{b}</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map(([x, y], i) => (
          <tr key={i}>
            <td>{x}</td>
            <td className="arrow" aria-hidden="true">
              ←
            </td>
            <td>{y}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Phrases({ seg }) {
  return (
    <div className={'phrases' + (seg.tiers ? ' has-tiers' : '')}>
      <div>
        <Lead text={seg.lead} />
        <PhraseTable pairs={seg.pairs} heads={seg.heads} />
      </div>
      {seg.tiers && <Tiers tiers={seg.tiers} />}
    </div>
  );
}

function Sort({ seg, st, set }) {
  const i = Math.min(st.i || 0, seg.cards.length - 1);
  const shown = !!st.shown;
  const c = seg.cards[i];
  const go = (d) => set({ i: Math.min(seg.cards.length - 1, Math.max(0, i + d)), shown: false });
  return (
    <div className="sort">
      <Lead text={seg.lead} />
      <div className={'sort-card' + (shown ? (c.ok ? ' yes' : ' no') : '')}>
        <span className="count">
          {ar(i + 1)} / {ar(seg.cards.length)}
        </span>
        <p className="sort-t">{c.t}</p>
        {shown ? (
          <p className="verdict">
            <b>{c.ok ? '✓ اِفْعَلْ' : '✗ لَا تَفْعَلْ'}</b> {c.why}
          </p>
        ) : (
          <div className="vote" aria-hidden="true">
            <span>👍 اِفْعَلْ</span>
            <span>👎 لَا تَفْعَلْ</span>
          </div>
        )}
      </div>
      <div className="card-nav ctl">
        <button onClick={() => go(-1)} disabled={i === 0}>
          → السَّابِقَةُ
        </button>
        <button className="primary" onClick={() => set({ shown: true })} disabled={shown}>
          أَظْهِرِ الْجَوَابَ
        </button>
        <button onClick={() => go(1)} disabled={i === seg.cards.length - 1}>
          التَّالِيَةُ ←
        </button>
      </div>
    </div>
  );
}

function Coffee({ seg, st, set, ro }) {
  const round = st.round || 0;
  const step = st.step ?? -1;
  return (
    <div className="coffee">
      <div className="rounds" role="tablist">
        {seg.rounds.map((r, i) => (
          <button key={i} role="tab" aria-selected={round === i} className={round === i ? 'on' : ''} onClick={() => !ro && set({ round: i })}>
            {r}
          </button>
        ))}
      </div>
      <ol className="steps">
        {seg.steps.map((s, i) => (
          <li key={i}>
            <button className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => !ro && set({ step: i === step ? -1 : i })}>
              <span className="n">{ar(i + 1)}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>
      <Fact text={seg.fact} />
    </div>
  );
}

function Scenarios({ seg, st, set, ro }) {
  const n = seg.cards.length;
  const order = st.order && st.order.length === n ? st.order : null;
  useEffect(() => {
    if (!order && !ro) set({ order: shuffle([...Array(n).keys()]), k: 0 });
  }, [order, ro, n, set]);
  const k = st.k || 0;
  const card = seg.cards[(order || [...Array(n).keys()])[k % n]];
  return (
    <div className="scenarios side-layout">
      <div>
        <Lead text={seg.lead} />
        <div className="scene-card">
          <span className="count">
            {ar((k % n) + 1)} / {ar(n)}
          </span>
          <p>{card}</p>
        </div>
        <div className="card-nav ctl">
          <button className="primary" onClick={() => set({ k: k + 1 })}>
            بِطَاقَةٌ أُخْرَى ←
          </button>
        </div>
      </div>
      <Tiers tiers={seg.tiers} />
    </div>
  );
}

function Story({ seg, st, set }) {
  const n = st.n || 1;
  const done = n >= seg.story.length;
  return (
    <div className="story">
      <Proverb text={seg.proverb} />
      <div className="story-lines">
        {seg.story.slice(0, n).map((l, i) => (
          <p key={i} className="story-line">
            {l}
          </p>
        ))}
      </div>
      {!done ? (
        <button className="primary ctl" onClick={() => set({ n: n + 1 })}>
          … ثُمَّ مَاذَا حَدَثَ؟
        </button>
      ) : (
        <>
          <p className="question">{seg.question}</p>
          <Fact text={seg.fact} />
        </>
      )}
    </div>
  );
}

function SeatingSeg({ seg }) {
  return (
    <div className="seating-seg">
      <Lead text={seg.lead} />
      <Seating />
    </div>
  );
}

function Roles({ seg }) {
  return (
    <div className="roles">
      {seg.roles.map((r) => (
        <div key={r.r} className="role">
          <h3>{r.r}</h3>
          <p>{r.d}</p>
        </div>
      ))}
    </div>
  );
}

function Topics({ seg, st, set, ro }) {
  const sizes = seg.decks.map((d) => d.cards.length).join(',');
  const orders = st.orders && st.orders.map((o) => o.length).join(',') === sizes ? st.orders : null;
  useEffect(() => {
    if (!orders && !ro) set({ orders: seg.decks.map((d) => shuffle([...d.cards.keys()])), pos: seg.decks.map(() => 0) });
  }, [orders, ro, seg, set]);
  const pos = st.pos || seg.decks.map(() => 0);
  const cur = st.cur; // {d, i}
  const draw = (d) => {
    if (!orders) return;
    const i = orders[d][pos[d] % orders[d].length];
    set({ cur: { d, i }, alert: false, pos: pos.map((v, k) => (k === d ? v + 1 : v)) });
  };
  return (
    <div className="topics">
      <div className="topic-main">
        <div className="decks">
          {seg.decks.map((d, i) => (
            <button key={i} className={'deck deck-' + i + (cur?.d === i ? ' on' : '')} onClick={() => !ro && draw(i)}>
              {d.name}
            </button>
          ))}
          <button className="deck deck-any ctl" onClick={() => draw(Math.floor(Math.random() * seg.decks.length))}>
            أَيُّ مَوْضُوعٍ 🎲
          </button>
        </div>
        {st.alert ? (
          <div className="topic-card newcomer" onClick={() => !ro && set({ alert: false })}>
            <p>{seg.newcomer}</p>
            <span className="small">قِفُوا · سَلِّمُوا مِنَ الْيَمِينِ · تَفَضَّلِ الْقَهْوَةَ</span>
          </div>
        ) : cur && seg.decks[cur.d]?.cards[cur.i] ? (
          <div className={'topic-card deck-' + cur.d}>
            <span className="small">{seg.decks[cur.d].name}</span>
            <p>{seg.decks[cur.d].cards[cur.i]}</p>
          </div>
        ) : (
          <div className="topic-card empty">
            <p>اِسْحَبُوا أَوَّلَ مَوْضُوعٍ</p>
          </div>
        )}
        <h3 className="helpers-h">عِبَارَاتٌ لِلْحَدِيثِ</h3>
        <ul className="helper-chips">
          {seg.helpers.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
      <aside className="helpers">
        <button className="newcomer-btn ctl" onClick={() => set({ alert: true })}>
          🚪 {seg.newcomer}
        </button>
        <Tiers tiers={seg.tiers} />
      </aside>
    </div>
  );
}

export const LETTERS = ['أ', 'ب', 'ج', 'د'];
function Quiz({ seg, st, set, ro }) {
  const i = st.i || 0;
  const pick = st.pick ?? null;
  const shown = !!st.shown;
  const score = st.score || 0;
  if (i >= seg.questions.length)
    return (
      <div className="quiz-end">
        <p className="big">أَحْسَنْتُمْ! 🌟</p>
        <p className="lead">
          {ar(score)} مِنْ {ar(seg.questions.length)}
        </p>
        <button className="ctl" onClick={() => set({ i: 0, score: 0, pick: null, shown: false })}>
          ↺ مِنْ جَدِيدٍ
        </button>
      </div>
    );
  const q = seg.questions[i];
  return (
    <div className="quiz">
      <p className="count">
        السُّؤَالُ {ar(i + 1)} مِنْ {ar(seg.questions.length)}
      </p>
      <p className="quiz-q">{q.q}</p>
      <ol className="options">
        {q.a.map((a, k) => {
          let cls = '';
          if (shown && k === q.c) cls = 'right';
          else if (shown && k === pick) cls = 'wrong';
          else if (k === pick) cls = 'picked';
          return (
            <li key={k}>
              <button className={cls} onClick={() => !ro && !shown && set({ pick: k })} disabled={shown && k !== q.c && k !== pick}>
                <span className="letter">{LETTERS[k]}</span>
                {a}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="card-nav ctl">
        {!shown ? (
          <button className="primary" onClick={() => set({ shown: true, score: score + (pick === q.c ? 1 : 0) })}>
            أَظْهِرِ الْجَوَابَ
          </button>
        ) : (
          <button className="primary" onClick={() => set({ i: i + 1, pick: null, shown: false })}>
            {i + 1 < seg.questions.length ? 'السُّؤَالُ التَّالِي ←' : 'النَّتِيجَةُ ←'}
          </button>
        )}
      </div>
    </div>
  );
}
