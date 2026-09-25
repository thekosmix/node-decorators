import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlag, FeatureDisabledError, FeatureFlagManager } from '../index';

describe('@FeatureFlag Decorator Suite', () => {
  beforeEach(() => {
    FeatureFlagManager.reset();
  });

  it('should execute method when feature flag is enabled', async () => {
    FeatureFlagManager.setFlag('beta-dashboard', true);

    class DashboardService {
      @FeatureFlag('beta-dashboard')
      getDashboard() {
        return 'new-dashboard-data';
      }
    }

    const service = new DashboardService();
    expect(await service.getDashboard()).toBe('new-dashboard-data');
  });

  it('should throw FeatureDisabledError when flag is disabled and no fallback is given', async () => {
    FeatureFlagManager.setFlag('beta-dashboard', false);

    class DashboardService {
      @FeatureFlag('beta-dashboard')
      getDashboard() {
        return 'new-dashboard-data';
      }
    }

    const service = new DashboardService();
    await expect(service.getDashboard()).rejects.toThrow(FeatureDisabledError);
  });

  it('should invoke fallback when feature flag is disabled', async () => {
    FeatureFlagManager.setFlag('ai-summary', false);

    class ReportService {
      @FeatureFlag('ai-summary', {
        fallback: (reportId: string) => `legacy-summary-for-${reportId}`,
      })
      generateSummary(reportId: string) {
        return `ai-generated-${reportId}`;
      }
    }

    const service = new ReportService();
    expect(await service.generateSummary('rep-1')).toBe('legacy-summary-for-rep-1');
  });

  it('should support dynamic provider with context extraction', async () => {
    // Dynamic provider enabling flag only for tenant 'vip'
    FeatureFlagManager.setProvider((flag, context) => {
      if (flag === 'early-access' && context?.tenantId === 'vip') {
        return true;
      }
      return false;
    });

    class TenantService {
      @FeatureFlag('early-access', {
        contextExtractor: (tenantId: string) => ({ tenantId }),
        fallback: () => 'standard-feature',
      })
      accessFeature(tenantId: string) {
        return 'vip-feature';
      }
    }

    const service = new TenantService();
    expect(await service.accessFeature('standard-tenant')).toBe('standard-feature');
    expect(await service.accessFeature('vip')).toBe('vip-feature');
  });
});
