import { ICacheStore } from './types';
import { MemoryCacheStore } from './memory-store';

export class CacheManager {
  private static stores: Map<string, ICacheStore> = new Map();
  private static defaultStoreName: string = 'memory';

  static {
    // Register the default in-memory store
    this.stores.set('memory', new MemoryCacheStore());
  }

  /**
   * Register a named cache store adapter (e.g. 'redis', 'memory', or a custom store).
   */
  static registerStore(name: string, store: ICacheStore): void {
    this.stores.set(name, store);
  }

  /**
   * Set the default store name used when no store is specified on decorators.
   */
  static setDefaultStore(name: string): void {
    if (!this.stores.has(name)) {
      throw new Error(`Cannot set default cache store to '${name}'. Store is not registered.`);
    }
    this.defaultStoreName = name;
  }

  /**
   * Get a cache store by name, or the default store if no name is provided.
   */
  static getStore(name?: string): ICacheStore {
    const storeName = name ?? this.defaultStoreName;
    const store = this.stores.get(storeName);
    if (!store) {
      throw new Error(
        `Cache store '${storeName}' not found. Ensure it was registered via CacheManager.registerStore('${storeName}', store).`
      );
    }
    return store;
  }

  /**
   * Reset CacheManager back to default state (useful for tests).
   */
  static reset(): void {
    this.stores.clear();
    this.stores.set('memory', new MemoryCacheStore());
    this.defaultStoreName = 'memory';
  }
}
