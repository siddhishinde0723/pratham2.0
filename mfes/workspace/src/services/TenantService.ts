import Cookies from 'js-cookie';
import {
  fetchTenantConfig,
  TenantConfig,
} from '@workspace/utils/fetchTenantConfig';

class TenantService {
  private static instance: TenantService;
  private tenantId: string = '';
  private tenantConfig?: TenantConfig; // Use optional type instead of null
  private storageKey: string;

  private constructor() {
    // Get tenant ID from localStorage first (client-side), then cookies (server-side)
    let tenantId = '';

    if (typeof window !== 'undefined') {
      // Client-side: get from localStorage first, then cookies
      tenantId =
        localStorage.getItem('tenantId') || Cookies.get('tenantId') || '';

      // If we have a tenant ID from localStorage but not in cookies, sync it
      if (tenantId && !Cookies.get('tenantId')) {
        Cookies.set('tenantId', tenantId, { expires: 7 }); // Expires in 7 days
      }
    } else {
      // Server-side: get from cookies only
      tenantId = Cookies.get('tenantId') || '';
    }

    this.tenantId = tenantId;
    this.storageKey = `tenantConfig_${this.tenantId}`;
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

  public setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
    this.storageKey = `tenantConfig_${this.tenantId}`;

    // Store in both localStorage and cookies
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenantId', tenantId);
      Cookies.set('tenantId', tenantId, { expires: 7 });
    }

    // Clear cached config when tenant ID changes
    this.tenantConfig = undefined;
  }

  public async getTenantConfig(): Promise<TenantConfig> {
    // 1. Return if already in memory
    if (this.tenantConfig) {
      return this.tenantConfig;
    }

    // 2. Check localStorage
    const cachedConfig = localStorage.getItem(this.storageKey);
    if (cachedConfig) {
      this.tenantConfig = JSON.parse(cachedConfig) as TenantConfig;
      return this.tenantConfig;
    }

    // 3. Fetch from API and store in memory + localStorage
    const fetchedConfig = await fetchTenantConfig(this.tenantId);
    if (!fetchedConfig) {
      throw new Error('Failed to fetch tenant configuration');
    }

    this.tenantConfig = fetchedConfig;
    localStorage.setItem(this.storageKey, JSON.stringify(fetchedConfig));

    return this.tenantConfig;
  }
}

export default TenantService.getInstance();
