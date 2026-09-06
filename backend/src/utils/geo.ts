import type { BBox } from '../types/camera.js';

export function slugify(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Splits the whole world into a grid of bounding boxes. Used by the discovery
 * service to page through source APIs that require a bbox per request
 * (avoids ever asking a source for "everything" in one call).
 */
export function worldGrid(stepDeg: number): BBox[] {
  const boxes: BBox[] = [];
  for (let lat = -90; lat < 90; lat += stepDeg) {
    for (let lon = -180; lon < 180; lon += stepDeg) {
      boxes.push({
        minLat: lat,
        maxLat: Math.min(lat + stepDeg, 90),
        minLon: lon,
        maxLon: Math.min(lon + stepDeg, 180),
      });
    }
  }
  return boxes;
}

export function parseBBox(raw: string | undefined): BBox | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  return { minLat, minLon, maxLat, maxLon };
}
