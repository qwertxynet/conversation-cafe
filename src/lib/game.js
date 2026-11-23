// Pure turn rules. The game object lives on the teacher's laptop (saved in localStorage as "game").
//
// A turn, step by step:
//   draw  – the speaker's seat lights up; they tap Draw
//   front – the card is face up: they read the question out loud, then Flip
//   back  – the two answer frames: they answer out loud, then «قُلْتُهَا ✓»
//   ask   – the next student in seat order asks one follow-up, then «سَأَلْتُ ✓»
// Then that asker's own turn starts. The teacher can do any step, or skip a turn.
import { shuffle } from './store.js';

export const MAX_PLAYERS = 6;
export const EMBLEMS = ['cup', 'book', 'lantern', 'palm', 'pen', 'dallah', 'key', 'star'];
export const FOLLOWUPS_SHOWN = 3;

// Arabic letters (with harakat) and spaces only, 2–16 characters
const NAME_RE = /^[ء-يً-ْٰٱ-ۓـ ]{2,16}$/;
export const validName = (name) => NAME_RE.test((name || '').trim()) && /[ء-ي]/.test(name);
export const cleanName = (name) => (name || '').trim().replace(/\s+/g, ' ');

export const newPin = () => String(1000 + Math.floor(Math.random() * 9000));

export function newGame(day, deck, pin) {
  return {
    v: 2,
    pin,
    day,
    phase: 'lobby', // lobby | table | wall
    started: Date.now(),
    players: {}, // token -> { name, emblem, test, joinedAt }
    order: [], // tokens in seat order (the order they joined)
    deck: [...deck], // card ids still to draw, in draw order
    turn: null, // { n, speaker, step, card, asker, fu, at }
    n: 0, // turns started
    turns: [], // finished turns: { n, token, name, emblem, test, card, at }
  };
}

const clone = (g) => JSON.parse(JSON.stringify(g));

export const takenEmblems = (g) => Object.values(g.players).map((p) => p.emblem);

/**
 * Add a player (or return the existing one).
 * Returns { g } or { g, error }: name | taken | full | emblem | emblem-taken
 */
export function join(g0, token, rawName, emblem, test = false) {
  if (g0.players[token]) return { g: g0 }; // rejoining: same seat
  const name = cleanName(rawName);
  if (!validName(name)) return { g: g0, error: 'name' };
  if (Object.values(g0.players).some((p) => p.name === name)) return { g: g0, error: 'taken' };
  if (g0.order.length >= MAX_PLAYERS) return { g: g0, error: 'full' };
  if (!EMBLEMS.includes(emblem)) return { g: g0, error: 'emblem' };
  if (takenEmblems(g0).includes(emblem)) return { g: g0, error: 'emblem-taken' };
  const g = clone(g0);
  g.players[token] = { name, emblem, test: !!test, joinedAt: Date.now() };
  g.order.push(token); // a late joiner takes the next seat at the end
  if (g.phase === 'table' && !g.turn) beginTurn(g, token);
  return { g };
}

/** The seat after this one (wrapping round the table). */
export function nextAfter(g, token) {
  const o = g.order;
  if (!o.length) return null;
  const i = o.indexOf(token);
  return o[(i + 1) % o.length];
}

/** Who asks the follow-up: the next student in seat order (none when only one student is seated). */
export function askerOf(g) {
  const t = g.turn;
  if (!t) return null;
  if (t.asker) return t.asker;
  if (g.order.length < 2) return null;
  return nextAfter(g, t.speaker);
}

/** How many turns until this student's turn starts (0 = it's their turn now). */
export function untilTurn(g, token) {
  if (!g.turn) return null;
  const i = g.order.indexOf(token);
  const s = g.order.indexOf(g.turn.speaker);
  if (i < 0 || s < 0) return null;
  return (i - s + g.order.length) % g.order.length;
}

function beginTurn(g, token) {
  if (!token) {
    g.turn = null;
    return;
  }
  g.n += 1;
  g.turn = { n: g.n, speaker: token, step: 'draw', card: null, asker: null, fu: [], at: Date.now() };
}

function finishTurn(g) {
  const t = g.turn;
  const p = g.players[t.speaker];
  if (p && t.card) g.turns.push({ n: t.n, token: t.speaker, name: p.name, emblem: p.emblem, test: p.test, card: t.card, at: Date.now() });
  const next = t.asker && g.players[t.asker] ? t.asker : nextAfter(g, t.speaker);
  beginTurn(g, next);
}

/** Lobby → the table: the first student to join takes the first turn. */
export function start(g0) {
  if (g0.phase !== 'lobby' || !g0.order.length) return g0;
  const g = clone(g0);
  g.phase = 'table';
  if (!g.turn) beginTurn(g, g.order[0]);
  return g;
}

const pick = (arr, k) => shuffle(arr).slice(0, k);

/**
 * A step of the turn, done by a student (their token) or by the teacher ('teacher').
 * action: draw | flip | said | asked. n (optional) = the turn number the phone saw, so a late double tap does nothing.
 * followups: indices of the follow-up starters that are shown (from the Edit tab).
 * Returns { g, ok }.
 */
export function act(g0, who, action, n, followups = []) {
  const t = g0.turn;
  const no = { g: g0, ok: false };
  if (g0.phase !== 'table' || !t) return no;
  if (n != null && n !== t.n) return no;
  const teacher = who === 'teacher';
  const asker = askerOf(g0);
  const g = clone(g0);
  const tt = g.turn;
  if (action === 'draw') {
    if (tt.step !== 'draw' || !(teacher || who === t.speaker) || !g.deck.length) return no;
    tt.card = g.deck.shift();
    tt.step = 'front';
    tt.drawnAt = Date.now();
  } else if (action === 'flip') {
    if (tt.step !== 'front' || !(teacher || who === t.speaker)) return no;
    tt.step = 'back';
  } else if (action === 'said') {
    if (tt.step !== 'back' || !(teacher || who === t.speaker)) return no;
    g.lastSaid = { n: tt.n, card: tt.card, token: tt.speaker, at: Date.now() }; // the card settles by the seat
    if (asker) {
      tt.step = 'ask';
      tt.asker = asker; // fixed now, even if someone joins meanwhile
      tt.fu = pick(followups, Math.min(FOLLOWUPS_SHOWN, followups.length));
    } else finishTurn(g); // only one student: no follow-up
  } else if (action === 'asked') {
    if (tt.step !== 'ask' || !(teacher || who === tt.asker)) return no;
    finishTurn(g);
  } else return no;
  return { g, ok: true };
}

/**
 * The teacher skips the turn. Before the answer, no card is used: a drawn card goes to the bottom of the deck.
 * During the follow-up, skipping just ends the follow-up (the answer counts).
 */
export function skip(g0) {
  if (g0.phase !== 'table' || !g0.turn) return g0;
  const g = clone(g0);
  const t = g.turn;
  if (t.step === 'ask') {
    finishTurn(g);
    return g;
  }
  if (t.card) g.deck.push(t.card);
  beginTurn(g, nextAfter(g, t.speaker));
  return g;
}

/** Every card has been used: shuffle the day's answered cards back into the deck. */
export function reshuffle(g0) {
  const used = [...new Set(g0.turns.map((x) => x.card))].filter((id) => id !== g0.turn?.card && !g0.deck.includes(id));
  if (!used.length) return g0;
  const g = clone(g0);
  g.deck = [...g.deck, ...shuffle(used)];
  return g;
}

export function removePlayer(g0, token) {
  if (!g0.players[token]) return g0;
  const g = clone(g0);
  const t = g.turn;
  const idx = g.order.indexOf(token);
  delete g.players[token];
  g.order.splice(idx, 1);
  if (t && t.speaker === token) {
    if (t.card && t.step !== 'ask') g.deck.unshift(t.card); // unused: back on top
    if (t.step === 'ask' && t.card) {
      // they answered: keep it on the record
      g.turns.push({
        n: t.n,
        token,
        name: g0.players[token].name,
        emblem: g0.players[token].emblem,
        test: g0.players[token].test,
        card: t.card,
        at: Date.now(),
      });
    }
    beginTurn(g, g.order.length ? g.order[idx % g.order.length] : null);
  } else if (t && t.asker === token) {
    t.asker = null; // the follow-up is dropped; the answer counts
    finishTurn(g);
  }
  return g;
}

export const toWall = (g0) => ({ ...clone(g0), phase: 'wall' });
export const backToTable = (g0) => ({ ...clone(g0), phase: g0.order.length || g0.turns.length ? 'table' : 'lobby' });

/** Answered cards per seat (shown face down by each seat; no numbers). */
export function stackOf(g, token) {
  return g.turns.filter((x) => x.token === token).length;
}

/** The questions the class answered today (not the test player), each once, in the order answered. */
export function wallCards(g) {
  const seen = new Set();
  const out = [];
  for (const x of g.turns) if (!x.test && !seen.has(x.card)) (seen.add(x.card), out.push(x.card));
  return out;
}
