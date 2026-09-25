export class FeatureDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeatureDisabledError';
    Object.setPrototypeOf(this, FeatureDisabledError.prototype);
  }
}

export type FeatureFlagProvider = (flagName: string, context?: any) => boolean | Promise<boolean>;

export class FeatureFlagManager {
  private static staticFlags: Map<string, boolean> = new Map();
  private static provider?: FeatureFlagProvider;

  /**
   * Set a dynamic feature flag provider (e.g. LaunchDarkly, Unleash, or DB-driven).
   */
  static setProvider(provider: FeatureFlagProvider): void {
    this.provider = provider;
  }

  /**
   * Set or override a static feature flag state (useful for testing or config-driven setups).
   */
  static setFlag(flagName: string, enabled: boolean): void {
    this.staticFlags.set(flagName, enabled);
  }

  /**
   * Check whether a feature flag is enabled.
   */
  static async isEnabled(flagName: string, context?: any): Promise<boolean> {
    if (this.provider) {
      return this.provider(flagName, context);
    }
    return this.staticFlags.get(flagName) ?? false;
  }

  /**
   * Reset static flags and custom provider.
   */
  static reset(): void {
    this.staticFlags.clear();
    this.provider = undefined;
  }
}

export interface FeatureFlagOptions {
  /**
   * Fallback value or method to invoke if feature flag is disabled.
   */
  fallback?: any | ((...args: any[]) => any);
  /**
   * Function to extract context (e.g. tenantId, userId) to pass to the flag provider.
   */
  contextExtractor?: (...args: any[]) => any;
}

/**
 * Conditionally executes a method only if the specified feature flag is enabled.
 * If disabled, returns a fallback value/method or throws FeatureDisabledError.
 *
 * @example
 * @FeatureFlag('new-checkout-flow', { fallback: () => ({ legacy: true }) })
 * checkout(cart: Cart) { ... }
 */
export function FeatureFlag(flagName: string, options?: FeatureFlagOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = options?.contextExtractor ? options.contextExtractor(...args) : undefined;
      const enabled = await FeatureFlagManager.isEnabled(flagName, context);

      if (!enabled) {
        if (options?.fallback !== undefined) {
          return typeof options.fallback === 'function' ? options.fallback(...args) : options.fallback;
        }
        throw new FeatureDisabledError(`Feature flag '${flagName}' is disabled for '${propertyKey}'.`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
