import { Link } from 'react-router-dom';
import type { Camera } from '../types/camera';
import { CATEGORIES } from '../types/camera';

interface Props {
  camera: Camera;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function CameraPreviewCard({ camera, onClose, isFavorite, onToggleFavorite }: Props) {
  const categoryMeta = CATEGORIES.find((c) => c.key === camera.category);

  return (
    <div
      className="glass"
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 340,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.2s ease',
        zIndex: 40,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          zIndex: 2,
        }}
      >
        ×
      </button>
      <div style={{ position: 'relative', height: 170, background: '#111827' }}>
        {camera.thumbnail ? (
          <img
            src={camera.thumbnail}
            alt={camera.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            No preview
          </div>
        )}
        <span
          className="pill"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: camera.isLive ? 'rgba(51,224,123,0.15)' : 'rgba(107,114,128,0.25)',
            color: camera.isLive ? '#33e07b' : '#9aa4b6',
          }}
        >
          <span className={`status-dot ${camera.isLive ? 'live' : 'offline'}`} />
          {camera.isLive ? 'LIVE' : 'Offline'}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{camera.title}</h3>
          <button
            onClick={onToggleFavorite}
            title="Save to favorites"
            style={{ background: 'none', border: 'none', fontSize: 20, color: isFavorite ? '#ffb703' : 'var(--text-dim)' }}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
        <p style={{ margin: '4px 0 10px', color: 'var(--text-dim)', fontSize: 13 }}>
          {[camera.city, camera.country].filter(Boolean).join(', ')} {categoryMeta ? `· ${categoryMeta.emoji} ${categoryMeta.label}` : ''}
        </p>
        <Link
          to={`/camera/${camera.slug}`}
          className="pill"
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            padding: '10px 0',
            background: 'var(--accent)',
            color: '#0a0e14',
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          WATCH LIVE
        </Link>
      </div>
    </div>
  );
}
