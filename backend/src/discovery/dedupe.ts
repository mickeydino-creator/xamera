import type { Camera } from '../types/camera.js';
import { haversineKm } from '../utils/geo.js';

const DEDUPE_RADIUS_KM = 0.05; // ~50m
const TITLE_SIMILARITY_THRESHOLD = 0.9;

function normalizedTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (!longer.includes(shorter)) return shorter.length / longer.length < 0.5 ? 0 : 0.5;
  return shorter.length / longer.length;
}

/**
 * Removes duplicate cameras that different sources reported for essentially
 * the same physical webcam (same spot, very similar title). Keeps the first
 * occurrence encountered, so callers should feed higher-trust sources first.
 */
export function dedupeCameras(cameras: Camera[]): Camera[] {
  const kept: Camera[] = [];
  for (const cam of cameras) {
    const camTitle = normalizedTitle(cam.title);
    const isDup = kept.some((existing) => {
      const distance = haversineKm(cam.latitude, cam.longitude, existing.latitude, existing.longitude);
      if (distance > DEDUPE_RADIUS_KM) return false;
      return similarity(camTitle, normalizedTitle(existing.title)) >= TITLE_SIMILARITY_THRESHOLD;
    });
    if (!isDup) kept.push(cam);
  }
  return kept;
}
