import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  dbPath: process.env.DB_PATH ?? './data/cameras.db',
  discoveryRefreshCron: process.env.DISCOVERY_REFRESH_CRON ?? '0 */6 * * *',
  availabilityCheckCron: process.env.AVAILABILITY_CHECK_CRON ?? '*/15 * * * *',
  windyApiKey: process.env.WINDY_WEBCAMS_API_KEY ?? '',
  secondaryApiKey: process.env.SECONDARY_WEBCAM_API_KEY ?? '',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? '',
};
