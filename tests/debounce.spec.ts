import { describe, it, expect } from 'vitest';
import { Debounce, Throttle } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@Debounce & @Throttle Decorator Suite', () => {
  it('should debounce rapid invocations and execute only the latest call', async () => {
    let callCount = 0;

    class SearchService {
      @Debounce(50)
      search(query: string) {
        callCount++;
        return `Results for ${query}`;
      }
    }

    const service = new SearchService();

    // Call 3 times rapidly
    const p1 = service.search('a');
    const p2 = service.search('ab');
    const p3 = service.search('abc');

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(callCount).toBe(1);
    expect(r1).toBe('Results for abc');
    expect(r2).toBe('Results for abc');
    expect(r3).toBe('Results for abc');
  });

  it('should throttle executions to at most once per limit window', async () => {
    let executions = 0;

    class TelemetryService {
      @Throttle(60)
      sendEvent(data: number) {
        executions++;
        return data;
      }
    }

    const service = new TelemetryService();

    // First call executes immediately (leading)
    await service.sendEvent(1);
    expect(executions).toBe(1);

    // Call during throttle window
    await service.sendEvent(2);
    await service.sendEvent(3);
    expect(executions).toBe(1);

    // Wait for throttle window to expire and trailing execution to fire
    await sleep(80);
    expect(executions).toBe(2);
  });
});
