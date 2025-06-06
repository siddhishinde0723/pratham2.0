import { Role, Status } from '@/utils/app.constant';
import {
  CohortMemberList,
  UpdateCohortMemberStatusParams,
  UserList,
} from '../utils/Interfaces';
import { post, put } from './RestClient';
import API_ENDPOINTS from '@/utils/API/APIEndpoints';

const fetchCohortMemberList = async ({
  limit,
  page,
  filters,
}: CohortMemberList): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberList;
  try {
    const response = await post(apiUrl, {
      limit,
      offset: page,
      filters,
      sort: ['name', 'asc'],
    });
    return response?.data;
  } catch (error) {
    console.error('error in cohort member list API ', error);
    // throw error;
    return null;
  }
};

export const getMyUserList = async ({
  limit,
  page,
  filters,
  fields,
}: UserList): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userList;
  try {
    const response = await post(apiUrl, {
      limit,
      offset: page,
      filters,
      fields,
    });
    return response?.data;
  } catch (error) {
    console.error('error in cohort member list API ', error);
    // throw error;
  }
};

export const getMyCohortMemberList = async ({
  limit,
  page,
  filters,
  includeArchived = false,
}: CohortMemberList & { includeArchived?: boolean }): Promise<any> => {
  const statusFilters = [Status.DROPOUT, Status.ACTIVE];
  if (includeArchived) {
    statusFilters.push(Status.ARCHIVED);
  }

  const studentFilters = {
    role: Role.STUDENT,
    status: statusFilters,
    ...filters,
  };
  return fetchCohortMemberList({ limit, page, filters: studentFilters });
};

export const getMyCohortFacilitatorList = async ({
  limit,
  page,
  filters,
}: CohortMemberList): Promise<any> => {
  const studentFilters = {
    ...filters,
    role: Role.TEACHER,
    status: [Status.DROPOUT, Status.ACTIVE],
  };
  return fetchCohortMemberList({ limit, page, filters: studentFilters });
};

export const getFacilitatorList = async ({
  limit,
  page,
  filters,
}: CohortMemberList): Promise<any> => {
  return fetchCohortMemberList({ limit, page, filters });
};

export const updateCohortMemberStatus = async ({
  memberStatus,
  statusReason,
  membershipId,
  dynamicBody = {},
}: UpdateCohortMemberStatusParams): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberUpdate(membershipId);

  // Utility to stringify only the values of the customFields
  const prepareCustomFields = (customFields: any[]): any[] => {
    return customFields.map((field) => {
      if (field && field.value !== undefined) {
        return {
          ...field,
          value: Array.isArray(field.value) // Check if the value is an array
            ? field.value // Don't stringify if it's already an array
            : typeof field.value === 'object' && field.value !== null
            ? JSON.stringify(field.value) // Only stringify objects
            : field.value, // Otherwise, keep the value as is
        };
      }
      return field;
    });
  };

  // Build the request body dynamically
  const requestBody = {
    ...(memberStatus && { status: memberStatus }),
    ...(statusReason && { statusReason }),
    ...Object.entries(dynamicBody).reduce((acc, [key, value]) => {
      acc[key] =
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : value;
      return acc;
    }, {} as Record<string, any>),
    // Only stringify the `value` field of customFields if needed
    ...(dynamicBody?.customFields && {
      customFields: prepareCustomFields(dynamicBody.customFields),
    }),
  };

  try {
    const response = await put(apiUrl, requestBody);
    return response?.data;
  } catch (error) {
    console.error('error in attendance report api ', error);
    // throw error;
  }
};
