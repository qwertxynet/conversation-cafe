import week from '../data/week.json';
import cardData from '../data/cards.json';

export const WEEK = week;
export const DAYS = week.days;
export const FOLLOWUPS = cardData.followups;

// Every question card gets a stable id "d<day>-<index>" (index = its number in the approved document, from 0).
export const CARDS = {};
for (const [n, list] of Object.entries(cardData.days)) {
  list.forEach((c, i) => (CARDS[`d${n}-${i}`] = { ...c, id: `d${n}-${i}`, day: +n, i }));
}

export const dayById = (n) => week.days.find((d) => d.n === n);

/** The default draw order for a day: easy to hard (by stars), keeping the document order within the same stars. */
export function defaultOrder(n) {
  return Object.values(CARDS)
    .filter((c) => c.day === n)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((c) => c.id);
}

/**
 * The day as you have customised it in the Edit tab.
 * custom = { days: { [n]: { order: [ids], hidden: [ids] } }, fuHidden: [indices] }
 * Returns the cards to draw (in order, hidden ones left out) and the follow-up starters still shown.
 */
export function dayPlan(n, custom = {}) {
  const day = dayById(n);
  if (!day) return null;
  const c = custom?.days?.[n] || {};
  const all = defaultOrder(n);
  const order = Array.isArray(c.order) && c.order.length === all.length && all.every((id) => c.order.includes(id)) ? c.order : all;
  const hidden = new Set(c.hidden || []);
  const fuHidden = new Set(custom?.fuHidden || []);
  return {
    day,
    order,
    hidden,
    cards: order.filter((id) => !hidden.has(id)),
    followups: FOLLOWUPS.map((t, i) => i).filter((i) => !fuHidden.has(i)),
  };
}

export const starString = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
