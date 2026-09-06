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

export interface Camera {
  id: string;
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
  lastChecked: string;
  timezone?: string;
}

export const CATEGORIES: { key: CameraCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🌍' },
  { key: 'city', label: 'Cities', emoji: '🌆' },
  { key: 'beach', label: 'Beaches', emoji: '🌊' },
  { key: 'mountain', label: 'Mountains', emoji: '🏔️' },
  { key: 'nature', label: 'Nature', emoji: '🌲' },
  { key: 'animals', label: 'Animals', emoji: '🐘' },
  { key: 'traffic', label: 'Traffic', emoji: '🚗' },
  { key: 'airport', label: 'Airports', emoji: '✈️' },
  { key: 'port', label: 'Ports', emoji: '🚢' },
  { key: 'tourist', label: 'Tourist spots', emoji: '🏖️' },
  { key: 'space', label: 'Space', emoji: '🌌' },
];
