// Quick checks of the game rules: run with `npx vite-node scripts/check-game.mjs`
globalThis.window = { dispatchEvent() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.CustomEvent = class {};

const { join, play, goQuestion, newGame, validName, removePlayer, wallCards, MAX_PLAYERS } = await import('../src/lib/game.js');
const { dayPlan, ALL_CARDS, DAYS } = await import('../src/lib/content.js');

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) fails++;
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
};

// content
ok(Object.keys(ALL_CARDS).length === 100, '100 cards in total (40 shared + 60 daily)');
for (const d of DAYS) {
  const p = dayPlan(d.n, {});
  ok(p.pool.length === 52 && p.questions.length === 8, `day ${d.n}: 52 cards, 8 questions`);
}
ok(Object.values(ALL_CARDS).every((c) => c.s >= 1 && c.s <= 5 && ['opinion', 'agree', 'ask', 'compare'].includes(c.f)), 'every card has 1–5 stars and a known function');

// names
ok(validName('سارة') && validName('عبد الله') && validName('سَارَة'), 'Arabic names accepted (with spaces and harakat)');
ok(!validName('Sara') && !validName('س') && !validName('سارة1') && !validName('   '), 'English, one-letter, digits and blank names refused');

// joining
const plan = dayPlan(1, {});
let g = newGame(1, plan.pool, '1234');
let r = join(g, 'a', 'سارة');
g = r.g;
ok(!r.error && g.players.a.hand.length === 5, 'first player gets 5 cards');
r = join(g, 'b', 'سارة');
ok(r.error === 'taken', 'same name refused (taken)');
r = join(g, 'a', 'سارة');
ok(r.g === g, 'same token rejoins with the same state');
for (let i = 0; i < MAX_PLAYERS - 1; i++) g = join(g, 'p' + i, 'لاعب ' + 'أبتثجح'[i]).g;
ok(Object.keys(g.players).length === MAX_PLAYERS, `${MAX_PLAYERS} players fit`);
r = join(g, 'x', 'زائد');
ok(r.error === 'full', 'a 7th player is refused (full)');
const fnCounts = Object.values(g.players).map((p) => {
  const c = {};
  p.hand.forEach((id) => (c[ALL_CARDS[id].f] = (c[ALL_CARDS[id].f] || 0) + 1));
  return Math.max(...Object.values(c));
});
ok(fnCounts.every((m) => m <= 3), 'starting hands mix the four functions (no more than 3 of one)');

// playing
ok(play(g, 'a', g.players.a.hand[0]).ok === false, 'no playing in the lobby');
g = goQuestion(g, 0, 8);
const first = g.players.a.hand[0];
r = play(g, 'a', first);
ok(r.ok && !r.g.players.a.hand.includes(first) && r.g.players.a.hand.length === 5, 'playing a card replaces it (hand stays at 5)');
ok(play(r.g, 'a', first).ok === false, 'cannot play a card you no longer hold');
g = r.g;

// many plays: the deck reshuffles and no card is ever in two places
for (let i = 0; i < 300; i++) {
  const tk = Object.keys(g.players)[i % 6];
  g = play(g, tk, g.players[tk].hand[i % 5]).g;
}
const inHands = Object.values(g.players).flatMap((p) => p.hand);
const all = [...inHands, ...g.deck, ...g.discard];
ok(all.length === 52 && new Set(all).size === 52, 'after 300 plays all 52 cards are accounted for, none duplicated');
ok(Object.values(g.players).every((p) => p.hand.length === 5), 'every hand still has 5 cards');
ok(wallCards(g).length > 0 && new Set(wallCards(g)).size === wallCards(g).length, 'wall shows each played card once');

// test player plays don't reach the wall
let g2 = goQuestion(join(newGame(2, dayPlan(2, {}).pool, '9999'), 't', 'المعلم', true).g, 0, 8);
g2 = play(g2, 't', g2.players.t.hand[0]).g;
ok(wallCards(g2).length === 0, 'test player plays are left off the wall');

// removing a player returns their cards
g = removePlayer(g, 'a');
const all2 = [...Object.values(g.players).flatMap((p) => p.hand), ...g.deck, ...g.discard];
ok(all2.length === 52 && !g.players.a, 'removing a player returns their cards to the deck');

// customisation
const c = { sharedHidden: ['s0'], days: { 1: { qHidden: [7], qOrder: [1, 0, 2, 3, 4, 5, 6, 7], cardsHidden: ['d1-0'] } } };
const p1 = dayPlan(1, c);
ok(p1.questions.length === 7 && p1.questions[0].i === 1 && !p1.pool.includes('s0') && !p1.pool.includes('d1-0'), 'hidden questions/cards and new order are applied');

console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll checks passed.');
process.exit(fails ? 1 : 0);
