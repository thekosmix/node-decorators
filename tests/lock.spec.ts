import { describe, it, expect, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import { Lock, LockAcquisitionError, CacheManager, RedisCacheStore, MemoryLockManager } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@Lock Decorator Suite', () => {
  beforeEach(() => {
    CacheManager.reset();
    MemoryLockManager.reset();
  });

  it('should sequentially execute critical section using in-memory lock', async () => {
    const order: number[] = [];

    class AccountService {
      @Lock({ key: 'account:123', ttlMs: 1000 })
      async deposit(amount: number, delayMs: number) {
        await sleep(delayMs);
        order.push(amount);
        return amount;
      }
    }

    const service = new AccountService();

    // Launch two concurrent operations on the same key
    const p1 = service.deposit(100, 40);
    const p2 = service.deposit(200, 10);

    await Promise.all([p1, p2]);

    // Even though p2 had a smaller delay, p1 acquired the lock first and completed first
    expect(order).toEqual([100, 200]);
  });

  it('should fail-fast and throw LockAcquisitionError if wait is false', async () => {
    class CriticalService {
      @Lock({ key: 'cron-job', wait: false })
      async runCron() {
        await sleep(50);
        return 'done';
      }
    }

    const service = new CriticalService();
    const p1 = service.runCron();

    // Immediate second call should fail fast
    await expect(service.runCron()).rejects.toThrow(LockAcquisitionError);

    await p1;
  });

  it('should acquire and release distributed lock using Redis', async () => {
    const redisClient = new RedisMock();
    CacheManager.registerStore('redis', new RedisCacheStore(redisClient));

    let running = false;
    let maxConcurrency = 0;

    class DistributedPaymentService {
      @Lock({ key: (id) => `payment:${id}`, ttlMs: 2000 })
      async pay(id: string) {
        if (running) maxConcurrency++;
        running = true;
        await sleep(30);
        running = false;
        return `paid-${id}`;
      }
    }

    const service = new DistributedPaymentService();
    const [r1, r2] = await Promise.all([service.pay('u1'), service.pay('u1')]);

    expect(r1).toBe('paid-u1');
    expect(r2).toBe('paid-u1');
    expect(maxConcurrency).toBe(0); // Never ran simultaneously
  });
});
