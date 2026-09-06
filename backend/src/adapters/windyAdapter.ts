import { config } from '../config.js';
import type { BBox, Camera, CameraCategory } from '../types/camera.js';
import { slugify } from '../utils/geo.js';
import type { WebcamSourceAdapter } from './types.js';

// Confirmed against a reference open-source client of this API (there is no
// machine-readable spec): base is api.windy.com, and the resource path is
// /webcams/api/v3/webcams - NOT /api/webcams/v3/list, which only 404s.
const API_BASE = 'https://api.windy.com/webcams/api/v3';

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

function toCategory(rawCategories: unknown): CameraCategory {
  if (!Array.isArray(rawCategories)) return 'other';
  for (const raw of rawCategories) {
    const name = typeof raw === 'string' ? raw : raw?.name ?? raw?.id;
    if (typeof name !== 'string') continue;
    const mapped = CATEGORY_MAP[name.toLowerCase()];
    if (mapped) return mapped;
  }
  return 'other';
}

// The exact field names below are a best-effort reconstruction (Windy
// publishes no public OpenAPI schema); normalize() reads defensively across
// a few plausible variants so a partial mismatch degrades gracefully instead
// of throwing away the whole record.
interface WindyWebcamRaw {
  id?: number | string;
  webcamId?: number | string;
  title: string;
  status?: string;
  location: {
    latitude: number;
    longitude: number;
    country?: string;
    countryCode?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  category?: unknown;
  categories?: unknown;
  images?: {
    current?: { thumbnail?: string; preview?: string; icon?: string };
    daylight?: { thumbnail?: string; preview?: string };
  };
  player?: {
    day?: { embed?: string; link?: string };
    live?: { embed?: string; link?: string };
  };
  url?: { current?: string; provider?: string };
  urls?: { detail?: string };
}

function webcamId(raw: WindyWebcamRaw): string {
  return String(raw.id ?? raw.webcamId ?? '');
}

function normalize(raw: WindyWebcamRaw): Camera | null {
  const wid = webcamId(raw);
  if (!wid || !raw.location) return null;
  const city = raw.location.city ?? raw.location.region ?? '';
  const country = raw.location.country ?? '';
  const player = raw.player?.day ?? raw.player?.live;
  return {
    id: `windy:${wid}`,
    slug: slugify(city, raw.title, wid),
    title: raw.title,
    latitude: raw.location.latitude,
    longitude: raw.location.longitude,
    country,
    countryCode: raw.location.countryCode ?? '',
    city,
    category: toCategory(raw.category ?? raw.categories),
    thumbnail:
      raw.images?.current?.preview ??
      raw.images?.daylight?.preview ??
      raw.images?.current?.thumbnail ??
      '',
    streamUrl: player?.embed ?? player?.link ?? '',
    playerUrl: player?.embed ?? player?.link,
    source: 'windy',
    sourceId: wid,
    sourceUrl: raw.urls?.detail ?? raw.url?.current ?? `https://www.windy.com/webcams/${wid}`,
    isLive: raw.status ? raw.status.toLowerCase() === 'active' : true,
    lastChecked: new Date().toISOString(),
    timezone: raw.location.timezone,
  };
}

function extractWebcamList(data: any): WindyWebcamRaw[] {
  return data?.result?.webcams ?? data?.webcams ?? [];
}

function extractSingleWebcam(data: any): WindyWebcamRaw | null {
  return data?.result?.webcam ?? data?.result ?? data?.webcam ?? data ?? null;
}

async function windyFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${API_BASE}${path}`);
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

// Windy's v3 API filters only by bbox/nearby/country/continent/webcam id, not
// free text - so a text search first geocodes the query (OpenStreetMap
// Nominatim, free and keyless) into a point, then asks Windy for webcams in
// a bbox around it.
async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'watch-the-world-app (https://github.com/mickeydino-creator/xamera)' },
  });
  if (!res.ok) return null;
  const results = (await res.json()) as any[];
  const first = results[0];
  if (!first) return null;
  return { lat: Number(first.lat), lon: Number(first.lon) };
}

const SHOW_FIELDS = 'webcams:image,location,player,url,category';
const MAX_API_LIMIT = 50; // Windy's v3 API rejects a "limit" above this

export const windyAdapter: WebcamSourceAdapter = {
  name: 'windy',

  isEnabled() {
    return Boolean(config.windyApiKey);
  },

  async fetchByBBox(bbox: BBox, limit: number): Promise<Camera[]> {
    if (!this.isEnabled()) return [];
    // Windy's bbox order is south,west,north,east - same order as our BBox.
    const data = await windyFetch('/webcams', {
      bbox: `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`,
      limit: String(Math.min(limit, MAX_API_LIMIT)),
      show: SHOW_FIELDS,
    });
    return extractWebcamList(data)
      .map(normalize)
      .filter((c): c is Camera => c !== null);
  },

  async searchByQuery(query: string, limit: number): Promise<Camera[]> {
    if (!this.isEnabled()) return [];
    const point = await geocode(query);
    if (!point) return [];
    const delta = 0.5; // ~55km box around the geocoded point
    const data = await windyFetch('/webcams', {
      bbox: `${point.lat - delta},${point.lon - delta},${point.lat + delta},${point.lon + delta}`,
      limit: String(Math.min(limit, MAX_API_LIMIT)),
      show: SHOW_FIELDS,
    });
    return extractWebcamList(data)
      .map(normalize)
      .filter((c): c is Camera => c !== null);
  },

  async checkStatus(sourceId: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      const data = await windyFetch(`/webcams/${sourceId}`, { show: 'webcams:status' });
      const webcam = extractSingleWebcam(data);
      return webcam?.status ? webcam.status.toLowerCase() === 'active' : false;
    } catch {
      return false;
    }
  },
};
