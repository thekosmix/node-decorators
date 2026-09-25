import { describe, it, expect } from 'vitest';
import { Async } from '../index';

describe('@Async Decorator Suite', () => {
  it('should execute asynchronously and resolve with return value', async () => {
    let order: string[] = [];

    class JobService {
      @Async
      runJob(name: string) {
        order.push(`job-run-${name}`);
        return `result-${name}`;
      }
    }

    const service = new JobService();
    const promise = service.runJob('alpha');

    order.push('after-call');

    // 'after-call' should be recorded before 'job-run-alpha' due to asynchronous tick
    expect(order).toEqual(['after-call']);

    const res = await promise;
    expect(res).toBe('result-alpha');
    expect(order).toEqual(['after-call', 'job-run-alpha']);
  });
});
