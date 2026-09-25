import { describe, it, expect, vi } from 'vitest';
import { Retry } from '../index';

describe('@Retry Decorator Suite', () => {
  it('should succeed on first try if no error occurs', async () => {
    let callCount = 0;

    class Service {
      @Retry({ maxAttempts: 3, delayMs: 10 })
      async work() {
        callCount++;
        return 'success';
      }
    }

    const service = new Service();
    const result = await service.work();
    expect(result).toBe('success');
    expect(callCount).toBe(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    let callCount = 0;
    const retrySpy = vi.fn();

    class Service {
      @Retry({ maxAttempts: 4, delayMs: 10, backoffMultiplier: 1.5, onRetry: retrySpy })
      async flakyCall() {
        callCount++;
        if (callCount < 3) {
          throw new Error(`Temporary failure attempt ${callCount}`);
        }
        return 'recovered';
      }
    }

    const service = new Service();
    const result = await service.flakyCall();
    expect(result).toBe('recovered');
    expect(callCount).toBe(3);
    expect(retrySpy).toHaveBeenCalledTimes(2);
  });

  it('should throw if maxAttempts is exceeded', async () => {
    let callCount = 0;

    class Service {
      @Retry({ maxAttempts: 3, delayMs: 10 })
      async permanentFailure() {
        callCount++;
        throw new Error('Fatal error');
      }
    }

    const service = new Service();
    await expect(service.permanentFailure()).rejects.toThrow('Fatal error');
    expect(callCount).toBe(3);
  });

  it('should respect retryIf predicate', async () => {
    let callCount = 0;

    class Service {
      @Retry({
        maxAttempts: 3,
        delayMs: 10,
        retryIf: (err) => err.message === 'retryable',
      })
      async testPredicate(msg: string) {
        callCount++;
        throw new Error(msg);
      }
    }

    const service = new Service();

    // Non-retryable error should fail immediately on attempt 1
    await expect(service.testPredicate('non-retryable')).rejects.toThrow('non-retryable');
    expect(callCount).toBe(1);

    // Retryable error should retry up to 3 times
    callCount = 0;
    await expect(service.testPredicate('retryable')).rejects.toThrow('retryable');
    expect(callCount).toBe(3);
  });
});
