import { Storage, Bucket, File } from '@google-cloud/storage';

/**
 * Google Cloud Storage service configuration
 */
interface GCSConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  bucketName: string;
}

/**
 * Service for uploading files to Google Cloud Storage
 */
export class GoogleCloudStorageService {
  private storage: Storage;
  private bucket: Bucket;
  private bucketName: string;

  constructor(config: GCSConfig) {
    try {
      console.log('[GCS] Initializing Google Cloud Storage service...');
      console.log('[GCS] Configuration:', {
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        bucketName: config.bucketName,
        hasPrivateKey: !!config.privateKey,
        privateKeyLength: config.privateKey?.length || 0,
      });
      
      // Validate required configuration
      if (!config.projectId) {
        throw new Error('GCS projectId is required');
      }
      if (!config.clientEmail) {
        throw new Error('GCS clientEmail is required');
      }
      if (!config.privateKey) {
        throw new Error('GCS privateKey is required');
      }
      if (!config.bucketName) {
        throw new Error('GCS bucketName is required');
      }
      
      // Initialize Storage client with service account credentials
      this.storage = new Storage({
        projectId: config.projectId,
        credentials: {
          client_email: config.clientEmail,
          private_key: config.privateKey.replace(/\\n/g, '\n'), // Replace escaped newlines
        },
      });

      this.bucketName = config.bucketName;
      this.bucket = this.storage.bucket(this.bucketName);
      
      console.log(`[GCS] Initialized successfully with bucket: ${this.bucketName}`);
    } catch (error: any) {
      console.error('[GCS] Failed to initialize Google Cloud Storage:', error);
      console.error('[GCS] Initialization error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      throw new Error(`Failed to initialize GCS service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Uploads a file buffer to Google Cloud Storage
   * @param fileBuffer - The file buffer to upload
   * @param fileName - The name/path for the file in the bucket
   * @param contentType - The MIME type of the file
   * @returns Promise<string> - The public URL of the uploaded file
   * @throws Error if upload fails
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string
  ): Promise<string> {
    try {
      console.log(`[GCS] Starting upload: ${fileName} (${fileBuffer.length} bytes, ${contentType})`);

      // Create file reference
      const file: File = this.bucket.file(fileName);

      // Upload file with metadata
      // Note: For buckets with uniform bucket-level access enabled, we cannot use legacy ACLs
      // File access is controlled via IAM permissions on the bucket
      // Using createWriteStream to have more control and avoid any ACL defaults
      return new Promise<string>((resolve, reject) => {
        const stream = file.createWriteStream({
          metadata: {
            contentType: contentType,
            cacheControl: 'public, max-age=31536000', // 1 year cache
          },
          // Explicitly no ACL options - uniform bucket-level access is enabled
          // Do not set: public, predefinedAcl, or any ACL-related metadata
          // Access is controlled by bucket IAM policy, not object ACLs
        });

        stream.on('error', (error) => {
          console.error(`[GCS] Stream error during upload:`, error);
          reject(error);
        });

        stream.on('finish', () => {
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
          console.log(`[GCS] Successfully uploaded file. URL: ${publicUrl}`);
          console.log(`[GCS] Note: File access depends on bucket IAM permissions (uniform bucket-level access enabled)`);
          resolve(publicUrl);
        });

        stream.end(fileBuffer);
      });
    } catch (error: any) {
      console.error(`[GCS] Error uploading file ${fileName}:`, error);
      console.error(`[GCS] Error details:`, {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        errors: error?.errors,
        stack: error?.stack,
      });
      
      // Handle Google Cloud Storage API errors
      if (error?.code) {
        if (error.code === 404) {
          throw new Error(`Upload failure: Bucket '${this.bucketName}' not found. Please check bucket name and permissions.`);
        }
        if (error.code === 403) {
          throw new Error('Upload failure: Permission denied. Please check service account permissions.');
        }
        if (error.code === 429) {
          throw new Error('Upload failure: Rate limit exceeded. Please try again later.');
        }
      }
      
      // Handle error messages
      const errorMessage = error?.message || '';
      const errorString = JSON.stringify(error, null, 2);
      
      if (errorMessage.includes('ENOENT') || errorMessage.includes('not found') || error?.code === 404) {
        throw new Error(`Upload failure: Bucket '${this.bucketName}' not found. Error: ${errorMessage}`);
      }
      if (errorMessage.includes('permission') || errorMessage.includes('403') || error?.code === 403) {
        throw new Error(`Upload failure: Permission denied. Error: ${errorMessage}`);
      }
      if (errorMessage.includes('quota') || errorMessage.includes('limit') || error?.code === 429) {
        throw new Error(`Upload failure: Storage quota exceeded. Error: ${errorMessage}`);
      }
      if (errorMessage.includes('invalid') || errorMessage.includes('Invalid')) {
        throw new Error(`Upload failure: Invalid request. Error: ${errorMessage}`);
      }
      
      // Return detailed error information
      const detailedError = error?.errors?.[0]?.message || errorMessage || 'Unknown error';
      throw new Error(`Upload failure: ${detailedError}. Full error: ${errorString}`);
    }
  }

  /**
   * Checks if a file exists in the bucket
   * @param fileName - The name/path of the file
   * @returns Promise<boolean> - True if file exists
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      const file = this.bucket.file(fileName);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error(`[GCS] Error checking file existence: ${fileName}`, error);
      return false;
    }
  }

  /**
   * Deletes a file from the bucket
   * @param fileName - The name/path of the file to delete
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const file = this.bucket.file(fileName);
      await file.delete();
      console.log(`[GCS] Successfully deleted file: ${fileName}`);
    } catch (error) {
      console.error(`[GCS] Error deleting file: ${fileName}`, error);
      throw error;
    }
  }
}

/**
 * Creates a Google Cloud Storage service instance from environment variables or provided config
 * @param config - Optional GCS configuration. If not provided, reads from environment
 * @returns GoogleCloudStorageService instance
 */
export function createGCSService(config?: Partial<GCSConfig>): GoogleCloudStorageService {
  // Service account credentials from user-provided config or environment
  const serviceAccountConfig = config || {
    projectId: process.env.GCS_PROJECT_ID || 'shiksha-prod',
    privateKey: process.env.NEXT_PUBLIC_GCS_PRIVATE_KEY || '',
    clientEmail: process.env.GCS_CLIENT_EMAIL || '',
    bucketName: process.env.GCS_BUCKET_NAME || 'swadharprod',
  };

  // Validate required configuration
  if (!serviceAccountConfig.projectId) {
    throw new Error('GCS_PROJECT_ID is required');
  }
  if (!serviceAccountConfig.privateKey) {
    throw new Error('GCS_PRIVATE_KEY is required');
  }
  if (!serviceAccountConfig.clientEmail) {
    throw new Error('GCS_CLIENT_EMAIL is required');
  }
  if (!serviceAccountConfig.bucketName) {
    throw new Error('GCS_BUCKET_NAME is required');
  }

  return new GoogleCloudStorageService(serviceAccountConfig as GCSConfig);
}