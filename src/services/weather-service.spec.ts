import { WeatherService } from './weather-service';
import axios from 'axios';

jest.mock('axios');

describe('WeatherService', () => {
  describe('extractTemperatureFromResponse', () => {
    it('should return both celsius and fahrenheit when celsius is provided', () => {
      const data = { celsius: 25 };
      const result = WeatherService.extractTemperatureFromResponse(data);
      expect(result).toEqual({ celsius: 25, fahrenheit: 77 });
    });

    it('should return both celsius and fahrenheit when fahrenheit is provided', () => {
      const data = { fahrenheit: 77 };
      const result = WeatherService.extractTemperatureFromResponse(data);
      expect(result).toEqual({ celsius: 25, fahrenheit: 77 });
    });

    it('should throw an error when neither celsius nor fahrenheit is provided', () => {
      const data = {};
      expect(() => WeatherService.extractTemperatureFromResponse(data)).toThrow(
        'Invalid data: Expected either celsius or fahrenheit.'
      );
    });
  });

  describe('fetchWeatherFromApi', () => {
    const mockCity = 'San Francisco';
    const mockDate = '2024-09-10';

    it('should return temperature data when the API call is successful', async () => {
      const mockResponse = { data: { celsius: 20 } };
      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await WeatherService.fetchWeatherFromApi({
        city: mockCity,
        date: mockDate,
      });

      expect(result).toEqual({ celsius: 20, fahrenheit: 68 });
      expect(axios.post).toHaveBeenCalled();
    });

    it('should return an error when the API call fails', async () => {
      const mockError = new Error('Network Error');
      (axios.post as jest.Mock).mockRejectedValue(mockError);

      const result = await WeatherService.fetchWeatherFromApi({
        city: mockCity,
        date: mockDate,
      });

      expect(result).toEqual({ error: 'Network Error' });
    });
  });
});
