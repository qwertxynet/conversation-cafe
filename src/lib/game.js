// Pure game logic. The game object lives on the teacher's laptop (saved in localStorage as "game").
import { ALL_CARDS } from './content.js';
import { shuffle } from './store.js';

export const HAND = 5;
export const MAX_PLAYERS = 6;

// Arabic letters (with harakat) and spaces only, 2–16 characters
const NAME_RE = /^[ء-يً-ْٰٱ-ۓـ ]{2,16}$/;
export const validName = (name) => NAME_RE.test((name || '').trim()) && /[ء-ي]/.test(name);
export const cleanName = (name) => (name || '').trim().replace(/\s+/g, ' ');

export const newPin = () => String(1000 + Math.floor(Math.random() * 9000));

export function newGame(day, pool, pin) {
  return {
    v: 1,
    pin,
    day,
    phase: 'lobby', // lobby | question | wall
    q: 0,
    qAt: null,
    reached: 0, // furthest question index shown
    players: {}, // token -> { name, hand: [ids], test, joinedAt }
    deck: shuffle(pool),
    discard: [],
    plays: [], // { id, token, name, test, at, q }
    started: Date.now(),
  };
}

const fnOf = (id) => ALL_CARDS[id]?.f;

/** Take one card from the deck, preferring a function the hand has fewer than two of. Refills from the discard pile. */
function drawOne(g, hand) {
  if (!g.deck.length && g.discard.length) {
    g.deck = shuffle(g.discard);
    g.discard = [];
  }
  if (!g.deck.length) return null;
  const counts = {};
  hand.forEach((id) => (counts[fnOf(id)] = (counts[fnOf(id)] || 0) + 1));
  const look = Math.min(8, g.deck.length);
  let k = 0;
  for (let i = 0; i < look; i++) {
    if ((counts[fnOf(g.deck[i])] || 0) < 2) {
      k = i;
      break;
    }
  }
  return g.deck.splice(k, 1)[0];
}

const clone = (g) => JSON.parse(JSON.stringify(g));

/** Add a player (or return the existing one). Returns { g, error } */
export function join(g0, token, rawName, test = false) {
  if (g0.players[token]) return { g: g0 }; // rejoining: same player, same hand
  const g = clone(g0);
  const name = cleanName(rawName);
  if (!validName(name)) return { g: g0, error: 'name' };
  if (Object.values(g.players).some((p) => p.name === name)) return { g: g0, error: 'taken' };
  if (Object.keys(g.players).length >= MAX_PLAYERS) return { g: g0, error: 'full' };
  const hand = [];
  for (let i = 0; i < HAND; i++) {
    const c = drawOne(g, hand);
    if (c) hand.push(c);
  }
  g.players[token] = { name, hand, test: !!test, joinedAt: Date.now() };
  return { g };
}

/** A player used a card: it goes to the discard pile, the play is recorded and a new card is drawn. */
export function play(g0, token, id) {
  const p = g0.players[token];
  if (!p || g0.phase !== 'question' || !p.hand.includes(id)) return { g: g0, ok: false };
  const g = clone(g0);
  const me = g.players[token];
  me.hand = me.hand.filter((x) => x !== id);
  g.discard.push(id);
  const n = drawOne(g, me.hand);
  if (n) me.hand.push(n);
  g.plays.push({ id, token, name: me.name, test: me.test, at: Date.now(), q: g.q });
  return { g, ok: true };
}

export function goQuestion(g0, i, count) {
  const g = clone(g0);
  g.phase = 'question';
  g.q = Math.max(0, Math.min(count - 1, i));
  g.qAt = Date.now();
  g.reached = Math.max(g.reached || 0, g.q);
  return g;
}

export function toWall(g0) {
  return { ...clone(g0), phase: 'wall' };
}

export function removePlayer(g0, token) {
  const g = clone(g0);
  const p = g.players[token];
  if (!p) return g0;
  g.deck.push(...p.hand);
  g.deck = shuffle(g.deck);
  delete g.players[token];
  return g;
}

/** Cards the class played today (not the test player), each card once, in the order first played. */
export function wallCards(g) {
  const seen = new Set();
  const out = [];
  for (const p of g.plays) if (!p.test && !seen.has(p.id)) seen.add(p.id), out.push(p.id);
  return out;
}
