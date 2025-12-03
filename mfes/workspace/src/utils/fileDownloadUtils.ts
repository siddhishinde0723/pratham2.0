import axios from 'axios';

/**
 * Downloads a file from a given URL and returns it as a Buffer
 * @param url - The URL of the file to download
 * @returns Promise<Buffer> - The downloaded file as a Buffer
 * @throws Error if download fails or URL is invalid
 */
export async function downloadFile(url: string): Promise<Buffer> {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid artifact URL: URL must be a non-empty string');
  }

  try {
    console.log(`[FileDownload] Starting download from: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5 minutes timeout for large files
      maxRedirects: 5,
    });

    if (!response.data) {
      throw new Error('Download failed: No data received from URL');
    }

    const buffer = Buffer.from(response.data);
    console.log(`[FileDownload] Successfully downloaded ${buffer.length} bytes`);
    
    return buffer;
  } catch (error) {
    console.error(`[FileDownload] Error downloading file from ${url}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Invalid artifact URL: Connection refused. Please check if the URL is accessible.');
      }
      if (error.response?.status === 404) {
        throw new Error('Invalid artifact URL: File not found (404).');
      }
      if (error.response?.status === 403) {
        throw new Error('Invalid artifact URL: Access forbidden (403).');
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Invalid artifact URL: Download timeout. The file may be too large or the server is unreachable.');
      }
    }
    
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

