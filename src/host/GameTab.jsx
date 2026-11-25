import { useMemo } from 'react';
import Card3D, { Stars } from '../components/Card.jsx';
import Emblem from '../components/Emblem.jsx';
import { CARDS, DAYS, FOLLOWUPS, WEEK, dayPlan } from '../lib/content.js';
import { askerOf, backToTable, newGame, newPin, removePlayer, reshuffle, skip, stackOf, start, toWall, wallCards, MAX_PLAYERS } from '../lib/game.js';
import { store, useStored, useTick } from '../lib/store.js';
import { audio } from '../lib/audio.js';
import { connectedTokens, sendToToken, stopHost } from '../lib/net.js';
import { joinUrl } from '../screen/Screen.jsx';
import { doStep, updateGame } from './sync.js';

const endForAll = () => {
  for (const tk of connectedTokens()) sendToToken(tk, { type: 'end' });
  stopHost();
  store.set('game', undefined);
};

export default function GameTab({ t, game, net }) {
  if (!game) return <ChooseDay t={t} />;
  return (
    <div className="h-game">
      <NetBar t={t} game={game} net={net} />
      {game.phase === 'lobby' && <LobbyCtl t={t} game={game} />}
      {game.phase === 'table' && <TurnCtl t={t} game={game} />}
      {game.phase === 'wall' && <WallCtl t={t} game={game} />}
      <Seats t={t} game={game} />
      <div className="h-row end">
        <button className="btn small ghost" onClick={() => confirm(t.cancelSure) && endForAll()}>
          ✕ {t.cancel}
        </button>
      </div>
      <p className="muted small">{t.credits}</p>
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
        {DAYS.map((d) => (
          <button key={d.n} className={'h-day' + (sel === d.n ? ' on' : '')} onClick={() => setSel(d.n)} aria-pressed={sel === d.n}>
            <span className="h-day-n">{d.n}</span>
            <span className="h-day-t" lang="ar" dir="rtl">
              {d.title}
            </span>
            <span className="h-day-en">{d.en}</span>
            <Stars n={d.stars} />
            <span className="muted small">
              {dayPlan(d.n, custom).cards.length} {t.cards}
            </span>
          </button>
        ))}
      </div>
      <p className="muted">{t.projectorHelp}</p>
      <button
        className="btn primary big"
        onClick={() => {
          audio.unlock();
          store.set('game', newGame(sel, dayPlan(sel, store.get('custom', {})).cards, newPin()));
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
          disabled={!game.order.length}
          onClick={() => {
            audio.sfx('pass');
            updateGame(start);
          }}
        >
          ▶ {t.startGame}
        </button>
        {!game.order.length && <span className="muted small">{t.startNeeds}</span>}
      </div>
    </section>
  );
}

const STEPS = ['draw', 'front', 'ask'];

function Who({ g, token }) {
  const p = g.players[token];
  if (!p) return null;
  return (
    <span className="h-who">
      <Emblem kind={p.emblem} />
      <b lang="ar" dir="rtl">
        {p.name}
      </b>
    </span>
  );
}

function TurnCtl({ t, game }) {
  const [custom] = useStored('custom', {});
  const plan = useMemo(() => dayPlan(game.day, custom), [game.day, custom]);
  const turn = game.turn;
  const asker = askerOf(game);
  const card = turn?.card ? CARDS[turn.card] : null;
  const next = game.deck[0] ? CARDS[game.deck[0]] : null;
  const d = plan.day;
  const total = new Set([...game.deck, ...game.turns.map((x) => x.card), turn?.card].filter(Boolean)).size;

  if (!turn)
    return (
      <section className="panel h-sec">
        <p className="muted">{t.waitingSeat}</p>
        <TableEnd t={t} />
      </section>
    );

  const steps = { draw: ['draw', t.doDraw], front: ['said', t.doSaid], ask: ['asked', t.doAsked] };
  const [action, label] = steps[turn.step];
  const blocked = turn.step === 'draw' && !game.deck.length;

  return (
    <section className="panel h-sec h-turn">
      <div className="h-turnhead">
        <h2>
          {t.turn} {turn.n}
        </h2>
        <span className="h-role">
          {t.speaker}: <Who g={game} token={turn.speaker} />
        </span>
        <span className="h-role">
          {asker ? (
            <>
              {t.asker}: <Who g={game} token={asker} />
            </>
          ) : (
            <span className="muted">{t.noAsker}</span>
          )}
        </span>
      </div>

      <ol className="h-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={s === turn.step ? 'on' : STEPS.indexOf(turn.step) > i ? 'done' : ''}>
            {t.steps[s]}
          </li>
        ))}
      </ol>

      <div className="h-row">
        <button className="btn primary big" disabled={blocked} onClick={() => doStep('teacher', action, turn.n)}>
          {label}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            if (turn.step !== 'ask' && !confirm(t.skipSure)) return;
            audio.sfx('pass');
            updateGame(skip);
          }}
        >
          ⏭ {turn.step === 'ask' ? t.skipFu : t.skip}
        </button>
        <span className="h-spacer" />
        <span className="muted">
          {t.deckLeft}: <b>{game.deck.length}</b> / {total}
        </span>
      </div>

      {blocked && (
        <div className="h-alert">
          <p>{t.deckEmpty}</p>
          <button className="btn forest" onClick={() => updateGame(reshuffle)}>
            ⟳ {t.reshuffle}
          </button>
        </div>
      )}

      {card ? (
        <div className="h-cardinfo">
          <Card3D card={card} title={d.title} size="host" />
          <div className="h-cardtext">
            <div className="h-model">
              <b>{t.model}</b>
              <p lang="ar" dir="rtl">
                {card.a}
              </p>
            </div>
            {turn.step === 'ask' && turn.fu.length > 0 && (
              <>
                <p className="muted small">{t.followups}:</p>
                <ul className="h-fu" lang="ar" dir="rtl">
                  {turn.fu.map((i) => (
                    <li key={i}>{FOLLOWUPS[i]}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="muted">{t.waiting}</p>
      )}

      {next && (
        <p className="muted small h-next">
          {t.nextCard}:{' '}
          <span lang="ar" dir="rtl">
            {next.q}
          </span>{' '}
          <Stars n={next.s} />
        </p>
      )}

      <Facts t={t} d={d} />
      <TableEnd t={t} />
    </section>
  );
}

function TableEnd({ t }) {
  return (
    <div className="h-row end">
      <button className="btn forest" onClick={() => updateGame(toWall)}>
        {t.toWall}
      </button>
    </div>
  );
}

function Facts({ t, d }) {
  return (
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
  );
}

function WallCtl({ t, game }) {
  return (
    <section className="panel h-sec">
      <p>{t.wallNote}</p>
      <div className="h-row">
        <button className="btn" onClick={() => updateGame(backToTable)}>
          {t.backToTable}
        </button>
        <button
          className="btn primary"
          onClick={() => {
            const g = store.get('game', null);
            if (!g) return;
            const real = g.turns.filter((x) => !x.test);
            const entry = {
              v: 2,
              id: Date.now(),
              date: new Date(g.started).toISOString().slice(0, 10),
              day: g.day,
              turns: real.length,
              cards: wallCards(g),
              players: g.order.filter((tk) => g.players[tk] && !g.players[tk].test).map((tk) => g.players[tk].name),
              notes: '',
            };
            store.set('log', [entry, ...store.get('log', [])]);
            endForAll();
            location.hash = '#/host/log';
          }}
        >
          ✓ {t.finish}
        </button>
      </div>
    </section>
  );
}

function Seats({ t, game }) {
  useTick(true, 1500);
  const conn = connectedTokens();
  const asker = askerOf(game);
  return (
    <section className="panel h-sec">
      <h2>
        {t.seats} ({game.order.length}/{MAX_PLAYERS})
      </h2>
      {!game.order.length && <p className="muted">{t.noPlayers}</p>}
      <ol className="h-seats">
        {game.order.map((tk) => {
          const p = game.players[tk];
          const speaking = game.phase === 'table' && game.turn?.speaker === tk;
          const asking = game.phase === 'table' && asker === tk;
          return (
            <li key={tk} className={speaking ? 'speaking' : asking ? 'asking' : ''}>
              <span className={'dot ' + (conn.has(tk) ? 'on' : 'bad')} title={conn.has(tk) ? t.connected : t.away} />
              <Emblem kind={p.emblem} />
              <b lang="ar" dir="rtl">
                {p.name}
              </b>
              {p.test && <span className="muted">({t.test})</span>}
              {speaking && <span className="h-tag on">{t.speaking}</span>}
              {asking && <span className="h-tag">{t.asking}</span>}
              <span className="muted small">
                {stackOf(game, tk)} {t.turnsTaken}
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
