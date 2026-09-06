import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import './db/index.js';
import { camerasRouter } from './routes/cameras.js';
import { weatherRouter } from './routes/weather.js';
import { startScheduler } from './discovery/scheduler.js';
import { runDiscoveryPass } from './discovery/discoveryService.js';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/cameras', camerasRouter);
app.use('/api/weather', weatherRouter);

app.listen(config.port, () => {
  console.log(`Watch The World API listening on port ${config.port}`);
  startScheduler();
  // Kick off an initial discovery pass shortly after boot so the map has
  // data without requiring a manual trigger.
  setTimeout(() => {
    runDiscoveryPass().catch((err) => console.error('Initial discovery pass failed:', err));
  }, 2000);
});
