# Watch The World

A dark, full-screen interactive map for discovering and watching publicly
available live webcams around the world - "Google Maps, but for live
cameras."

## Architecture

```
backend/     Express + TypeScript API, camera discovery service, SQLite cache
frontend/    React + Vite + MapLibre GL client (dark, glass-panel UI)
```

The frontend never loads "all cameras" - the map only requests cameras
inside its current viewport (`/api/cameras/viewport?bbox=...`), so the
system scales from hundreds to tens of thousands of cameras without ever
shipping the full dataset to the browser. Nearby markers cluster
automatically as you zoom out.

### Camera discovery (backend)

Cameras are never entered by hand. `backend/src/discovery/discoveryService.ts`
walks a grid over the entire world and asks every configured **webcam source
adapter** (`backend/src/adapters/`) for cameras in each tile. Results are
normalized to a common `Camera` schema, deduplicated (by location + title
similarity), and upserted into a local SQLite cache that the API serves from.

- `windyAdapter.ts` wraps the [Windy Webcams API](https://api.windy.com/webcams/docs),
  a legitimate public webcam directory with metadata, thumbnails and an
  embeddable player - the primary source out of the box.
- Adding another legal source is one file: implement `WebcamSourceAdapter`
  (`fetchByBBox`, `searchByQuery`, `checkStatus`) and register it in
  `adapters/index.ts`. It's automatically skipped if its API key isn't set.

A scheduler (`node-cron`) re-runs full discovery periodically and separately
samples known cameras to re-check availability, marking cameras offline (or
back online) and pruning ones that have been offline for 30+ days.

Global search (`/api/cameras/search?q=`) checks the local cache first, then
queries live sources for the same term, so results aren't limited to what
has already been imported.

### Normalized camera schema

```
id, slug, title, latitude, longitude, country, countryCode, city, category,
thumbnail, streamUrl, playerUrl, source, sourceId, sourceUrl, isLive,
lastChecked, timezone
```

## Running locally

### Backend

```
cd backend
cp .env.example .env   # add your WINDY_WEBCAMS_API_KEY (and optionally OPENWEATHER_API_KEY)
npm install
npm run dev             # http://localhost:4000
```

Without any source API key configured, the server still runs (health check,
empty map) but discovery passes are skipped - this is intentional so the
project boots cleanly before keys are added.

### Frontend

```
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api to :4000
```

## Environment variables

See `backend/.env.example` for the full list. Notably:

- `WINDY_WEBCAMS_API_KEY` - primary webcam source (get a free key at
  https://api.windy.com/keys).
- `OPENWEATHER_API_KEY` - optional, powers the weather shown on the
  camera/"Surprise Me" page.
- `DISCOVERY_REFRESH_CRON` / `AVAILABILITY_CHECK_CRON` - cron schedules for
  the background discovery and availability-check jobs.

## Features

- Full-screen dark map (MapLibre GL, CARTO dark basemap, no map API key
  required) with clustering that shows camera counts when zoomed out.
- Viewport-based loading - the map only ever fetches cameras for the area
  currently on screen.
- Global search across cities, countries, landmarks, and more - queries live
  sources, not just the local cache.
- Category filters: cities, beaches, mountains, nature, animals, traffic,
  airports, ports, tourist spots, space.
- "Surprise Me" - jumps to a random currently-live camera.
- Camera detail pages (`/camera/:slug`) with live player, local time,
  weather, source attribution, and nearby cameras.
- Favorites, stored per-browser in `localStorage`.
