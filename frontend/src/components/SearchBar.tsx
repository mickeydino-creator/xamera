import { useState } from 'react';
import type { Camera } from '../types/camera';
import { searchCameras } from '../api/client';

interface Props {
  onSelect: (camera: Camera) => void;
}

export default function SearchBar({ onSelect }: Props) {
  const [value, setValue] = useState('');
  const [results, setResults] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function runSearch(q: string) {
    setValue(q);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const { cameras } = await searchCameras(q.trim());
      setResults(cameras.slice(0, 20));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
      <input
        value={value}
        onChange={(e) => runSearch(e.target.value)}
        onFocus={() => value.length >= 2 && setOpen(true)}
        placeholder="Search cities, countries, landmarks, beaches, airports..."
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 999,
          border: '1px solid var(--panel-border)',
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text)',
          fontSize: 14,
          outline: 'none',
        }}
      />
      {open && (
        <div
          className="glass"
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            right: 0,
            borderRadius: 16,
            maxHeight: 360,
            overflowY: 'auto',
            zIndex: 50,
            animation: 'fadeInUp 0.15s ease',
          }}
        >
          {loading && <div style={{ padding: 16, color: 'var(--text-dim)' }}>Searching...</div>}
          {!loading && results.length === 0 && (
            <div style={{ padding: 16, color: 'var(--text-dim)' }}>No cameras found yet.</div>
          )}
          {!loading &&
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  textAlign: 'left',
                }}
              >
                <span className={`status-dot ${c.isLive ? 'live' : 'offline'}`} />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {c.city ? `${c.city}, ` : ''}
                    {c.country}
                  </div>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
