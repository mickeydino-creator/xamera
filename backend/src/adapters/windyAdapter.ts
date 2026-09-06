import { config } from '../config.js';
import type { BBox, Camera, CameraCategory } from '../types/camera.js';
import { slugify } from '../utils/geo.js';
import type { WebcamSourceAdapter } from './types.js';

const API_BASE = 'https://api.windy.com/api/webcams/v3';

// Maps Windy's own category codes to our normalized CameraCategory.
const CATEGORY_MAP: Record<string, CameraCategory> = {
  city: 'city',
  beach: 'beach',
  coast: 'beach',
  mountain: 'mountain',
  hill: 'mountain',
  ski: 'mountain',
  landscape: 'nature',
  forest: 'nature',
  park: 'nature',
  animal: 'animals',
  zoo: 'animals',
  traffic: 'traffic',
  road: 'traffic',
  airport: 'airport',
  harbor: 'port',
  port: 'port',
  marina: 'port',
  travel: 'tourist',
  landmark: 'tourist',
  square: 'tourist',
  meteo: 'space',
  sky: 'space',
};

function toCategory(rawCategories: string[] | undefined): CameraCategory {
  if (!rawCategories) return 'other';
  for (const raw of rawCategories) {
    const mapped = CATEGORY_MAP[raw.toLowerCase()];
    if (mapped) return mapped;
  }
  return 'other';
}

interface WindyWebcamRaw {
  webcamId: number | string;
  title: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
    country?: string;
    countryCode?: string;
    city?: string;
    timezone?: string;
  };
  categories?: { name: string }[];
  images?: { current?: { thumbnail?: string; preview?: string } };
  player?: { day?: { embed?: string } };
  urls?: { detail?: string };
}

function normalize(raw: WindyWebcamRaw): Camera {
  const id = `windy:${raw.webcamId}`;
  const city = raw.location.city ?? '';
  const country = raw.location.country ?? '';
  return {
    id,
    slug: slugify(city, raw.title, String(raw.webcamId)),
    title: raw.title,
    latitude: raw.location.latitude,
    longitude: raw.location.longitude,
    country,
    countryCode: raw.location.countryCode ?? '',
    city,
    category: toCategory(raw.categories?.map((c) => c.name)),
    thumbnail: raw.images?.current?.preview ?? raw.images?.current?.thumbnail ?? '',
    streamUrl: raw.player?.day?.embed ?? '',
    playerUrl: raw.player?.day?.embed,
    source: 'windy',
    sourceId: String(raw.webcamId),
    sourceUrl: raw.urls?.detail ?? `https://www.windy.com/webcams/${raw.webcamId}`,
    isLive: raw.status === 'active',
    lastChecked: new Date().toISOString(),
    timezone: raw.location.timezone,
  };
}

// The Windy Webcams v3 API takes its geographic filter as a literal path
// segment under /list/ (e.g. /list/bbox=..., /list/nearby=..., /webcam/{id}),
// not as a query-string parameter - a plain "/list?nearby=..." 404s.
async function windyFetch(pathSegment: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${API_BASE}${pathSegment}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { 'x-windy-api-key': config.windyApiKey },
  });
  if (!res.ok) {
    throw new Error(`Windy API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

interface GeocodeResult {
  lat: number;
  lon: number;
}

// Windy's v3 API only filters by bbox/nearby/country/continent/webcam id, not
// free text - so a text search first geocodes the query (OpenStreetMap
// Nominatim, free and keyless) and then asks Windy for webcams near that
// point.
async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'watch-the-world-app (contact: set OPENWEATHER_API_KEY env owner)' },
  });
  if (!res.ok) return null;
  const results = (await res.json()) as any[];
  const first = results[0];
  if (!first) return null;
  return { lat: Number(first.lat), lon: Number(first.lon) };
}

export const windyAdapter: WebcamSourceAdapter = {
  name: 'windy',

  isEnabled() {
    return Boolean(config.windyApiKey);
  },

  async fetchByBBox(bbox: BBox, limit: number): Promise<Camera[]> {
    if (!this.isEnabled()) return [];
    // Path order for the bbox filter is south,west,north,east.
    const data = await windyFetch(
      `/list/bbox=${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`,
      { limit: String(limit), show: 'webcams:location,image,player,category,urls' }
    );
    const webcams: WindyWebcamRaw[] = data?.webcams ?? [];
    return webcams.map(normalize);
  },

  async searchByQuery(query: string, limit: number): Promise<Camera[]> {
    if (!this.isEnabled()) return [];
    const point = await geocode(query);
    if (!point) return [];
    const data = await windyFetch(`/list/nearby=${point.lat},${point.lon},50`, {
      limit: String(limit),
      show: 'webcams:location,image,player,category,urls',
    });
    const webcams: WindyWebcamRaw[] = data?.webcams ?? [];
    return webcams.map(normalize);
  },

  async checkStatus(sourceId: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      const data = await windyFetch(`/webcam/${sourceId}`, { show: 'webcams:status' });
      return data?.status === 'active';
    } catch {
      return false;
    }
  },
};
