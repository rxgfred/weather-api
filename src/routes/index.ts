import bodyParser from 'body-parser';
import { Router } from 'express';
import { WeatherController } from '../controllers/weather-controller';
import { IStore } from '../store';

export function apiRoutes(store: IStore): Router {
  const router = Router();

  router.post(
    '/weather',
    bodyParser.json(),
    WeatherController.getWeather(store)
  );

  return router;
}
