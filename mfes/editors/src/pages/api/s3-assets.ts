import { NextApiRequest, NextApiResponse } from 'next';

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

  // Extract the path from the query parameters
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : (path as string);
  
  if (!pathString) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const CLOUD_STORAGE_URL = process.env.NEXT_PUBLIC_CLOUD_STORAGE_URL || 'https://saas-prod.s3.ap-south-1.amazonaws.com';
  
  if (!CLOUD_STORAGE_URL) {
    return res.status(500).json({ error: 'Cloud storage URL not configured' });
  }

  // Clean the base URL - remove any trailing path segments and slashes
  const baseUrl = CLOUD_STORAGE_URL
    .replace(/\/sunbird-content-prod.*$/, '')
    .replace(/\/content.*$/, '')
    .replace(/\/$/, '');
  
  // Construct the S3 URL - the path already includes 'content/assets/'
  const s3Url = `${baseUrl}/${pathString}`;
  
  console.log('S3 Assets Debug Info:', {
    originalPath: pathString,
    originalCloudStorageUrl: CLOUD_STORAGE_URL,
    cleanedBaseUrl: baseUrl,
    finalS3Url: s3Url,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  });

  try {
    // Forward the request to S3
    const response = await fetch(s3Url, {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || '*/*',
      },
    });

    console.log('S3 Response Status:', response.status);

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
