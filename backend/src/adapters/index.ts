import { windyAdapter } from './windyAdapter.js';
import type { WebcamSourceAdapter } from './types.js';

/**
 * Registry of every webcam source adapter the app knows about. Add a new
 * source by writing an adapter that implements WebcamSourceAdapter and
 * pushing it here - the discovery service automatically picks it up (and
 * skips it if its API key isn't configured).
 */
export const allAdapters: WebcamSourceAdapter[] = [windyAdapter];

export function enabledAdapters(): WebcamSourceAdapter[] {
  return allAdapters.filter((a) => a.isEnabled());
}
