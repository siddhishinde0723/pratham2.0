import { API_ENDPOINTS } from '../utils/API/APIEndpoints';
import { post } from './RestClient';
import { userList } from './UserList';

export interface Group {
  id: string;
  name: string;
  description?: string;
  state: string;
  district: string;
  block: string;
  village: string;
  createdAt: string;
  status: string;
  users?: GroupUser[];
  content?: GroupContent[];
}

export interface GroupUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  avatar?: string;
  joinedAt?: string;
  cohortMembershipId?: string; // Added for archiving functionality
}

export interface GroupDetails extends Group {
  locationDetails: {
    state: { id: string; name: string };
    district: { id: string; name: string };
    block: { id: string; name: string };
    village: { id: string; name: string };
  };
}

export interface GroupContent {
  contentId: string;
  contentName: string;
  contentType: string;
  duration?: string;
  primaryCategory: string;
  addedAt: string;
  status: 'active' | 'archive';
}

export interface GroupContentResponse {
  content: GroupContent[];
  totalCount: number;
}

export interface GroupSearchParams {
  limit?: number;
  offset?: number;
  filters?: {
    status?: string[];
    name?: string;
    state?: string;
    district?: string;
    block?: string;
    village?: string;
  };
  sort?: object;
}

/**
 * Search groups using the API
 */
export const searchGroups = async (params: {
  limit?: number;
  offset?: number;
  filters?: {
    type?: string;
    tenantId?: string;
    cohortId?: string;
    status?: string[];
    name?: string;
    state?: string;
    district?: string;
    block?: string;
    village?: string;
  };
}): Promise<{ groups: Group[]; count: number }> => {
  try {
    // Add academic year ID to headers
    const headers = {
      academicyearid: 'edf1d200-21d8-417e-b844-1d04f92435f4'
    };
    
    // Create API request without location and status filters (they cause 404 errors)
    const apiRequest = {
      limit: params.limit,
      offset: params.offset,
      filters: {
        type: params.filters?.type || 'ADHOC-Group',
        name: params.filters?.name
        // Note: Not sending location or status filters to API - they cause 404 errors
        // state, district, block, village, status will be filtered client-side
      }
    };
    
    console.log('Searching groups with API params:', apiRequest);
    console.log('Using headers:', headers);
    
    const response = await post(API_ENDPOINTS.cohortSearch, apiRequest, headers);
    console.log('Groups search response:', response.data);
    
    // Check if API returned "No data found" - this is not an error
    if (response.data?.params?.status === 'failed' && 
        response.data?.params?.err === 'NOT FOUND') {
      console.log('No groups found - returning empty result');
      return {
        groups: [],
        count: 0
      };
    }
    
    // Transform API response to match our Group interface
    const apiGroups = response.data?.result?.results?.cohortDetails || [];
    let groups: Group[] = apiGroups.map((apiGroup: any) => {
      // Extract location data from customFields
      let state = '', district = '', block = '', village = '';
      
      if (apiGroup.customFields && Array.isArray(apiGroup.customFields)) {
        apiGroup.customFields.forEach((field: any) => {
          if (field.label === 'State' && field.selectedValues && field.selectedValues.length > 0) {
            state = field.selectedValues[0].value?.replace(/"/g, '') || '';
          } else if (field.label === 'District' && field.selectedValues && field.selectedValues.length > 0) {
            district = field.selectedValues[0].value?.replace(/"/g, '') || '';
          } else if (field.label === 'Block' && field.selectedValues && field.selectedValues.length > 0) {
            block = field.selectedValues[0].value?.replace(/"/g, '') || '';
          } else if (field.label === 'Village' && field.selectedValues && field.selectedValues.length > 0) {
            village = field.selectedValues[0].value?.replace(/"/g, '') || '';
          }
        });
      }
      
      const groupData = {
        id: apiGroup.cohortId,
        name: apiGroup.name,
        description: apiGroup.description || '',
        state: state,
        district: district,
        block: block,
        village: village,
        createdAt: apiGroup.createdAt ? new Date(apiGroup.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: apiGroup.status === 'active' ? 'Active' : 'Inactive'
      };
      
      console.log(`Group ${groupData.name} location data:`, {
        state: `"${state}"`,
        district: `"${district}"`,
        block: `"${block}"`,
        village: `"${village}"`
      });
      
      return groupData;
    });

    // Always apply client-side filtering for location data (since API doesn't support it)
    // Get location filters from the original params passed to getGroups
    const locationFilters = {
      state: params.filters?.state,
      district: params.filters?.district,
      block: params.filters?.block,
      village: params.filters?.village,
      status: params.filters?.status,
      name: params.filters?.name
    };
    
    console.log('Applying client-side filters:', locationFilters);
    console.log('Groups before filtering:', groups.length);
    
    if (locationFilters.state) {
      console.log('Filtering by state:', locationFilters.state);
      console.log('Available states in groups:', groups.map(g => g.state));
      groups = groups.filter(group => {
        const matches = group.state === locationFilters.state;
        console.log(`Group ${group.name} state: "${group.state}" matches filter "${locationFilters.state}": ${matches}`);
        return matches;
      });
      console.log('Groups after state filter:', groups.length);
    }
    if (locationFilters.district) {
      console.log('Filtering by district:', locationFilters.district);
      groups = groups.filter(group => group.district === locationFilters.district);
      console.log('Groups after district filter:', groups.length);
    }
    if (locationFilters.block) {
      console.log('Filtering by block:', locationFilters.block);
      groups = groups.filter(group => group.block === locationFilters.block);
      console.log('Groups after block filter:', groups.length);
    }
    if (locationFilters.village) {
      console.log('Filtering by village:', locationFilters.village);
      groups = groups.filter(group => group.village === locationFilters.village);
      console.log('Groups after village filter:', groups.length);
    }
    if (locationFilters.status && locationFilters.status.length > 0) {
      console.log('Filtering by status:', locationFilters.status);
      console.log('Available statuses in groups:', groups.map(g => g.status));
      groups = groups.filter(group => {
        const matches = locationFilters.status!.includes(group.status);
        console.log(`Group ${group.name} status: "${group.status}" matches filter ${locationFilters.status}: ${matches}`);
        return matches;
      });
      console.log('Groups after status filter:', groups.length);
    }
    if (locationFilters.name) {
      console.log('Filtering by name:', locationFilters.name);
      groups = groups.filter(group => 
        group.name.toLowerCase().includes(locationFilters.name!.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(locationFilters.name!.toLowerCase()))
      );
      console.log('Groups after name filter:', groups.length);
    }
    
    return {
      groups,
      count: groups.length // Use filtered count instead of API count
    };
  } catch (error) {
    console.error('Error searching groups:', error);
    throw error;
  }
};

/**
 * Fetch all groups with optional filtering (legacy function - now uses searchGroups)
 */
export const getGroups = async (params: GroupSearchParams = {}): Promise<{ groups: Group[]; count: number }> => {
  try {
    // Always fetch all groups without location filters (API doesn't support them)
    // Location filtering will be done client-side
    return await searchGroups({
      limit: params.limit,
      offset: params.offset,
      filters: {
        type: 'ADHOC-Group',
        name: params.filters?.name,
        // Pass all filters for client-side filtering (API doesn't support them)
        state: params.filters?.state,
        district: params.filters?.district,
        block: params.filters?.block,
        village: params.filters?.village,
        status: params.filters?.status
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

/**
 * Fetch detailed information for a specific group including users and content
 */
export const getGroupDetails = async (groupId: string): Promise<GroupDetails | null> => {
  try {
    // TODO: Replace with actual API endpoint when available
    // For now, using mock data
    
    // First get the basic group info
    const groupsResult = await getGroups();
    const group = groupsResult.groups.find(g => g.id === groupId);
    
    if (!group) {
      return null;
    }

    // Get users for this group
    const groupUsers = await getGroupUsers(groupId);
    
    // Get content for this group
    const groupContent = await getGroupContent(groupId);

    // Get location details (this would typically come from the group data or separate API)
    const locationDetails = {
      state: { id: group.state, name: 'Maharashtra' }, // Mock data
      district: { id: group.district, name: 'Mumbai' }, // Mock data
      block: { id: group.block, name: 'Block 1' }, // Mock data
      village: { id: group.village, name: 'Village 1' } // Mock data
    };

    return {
      ...group,
      users: groupUsers,
      content: groupContent,
      locationDetails
    };
  } catch (error) {
    console.error('Error fetching group details:', error);
    throw error;
  }
};

/**
 * Fetch users belonging to a specific group using the cohortmember/list API
 */
export const getGroupUsers = async (groupId: string, academicYearId: string = 'edf1d200-21d8-417e-b844-1d04f92435f4'): Promise<GroupUser[]> => {
  try {
    console.log('Fetching users for group:', groupId);
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

    // Get tenant ID
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) {
      throw new Error('Tenant ID not found. Please login again.');
    }

    // Prepare the request data
    const requestData = {
      limit: 100, // Get up to 100 users
      offset: 0,
      filters: {
        cohortId: groupId
      },
      sort: [
        "name",
        "asc"
      ]
    };

    console.log('Fetching group users with request data:', requestData);
    console.log('API endpoint:', API_ENDPOINTS.cohortMemberList);
    console.log('Headers:', {
      'accept': '*/*',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token?.substring(0, 20)}...`,
      'tenantId': tenantId,
      'academicyearid': academicYearId
    });

    // Make the API call
    console.log('Making API call to:', API_ENDPOINTS.cohortMemberList);
    const response = await fetch(API_ENDPOINTS.cohortMemberList, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'tenantId': tenantId,
        'academicyearid': academicYearId
      },
      body: JSON.stringify(requestData)
    });

    console.log('Group users response status:', response.status);
    console.log('Group users response headers:', response.headers);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Group users response:', result);

    // Transform API response to match our GroupUser interface
    // The API returns users in result.userDetails, not result.results.cohortMemberDetails
    const apiUsers = result?.result?.userDetails || [];
    console.log('Raw API users:', apiUsers);
    
    const users: GroupUser[] = apiUsers.map((apiUser: any) => ({
      id: apiUser.userId || apiUser.id,
      firstName: apiUser.firstName || '',
      lastName: apiUser.lastName || '',
      email: apiUser.email || '',
      phone: apiUser.mobile || apiUser.phone || '',
      role: apiUser.role || 'Learner',
      status: apiUser.status === 'active' ? 'Active' : 'Inactive',
      avatar: apiUser.avatar,
      joinedAt: apiUser.createdAt ? new Date(apiUser.createdAt).toISOString().split('T')[0] : undefined,
      cohortMembershipId: apiUser.cohortMembershipId || apiUser.id // Use cohortMembershipId for archiving
    }));

    console.log('Transformed users:', users);
    return users;
  } catch (error) {
    console.error('Error fetching group users:', error);
    throw error;
  }
};

/**
 * Archive a user from a group by updating their status to "archived"
 */
export const archiveUserFromGroup = async (cohortMembershipId: string): Promise<void> => {
  try {
    console.log('Archiving user with cohortMembershipId:', cohortMembershipId);
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

    const requestData = {
      status: 'archived'
    };

    console.log('Archive user request data:', requestData);
    console.log('API endpoint:', API_ENDPOINTS.cohortMemberUpdate(cohortMembershipId));

    const response = await fetch(API_ENDPOINTS.cohortMemberUpdate(cohortMembershipId), {
      method: 'PUT',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    console.log('Archive user response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Archive user response:', result);
    
    console.log('User archived successfully');
  } catch (error) {
    console.error('Error archiving user:', error);
    throw error;
  }
};


/**
 * Create a new group
 */
export const createGroup = async (groupData: {
  name: string;
  type: string;
  status: string;
  params: {
    groupOwnerId: string;
  };
  customFields: Array<{
    fieldId: string;
    value: string[];
  }>;
}): Promise<any> => {
  try {
    // Add academic year ID to headers
    const headers = {
      academicyearid: 'edf1d200-21d8-417e-b844-1d04f92435f4'
    };
    
    console.log('Creating group with data:', groupData);
    console.log('Using headers:', headers);
    
    const response = await post(API_ENDPOINTS.cohortCreate, groupData, headers);
    console.log('Group creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

/**
 * Update an existing group
 */
export const updateGroup = async (groupId: string, groupData: Partial<Group>): Promise<Group> => {
  try {
    console.log('Updating group:', groupId, 'with data:', groupData);
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

    // Prepare the request data
    const requestData = {
      status: groupData.status === 'Active' ? 'active' : 'archived'
    };

    console.log('Update request data:', requestData);

    // Make the API call using the correct endpoint
    const response = await fetch(API_ENDPOINTS.cohortUpdate(groupId), {
      method: 'PUT',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    console.log('Update response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Update response:', result);

    // Return the updated group data
    const updatedGroup: Group = {
      id: groupId,
      name: groupData.name || '',
      description: groupData.description || '',
      state: groupData.state || '',
      district: groupData.district || '',
      block: groupData.block || '',
      village: groupData.village || '',
      createdAt: groupData.createdAt || new Date().toISOString().split('T')[0],
      status: groupData.status || 'Active'
    };

    return updatedGroup;
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
};

export const addUserToGroup = async (cohortId: string, userId: string, cohortAcademicYearId: string = 'edf1d200-21d8-417e-b844-1d04f92435f4'): Promise<any> => {
  try {
    console.log('Adding user to group:', { cohortId, userId, cohortAcademicYearId });
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

    // Get tenant ID
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) {
      throw new Error('Tenant ID not found. Please login again.');
    }

    // Prepare the request data
    const requestData = {
      cohortId,
      userId,
      cohortAcademicYearId
    };

    console.log('Add user to group request data:', requestData);

    // Make the API call
    const response = await fetch('https://shiksha-dev-interface.tekdinext.com/interface/v1/cohortmember/create', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'tenantId': tenantId,
        'academicYearId': cohortAcademicYearId
      },
      body: JSON.stringify(requestData)
    });

    console.log('Add user to group response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Add user to group response:', result);

    return result;
  } catch (error) {
    console.error('Error adding user to group:', error);
    throw error;
  }
};

/**
 * Delete a group
 */
export const deleteGroup = async (groupId: string): Promise<boolean> => {
  try {
    // TODO: Replace with actual API endpoint when available
    return true;
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

/**
 * Add users to a group
 */
export const addUsersToGroup = async (groupId: string, userIds: string[]): Promise<boolean> => {
  try {
    // TODO: Replace with actual API endpoint when available
    return true;
  } catch (error) {
    console.error('Error adding users to group:', error);
    throw error;
  }
};

/**
 * Remove users from a group
 */
export const removeUsersFromGroup = async (groupId: string, userIds: string[]): Promise<boolean> => {
  try {
    // TODO: Replace with actual API endpoint when available
    return true;
  } catch (error) {
    console.error('Error removing users from group:', error);
    throw error;
  }
};

/**
 * Add content to a group
 */
export const addContentToGroup = async (groupId: string, contentIds: string[]): Promise<boolean> => {
  try {
    // Try multiple token sources
    let token = localStorage.getItem('accessToken') || 
                localStorage.getItem('token') || 
                localStorage.getItem('authToken');
    
    // Try different tenant ID sources
    let tenantId = localStorage.getItem('tenantId') || 
                   localStorage.getItem('tenant_id') ||
                   '35529b5d-526f-4da5-bc6e-64f740023d26'; // Fallback from curl example
    
    // Try different academic year ID sources
    let academicYearId = localStorage.getItem('academicYearId') || 
                        localStorage.getItem('academic_year_id') ||
                        localStorage.getItem('academicYear') ||
                        'edf1d200-21d8-417e-b844-1d04f92435f4'; // Fallback from curl example
    
    // Try different user ID sources
    let userId = localStorage.getItem('userId') || 
                 localStorage.getItem('user_id') ||
                 localStorage.getItem('userID') ||
                 '0cf50e83-744a-42be-b21e-60ff67f7945d'; // Fallback from curl example

    console.log('Authentication data:', {
      token: token ? 'Present' : 'Missing',
      tenantId,
      academicYearId,
      userId
    });

    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_INTERFACE_URL || 'https://shiksha-dev-interface.tekdinext.com';
    
    console.log('Adding content to group:', {
      baseUrl,
      groupId,
      contentIds,
      tenantId,
      academicYearId,
      userId
    });
    
    // Add each content item to the group
    const promises = contentIds.map(async (contentId) => {
      const requestBody = {
        tenantId: tenantId,
        contentId: contentId,
        cohortId: groupId,
        userId: userId
      };

      console.log('Sending request for content:', contentId, requestBody);

      const response = await fetch(`${baseUrl}/interface/v1/user/cohortcontent`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'tenantId': tenantId,
          'academicyearid': academicYearId,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(`Failed to add content ${contentId}: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json();
      console.log('Success response for content:', contentId, responseData);
      return responseData;
    });

    await Promise.all(promises);
    console.log('All content added successfully');
    return true;
  } catch (error) {
    console.error('Error adding content to group:', error);
    throw error;
  }
};

/**
 * Remove content from a group
 */
export const removeContentFromGroup = async (groupId: string, contentIds: string[]): Promise<boolean> => {
  try {
    // TODO: Replace with actual API endpoint when available
    return true;
  } catch (error) {
    console.error('Error removing content from group:', error);
    throw error;
  }
};

/**
 * Archive content from a group
 */
export const archiveContentFromGroup = async (groupId: string, contentId: string): Promise<boolean> => {
  try {
    // Get authentication data from localStorage
    let token = localStorage.getItem('accessToken') || 
                 localStorage.getItem('token') || 
                 localStorage.getItem('authToken');
    let tenantId = localStorage.getItem('tenantId') || 
                   localStorage.getItem('tenant_id') ||
                   '35529b5d-526f-4da5-bc6e-64f740023d26'; // Fallback

    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_INTERFACE_URL || 'https://shiksha-dev-interface.tekdinext.com';
    
    const requestBody = {
      tenantId: tenantId,
      contentId: contentId,
      cohortId: groupId,
      status: 'archive'
    };

    console.log('Archiving content from group:', {
      baseUrl,
      groupId,
      contentId,
      tenantId
    });

    const response = await fetch(`${baseUrl}/interface/v1/user/cohortcontent`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'tenantId': tenantId
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to archive content: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Content archived successfully:', data);
    return true;
  } catch (error) {
    console.error('Error archiving content from group:', error);
    throw error;
  }
};

/**
 * Activate content in a group
 */
export const activateContentInGroup = async (groupId: string, contentId: string): Promise<boolean> => {
  try {
    // Get authentication data from localStorage
    let token = localStorage.getItem('accessToken') || 
                 localStorage.getItem('token') || 
                 localStorage.getItem('authToken');
    let tenantId = localStorage.getItem('tenantId') || 
                   localStorage.getItem('tenant_id') ||
                   '35529b5d-526f-4da5-bc6e-64f740023d26'; // Fallback

    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_INTERFACE_URL || 'https://shiksha-dev-interface.tekdinext.com';
    
    const requestBody = {
      tenantId: tenantId,
      contentId: contentId,
      cohortId: groupId,
      status: 'active'
    };

    console.log('Activating content in group:', {
      baseUrl,
      groupId,
      contentId,
      tenantId
    });

    const response = await fetch(`${baseUrl}/interface/v1/user/cohortcontent`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'tenantId': tenantId
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to activate content: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Content activated successfully:', data);
    return true;
  } catch (error) {
    console.error('Error activating content in group:', error);
    throw error;
  }
};

/**
 * Get content count and details for a group
 */
export const getGroupContent = async (groupId: string): Promise<GroupContentResponse> => {
  try {
    // Get authentication data from localStorage
    let token = localStorage.getItem('accessToken') || 
                 localStorage.getItem('token') || 
                 localStorage.getItem('authToken');
    let tenantId = localStorage.getItem('tenantId') || 
                   localStorage.getItem('tenant_id') ||
                   '35529b5d-526f-4da5-bc6e-64f740023d26'; // Fallback
    let academicYearId = localStorage.getItem('academicYearId') || 
                        localStorage.getItem('academic_year_id') ||
                        localStorage.getItem('academicYear') ||
                        'edf1d200-21d8-417e-b844-1d04f92435f4'; // Fallback

    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_INTERFACE_URL || 'https://shiksha-dev-interface.tekdinext.com';
    
    const requestBody = {
      filter: {
        cohortId: groupId
      }
    };

    console.log('Fetching group content:', {
      baseUrl,
      groupId,
      tenantId,
      academicYearId
    });

    const response = await fetch(`${baseUrl}/interface/v1/user/cohortcontent/search`, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'academicyearid': academicYearId,
        'tenantid': tenantId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle 404 case - group has no content, which is normal
      if (response.status === 404) {
        console.log(`No content found for group ${groupId} - this is normal for new groups`);
        return {
          content: [],
          totalCount: 0
        };
      }
      
      throw new Error(`Failed to fetch group content: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Group content response:', data);

    // The API returns an array of cohort content items in data.result
    const contentArray = data.result || [];
    const transformedContent: GroupContent[] = Array.isArray(contentArray) ? contentArray.map((item: any) => ({
      contentId: item.contentId,
      contentName: `Content ${item.contentId}`, // We'll need to fetch actual content details separately
      contentType: 'Unknown', // We'll need to fetch actual content details separately
      duration: undefined,
      primaryCategory: 'Unknown', // We'll need to fetch actual content details separately
      addedAt: item.createdAt || new Date().toISOString(),
      status: item.status || 'active'
    })) : [];

    return {
      content: transformedContent,
      totalCount: contentArray.length
    };
  } catch (error) {
    console.error('Error fetching group content:', error);
    throw error;
  }
};
