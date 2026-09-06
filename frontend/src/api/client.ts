import type { Camera } from '../types/camera';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface ViewportParams {
  bbox: [number, number, number, number]; // minLon, minLat, maxLon, maxLat
  category?: string;
  limit?: number;
}

export function fetchViewportCameras(params: ViewportParams): Promise<{ cameras: Camera[]; count: number }> {
  const q = new URLSearchParams({
    bbox: params.bbox.join(','),
    ...(params.category ? { category: params.category } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
  });
  return getJson(`/cameras/viewport?${q.toString()}`);
}

export function searchCameras(query: string): Promise<{ cameras: Camera[]; count: number }> {
  return getJson(`/cameras/search?q=${encodeURIComponent(query)}`);
}

export function fetchRandomCamera(category?: string): Promise<{ camera: Camera }> {
  const q = category && category !== 'all' ? `?category=${category}` : '';
  return getJson(`/cameras/random${q}`);
}

export function fetchCameraBySlug(slug: string): Promise<{ camera: Camera; nearby: Camera[] }> {
  return getJson(`/cameras/${encodeURIComponent(slug)}`);
}

export function fetchStats(): Promise<{ total: number }> {
  return getJson(`/cameras/stats`);
}

export interface WeatherInfo {
  available: boolean;
  tempC?: number;
  condition?: string;
  description?: string;
  icon?: string;
}

export function fetchWeather(lat: number, lon: number): Promise<WeatherInfo> {
  return getJson(`/weather?lat=${lat}&lon=${lon}`);
}
