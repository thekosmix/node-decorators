import { describe, it, expect } from 'vitest';
import { Timeout, TimeoutError } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@Timeout Decorator Suite', () => {
  it('should allow method to complete if within timeout limit', async () => {
    class FastService {
      @Timeout(100)
      async fastOperation() {
        await sleep(10);
        return 'done';
      }
    }

    const service = new FastService();
    const res = await service.fastOperation();
    expect(res).toBe('done');
  });

  it('should reject with TimeoutError if method exceeds timeout limit', async () => {
    class SlowService {
      @Timeout(30, 'Operation took too long')
      async slowOperation() {
        await sleep(100);
        return 'finished';
      }
    }

    const service = new SlowService();
    await expect(service.slowOperation()).rejects.toThrow(TimeoutError);
    await expect(service.slowOperation()).rejects.toThrow('Operation took too long');
  });

  it('should pass through synchronous return values immediately', () => {
    class SyncService {
      @Timeout(50)
      syncOperation() {
        return 42;
      }
    }

    const service = new SyncService();
    expect(service.syncOperation()).toBe(42);
  });
});
