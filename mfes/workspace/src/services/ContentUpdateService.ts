import { post } from './RestClient';
import { getLocalStoredUserId } from './LocalStorageService';

/**
 * Updates content metadata with a new property (e.g., url)
 * @param identifier - Content identifier
 * @param updateData - Data to update (e.g., { url: "https://..." })
 * @returns Promise with the update response
 * @throws Error if update fails
 */
export async function updateContent(
  identifier: string,
  updateData: Record<string, unknown>
): Promise<any> {
  if (!identifier) {
    throw new Error('Content identifier is required for update');
  }

  try {
    console.log(`[ContentUpdate] Updating content ${identifier}`);
    console.log(`[ContentUpdate] Update data:`, JSON.stringify(updateData, null, 2));

    const requestBody = {
      request: {
        content: {
          ...updateData,
          lastUpdatedBy: getLocalStoredUserId(),
        },
      },
    };

    console.log(`[ContentUpdate] Request body:`, JSON.stringify(requestBody, null, 2));
    console.log(`[ContentUpdate] API URL: /action/content/v3/update/${identifier}`);

    const apiUrl = `/action/content/v3/update/${identifier}`;
    const response = await post(apiUrl, requestBody);

    console.log(`[ContentUpdate] Update API response status:`, response.status);
    console.log(`[ContentUpdate] Update API response data:`, JSON.stringify(response.data, null, 2));
    
    // Check if the response indicates success
    if (response.data?.responseCode !== 'OK' && response.data?.responseCode !== 200) {
      const errorMsg = response.data?.params?.errmsg || response.data?.params?.err || 'Update may have failed';
      console.warn(`[ContentUpdate] Update response indicates potential failure:`, errorMsg);
    }
    
    // Verify the content was updated by checking the response
    const updatedContent = response.data?.result?.content || response.data?.result;
    if (updatedContent) {
      console.log(`[ContentUpdate] Updated content in response:`, {
        identifier: updatedContent.identifier,
        url: updatedContent.url,
        hasUrl: !!updatedContent.url,
        versionKey: updatedContent.versionKey,
      });
    }
    
    console.log(`[ContentUpdate] Successfully updated content ${identifier}`);
    return response.data;
  } catch (error: any) {
    console.error(`[ContentUpdate] Error updating content ${identifier}:`, error);
    console.error(`[ContentUpdate] Error details:`, {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    });
    
    // Extract error message from API response if available
    const apiError = error?.response?.data?.params?.errmsg || 
                     error?.response?.data?.params?.err ||
                     error?.response?.data?.message ||
                     error?.message;
    
    if (error?.response?.status === 404 || apiError?.includes('not found')) {
      throw new Error('Update API failure: Content not found (404).');
    }
    if (error?.response?.status === 403 || apiError?.includes('permission') || apiError?.includes('403')) {
      throw new Error('Update API failure: Permission denied (403).');
    }
    if (apiError?.includes('versionKey') || apiError?.includes('version')) {
      throw new Error('Update API failure: Version conflict. Content may have been modified by another user.');
    }
    if (apiError?.includes('Invalid URL') || apiError?.includes('invalid') || apiError?.includes('URL')) {
      throw new Error(`Update API failure: Invalid URL. API response: ${JSON.stringify(error?.response?.data || apiError)}`);
    }
    
    throw new Error(`Update API failure: ${apiError || 'Unknown error'}`);
  }
}

/**
 * Updates content with a URL property specifically
 * @param identifier - Content identifier
 * @param url - The URL to add to content
 * @param versionKey - Optional version key for optimistic locking
 * @returns Promise with the update response
 */
export async function updateContentWithUrl(
  identifier: string,
  url: string,
  versionKey?: string
): Promise<any> {
  // Add 'url' property with the cloud storage URL
  // Note: 'artifactUrl' is the original URL, 'url' is the new cloud storage URL
  const updateData: Record<string, unknown> = { 
    url: url, // Cloud storage URL (e.g., Google Cloud Storage)
  };
  
  // Include versionKey if provided (required for optimistic locking)
  if (versionKey) {
    updateData.versionKey = versionKey;
  }
  
  console.log(`[ContentUpdate] Updating with URL: ${url}, versionKey: ${versionKey || 'not provided'}`);
  
  return updateContent(identifier, updateData);
}

