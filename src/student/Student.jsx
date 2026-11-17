import { createContext, useContext, useEffect, useState } from 'react';
import { SESSIONS, EPISODES } from '../data/sessions.js';
import { UNLOCK_CODES } from '../data/teacher.js';
import { ar, useStored } from '../lib.js';
import { PhraseTable, ytSrc, LETTERS } from '../Segment.jsx';

const ORD = ['الْأُولَى', 'الثَّانِيَةُ', 'الثَّالِثَةُ'];
const VIDEOS = { 1: [1, 2, 3, 4, 5, 6, 7], 2: [4, 5, 6], 3: [3, 7] };

/** Teacher preview: everything unlocked, nothing saved, links stay inside #/preview/ */
export const StudentCtx = createContext({ preview: false, base: '#/' });
export const useStudent = () => useContext(StudentCtx);

export function PreviewBanner() {
  const { preview } = useStudent();
  if (!preview) return null;
  return (
    <div className="preview-banner" dir="rtl" lang="ar">
      👁 مُعَايَنَةُ الْمُعَلِّمِ · كُلُّ شَيْءٍ مَفْتُوحٌ · لَا يُحْفَظُ شَيْءٌ
    </div>
  );
}

/** Which session a code unlocks (0 if none) */
export const codeToSession = (code) => +(Object.entries(UNLOCK_CODES).find(([, c]) => c === String(code).trim().toUpperCase())?.[0] || 0);

export function useUnlocked() {
  const { preview } = useStudent();
  const [u, setU] = useStored('unlocked', 0);
  if (preview) return [3, () => {}];
  return [u || 0, (n) => setU(Math.max(u || 0, n))];
}

/** A stored value that, in preview, lives in memory only */
export function useStudentStore(key, initial) {
  const { preview } = useStudent();
  const stored = useStored(key, initial);
  const mem = useState(initial);
  return preview ? mem : stored;
}

/** #/u/CODE: unlock and go straight to that session */
export function Unlock({ code }) {
  const [, unlock] = useUnlocked();
  const n = codeToSession(code);
  useEffect(() => {
    if (n) unlock(n);
    location.replace('#/' + (n ? 'learn/' + n : ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return null;
}

export function StudentHome() {
  const { preview, base } = useStudent();
  const [unlocked, unlock] = useUnlocked();
  const [code, setCode] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="home student" dir="rtl" lang="ar">
      <PreviewBanner />
      <header className="hero">
        <div className="sadu" aria-hidden="true" />
        <h1>مَقْهَى الْمُحَادَثَةِ</h1>
        <p className="hero-sub">ثَقَافَةُ الْمَجْلِسِ الْعَرَبِيِّ</p>
      </header>

      <main className="sessions">
        {SESSIONS.map((s) =>
          s.n <= unlocked ? (
            <a key={s.n} className="session-card" href={base + 'learn/' + s.n}>
              <span className="session-num">الْجَلْسَةُ {ORD[s.n - 1]}</span>
              <h2>{s.title}</h2>
              <p className="session-sub">{s.sub}</p>
              <span className="go">رَاجِعِ الْجَلْسَةَ ←</span>
            </a>
          ) : (
            <div key={s.n} className="session-card locked" aria-disabled="true">
              <span className="session-num">الْجَلْسَةُ {ORD[s.n - 1]}</span>
              <h2>🔒 {s.title}</h2>
              <p className="session-sub">تُفْتَحُ فِي الصَّفِّ</p>
            </div>
          )
        )}
      </main>

      <form
        className="code-form"
        onSubmit={(e) => {
          e.preventDefault();
          const n = codeToSession(code);
          if (n) {
            unlock(n);
            location.hash = base + 'learn/' + n;
          } else setErr(true);
        }}
      >
        <label>
          رَمْزُ الْجَلْسَةِ
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErr(false);
            }}
            dir="ltr"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck="false"
          />
        </label>
        <button className="primary">اِفْتَحْ</button>
        {err && <p className="err">الرَّمْزُ غَيْرُ صَحِيحٍ.</p>}
      </form>

      <footer className="credit">
        <p>
          الْفِيدْيُوهَاتُ مِنْ سِلْسِلَةِ «المجلس الإماراتي» لِـ{' '}
          <a href="https://www.youtube.com/playlist?list=PL7EI2FakY08UV6QuLckqRvmE7pBujB9HR" target="_blank" rel="noreferrer">
            The Knot | ذَ نُوت
          </a>
          .
        </p>
        {preview ? (
          <p>
            <a href={base + 'watch'} className="teacher-link">
              دَلِيلُ الْمُشَاهَدَةِ
            </a>
          </p>
        ) : (
          <p>
            <a href="#/teacher" className="teacher-link">
              لِلْمُعَلِّمِ
            </a>
          </p>
        )}
      </footer>
    </div>
  );
}

const TABS = [
  ['words', 'الْعِبَارَاتُ وَالْكَلِمَاتُ'],
  ['videos', 'الْفِيدْيُوهَاتُ'],
  ['quiz', 'تَدْرِيبٌ'],
];

export function Learn({ n }) {
  const { base } = useStudent();
  const [unlocked] = useUnlocked();
  const s = SESSIONS.find((x) => x.n === n);
  const [tab, setTab] = useState('words');
  useEffect(() => {
    if (!s || n > unlocked) location.replace(base);
  }, [s, n, unlocked, base]);
  if (!s || n > unlocked) return null;
  const segs = s.segments;
  const phrases = segs.filter((g) => g.kind === 'phrases');
  const words = segs.filter((g) => g.kind === 'video');
  const coffee = segs.find((g) => g.kind === 'coffee');
  const story = segs.find((g) => g.kind === 'story');
  const topics = segs.find((g) => g.kind === 'topics');
  const quiz = segs.find((g) => g.kind === 'quiz');
  const proverbs = segs.filter((g) => g.proverb).map((g) => g.proverb);

  return (
    <div className="learn" dir="rtl" lang="ar">
      <PreviewBanner />
      <header className="learn-top">
        <a href={base}>→ مَقْهَى الْمُحَادَثَةِ</a>
        <h1>
          <small>الْجَلْسَةُ {ORD[n - 1]}</small>
          {s.title}
        </h1>
      </header>
      <nav className="learn-tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </nav>

      <main className="learn-body">
        {tab === 'words' && (
          <>
            {proverbs.map((p) => (
              <blockquote key={p} className="proverb small">
                {p.split(' ... ').map((x, i) => (
                  <span key={i}>{x}</span>
                ))}
              </blockquote>
            ))}
            {phrases.map((g) => (
              <section key={g.id ?? g.title} className="learn-card">
                <h2>{g.title}</h2>
                <PhraseTable pairs={g.pairs} heads={g.heads} />
              </section>
            ))}
            {coffee && (
              <section className="learn-card">
                <h2>{coffee.title}</h2>
                <ol className="learn-list">
                  {coffee.steps.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              </section>
            )}
            {story && (
              <section className="learn-card">
                <h2>{story.title}</h2>
                {story.story.map((l) => (
                  <p key={l} className="learn-story">
                    {l}
                  </p>
                ))}
              </section>
            )}
            {topics && (
              <section className="learn-card">
                <h2>عِبَارَاتٌ لِلْحَدِيثِ</h2>
                <ul className="helper-chips">
                  {topics.helpers.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </section>
            )}
            {words.length > 0 && (
              <section className="learn-card">
                <h2>كَلِمَاتُ الْفِيدْيُوهَاتِ</h2>
                <ul className="spot-words static">
                  {words.flatMap((g) => g.spot).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {tab === 'videos' && <Videos list={VIDEOS[n]} />}
        {tab === 'quiz' && quiz && <Practice questions={quiz.questions} />}
      </main>
    </div>
  );
}

function Videos({ list }) {
  const [i, setI] = useState(0);
  const ep = EPISODES[list[i]];
  return (
    <div className="learn-videos">
      <div className="ep-tabs">
        {list.map((n, k) => (
          <button key={n} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-pressed={k === i}>
            <b>الْحَلْقَةُ {ar(n)}</b> <span>{EPISODES[n].title}</span>
          </button>
        ))}
      </div>
      <div className="frame">
        <iframe key={ep.id} src={ytSrc(ep)} title={ep.title} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    </div>
  );
}

/** Self-marking practice quiz */
function Practice({ questions }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState(0);
  if (i >= questions.length)
    return (
      <div className="quiz-end">
        <p className="big">أَحْسَنْتَ! 🌟</p>
        <p className="lead">
          {ar(score)} مِنْ {ar(questions.length)}
        </p>
        <button
          onClick={() => {
            setI(0);
            setScore(0);
            setPick(null);
          }}
        >
          ↺ مِنْ جَدِيدٍ
        </button>
      </div>
    );
  const q = questions[i];
  const shown = pick !== null;
  return (
    <div className="quiz practice">
      <p className="count">
        السُّؤَالُ {ar(i + 1)} مِنْ {ar(questions.length)}
      </p>
      <p className="quiz-q">{q.q}</p>
      <ol className="options">
        {q.a.map((a, k) => (
          <li key={k}>
            <button
              className={shown ? (k === q.c ? 'right' : k === pick ? 'wrong' : '') : ''}
              disabled={shown && k !== q.c && k !== pick}
              onClick={() => {
                if (shown) return;
                setPick(k);
                if (k === q.c) setScore(score + 1);
              }}
            >
              <span className="letter">{LETTERS[k]}</span>
              {a}
            </button>
          </li>
        ))}
      </ol>
      {shown && (
        <div className="card-nav">
          <p className={'feedback ' + (pick === q.c ? 'yes' : 'no')}>{pick === q.c ? 'صَحِيحٌ! ✓' : 'لَيْسَ تَمَامًا.'}</p>
          <button
            className="primary"
            onClick={() => {
              setI(i + 1);
              setPick(null);
            }}
          >
            {i + 1 < questions.length ? 'السُّؤَالُ التَّالِي ←' : 'النَّتِيجَةُ ←'}
          </button>
        </div>
      )}
    </div>
  );
}
