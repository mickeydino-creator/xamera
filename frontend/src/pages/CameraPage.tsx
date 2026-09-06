import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCameraBySlug, fetchWeather, type WeatherInfo } from '../api/client';
import { useFavorites } from '../hooks/useFavorites';
import { CATEGORIES, type Camera } from '../types/camera';

function useLocalTime(timezone?: string) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now);
  } catch {
    return null;
  }
}

function flagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export default function CameraPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [nearby, setNearby] = useState<Camera[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetchCameraBySlug(slug)
      .then(({ camera, nearby }) => {
        setCamera(camera);
        setNearby(nearby);
        fetchWeather(camera.latitude, camera.longitude)
          .then(setWeather)
          .catch(() => setWeather(null));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const localTime = useLocalTime(camera?.timezone);
  const categoryMeta = CATEGORIES.find((c) => c.key === camera?.category);

  if (loading) {
    return <CenteredMessage text="Loading camera..." />;
  }
  if (notFound || !camera) {
    return <CenteredMessage text="Camera not found." />;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 24px 60px' }}>
      <button
        onClick={() => navigate('/')}
        className="pill glass"
        style={{ border: 'none', marginBottom: 20 }}
      >
        ← Back to map
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
        <div>
          <div
            className="glass"
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              aspectRatio: '16 / 9',
              background: '#111827',
            }}
          >
            {camera.streamUrl ? (
              <iframe
                src={camera.streamUrl}
                title={camera.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen"
              />
            ) : camera.thumbnail ? (
              <img src={camera.thumbnail} alt={camera.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <CenteredMessage text="Stream unavailable" />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26 }}>{camera.title}</h1>
              <p style={{ color: 'var(--text-dim)', margin: '6px 0 0' }}>
                {flagEmoji(camera.countryCode)} {[camera.city, camera.country].filter(Boolean).join(', ')}
              </p>
            </div>
            <button
              onClick={() => toggleFavorite(camera)}
              className="pill glass"
              style={{ border: 'none', fontSize: 18, color: isFavorite(camera.id) ? '#ffb703' : 'var(--text)' }}
            >
              {isFavorite(camera.id) ? '★ Saved' : '☆ Save'}
            </button>
          </div>

          <h3 style={{ marginTop: 32 }}>Explore nearby cameras</h3>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
            {nearby.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No nearby cameras found yet.</p>}
            {nearby.map((n) => (
              <Link
                key={n.id}
                to={`/camera/${n.slug}`}
                className="glass"
                style={{ minWidth: 180, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}
              >
                <div style={{ height: 100, background: '#111827' }}>
                  {n.thumbnail && (
                    <img src={n.thumbnail} alt={n.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{n.city}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: 20, height: 'fit-content' }}>
          <InfoRow label="Status">
            <span className={`status-dot ${camera.isLive ? 'live' : 'offline'}`} /> {camera.isLive ? 'Live' : 'Offline'}
          </InfoRow>
          <InfoRow label="Category">{categoryMeta ? `${categoryMeta.emoji} ${categoryMeta.label}` : camera.category}</InfoRow>
          <InfoRow label="Local time">{localTime ?? '—'}</InfoRow>
          <InfoRow label="Weather">
            {weather?.available ? `${Math.round(weather.tempC ?? 0)}°C, ${weather.description}` : 'Not available'}
          </InfoRow>
          <InfoRow label="Source">{camera.source}</InfoRow>
          <InfoRow label="Last checked">{new Date(camera.lastChecked).toLocaleString()}</InfoRow>
          <a href={camera.sourceUrl} target="_blank" rel="noreferrer" className="pill" style={{ display: 'inline-block', marginTop: 8, color: 'var(--accent)' }}>
            View on source site ↗
          </a>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 14 }}>{children}</div>
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: 'var(--text-dim)' }}>
      {text}
    </div>
  );
}
