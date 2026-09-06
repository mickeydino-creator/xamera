import { useCallback, useEffect, useState } from 'react';
import type { Camera } from '../types/camera';

const STORAGE_KEY = 'watch-the-world:favorites';

function read(): Camera[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(favorites: Camera[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // ignore quota errors
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Camera[]>(() => read());

  useEffect(() => {
    write(favorites);
  }, [favorites]);

  const isFavorite = useCallback((id: string) => favorites.some((c) => c.id === id), [favorites]);

  const toggleFavorite = useCallback((camera: Camera) => {
    setFavorites((prev) =>
      prev.some((c) => c.id === camera.id)
        ? prev.filter((c) => c.id !== camera.id)
        : [...prev, camera]
    );
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
