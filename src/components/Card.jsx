import { CARDS } from '../lib/content.js';

export function Stars({ n, className = '' }) {
  return (
    <span className={'stars ' + className} aria-label={`${n} / 5`}>
      {'★'.repeat(n)}
      <span className="off">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

/**
 * A question card with real thickness, drawn in 3D.
 * Front: the day's title, stars and the question. Back: only the star-panel art (students answer in their own words).
 * `id` is a card id (or pass `card` = { q, s }).
 */
export default function Card3D({ id, card: c0, title, flipped = false, size = 'md', footer, className = '', onClick, style }) {
  const c = c0 || CARDS[id];
  if (!c) return null;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`c3 ${size} ${flipped ? 'flipped' : ''} ${className}`}
      onClick={onClick}
      style={style}
      dir="rtl"
      lang="ar"
      type={onClick ? 'button' : undefined}
    >
      <span className="c3-in">
        <span className="c3-face c3-front" aria-hidden={flipped}>
          <span className="c3-top">
            <span className="c3-title">{title}</span>
            <Stars n={c.s} />
          </span>
          <span className="c3-q">{c.q}</span>
          {footer && <span className="c3-foot">{footer}</span>}
        </span>
        <span className="c3-face c3-back" aria-hidden="true" />
        <span className="c3-edge l" />
        <span className="c3-edge r" />
      </span>
    </Tag>
  );
}

/** A card lying face down: the Bourgoin star-panel back. */
export function CardBack({ className = '', style }) {
  return <span className={'cb ' + className} style={style} />;
}
