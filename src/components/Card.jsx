import { ALL_CARDS, FUNCTIONS } from '../lib/content.js';

export function Stars({ n, className = '' }) {
  return (
    <span className={'stars ' + className} aria-label={`${n} / 5`}>
      {'★'.repeat(n)}
      <span className="off">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

/** A starter card: type label, star rating and the starter with full harakat. */
export default function Card({ id, size = 'md', className = '', children, ...rest }) {
  const c = ALL_CARDS[id];
  if (!c) return null;
  return (
    <div className={`card ${size} ${className}`} {...rest}>
      <div className="card-top">
        <span className={'card-type f-' + c.f}>{FUNCTIONS[c.f]}</span>
        <Stars n={c.s} />
      </div>
      <div className="card-text">{c.t}</div>
      {children}
    </div>
  );
}
