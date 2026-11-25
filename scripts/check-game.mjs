// Quick checks of the turn rules and the content: run with `npx vite-node scripts/check-game.mjs`
globalThis.window = { dispatchEvent() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.CustomEvent = class {};

const G = await import('../src/lib/game.js');
const { CARDS, DAYS, FOLLOWUPS, dayPlan, defaultOrder } = await import('../src/lib/content.js');
const { newGame, join, start, act, skip, reshuffle, removePlayer, askerOf, untilTurn, wallCards, stackOf, validName, MAX_PLAYERS } = G;

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) fails++;
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
};

// ───── content ─────
ok(Object.keys(CARDS).length === 80, '80 question cards (16 per day)');
ok(FOLLOWUPS.length >= 8, `${FOLLOWUPS.length} follow-up starters`);
const HARAKA = /[ً-ْ]/;
ok(
  Object.values(CARDS).every((c) => c.q && c.a && c.s >= 1 && c.s <= 5 && HARAKA.test(c.q) && !('f1' in c) && !('f3' in c)),
  'every card has a vowelled question, a model answer and 1–5 stars, and no answer frames',
);
for (const d of DAYS) {
  const order = defaultOrder(d.n);
  const stars = order.map((id) => CARDS[id].s);
  ok(order.length === 16 && stars.every((s, i) => i === 0 || stars[i - 1] <= s), `day ${d.n}: 16 cards, drawn easy to hard`);
}
const plan1 = dayPlan(1, { days: { 1: { hidden: ['d1-0'] } }, fuHidden: [0, 1] });
ok(plan1.cards.length === 15 && !plan1.cards.includes('d1-0') && !plan1.followups.includes(0), 'hidden cards and follow-ups are left out');
const rev = [...defaultOrder(2)].reverse();
ok(dayPlan(2, { days: { 2: { order: rev } } }).cards[0] === rev[0], 'your card order is used');
ok(dayPlan(2, { days: { 2: { order: ['d2-0'] } } }).cards.length === 16, 'a broken saved order falls back to easy to hard');

// ───── names and joining ─────
ok(validName('سارة') && validName('عبد الله') && validName('سَارَة'), 'Arabic names accepted (with spaces and harakat)');
ok(!validName('Sara') && !validName('س') && !validName('سارة1'), 'English, one-letter and digit names refused');
const plan = dayPlan(1, {});
const FU = plan.followups;
let g = newGame(1, plan.cards, '1234');
let r = join(g, 'a', 'سارة', 'cup');
g = r.g;
ok(!r.error && g.order[0] === 'a', 'first student takes seat 1');
ok(join(g, 'b', 'سارة', 'book').error === 'taken', 'same nickname refused');
ok(join(g, 'b', 'خالد', 'cup').error === 'emblem-taken', 'same emblem refused');
ok(join(g, 'b', 'خالد', 'banana').error === 'emblem', 'unknown emblem refused');
ok(join(g, 'a', 'سارة', 'cup').g === g, 'same token rejoins with the same seat');
g = join(g, 'b', 'خالد', 'book').g;
g = join(g, 'c', 'ليلى', 'lantern').g;
g = join(g, 'd', 'عمر', 'palm').g;
ok(start(newGame(1, plan.cards, '1')).phase === 'lobby', 'cannot start with nobody seated');

// ───── a turn ─────
g = start(g);
ok(g.phase === 'table' && g.turn.speaker === 'a' && g.turn.step === 'draw', 'first joiner has the first turn');
ok(askerOf(g) === 'b', 'the next seat asks the follow-up');
ok(untilTurn(g, 'a') === 0 && untilTurn(g, 'b') === 1 && untilTurn(g, 'd') === 3, '"your turn in N" counts seats');
ok(!act(g, 'b', 'draw', null, FU).ok, 'only the speaker (or teacher) can draw');
ok(!act(g, 'a', 'said', null, FU).ok, 'cannot answer before drawing');
r = act(g, 'a', 'draw', g.turn.n, FU);
ok(r.ok && r.g.turn.card === plan.cards[0] && r.g.deck.length === 15, 'drawing takes the top card');
g = r.g;
ok(!act(g, 'a', 'flip', null, FU).ok, 'there is no flip step any more');
ok(!act(g, 'a', 'draw', g.turn.n, FU).ok, 'a double tap does not draw twice');
g = act(g, 'a', 'said', null, FU).g;
ok(
  g.turn.step === 'ask' && g.turn.asker === 'b' && g.turn.fu.length === 3 && g.turn.fu.every((i) => FU.includes(i)),
  'after the answer, the asker gets 3 follow-up starters',
);
ok(!act(g, 'c', 'asked', null, FU).ok, 'only the asker (or teacher) can confirm the follow-up');
const stale = g.turn.n;
g = act(g, 'b', 'asked', null, FU).g;
ok(g.turn.speaker === 'b' && g.turn.step === 'draw' && g.turns.length === 1, "the asker's own turn starts");
ok(!act(g, 'b', 'draw', stale, FU).ok, 'a tap from the old turn is ignored');
ok(stackOf(g, 'a') === 1, "the answered card stays by the speaker's seat");

// ───── teacher, skip, late joiner, removal ─────
g = act(g, 'teacher', 'draw', null, FU).g;
const drawn = g.turn.card;
g = skip(g);
ok(g.turn.speaker === 'c' && g.deck[g.deck.length - 1] === drawn && g.turns.length === 1, 'skip passes the turn; the drawn card goes to the bottom, unused');
g = join(g, 'e', 'نور', 'pen').g;
ok(g.order[4] === 'e', 'a late joiner sits at the end');
for (const s of ['draw', 'said']) g = act(g, 'teacher', s, null, FU).g;
ok(g.turn.asker === 'd', 'teacher can run every step');
g = removePlayer(g, 'd');
ok(g.turn.speaker === 'e' && g.turns.length === 2, 'removing the asker keeps the answer and passes the turn on');
g = act(g, 'e', 'draw', null, FU).g;
const eCard = g.turn.card;
g = removePlayer(g, 'e');
ok(g.turn.speaker === 'a' && g.deck[0] === eCard, 'removing the speaker returns the unused card and seats the next student');

// ───── one student, running out, wall ─────
let s = start(join(newGame(3, dayPlan(3, {}).cards, '2222'), 'x', 'منى', 'key').g);
for (let i = 0; i < 16; i++) for (const st of ['draw', 'said']) s = act(s, 'x', st, null, FU).g;
ok(s.turns.length === 16 && s.turn.speaker === 'x' && s.turn.step === 'draw', 'one student: no follow-up, 16 turns in a row');
ok(!act(s, 'x', 'draw', null, FU).ok, 'no drawing when all 16 cards are used');
s = reshuffle(s);
ok(s.deck.length === 16 && new Set(s.deck).size === 16, 'reshuffle puts the answered cards back');
ok(wallCards(s).length === 16, 'the wall shows each answered question once');
let tst = start(join(newGame(4, dayPlan(4, {}).cards, '3333'), 't', 'المعلم', 'star', true).g);
for (const st of ['draw', 'said']) tst = act(tst, 't', st, null, FU).g;
ok(tst.turns.length === 1 && wallCards(tst).length === 0, 'test player turns are left off the wall');

// ───── full table ─────
let f = newGame(5, dayPlan(5, {}).cards, '4444');
['cup', 'book', 'lantern', 'palm', 'pen', 'dallah'].forEach((e, i) => (f = join(f, 'p' + i, 'لاعب ' + 'أبتثجح'[i], e).g));
ok(f.order.length === MAX_PLAYERS && join(f, 'z', 'زائد', 'key').error === 'full', `${MAX_PLAYERS} seats; a 7th student is refused`);

console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll checks passed.');
process.exit(fails ? 1 : 0);
