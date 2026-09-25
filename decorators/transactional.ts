import { AsyncLocalStorage } from 'async_hooks';

export interface ITransactionProvider {
  beginTransaction(): Promise<any>;
  commit(tx: any): Promise<void>;
  rollback(tx: any): Promise<void>;
}

export class TransactionManager {
  private static provider?: ITransactionProvider;
  private static storage: AsyncLocalStorage<any> = new AsyncLocalStorage();

  /**
   * Set the database transaction provider (e.g. Prisma, TypeORM, Knex adapter).
   */
  static setProvider(provider: ITransactionProvider): void {
    this.provider = provider;
  }

  /**
   * Get the currently active transaction context in the current async execution chain.
   */
  static getTransaction(): any | undefined {
    return this.storage.getStore();
  }

  /**
   * Reset the transaction provider (useful for testing).
   */
  static reset(): void {
    this.provider = undefined;
  }

  /**
   * Execute a function within a managed transaction context.
   */
  static async runInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    if (!this.provider) {
      throw new Error(
        'No transaction provider configured. Please register one via TransactionManager.setProvider(...).'
      );
    }

    const currentTx = this.getTransaction();
    if (currentTx) {
      // Re-use existing outer transaction (Propagation: REQUIRED)
      return callback(currentTx);
    }

    const tx = await this.provider.beginTransaction();

    return this.storage.run(tx, async () => {
      try {
        const result = await callback(tx);
        await this.provider!.commit(tx);
        return result;
      } catch (err) {
        await this.provider!.rollback(tx);
        throw err;
      }
    });
  }
}

/**
 * Wraps a method in an automated database transaction with atomic commit and rollback on error.
 * Propagates the active transaction context through Node.js AsyncLocalStorage.
 *
 * @example
 * @Transactional()
 * async transferMoney(fromId: string, toId: string, amount: number) {
 *   const tx = TransactionManager.getTransaction();
 *   // execute queries using tx
 * }
 */
export function Transactional() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return TransactionManager.runInTransaction(async (_tx) => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
