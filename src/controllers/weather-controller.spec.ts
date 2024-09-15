import { WeatherController } from './weather-controller';
import { Request, Response } from 'express';
import httpStatusCodes from 'http-status-codes';
import { isFuture, isValid, parseISO } from 'date-fns';

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
});
