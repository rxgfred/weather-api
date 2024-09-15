import { BackOffPolicy, Retryable } from 'typescript-retry-decorator';
import { Config } from '../config';
import axios, { AxiosError } from 'axios';

export class WeatherService {
  static extractTemperatureFromResponse(data: {
    celsius?: number;
    fahrenheit?: number;
  }): { celsius: number; fahrenheit: number } {
    if ('celsius' in data) {
      const celsius = data.celsius!;
      const fahrenheit = +(celsius * (9 / 5) + 32).toFixed(2);
      return { celsius, fahrenheit };
    } else if ('fahrenheit' in data) {
      const fahrenheit = data.fahrenheit!;
      const celsius = +((fahrenheit - 32) * (5 / 9)).toFixed(2);
      return { celsius, fahrenheit };
    }
    throw new Error('Invalid data: Expected either celsius or fahrenheit.');
  }
  @Retryable({
    maxAttempts: 3,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    exponentialOption: { maxInterval: 4000, multiplier: 5 },
  })
  static async fetchWeatherFromApi({
    city,
    date,
  }: {
    city: string;
    date: string;
  }): Promise<
    { celsius: number } | { fahrenheit: number } | { error: string }
  > {
    try {
      const response = await axios.post(Config.BASE_API_URL, { city, date });
      return WeatherService.extractTemperatureFromResponse(response?.data);
    } catch (e: any) {
      if (e instanceof AxiosError) {
        if (e?.request?.data) {
          return e.request.data;
        } else if (e?.response?.data) {
          return e.response.data;
        }
      }

      return { error: e.message };
    }
  }
}
