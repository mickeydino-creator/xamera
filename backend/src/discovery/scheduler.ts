import cron from 'node-cron';
import { config } from '../config.js';
import { runAvailabilityCheck, runDiscoveryPass } from './discoveryService.js';

export function startScheduler(): void {
  cron.schedule(config.discoveryRefreshCron, () => {
    runDiscoveryPass().catch((err) => console.error('[scheduler] discovery pass failed:', err));
  });

  cron.schedule(config.availabilityCheckCron, () => {
    runAvailabilityCheck().catch((err) => console.error('[scheduler] availability check failed:', err));
  });

  console.log(
    `[scheduler] discovery cron="${config.discoveryRefreshCron}" availability cron="${config.availabilityCheckCron}"`
  );
}
