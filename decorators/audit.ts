export interface AuditRecord {
  action: string;
  actorId?: string;
  targetId?: string;
  timestamp: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
  inputs?: any[];
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export type AuditHandler = (record: AuditRecord) => void | Promise<void>;

export class AuditManager {
  private static handler: AuditHandler = (record) => {
    console.log(`[AUDIT] [${record.status}] ${record.action} by ${record.actorId ?? 'anonymous'} on ${record.targetId ?? 'N/A'}`);
  };

  /**
   * Set custom audit event handler (e.g. write to audit DB table, Kafka, or SIEM system).
   */
  static setHandler(handler: AuditHandler): void {
    this.handler = handler;
  }

  static async dispatch(record: AuditRecord): Promise<void> {
    if (this.handler) {
      await this.handler(record);
    }
  }

  static reset(): void {
    this.handler = (record) => {
      console.log(`[AUDIT] [${record.status}] ${record.action} by ${record.actorId ?? 'anonymous'} on ${record.targetId ?? 'N/A'}`);
    };
  }
}

export interface AuditOptions {
  /**
   * Action name. Defaults to property/method name.
   */
  action?: string;
  /**
   * Actor ID or extractor function from method arguments.
   */
  actor?: string | ((...args: any[]) => string);
  /**
   * Target resource ID or extractor function from method arguments.
   */
  target?: string | ((...args: any[]) => string);
  /**
   * Whether to record input arguments. Defaults to true.
   */
  captureInputs?: boolean;
  /**
   * Whether to record method return result. Defaults to true.
   */
  captureOutput?: boolean;
}

/**
 * Audit trail decorator tracking security-relevant actions for compliance.
 *
 * @example
 * @Audit({ action: 'UPDATE_ROLE', actor: (adminId) => adminId, target: (_, userId) => userId })
 * assignRole(adminId: string, userId: string, role: string) { ... }
 */
export function Audit(options?: AuditOptions) {
  const captureInputs = options?.captureInputs ?? true;
  const captureOutput = options?.captureOutput ?? true;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const action = options?.action ?? propertyKey;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const timestamp = new Date().toISOString();

      let actorId: string | undefined;
      if (typeof options?.actor === 'function') {
        actorId = options.actor(...args);
      } else if (typeof options?.actor === 'string') {
        actorId = options.actor;
      }

      let targetId: string | undefined;
      if (typeof options?.target === 'function') {
        targetId = options.target(...args);
      } else if (typeof options?.target === 'string') {
        targetId = options.target;
      }

      try {
        const result = await originalMethod.apply(this, args);
        const durationMs = performance.now() - start;

        await AuditManager.dispatch({
          action,
          actorId,
          targetId,
          timestamp,
          durationMs,
          status: 'SUCCESS',
          inputs: captureInputs ? args : undefined,
          output: captureOutput ? result : undefined,
        });

        return result;
      } catch (err: any) {
        const durationMs = performance.now() - start;

        await AuditManager.dispatch({
          action,
          actorId,
          targetId,
          timestamp,
          durationMs,
          status: 'FAILED',
          inputs: captureInputs ? args : undefined,
          error: err?.message ?? String(err),
        });

        throw err;
      }
    };

    return descriptor;
  };
}
