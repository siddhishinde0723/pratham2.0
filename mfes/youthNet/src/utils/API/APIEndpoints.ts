const baseurl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;

const API_ENDPOINTS = {
  userRead: (userId: string | string[]) => `${baseurl}/user/read/${userId}`,
  userUpdate: (userId: string | string[]) => `${baseurl}/user/update/${userId}`,
  userAuth: `${baseurl}/user/v1/auth`,
  notificationSend: `${baseurl}/notification`,
  userReadWithField: (userId: string | string[]) => `${baseurl}/user/v1/read/${userId}?fieldvalue=true`,
  academicYearsList: `${baseurl}/user/v1/academicyears/list`,
  userList: `${baseurl}/user/list`,
  fieldOptionsRead: `${baseurl}/fields/options/read`,
  accountCreate: `${baseurl}/account/create`, 




};

export default API_ENDPOINTS;
