import { AsyncLocalStorage } from 'async_hooks';

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required.') {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied. Insufficient permissions.') {
    super(message);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class SecurityContext {
  private static storage: AsyncLocalStorage<any> = new AsyncLocalStorage();
  private static globalExtractor?: (...args: any[]) => any;

  /**
   * Run a callback within the context of a specific authenticated user.
   */
  static runAs<T>(user: any, callback: () => T): T {
    return this.storage.run(user, callback);
  }

  /**
   * Get the currently active user from the async context.
   */
  static getCurrentUser(): any | undefined {
    return this.storage.getStore();
  }

  /**
   * Configure a global extractor function to retrieve the user from method arguments (e.g. from req.user).
   */
  static setUserExtractor(extractor: (...args: any[]) => any): void {
    this.globalExtractor = extractor;
  }

  static resolveUser(...args: any[]): any {
    if (this.globalExtractor) {
      const extracted = this.globalExtractor(...args);
      if (extracted) return extracted;
    }
    return this.getCurrentUser();
  }
}

export interface AuthorizeOptions {
  /**
   * Allowed roles. User must possess at least one of these roles.
   */
  roles?: string[];
  /**
   * Required permissions. User must possess all specified permissions.
   */
  permissions?: string[];
  /**
   * Custom authorization predicate function.
   */
  custom?: (user: any, ...args: any[]) => boolean | Promise<boolean>;
  /**
   * Custom function to extract user from method arguments.
   */
  userExtractor?: (...args: any[]) => any;
}

/**
 * Enforces role-based and permission-based authorization checks on methods.
 *
 * @example
 * @Authorize({ roles: ['ADMIN', 'MANAGER'] })
 * deleteUser(userId: string) { ... }
 */
export function Authorize(options?: AuthorizeOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let user = options?.userExtractor ? options.userExtractor(...args) : undefined;
      if (!user) {
        user = SecurityContext.resolveUser(...args);
      }

      if (!user) {
        throw new UnauthorizedError(`Authentication required to invoke '${propertyKey}'.`);
      }

      // Check roles
      if (options?.roles && options.roles.length > 0) {
        const userRoles: string[] = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
        const hasRole = options.roles.some((r) => userRoles.includes(r));
        if (!hasRole) {
          throw new ForbiddenError(
            `User does not have required roles [${options.roles.join(', ')}] for '${propertyKey}'.`
          );
        }
      }

      // Check permissions
      if (options?.permissions && options.permissions.length > 0) {
        const userPermissions: string[] = Array.isArray(user.permissions)
          ? user.permissions
          : user.permission
          ? [user.permission]
          : [];
        const hasPermissions = options.permissions.every((p) => userPermissions.includes(p));
        if (!hasPermissions) {
          throw new ForbiddenError(
            `User does not have required permissions [${options.permissions.join(', ')}] for '${propertyKey}'.`
          );
        }
      }

      // Custom check
      if (options?.custom) {
        const customAllowed = await options.custom(user, ...args);
        if (!customAllowed) {
          throw new ForbiddenError(`Custom authorization failed for '${propertyKey}'.`);
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Convenient shorthand decorator for role checks.
 *
 * @example
 * @Roles('ADMIN', 'MODERATOR')
 * banUser(id: string) { ... }
 */
export function Roles(...roles: string[]) {
  return Authorize({ roles });
}
