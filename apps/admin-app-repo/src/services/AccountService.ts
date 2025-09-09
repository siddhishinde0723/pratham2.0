import { post } from './RestClient';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';

export interface TenantCohortRoleMapping {
  tenantId: string;
  roleId: string;
}

export interface CreateAccountRequest {
  name: string;
  username: string;
  password: string;
  gender: string;
  firstName: string;
  lastName: string;
  tenantCohortRoleMapping: TenantCohortRoleMapping[];
}

export interface CreateAccountResponse {
  data: {
    result: any;
  };
}

export const createAccount = async (
  accountData: CreateAccountRequest
): Promise<any> => {
  try {
    const response: CreateAccountResponse = await post(
      API_ENDPOINTS.accountCreate,
      accountData
    );
    return response.data.result;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};
