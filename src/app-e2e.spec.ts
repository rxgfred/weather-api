import request from 'supertest';
import express from 'express';
import { apiRoutes } from './routes';
import axios from 'axios';
import httpStatusCodes from 'http-status-codes';

const mockStore = {
  getItemFromCache: jest.fn(),
  addItemToCache: jest.fn(),
  removeItemFromCache: jest.fn(),
};

const endpoint = '/api/v1/weather';
const app = express();
app.use('/api/v1', apiRoutes(mockStore));

describe('POST /api/v1/weather', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mock functions before each test
  });

  it('should return 400 if date is invalid', async () => {
    const response = await request(app)
      .post(endpoint)
      .send({ city: 'San Francisco', date: 'invalid-date' });

    expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    expect(response.body).toEqual({ error: 'Invalid date' });
  });

  it('should return 400 if the date is in the future', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Set a future date

    const response = await request(app)
      .post(endpoint)
      .send({ city: 'San Francisco', date: futureDate.toISOString() });

    expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    expect(response.body).toEqual({ error: 'Date cannot be in the future.' });
  });

  it('should return cached data if available', async () => {
    const cachedData = { celsius: 30, fahrenheit: 86 };
    mockStore.getItemFromCache.mockResolvedValueOnce(cachedData);

    const response = await request(app)
      .post(endpoint)
      .send({ city: 'San Francisco', date: '2022-01-01T00:00:00Z' });

    expect(response.status).toBe(httpStatusCodes.OK);
    expect(response.body).toEqual(cachedData);
    expect(mockStore.getItemFromCache).toHaveBeenCalled();
    expect(mockStore.addItemToCache).not.toHaveBeenCalled(); // Should not cache if data already exists
  });

  it('should fetch and cache data if not in cache', async () => {
    const cacheKey = 'San Francisco:1640995200000';
    const apiResponseData = { celsius: 25, fahrenheit: 77 };

    mockStore.getItemFromCache.mockResolvedValueOnce(null); // No cached data
    jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: apiResponseData }); // Mock API response

    const response = await request(app)
      .post(endpoint)
      .send({ city: 'San Francisco', date: '2022-01-01T00:00:00Z' });

    expect(response.status).toBe(httpStatusCodes.OK);
    expect(response.body).toEqual(apiResponseData);
    expect(mockStore.getItemFromCache).toHaveBeenCalledWith(cacheKey); // Check that cache was queried
    expect(mockStore.addItemToCache).toHaveBeenCalledWith(
      cacheKey,
      apiResponseData
    ); // Ensure data was cached
  });

  it('should handle external API errors gracefully, retrying after the first run', async () => {
    const apiErrorResponse = { message: 'API Error' };

    mockStore.getItemFromCache.mockResolvedValueOnce(null); // Cache miss
    jest
      .spyOn(axios, 'post')
      .mockRejectedValueOnce({ response: { data: apiErrorResponse } })
      .mockResolvedValueOnce({ response: { data: { celsius: 100 } } }); // Mock API error

    const response = await request(app)
      .post(endpoint)
      .send({ city: 'San Francisco', date: '2022-01-01T00:00:00Z' });

    expect(response.status).toBe(httpStatusCodes.OK);
    expect(response.body).not.toEqual({});
  });
});
