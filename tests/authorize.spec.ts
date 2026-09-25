import { describe, it, expect } from 'vitest';
import { Authorize, Roles, UnauthorizedError, ForbiddenError, SecurityContext } from '../index';

describe('@Authorize & @Roles Decorator Suite', () => {
  class DocumentService {
    @Authorize({ roles: ['ADMIN', 'EDITOR'] })
    editDocument(docId: string) {
      return `Edited ${docId}`;
    }

    @Roles('ADMIN')
    deleteDocument(docId: string) {
      return `Deleted ${docId}`;
    }

    @Authorize({ permissions: ['docs:publish'] })
    publishDocument(docId: string) {
      return `Published ${docId}`;
    }

    @Authorize({
      custom: (user, docOwnerId) => user.id === docOwnerId || user.roles?.includes('ADMIN'),
    })
    viewPrivate(docOwnerId: string) {
      return `Viewing document of ${docOwnerId}`;
    }
  }

  const service = new DocumentService();

  it('should throw UnauthorizedError if no user is logged in', async () => {
    await expect(service.editDocument('doc-1')).rejects.toThrow(UnauthorizedError);
  });

  it('should throw ForbiddenError if user lacks required role', async () => {
    const viewer = { id: 'u1', roles: ['VIEWER'] };

    await SecurityContext.runAs(viewer, async () => {
      await expect(service.editDocument('doc-1')).rejects.toThrow(ForbiddenError);
    });
  });

  it('should allow access if user possesses at least one required role', async () => {
    const editor = { id: 'u2', roles: ['EDITOR'] };

    await SecurityContext.runAs(editor, async () => {
      const res = await service.editDocument('doc-1');
      expect(res).toBe('Edited doc-1');
    });
  });

  it('should support @Roles shortcut decorator', async () => {
    const admin = { id: 'u3', roles: ['ADMIN'] };
    const editor = { id: 'u4', roles: ['EDITOR'] };

    await SecurityContext.runAs(editor, async () => {
      await expect(service.deleteDocument('doc-1')).rejects.toThrow(ForbiddenError);
    });

    await SecurityContext.runAs(admin, async () => {
      expect(await service.deleteDocument('doc-1')).toBe('Deleted doc-1');
    });
  });

  it('should enforce permission checks', async () => {
    const publisher = { id: 'u5', permissions: ['docs:publish'] };
    const nonPublisher = { id: 'u6', permissions: ['docs:read'] };

    await SecurityContext.runAs(nonPublisher, async () => {
      await expect(service.publishDocument('doc-1')).rejects.toThrow(ForbiddenError);
    });

    await SecurityContext.runAs(publisher, async () => {
      expect(await service.publishDocument('doc-1')).toBe('Published doc-1');
    });
  });

  it('should support custom authorization logic with method arguments', async () => {
    const owner = { id: 'owner-123', roles: ['USER'] };
    const stranger = { id: 'stranger-456', roles: ['USER'] };

    await SecurityContext.runAs(stranger, async () => {
      await expect(service.viewPrivate('owner-123')).rejects.toThrow(ForbiddenError);
    });

    await SecurityContext.runAs(owner, async () => {
      expect(await service.viewPrivate('owner-123')).toBe('Viewing document of owner-123');
    });
  });
});
