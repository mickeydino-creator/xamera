import { Link } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';

export default function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <Link to="/" className="pill glass" style={{ border: 'none', display: 'inline-flex', marginBottom: 20 }}>
        ← Back to map
      </Link>
      <h1>★ Your favorite cameras</h1>
      {favorites.length === 0 && <p style={{ color: 'var(--text-dim)' }}>You haven't saved any cameras yet.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {favorites.map((c) => (
          <div key={c.id} className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <Link to={`/camera/${c.slug}`}>
              <div style={{ height: 130, background: '#111827' }}>
                {c.thumbnail && <img src={c.thumbnail} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
            </Link>
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                {[c.city, c.country].filter(Boolean).join(', ')}
              </div>
              <button
                onClick={() => toggleFavorite(c)}
                className="pill"
                style={{ border: '1px solid var(--panel-border)', background: 'transparent', color: 'var(--text)' }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
