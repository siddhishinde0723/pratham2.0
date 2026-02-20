import { API_ENDPOINTS } from '../utils/API/APIEndpoints';
import { post, get, deleteApi } from './RestClient';
import { MIME_TYPE } from '../utils/app.constant';

export interface ContentSearchParam {
  limit?: number;
  filters: {
    status?: string[];
    primaryCategory?: string[];
    name?: string; // For search functionality (used in query)
  };
  sort?: object;
  offset?: number;
}

export interface Content {
  identifier: string;
  name: string;
  description?: string;
  contentType: string;
  resourceType: string;
  mimeType: string;
  primaryCategory: string;
  status: string;
  channel: string;
  appIcon?: string;
  artifactUrl?: string;
  duration?: string;
  gradeLevel?: string[];
  subject?: string[];
  medium?: string[];
  board?: string[];
  topic?: string[];
  createdOn?: string;
  lastUpdatedOn?: string;
}

export const contentSearch = async ({
  limit,
  filters,
  sort,
  offset,
}: ContentSearchParam): Promise<{ content: Content[]; count: number }> => {
  const apiUrl: string = API_ENDPOINTS.getCourseName; // Using composite search endpoint

  try {
    let channel = typeof window !== 'undefined' ? localStorage.getItem('channelId') : null;

    if (typeof window !== 'undefined') {
      const adminInfo = localStorage.getItem('adminInfo');
      if (adminInfo) {
        try {
          const parsedAdminInfo = JSON.parse(adminInfo);
          channel = parsedAdminInfo?.tenantData?.[0]?.channelId || channel;
        } catch (error) {
          console.error('Error parsing adminInfo:', error);
        }
      }
    }


    const { name, ...restFilters } = filters;
    const requestData = {
      request: {
        filters: {
          ...restFilters,
          // Add channel from localStorage
          channel: channel, // Default channel if not found
          // Remove createdBy and use the provided status and primaryCategory
          status: filters.status || [
            'Draft',
            'FlagDraft',
            'Review',
            'Processing',
            'Live',
            'Unlisted',
            'FlagReview',
          ],
          primaryCategory: filters.primaryCategory || [
            'Course',
            'Learning Resource',
            'Practice Question Set',
          ],
        },
        sort_by: sort || { lastUpdatedOn: 'desc' },
        query: name || '',
        offset: offset || 0,
        limit: limit || 10,
      }
    };

    const response = await post(apiUrl, requestData);
    return response?.data?.result;
  } catch (error) {
    console.error('Error in content search:', error);
    throw error;
  }
};

export const getContentDetails = async (identifier: string): Promise<Content | undefined> => {
  const apiUrl = `${API_ENDPOINTS.getCourseName}`;

  try {
    let channel = typeof window !== 'undefined' ? localStorage.getItem('channelId') : null;

    if (typeof window !== 'undefined') {
      const adminInfo = localStorage.getItem('adminInfo');
      if (adminInfo) {
        try {
          const parsedAdminInfo = JSON.parse(adminInfo);
          channel = parsedAdminInfo?.tenantData?.[0]?.channelId || channel;
        } catch (error) {
          console.error('Error parsing adminInfo:', error);
        }
      }
    }


    const requestData = {
      request: {
        filters: {
          identifier: [identifier],
          channel: channel,
          status: [
            'Live',
          ],
        },
        sort_by: { lastUpdatedOn: 'desc' },
        query: '',
        offset: 0,
        limit: 1,
      }
    };

    const response = await post(apiUrl, requestData);
    return response?.data?.result?.content?.[0];
  } catch (error) {
    console.error('Error fetching content details:', error);
    throw error;
  }
};

export const getPrimaryCategory = async (channelId: string) => {
  if (!channelId) {
    throw new Error('Channel ID is required');
  }

  const apiURL = `/action/channel/v1/read/${channelId}`;

  try {
    const response = await get(apiURL);
    return response?.data?.result;
  } catch (error) {
    console.error('getPrimaryCategory error:', error);
    throw error;
  }
};

export const deleteContent = async (identifier: string, mimeType: string) => {
  const questionsetRetireURL = `/action/questionset/v2/retire/${identifier}`;
  const contentRetireURL = `/action/content/v3/retire/${identifier}`;
  let apiURL = '';
  if (mimeType === MIME_TYPE.QUESTIONSET_MIME_TYPE) {
    apiURL = questionsetRetireURL;
  } else {
    apiURL = contentRetireURL;
  }
  try {
    const response = await deleteApi(apiURL);
    return response?.data;
  } catch (error) {
    console.error('Error deleting content:', error);
    throw error;
  }
};
