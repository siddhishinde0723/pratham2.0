import { fetchTenantConfig, TenantConfig } from '../utils/fetchTenantConfig';

class TenantService {
  private static instance: TenantService;
  private tenantId = '';
  private tenantConfig: TenantConfig | null = null; // Use null to match fetchTenantConfig return type
  private storageKey: string;

  private constructor() {
    // Get tenant ID from localStorage (set during login)
    if (typeof window !== 'undefined' && window.localStorage) {
      const tenantId = localStorage.getItem('tenantId');
      console.log('Workspace TenantService: Constructor - localStorage tenantId:', tenantId);
      if (tenantId) {
        this.tenantId = tenantId;
      }
    }
    this.storageKey = `tenantConfig_${this.tenantId}`;
    console.log('Workspace TenantService: Constructor - Final tenantId:', this.tenantId);
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  public getTenantId(): string {
    console.log('Workspace TenantService: getTenantId called, returning:', this.tenantId);
    return this.tenantId;
  }


  public setTenantId(tenantId: string) {
    this.tenantId = tenantId;
    // Store in localStorage for consistency with login process
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('tenantId', tenantId);
    }
  }

  public async getTenantConfig(): Promise<TenantConfig> {
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
