/** مخطّط مجلس: الجلوس على الجوانب، صدر المجلس مقابل الباب، المضيف على يمين المدخل */
export default function Seating() {
  const guests = [];
  // الجانبان (يسار ويمين) والجدار العلوي
  for (let k = 0; k < 4; k++) guests.push([92, 120 + k * 62], [508, 120 + k * 62]);
  for (const x of [190, 250, 350, 410]) guests.push([x, 70]);
  return (
    <figure className="seating">
      <svg viewBox="0 0 600 440" role="img" aria-label="مخطّط المجلس">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className="s-arrowhead" />
          </marker>
        </defs>
        {/* الجدران مع فتحة الباب */}
        <path d="M250 400 H40 V30 H560 V400 H350" className="s-wall" />
        {/* المساند على الجوانب */}
        <rect x="56" y="88" width="34" height="270" rx="10" className="s-cushion" />
        <rect x="510" y="88" width="34" height="270" rx="10" className="s-cushion" />
        <rect x="140" y="44" width="320" height="30" rx="10" className="s-cushion" />
        {/* صدر المجلس */}
        <rect x="262" y="40" width="76" height="40" rx="12" className="s-sadr" />
        <circle cx="300" cy="70" r="17" className="s-elder" />
        <text x="300" y="112" className="s-label strong">صَدْرُ الْمَجْلِسِ</text>
        <text x="300" y="134" className="s-label small">كَبِيرُ الْمَجْلِسِ</text>
        {guests.map(([x, y], i) => (
          <circle key={i} cx={x === 92 ? 74 : x === 508 ? 526 : x} cy={y === 70 ? 60 : y} r="13" className="s-guest" />
        ))}
        <text x="140" y="236" className="s-label">الضُّيُوفُ</text>
        <text x="460" y="236" className="s-label">الضُّيُوفُ</text>
        {/* الوسط */}
        <text x="300" y="236" className="s-label faint">الْوَسَطُ فَارِغٌ</text>
        {/* الباب */}
        <text x="300" y="430" className="s-label strong">الْبَابُ</text>
        {/* المضيف على يمين المدخل (لمن يدخل) */}
        <circle cx="372" cy="372" r="16" className="s-host" />
        <text x="440" y="378" className="s-label">الْمُضِيفُ</text>
        {/* المقهوي عند الباب */}
        <circle cx="228" cy="372" r="14" className="s-server" />
        <text x="150" y="378" className="s-label">الْمُقَهْوِي</text>
        {/* اتجاه التحية: من اليمين */}
        <path d="M300 390 C 330 330, 430 330, 480 300" className="s-arrow" markerEnd="url(#arr)" />
        <text x="388" y="318" className="s-label small accent">التَّحِيَّةُ مِنَ الْيَمِينِ</text>
      </svg>
    </figure>
  );
}
