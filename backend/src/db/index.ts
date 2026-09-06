import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import type { Camera } from '../types/camera.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    player_url TEXT,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    is_live INTEGER NOT NULL DEFAULT 1,
    last_checked TEXT NOT NULL,
    timezone TEXT,
    search_text TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cameras_bbox ON cameras (latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_cameras_category ON cameras (category);
  CREATE INDEX IF NOT EXISTS idx_cameras_is_live ON cameras (is_live);

  CREATE VIRTUAL TABLE IF NOT EXISTS cameras_fts USING fts5(
    id UNINDEXED, search_text, content=''
  );
`);

function rowToCamera(row: any): Camera {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    latitude: row.latitude,
    longitude: row.longitude,
    country: row.country,
    countryCode: row.country_code,
    city: row.city,
    category: row.category,
    thumbnail: row.thumbnail,
    streamUrl: row.stream_url,
    playerUrl: row.player_url ?? undefined,
    source: row.source,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    isLive: !!row.is_live,
    lastChecked: row.last_checked,
    timezone: row.timezone ?? undefined,
  };
}

const upsertStmt = db.prepare(`
  INSERT INTO cameras (
    id, slug, title, latitude, longitude, country, country_code, city, category,
    thumbnail, stream_url, player_url, source, source_id, source_url, is_live,
    last_checked, timezone, search_text
  ) VALUES (
    @id, @slug, @title, @latitude, @longitude, @country, @countryCode, @city, @category,
    @thumbnail, @streamUrl, @playerUrl, @source, @sourceId, @sourceUrl, @isLive,
    @lastChecked, @timezone, @searchText
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    country = excluded.country,
    country_code = excluded.country_code,
    city = excluded.city,
    category = excluded.category,
    thumbnail = excluded.thumbnail,
    stream_url = excluded.stream_url,
    player_url = excluded.player_url,
    source_url = excluded.source_url,
    is_live = excluded.is_live,
    last_checked = excluded.last_checked,
    timezone = excluded.timezone,
    search_text = excluded.search_text
`);

const ftsDeleteStmt = db.prepare(`DELETE FROM cameras_fts WHERE id = ?`);
const ftsInsertStmt = db.prepare(`INSERT INTO cameras_fts (id, search_text) VALUES (?, ?)`);

export function upsertCamera(camera: Camera): void {
  const searchText = [camera.title, camera.city, camera.country, camera.category]
    .join(' ')
    .toLowerCase();
  upsertStmt.run({
    ...camera,
    isLive: camera.isLive ? 1 : 0,
    playerUrl: camera.playerUrl ?? null,
    timezone: camera.timezone ?? null,
    searchText,
  });
  ftsDeleteStmt.run(camera.id);
  ftsInsertStmt.run(camera.id, searchText);
}

export function upsertCameras(cameras: Camera[]): void {
  const tx = db.transaction((items: Camera[]) => {
    for (const c of items) upsertCamera(c);
  });
  tx(cameras);
}

export function getCamerasInBBox(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number,
  opts: { limit?: number; category?: string; onlyLive?: boolean } = {}
): Camera[] {
  const limit = Math.min(opts.limit ?? 500, 2000);
  let query = `SELECT * FROM cameras WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`;
  const params: any[] = [minLat, maxLat, minLon, maxLon];
  if (opts.category) {
    query += ` AND category = ?`;
    params.push(opts.category);
  }
  if (opts.onlyLive) {
    query += ` AND is_live = 1`;
  }
  query += ` LIMIT ?`;
  params.push(limit);
  return db
    .prepare(query)
    .all(...params)
    .map(rowToCamera);
}

export function searchCamerasLocal(q: string, limit = 100): Camera[] {
  const rows = db
    .prepare(
      `SELECT cameras.* FROM cameras_fts
       JOIN cameras ON cameras.id = cameras_fts.id
       WHERE cameras_fts MATCH ?
       LIMIT ?`
    )
    .all(`${q.replace(/"/g, '')}*`, limit);
  return rows.map(rowToCamera);
}

export function getCameraBySlug(slug: string): Camera | null {
  const row = db.prepare(`SELECT * FROM cameras WHERE slug = ?`).get(slug);
  return row ? rowToCamera(row) : null;
}

export function getCameraById(id: string): Camera | null {
  const row = db.prepare(`SELECT * FROM cameras WHERE id = ?`).get(id);
  return row ? rowToCamera(row) : null;
}

export function getRandomLiveCamera(category?: string): Camera | null {
  let query = `SELECT * FROM cameras WHERE is_live = 1`;
  const params: any[] = [];
  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  query += ` ORDER BY RANDOM() LIMIT 1`;
  const row = db.prepare(query).get(...params);
  return row ? rowToCamera(row) : null;
}

export function getNearbyCameras(lat: number, lon: number, excludeId: string, limit = 12): Camera[] {
  const delta = 2; // degrees, coarse pre-filter before distance sort
  const rows = db
    .prepare(
      `SELECT * FROM cameras
       WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? AND id != ? AND is_live = 1
       LIMIT 500`
    )
    .all(lat - delta, lat + delta, lon - delta, lon + delta, excludeId);
  return rows.map(rowToCamera).slice(0, limit);
}

export function countCameras(): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM cameras`).get() as any).c;
}

export function markOffline(id: string): void {
  db.prepare(`UPDATE cameras SET is_live = 0, last_checked = ? WHERE id = ?`).run(
    new Date().toISOString(),
    id
  );
}

export function markOnline(id: string): void {
  db.prepare(`UPDATE cameras SET is_live = 1, last_checked = ? WHERE id = ?`).run(
    new Date().toISOString(),
    id
  );
}

export function getAllCameraIdsAndUrls(): { id: string; streamUrl: string; source: string }[] {
  return db.prepare(`SELECT id, stream_url as streamUrl, source FROM cameras`).all() as any;
}

export function removeStaleCameras(olderThanIso: string): number {
  const result = db.prepare(`DELETE FROM cameras WHERE last_checked < ? AND is_live = 0`).run(
    olderThanIso
  );
  return result.changes;
}
