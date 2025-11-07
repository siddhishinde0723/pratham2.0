import { fetchTenantConfig, TenantConfig } from '@/utils/fetchTenantConfig';

class TenantService {
  private static instance: TenantService;
  private tenantId: string = '';
  private tenantConfig: TenantConfig | null = null;

  private constructor() {
    // Get tenant ID from localStorage (set during login)
    if (typeof window !== 'undefined' && window.localStorage) {
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        this.tenantId = tenantId;
      }
    }
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  public setTenantId(tenantId: string) {
    // Clear cached config if tenant ID is changing
    if (this.tenantId !== tenantId) {
      this.tenantConfig = null;
    }
    this.tenantId = tenantId;
    // Store in localStorage for consistency with login process
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('tenantId', tenantId);
    }
  }

  public async getTenantConfig(): Promise<TenantConfig> {
    // Ensure we have a tenant ID
    if (!this.tenantId) {
      const storedTenantId = typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('tenantId')
        : null;
      if (storedTenantId) {
        this.tenantId = storedTenantId;
      }
    }
    
    // Fetch config if not cached
    if (!this.tenantConfig) {
      this.tenantConfig = await fetchTenantConfig(this.tenantId);
    }
    
    if (!this.tenantConfig) {
      throw new Error('Failed to fetch tenant configuration');
    }
    return this.tenantConfig;
  }
}

export default TenantService.getInstance();
