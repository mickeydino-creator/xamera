import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MapView from '../components/MapView';
import SearchBar from '../components/SearchBar';
import CategoryFilters from '../components/CategoryFilters';
import SurpriseMeButton from '../components/SurpriseMeButton';
import CameraPreviewCard from '../components/CameraPreviewCard';
import { fetchViewportCameras, fetchStats } from '../api/client';
import { useFavorites } from '../hooks/useFavorites';
import type { Camera } from '../types/camera';

export default function MapPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Camera | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const lastBBox = useRef<[number, number, number, number] | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  const loadViewport = useCallback(
    async (bbox: [number, number, number, number]) => {
      lastBBox.current = bbox;
      try {
        const { cameras: result } = await fetchViewportCameras({
          bbox,
          category: category !== 'all' ? category : undefined,
          limit: 800,
        });
        setCameras(result);
      } catch {
        // network hiccup - keep showing previous markers
      }
    },
    [category]
  );

  useEffect(() => {
    if (lastBBox.current) loadViewport(lastBBox.current);
  }, [category, loadViewport]);

  useEffect(() => {
    fetchStats()
      .then((s) => setTotal(s.total))
      .catch(() => setTotal(null));
  }, []);

  function handleSelectCameraId(id: string) {
    const cam = cameras.find((c) => c.id === id);
    if (cam) setSelected(cam);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <MapView cameras={cameras} onMoveEnd={loadViewport} onSelectCamera={handleSelectCameraId} />

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, pointerEvents: 'auto' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            🌍 WATCH THE WORLD
          </h1>
          <SearchBar onSelect={setSelected} />
          <Link to="/favorites" className="pill glass" style={{ border: 'none' }}>
            ★ Favorites
          </Link>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <CategoryFilters active={category} onChange={setCategory} />
        </div>
      </div>

      {total !== null && (
        <div
          className="glass pill"
          style={{ position: 'absolute', top: 130, right: 20, zIndex: 20 }}
        >
          {total.toLocaleString()} cameras discovered
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 28, right: 28, zIndex: 30 }}>
        <SurpriseMeButton />
      </div>

      {selected && (
        <CameraPreviewCard
          camera={selected}
          onClose={() => setSelected(null)}
          isFavorite={isFavorite(selected.id)}
          onToggleFavorite={() => toggleFavorite(selected)}
        />
      )}
    </div>
  );
}
