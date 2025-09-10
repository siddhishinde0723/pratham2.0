import Cookies from 'js-cookie';
import { fetchTenantConfig, TenantConfig } from '../utils/fetchTenantConfig';
import { getTenantId, setTenantId } from '../utils/tenantUtils';

class TenantService {
  private static instance: TenantService;
  private tenantId = '';
  private tenantConfig?: TenantConfig; // Use optional type instead of null
  private storageKey: string;

  private constructor() {
    // Initialize with empty tenant ID - will be set dynamically
    this.tenantId = '';
    this.storageKey = `tenantConfig_${this.tenantId}`;
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  public getTenantId(): string {
    // Initialize tenant ID if not set and we're on client side
    if (!this.tenantId && typeof window !== 'undefined') {
      this.initializeTenantId();
    }
    return this.tenantId;
  }

  private initializeTenantId(): void {
    if (typeof window === 'undefined') return;

    // Get from cookies using utility function
    const tenantId = getTenantId() || '';

    this.tenantId = tenantId;
    this.storageKey = `tenantConfig_${this.tenantId}`;
  }

  public setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
    this.storageKey = `tenantConfig_${this.tenantId}`;

    // Store in cookies using utility function
    setTenantId(tenantId);

    // Clear cached config when tenant ID changes
    this.tenantConfig = undefined;
  }

  public async getTenantConfig(): Promise<TenantConfig> {
    // Initialize tenant ID if not set
    if (!this.tenantId && typeof window !== 'undefined') {
      this.initializeTenantId();
    }

    if (!this.tenantId) {
      throw new Error('Tenant ID not set. Please set tenant ID first.');
    }

    // 1. Return if already in memory
    if (this.tenantConfig) {
      return this.tenantConfig;
    }

    // 2. Check cookies (SSR-safe)
    if (typeof window !== 'undefined') {
      const cachedConfig = Cookies.get(this.storageKey);
      if (cachedConfig) {
        this.tenantConfig = JSON.parse(cachedConfig) as TenantConfig;
        return this.tenantConfig;
      }
    }

    // 3. Fetch from API and store in memory + cookies
    const fetchedConfig = await fetchTenantConfig(this.tenantId);
    if (!fetchedConfig) {
      throw new Error('Failed to fetch tenant configuration');
    }

    this.tenantConfig = fetchedConfig;

    // Store in cookies (SSR-safe)
    if (typeof window !== 'undefined') {
      Cookies.set(this.storageKey, JSON.stringify(fetchedConfig), {
        expires: 1,
      }); // 1 day cache
    }

    return this.tenantConfig;
  }
}

export default TenantService;
