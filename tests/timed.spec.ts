import { describe, it, expect, vi } from 'vitest';
import { Timed, MeasureTime } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@Timed / @MeasureTime Decorator Suite', () => {
  it('should call custom callback with measured duration and method details', async () => {
    const callback = vi.fn();

    class WorkService {
      @Timed(callback)
      async compute(a: number, b: number) {
        await sleep(15);
        return a + b;
      }
    }

    const service = new WorkService();
    const sum = await service.compute(10, 20);

    expect(sum).toBe(30);
    expect(callback).toHaveBeenCalledOnce();
    const [durationMs, propKey, args] = callback.mock.calls[0];
    expect(durationMs).toBeGreaterThanOrEqual(10);
    expect(propKey).toBe('compute');
    expect(args).toEqual([10, 20]);
  });

  it('should support synchronous execution with @MeasureTime alias', () => {
    const callback = vi.fn();

    class SyncWork {
      @MeasureTime(callback)
      fastMath() {
        return 123 * 456;
      }
    }

    const service = new SyncWork();
    const res = service.fastMath();
    expect(res).toBe(56088);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
  });
});
