import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import { post, get } from './RestClient';

export interface CustomField {
  fieldId: string;
  value: string | string[];
}

export interface userListParam {
  limit?: number;
  //  page: number;
  filters: {
    role?: string;
    status?: string;
    tenantId?: string; // Added tenantId back to filters
    firstName?: string; // Added firstName for search functionality
    username?: string; // Added username for search functionality
  };
  customFields?: CustomField[]; // Location filters as customFields
  fields?: any;
  sort?: object;
  offset?: number;
}

export const userList = async ({
  limit,
  //  page,
  filters,
  customFields,
  sort,
  offset,
  fields,
}: userListParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userList;
  try {
    // Get tenant ID from localStorage
    const tenantId =
      typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

    // Build request data with customFields for location filters
    const requestData: any = {
      limit: limit || 10,
      filters: {
        role: filters?.role,
        status: filters?.status,
        tenantId: filters?.tenantId || tenantId, // Include tenantId in request body
        firstName: filters?.firstName, // Include firstName for search functionality
        username: filters?.username, // Include username for search functionality
      },
      sort: sort || ['firstName', 'asc'],
      offset: offset || 0,
    };

    // Add customFields if provided (for location filters)
    if (customFields && customFields.length > 0) {
      requestData.customFields = customFields;
    }

    const response = await post(apiUrl, requestData);
    return response?.data?.result;
  } catch (error) {
    console.error('error in getting user list', error);
    // throw error;
  }
};

export const cohortMemberList = async ({
  limit,
  //  page,
  filters,
  customFields,
  sort,
  offset,
  fields,
}: userListParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberList;
  try {
    // Get tenant ID from localStorage
    const tenantId =
      typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

    // Build request data with customFields for location filters
    const requestData: any = {
      limit: limit || 10,
      filters: {
        role: filters?.role,
        status: filters?.status,
        tenantId: filters?.tenantId || tenantId, // Include tenantId in request body
        firstName: filters?.firstName, // Include firstName for search functionality
        username: filters?.username, // Include username for search functionality
      },
      sort: sort || ['firstName', 'asc'],
      offset: offset || 0,
    };

    // Add customFields if provided (for location filters)
    if (customFields && customFields.length > 0) {
      requestData.customFields = customFields;
    }

    const response = await post(apiUrl, requestData);
    return response?.data?.result;
  } catch (error) {
    console.error('error in getting user list', error);
    throw error;
  }
};

export const getUserDetailsInfo = async (
  userId: string | string[],
  fieldValue: boolean = true
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userRead(userId, fieldValue);
  try {
    const response = await get(apiUrl);
    return response?.data?.result;
  } catch (error) {
    console.error('error in fetching user details', error);
    return error;
  }
};

export interface hierarchicalSearchParam {
  limit?: number;
  offset?: number;
  filters: {
    state?: string[];
    district?: string[];
    block?: string[];
    village?: string[];
  };
  role?: string[];
  customfields?: string[];
  sort?: string[];
}

export const userHierarchicalSearch = async ({
  limit,
  offset,
  filters,
  role,
  customfields,
  sort,
}: hierarchicalSearchParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userHierarchicalSearch;
  try {
    const requestData = {
      limit: limit || 100,
      offset: offset || 0,
      filters: {
        ...(filters.state && filters.state.length > 0 ? { state: filters.state } : {}),
        ...(filters.district && filters.district.length > 0 ? { district: filters.district } : {}),
        ...(filters.block && filters.block.length > 0 ? { block: filters.block } : {}),
        ...(filters.village && filters.village.length > 0 ? { village: filters.village } : {}),
      },
      role: role || ['Learner'],
      customfields: customfields || ['state', 'district', 'block', 'village', 'dob'],
      sort: sort || ['name', 'asc'],
    };

    const response = await post(apiUrl, requestData);
    return response?.data?.result;
  } catch (error) {
    console.error('error in hierarchical search', error);
    throw error;
  }
};

export const userNameExist = async (userData: any): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.suggestUsername;
  try {
    const response = await post(apiUrl, userData);
    return response?.data?.result;
  } catch (error) {
    console.error('error in getting in userNme exist', error);
    throw error;
  }
};
