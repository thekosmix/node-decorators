import { describe, it, expect } from 'vitest';
import { RateLimit, RateLimitError } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@RateLimit Decorator Suite', () => {
  it('should allow calls within the max limit', () => {
    class ApiService {
      @RateLimit({ maxCalls: 3, windowMs: 500 })
      callApi() {
        return 'ok';
      }
    }

    const service = new ApiService();
    expect(service.callApi()).toBe('ok');
    expect(service.callApi()).toBe('ok');
    expect(service.callApi()).toBe('ok');
  });

  it('should throw RateLimitError when limit is exceeded', () => {
    class ApiService {
      @RateLimit({ maxCalls: 2, windowMs: 500, message: 'Too many API requests' })
      callApi() {
        return 'ok';
      }
    }

    const service = new ApiService();
    expect(service.callApi()).toBe('ok');
    expect(service.callApi()).toBe('ok');

    expect(() => service.callApi()).toThrow(RateLimitError);
    expect(() => service.callApi()).toThrow('Too many API requests');
  });

  it('should reset limit after window expires', async () => {
    class ApiService {
      @RateLimit({ maxCalls: 1, windowMs: 50 })
      singleCall() {
        return 'success';
      }
    }

    const service = new ApiService();
    expect(service.singleCall()).toBe('success');
    expect(() => service.singleCall()).toThrow(RateLimitError);

    await sleep(60);

    // After window expires, should succeed again
    expect(service.singleCall()).toBe('success');
  });

  it('should rate limit per key when keyGenerator is provided', () => {
    class MultiUserService {
      @RateLimit({
        maxCalls: 1,
        windowMs: 500,
        keyGenerator: (userId: string) => userId,
      })
      userAction(userId: string) {
        return `done for ${userId}`;
      }
    }

    const service = new MultiUserService();
    expect(service.userAction('userA')).toBe('done for userA');
    // User B should not be blocked by User A
    expect(service.userAction('userB')).toBe('done for userB');

    // User A should be blocked on 2nd call
    expect(() => service.userAction('userA')).toThrow(RateLimitError);
  });
});
