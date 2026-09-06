import { Router } from 'express';
import { config } from '../config.js';

export const weatherRouter = Router();

weatherRouter.get('/', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'lat and lon query params required' });
  }
  if (!config.openWeatherApiKey) {
    return res.json({ available: false });
  }
  try {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', config.openWeatherApiKey);
    const response = await fetch(url);
    if (!response.ok) return res.json({ available: false });
    const data: any = await response.json();
    res.json({
      available: true,
      tempC: data.main?.temp,
      condition: data.weather?.[0]?.main,
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
    });
  } catch {
    res.json({ available: false });
  }
});
