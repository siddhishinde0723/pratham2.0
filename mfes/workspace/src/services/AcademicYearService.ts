import API_ENDPOINTS from '../utils/API/APIEndpoints';
import { post } from './RestClient';

export const getAcademicYear = async (): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.academicYearsList;
  const headers = {
    academicyearid:
      localStorage.getItem('academicYearId') ||
      '86137077-6c90-477f-b4b1-0804c3878cf0',
    tenantid:
      localStorage.getItem('tenantId') ||
      '8cf74da8-392d-4d02-8ac3-ae2204e34c0a',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };
  try {
    const response = await post(apiUrl, {}, headers);
    return response?.data?.result;
  } catch (error) {
    console.error('error in getting academicYearId', error);
  }
};
