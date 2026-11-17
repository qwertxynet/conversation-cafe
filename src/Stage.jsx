import { useCallback } from 'react';
import Segment from './Segment.jsx';
import { mmss, timing } from './lib.js';

/** The big countdown */
export function TimerFace({ live, seg, onClick, labels }) {
  const tm = timing(live, seg);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={'timer ' + tm.state + (live.run ? ' running' : '')} onClick={onClick}>
      <span className="timer-n" dir="ltr">
        {tm.over ? '+' + mmss(-tm.remaining) : mmss(tm.remaining)}
      </span>
      <span className="timer-bar">
        <span style={{ width: tm.pct + '%' }} />
      </span>
      {labels && <span className="timer-s">{live.run ? labels.pause : tm.elapsed > 0 ? labels.resume : labels.start}</span>}
    </Tag>
  );
}

export function Rail({ session, idx, onGo }) {
  return (
    <nav className="rail" aria-label="فقرات الجلسة" dir="rtl">
      {session.segments.map((g, i) => (
        <button
          key={g.id}
          className={'rail-item' + (i === idx ? ' on' : i < idx ? ' done' : '')}
          onClick={onGo ? () => onGo(i) : undefined}
          tabIndex={onGo ? 0 : -1}
          aria-current={i === idx ? 'step' : undefined}
        >
          <span className="rail-t">{g.title}</span>
          <span className="rail-d">{mmss(g.dur)}</span>
        </button>
      ))}
    </nav>
  );
}

export const plannedStart = (session, idx) => session.segments.slice(0, idx).reduce((n, g) => n + g.dur, 0);

/**
 * The student-facing stage: segment title, countdown and content.
 * update: the teacher window passes a function to change the shared state; the projector passes nothing.
 */
export default function Stage({ live, update, frame = true, onTimer }) {
  const session = live.session;
  const seg = session.segments[live.idx];
  const id = seg.id;
  const set = useCallback(
    (patch) => update?.((l) => ({ ...l, ui: { ...l.ui, [id]: { ...(l.ui?.[id] || {}), ...patch } } })),
    [update, id]
  );
  const start = plannedStart(session, live.idx);
  return (
    <section className="stage" dir="rtl" lang="ar">
      <div className="seg-head">
        <div>
          <h2>{seg.title}</h2>
          <p className="planned">
            {mmss(start)}–{mmss(start + seg.dur)}
          </p>
        </div>
        <TimerFace
          live={live}
          seg={seg}
          onClick={onTimer}
          labels={onTimer ? { start: 'اِبْدَأْ', pause: 'إِيقَافٌ مُؤَقَّتٌ', resume: 'تَابِعْ' } : null}
        />
      </div>
      <div className="seg-body">
        <Segment key={live.n + '-' + id} seg={seg} st={live.ui?.[id]} set={set} ro={!update} frame={frame} />
      </div>
    </section>
  );
}
