import Cookies from "js-cookie";
import { fetchTenantConfig, TenantConfig } from "../utils/fetchTenantConfig";

class TenantService {
  private static instance: TenantService;
  private tenantId: string = "";
  private tenantConfig?: TenantConfig; // Use optional type instead of null
  private storageKey: string;

  private constructor() {
    this.tenantId =
      Cookies.get('tenantId') || localStorage.getItem('tenantId') || '';
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
      throw new Error("Failed to fetch tenant configuration");
    }

    this.tenantConfig = fetchedConfig;
    localStorage.setItem(this.storageKey, JSON.stringify(fetchedConfig));

    return this.tenantConfig;
  }
}

export default TenantService.getInstance();
