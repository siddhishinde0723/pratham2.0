import { NextApiRequest, NextApiResponse } from 'next';
import * as cookie from 'cookie';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies?.authToken || (process.env.AUTH_API_TOKEN as string);
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Token is required' });
  }

  // Extract the path from the query parameters
  const { path } = req.query;
  let pathString = Array.isArray(path) ? path.join('/') : (path as string);
  
  if (!pathString) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  // Sanitization: If pathString is an absolute URL, extract the path part
  if (pathString.startsWith('http')) {
      try {
          const url = new URL(pathString);
          pathString = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
          // If it's an S3 URL like bucket.s3.region.amazonaws.com/path, 
          // pathname might still contain parts we don't want if we are trying to 
          // prepend NEXT_PUBLIC_CLOUD_STORAGE_URL.
          // However, typically content/assets/... is what we want.
      } catch (e) {
          console.error('Error parsing absolute URL in path:', e);
      }
  }

  const CLOUD_STORAGE_URL = process.env.NEXT_PUBLIC_CLOUD_STORAGE_URL;
  
  if (!CLOUD_STORAGE_URL) {
    return res.status(500).json({ error: 'Cloud storage URL not configured' });
  }

  // Construct the S3 URL - ensuring no double slashes if CLOUD_STORAGE_URL ends with slash
  const baseUrl = CLOUD_STORAGE_URL.endsWith('/') ? CLOUD_STORAGE_URL.slice(0, -1) : CLOUD_STORAGE_URL;
  const cleanPath = pathString.startsWith('/') ? pathString.substring(1) : pathString;
  const s3Url = `${baseUrl}/${cleanPath}`;
  
  console.log('Players S3 Assets Info:', {
    path: pathString,
    fullS3Url: s3Url
  });

  try {
    // Forward the request to S3
    const response = await fetch(s3Url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || '*/*',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error('S3 request failed:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch from S3',
        status: response.status,
        statusText: response.statusText,
        url: s3Url
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const headersToForward = ['etag', 'last-modified', 'content-length'];
    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    });

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('S3 Assets Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
