import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenError, CircuitBreakerManager } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@CircuitBreaker Decorator Suite', () => {
  beforeEach(() => {
    CircuitBreakerManager.resetAll();
  });

  it('should allow normal calls when circuit is CLOSED', async () => {
    class Service {
      @CircuitBreaker({ name: 'normal-cb' })
      async callOk() {
        return 'success';
      }
    }

    const service = new Service();
    expect(await service.callOk()).toBe('success');
    expect(CircuitBreakerManager.getState('normal-cb')).toBe('CLOSED');
  });

  it('should trip to OPEN when failures reach threshold and fast-fail', async () => {
    let attempts = 0;

    class UnstableService {
      @CircuitBreaker({ name: 'trip-cb', failureThreshold: 2, resetTimeoutMs: 100 })
      async callFailing() {
        attempts++;
        throw new Error('Downstream outage');
      }
    }

    const service = new UnstableService();

    // 1st failure
    await expect(service.callFailing()).rejects.toThrow('Downstream outage');
    // 2nd failure - reaches threshold 2
    await expect(service.callFailing()).rejects.toThrow('Downstream outage');

    expect(CircuitBreakerManager.getState('trip-cb')).toBe('OPEN');
    expect(attempts).toBe(2);

    // 3rd call should fast-fail with CircuitBreakerOpenError without incrementing attempts!
    await expect(service.callFailing()).rejects.toThrow(CircuitBreakerOpenError);
    expect(attempts).toBe(2);
  });

  it('should return fallback value when circuit is OPEN', async () => {
    class FallbackService {
      @CircuitBreaker({
        name: 'fallback-cb',
        failureThreshold: 1,
        resetTimeoutMs: 200,
        fallback: () => ({ status: 'cached-fallback' }),
      })
      async callService() {
        throw new Error('Service unavailable');
      }
    }

    const service = new FallbackService();
    // 1st call fails and triggers fallback
    const res1 = await service.callService();
    expect(res1).toEqual({ status: 'cached-fallback' });

    // 2nd call fast-fails and triggers fallback immediately
    const res2 = await service.callService();
    expect(res2).toEqual({ status: 'cached-fallback' });
  });

  it('should recover through HALF_OPEN back to CLOSED on successful probes', async () => {
    let shouldFail = true;

    class RecoveringService {
      @CircuitBreaker({
        name: 'recovery-cb',
        failureThreshold: 1,
        resetTimeoutMs: 50,
        halfOpenAttempts: 1,
      })
      async ping() {
        if (shouldFail) throw new Error('Outage');
        return 'healthy';
      }
    }

    const service = new RecoveringService();
    await expect(service.ping()).rejects.toThrow('Outage');
    expect(CircuitBreakerManager.getState('recovery-cb')).toBe('OPEN');

    // Wait for resetTimeout to expire
    await sleep(60);

    // Now service has recovered
    shouldFail = false;
    const res = await service.ping();
    expect(res).toBe('healthy');
    expect(CircuitBreakerManager.getState('recovery-cb')).toBe('CLOSED');
  });
});
