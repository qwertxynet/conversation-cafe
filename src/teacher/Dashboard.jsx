import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { SESSIONS } from '../data/sessions.js';
import { MATERIALS, UNLOCK_CODES } from '../data/teacher.js';
import { effective, exportBackup, importBackup, mmss, shuffle, useProjector, useStored } from '../lib.js';
import { Groups } from '../Screen.jsx';
import { TopBar, previewLink } from './Teacher.jsx';

const TABS = ['sessions', 'preview', 'materials', 'students', 'log', 'backup'];

export function ProjectorButton({ t, connected }) {
  return (
    <span className="proj">
      <span className={'dot ' + (connected ? 'on' : '')} />
      <span className="proj-l">
        {t.projector}: {connected ? t.connected : t.notConnected}
      </span>
      {!connected && (
        <button className="t-btn" onClick={() => window.open('#/screen', 'cafe-screen', 'popup,width=1280,height=720')}>
          {t.openProjector}
        </button>
      )}
    </span>
  );
}

export default function Dashboard({ tab, L, lock }) {
  const { t, dir, lang } = L;
  const connected = useProjector();
  const active = TABS.includes(tab) ? tab : 'sessions';
  return (
    <div className="t-page" dir={dir} lang={lang}>
      <TopBar L={L} lock={lock}>
        <ProjectorButton t={t} connected={connected} />
      </TopBar>
      <nav className="t-tabs">
        {TABS.map((k) => (
          <a key={k} href={'#/teacher/' + k} className={k === active ? 'on' : ''}>
            {t[k]}
          </a>
        ))}
      </nav>
      <main className="t-body">
        {active === 'sessions' && <Sessions t={t} />}
        {active === 'preview' && <Preview t={t} />}
        {active === 'materials' && <Materials t={t} lang={lang} />}
        {active === 'students' && <Students t={t} />}
        {active === 'log' && <Log t={t} />}
        {active === 'backup' && <Backup t={t} />}
      </main>
    </div>
  );
}

// ───────── Sessions ─────────
function Sessions({ t }) {
  const [custom] = useStored('custom', {});
  const [share, setShare] = useState(null);
  return (
    <>
      <p className="hint">{t.projectorHelp}</p>
      <div className="t-sessions">
        {SESSIONS.map((s) => {
          const eff = effective(s, custom?.[s.n]);
          const total = eff.segments.reduce((a, g) => a + g.dur, 0);
          return (
            <div key={s.n} className="t-session">
              <span className="muted">
                {t.session} {s.n}
              </span>
              <h2 lang="ar" dir="rtl">
                {s.title}
              </h2>
              <p className={'muted' + (total !== 3000 ? ' warn-text' : '')}>
                {eff.segments.length} · {mmss(total)}
              </p>
              <div className="t-actions">
                <a className="btn primary" href={'#/teacher/s/' + s.n}>
                  ▶ {t.open}
                </a>
                <a className="btn" href={'#/teacher/custom/' + s.n}>
                  ⚙ {t.customise}
                </a>
                <a className="btn" href={'#/teacher/print/' + s.n}>
                  🖨 {t.print}
                </a>
                <button className="btn" onClick={() => setShare(share === s.n ? null : s.n)} aria-pressed={share === s.n}>
                  ▦ {t.share}
                </button>
                {eff.segments.some((g) => g.kind === 'video') && (
                  <button className="btn" onClick={() => setShare(share === 'g' + s.n ? null : 'g' + s.n)} aria-pressed={share === 'g' + s.n}>
                    👀 {t.guide}
                  </button>
                )}
              </div>
              {share === s.n && <Share n={s.n} t={t} />}
              {share === 'g' + s.n && <GuideShare t={t} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

const siteUrl = (path) => location.origin + location.pathname + '#/' + path;
export const unlockUrl = (n) => siteUrl('u/' + UNLOCK_CODES[n]);

function Share({ n, t }) {
  return (
    <QrShare
      t={t}
      id={'unlock-' + n}
      url={unlockUrl(n)}
      code={UNLOCK_CODES[n]}
      help={t.shareHelp}
      title="رَاجِعُوا الْجَلْسَةَ عَلَى هَوَاتِفِكُمْ"
    />
  );
}

export function GuideShare({ t, compact }) {
  return <QrShare t={t} id="guide" url={siteUrl('watch')} help={t.guideHelp} title="دَلِيلُ الْمُشَاهَدَةِ عَلَى هَوَاتِفِكُمْ" compact={compact} />;
}

/** A QR code for a student link, with a button to show it full-screen on the projector */
function QrShare({ t, id, url, code, help, title, compact }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg);
  }, [url]);
  const [overlay, setOverlay] = useStored('overlay', null);
  const onScreen = overlay?.kind === 'qr' && overlay.id === id;
  const button = (
    <button aria-pressed={onScreen} onClick={() => setOverlay(onScreen ? null : { kind: 'qr', id, svg, code, title })} disabled={!svg}>
      {onScreen ? t.hidePairs : t.showPairs}
    </button>
  );
  if (compact) return button;
  return (
    <div className="share">
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <p className="hint">{help}</p>
        {code && (
          <p>
            {t.code}: <b className="code">{code}</b>
          </p>
        )}
        <p className="url">{url}</p>
        {button}
      </div>
    </div>
  );
}

// ───────── Student view preview ─────────
function Preview({ t }) {
  const pages = [
    ['', t.studentHome],
    ['learn/1', t.session + ' 1'],
    ['learn/2', t.session + ' 2'],
    ['learn/3', t.session + ' 3'],
    ['watch', t.guide],
  ];
  const [page, setPage] = useState('');
  const [nonce, setNonce] = useState(0);
  return (
    <div className="preview-wrap">
      <div className="preview-side">
        <p className="hint">{t.previewHelp}</p>
        <div className="preview-pages">
          {pages.map(([p, label]) => (
            <button
              key={p}
              aria-pressed={page === p}
              onClick={() => {
                setPage(p);
                setNonce((x) => x + 1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn" onClick={() => window.open(previewLink(page), '_blank')}>
          ↗ {t.openNewTab}
        </button>
      </div>
      <div className="phone">
        <iframe key={nonce} src={'#/preview/' + page} title={t.preview} />
      </div>
    </div>
  );
}

// ───────── Materials ─────────
function Materials({ t, lang }) {
  const [ticks, setTicks] = useStored('ticks', {});
  return (
    <div className="t-cols">
      {SESSIONS.map((s) => {
        const done = new Set(ticks?.[s.n] || []);
        return (
          <section key={s.n} className="t-card">
            <h2>
              {t.session} {s.n}: <span lang="ar">{s.title}</span>
            </h2>
            <ul className="checklist">
              {MATERIALS[s.n].map((m, i) => (
                <li key={i}>
                  <label>
                    <input
                      type="checkbox"
                      checked={done.has(i)}
                      onChange={() => {
                        done.has(i) ? done.delete(i) : done.add(i);
                        setTicks({ ...ticks, [s.n]: [...done] });
                      }}
                    />
                    <span>{m[lang === 'ar' ? 1 : 0]}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button className="link" onClick={() => setTicks({ ...ticks, [s.n]: [] })}>
              {t.resetTicks}
            </button>
          </section>
        );
      })}
    </div>
  );
}

// ───────── Students ─────────
function sortByLevel(list) {
  // strongest first, random order within each level
  return [0, 1, 2]
    .reverse()
    .flatMap((lv) => shuffle(list.filter((s) => s.level === lv)));
}

export function makePairs(present) {
  const s = sortByLevel(present);
  const pairs = [];
  while (s.length > 1) pairs.push([s.shift().name, s.pop().name]);
  if (s.length) {
    if (pairs.length) pairs[0].push(s[0].name);
    else pairs.push([s[0].name]);
  }
  return pairs;
}

export function makeMajlis(present) {
  const count = present.length >= 8 ? 2 : 1;
  const groups = Array.from({ length: count }, () => []);
  sortByLevel(present).forEach((s, i) => {
    const round = Math.floor(i / count);
    const g = round % 2 === 0 ? i % count : count - 1 - (i % count); // snake, so levels balance
    groups[g].push(s);
  });
  return groups.map((g) => {
    const byLevel = [...g]; // already strongest first
    const roles = new Map();
    const take = (role, fromTop) => {
      const pool = byLevel.filter((s) => !roles.has(s.id));
      if (!pool.length) return;
      roles.set((fromTop ? pool[0] : pool[pool.length - 1]).id, role);
    };
    take('elder', true);
    take('host', true);
    take('server', false);
    take('newcomer', false);
    const order = { elder: 0, host: 1, server: 2, newcomer: 3, guest: 4 };
    return g
      .map((s) => ({ name: s.name, role: roles.get(s.id) || 'guest' }))
      .sort((a, b) => order[a.role] - order[b.role]);
  });
}

function Students({ t }) {
  const [roster, setRoster] = useStored('roster', []);
  const [groups, setGroups] = useStored('groups', {});
  const [overlay, setOverlay] = useStored('overlay', null);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const list = roster || [];
  const present = list.filter((s) => s.present);
  const add = (e) => {
    e.preventDefault();
    const nm = name.trim();
    if (!nm) return;
    setRoster([...list, { id: Date.now(), name: nm, level: +level, present: true }]);
    setName('');
  };
  const patch = (id, p) => setRoster((prev) => (prev || []).map((s) => (s.id === id ? { ...s, ...p } : s)));
  const showing = (k) => overlay?.kind === k;
  const toggleShow = (k, data) => setOverlay(showing(k) ? null : data);

  return (
    <div className="t-cols two">
      <section className="t-card">
        <h2>{t.students}</h2>
        <p className="hint">{t.rosterHelp}</p>
        <form className="add-row" onSubmit={add}>
          <input placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} aria-label={t.name} />
          <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label={t.level}>
            {t.levels.map((l, i) => (
              <option key={i} value={i}>
                {l}
              </option>
            ))}
          </select>
          <button className="primary">{t.add}</button>
        </form>
        {list.length ? (
          <table className="roster">
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.level}</th>
                <th>{t.present}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <select value={s.level} onChange={(e) => patch(s.id, { level: +e.target.value })} aria-label={t.level}>
                      {t.levels.map((l, i) => (
                        <option key={i} value={i}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={!!s.present} onChange={() => patch(s.id, { present: !s.present })} aria-label={t.present} />
                  </td>
                  <td>
                    <button className="link" onClick={() => setRoster(list.filter((x) => x.id !== s.id))}>
                      {t.remove}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{t.noStudents}</p>
        )}
      </section>

      <section className="t-card">
        <div className="t-actions">
          <button className="btn" disabled={present.length < 2} onClick={() => setGroups({ ...groups, pairs: makePairs(present) })}>
            👥 {groups?.pairs ? t.reshuffle : t.makePairs}
          </button>
          <button className="btn" disabled={present.length < 3} onClick={() => setGroups({ ...groups, majlis: makeMajlis(present) })}>
            ☕ {t.makeMajlis}
          </button>
        </div>
        {groups?.pairs && (
          <div className="group-block">
            <h3>
              {t.pairs}
              <button aria-pressed={showing('pairs')} onClick={() => toggleShow('pairs', { kind: 'pairs', pairs: groups.pairs })}>
                {showing('pairs') ? t.hidePairs : t.showPairs}
              </button>
            </h3>
            <div className="mini">
              <Groups overlay={{ kind: 'pairs', pairs: groups.pairs }} />
            </div>
          </div>
        )}
        {groups?.majlis && (
          <div className="group-block">
            <h3>
              {t.majlis}
              <button aria-pressed={showing('majlis')} onClick={() => toggleShow('majlis', { kind: 'majlis', groups: groups.majlis })}>
                {showing('majlis') ? t.hidePairs : t.showPairs}
              </button>
            </h3>
            <div className="mini">
              <Groups overlay={{ kind: 'majlis', groups: groups.majlis }} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ───────── Log ─────────
function Log({ t }) {
  const [log, setLog] = useStored('log', []);
  const entries = log || [];
  const patch = (id, p) => setLog((prev) => (prev || []).map((e) => (e.id === id ? { ...e, ...p } : e)));
  const [n, setN] = useState(1);
  return (
    <div>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          setLog([{ id: Date.now(), date: new Date().toISOString().slice(0, 10), n: +n, covered: [], notes: '' }, ...entries]);
        }}
      >
        <select value={n} onChange={(e) => setN(e.target.value)} aria-label={t.session}>
          {SESSIONS.map((s) => (
            <option key={s.n} value={s.n}>
              {t.session} {s.n}: {s.title}
            </option>
          ))}
        </select>
        <button className="primary">{t.addEntry}</button>
      </form>
      {!entries.length && <p className="muted">{t.emptyLog}</p>}
      {entries.map((e) => (
        <article key={e.id} className="t-card log-entry">
          <div className="log-head">
            <input type="date" value={e.date} onChange={(ev) => patch(e.id, { date: ev.target.value })} aria-label={t.date} />
            <b>
              {t.session} {e.n}: <span lang="ar">{SESSIONS[e.n - 1]?.title}</span>
            </b>
            <span className="t-spacer" />
            <button className="link" onClick={() => confirm(t.delete + '?') && setLog(entries.filter((x) => x.id !== e.id))}>
              {t.delete}
            </button>
          </div>
          {e.covered?.length > 0 && (
            <table className="run">
              <thead>
                <tr>
                  <th>{t.covered}</th>
                  <th>{t.planned}</th>
                  <th>{t.actual}</th>
                </tr>
              </thead>
              <tbody>
                {e.covered.map((c, i) => (
                  <tr key={i}>
                    <td lang="ar" dir="rtl">
                      {c.title}
                    </td>
                    <td className="t">{mmss(c.planned)}</td>
                    <td className={'t' + (c.actual > c.planned + 30 ? ' late' : '')}>{mmss(c.actual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <label className="notes-field">
            {t.notes}
            <NotesBox value={e.notes} onSave={(v) => patch(e.id, { notes: v })} />
          </label>
        </article>
      ))}
    </div>
  );
}

function NotesBox({ value, onSave }) {
  const [v, setV] = useState(value || '');
  const timer = useRef();
  return (
    <textarea
      rows={3}
      dir="auto"
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        clearTimeout(timer.current);
        const val = e.target.value;
        timer.current = setTimeout(() => onSave(val), 500);
      }}
      onBlur={() => onSave(v)}
    />
  );
}

// ───────── Backup ─────────
function Backup({ t }) {
  const [msg, setMsg] = useState('');
  const input = useRef();
  return (
    <section className="t-card narrow">
      <p>{t.backupHelp}</p>
      <div className="t-actions">
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
      {msg && <p className="hint">{msg}</p>}
    </section>
  );
}
