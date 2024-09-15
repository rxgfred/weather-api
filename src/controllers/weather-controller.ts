import { Request, Response } from 'express';
import httpStatusCodes from 'http-status-codes';
import { isFuture, isValid, parseISO } from 'date-fns';
import { IStore } from '../store';
import { WeatherService } from '../services/weather-service';

export const WeatherController = {
  getWeather: (
    store: IStore
  ): ((req: Request, res: Response) => Promise<any>) => {
    return async function (req, res) {
      const { city, date } = req.body;
      if (!city) {
        return res
          .status(httpStatusCodes.BAD_REQUEST)
          .json({ error: 'Invalid city' });
      }

      const parsedDate = parseISO(date);
      if (!isValid(parsedDate)) {
        return res
          .status(httpStatusCodes.BAD_REQUEST)
          .json({ error: 'Invalid date' });
      }

      if (isFuture(parsedDate)) {
        return res
          .status(httpStatusCodes.BAD_REQUEST)
          .json({ error: 'Date cannot be in the future.' });
      }

      const cacheKey = `${city}:${parsedDate.getTime()}`;

      const cachedResult = await store.getItemFromCache(cacheKey);
      if (cachedResult) {
        return res.status(httpStatusCodes.OK).json(cachedResult);
      }

      try {
        const response = await WeatherService.fetchWeatherFromApi({
          city,
          date,
        });
        await store.addItemToCache(cacheKey, response);
        return res.status(httpStatusCodes.OK).json(response);
      } catch (e: any) {
        return res
          .status(httpStatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: e.message });
      }
    };
  },
};
