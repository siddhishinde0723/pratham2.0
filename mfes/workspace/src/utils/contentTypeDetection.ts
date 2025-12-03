/**
 * Supported artifact types for cloud upload
 */
export enum ArtifactType {
  PDF = 'PDF',
  MP4 = 'MP4',
  YOUTUBE = 'YOUTUBE',
  UNSUPPORTED = 'UNSUPPORTED',
}

/**
 * Detects the type of artifact from the artifactUrl
 * @param artifactUrl - The URL of the artifact
 * @param mimeType - Optional MIME type from content metadata
 * @returns ArtifactType - The detected artifact type
 */
export function detectArtifactType(
  artifactUrl: string | undefined,
  mimeType?: string
): ArtifactType {
  if (!artifactUrl || typeof artifactUrl !== 'string') {
    console.warn('[ContentTypeDetection] No artifact URL provided');
    return ArtifactType.UNSUPPORTED;
  }

  const url = artifactUrl.toLowerCase().trim();

  // Check for YouTube links first
  const youtubePatterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/embed\//,
    /youtube\.com\/v\//,
  ];

  for (const pattern of youtubePatterns) {
    if (pattern.test(url)) {
      console.log('[ContentTypeDetection] Detected YouTube link');
      return ArtifactType.YOUTUBE;
    }
  }

  // Check MIME type if available
  if (mimeType) {
    const mime = mimeType.toLowerCase();
    if (mime === 'application/pdf') {
      console.log('[ContentTypeDetection] Detected PDF from MIME type');
      return ArtifactType.PDF;
    }
    if (mime === 'video/mp4' || mime === 'video/webm') {
      console.log('[ContentTypeDetection] Detected MP4 from MIME type');
      return ArtifactType.MP4;
    }
  }

  // Check URL extension
  const extension = url.split('.').pop()?.split('?')[0]; // Remove query params
  
  if (extension === 'pdf') {
    console.log('[ContentTypeDetection] Detected PDF from URL extension');
    return ArtifactType.PDF;
  }
  
  if (extension === 'mp4') {
    console.log('[ContentTypeDetection] Detected MP4 from URL extension');
    return ArtifactType.MP4;
  }

  // Check content-type from URL path patterns
  if (url.includes('.pdf')) {
    console.log('[ContentTypeDetection] Detected PDF from URL pattern');
    return ArtifactType.PDF;
  }
  
  if (url.includes('.mp4')) {
    console.log('[ContentTypeDetection] Detected MP4 from URL pattern');
    return ArtifactType.MP4;
  }

  console.warn(`[ContentTypeDetection] Unsupported artifact type for URL: ${artifactUrl}`);
  return ArtifactType.UNSUPPORTED;
}

/**
 * Checks if the artifact type requires cloud upload (PDF or MP4)
 * @param artifactType - The artifact type
 * @returns boolean - True if upload is required
 */
export function requiresCloudUpload(artifactType: ArtifactType): boolean {
  return artifactType === ArtifactType.PDF || artifactType === ArtifactType.MP4;
}

/**
 * Gets the content type for the file based on artifact type
 * @param artifactType - The artifact type
 * @returns string - MIME type for the file
 */
export function getContentTypeForArtifact(artifactType: ArtifactType): string {
  switch (artifactType) {
    case ArtifactType.PDF:
      return 'application/pdf';
    case ArtifactType.MP4:
      return 'video/mp4';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Generates a safe filename for cloud storage upload
 * @param originalUrl - The original artifact URL
 * @param artifactType - The artifact type
 * @param contentId - The content identifier
 * @returns string - Safe filename for cloud storage
 */
export function generateCloudFileName(
  originalUrl: string,
  artifactType: ArtifactType,
  contentId: string
): string {
  const extension = artifactType === ArtifactType.PDF ? 'pdf' : 'mp4';
  const timestamp = Date.now();
  const safeContentId = contentId.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `content/${safeContentId}/${timestamp}.${extension}`;
}

