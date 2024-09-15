import { WeatherController } from './weather-controller';
import { Request, Response } from 'express';
import httpStatusCodes from 'http-status-codes';
import { isFuture, isValid, parseISO } from 'date-fns';
import { WeatherService } from '../services/weather-service';

jest.mock('date-fns', () => ({
  isValid: jest.fn(),
  isFuture: jest.fn(),
  parseISO: jest.fn(),
}));

const mockStore = {
  getItemFromCache: jest.fn(),
  addItemToCache: jest.fn(),
  removeItemFromCache: jest.fn(),
};

jest.mock('../services/weather-service');

describe('WeatherController', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    req = { body: { city: 'San Francisco', date: '2023-09-12' } } as Request;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if the city is invalid', async () => {
    await WeatherController.getWeather(mockStore)(
      { ...req, body: { ...req.body, city: '' } } as Request,
      res
    );

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid city' });
  });

  it('should return 400 if the date is invalid', async () => {
    (parseISO as jest.Mock).mockReturnValue(new Date('invalid-date'));
    (isValid as jest.Mock).mockReturnValue(false);

    await WeatherController.getWeather(mockStore)(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid date' });
  });

  it('should return 400 if the date is in the future', async () => {
    const mockDate = new Date();
    (parseISO as jest.Mock).mockReturnValue(mockDate);
    (isValid as jest.Mock).mockReturnValue(true);
    (isFuture as jest.Mock).mockReturnValue(true);

    await WeatherController.getWeather(mockStore)(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Date cannot be in the future.',
    });
  });

  it('should return cached result if available', async () => {
    const mockDate = new Date('2023-09-12');
    const mockCacheData = { celsius: 20, fahrenheit: 68 };

    (parseISO as jest.Mock).mockReturnValue(mockDate);
    (isValid as jest.Mock).mockReturnValue(true);
    (isFuture as jest.Mock).mockReturnValue(false);
    mockStore.getItemFromCache.mockResolvedValue(mockCacheData);

    await WeatherController.getWeather(mockStore)(req, res);

    const cacheKey = `${req.body.city}:${mockDate.getTime()}`;
    expect(mockStore.getItemFromCache).toHaveBeenCalledWith(cacheKey);
  });

  it('should call the external API if no cached result is available', async () => {
    const mockDate = new Date();
    const mockApiResponse = { data: { celsius: 25, fahrenheit: 77 } };

    (parseISO as jest.Mock).mockReturnValue(mockDate);
    (isValid as jest.Mock).mockReturnValue(true);
    (isFuture as jest.Mock).mockReturnValue(false);
    mockStore.getItemFromCache.mockResolvedValue(null);
    (WeatherService.fetchWeatherFromApi as jest.Mock).mockResolvedValue(
      mockApiResponse
    );

    await WeatherController.getWeather(mockStore)(req, res);

    const cacheKey = `${req.body.city}:${mockDate.getTime()}`;
    expect(mockStore.getItemFromCache).toHaveBeenCalledWith(cacheKey);
    expect(WeatherService.fetchWeatherFromApi).toHaveBeenCalledWith({
      city: req.body.city,
      date: req.body.date,
    });
    expect(mockStore.addItemToCache).toHaveBeenCalledWith(
      cacheKey,
      expect.any(Object)
    );

    expect(res.status).toHaveBeenCalledWith(httpStatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should return 500 if external API call fails', async () => {
    const mockDate = new Date();

    (parseISO as jest.Mock).mockReturnValue(mockDate);
    (isValid as jest.Mock).mockReturnValue(true);
    (isFuture as jest.Mock).mockReturnValue(false);
    mockStore.getItemFromCache.mockResolvedValue(null);
    (WeatherService.fetchWeatherFromApi as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    await WeatherController.getWeather(mockStore)(req, res);

    expect(res.status).toHaveBeenCalledWith(
      httpStatusCodes.INTERNAL_SERVER_ERROR
    );
    expect(res.json).toHaveBeenCalledWith({ error: 'API Error' });
  });
});
