import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { fetchRandomCamera } from '../api/client';

export default function SurpriseMeButton() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { camera } = await fetchRandomCamera();
      navigate(`/camera/${camera.slug}`);
    } catch {
      // no cameras available yet - silently ignore, discovery is likely still warming up
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="pill"
      style={{
        padding: '14px 28px',
        borderRadius: 999,
        border: 'none',
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: 0.5,
        background: 'linear-gradient(135deg, var(--accent-2), var(--accent))',
        color: '#0a0e14',
        boxShadow: '0 8px 24px rgba(124,92,255,0.35)',
      }}
    >
      {loading ? 'Finding a camera...' : '🎲 SURPRISE ME'}
    </button>
  );
}
