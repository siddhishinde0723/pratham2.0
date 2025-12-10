/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/* eslint-disable @nx/enforce-module-boundaries */
import { CohortMemberList } from '@/utils/Interfaces';
import { get, post, put, patch } from '../RestClient';
import axios from 'axios';
import { showToastMessage } from '@/components/Toastify';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';

export interface cohortListFilter {
  type: string;
  status: string[];
  states: string;
  districts: string;
  blocks: string;
}

export interface cohortListData {
  limit?: Number;
  offset?: Number;
  filter?: any;
  status?: any;
}
export interface UpdateCohortMemberStatusParams {
  memberStatus: string;
  statusReason?: string;
  membershipId: string | number;
}
export const getCohortList = async (data: cohortListData): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortSearch;

  try {
    const response = await post(apiUrl, data);
    console.log('Raw API Response:', response);
    console.log('Response data result::', response?.data?.result);

    return response?.data?.result;
  } catch (error) {
    console.error('Error in Getting cohort List Details', error);
    throw error; // Throw error instead of returning it
  }
};

export const updateCohortUpdate = async (
  userId: string,
  cohortDetails: any
): Promise<any> => {
  // const { name, status, type } = cohortDetails;
  const apiUrl: string = API_ENDPOINTS.cohortUpdateUser(userId);

  try {
    const response = await put(apiUrl, cohortDetails);
    return response?.data;
  } catch (error) {
    console.error('Error in updating cohort details', error);
    throw error;
  }
};
export interface FacilitatorDeleteUserData {
  status: string;
  reason: string;
}

export const updateFacilitator = async (
  userId: string,
  userData: FacilitatorDeleteUserData
): Promise<any> => {
  const apiUrl = API_ENDPOINTS.userUpdate(userId);
  try {
    const response = await patch(apiUrl, { userData });
    return response.data.result;
  } catch (error) {
    console.error('Error in updating Facilitator', error);
    throw error;
  }
};

export const getFormRead = async (
  context: string,
  contextType: string
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.formReadWithContext(
    context,
    contextType
  );
  try {
    const response = await get(apiUrl);
    const sortedFields = response?.data?.result.fields?.sort(
      (a: { order: string }, b: { order: string }) =>
        parseInt(a.order) - parseInt(b.order)
    );
    const formData = {
      formid: response?.data?.result?.formid,
      title: response?.data?.result?.title,
      fields: sortedFields,
    };
    return formData;
  } catch (error) {
    console.error('error in getting cohort details', error);
    // throw error;
  }
};
export const createUser = async (userData: any): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.accountCreate;
  try {
    const response = await post(apiUrl, userData);
    return response?.data?.result;
  } catch (error) {
    console.error('error in getting cohort list', error);
    // throw error;
  }
};

export const createCohort = async (userData: any, t?: any): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortCreate;

  try {
    const response = await post(apiUrl, userData);
    return response?.data;
  } catch (error) {
    console.error('error in getting cohort list', error);

    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 409) {
        showToastMessage('COMMON.ALREADY_EXIST', 'error');
      } else throw error;
    }
  }
};

export const fetchCohortMemberList = async ({
  limit,
  offset,
  filters,
}: CohortMemberList): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberList;
  try {
    const response = await post(apiUrl, {
      limit,
      offset,
      filters,
      // sort: ["username", "asc"],
    });
    return response?.data;
  } catch (error) {
    console.error('error in cohort member list API ', error);
    // throw error;
  }
};

export const bulkCreateCohortMembers = async (payload: any): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberBulkCreate;
  try {
    const response = await post(apiUrl, payload);
    return response.data;
  } catch (error) {
    console.error('Error in bulk creating cohort members', error);
    throw error;
  }
};

export const updateCohortMemberStatus = async ({
  memberStatus,
  statusReason,
  membershipId,
}: UpdateCohortMemberStatusParams): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberUpdate(membershipId);
  try {
    const response = await put(apiUrl, {
      status: memberStatus,
      statusReason,
    });
    return response?.data;
  } catch (error) {
    console.error('error in attendance report api ', error);
    // throw error;
  }
};

export interface CohortMemberListParams {
  limit?: number;
  offset?: number;
  filters?: {
    cohortId?: string;
    role?: 'Teacher' | 'Student' | 'Learner';
    status?: string[];
    search?: string;
  };
  sort?: [string, 'asc' | 'desc'];
}

export interface CohortMember {
  id: string;
  userId: string;
  cohortId: string;
  role: 'Teacher' | 'Student' | 'Learner';
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    profile?: {
      gender?: string;
      dob?: string;
      address?: string;
      qualifications?: string;
      experience?: string;
      subjects?: string[];
      grade?: string;
      parentName?: string;
      parentPhone?: string;
    };
  };
}

export interface CohortMemberListResponse {
  [x: string]: any;
  success: boolean;
  count: number;
  limit: number;
  offset: number;
  members: CohortMember[];
}

export const getCohortMemberList = async (
  params: CohortMemberListParams
): Promise<CohortMemberListResponse> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberList;

  try {
    const response = await post(apiUrl, params);
    console.log('Cohort member list response:', response?.data?.result);
    return response?.data?.result;
  } catch (error) {
    console.error('Error in Getting cohort member list', error);
    return error as CohortMemberListResponse;
  }
};

export const updateCohortMemberStatusTeacherList = async (
  membershipId: string,
  status: string,
  statusReason?: string
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberUpdate(membershipId);

  try {
    const response = await post(apiUrl, {
      status,
      statusReason,
    });
    return response?.data;
  } catch (error) {
    console.error('Error updating cohort member status', error);
    throw error;
  }
};

// Add this function to your cohortService.ts file
export const addStudentsToClass = async (data: {
  cohortId: string[];
  userId: string[];
  // cohortAcademicYearId: string;
}) => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberBulkCreate;
  try {
    const response = await post(apiUrl, data);
    return response.data;
  } catch (error) {
    console.error('Error adding students to class:', error);
    throw error;
  }
};
export interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
  gender: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  email?: string;
  tenantCohortRoleMapping: Array<{
    tenantId: string;
    roleId: string;
  }>;
  customFields?: Array<{
    fieldId: string;
    value: string[];
  }>;
}

export const createUserStudentTeacher = async (
  userData: CreateUserRequest
): Promise<any> => {
  try {
    const response = await post(API_ENDPOINTS.createStudentTeacher, userData);
    return response.data;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const generateUsername = (
  firstName: string,
  lastName: string
): string => {
  const baseUsername = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
  const randomNum = Math.floor(Math.random() * 1000);
  return `${baseUsername}${randomNum}`;
};

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate mobile number format
 * @param mobile - Mobile number to validate
 * @returns Boolean indicating if mobile is valid
 */
export const validateMobile = (mobile: string): boolean => {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile);
};

// Role IDs - You might want to store these in config or environment variables
export const USER_ROLES = {
  TEACHER: {
    id: 'f9646ef7-4c3b-4fa0-90ba-e24019ae686f',
    name: 'Teacher',
  },
  STUDENT: {
    id: '52d62b26-1bbe-4a58-bc82-e6b81d067f0b',
    name: 'Student',
  },
} as const;

// Custom Fields IDs - These might be specific to your implementation
export const CUSTOM_FIELDS = {
  TEACHER_ID: '800265b1-9058-482a-94f4-726197e1dfe4',
  VILLAGE_ID: '62340eaa-40fb-48b9-ba90-dcaa78be778e',
  PROGRAM_ID: '1e3e76e2-7f77-4fd7-a79f-abe5c33d4d08',
  SUB_PROGRAM_ID: '2f7e6930-0bc2-4e69-8bd4-dde205fa5471',
} as const;

// Default password for new users
export const DEFAULT_PASSWORD = 'Password@123';

export const assignClassToTeacher = async (data: {
  cohortId: string[];
  userId: string;
}) => {
  const apiUrl: string = API_ENDPOINTS.cohortMemberBulkCreate;
  try {
    const response = await post(apiUrl, data);
    return response.data;
  } catch (error) {
    console.error('Error assigning class to teacher:', error);
    throw error;
  }
};
