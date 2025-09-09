import { get } from './RestClient';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';

export interface TenantRole {
  roleId: string;
  name: string;
  code: string;
}

export interface TenantData {
  id: string;
  name: string;
  roles: TenantRole[];
}

export interface TenantListItem {
  tenantId: string;
  name: string;
  domain: string;
  ordering: number;
  createdAt: string;
  role?: TenantRole[];
}

export interface TenantReadResponse {
  data: {
    result: TenantListItem[];
  };
}

export const readTenant = async (): Promise<TenantListItem[] | null> => {
  try {
    const response: TenantReadResponse = await get(API_ENDPOINTS.tenantRead);
    return response.data.result;
  } catch (error) {
    console.error('Error reading tenant:', error);
    return null;
  }
};

export const getRoleIdByName = (
  tenantData: TenantData,
  roleName: string
): string | null => {
  if (!tenantData || !tenantData.roles || !Array.isArray(tenantData.roles)) {
    console.error('Invalid tenant data or roles array:', tenantData);
    return null;
  }

  const role = tenantData.roles.find(
    (r) => r.name.toLowerCase() === roleName.toLowerCase()
  );
  return role ? role.roleId : null;
};

export const getRoleIdByTenantAndRoleName = (
  tenantList: TenantListItem[],
  tenantId: string,
  roleName: string
): string | null => {
  const tenant = tenantList.find((t) => t.tenantId === tenantId);
  if (!tenant || !tenant.role || !Array.isArray(tenant.role)) {
    console.error('Tenant not found or no roles:', { tenantId, tenant });
    return null;
  }

  const role = tenant.role.find(
    (r) => r.name.toLowerCase() === roleName.toLowerCase()
  );
  return role ? role.roleId : null;
};
