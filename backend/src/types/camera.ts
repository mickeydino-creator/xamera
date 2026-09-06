export type CameraCategory =
  | 'city'
  | 'beach'
  | 'mountain'
  | 'nature'
  | 'animals'
  | 'traffic'
  | 'airport'
  | 'port'
  | 'tourist'
  | 'space'
  | 'other';

/** Normalized camera record used across the whole app, regardless of source. */
export interface Camera {
  id: string; // stable id: `${source}:${sourceId}`
  slug: string;
  title: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  city: string;
  category: CameraCategory;
  thumbnail: string;
  streamUrl: string;
  playerUrl?: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  isLive: boolean;
  lastChecked: string; // ISO timestamp
  timezone?: string;
}

export interface BBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}
