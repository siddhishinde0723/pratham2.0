import { post } from './RestClient';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';

export interface TenantCohortRoleMapping {
  tenantId: string;
  roleId: string;
}

export interface CustomField {
  fieldId: string;
  value: string | string[];
}

export interface CreateAccountRequest {
  name: string;
  username: string;
  password: string;
  gender?: string; // Make gender optional
  firstName: string;
  lastName: string;
  email?: string; // Add email field as optional
  mobile?: string; // Add mobile field as optional
  tenantCohortRoleMapping: TenantCohortRoleMapping[];
  customFields?: CustomField[]; // Add customFields for location data
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
