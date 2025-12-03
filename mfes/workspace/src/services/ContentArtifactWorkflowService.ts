import { downloadFile } from '../utils/fileDownloadUtils';
import {
  detectArtifactType,
  requiresCloudUpload,
  getContentTypeForArtifact,
  generateCloudFileName,
  ArtifactType,
} from '../utils/contentTypeDetection';
import { GoogleCloudStorageService, createGCSService } from './GoogleCloudStorageService';
import { updateContentWithUrl } from './ContentUpdateService';
import { publishContent, sendForReview } from './ContentService';
import { fetchContent } from './PlayerService';
import axios from 'axios';

/**
 * Configuration for the content artifact workflow
 */
export interface ArtifactWorkflowConfig {
  gcsConfig?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
    bucketName: string;
  };
  authToken?: string; // Auth token for server-side API calls
  tenantId?: string; // Tenant ID for server-side API calls
  req?: any; // Request object for cookie forwarding
}

/**
 * Result of the artifact processing workflow
 */
export interface ArtifactWorkflowResult {
  success: boolean;
  artifactType: ArtifactType;
  uploadedUrl?: string;
  updated: boolean;
  republished: boolean;
  message: string;
  error?: string;
}

/**
 * Main service for handling content artifact workflow
 * This service orchestrates the download → upload → update → publish workflow
 */
export class ContentArtifactWorkflowService {
  private gcsService: GoogleCloudStorageService;
  private authToken?: string;
  private tenantId?: string;
  private req?: any;

  constructor(config?: ArtifactWorkflowConfig) {
    // Initialize GCS service with provided config or default
    if (config?.gcsConfig) {
      this.gcsService = new GoogleCloudStorageService(config.gcsConfig);
    } else {
      // Use environment variables or create with default config
      this.gcsService = createGCSService();
    }
    
    // Store auth token, tenant ID, and request for server-side API calls
    this.authToken = config?.authToken;
    this.tenantId = config?.tenantId;
    this.req = config?.req;
  }

  /**
   * Processes content artifact workflow after content is fetched
   * This is the main entry point that orchestrates:
   * 1. Detect artifact type
   * 2. Download file (for PDF/MP4 only)
   * 3. Upload to cloud storage
   * 4. Update content with URL
   * 5. Republish content
   * 
   * @param contentData - Content data from fetchContent()
   * @returns Promise<ArtifactWorkflowResult> - Result of the workflow
   */
  async processContentArtifact(contentData: any): Promise<ArtifactWorkflowResult> {
    const identifier = contentData?.identifier;
    const artifactUrl = contentData?.artifactUrl;
    const mimeType = contentData?.mimeType;
    const initialVersionKey = contentData?.versionKey;
    const channel = contentData?.channel;
    const primaryCategory = contentData?.primaryCategory;

    console.log('[ArtifactWorkflow] Starting artifact processing workflow...');
    console.log(`[ArtifactWorkflow] Content ID: ${identifier}`);
    console.log(`[ArtifactWorkflow] Artifact URL: ${artifactUrl}`);
    console.log(`[ArtifactWorkflow] MIME Type: ${mimeType}`);
    console.log(`[ArtifactWorkflow] Initial versionKey: ${initialVersionKey}`);

    // Step 1: Validate content data
    if (!identifier) {
      const error = 'Content identifier is missing';
      console.error(`[ArtifactWorkflow] ${error}`);
      return {
        success: false,
        artifactType: ArtifactType.UNSUPPORTED,
        updated: false,
        republished: false,
        message: 'Workflow failed: Content identifier is missing',
        error,
      };
    }

    // Step 1b: Channel/Category guardrail - run workflow only for Learning Resource in swadhaar-channel
    const shouldProcess =
      channel === 'swadhaar-channel' &&
      primaryCategory?.toLowerCase() === 'learning resource'.toLowerCase();

    if (!shouldProcess) {
      const reason = `[ArtifactWorkflow] Skipping workflow for channel=${channel} primaryCategory=${primaryCategory}`;
      console.log(reason);
      return {
        success: true,
        artifactType: ArtifactType.UNSUPPORTED,
        updated: false,
        republished: false,
        message:
          'Workflow skipped: Cloud migration runs only for Learning Resource in swadhaar-channel',
      };
    }

    if (!artifactUrl) {
      const error = 'Artifact URL is missing from content';
      console.warn(`[ArtifactWorkflow] ${error}`);
      return {
        success: false,
        artifactType: ArtifactType.UNSUPPORTED,
        updated: false,
        republished: false,
        message: 'Workflow skipped: No artifact URL found',
        error,
      };
    }

    // Step 2: Detect artifact type
    let artifactType: ArtifactType;
    try {
      artifactType = detectArtifactType(artifactUrl, mimeType);
      console.log(`[ArtifactWorkflow] Detected artifact type: ${artifactType}`);
    } catch (error) {
      const errorMsg = `Failed to detect artifact type: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[ArtifactWorkflow] ${errorMsg}`);
      return {
        success: false,
        artifactType: ArtifactType.UNSUPPORTED,
        updated: false,
        republished: false,
        message: errorMsg,
        error: errorMsg,
      };
    }

    // Step 3: Handle YouTube links differently (skip download/upload, but still update URL)
    let uploadedUrl: string;
    if (artifactType === ArtifactType.YOUTUBE) {
      console.log('[ArtifactWorkflow] Detected YouTube link - skipping download/upload, using original URL');
      // For YouTube, use the artifactUrl directly as the URL to store
      uploadedUrl = artifactUrl;
      console.log(`[ArtifactWorkflow] Will store YouTube URL: ${uploadedUrl}`);
    } else if (!requiresCloudUpload(artifactType)) {
      // For other unsupported types, skip the workflow
      console.log(`[ArtifactWorkflow] Skipping workflow for ${artifactType} (not PDF, MP4, or YouTube)`);
      return {
        success: true,
        artifactType,
        updated: false,
        republished: false,
        message: `Workflow skipped: ${artifactType} artifacts do not require cloud upload`,
      };
    } else {
      // Step 4: Download file from artifactUrl (for PDF/MP4 only)
      let fileBuffer: Buffer;
      try {
        console.log('[ArtifactWorkflow] Downloading file from artifactUrl...');
        fileBuffer = await downloadFile(artifactUrl);
        console.log(`[ArtifactWorkflow] Downloaded ${fileBuffer.length} bytes`);
      } catch (error) {
        const errorMsg = `Failed to download artifact: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[ArtifactWorkflow] ${errorMsg}`);
        return {
          success: false,
          artifactType,
          updated: false,
          republished: false,
          message: errorMsg,
          error: errorMsg,
        };
      }

      // Step 5: Generate cloud storage filename
      const cloudFileName = generateCloudFileName(artifactUrl, artifactType, identifier);
      const contentType = getContentTypeForArtifact(artifactType);
      console.log(`[ArtifactWorkflow] Generated cloud filename: ${cloudFileName}`);

      // Step 6: Upload to Google Cloud Storage
      try {
        console.log('[ArtifactWorkflow] Uploading to Google Cloud Storage...');
        uploadedUrl = await this.gcsService.uploadFile(fileBuffer, cloudFileName, contentType);
        console.log(`[ArtifactWorkflow] Uploaded successfully. URL: ${uploadedUrl}`);
      } catch (error) {
        const errorMsg = `Failed to upload to cloud storage: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[ArtifactWorkflow] ${errorMsg}`);
        return {
          success: false,
          artifactType,
          updated: false,
          republished: false,
          message: errorMsg,
          error: errorMsg,
        };
      }
    }

    // Step 7: Fetch latest content in edit mode to get fresh versionKey (required after publish)
    let latestContentData: any;
    try {
      console.log('[ArtifactWorkflow] Fetching latest content in edit mode to get fresh versionKey...');
      
      // On server-side, use direct API call with proper base URL
      const isServer = typeof window === 'undefined';
      if (isServer) {
        const baseUrl =  'https://interface.tekdinext.com/interface/v1';
          // process.env.NEXT_PUBLIC_LOGIN_URL ||
          // process.env.NEXT_PUBLIC_MIDDLEWARE_URL ||
          // process.env.NEXT_PUBLIC_BASE_URL ||
          // 'https://interface.tekdinext.com/interface/v1';
        const FIELDS = 'transcripts,ageGroup,appIcon,artifactUrl,attributions,attributions,audience,author,badgeAssertions,body,channel,code,concepts,contentCredits,contentType,contributors,copyright,copyrightYear,createdBy,createdOn,creator,creators,description,displayScore,domain,editorState,flagReasons,flaggedBy,flags,framework,identifier,itemSetPreviewUrl,keywords,language,languageCode,lastUpdatedOn,license,mediaType,mimeType,name,originData,osId,owner,pkgVersion,publisher,questions,resourceType,scoreDisplayConfig,status,streamingUrl,template,templateId,totalQuestions,totalScore,versionKey,visibility,year,primaryCategory,additionalCategories,interceptionPoints,interceptionType';
        const url = `${baseUrl}/action/content/v3/read/${identifier}?mode=edit&fields=${FIELDS}`;
        
        console.log('[ArtifactWorkflow] Server-side fetch URL:', url);
        
        // Prepare headers with auth token, tenant ID, and cookies
        const headers: any = {};
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.tenantId) {
          headers['tenantId'] = this.tenantId; // Match the header name used in proxy.ts
        }
        if (this.req?.headers?.cookie) {
          headers['Cookie'] = this.req.headers.cookie;
        }
        
        const response = await axios.get(url, { headers });
        
        latestContentData = response.data.result.content;
      } else {
        // Client-side: use fetchContent function
        latestContentData = await fetchContent(identifier);
      }
      
      console.log('[ArtifactWorkflow] Latest content fetched in edit mode');
      console.log('[ArtifactWorkflow] Content data:', {
        identifier: latestContentData?.identifier,
        versionKey: latestContentData?.versionKey,
        status: latestContentData?.status,
        hasVersionKey: !!latestContentData?.versionKey,
      });
      
      if (!latestContentData?.versionKey) {
        throw new Error('Version key not found in content data. Ensure content is fetched in edit mode.');
      }
      
      console.log('[ArtifactWorkflow] VersionKey obtained:', latestContentData.versionKey);
    } catch (error) {
      const errorMsg = `Failed to fetch latest content in edit mode: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[ArtifactWorkflow] ${errorMsg}`);
      return {
        success: false,
        artifactType,
        uploadedUrl,
        updated: false,
        republished: false,
        message: errorMsg,
        error: errorMsg,
      };
    }

    // Step 8: Update content with the new URL using fresh versionKey
    let updateSuccess = false;
    try {
      console.log('[ArtifactWorkflow] Updating content with cloud URL...');
      // Use fresh versionKey from latest content data (required for optimistic locking)
      const versionKey = latestContentData?.versionKey;
      if (!versionKey) {
        throw new Error('Version key is missing from latest content data');
      }
      console.log(`[ArtifactWorkflow] Updating with URL: ${uploadedUrl}, versionKey: ${versionKey}`);
      
      // On server-side, use direct API call with proper base URL and authentication
      const isServer = typeof window === 'undefined';
      let updateResponse: any;
      
      if (isServer) {
        // Server-side: use direct axios call
        const baseUrl =  'https://interface.tekdinext.com/interface/v1';
          // process.env.NEXT_PUBLIC_LOGIN_URL ||
          // process.env.NEXT_PUBLIC_MIDDLEWARE_URL ||
          // process.env.NEXT_PUBLIC_BASE_URL ||
          // 'https://interface.tekdinext.com/interface/v1';
        console.log('[ArtifactWorkflow] Base URL:', baseUrl);
        const apiUrl = `${baseUrl}/action/content/v3/update/${identifier}`;
        
        // Get userId from request cookies or contentData
        let userId: string | undefined;
        if (this.req?.headers?.cookie) {
          // Try to extract userId from cookies
          const cookieMatch = this.req.headers.cookie.match(/userId=([^;]+)/);
          if (cookieMatch) {
            userId = cookieMatch[1];
          }
        }
        // Fallback to contentData.createdBy if available
        if (!userId && contentData?.createdBy) {
          userId = contentData.createdBy;
        }
        
        const requestBody = {
          request: {
            content: {
              url: uploadedUrl,
              versionKey: versionKey,
              ...(userId && { lastUpdatedBy: userId }),
            },
          },
        };
        
        console.log('[ArtifactWorkflow] Server-side update URL:', apiUrl);
        console.log('[ArtifactWorkflow] Update request body:', JSON.stringify(requestBody, null, 2));
        console.log('[ArtifactWorkflow] Using userId:', userId || 'not found');
        
        // Prepare headers with auth token, tenant ID, and cookies
        const headers: any = {
          'Content-Type': 'application/json',
        };
        const channelId =
          contentData?.channel ||
          latestContentData?.channel ||
          this.req?.headers?.['x-channel-id'];
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.tenantId) {
          headers['tenantId'] = this.tenantId; // Match the header name used in proxy.ts
        }
        if (channelId) {
          headers['X-Channel-Id'] = channelId;
        }
        if (this.req?.headers?.cookie) {
          headers['Cookie'] = this.req.headers.cookie;
        }
        if (userId) {
          headers['user-id'] = userId;
        }
        
        console.log('[ArtifactWorkflow] Request headers:', {
          hasAuthToken: !!this.authToken,
          tenantId: this.tenantId,
          hasCookies: !!this.req?.headers?.cookie,
          headerTenantId: headers['tenantId'],
        });
        
        try {
          const response = await axios.patch(apiUrl, requestBody, { headers });
          updateResponse = response.data;
          
          console.log('[ArtifactWorkflow] Update API response status:', response.status);
          console.log('[ArtifactWorkflow] Update API response data:', JSON.stringify(updateResponse, null, 2));
          
          // Check if the response indicates success
          if (updateResponse?.responseCode !== 'OK' && updateResponse?.responseCode !== 200) {
            const errorMsg = updateResponse?.params?.errmsg || updateResponse?.params?.err || 'Update may have failed';
            throw new Error(`Update API failure: ${errorMsg}`);
          }
        } catch (updateError: any) {
          // Enhanced error logging for 400 errors
          console.error('[ArtifactWorkflow] Update API error:', {
            status: updateError?.response?.status,
            statusText: updateError?.response?.statusText,
            data: updateError?.response?.data,
            message: updateError?.message,
            url: updateError?.config?.url,
            requestBody: updateError?.config?.data,
          });
          
          const errorMsg = updateError?.response?.data?.params?.errmsg || 
                          updateError?.response?.data?.params?.err ||
                          updateError?.response?.data?.message ||
                          updateError?.message ||
                          'Unknown error';
          
          throw new Error(`Update API failure (${updateError?.response?.status || 'unknown'}): ${errorMsg}`);
        }
      } else {
        // Client-side: use updateContentWithUrl function
        updateResponse = await updateContentWithUrl(identifier, uploadedUrl, versionKey);
        console.log('[ArtifactWorkflow] Update API response:', JSON.stringify(updateResponse, null, 2));
      }
      
      // Verify the update was successful by fetching content again
      console.log('[ArtifactWorkflow] Verifying update by fetching content again...');
      let verifyContent: any;
      
      if (isServer) {
        // Server-side: fetch again with direct API call
        const baseUrl =  'https://interface.tekdinext.com/interface/v1';
          // process.env.NEXT_PUBLIC_LOGIN_URL ||
          // process.env.NEXT_PUBLIC_MIDDLEWARE_URL ||
          // process.env.NEXT_PUBLIC_BASE_URL ||
          // 'https://interface.tekdinext.com/interface/v1';
        const FIELDS = 'transcripts,ageGroup,appIcon,artifactUrl,attributions,attributions,audience,author,badgeAssertions,body,channel,code,concepts,contentCredits,contentType,contributors,copyright,copyrightYear,createdBy,createdOn,creator,creators,description,displayScore,domain,editorState,flagReasons,flaggedBy,flags,framework,identifier,itemSetPreviewUrl,keywords,language,languageCode,lastUpdatedOn,license,mediaType,mimeType,name,originData,osId,owner,pkgVersion,publisher,questions,resourceType,scoreDisplayConfig,status,streamingUrl,template,templateId,totalQuestions,totalScore,versionKey,visibility,year,primaryCategory,additionalCategories,interceptionPoints,interceptionType,url';
        const verifyUrl = `${baseUrl}/action/content/v3/read/${identifier}?mode=edit&fields=${FIELDS}`;
        
        const headers: any = {};
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.tenantId) {
          headers['tenantId'] = this.tenantId; // Match the header name used in proxy.ts
        }
        if (this.req?.headers?.cookie) {
          headers['Cookie'] = this.req.headers.cookie;
        }
        
        const verifyResponse = await axios.get(verifyUrl, { headers });
        verifyContent = verifyResponse.data.result.content;
      } else {
        // Client-side: use fetchContent function
        verifyContent = await fetchContent(identifier);
      }
      
      console.log('[ArtifactWorkflow] Content after update verification:', {
        identifier: verifyContent?.identifier,
        url: verifyContent?.url,
        hasUrl: !!verifyContent?.url,
        versionKey: verifyContent?.versionKey,
      });
      
      if (!verifyContent?.url) {
        throw new Error(`URL property was not added to content. Update may have failed. Expected URL: ${uploadedUrl}`);
      }
      
      if (verifyContent.url !== uploadedUrl) {
        console.warn(`[ArtifactWorkflow] URL mismatch. Expected: ${uploadedUrl}, Got: ${verifyContent.url}`);
      }
      
      updateSuccess = true;
      console.log('[ArtifactWorkflow] Content updated successfully with URL property:', verifyContent.url);
    } catch (error) {
      const errorMsg = `Failed to update content: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[ArtifactWorkflow] ${errorMsg}`);
      console.error(`[ArtifactWorkflow] Error details:`, error);
      return {
        success: false,
        artifactType,
        uploadedUrl,
        updated: false,
        republished: false,
        message: errorMsg,
        error: errorMsg,
      };
    }

    // Step 9: Fetch latest content again in edit mode after update to get fresh versionKey for republish
    let contentAfterUpdate: any;
    try {
      console.log('[ArtifactWorkflow] Fetching content in edit mode after update to get fresh versionKey for republish...');
      
      // On server-side, use direct API call with proper base URL
      const isServer = typeof window === 'undefined';
      if (isServer) {
        const baseUrl =  'https://interface.tekdinext.com/interface/v1';
          // process.env.NEXT_PUBLIC_LOGIN_URL ||
          // process.env.NEXT_PUBLIC_MIDDLEWARE_URL ||
          // process.env.NEXT_PUBLIC_BASE_URL ||
          // 'https://interface.tekdinext.com/interface/v1';
        const FIELDS = 'transcripts,ageGroup,appIcon,artifactUrl,attributions,attributions,audience,author,badgeAssertions,body,channel,code,concepts,contentCredits,contentType,contributors,copyright,copyrightYear,createdBy,createdOn,creator,creators,description,displayScore,domain,editorState,flagReasons,flaggedBy,flags,framework,identifier,itemSetPreviewUrl,keywords,language,languageCode,lastUpdatedOn,license,mediaType,mimeType,name,originData,osId,owner,pkgVersion,publisher,questions,resourceType,scoreDisplayConfig,status,streamingUrl,template,templateId,totalQuestions,totalScore,versionKey,visibility,year,primaryCategory,additionalCategories,interceptionPoints,interceptionType,url';
        const url = `${baseUrl}/action/content/v3/read/${identifier}?mode=edit&fields=${FIELDS}`;
        
        console.log('[ArtifactWorkflow] Server-side fetch URL after update:', url);
        
        // Prepare headers with auth token, tenant ID, and cookies
        const headers: any = {};
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.tenantId) {
          headers['tenantId'] = this.tenantId; // Match the header name used in proxy.ts
        }
        if (this.req?.headers?.cookie) {
          headers['Cookie'] = this.req.headers.cookie;
        }
        
        const response = await axios.get(url, { headers });
        
        contentAfterUpdate = response.data.result.content;
      } else {
        // Client-side: use fetchContent function
        contentAfterUpdate = await fetchContent(identifier);
      }
      
      console.log('[ArtifactWorkflow] Content after update fetched in edit mode');
      console.log('[ArtifactWorkflow] Content data after update:', {
        identifier: contentAfterUpdate?.identifier,
        versionKey: contentAfterUpdate?.versionKey,
        url: contentAfterUpdate?.url,
        status: contentAfterUpdate?.status,
        hasVersionKey: !!contentAfterUpdate?.versionKey,
        hasUrl: !!contentAfterUpdate?.url,
      });
      
      if (!contentAfterUpdate?.versionKey) {
        console.warn('[ArtifactWorkflow] VersionKey not found after update, using previous versionKey');
        contentAfterUpdate = latestContentData;
      }
    } catch (error) {
      const errorMsg = `Failed to fetch content after update: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[ArtifactWorkflow] ${errorMsg}`);
      // Continue with republish using previous versionKey as fallback
      console.warn('[ArtifactWorkflow] Continuing with republish using previous versionKey');
      contentAfterUpdate = latestContentData;
    }

    // Step 10: Send content for review
    let reviewSuccess = false;
    try {
      console.log('[ArtifactWorkflow] Sending content for review with updated URL...');
      
      const isServer = typeof window === 'undefined';
      if (isServer) {
        // Server-side: use direct axios call
        const baseUrl = 'https://interface.tekdinext.com/interface/v1';
        const apiUrl = `${baseUrl}/action/content/v3/review/${identifier}`;
        
        console.log('[ArtifactWorkflow] Server-side review URL:', apiUrl);
        
        // Prepare headers with auth token, tenant ID, X-Channel-Id, and cookies
        const headers: any = {
          'Content-Type': 'application/json',
        };
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.tenantId) {
          headers['tenantId'] = this.tenantId;
        }
        // Extract channel ID from content data or use default
        const channelId = contentData?.channel || 'swadhaar-channel';
        headers['X-Channel-Id'] = channelId;
        if (this.req?.headers?.cookie) {
          headers['Cookie'] = this.req.headers.cookie;
        }
        
        console.log('[ArtifactWorkflow] Review request headers:', {
          hasAuthToken: !!this.authToken,
          tenantId: this.tenantId,
          channelId: channelId,
          hasCookies: !!this.req?.headers?.cookie,
        });
        
        const response = await axios.post(apiUrl, {}, { headers });
        console.log('[ArtifactWorkflow] Review API response status:', response.status);
        console.log('[ArtifactWorkflow] Review API response data:', JSON.stringify(response.data, null, 2));
        
        reviewSuccess = true;
        console.log('[ArtifactWorkflow] Content sent for review successfully');
      } else {
        // Client-side: use sendForReview function
        await sendForReview(identifier);
        reviewSuccess = true;
        console.log('[ArtifactWorkflow] Content sent for review successfully');
      }
    } catch (error) {
      const errorMsg = `Failed to send content for review: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[ArtifactWorkflow] ${errorMsg}`);
      // Continue to publish even if review fails
      console.warn('[ArtifactWorkflow] Review submission failed, but continuing to publish');
    }

    // Step 11: Publish content after review
    let republishSuccess = false;
    try {
      console.log('[ArtifactWorkflow] Publishing content with updated URL...');
      
      const isServer = typeof window === 'undefined';
      if (isServer) {
        // Server-side: use direct axios call
        const baseUrl = 'https://interface.tekdinext.com/interface/v1';
        const apiUrl = `${baseUrl}/action/content/v3/publish/${identifier}`;
        
        // Get userId from request cookies or contentData
        let userId: string | undefined;
        if (this.req?.headers?.cookie) {
          const cookieMatch = this.req.headers.cookie.match(/userId=([^;]+)/);
          if (cookieMatch) {
            userId = cookieMatch[1];
          }
        }
        if (!userId && contentData?.createdBy) {
          userId = contentData.createdBy;
        }
        
        const requestBody = {
          request: {
            content: {
              lastPublishedBy: userId || '4036f40a-dbab-4ad5-bb13-5bf4ffb8d765',
              publishChecklist: {
                publishChecklist: [
                  'Correct Spellings and Grammar',
                  'Simple Language',
                  'Content/Audio/Video quality',
                  'Suitable font size for app and portal',
                  'Copyright infringement (images and texts)',
                  'Appropriate Title',
                  'Standard description of the course/resource',
                  'Relevant tags and keywords',
                  'Appropritae image',
                ],
              },
            },
          },
        };
        
        console.log('[ArtifactWorkflow] Server-side publish URL:', apiUrl);
        console.log('[ArtifactWorkflow] Publish request body:', JSON.stringify(requestBody, null, 2));
        
        // Prepare headers with auth token, tenant ID, and cookies
        const headers: any = {
          'Content-Type': 'application/json',
        };
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.tenantId) {
          headers['tenantId'] = this.tenantId;
        }
        if (this.req?.headers?.cookie) {
          headers['Cookie'] = this.req.headers.cookie;
        }
        
        console.log('[ArtifactWorkflow] Publish request headers:', {
          hasAuthToken: !!this.authToken,
          tenantId: this.tenantId,
          hasCookies: !!this.req?.headers?.cookie,
        });
        
        const response = await axios.post(apiUrl, requestBody, { headers });
        console.log('[ArtifactWorkflow] Publish API response status:', response.status);
        console.log('[ArtifactWorkflow] Publish API response data:', JSON.stringify(response.data, null, 2));
        
        republishSuccess = true;
        console.log('[ArtifactWorkflow] Content published successfully');
      } else {
        // Client-side: use publishContent function
        await publishContent(identifier, {
          publishChecklist: [
            'No Hate speech, Abuse, Violence, Profanity',
            'Is suitable for children',
            'Correct Board, Grade, Subject, Medium',
            'Appropriate Title, Description',
            'No Sexual content, Nudity or Vulgarity',
            'No Discrimination or Defamation',
            'Appropriate tags such as Resource Type, Concepts',
            'Relevant Keywords',
            'Audio (if any) is clear and easy to understand',
            'No Spelling mistakes in the text',
            'Language is simple to understand',
            'Can see the content clearly on Desktop and App',
            'Content plays correctly',
          ],
        });
        republishSuccess = true;
        console.log('[ArtifactWorkflow] Content published successfully');
      }
    } catch (error) {
      const errorMsg = `Failed to publish content: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[ArtifactWorkflow] ${errorMsg}`);
      // Content was updated and sent for review, but publish failed
      return {
        success: false,
        artifactType,
        uploadedUrl,
        updated: updateSuccess,
        republished: false,
        message: errorMsg,
        error: errorMsg,
      };
    }

    // Success!
    console.log('[ArtifactWorkflow] Workflow completed successfully!');
    return {
      success: true,
      artifactType,
      uploadedUrl,
      updated: updateSuccess,
      republished: republishSuccess,
      message: 'Artifact workflow completed successfully: File uploaded, content updated with URL, sent for review, and published',
    };
  }
}

/**
 * Creates a workflow service instance with default configuration
 * Uses service account credentials from provided config or environment variables
 * 
 * @param config - Optional configuration for GCS
 * @returns ContentArtifactWorkflowService instance
 */
export function createArtifactWorkflowService(
  config?: ArtifactWorkflowConfig
): ContentArtifactWorkflowService {
  return new ContentArtifactWorkflowService(config);
}

