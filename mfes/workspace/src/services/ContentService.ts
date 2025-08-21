import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { getLocalStoredUserId } from './LocalStorageService';

const userId = getLocalStoredUserId();

interface ContentRecord {
  cont_title?: string;
  cont_description?: string;
  language?: string;
  resourse_type?: string;
  author?: string;
  publisher?: string;
  year?: string;
  cont_url?: string;
  cont_dwurl?: string;
  access?: string;
  image?: string;
  thumbnail?: string;
  domain?: string;
  sub_domain?: string;
  content_language?: string;
  primary_user?: string;
  target_age_group?: string;
  program?: string;
  subjects?: string;
  topic?: string;
  sub_category?: string;
  cont_tagwords?: string;
  old_system_content_id?: string;
  convertedUrl?: string;
}

export const getPrimaryCategory = async (channelId: string) => {
  try {
    const response = await axios.get(`/api/channel/v1/read/${channelId}`);
    return response?.data?.result;
  } catch (e) {
    console.error('getPrimaryCategory error:', e);
    return undefined;
  }
};

export const getFrameworkDetails = async (frameworkId: string) => {
  try {
    const response = await axios.get(`/api/framework/v1/read/${frameworkId}`);
    return response?.data;
  } catch (error) {
    console.error('Error in getting Framework Details', error);
    throw error;
  }
};

export const getReqBodyWithStatus = (
  status: string[],
  query: string,
  limit: number,
  offset: number,
  primaryCategory: any,
  sort_by: any,
  channel: string,
  contentType?: string,
  state?: string
) => {
  const filters: any = {
    status,
    primaryCategory,
    channel: [channel],
    ...(contentType ? { contentType: [contentType] } : {}),
    ...(state ? { state: [state] } : {}),
  };

  // CreatedBy behavior to support My/Discover/UpForReview screens
  if (contentType === 'discover-contents') {
    filters.createdBy = { '!=': userId };
  } else if (contentType === 'upReview') {
    // no createdBy filter
  } else {
    filters.createdBy = userId;
  }

  return {
    request: {
      filters,
      query,
      limit,
      offset,
      sort_by,
    },
  };
};

export const getContent = async (
  status: string[],
  query: string,
  limit: number,
  offset: number,
  primaryCategory: any,
  sort_by: any,
  channel: string,
  contentType?: string,
  state?: string
) => {
  const apiURL = '/action/composite/v3/search';
  try {
    const reqBody = getReqBodyWithStatus(
      status,
      query,
      limit,
      offset,
      primaryCategory,
      sort_by,
      channel,
      contentType,
      state
    );
    const response = await axios.post(apiURL, reqBody);
    return response?.data?.result;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
};

export class ContentService {
  private readonly middlewareUrl: string;
  private readonly framework: string;
  private readonly tenantId: string;
  private readonly channelId: string;
  private readonly imageBaseUrl: string;
  private readonly awsBucketName?: string;
  private readonly awsRegion?: string;

  constructor() {
    this.middlewareUrl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL || '';
    this.framework = process.env.NEXT_PUBLIC_FRAMEWORK || 'atree-framework';
    this.tenantId =
      process.env.NEXT_PUBLIC_TENANT_ID ||
      '3a849655-30f6-4c2b-8707-315f1ed64fbd';
    this.channelId = process.env.NEXT_PUBLIC_CHANNEL_ID || 'atree-channel';
    this.imageBaseUrl = 'https://atreefrontend.s3.ap-south-1.amazonaws.com';
    this.awsBucketName = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
    this.awsRegion = process.env.NEXT_PUBLIC_AWS_REGION;
  }

  private isApiSuccess(data: any): boolean {
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      return (
        data?.success === true ||
        data?.responseCode === 'OK' ||
        data?.params?.status === 'successful'
      );
    } catch (_e) {
      return false;
    }
  }

  private toArray(value: string | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }

  private validateMimeType(mimeType: string): boolean {
    const allowedMimeTypes = [
      'application/vnd.ekstep.ecml-archive',
      'application/vnd.ekstep.html-archive',
      'application/vnd.android.package-archive',
      'application/vnd.ekstep.content-archive',
      'application/vnd.ekstep.content-collection',
      'application/vnd.ekstep.plugin-archive',
      'application/vnd.ekstep.h5p-archive',
      'application/epub',
      'text/x-url',
      'video/x-youtube',
      'application/octet-stream',
      'application/msword',
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'image/gif',
      'image/svg+xml',
      'video/avi',
      'video/mpeg',
      'video/quicktime',
      'video/3gpp',
      'video/mp4',
      'video/ogg',
      'video/webm',
      'audio/mp3',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/webm',
      'audio/x-wav',
      'audio/wav',
      'application/json',
      'application/quiz',
    ];
    return allowedMimeTypes.includes(mimeType);
  }

  private async validateFileUrl(
    fileUrl: string,
    record: ContentRecord
  ): Promise<boolean> {
    const SUPPORTED_FILE_TYPES = ['pdf', 'mp4', 'zip', 'mp3', 'html'];
    const isYouTubeUrl =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(fileUrl);
    const isGoogleDriveUrl =
      /drive\.google\.com\/(file\/d\/|uc\?export=download&id=)/.test(fileUrl);

    if (isYouTubeUrl) {
      console.log(`Skipping file existence check for YouTube URL: ${fileUrl}`);
      return true;
    }

    if (isGoogleDriveUrl) {
      console.log(
        `Skipping file existence check for Google Drive URL: ${fileUrl}`
      );
      return true;
    }

    const ext = fileUrl.split('.').pop()?.toLowerCase();

    try {
      // Try HEAD request first
      const response = await axios.head(fileUrl, { timeout: 15000 });

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const mimeType = response.headers['content-type'];
      console.log(`File exists: ${fileUrl} (MIME: ${mimeType}, EXT: ${ext})`);

      if (ext && !SUPPORTED_FILE_TYPES.includes(ext)) {
        throw new Error(`Unsupported file type: ${ext} for URL: ${fileUrl}`);
      }

      return true;
    } catch (error) {
      console.warn(`File validation failed for ${fileUrl}:`, error);
      return false;
    }
  }

  private convertGoogleDriveUrl(url: string): string {
    const patterns = [/\/file\/d\/([^/]+)/, /id=([^&]+)/, /\/open\?id=([^&]+)/];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return url;
  }

  private getHeaders(userToken: string) {
    return {
      Authorization: `Bearer ${userToken}`,
      tenantId: this.tenantId,
      'X-Channel-Id': this.channelId,
      'Content-Type': 'application/json',
    };
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 2000,
    label = 'API'
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ ${label} attempt ${attempt} failed: ${message}`);
        if (attempt < retries) {
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }
        throw error;
      }
    }
    throw new Error(`${label} failed after ${retries} retries`);
  }

  async processContent(
    record: ContentRecord,
    userId: string,
    userToken: string
  ): Promise<string | undefined> {
    try {
      console.log('Processing content record:', record);
      const title = record.cont_title;
      const fileDownloadURL = record.cont_dwurl || '';
      const isMediaFile = fileDownloadURL.match(/\.(m4a|m4v)$/i);
      const fileUrl = isMediaFile
        ? record.convertedUrl || fileDownloadURL
        : fileDownloadURL;

      const primaryCategory = 'Learning Resource';

      if (!title || !fileUrl) {
        throw new Error('Title or file URL is missing');
      }

      const isValidFile = await this.validateFileUrl(fileUrl, record);
      if (!isValidFile) {
        throw new Error('Invalid file URL');
      }

      // Create and upload content
      const createdContent = await this.createAndUploadContent(
        record,
        title,
        userId,
        fileUrl,
        primaryCategory,
        userToken
      );

      if (!createdContent) {
        throw new Error('Failed to create content');
      }

      console.log('Content created successfully:', createdContent.doId);

      // Upload media
      const uploadedContent = await this.uploadContent(
        createdContent.doId,
        createdContent.fileUrl,
        userToken
      );
      console.log('Uploaded Content:', uploadedContent);

      // Review content
      const reviewedContent = await this.reviewContent(
        createdContent.doId,
        userToken
      );
      console.log('Reviewed Content:', reviewedContent);

      // Publish content
      const publishedContent = await this.publishContent(
        createdContent.doId,
        userToken
      );
      console.log('Published Content:', publishedContent);

      return createdContent.doId;
    } catch (error) {
      console.error('Error processing content:', error);
      throw error;
    }
  }

  private async createAndUploadContent(
    record: ContentRecord,
    title: string,
    userId: string,
    documentUrl: string,
    primaryCategory: string,
    userToken: string
  ): Promise<
    { doId: string; versionKey: string; fileUrl: string } | undefined
  > {
    try {
      const YOUTUBE_URL_REGEX =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      const isYouTubeURL = YOUTUBE_URL_REGEX.test(documentUrl);
      const uniqueCode = uuidv4();
      let fileUrl: string = documentUrl;

      // Prepare additional fields
      const additionalFields = {
        description: record.cont_description || '',
        domain: this.toArray(record.domain),
        primaryUser: this.toArray(record.primary_user),
        program: this.toArray(record.program),
        subDomain: this.toArray(record.sub_domain),
        targetAgeGroup: this.toArray(record.target_age_group),
        contentLanguage: record.content_language || '',
        isContentMigrated: 1,
        oldSystemContentId: record.old_system_content_id || '',
        contentType: 'Resource',
        subject: this.toArray(record.subjects),
        topic: this.toArray(record.topic),
        subTopic: this.toArray(record.sub_category),
        keywords: this.toArray(record.cont_tagwords),
        author: record.author || '',
        name: record.cont_title || '',
        url: record.cont_url || '',
        language: this.toArray(record.language),
        resource: record.resourse_type || '',
        access: record.access || '',
        publisher: record.publisher || '',
        year: record.year || '',
        posterImage: record.thumbnail
          ? `${this.imageBaseUrl}/thumbnail/${record.thumbnail}`
          : '',
        appicon: record.image
          ? `${this.imageBaseUrl}/detail/${record.image}`
          : '',
      };

      // Handle Google Drive URLs
      let fileExtension = '';
      const googleDriveMatch = documentUrl.match(
        /drive\.google\.com\/file\/d\/([^\/?]+)/
      );
      const googleDriveDownloadMatch = documentUrl.match(
        /drive\.google\.com\/uc\?export=download&id=([^&]+)/
      );
      let fileId: string | null = null;

      if (googleDriveMatch) fileId = googleDriveMatch[1];
      else if (googleDriveDownloadMatch) fileId = googleDriveDownloadMatch[1];

      if (fileId) {
        try {
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
          if (!apiKey) {
            throw new Error('Google Drive API key is missing');
          }

          // Use the download URL directly instead of API
          fileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          console.log('Using Google Drive download URL:', fileUrl);
        } catch (err) {
          console.warn('Google Drive API failed, using direct download URL');
          fileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }

      // Determine file extension from URL
      try {
        const url = new URL(documentUrl);
        fileExtension = url.pathname.split('.').pop()?.toLowerCase() || '';
      } catch (e) {
        console.warn('Could not parse URL for file extension');
      }

      // Determine MIME type
      let mimeType = isYouTubeURL
        ? 'video/x-youtube'
        : fileExtension === 'zip'
        ? 'application/vnd.ekstep.html-archive'
        : mime.lookup(fileExtension) || 'application/octet-stream';

      if (!this.validateMimeType(mimeType)) {
        throw new Error(`MIME type ${mimeType} is not supported`);
      }

      // Create content payload
      const payload = {
        request: {
          content: {
            code: uniqueCode,
            mimeType,
            primaryCategory,
            framework: this.framework,
            createdBy: userId,
            ...additionalFields,
          },
        },
      };

      // Create content
      const createResponse = await this.retryRequest(
        () =>
          axios.post(`/action/content/v3/create`, payload, {
            headers: this.getHeaders(userToken),
          }),
        3,
        2000,
        'Create Content'
      );

      if (!createResponse.data?.result) {
        throw new Error('Invalid response format from content creation API');
      }

      const { identifier: doId, versionKey } = createResponse.data.result;

      // Upload
      if (isYouTubeURL) {
        // For YouTube, only update artifact URL via PATCH if needed later
        return { doId, versionKey, fileUrl };
      }

      // If not YouTube, proceed normally (upload via proxy endpoint)
      return { doId, versionKey, fileUrl };
    } catch (error) {
      console.error('Error creating content record:', error);
      throw error;
    }
  }

  private async uploadContent(
    contentId: string,
    fileUrl: string,
    userToken: string
  ) {
    try {
      console.log('Uploaded content flow start');
      const payload = { request: { content: { fileUrl } } };
      const response = await this.retryRequest(
        () =>
          axios.post(`/action/content/v3/upload/${contentId}`, payload, {
            headers: this.getHeaders(userToken),
          }),
        3,
        2000,
        'Upload Content'
      );
      return response.data;
    } catch (error) {
      console.error('Error during file upload:', error);
      throw error;
    }
  }

  private async reviewContent(contentId: string, userToken: string) {
    try {
      const response = await this.retryRequest(
        () =>
          axios.post(
            `/action/content/v3/review/${contentId}`,
            {},
            {
              headers: this.getHeaders(userToken),
            }
          ),
        3,
        2000,
        'reviewContent'
      );
      return response.data;
    } catch (error) {
      console.error('Error during review:', error);
      throw error;
    }
  }

  private async publishContent(contentId: string, userToken: string) {
    try {
      const body = {
        request: {
          content: {
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
            lastPublishedBy: userId,
          },
        },
      };
      const response = await this.retryRequest(
        () =>
          axios.post(`/action/content/v3/publish/${contentId}`, body, {
            headers: this.getHeaders(userToken),
          }),
        3,
        2000,
        'publishContent'
      );
      return response.data;
    } catch (error) {
      console.error('Error during publish:', error);
      throw error;
    }
  }
}
