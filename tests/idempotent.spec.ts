import { describe, it, expect, beforeEach } from 'vitest';
import { Idempotent, IdempotencyConflictError, CacheManager } from '../index';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('@Idempotent Decorator Suite', () => {
  beforeEach(() => {
    CacheManager.reset();
  });

  it('should execute once and return cached result on duplicate call', async () => {
    let executionCount = 0;

    class PaymentService {
      @Idempotent({ keyGenerator: (orderId: string) => orderId })
      async charge(orderId: string, amount: number) {
        executionCount++;
        return { orderId, charged: amount, txId: `tx_${orderId}_${executionCount}` };
      }
    }

    const service = new PaymentService();
    const res1 = await service.charge('order-101', 500);
    expect(res1).toEqual({ orderId: 'order-101', charged: 500, txId: 'tx_order-101_1' });
    expect(executionCount).toBe(1);

    // Second call with same orderId returns identical response without re-executing
    const res2 = await service.charge('order-101', 500);
    expect(res2).toEqual(res1);
    expect(executionCount).toBe(1);

    // Different orderId executes
    const res3 = await service.charge('order-102', 300);
    expect(res3.orderId).toBe('order-102');
    expect(executionCount).toBe(2);
  });

  it('should throw IdempotencyConflictError on concurrent identical calls', async () => {
    class SlowOrderService {
      @Idempotent({ keyGenerator: (id: string) => id })
      async processOrder(id: string) {
        await sleep(50);
        return { id, status: 'processed' };
      }
    }

    const service = new SlowOrderService();
    const p1 = service.processOrder('concurrent-1');

    // Immediate second call while p1 is PENDING
    await expect(service.processOrder('concurrent-1')).rejects.toThrow(IdempotencyConflictError);

    const res1 = await p1;
    expect(res1).toEqual({ id: 'concurrent-1', status: 'processed' });
  });

  it('should remove pending lock if operation throws, allowing subsequent retry', async () => {
    let attempts = 0;

    class FlakyPaymentService {
      @Idempotent({ keyGenerator: (id: string) => id })
      async tryCharge(id: string) {
        attempts++;
        if (attempts === 1) {
          throw new Error('Card declined on attempt 1');
        }
        return { id, status: 'success' };
      }
    }

    const service = new FlakyPaymentService();

    // 1st attempt fails
    await expect(service.tryCharge('retry-key-1')).rejects.toThrow('Card declined on attempt 1');

    // 2nd attempt should not be blocked by conflict and should succeed
    const res = await service.tryCharge('retry-key-1');
    expect(res).toEqual({ id: 'retry-key-1', status: 'success' });
    expect(attempts).toBe(2);
  });
});
