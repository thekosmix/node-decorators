import { describe, it, expect, beforeEach } from 'vitest';
import { Cache, CacheEvict, CachePut, CacheManager } from '../index';

describe('@Cache Decorator Suite', () => {
  beforeEach(() => {
    CacheManager.reset();
  });

  it('should cache synchronous method results', () => {
    let callCount = 0;

    class TestService {
      @Cache('test-bucket')
      calculate(x: number): number {
        callCount++;
        return x * 2;
      }
    }

    const service = new TestService();

    expect(service.calculate(5)).toBe(10);
    expect(callCount).toBe(1);

    // Should return cached result without calling method again
    expect(service.calculate(5)).toBe(10);
    expect(callCount).toBe(1);

    // Different argument should compute and cache
    expect(service.calculate(6)).toBe(12);
    expect(callCount).toBe(2);
  });

  it('should cache asynchronous method results', async () => {
    let callCount = 0;

    class AsyncService {
      @Cache({ bucket: 'async-bucket' })
      async fetchUser(id: string): Promise<{ id: string; name: string }> {
        callCount++;
        return { id, name: `User_${id}` };
      }
    }

    const service = new AsyncService();

    const res1 = await service.fetchUser('u1');
    expect(res1).toEqual({ id: 'u1', name: 'User_u1' });
    expect(callCount).toBe(1);

    const res2 = await service.fetchUser('u1');
    expect(res2).toEqual({ id: 'u1', name: 'User_u1' });
    expect(callCount).toBe(1);
  });

  it('should support custom key generator', () => {
    let callCount = 0;

    class KeyService {
      @Cache({
        bucket: 'custom-key',
        keyGenerator: (obj: { id: string }) => `custom_${obj.id}`,
      })
      process(obj: { id: string; data: string }): string {
        callCount++;
        return obj.data;
      }
    }

    const service = new KeyService();
    expect(service.process({ id: '1', data: 'hello' })).toBe('hello');
    expect(callCount).toBe(1);

    expect(service.process({ id: '1', data: 'changed' })).toBe('hello');
    expect(callCount).toBe(1);
  });

  it('should evict specific cache key with @CacheEvict', () => {
    let getCount = 0;

    class ItemService {
      @Cache('items')
      getItem(id: string): string {
        getCount++;
        return `item-${id}`;
      }

      @CacheEvict('items')
      deleteItem(id: string): void {
        // delete logic
      }
    }

    const service = new ItemService();
    expect(service.getItem('100')).toBe('item-100');
    expect(getCount).toBe(1);

    // Call delete to evict
    service.deleteItem('100');

    // Next call should recompute
    expect(service.getItem('100')).toBe('item-100');
    expect(getCount).toBe(2);
  });

  it('should clear all entries in bucket with @CacheEvict allEntries', () => {
    let getCount = 0;

    class ItemService {
      @Cache('clearable')
      getItem(id: string): string {
        getCount++;
        return `item-${id}`;
      }

      @CacheEvict({ bucket: 'clearable', allEntries: true })
      clearAll(): void {}
    }

    const service = new ItemService();
    service.getItem('1');
    service.getItem('2');
    expect(getCount).toBe(2);

    service.clearAll();

    service.getItem('1');
    service.getItem('2');
    expect(getCount).toBe(4);
  });

  it('should update cache value with @CachePut', () => {
    let getCount = 0;

    class UserService {
      @Cache('users')
      getUser(id: string): string {
        getCount++;
        return `user-${id}`;
      }

      @CachePut({
        bucket: 'users',
        keyGenerator: (id: string, newName: string) => id,
      })
      updateUser(id: string, newName: string): string {
        return newName;
      }
    }

    const service = new UserService();
    expect(service.getUser('1')).toBe('user-1');
    expect(getCount).toBe(1);

    // Update with CachePut
    const updated = service.updateUser('1', 'Alice');
    expect(updated).toBe('Alice');

    // Getting user should now return updated cached value without calling getUser
    expect(service.getUser('1')).toBe('Alice');
    expect(getCount).toBe(1);
  });
});
