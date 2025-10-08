import { TenantName } from './app.constant';

/**
 * Maps tenant IDs to their corresponding tenant names
 * This is used to determine which menu configuration to use
 */
export const TENANT_ID_TO_NAME_MAP: Record<string, TenantName> = {
  '35529b5d-526f-4da5-bc6e-64f740023d26': TenantName.SWADHAAR,
  // Add other tenant ID mappings as needed
  // 'other-tenant-id': TenantName.OTHER_TENANT,
};

/**
 * Gets the tenant name from tenant ID
 * @param tenantId - The tenant ID
 * @returns The corresponding tenant name or null if not found
 */
export const getTenantNameFromId = (tenantId: string): TenantName | null => {
  return TENANT_ID_TO_NAME_MAP[tenantId] || null;
};

/**
 * Gets the tenant name from localStorage or tenant ID
 * This function tries to get the tenant name from localStorage first,
 * and if not found, tries to map from tenant ID
 * @returns The tenant name or null if not found
 */
export const getCurrentTenantName = (): TenantName | null => {
  if (typeof window === 'undefined') return null;
  
  // Try to get from localStorage first (set during login)
  const storedProgram = localStorage.getItem('program');
  if (storedProgram) {
    // Check if it matches any of our known tenant names
    const tenantNames = Object.values(TenantName);
    if (tenantNames.includes(storedProgram as TenantName)) {
      return storedProgram as TenantName;
    }
  }
  
  // If not found in localStorage, try to map from tenant ID
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) {
    return getTenantNameFromId(tenantId);
  }
  
  return null;
};
