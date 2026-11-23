import { useMemo, useState } from 'react';
import Card, { Stars } from '../components/Card.jsx';
import { DAYS, dayPlan, WEEK } from '../lib/content.js';
import { newGame, newPin, goQuestion, toWall, play, removePlayer, MAX_PLAYERS } from '../lib/game.js';
import { mmss, store, useStored, useTick } from '../lib/store.js';
import { audio } from '../lib/audio.js';
import { connectedTokens, sendToToken, stopHost } from '../lib/net.js';
import { joinUrl } from '../screen/Screen.jsx';
import { syncFor, updateGame } from './Host.jsx';

export default function GameTab({ t, game, net }) {
  if (!game) return <ChooseDay t={t} />;
  return (
    <div className="h-game">
      <NetBar t={t} game={game} net={net} />
      {game.phase === 'lobby' && <LobbyCtl t={t} game={game} />}
      {game.phase === 'question' && <QuestionCtl t={t} game={game} />}
      {game.phase === 'wall' && <WallCtl t={t} game={game} />}
      <Players t={t} game={game} />
      <div className="h-row end">
        <button
          className="btn small ghost"
          onClick={() => {
            if (!confirm(t.cancelSure)) return;
            for (const tk of connectedTokens()) sendToToken(tk, { type: 'end' });
            stopHost();
            store.set('game', undefined);
          }}
        >
          ✕ {t.cancel}
        </button>
      </div>
    </div>
  );
}

function ChooseDay({ t }) {
  const [sel, setSel] = useStored('select', 1);
  const [custom] = useStored('custom', {});
  return (
    <section>
      <h2>{t.chooseDay}</h2>
      <div className="h-days">
        {DAYS.map((d) => {
          const plan = dayPlan(d.n, custom);
          return (
            <button key={d.n} className={'h-day' + (sel === d.n ? ' on' : '')} onClick={() => setSel(d.n)} aria-pressed={sel === d.n}>
              <span className="h-day-n">{d.n}</span>
              <span className="h-day-t" lang="ar" dir="rtl">
                {d.title}
              </span>
              <span className="h-day-en">{d.en}</span>
              <Stars n={d.stars} />
              <span className="muted small">
                {plan.questions.length} {t.questions} · {plan.pool.length} {t.cards}
              </span>
            </button>
          );
        })}
      </div>
      <p className="muted">{t.projectorHelp}</p>
      <button
        className="btn primary big"
        onClick={() => {
          audio.unlock();
          const plan = dayPlan(sel, store.get('custom', {}));
          store.set('game', newGame(sel, plan.pool, newPin()));
        }}
      >
        ▶ {t.openLobby}: {t.day} {sel}
      </button>
    </section>
  );
}

function NetBar({ t, game, net }) {
  const cls = net === 'online' ? 'on' : net === 'off' ? '' : net === 'connecting' || net === 'reconnecting' ? 'warn' : 'bad';
  const d = DAYS.find((x) => x.n === game.day);
  return (
    <div className="h-net panel">
      <span>
        <b>
          {t.day} {d.n}: {d.en}
        </b>{' '}
        <span lang="ar" dir="rtl">
          ({d.title})
        </span>
      </span>
      <span>
        {t.pin}: <b className="h-pin">{game.pin}</b>
      </span>
      <span className="h-net-st">
        <span className={'dot ' + cls} /> {t.net[net] || net}
      </span>
      {net !== 'online' && <p className="muted small h-net-help">{t.netHelp}</p>}
    </div>
  );
}

function LobbyCtl({ t, game }) {
  const [custom] = useStored('custom', {});
  const count = dayPlan(game.day, custom).questions.length;
  return (
    <section className="panel h-sec">
      <h2>{t.lobby}</h2>
      <p>
        {t.joinAt} <span className="ltr h-url">{joinUrl(game.pin)}</span>
      </p>
      <div className="h-row">
        <button className="btn" onClick={() => window.open('#/join/' + game.pin + '?test=1', 'cc-test', 'popup,width=400,height=820')}>
          🧪 {t.testPlayer}
        </button>
        <button
          className="btn primary"
          onClick={() => {
            audio.sfx('next');
            updateGame((g) => goQuestion(g, 0, count));
          }}
        >
          ▶ {t.startGame}
        </button>
      </div>
    </section>
  );
}

function QuestionCtl({ t, game }) {
  useTick(true, 1000);
  const [custom] = useStored('custom', {});
  const plan = useMemo(() => dayPlan(game.day, custom), [game.day, custom]);
  const qs = plan.questions;
  const q = qs[game.q];
  const nextQ = qs[game.q + 1];
  const go = (i) => {
    audio.sfx('next');
    updateGame((g) => goQuestion(g, i, qs.length));
  };
  const elapsed = game.qAt ? (Date.now() - game.qAt) / 1000 : 0;
  const d = plan.day;
  return (
    <section className="panel h-sec">
      <div className="h-qhead">
        <h2>
          {t.question} {game.q + 1} {t.of} {qs.length}
        </h2>
        <span className="h-clock">
          ⏱ {t.elapsed} {mmss(elapsed)}
        </span>
      </div>
      <p className="h-q" lang="ar" dir="rtl">
        {q?.q}
      </p>
      <div className="h-model">
        <b>{t.model}</b>
        <p lang="ar" dir="rtl">
          {q?.a}
        </p>
      </div>
      <div className="h-row">
        <button className="btn" onClick={() => go(game.q - 1)} disabled={game.q === 0}>
          {t.back}
        </button>
        <button className="btn primary" onClick={() => go(game.q + 1)} disabled={!nextQ}>
          {t.next}
        </button>
        <span className="h-spacer" />
        <button className="btn forest" onClick={() => updateGame((g) => toWall(g))}>
          {t.toWall}
        </button>
      </div>
      <p className="muted h-next">
        {nextQ ? (
          <>
            {t.nextUp}:{' '}
            <span lang="ar" dir="rtl">
              {nextQ.q}
            </span>
          </>
        ) : (
          t.lastQuestion
        )}
      </p>
      <details className="h-facts">
        <summary>
          {t.facts} ({t.asOf} {WEEK.asOf})
        </summary>
        <ul>
          {d.facts.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        <p className="muted small">
          {t.sources}:{' '}
          {d.sources.map((s, i) => (
            <span key={i}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
              {i < d.sources.length - 1 ? '; ' : ''}
            </span>
          ))}
        </p>
      </details>
    </section>
  );
}

function WallCtl({ t, game }) {
  const [custom] = useStored('custom', {});
  const plan = dayPlan(game.day, custom);
  return (
    <section className="panel h-sec">
      <p>{t.wallNote}</p>
      <div className="h-row">
        <button className="btn" onClick={() => updateGame((g) => ({ ...g, phase: 'question' }))}>
          {t.backToQ}
        </button>
        <button
          className="btn primary"
          onClick={() => {
            const g = store.get('game', null);
            if (!g) return;
            const real = g.plays.filter((p) => !p.test);
            const entry = {
              id: Date.now(),
              date: new Date(g.started).toISOString().slice(0, 10),
              day: g.day,
              reached: Math.min((g.reached || 0) + 1, plan.questions.length),
              total: plan.questions.length,
              players: Object.values(g.players).filter((p) => !p.test).map((p) => p.name),
              cards: real.map((p) => p.id),
              notes: '',
            };
            store.set('log', [entry, ...store.get('log', [])]);
            for (const tk of connectedTokens()) sendToToken(tk, { type: 'end' });
            stopHost();
            store.set('game', undefined);
            location.hash = '#/host/log';
          }}
        >
          ✓ {t.finish}
        </button>
      </div>
    </section>
  );
}

function Players({ t, game }) {
  useTick(true, 1500);
  const conn = connectedTokens();
  const [pick, setPick] = useState(null); // {token, id}
  const list = Object.entries(game.players).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  const played = (tk) => game.plays.filter((p) => p.token === tk).length;
  return (
    <section className="panel h-sec">
      <h2>
        {t.players} ({list.length}/{MAX_PLAYERS})
      </h2>
      {!list.length && <p className="muted">{t.noPlayers}</p>}
      {list.map(([tk, p]) => (
        <div key={tk} className="h-player">
          <div className="h-player-head">
            <span className={'dot ' + (conn.has(tk) ? 'on' : 'bad')} title={conn.has(tk) ? t.connected : t.away} />
            <b lang="ar" dir="rtl">
              {p.name}
            </b>
            {p.test && <span className="muted">({t.test})</span>}
            <span className="muted small">
              {t.played}: {played(tk)}
            </span>
            <span className="h-spacer" />
            <button
              className="btn small ghost"
              onClick={() => {
                if (!confirm(t.removeSure)) return;
                sendToToken(tk, { type: 'reject', reason: 'ended' });
                updateGame((g) => removePlayer(g, tk));
              }}
            >
              {t.remove}
            </button>
          </div>
          <div className="h-hand" dir="rtl">
            {p.hand.map((id) => (
              <button
                key={id}
                className="h-cardbtn"
                disabled={game.phase !== 'question'}
                onClick={() => setPick({ token: tk, id, name: p.name })}
                title={t.playFor + ' ' + p.name}
              >
                <Card id={id} size="sm" />
              </button>
            ))}
          </div>
        </div>
      ))}
      {pick && (
        <div className="h-confirm" role="dialog" aria-modal="true">
          <div className="panel h-confirm-in">
            <p>
              {t.playFor} <b lang="ar">{pick.name}</b>?
            </p>
            <Card id={pick.id} size="md" />
            <div className="h-row">
              <button className="btn ghost" onClick={() => setPick(null)}>
                {t.back}
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  const g = store.get('game', null);
                  const res = play(g, pick.token, pick.id);
                  if (res.ok) {
                    store.set('game', res.g);
                    audio.sfx('play');
                    sendToToken(pick.token, syncFor(res.g, pick.token));
                  }
                  setPick(null);
                }}
              >
                ✓ {t.playIt}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
