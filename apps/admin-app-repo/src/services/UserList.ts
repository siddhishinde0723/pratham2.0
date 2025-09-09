import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import { post, get } from './RestClient';

export interface userListParam {
  limit?: number;
  //  page: number;
  filters: {
    role?: string;
    status?: string;
    tenantId?: string; // Added tenantId back to filters
    firstName?: string; // Added firstName for search functionality
    // Removed state/district/block filters - only tenant ID will be sent
  };
  fields?: any;
  sort?: object;
  offset?: number;
}

export const userList = async ({
  limit,
  //  page,
  filters,
  sort,
  offset,
  fields,
}: userListParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userList;
  try {
    // Get tenant ID from localStorage
    const tenantId =
      typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

    // Simplified request - only send essential data
    const requestData = {
      limit: limit || 10,
      filters: {
        role: filters?.role,
        status: filters?.status,
        tenantId: filters?.tenantId || tenantId, // Include tenantId in request body
        firstName: filters?.firstName, // Include firstName for search functionality
        // Removed state, districts, blocks filters
      },
      sort: sort || ['firstName', 'asc'],
      offset: offset || 0,
    };

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
  sort,
  offset,
  fields,
}: userListParam): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberList;
  try {
    // Get tenant ID from localStorage
    const tenantId =
      typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

    // Simplified request - only send essential data
    const requestData = {
      limit: limit || 10,
      filters: {
        role: filters?.role,
        status: filters?.status,
        tenantId: filters?.tenantId || tenantId, // Include tenantId in request body
        firstName: filters?.firstName, // Include firstName for search functionality
        // Removed state, districts, blocks filters
      },
      sort: sort || ['firstName', 'asc'],
      offset: offset || 0,
    };

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
