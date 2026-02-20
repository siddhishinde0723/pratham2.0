import { NextApiRequest, NextApiResponse } from 'next';

// Simple cookie parser
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  
  // Handle OPTIONS request for CORS preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(200).end();
  }
  
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse cookies from request headers (for logging purposes)
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.authToken || (process.env.AUTH_API_TOKEN as string);
  
  // Note: S3 bucket appears to be public, so no authentication required
  console.log('S3 Assets Request Info:', {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    allCookies: Object.keys(cookies)
  });

  // Extract the path from the query parameters
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : (path as string);
  
  if (!pathString) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const CLOUD_STORAGE_URL = process.env.CLOUD_STORAGE_URL || 'https://saas-prod.s3.ap-south-1.amazonaws.com';
  
  if (!CLOUD_STORAGE_URL) {
    return res.status(500).json({ error: 'Cloud storage URL not configured' });
  }

  // Clean the base URL - remove any trailing path segments that might be included
  const baseUrl = CLOUD_STORAGE_URL
    .replace(/\/sunbird-content-prod.*$/, '')
    .replace(/\/content.*$/, '')
    .replace(/\/$/, ''); // Remove trailing slash
  
  // Fix the path construction - add 'assets' to the path
  let s3Path = pathString;
  if (!pathString.startsWith('content/assets/')) {
    s3Path = `content/assets/${pathString}`;
  }

  // Construct the S3 URL
  const s3Url = `${baseUrl}/${s3Path}`;
  
  console.log('S3 Assets Debug Info:', {
    originalPath: pathString,
     s3Path: s3Path,
    originalCloudStorageUrl: CLOUD_STORAGE_URL,
    cleanedBaseUrl: baseUrl,
    finalS3Url: s3Url,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  });

  try {
    // Forward the request to S3 with proper headers
    const response = await fetch(s3Url, {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': req.headers['referer'] || 'http://localhost:3002',
        'Origin': req.headers['origin'] || 'http://localhost:3002',
        // Add CORS headers for cross-origin requests
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      },
    });

    console.log('S3 Response Status:', response.status);
    console.log('S3 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('S3 request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        s3Url: s3Url
      });
      
      return res.status(response.status).json({ 
        error: 'Failed to fetch from S3',
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        s3Url: s3Url
      });
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Copy other relevant headers
    const headersToForward = ['etag', 'last-modified', 'content-length'];
    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Stream the response
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('S3 Assets Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      s3Url: s3Url
    });
  }
}
