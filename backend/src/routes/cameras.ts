import { Router } from 'express';
import {
  countCameras,
  getCameraBySlug,
  getCamerasInBBox,
  getNearbyCameras,
  getRandomLiveCamera,
  searchCamerasLocal,
} from '../db/index.js';
import { runQueryDiscovery } from '../discovery/discoveryService.js';
import { parseBBox } from '../utils/geo.js';

export const camerasRouter = Router();

// Viewport-based loading: the map only ever requests cameras inside the
// bbox it currently shows, so the browser never has to hold the whole
// world's cameras in memory - this is what lets the app scale to tens of
// thousands of cameras.
camerasRouter.get('/viewport', (req, res) => {
  const bbox = parseBBox(req.query.bbox as string | undefined);
  if (!bbox) {
    return res.status(400).json({ error: 'Missing or invalid bbox query param: minLon,minLat,maxLon,maxLat' });
  }
  const limit = Number(req.query.limit ?? 500);
  const category = req.query.category as string | undefined;
  const cameras = getCamerasInBBox(bbox.minLat, bbox.minLon, bbox.maxLat, bbox.maxLon, {
    limit,
    category: category && category !== 'all' ? category : undefined,
    onlyLive: req.query.onlyLive !== 'false',
  });
  res.json({ cameras, count: cameras.length });
});

// Global search: checks the local cache first, then asks live sources for
// anything new matching the query so results aren't limited to what has
// already been imported.
camerasRouter.get('/search', async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) return res.status(400).json({ error: 'Missing q query param' });

  const local = searchCamerasLocal(q, 100);
  let fresh: Awaited<ReturnType<typeof runQueryDiscovery>> = [];
  try {
    fresh = await runQueryDiscovery(q, 50);
  } catch (err) {
    console.error('Live source search failed:', err);
  }

  const byId = new Map(local.map((c) => [c.id, c]));
  for (const c of fresh) byId.set(c.id, c);

  res.json({ cameras: Array.from(byId.values()), count: byId.size });
});

camerasRouter.get('/random', (req, res) => {
  const category = req.query.category as string | undefined;
  const camera = getRandomLiveCamera(category && category !== 'all' ? category : undefined);
  if (!camera) return res.status(404).json({ error: 'No live cameras available yet' });
  res.json({ camera });
});

camerasRouter.get('/stats', (_req, res) => {
  res.json({ total: countCameras() });
});

camerasRouter.get('/:slug', (req, res) => {
  const camera = getCameraBySlug(req.params.slug);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  const nearby = getNearbyCameras(camera.latitude, camera.longitude, camera.id, 12);
  res.json({ camera, nearby });
});
