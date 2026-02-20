/* eslint-disable @nx/enforce-module-boundaries */
import { NextApiRequest, NextApiResponse } from 'next';
import {
  genericEditorSaveFormResponse,
  creatLockResponse,
  genericEditorReviewFormResponseatree,
  genericEditorReviewFormResponsekef,
  genericEditorReviewFormResponse,
  genericEditorRequestForChangesFormResponse,
  publishResourceFormResponse,
  genericEditorReviewFormResponseshiksha,
  genericEditorReviewFormResponseswadhaar,
  genericEditorReviewFormResponsebadal,
  contentEditorQuestionMetaFormResponse,
  contentEditorQuestionFormResponse,
  genericEditorReviewFormResponsekrdpr,
  genericEditorReviewFormResponsecolab,
} from './mocked-response';
import { getCookie } from '@workspace/utils/cookieHelper';
import { mockData } from './tenantConfig';
import { act } from 'react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
 console.log("🚀 [proxy] Starting proxy request");
 console.log("📋 [proxy] Request details:", {
   method: req.method,
   url: req.url,
   headers: {
     "content-type": req.headers["content-type"],
     "content-length": req.headers["content-length"],
     authorization: req.headers["authorization"]
       ? "Bearer ***"
       : "Not provided",
     tenantid: req.headers["tenantid"],
     "x-channel-id": req.headers["x-channel-id"],
   },
   query: req.query,
 });


 const { method, body, query } = req;
 const { path } = query;

 // Internal API routes that should be handled by Next.js, not proxied
 const internalRoutes = [
   '/api/content/process-artifact',
   '/api/telemetry',
   '/api/fileUpload',
   '/api/s3-assets',
   '/api/tenantConfig',
   '/api/content/import-data',
 ];

 let pathString = Array.isArray(path) ? path.join("/") : (path as string);
 
 // If this is an internal route, it should have been handled by Next.js already
 // If we reach here, the rewrite caught it incorrectly - return 404 so Next.js can handle it
 if (pathString && internalRoutes.includes(pathString)) {
   console.log("⚠️ [proxy] Internal route detected that should be handled by Next.js:", pathString);
   return res.status(404).json({ 
     error: 'Route should be handled by Next.js API route',
     message: `Internal route ${pathString} should not be proxied`
   });
 }

 const token =
   getCookie(req, "authToken") || (process.env.AUTH_API_TOKEN as string);


 const BASE_URL = (
   process.env.NEXT_PUBLIC_BASE_URL ||
   process.env.NEXT_PUBLIC_MIDDLEWARE_URL ||
   "https://shiksha-dev-middleware.tekdinext.com"
 ).toString();
 if (!BASE_URL) {
   console.warn(
     "Proxy BASE_URL env not set. Please set NEXT_PUBLIC_BASE_URL to your middleware base, e.g., https://interface.tekdinext.com/interface/v1"
   );
 }
  const queryTenantId = req.query.tenantId as string;
  const cookieTenantId = getCookie(req, 'tenantId');
  const headerTenantId = req.headers['tenantid'] as string;

  // Use the first available tenant ID
  const tenantId =
    queryTenantId ||
    cookieTenantId ||
    headerTenantId ||
    '6c386899-7a00-4733-8447-5ef925bbf700';

  console.log('🔐 [proxy] Authentication details:', {
    baseURL: BASE_URL,
    hasToken: !!token,
    tenantId,
    path,
  });

  const tenantConfig = mockData[tenantId];


 console.log("🏢 [proxy] Tenant config:", {
   tenantId,
   hasConfig: !!tenantConfig,
   channelId: tenantConfig?.CHANNEL_ID,
 });


 if (!tenantConfig) {
   return res.status(404).json({ message: "Tenant configuration not found" });
 }
 const CHANNEL_ID = tenantConfig?.CHANNEL_ID;


 if (!token) {
   console.error("No valid token available");
   return res.status(401).json({ message: "Unauthorized: Token is required" });
 }


 // console.log("Using token:", token);


  // pathString is already defined above, so we can use it directly
   if (pathString === "/action/data/v1/form/read" && body?.request) {
   const { action, subType, type } = body.request;
   if (action === "save" && subType === "resource") {
     return res.status(200).json(genericEditorSaveFormResponse);
   }


   if (action === "question-meta-save" && subType === "questions") {
     return res.status(200).json(contentEditorQuestionMetaFormResponse);
   }


   if (action === "question-filter-view" && subType === "questions") {
     return res.status(200).json(contentEditorQuestionFormResponse);
   }


   if (action === "review" && subType === "resource") {
     const framework = tenantConfig?.CONTENT_FRAMEWORK;
     console.log("framework ==>", framework);


     switch (framework) {
       case "atree-framework":
         return res.status(200).json(genericEditorReviewFormResponseatree);


       case "KEF-framework":
         return res.status(200).json(genericEditorReviewFormResponseshiksha);


       case "shikshalokam-framework":
       case "shikshagraha-framework":
       case "oblf-fw":
       case "shikshagrahanew-framework":
       case "kenya-framework":
       case "agrinettest-framework":
            case "chattisgarghboardfw":
         return res.status(200).json(genericEditorReviewFormResponseshiksha);
       case "badal-framework":
         return res.status(200).json(genericEditorReviewFormResponsebadal);
       case "swadhaar-framework":
         return res.status(200).json(genericEditorReviewFormResponseswadhaar);
        case "krdpr-framework":
          return res.status(200).json(genericEditorReviewFormResponsekrdpr);
        case 'Colab-framework':
          return res.status(200).json(genericEditorReviewFormResponsecolab);
        default:
          return res.status(200).json(genericEditorReviewFormResponse);
      }
    }

    if (action === 'requestforchanges' && subType === 'resource') {
      return res.status(200).json(genericEditorRequestForChangesFormResponse);
    }
    if (action === 'publish' && subType === 'resource' && type === 'content') {
      return res.status(200).json(publishResourceFormResponse);
    }
  }
  if (pathString === '/action/lock/v1/create') {
    return res.status(200).json(creatLockResponse);
  }

  if (pathString.startsWith('/action/framework/v3/read/')) {
    pathString = pathString.replace(
      '/action/framework/v3/read/',
      '/api/framework/v1/read/'
    );
  }

  if (pathString.startsWith('/action/channel/v1/read/')) {
    console.log('Proxy: Transforming channel path from:', pathString);
    pathString = pathString.replace(
      '/action/channel/v1/read/',
      '/api/channel/v1/read/'
    );
    console.log('Proxy: Transformed channel path to:', pathString);
  }

  // Intercept composite search API calls and ensure channel is included in filters
  if (pathString === '/action/composite/v3/search' && method === 'POST' && body?.request) {
    console.log('🔍 [proxy] Composite search API detected, checking for channel in filters');
    
    if (!body.request.filters) {
      body.request.filters = {};
    }
    
    // Add channel to filters if it's missing
    if (!body.request.filters.channel && CHANNEL_ID) {
      console.log('➕ [proxy] Adding channel to filters:', CHANNEL_ID);
      body.request.filters.channel = CHANNEL_ID;
    } else if (body.request.filters.channel) {
      console.log('✅ [proxy] Channel already present in filters:', body.request.filters.channel);
    }
  }

  console.log('🔄 [proxy] Processing request:', {
    method,
    path: pathString,
    tenantId,
    channelId: CHANNEL_ID,
    baseUrl: BASE_URL,
  });

  const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';
   const contentMode = getCookie(req, 'contentMode');
  
  // Create query string for target URL, excluding the 'path' parameter used for proxy routing
  const urlParams = new URLSearchParams(queryString);
  urlParams.delete('path'); 
  
  if (pathString.includes('/action/questionset/v2/hierarchy') && contentMode === 'edit') {
    if (!urlParams.has('mode')) {
      urlParams.set('mode', 'edit');
    }
  }

  const finalQueryString = urlParams.toString();
  const targetUrl = `${BASE_URL}${pathString}${
    queryString ? `?${finalQueryString}` : ''
  }`;

  console.log('🌐 [proxy] Target URL:', targetUrl);

  try {
    // Prefer the incoming content-type if provided
    const incomingContentType = req.headers['content-type'] as
      | string
      | undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      tenantId: tenantId,
      'X-Channel-Id': CHANNEL_ID,
    };
    if (incomingContentType) {
      headers['Content-Type'] = incomingContentType;
    } else {
      headers['Content-Type'] = 'application/json';
    }

    let forwardBody: any = undefined;
    if (['POST', 'PATCH', 'PUT'].includes(method || '')) {
       let processedBody = body;
      if (pathString === '/action/questionset/v2/hierarchy/update') {
        console.log("🧹 [proxy] Sanitizing hierarchy update body...");
        const cloudStorageUrl = (process.env.NEXT_PUBLIC_CLOUD_STORAGE_URL || process.env.CLOUD_STORAGE_URL || '').replace(/\/+$/, '');
        const cleanS3Url = cloudStorageUrl.replace(/\/sunbird-content-prod\/?$/, '').replace(/\/$/, '');
        processedBody = sanitizeMediaUrls(body, cleanS3Url);
      }

      if (incomingContentType?.includes('application/json')) {
        forwardBody = JSON.stringify(processedBody);
      } else if (
        incomingContentType?.includes('application/x-www-form-urlencoded')
      ) {
        const params = new URLSearchParams();
        const src: Record<string, any> = (req as any).body || {};
        Object.keys(src).forEach((k) => {
          const v = src[k];
          if (Array.isArray(v)) {
            v.forEach((item) => params.append(k, String(item)));
          } else if (v !== undefined && v !== null) {
            params.append(k, String(v));
          }
        });
        forwardBody = params.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (typeof (req as any).body === 'string') {
        forwardBody = (req as any).body;
      } else {
        // Fallback: JSON stringify unknown structures
       forwardBody = JSON.stringify(processedBody || {});
        headers['Content-Type'] = 'application/json';
      }
    }

    const options: RequestInit = {
      method,
      headers,
      ...(forwardBody !== undefined ? { body: forwardBody } : {}),
    } as any;

    console.log('📤 [proxy] Request options:', {
      method: options.method,
      hasBody: !!options.body,
      bodyType: typeof options.body,
      headers: Object.keys(options.headers || {}),
        // Partially log body if it's a hierarchy update to verify sanitization
      sanitizedSnippet: pathString === '/action/questionset/v2/hierarchy/update' 
        ? (forwardBody as string).substring(0, 500) + "..." 
        : "N/A"
    });

    const response = await fetch(targetUrl, options);
    console.log('📨 [proxy] Response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    });

    const contentType = response.headers.get('content-type') || '';

    // If upstream sends JSON, forward JSON. Otherwise, forward raw text to avoid JSON parse errors
    if (contentType.includes('application/json')) {
      const data = await response.json();
      
      // Ensure composite search response has proper structure for web component compatibility
      if (pathString === '/action/composite/v3/search') {
        // Log response structure for debugging
        console.log('📊 [proxy] Composite search response structure:', {
          hasResult: !!data?.result,
          hasQuestion: !!data?.result?.Question,
          questionCount: Array.isArray(data?.result?.Question) ? data.result.Question.length : 'not an array',
          hasQuestionSet: !!data?.result?.QuestionSet,
          questionSetCount: Array.isArray(data?.result?.QuestionSet) ? data.result.QuestionSet.length : 'not an array',
          hasContent: !!data?.result?.content,
          contentCount: Array.isArray(data?.result?.content) ? data.result.content.length : 'not an array',
          count: data?.result?.count,
          responseKeys: Object.keys(data || {}),
          resultKeys: data?.result ? Object.keys(data.result) : 'no result',
        });
        
        // Ensure result structure exists and has expected arrays to prevent Angular component errors
        if (data && !data.result) {
          data.result = {};
        }
        if (data?.result) {
          // Ensure Question array exists (even if empty) to prevent component errors
          if (!data.result.Question) {
            data.result.Question = [];
          }
          // Ensure count exists
          if (typeof data.result.count === 'undefined') {
            data.result.count = Array.isArray(data.result.Question) ? data.result.Question.length : 0;
          }
        }
      }
      
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      // Forward as-is with the same content-type
      res.setHeader('Content-Type', contentType || 'text/plain');
      res.status(response.status).send(text);
    }
  } catch (error: any) {
    console.error('❌ [proxy] Error in proxy:', {
      message: error.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      responseData: error?.response?.data,
      stack: error?.stack,
      url: error?.config?.url,
      method: error?.config?.method,
    });

    if (error?.response?.data?.responseCode === 401) {
      console.log('🔒 [proxy] Unauthorized response detected');
      return res
        .status(401)
        .json({ message: 'Unauthorized: Token is invalid' });
    } else {
      console.log('💥 [proxy] Internal server error');
      res
        .status(500)
        .json({ message: 'Error fetching data', error: error.message });
    }
  }
}
function sanitizeMediaUrls(obj: any, cloudStorageUrl?: string): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    let sanitized = obj
      .replace(/\/assets\/public\/\//g, '/')
      .replace(/\/assets\/public\//g, '/');
    
    if (cloudStorageUrl) {
       // Also fix any local URLs embedded in the string body
       sanitized = sanitized.replace(/http:\/\/localhost:\d+\/assets\/public\//g, `${cloudStorageUrl}/`);
       sanitized = sanitized.replace(/http:\/\/localhost:\d+\/content\/assets\//g, `${cloudStorageUrl}/content/assets/`);
    }
    return sanitized;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMediaUrls(item, cloudStorageUrl));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        let value = obj[key];
        if (key === 'baseUrl' && typeof value === 'string' && value.includes('localhost:') && cloudStorageUrl) {
           value = cloudStorageUrl;
        } else {
           value = sanitizeMediaUrls(value, cloudStorageUrl);
        }
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return obj;
}
