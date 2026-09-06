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

async function windyFetch(path: string, params: Record<string, string>): Promise<any> {
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

export const windyAdapter: WebcamSourceAdapter = {
  name: 'windy',

  isEnabled() {
    return Boolean(config.windyApiKey);
  },

  async fetchByBBox(bbox: BBox, limit: number): Promise<Camera[]> {
    if (!this.isEnabled()) return [];
    const data = await windyFetch('/list', {
      'nearby': `${(bbox.minLat + bbox.maxLat) / 2},${(bbox.minLon + bbox.maxLon) / 2},${Math.ceil(
        (bbox.maxLat - bbox.minLat) * 111
      )}`,
      limit: String(limit),
      include: 'location,images,player,categories,urls',
    });
    const webcams: WindyWebcamRaw[] = data?.webcams ?? [];
    return webcams
      .filter(
        (w) =>
          w.location.latitude >= bbox.minLat &&
          w.location.latitude <= bbox.maxLat &&
          w.location.longitude >= bbox.minLon &&
          w.location.longitude <= bbox.maxLon
      )
      .map(normalize);
  },

  async searchByQuery(query: string, limit: number): Promise<Camera[]> {
    if (!this.isEnabled()) return [];
    const data = await windyFetch('/list', {
      query,
      limit: String(limit),
      include: 'location,images,player,categories,urls',
    });
    const webcams: WindyWebcamRaw[] = data?.webcams ?? [];
    return webcams.map(normalize);
  },

  async checkStatus(sourceId: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      const data = await windyFetch(`/webcam/${sourceId}`, { include: 'status' });
      return data?.status === 'active';
    } catch {
      return false;
    }
  },
};
