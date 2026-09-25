import { describe, it, expect } from 'vitest';
import { Catch, Fallback } from '../index';

class CustomError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'CustomError';
  }
}

describe('@Catch & @Fallback Decorator Suite', () => {
  it('should intercept error and return handler value for sync method', () => {
    class CalcService {
      @Catch((err, a, b) => ({ caught: true, message: err.message, inputs: [a, b] }))
      divide(a: number, b: number) {
        if (b === 0) {
          throw new Error('Division by zero');
        }
        return a / b;
      }
    }

    const service = new CalcService();
    expect(service.divide(10, 2)).toBe(5);

    const fallbackResult = service.divide(10, 0);
    expect(fallbackResult).toEqual({
      caught: true,
      message: 'Division by zero',
      inputs: [10, 0],
    });
  });

  it('should intercept rejected promise for async method', async () => {
    class NetworkService {
      @Catch((err) => ({ status: 'recovered', reason: err.message }))
      async fetchRemote() {
        throw new Error('Network timeout');
      }
    }

    const service = new NetworkService();
    const result = await service.fetchRemote();
    expect(result).toEqual({ status: 'recovered', reason: 'Network timeout' });
  });

  it('should filter by error type and rethrow unmatched errors', () => {
    class GuardService {
      @Catch(() => 'handled-custom', CustomError)
      run(errorKind: 'custom' | 'generic') {
        if (errorKind === 'custom') {
          throw new CustomError('Specific error');
        }
        throw new TypeError('Generic type error');
      }
    }

    const service = new GuardService();
    expect(service.run('custom')).toBe('handled-custom');
    expect(() => service.run('generic')).toThrow(TypeError);
  });

  it('should return fallback value with @Fallback', () => {
    class ConfigService {
      @Fallback({ theme: 'default' })
      loadUserConfig() {
        throw new Error('Config file corrupted');
      }

      @Fallback((fallbackArg: string) => `fallback-${fallbackArg}`)
      computeDynamic(id: string) {
        throw new Error('Failed');
      }
    }

    const service = new ConfigService();
    expect(service.loadUserConfig()).toEqual({ theme: 'default' });
    expect(service.computeDynamic('item1')).toBe('fallback-item1');
  });
});
