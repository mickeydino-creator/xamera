import type { BBox, Camera } from '../types/camera.js';

/**
 * A webcam source adapter. Every legitimate webcam API/directory the app
 * connects to implements this interface, so the discovery service never
 * needs to know source-specific details and new sources can be added by
 * writing one adapter + adding an env var for its key.
 */
export interface WebcamSourceAdapter {
  /** Unique short name, used as the `source` field on normalized cameras. */
  readonly name: string;
  /** Whether this adapter is usable (e.g. its API key is configured). */
  isEnabled(): boolean;
  /** Fetch cameras located inside a bounding box (used for grid-based world discovery). */
  fetchByBBox(bbox: BBox, limit: number): Promise<Camera[]>;
  /** Fetch cameras matching a free-text query (city, country, landmark, etc). */
  searchByQuery(query: string, limit: number): Promise<Camera[]>;
  /** Re-check whether a specific camera is still live. */
  checkStatus(sourceId: string): Promise<boolean>;
}
