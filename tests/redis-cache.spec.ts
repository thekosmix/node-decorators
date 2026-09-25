import { describe, it, expect, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import { Cache, CacheEvict, CachePut, CacheManager, RedisCacheStore } from '../index';

describe('Redis Cache Integration Suite', () => {
  let redisClient: any;

  beforeEach(() => {
    CacheManager.reset();
    redisClient = new RedisMock();
    const redisStore = new RedisCacheStore(redisClient);
    CacheManager.registerStore('redis', redisStore);
  });

  it('should cache and retrieve values from Redis store', async () => {
    let callCount = 0;

    class ProductService {
      @Cache({ store: 'redis', bucket: 'products', ttl: 60 })
      async getProduct(id: string) {
        callCount++;
        return { id, name: `Product-${id}`, price: 99 };
      }
    }

    const service = new ProductService();

    const p1 = await service.getProduct('p1');
    expect(p1).toEqual({ id: 'p1', name: 'Product-p1', price: 99 });
    expect(callCount).toBe(1);

    // Second call should return from Redis cache
    const p2 = await service.getProduct('p1');
    expect(p2).toEqual({ id: 'p1', name: 'Product-p1', price: 99 });
    expect(callCount).toBe(1);

    // Verify key in mock redis
    const rawVal = await redisClient.get('nd:products:p1');
    expect(rawVal).toBeDefined();
    expect(JSON.parse(rawVal)).toEqual({ id: 'p1', name: 'Product-p1', price: 99 });
  });

  it('should evict keys from Redis store with @CacheEvict', async () => {
    let callCount = 0;

    class ProductService {
      @Cache({ store: 'redis', bucket: 'products' })
      async getProduct(id: string) {
        callCount++;
        return { id, name: `Product-${id}` };
      }

      @CacheEvict({ store: 'redis', bucket: 'products' })
      async removeProduct(id: string) {}
    }

    const service = new ProductService();
    await service.getProduct('p99');
    expect(callCount).toBe(1);

    await service.removeProduct('p99');

    // Key should be gone
    const rawVal = await redisClient.get('nd:products:p99');
    expect(rawVal).toBeNull();

    // Calling again should recompute
    await service.getProduct('p99');
    expect(callCount).toBe(2);
  });

  it('should clear entire Redis bucket with @CacheEvict allEntries', async () => {
    class ProductService {
      @Cache({ store: 'redis', bucket: 'catalog' })
      async getCatalog(category: string) {
        return { category };
      }

      @CacheEvict({ store: 'redis', bucket: 'catalog', allEntries: true })
      async clearCatalog() {}
    }

    const service = new ProductService();
    await service.getCatalog('books');
    await service.getCatalog('electronics');

    expect(await redisClient.get('nd:catalog:books')).not.toBeNull();
    expect(await redisClient.get('nd:catalog:electronics')).not.toBeNull();

    await service.clearCatalog();

    expect(await redisClient.get('nd:catalog:books')).toBeNull();
    expect(await redisClient.get('nd:catalog:electronics')).toBeNull();
  });

  it('should update Redis cache directly with @CachePut', async () => {
    class ProductService {
      @Cache({ store: 'redis', bucket: 'inventory' })
      async getStock(sku: string) {
        return 10;
      }

      @CachePut({
        store: 'redis',
        bucket: 'inventory',
        keyGenerator: (sku: string, qty: number) => sku,
      })
      async setStock(sku: string, qty: number) {
        return qty;
      }
    }

    const service = new ProductService();
    expect(await service.getStock('SKU1')).toBe(10);

    await service.setStock('SKU1', 50);

    // Reading from cache should return 50
    expect(await service.getStock('SKU1')).toBe(50);
  });
});
