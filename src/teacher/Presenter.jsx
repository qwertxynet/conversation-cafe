import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SESSIONS, EPISODES, GUIDE, guideAnswer } from '../data/sessions.js';
import { LESSON, SEG_KIND } from '../data/teacher.js';
import Stage, { Rail, plannedStart } from '../Stage.jsx';
import { LETTERS } from '../Segment.jsx';
import { chime, effective, liveSecs, mmss, store, timing, unlockAudio, useProjector, useStored, useTick, ytCommand, ytLocal } from '../lib.js';
import { TopBar } from './Teacher.jsx';
import { ProjectorButton, GuideShare } from './Dashboard.jsx';

const fresh = (n, session) => ({ n, session, idx: 0, run: false, base: 0, since: null, sBase: 0, ui: {}, actual: {}, startedAt: null });

/** The teacher's presenter: drives the projector window and shows notes, answers and the run sheet. */
export default function Presenter({ n, L, lock }) {
  const { t, lang, dir } = L;
  const base = SESSIONS.find((s) => s.n === n);
  const [custom] = useStored('custom', {});
  const eff = useMemo(() => base && effective(base, custom?.[n]), [base, custom, n]);
  const [live] = useStored('live', null);
  const connected = useProjector();
  const chimed = useRef(new Set());
  const [savedMsg, setSavedMsg] = useState(false);

  const update = useCallback((fn) => store.set('live', fn(store.get('live', null))), []);

  // start (or adopt) this session's live state, and keep it in step with the customisation
  useEffect(() => {
    if (!eff) return;
    const cur = store.get('live', null);
    if (!cur || cur.n !== n) store.set('live', fresh(n, eff));
    else if (JSON.stringify(cur.session) !== JSON.stringify(eff))
      store.set('live', { ...cur, session: eff, idx: Math.min(cur.idx, eff.segments.length - 1) });
  }, [eff, n]);

  useTick(!!live?.run);
  const ready = live && live.n === n && live.session?.segments?.[live.idx];
  const seg = ready ? live.session.segments[live.idx] : null;
  const tm = ready ? timing(live, seg) : null;

  // chime once when a segment reaches zero
  useEffect(() => {
    if (ready && tm.over && live.run && !chimed.current.has(seg.id)) {
      chimed.current.add(seg.id);
      chime();
    }
  });

  const toggle = useCallback(() => {
    unlockAudio();
    update((l) =>
      l.run
        ? { ...l, run: false, base: l.base + liveSecs(l), sBase: l.sBase + liveSecs(l), since: null }
        : { ...l, run: true, since: Date.now(), startedAt: l.startedAt || new Date().toISOString() }
    );
  }, [update]);

  const go = useCallback(
    (i) =>
      update((l) => {
        if (i < 0 || i >= l.session.segments.length || i === l.idx) return l;
        const leaving = l.session.segments[l.idx].id;
        const spent = l.base + liveSecs(l);
        chimed.current.delete(l.session.segments[i].id);
        return {
          ...l,
          idx: i,
          base: 0,
          sBase: l.sBase + liveSecs(l),
          since: l.run ? Date.now() : null,
          actual: { ...l.actual, [leaving]: (l.actual?.[leaving] || 0) + spent },
        };
      }),
    [update]
  );

  const resetSeg = () => {
    if (seg) chimed.current.delete(seg.id);
    update((l) => ({ ...l, base: 0, sBase: l.sBase + liveSecs(l), since: l.run ? Date.now() : null }));
  };
  const resetAll = () => {
    chimed.current.clear();
    store.set('live', fresh(n, eff));
  };

  const endSession = () => {
    const l = store.get('live', null);
    if (!l) return;
    const actual = { ...l.actual };
    const cur = l.session.segments[l.idx].id;
    actual[cur] = (actual[cur] || 0) + l.base + liveSecs(l);
    const entry = {
      id: Date.now(),
      date: (l.startedAt || new Date().toISOString()).slice(0, 10),
      n,
      covered: l.session.segments
        .filter((g) => actual[g.id] > 5)
        .map((g) => ({ title: g.title, planned: g.dur, actual: Math.round(actual[g.id]) })),
      notes: '',
    };
    store.set('log', [entry, ...store.get('log', [])]);
    store.set('live', undefined);
    setSavedMsg(true);
    setTimeout(() => (location.hash = '#/teacher/log'), 900);
  };

  // keyboard: Space start/pause, PageDown/PageUp (clickers) and arrows next/previous
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      const l = store.get('live', null);
      if (!l) return;
      const nextKey = lang === 'ar' ? 'ArrowLeft' : 'ArrowRight';
      const prevKey = lang === 'ar' ? 'ArrowRight' : 'ArrowLeft';
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) toggle();
      } else if (e.key === 'PageDown' || e.key === nextKey) {
        e.preventDefault();
        go(l.idx + 1);
      } else if (e.key === 'PageUp' || e.key === prevKey) {
        e.preventDefault();
        go(l.idx - 1);
      }
    };
    const stopSpace = (e) => e.code === 'Space' && !e.target.closest?.('input, textarea') && e.preventDefault();
    addEventListener('keydown', onKey);
    addEventListener('keyup', stopSpace);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', stopSpace);
    };
  }, [toggle, go, lang]);

  if (!base) return null;
  if (!ready) return <div className="t-page" dir={dir} />;

  const S = live.session.segments;
  const next = S[live.idx + 1];
  const lesson = LESSON[n]?.[seg.id]?.[lang];
  const total = S.reduce((s, g) => s + g.dur, 0);
  const yt = (func, args) => (connected ? ytCommand(func, args) : ytLocal(func, args));

  return (
    <div className="tp" dir={dir} lang={lang}>
      <TopBar L={L} lock={lock} title={`${t.session} ${n}: ${base.title}`}>
        <ProjectorButton t={t} connected={connected} />
      </TopBar>

      <div className="tp-main">
        <div className="tp-stage">
          <Rail session={live.session} idx={live.idx} onGo={go} />
          <Stage live={live} update={update} frame={!connected} onTimer={toggle} />
        </div>

        <aside className="tp-side">
          <div className="tp-controls">
            <div className="tp-clock">
              <span>{t.total}</span>
              <b dir="ltr">
                {mmss(tm.sessionElapsed)} / {mmss(total)}
              </b>
            </div>
            <div className="tp-btns">
              <button onClick={() => go(live.idx - 1)} disabled={live.idx === 0}>
                {t.prev}
              </button>
              <button className="primary" onClick={toggle}>
                {live.run ? '❚❚ ' + t.pause : '▶ ' + (tm.elapsed > 0 ? t.resume : t.start)}
              </button>
              <button onClick={() => go(live.idx + 1)} disabled={live.idx === S.length - 1} className={tm.over ? 'pulse' : ''}>
                {t.next}
              </button>
            </div>
            <div className="tp-btns small">
              <button onClick={resetSeg}>↺ {t.resetSeg}</button>
              <button onClick={resetAll}>↺ {t.resetAll}</button>
            </div>
            {seg.kind === 'video' && (
              <div className="tp-video">
                <div className="tp-btns small">
                  <button onClick={() => yt('playVideo')}>▶ {t.play}</button>
                  <button onClick={() => yt('pauseVideo')}>❚❚ {t.pause}</button>
                  <button onClick={() => yt('seekTo', [EPISODES[seg.episodes[live.ui?.[seg.id]?.ep || 0]].start, true])}>⏮ {t.restartVideo}</button>
                </div>
                {connected && <p className="hint">{t.videoHelp}</p>}
              </div>
            )}
          </div>

          <AnswerKey seg={seg} st={live.ui?.[seg.id]} t={t} prev={S[live.idx - 1]} />

          {S.some((g) => g.kind === 'video') && live.idx <= S.findLastIndex((g) => g.kind === 'video') + 1 && (
            <section className="tp-card">
              <h3>👀 {t.guide}</h3>
              <p className="hint">{t.guideHelp}</p>
              <GuideShare t={t} compact />
            </section>
          )}

          {lesson && (
            <section className="tp-card">
              <h3>
                {t.lesson} <small>· {SEG_KIND[lang][seg.kind]}</small>
              </h3>
              <p className="aim">
                <b>{t.aim}:</b> {lesson.aim}
              </p>
              <ol className="lesson-steps">
                {lesson.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </section>
          )}

          {next && (
            <section className="tp-card next-up">
              <h3>{t.nextUp}</h3>
              <p lang="ar" dir="rtl">
                {next.title} <span className="t">{mmss(next.dur)}</span>
              </p>
            </section>
          )}

          <section className="tp-card">
            <h3>{t.runSheet}</h3>
            <table className="run">
              <thead>
                <tr>
                  <th />
                  <th>{t.planned}</th>
                  <th>{t.actual}</th>
                </tr>
              </thead>
              <tbody>
                {S.map((g, i) => {
                  const a = (live.actual?.[g.id] || 0) + (i === live.idx ? tm.elapsed : 0);
                  return (
                    <tr key={g.id} className={i === live.idx ? 'on' : ''} onClick={() => go(i)}>
                      <td lang="ar" dir="rtl">
                        <span className="t">{mmss(plannedStart(live.session, i))}</span> {g.title}
                      </td>
                      <td className="t">{mmss(g.dur)}</td>
                      <td className={'t' + (a > g.dur + 30 ? ' late' : '')}>{a > 0 ? mmss(a) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <GroupsQuick t={t} />

          <button className="end-btn" onClick={endSession}>
            {savedMsg ? '✓ ' + t.ended : t.end}
          </button>
        </aside>
      </div>
    </div>
  );
}

function AnswerKey({ seg, st = {}, t, prev }) {
  const [all, setAll] = useState(false);
  if (seg.kind === 'video') {
    const ep = seg.episodes[st.ep || 0];
    const g = GUIDE[ep];
    if (!g) return null;
    return (
      <section className="tp-card key">
        <h3>
          🔑 {t.guide} · {t.answers}
        </h3>
        <ol className="key-all" lang="ar" dir="rtl">
          {g.qs.map((q, k) => (
            <li key={k}>
              {q.q} ← <b>{guideAnswer(q)}</b>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  if (seg.kind === 'talk') {
    // the pair talk right after a video block: key for the whole block
    if (!prev || prev.kind !== 'video') return null;
    return (
      <section className="tp-card key">
        <h3>
          🔑 {t.guide} · {t.answers}
        </h3>
        {prev.episodes.map((ep) => (
          <div key={ep} lang="ar" dir="rtl">
            <b className="key-ep">{EPISODES[ep].title}</b>
            <ol className="key-all">
              {GUIDE[ep].qs.map((q, k) => (
                <li key={k}>
                  {q.q} ← <b>{guideAnswer(q)}</b>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
    );
  }
  if (seg.kind === 'sort') {
    const i = Math.min(st.i || 0, seg.cards.length - 1);
    const c = seg.cards[i];
    return (
      <section className="tp-card key">
        <h3>🔑 {t.answers}</h3>
        <p className={'key-now ' + (c.ok ? 'yes' : 'no')}>
          <b>{c.ok ? '✓ ' + t.do : '✗ ' + t.dont}</b>{' '}
          <span lang="ar" dir="rtl">
            {c.why}
          </span>
        </p>
        <button className="link" onClick={() => setAll(!all)}>
          {t.allAnswers} {all ? '▲' : '▼'}
        </button>
        {all && (
          <ol className="key-all" lang="ar" dir="rtl">
            {seg.cards.map((c, k) => (
              <li key={k} className={k === i ? 'on' : ''}>
                {c.ok ? '✓' : '✗'} {c.t}
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }
  if (seg.kind === 'quiz') {
    const i = Math.min(st.i || 0, seg.questions.length - 1);
    const q = seg.questions[i];
    return (
      <section className="tp-card key">
        <h3>🔑 {t.answers}</h3>
        <p className="key-now yes" lang="ar" dir="rtl">
          <b>{LETTERS[q.c]}</b> {q.a[q.c]}
        </p>
        <button className="link" onClick={() => setAll(!all)}>
          {t.allAnswers} {all ? '▲' : '▼'}
        </button>
        {all && (
          <ol className="key-all" lang="ar" dir="rtl">
            {seg.questions.map((q, k) => (
              <li key={k} className={k === i ? 'on' : ''}>
                {q.q} ← <b>{LETTERS[q.c]}</b> {q.a[q.c]}
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }
  return null;
}

/** Quick buttons to show the saved pairs / majlis groups on the projector */
function GroupsQuick({ t }) {
  const [groups] = useStored('groups', null);
  const [overlay, setOverlay] = useStored('overlay', null);
  if (!groups?.pairs && !groups?.majlis) return null;
  return (
    <section className="tp-card">
      <h3>{t.students}</h3>
      <div className="tp-btns small">
        {groups.pairs && (
          <button aria-pressed={overlay?.kind === 'pairs'} onClick={() => setOverlay(overlay?.kind === 'pairs' ? null : { kind: 'pairs', pairs: groups.pairs })}>
            {t.pairs}
          </button>
        )}
        {groups.majlis && (
          <button aria-pressed={overlay?.kind === 'majlis'} onClick={() => setOverlay(overlay?.kind === 'majlis' ? null : { kind: 'majlis', groups: groups.majlis })}>
            {t.majlis}
          </button>
        )}
      </div>
    </section>
  );
}
