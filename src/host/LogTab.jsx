import { useRef, useState } from 'react';
import { DAYS, ALL_CARDS } from '../lib/content.js';
import { exportBackup, importBackup, useStored } from '../lib/store.js';

export function LogTab({ t }) {
  const [log, setLog] = useStored('log', []);
  const entries = log || [];
  const patch = (id, p) => setLog((prev) => (prev || []).map((e) => (e.id === id ? { ...e, ...p } : e)));
  if (!entries.length) return <p className="muted">{t.noLog}</p>;
  return (
    <section className="h-log">
      {entries.map((e) => {
        const d = DAYS.find((x) => x.n === e.day);
        const counts = {};
        e.cards.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
        return (
          <article key={e.id} className="panel h-sec">
            <div className="h-row">
              <input type="date" value={e.date} onChange={(ev) => patch(e.id, { date: ev.target.value })} aria-label={t.date} />
              <b>
                {t.day} {e.day}: {d?.en}
              </b>
              <span className="muted">
                {t.reached}: {e.reached}/{e.total}
              </span>
              <span className="h-spacer" />
              <button className="btn small ghost" onClick={() => confirm(t.deleteSure) && setLog(entries.filter((x) => x.id !== e.id))}>
                {t.delete}
              </button>
            </div>
            <p className="small">
              <b>{t.playersList}:</b>{' '}
              <span lang="ar" dir="rtl">
                {e.players.join('، ') || '–'}
              </span>
            </p>
            <details>
              <summary>
                {t.cardsUsed}: {e.cards.length}
              </summary>
              <ul className="h-loglist" dir="rtl" lang="ar">
                {Object.entries(counts).map(([id, n]) => (
                  <li key={id}>
                    {ALL_CARDS[id]?.t || id}
                    {n > 1 ? ` ×${n}` : ''}
                  </li>
                ))}
              </ul>
            </details>
            <label className="h-notes">
              {t.notes}
              <Notes value={e.notes} onSave={(v) => patch(e.id, { notes: v })} />
            </label>
          </article>
        );
      })}
    </section>
  );
}

function Notes({ value, onSave }) {
  const [v, setV] = useState(value || '');
  const timer = useRef();
  return (
    <textarea
      rows={3}
      dir="auto"
      value={v}
      onChange={(e) => {
        const val = e.target.value;
        setV(val);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onSave(val), 500);
      }}
      onBlur={() => onSave(v)}
    />
  );
}

export function BackupTab({ t }) {
  const [msg, setMsg] = useState('');
  const input = useRef();
  return (
    <section className="panel h-sec h-narrow">
      <p>{t.backupHelp}</p>
      <div className="h-row">
        <button className="btn primary" onClick={exportBackup}>
          ⬇ {t.exportBtn}
        </button>
        <button className="btn" onClick={() => input.current.click()}>
          ⬆ {t.importBtn}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              await importBackup(f);
              setMsg(t.imported);
            } catch {
              setMsg(t.badFile);
            }
          }}
        />
      </div>
      {msg && <p className="muted">{msg}</p>}
    </section>
  );
}
