// Student emblems, drawn in code (no image files): each is a brass-rimmed medallion with a line drawing.
export const EMBLEM_AR = {
  cup: 'فِنْجَان',
  book: 'كِتَاب',
  lantern: 'فَانُوس',
  palm: 'نَخْلَة',
  pen: 'قَلَم',
  dallah: 'دَلَّة',
  key: 'مِفْتَاح',
  star: 'نَجْمَة',
};
export const EMBLEM_EN = { cup: 'cup', book: 'book', lantern: 'lantern', palm: 'palm', pen: 'pen', dallah: 'coffee pot', key: 'key', star: 'star' };

const COLORS = {
  cup: '#7d2a24',
  book: '#2f4a3a',
  lantern: '#23476b',
  palm: '#55652a',
  pen: '#5b2f4f',
  dallah: '#1f5754',
  key: '#7a5414',
  star: '#3b3a6e',
};

const ICONS = {
  cup: (
    <>
      <path d="M13 19h22l-2.6 12.5a5 5 0 0 1-4.9 4H20.5a5 5 0 0 1-4.9-4z" />
      <path d="M9 39.5h30" />
      <path d="M20 14c-2-2.5 2-4.5 0-8M28 14c-2-2.5 2-4.5 0-8" />
    </>
  ),
  book: (
    <>
      <path d="M24 14c-5-4-12-4-16-2v24c4-2 11-2 16 2 5-4 12-4 16-2V12c-4-2-11-2-16 2z" />
      <path d="M24 14v24" />
      <path d="M12 18c3-1 6-1 8 0M12 23c3-1 6-1 8 0M28 18c2-1 5-1 8 0M28 23c2-1 5-1 8 0" />
    </>
  ),
  lantern: (
    <>
      <circle cx="24" cy="6.5" r="2.5" />
      <path d="M19 13h10l-2-4h-6z" />
      <path d="M17 13h14l3 6v12l-3 6H17l-3-6V19z" />
      <path d="M24 19v12M14 25h20" />
      <path d="M19 41h10" />
    </>
  ),
  palm: (
    <>
      <path d="M24 43c1.2-8 1.2-15 0-23" />
      <path d="M24 20c-6-6-13-5-17-1M24 20c6-6 13-5 17-1M24 20c-4-8-8-11-13-11M24 20c4-8 8-11 13-11M24 20c-1-6 0-11 0-15" />
      <path d="M14 43h20" />
    </>
  ),
  pen: (
    <>
      <path d="M15 33 35 13l4 4-20 20z" />
      <path d="M15 33l-5 9 9-5" />
      <path d="M31 17l4 4" />
    </>
  ),
  dallah: (
    <>
      <path d="M24 4v4" />
      <path d="M19 12c2-4 8-4 10 0" />
      <path d="M19 12v5M29 12v5" />
      <path d="M19 17c-6 5-6 16-3 23h16c3-7 3-18-3-23z" />
      <path d="M17.5 24C11 22 9 16 5 12.5" />
      <path d="M31 20c9 0 9 14 1 16" />
      <path d="M14 40h20" />
    </>
  ),
  key: (
    <>
      <circle cx="15" cy="24" r="7.5" />
      <circle cx="15" cy="24" r="2.5" />
      <path d="M22.5 24H42M36 24v6M41 24v5" />
    </>
  ),
  star: (
    <>
      <path d="M14 14h20v20H14z" />
      <path d="M24 9.9 38.1 24 24 38.1 9.9 24z" />
      <circle cx="24" cy="24" r="3.5" />
    </>
  ),
};

export default function Emblem({ kind, className = '', label }) {
  if (!ICONS[kind]) return null;
  return (
    <span
      className={'emb ' + className}
      style={{ '--emb': COLORS[kind] }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 48 48">{ICONS[kind]}</svg>
    </span>
  );
}
