import { CATEGORIES } from '../types/camera';

interface Props {
  active: string;
  onChange: (category: string) => void;
}

export default function CategoryFilters({ active, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '2px 2px 6px',
      }}
    >
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          className="pill glass"
          onClick={() => onChange(c.key)}
          style={{
            border: 'none',
            color: active === c.key ? '#0a0e14' : 'var(--text)',
            background: active === c.key ? 'var(--accent)' : undefined,
          }}
        >
          <span>{c.emoji}</span>
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}
