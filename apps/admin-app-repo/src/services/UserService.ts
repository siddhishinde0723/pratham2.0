import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import { patch } from "./RestClient";
export const deleteUser = async (
  userId: string,
  userData: object,
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userUpdate(userId)
  try {
    const response = await patch(apiUrl, userData);
    return response?.data;
  } catch (error) {
    console.error("error in fetching user details", error);
    return error;
  }
};
export const updateUser = async (
  userId: string,
  userData: object,
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userUpdate(userId)
  try {
    const response = await patch(apiUrl, userData);
    return response?.data;
  } catch (error) {
    console.error("error in updating user details", error);
    return error;
  }
};
