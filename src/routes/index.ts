import bodyParser from 'body-parser';
import { Router } from 'express';
import { WeatherController } from '../controllers/weather-controller';

export function apiRoutes(): Router {
  const router = Router();

  router.post('/weather', bodyParser.json(), WeatherController.getWeather());

  return router;
}
