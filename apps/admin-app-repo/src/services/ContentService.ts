import { API_ENDPOINTS } from '../utils/API/APIEndpoints';
import { post } from './RestClient';

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
    const channel = typeof window !== 'undefined' ? localStorage.getItem('channelId') : null;
    
    const requestData = {
      request: {
        filters: {
          ...filters,
          // Add channel from localStorage
          channel: channel, // Default channel if not found
          // Remove createdBy and use the provided status and primaryCategory
          status: filters.status || [
            'Live',
          ],
          primaryCategory: filters.primaryCategory || [
            'Content Playlist',
            'Course',
            'Digital Textbook',
            'Question paper',
            'Course Assessment',
            'eTextbook',
            'Explanation Content',
            'Learning Resource',
            'Practice Question Set',
            'Teacher Resource',
            'Exam Question'
          ],
        },
        sort_by: sort || { lastUpdatedOn: 'desc' },
        query: filters.name || '',
        offset: offset || 0,
        limit: limit || 50,
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
    const channel = typeof window !== 'undefined' ? localStorage.getItem('channelId') : null;
    
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
