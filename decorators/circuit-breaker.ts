export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
  }
}

export interface CircuitBreakerOptions {
  /**
   * Name/identifier for the circuit breaker. Defaults to ClassName:MethodName.
   */
  name?: string;
  /**
   * Number of consecutive failures before opening the circuit. Defaults to 5.
   */
  failureThreshold?: number;
  /**
   * Milliseconds to wait in OPEN state before transitioning to HALF_OPEN to probe recovery. Defaults to 10000ms.
   */
  resetTimeoutMs?: number;
  /**
   * Number of successful consecutive probe calls in HALF_OPEN state required to re-close the circuit. Defaults to 2.
   */
  halfOpenAttempts?: number;
  /**
   * Optional fallback value or function to invoke when circuit is OPEN.
   */
  fallback?: any | ((err: Error, ...args: any[]) => any);
}

class CircuitBreakerInstance {
  state: CircuitState = 'CLOSED';
  failureCount: number = 0;
  halfOpenSuccesses: number = 0;
  lastFailureTime: number = 0;

  constructor(public options: CircuitBreakerOptions) {}

  checkState(): void {
    const now = Date.now();
    const resetTimeout = this.options.resetTimeoutMs ?? 10000;

    if (this.state === 'OPEN' && now - this.lastFailureTime >= resetTimeout) {
      this.state = 'HALF_OPEN';
      this.halfOpenSuccesses = 0;
    }
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      const required = this.options.halfOpenAttempts ?? 2;
      if (this.halfOpenSuccesses >= required) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.halfOpenSuccesses = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now();
    const threshold = this.options.failureThreshold ?? 5;

    if (this.state === 'HALF_OPEN') {
      // Immediate trip back to OPEN if probe fails
      this.state = 'OPEN';
      this.halfOpenSuccesses = 0;
    } else if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= threshold) {
        this.state = 'OPEN';
      }
    }
  }
}

export class CircuitBreakerManager {
  private static circuits: Map<string, CircuitBreakerInstance> = new Map();

  static getOrCreate(name: string, options: CircuitBreakerOptions): CircuitBreakerInstance {
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = new CircuitBreakerInstance(options);
      this.circuits.set(name, circuit);
    }
    return circuit;
  }

  static getState(name: string): CircuitState | undefined {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.checkState();
      return circuit.state;
    }
    return undefined;
  }

  static reset(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = 'CLOSED';
      circuit.failureCount = 0;
      circuit.halfOpenSuccesses = 0;
      circuit.lastFailureTime = 0;
    }
  }

  static resetAll(): void {
    this.circuits.clear();
  }
}

/**
 * Circuit Breaker decorator protecting downstream services from cascading failure.
 *
 * @example
 * @CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000, fallback: () => [] })
 * async fetchRecommendations(userId: string) { ... }
 */
export function CircuitBreaker(options?: CircuitBreakerOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const circuitName = options?.name ?? `${target?.constructor?.name ?? 'Global'}:${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const circuit = CircuitBreakerManager.getOrCreate(circuitName, options ?? {});
      circuit.checkState();

      if (circuit.state === 'OPEN') {
        const error = new CircuitBreakerOpenError(
          `Circuit breaker '${circuitName}' is OPEN. Fast-failing downstream call.`
        );
        if (options?.fallback !== undefined) {
          return typeof options.fallback === 'function' ? options.fallback(error, ...args) : options.fallback;
        }
        throw error;
      }

      try {
        const result = await originalMethod.apply(this, args);
        circuit.recordSuccess();
        return result;
      } catch (err: any) {
        circuit.recordFailure();
        if ((circuit.state as CircuitState) === 'OPEN' && options?.fallback !== undefined) {
          return typeof options.fallback === 'function' ? options.fallback(err, ...args) : options.fallback;
        }
        throw err;
      }
    };

    return descriptor;
  };
}
