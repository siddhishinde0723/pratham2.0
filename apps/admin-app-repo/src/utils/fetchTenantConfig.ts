export interface TenantConfig {
  CHANNEL_ID: string;
  CONTENT_FRAMEWORK: string;
  COLLECTION_FRAMEWORK: string;
  academicYearId?: string;
  LOGO_CONFIG?: {
    sidebar?: string;
    login?: string;
    favicon?: string;
    alt?: string;
  };
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
    // Use provided tenantId or get it from localStorage
    console.log('fetchTenantConfig: tenantId parameter', tenantId);
    const resolvedTenantId =
      tenantId ||
      (typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('tenantId')
        : null);

    if (!resolvedTenantId) {
      console.error('Tenant ID is required but not found');
      return null;
    }

    console.log('fetchTenantConfig: Using tenantId', resolvedTenantId);

    // Fetch from API with the tenantId
    const response = await fetch(
      `/api/tenantConfig?tenantId=${resolvedTenantId}`,
      {
        method: 'GET',
        credentials: 'include', // Ensures cookies are sent in client requests
      }
    );

    if (!response.ok) throw new Error('Tenant not found');

    const { CHANNEL_ID, CONTENT_FRAMEWORK, COLLECTION_FRAMEWORK, LOGO_CONFIG, academicYearId } =
      await response.json();
    return { CHANNEL_ID, CONTENT_FRAMEWORK, COLLECTION_FRAMEWORK, LOGO_CONFIG, academicYearId };
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    return null;
  }
};
