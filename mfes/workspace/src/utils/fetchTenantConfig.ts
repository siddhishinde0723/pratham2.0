export interface TenantConfig {
  CHANNEL_ID: string;
  CONTENT_FRAMEWORK: string;
  COLLECTION_FRAMEWORK: string;
}

/**
 * Fetches Tenant Configuration dynamically.
 * - Supports both client & server environments
 * - Accepts `tenantId` explicitly (optional)
 */
export const fetchTenantConfig = async (
  tenantId?: string,
  req?: any
): Promise<TenantConfig | null> => {
  try {
    // If `tenantId` is not provided, get it dynamically from multiple sources
    let resolvedTenantId = tenantId;

    if (!resolvedTenantId && typeof window !== 'undefined') {
      // Try cookies first (SSR-safe)
      const cookies = document.cookie.split(';');
      const tenantCookie = cookies.find((cookie) =>
        cookie.trim().startsWith('tenantId=')
      );
      if (tenantCookie) {
        resolvedTenantId = tenantCookie.split('=')[1];
      }

      // If not in cookies, check localStorage and migrate
      if (!resolvedTenantId) {
        const localStorageTenantId = localStorage.getItem('tenantId');
        if (localStorageTenantId) {
          console.log(
            'Migrating tenant ID from localStorage to cookies in fetchTenantConfig'
          );
          resolvedTenantId = localStorageTenantId;
          // Set in cookies for future use
          document.cookie = `tenantId=${localStorageTenantId}; expires=${new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toUTCString()}; path=/; secure; SameSite=Strict`;
        }
      }
    }

    // No fallback - tenant ID should be set properly
    if (!resolvedTenantId) {
      console.warn('No tenant ID found in cookies');
      return null;
    }

    console.log('Fetching tenant config for ID:', resolvedTenantId);

    // Fetch from API with the tenantId
    const response = await fetch(
      `/api/tenantConfig?tenantId=${resolvedTenantId}`,
      {
        method: 'GET',
        credentials: 'include', // Ensures cookies are sent in client requests
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tenant config fetch failed:', response.status, errorData);
      throw new Error(`Tenant not found: ${response.status}`);
    }

    const { CHANNEL_ID, CONTENT_FRAMEWORK, COLLECTION_FRAMEWORK } =
      await response.json();
    return { CHANNEL_ID, CONTENT_FRAMEWORK, COLLECTION_FRAMEWORK };
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    return null;
  }
};
