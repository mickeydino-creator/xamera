import { enabledAdapters } from '../adapters/index.js';
import {
  getAllCameraIdsAndUrls,
  markOffline,
  markOnline,
  removeStaleCameras,
  upsertCameras,
} from '../db/index.js';
import type { Camera } from '../types/camera.js';
import { worldGrid } from '../utils/geo.js';
import { dedupeCameras } from './dedupe.js';

const GRID_STEP_DEG = 20; // world split into 20deg tiles to page through source APIs
const PER_TILE_LIMIT = 50; // Windy's v3 API rejects limit > 50

/**
 * Runs a full discovery pass: walks a grid over the whole world, asks every
 * enabled webcam source for cameras in each tile, dedupes and imports the
 * results. Safe to run repeatedly - it's an upsert, not a replace.
 */
export async function runDiscoveryPass(log: (msg: string) => void = console.log): Promise<{
  imported: number;
  tilesScanned: number;
}> {
  const adapters = enabledAdapters();
  if (adapters.length === 0) {
    log('No webcam source adapters are enabled (missing API keys). Skipping discovery.');
    return { imported: 0, tilesScanned: 0 };
  }

  const tiles = worldGrid(GRID_STEP_DEG);
  let imported = 0;

  for (const tile of tiles) {
    const results: Camera[] = [];
    for (const adapter of adapters) {
      try {
        const found = await adapter.fetchByBBox(tile, PER_TILE_LIMIT);
        results.push(...found);
      } catch (err) {
        log(`[discovery] ${adapter.name} failed for tile ${JSON.stringify(tile)}: ${err}`);
      }
    }
    if (results.length > 0) {
      const deduped = dedupeCameras(results);
      upsertCameras(deduped);
      imported += deduped.length;
    }
  }

  log(`[discovery] Imported/updated ${imported} cameras across ${tiles.length} tiles.`);
  return { imported, tilesScanned: tiles.length };
}

/**
 * Runs a query-based discovery for a specific search term against every
 * enabled source, importing anything new it finds. Used to back global
 * search with live source results, not just the local cache.
 */
export async function runQueryDiscovery(query: string, limit = 50): Promise<Camera[]> {
  const adapters = enabledAdapters();
  const results: Camera[] = [];
  for (const adapter of adapters) {
    try {
      const found = await adapter.searchByQuery(query, limit);
      results.push(...found);
    } catch (err) {
      console.error(`[discovery] search via ${adapter.name} failed:`, err);
    }
  }
  const deduped = dedupeCameras(results);
  if (deduped.length > 0) upsertCameras(deduped);
  return deduped;
}

/**
 * Periodically re-checks a sample of already-known cameras for availability,
 * marking any that have gone offline and pruning ones that have been
 * offline for a long time.
 */
export async function runAvailabilityCheck(
  log: (msg: string) => void = console.log,
  sampleSize = 300
): Promise<{ checked: number; wentOffline: number; wentOnline: number; removed: number }> {
  const all = getAllCameraIdsAndUrls();
  const sample = all.sort(() => Math.random() - 0.5).slice(0, sampleSize);

  const adaptersByName = new Map(enabledAdapters().map((a) => [a.name, a]));
  let wentOffline = 0;
  let wentOnline = 0;

  for (const cam of sample) {
    const adapter = adaptersByName.get(cam.source);
    if (!adapter) continue;
    const sourceId = cam.id.split(':').slice(1).join(':');
    try {
      const isLive = await adapter.checkStatus(sourceId);
      if (isLive) {
        markOnline(cam.id);
        wentOnline += 1;
      } else {
        markOffline(cam.id);
        wentOffline += 1;
      }
    } catch {
      markOffline(cam.id);
      wentOffline += 1;
    }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const removed = removeStaleCameras(thirtyDaysAgo);

  log(
    `[availability] checked ${sample.length}, ${wentOffline} offline, ${wentOnline} online, ${removed} removed`
  );
  return { checked: sample.length, wentOffline, wentOnline, removed };
}
