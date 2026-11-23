import week from '../data/week.json';

export const WEEK = week;
export const FUNCTIONS = week.functions;
export const DAYS = week.days;

// Every card gets a stable id: shared cards "s0".."s39", daily cards "d1-0".."d5-11".
export const ALL_CARDS = {};
week.shared.forEach((c, i) => (ALL_CARDS['s' + i] = { ...c, id: 's' + i, daily: false }));
week.days.forEach((d) => d.cards.forEach((c, i) => (ALL_CARDS[`d${d.n}-${i}`] = { ...c, id: `d${d.n}-${i}`, daily: d.n })));

export const dayById = (n) => week.days.find((d) => d.n === n);

/**
 * The day as you have customised it:
 * questions in your order without hidden ones, and the card pool (shared + daily) without hidden cards.
 * custom = { sharedHidden: [ids], days: { [n]: { qOrder: [i], qHidden: [i], cardsHidden: [ids] } } }
 */
export function dayPlan(n, custom = {}) {
  const d = dayById(n);
  if (!d) return null;
  const c = custom?.days?.[n] || {};
  const order = c.qOrder && c.qOrder.length === d.questions.length ? c.qOrder : d.questions.map((_, i) => i);
  const qHidden = new Set(c.qHidden || []);
  const questions = order.filter((i) => !qHidden.has(i)).map((i) => ({ ...d.questions[i], i }));
  const hidden = new Set([...(custom?.sharedHidden || []), ...(c.cardsHidden || [])]);
  const pool = Object.values(ALL_CARDS)
    .filter((card) => (card.daily === false || card.daily === n) && !hidden.has(card.id))
    .map((card) => card.id);
  return { day: d, questions, pool };
}

export const STAR_FULL = '★';
export const STAR_EMPTY = '☆';
export const starString = (n) => STAR_FULL.repeat(n) + STAR_EMPTY.repeat(5 - n);
