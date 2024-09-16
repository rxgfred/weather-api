import { BackOffPolicy, Retryable } from 'typescript-retry-decorator';
import { Config } from '../config';
import axios from 'axios';

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
    maxAttempts: 2, // will call a max of 3 times before throwing an error
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    useOriginalError: true,
    useConsoleLogger: false,
  })
  static async fetchWeatherFromApi({
    city,
    date,
  }: {
    city: string;
    date: string;
  }): Promise<{ celsius: number; fahrenheit: number }> {
    try {
      const response = await axios.post(Config.BASE_API_URL, { city, date });
      return WeatherService.extractTemperatureFromResponse(response?.data);
    } catch (e) {
      throw new Error((<Error>e).message);
    }
  }
}
