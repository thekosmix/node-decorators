import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Audit, AuditManager, AuditRecord } from '../index';

describe('@Audit Decorator Suite', () => {
  let auditSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    auditSpy = vi.fn();
    AuditManager.setHandler(auditSpy);
  });

  it('should capture audit record upon successful operation', async () => {
    class UserService {
      @Audit({
        action: 'UPDATE_USER_ROLE',
        actor: (adminId) => adminId,
        target: (_, targetUserId) => targetUserId,
      })
      changeRole(adminId: string, targetUserId: string, newRole: string) {
        return { updated: true, newRole };
      }
    }

    const service = new UserService();
    const result = await service.changeRole('admin-1', 'user-99', 'MANAGER');

    expect(result).toEqual({ updated: true, newRole: 'MANAGER' });
    expect(auditSpy).toHaveBeenCalledOnce();

    const record: AuditRecord = auditSpy.mock.calls[0][0];
    expect(record.action).toBe('UPDATE_USER_ROLE');
    expect(record.actorId).toBe('admin-1');
    expect(record.targetId).toBe('user-99');
    expect(record.status).toBe('SUCCESS');
    expect(record.inputs).toEqual(['admin-1', 'user-99', 'MANAGER']);
    expect(record.output).toEqual({ updated: true, newRole: 'MANAGER' });
    expect(record.durationMs).toBeGreaterThanOrEqual(0);
    expect(record.timestamp).toBeDefined();
  });

  it('should capture audit record with status FAILED when method throws', async () => {
    class SecurityService {
      @Audit({ action: 'PURGE_LOGS' })
      purge() {
        throw new Error('Database locked');
      }
    }

    const service = new SecurityService();
    await expect(service.purge()).rejects.toThrow('Database locked');

    expect(auditSpy).toHaveBeenCalledOnce();
    const record: AuditRecord = auditSpy.mock.calls[0][0];
    expect(record.action).toBe('PURGE_LOGS');
    expect(record.status).toBe('FAILED');
    expect(record.error).toBe('Database locked');
  });
});
