export class ValidationError extends Error {
  public details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export type ValidatorFunction = (...args: any[]) => boolean | string | void | Promise<boolean | string | void>;

export interface SchemaValidator {
  parse?: (value: any) => any;
  safeParse?: (value: any) => { success: boolean; data?: any; error?: any };
  validate?: (value: any) => { error?: any; value?: any };
}

export type ValidationTarget = ValidatorFunction | SchemaValidator | (SchemaValidator | ValidatorFunction)[];

/**
 * Validates function arguments before method execution against custom functions or schema libraries (Zod, Joi, etc.).
 *
 * @example
 * // Custom predicate
 * @Validate((email: string) => email.includes('@') || 'Invalid email address')
 * sendEmail(email: string) { ... }
 *
 * @example
 * // Zod schema
 * @Validate(UserCreateSchema)
 * createUser(dto: UserCreateDto) { ... }
 */
export function Validate(validator: ValidationTarget) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 1. Array of validators per argument index
      if (Array.isArray(validator)) {
        for (let i = 0; i < validator.length; i++) {
          const itemValidator = validator[i];
          if (!itemValidator) continue;
          await validateSingle(itemValidator, args[i], i);
        }
      } else {
        // 2. Single validator for entire args or first arg
        await validateSingle(validator, args[0], 0, args);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

async function validateSingle(
  val: ValidatorFunction | SchemaValidator,
  targetValue: any,
  index: number,
  allArgs?: any[]
): Promise<void> {
  // If it's a function
  if (typeof val === 'function') {
    const result = await val(...(allArgs ?? [targetValue]));
    if (result === false) {
      throw new ValidationError(`Validation failed for argument at index ${index}.`);
    }
    if (typeof result === 'string') {
      throw new ValidationError(result);
    }
    return;
  }

  // Zod-like schema (safeParse)
  if (typeof val.safeParse === 'function') {
    const parsed = val.safeParse(targetValue);
    if (!parsed.success) {
      const msg = parsed.error?.errors?.[0]?.message ?? parsed.error?.message ?? 'Validation failed';
      throw new ValidationError(`Validation failed: ${msg}`, parsed.error);
    }
    return;
  }

  // Joi-like schema (validate)
  if (typeof val.validate === 'function') {
    const res = val.validate(targetValue);
    if (res.error) {
      throw new ValidationError(`Validation failed: ${res.error.message}`, res.error);
    }
    return;
  }

  // Zod-like parse
  if (typeof val.parse === 'function') {
    try {
      val.parse(targetValue);
    } catch (err: any) {
      throw new ValidationError(`Validation failed: ${err.message}`, err);
    }
  }
}
