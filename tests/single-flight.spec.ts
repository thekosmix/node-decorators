import { describe, it, expect } from 'vitest';
import { SingleFlight } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@SingleFlight Decorator Suite', () => {
  it('should coalesce multiple concurrent in-flight requests into a single execution', async () => {
    let executionCount = 0;

    class WeatherService {
      @SingleFlight((city: string) => city)
      async getForecast(city: string) {
        executionCount++;
        await sleep(40);
        return { city, temp: 22, executionId: executionCount };
      }
    }

    const service = new WeatherService();

    // Fire 5 concurrent requests for London
    const promises = [
      service.getForecast('London'),
      service.getForecast('London'),
      service.getForecast('London'),
      service.getForecast('London'),
      service.getForecast('London'),
    ];

    const results = await Promise.all(promises);

    // All 5 callers get the exact same result
    expect(results[0]).toEqual({ city: 'London', temp: 22, executionId: 1 });
    expect(results[1]).toEqual(results[0]);
    expect(results[4]).toEqual(results[0]);

    // The method ran exactly ONCE
    expect(executionCount).toBe(1);

    // Subsequent call after in-flight completion executes again
    const nextResult = await service.getForecast('London');
    expect(nextResult.executionId).toBe(2);
    expect(executionCount).toBe(2);
  });

  it('should allow concurrent requests with different keys to run concurrently', async () => {
    let executionCount = 0;

    class StockService {
      @SingleFlight((ticker: string) => ticker)
      async getPrice(ticker: string) {
        executionCount++;
        await sleep(20);
        return { ticker, price: 100 };
      }
    }

    const service = new StockService();
    const [a, b] = await Promise.all([service.getPrice('AAPL'), service.getPrice('GOOG')]);

    expect(a.ticker).toBe('AAPL');
    expect(b.ticker).toBe('GOOG');
    expect(executionCount).toBe(2);
  });
});
