import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transactional, TransactionManager, ITransactionProvider } from '../index';

describe('@Transactional Decorator Suite', () => {
  let mockProvider: ITransactionProvider;

  beforeEach(() => {
    TransactionManager.reset();
    mockProvider = {
      beginTransaction: vi.fn().mockResolvedValue({ id: 'mock-tx-1' }),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should commit transaction upon successful method execution', async () => {
    TransactionManager.setProvider(mockProvider);

    class UserService {
      @Transactional()
      async createUser(name: string) {
        const tx = TransactionManager.getTransaction();
        expect(tx).toEqual({ id: 'mock-tx-1' });
        return { id: 'u1', name };
      }
    }

    const service = new UserService();
    const result = await service.createUser('Alice');

    expect(result).toEqual({ id: 'u1', name: 'Alice' });
    expect(mockProvider.beginTransaction).toHaveBeenCalledOnce();
    expect(mockProvider.commit).toHaveBeenCalledWith({ id: 'mock-tx-1' });
    expect(mockProvider.rollback).not.toHaveBeenCalled();
  });

  it('should rollback transaction and rethrow error upon failure', async () => {
    TransactionManager.setProvider(mockProvider);

    class TransferService {
      @Transactional()
      async transfer() {
        throw new Error('Insufficient funds');
      }
    }

    const service = new TransferService();
    await expect(service.transfer()).rejects.toThrow('Insufficient funds');

    expect(mockProvider.beginTransaction).toHaveBeenCalledOnce();
    expect(mockProvider.rollback).toHaveBeenCalledWith({ id: 'mock-tx-1' });
    expect(mockProvider.commit).not.toHaveBeenCalled();
  });

  it('should reuse existing outer transaction in nested calls', async () => {
    TransactionManager.setProvider(mockProvider);

    class NestedService {
      @Transactional()
      async outer() {
        const outerTx = TransactionManager.getTransaction();
        const innerResult = await this.inner();
        return { outerTx, innerResult };
      }

      @Transactional()
      async inner() {
        return TransactionManager.getTransaction();
      }
    }

    const service = new NestedService();
    const res = await service.outer();

    // Inner method reused the same transaction
    expect(res.outerTx).toEqual({ id: 'mock-tx-1' });
    expect(res.innerResult).toEqual({ id: 'mock-tx-1' });

    // Only 1 transaction was begun and 1 committed
    expect(mockProvider.beginTransaction).toHaveBeenCalledOnce();
    expect(mockProvider.commit).toHaveBeenCalledOnce();
  });
});
