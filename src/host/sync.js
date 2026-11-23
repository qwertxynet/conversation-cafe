// The teacher's control window is the host: it keeps the game and tells each phone what to show.
import { store } from '../lib/store.js';
import { CARDS, FOLLOWUPS, dayPlan } from '../lib/content.js';
import { act, askerOf, join, stackOf, takenEmblems, untilTurn } from '../lib/game.js';
import { audio } from '../lib/audio.js';
import { connectedTokens, sendToPeer, sendToToken, tagConnection } from '../lib/net.js';

const SOUND = { draw: 'deal', flip: 'flip', said: 'play', asked: 'pass' };

/** What one phone needs: the seats, the current turn, and (for the asker) the follow-up starters. */
export function syncFor(g, token) {
  const plan = dayPlan(g.day, store.get('custom', {}));
  const t = g.turn;
  const asker = askerOf(g);
  const seat = (tk) => tk && g.players[tk] && { name: g.players[tk].name, emblem: g.players[tk].emblem };
  const c = t?.card ? CARDS[t.card] : null;
  return {
    type: 'sync',
    phase: g.phase,
    day: g.day,
    title: plan.day.title,
    me: seat(token),
    seats: g.order.map((tk) => ({
      ...seat(tk),
      test: !!g.players[tk].test,
      me: tk === token,
      speaker: tk === t?.speaker,
      asker: tk === asker,
      stack: stackOf(g, tk),
    })),
    turn: t && {
      n: t.n,
      step: t.step,
      speaker: seat(t.speaker),
      asker: seat(asker),
      mine: t.speaker === token,
      asking: asker === token,
      card: c && { q: c.q, f1: c.f1, f3: c.f3, s: c.s },
      fu: asker === token && t.step === 'ask' ? t.fu.map((i) => FOLLOWUPS[i]) : [],
    },
    until: untilTurn(g, token),
    deckLeft: g.deck.length,
  };
}

export function syncAll() {
  const g = store.get('game', null);
  if (!g) return;
  for (const token of connectedTokens()) {
    // still choosing an emblem: refresh which ones are taken
    sendToToken(token, g.players[token] ? syncFor(g, token) : { type: 'pick', taken: takenEmblems(g) });
  }
}

/** Change the game, save it, and update every phone. */
export function updateGame(fn) {
  const g = store.get('game', null);
  if (!g) return;
  const ng = fn(g);
  if (ng && ng !== g) store.set('game', ng);
  syncAll();
}

/** A step done from the teacher's window (or by a phone). Plays the card sound. */
export function doStep(who, action, n) {
  const g = store.get('game', null);
  if (!g) return false;
  const followups = dayPlan(g.day, store.get('custom', {})).followups;
  const res = act(g, who, action, n, followups);
  if (res.ok) {
    store.set('game', res.g);
    audio.sfx(SOUND[action]);
    if (action === 'said' && res.g.turn?.n !== g.turn.n) setTimeout(() => audio.sfx('pass'), 450);
  }
  syncAll();
  return res.ok;
}

/** Messages from phones. */
export function onPhoneMessage(peerId, m, refresh) {
  if (!m || typeof m !== 'object') return;
  const g = store.get('game', null);
  if (!g) return sendToPeer(peerId, { type: 'reject', reason: 'ended' });
  const token = String(m.token || '').slice(0, 64);
  if (!token) return;
  if (m.type === 'hello') {
    if (!g.players[token]) {
      // a new student: check the nickname first, then let them pick an emblem
      const res = join(g, token, m.name, m.emblem, !!m.test);
      if (res.error === 'name' || res.error === 'taken' || res.error === 'full') return sendToPeer(peerId, { type: 'reject', reason: res.error });
      if (res.error) {
        tagConnection(peerId, token);
        return sendToPeer(peerId, { type: 'pick', taken: takenEmblems(g), again: res.error === 'emblem-taken' });
      }
      store.set('game', res.g);
      audio.sfx('join');
    }
    tagConnection(peerId, token);
    sendToPeer(peerId, { type: 'welcome', emblem: store.get('game', g).players[token].emblem });
    syncAll();
    refresh?.();
  } else if (m.type === 'act') {
    if (!g.players[token]) return;
    if (!doStep(token, String(m.act), typeof m.n === 'number' ? m.n : null)) sendToToken(token, syncFor(g, token));
  }
}
