import { useState } from 'react';
import { SESSIONS } from '../data/sessions.js';
import { SEG_KIND } from '../data/teacher.js';
import { effective, mmss, useStored } from '../lib.js';
import { TopBar } from './Teacher.jsx';

/** Hidden teacher controls: reorder, skip or retime segments, and choose which cards and questions to use. */
export default function Customise({ n, L, lock }) {
  const { t, dir, lang } = L;
  const base = SESSIONS.find((s) => s.n === n);
  const [custom, setCustom] = useStored('custom', {});
  const [open, setOpen] = useState(null);
  if (!base) return null;
  const c = custom?.[n] || {};
  const order = c.order && c.order.length === base.segments.length ? c.order : base.segments.map((_, i) => i);
  const skip = new Set(c.skip || []);
  const save = (p) => setCustom((prev) => ({ ...(prev || {}), [n]: { ...((prev || {})[n] || {}), ...p } }));
  const total = effective(base, c).segments.reduce((a, g) => a + g.dur, 0);

  const move = (pos, d) => {
    const o = [...order];
    const j = pos + d;
    if (j < 0 || j >= o.length) return;
    [o[pos], o[j]] = [o[j], o[pos]];
    save({ order: o });
  };

  return (
    <div className="t-page" dir={dir} lang={lang}>
      <TopBar L={L} lock={lock} title={`${t.customise} · ${t.session} ${n}: ${base.title}`}>
        <a className="t-btn" href="#/teacher/sessions">
          {t.back}
        </a>
      </TopBar>
      <main className="t-body">
        <p className="hint">{t.customHelp}</p>
        <p className={'custom-total' + (total !== 3000 ? ' warn-text' : '')}>
          {t.total}: <b dir="ltr">{mmss(total)}</b> {total !== 3000 && '· ' + t.totalWarn}
        </p>
        <ol className="custom-list">
          {order.map((id, pos) => {
            const g = base.segments[id];
            const dur = c.dur?.[id] || g.dur;
            const items = itemsOf(g);
            const hidden = new Set(c.hide?.[id] || []);
            return (
              <li key={id} className={skip.has(id) ? 'skipped' : ''}>
                <div className="custom-row">
                  <label className="use">
                    <input
                      type="checkbox"
                      checked={!skip.has(id)}
                      onChange={() => {
                        skip.has(id) ? skip.delete(id) : skip.add(id);
                        save({ skip: [...skip] });
                      }}
                    />
                    <span className="sr">{t.include}</span>
                  </label>
                  <span className="c-title" lang="ar" dir="rtl">
                    {g.title}
                  </span>
                  <span className="muted c-kind">{SEG_KIND[lang][g.kind]}</span>
                  <label className="c-dur">
                    <input
                      type="number"
                      min="0.5"
                      max="60"
                      step="0.5"
                      value={dur / 60}
                      onChange={(e) => {
                        const v = Math.round(parseFloat(e.target.value) * 60);
                        if (v > 0) save({ dur: { ...(c.dur || {}), [id]: v } });
                      }}
                    />
                    {t.minutes}
                  </label>
                  <button onClick={() => move(pos, -1)} disabled={pos === 0} aria-label={t.moveUp}>
                    ↑
                  </button>
                  <button onClick={() => move(pos, 1)} disabled={pos === order.length - 1} aria-label={t.moveDown}>
                    ↓
                  </button>
                  {items && (
                    <button onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
                      {t.items} ({items.length - hidden.size}/{items.length}) {open === id ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {items && open === id && (
                  <ul className="custom-items" lang="ar" dir="rtl">
                    {items.map((it) => (
                      <li key={it.key}>
                        <label>
                          <input
                            type="checkbox"
                            checked={!hidden.has(it.key)}
                            onChange={() => {
                              hidden.has(it.key) ? hidden.delete(it.key) : hidden.add(it.key);
                              save({ hide: { ...(c.hide || {}), [id]: [...hidden] } });
                            }}
                          />
                          {it.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        <button className="btn" onClick={() => setCustom((prev) => ({ ...(prev || {}), [n]: {} }))}>
          ↺ {t.restore}
        </button>
      </main>
    </div>
  );
}

function itemsOf(g) {
  if (g.kind === 'sort') return g.cards.map((c, k) => ({ key: String(k), label: c.t }));
  if (g.kind === 'scenarios') return g.cards.map((c, k) => ({ key: String(k), label: c }));
  if (g.kind === 'quiz') return g.questions.map((q, k) => ({ key: String(k), label: q.q }));
  if (g.kind === 'topics') return g.decks.flatMap((d, di) => d.cards.map((c, k) => ({ key: di + '.' + k, label: d.name + ' · ' + c })));
  return null;
}
