import { runDiscoveryPass } from './discoveryService.js';

runDiscoveryPass()
  .then((result) => {
    console.log('Discovery pass complete:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Discovery pass failed:', err);
    process.exit(1);
  });
