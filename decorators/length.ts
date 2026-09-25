/**
 * Validates the length of a string or array property on a class.
 * Throws an Error if the assigned value violates the length constraints.
 *
 * @param min Minimum allowable length (default: -1, meaning no minimum)
 * @param max Maximum allowable length (default: -1, meaning no maximum)
 *
 * @example
 * class User {
 *   @Length(3, 20)
 *   username: string;
 * }
 */
export function Length(min: number = -1, max: number = -1) {
  return function (target: any, propertyKey: string) {
    const valueSymbol = Symbol(`__length_${propertyKey}`);

    Object.defineProperty(target, propertyKey, {
      get() {
        return this[valueSymbol];
      },
      set(newValue: any) {
        if (newValue !== undefined && newValue !== null) {
          const length = typeof newValue.length === 'number' ? newValue.length : String(newValue).length;
          if (min >= 0 && length < min) {
            throw new Error(`Property '${propertyKey}' length (${length}) must be at least ${min}`);
          }
          if (max >= 0 && length > max) {
            throw new Error(`Property '${propertyKey}' length (${length}) must be at most ${max}`);
          }
        }
        this[valueSymbol] = newValue;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
