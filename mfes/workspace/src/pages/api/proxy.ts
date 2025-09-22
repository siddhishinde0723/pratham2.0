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
} from './mocked-response';
import { getCookie } from '@workspace/utils/cookieHelper';
import { mockData } from './tenantConfig';
import { act } from 'react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, body, query } = req;
  const { path } = query;

  const token =
    getCookie(req, 'authToken') || (process.env.AUTH_API_TOKEN as string);

  const BASE_URL = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_MIDDLEWARE_URL ||
    'https://shiksha-dev-middleware.tekdinext.com'
  ).toString();
  if (!BASE_URL) {
    console.warn(
      'Proxy BASE_URL env not set. Please set NEXT_PUBLIC_BASE_URL to your middleware base, e.g., https://interface.tekdinext.com/interface/v1'
    );
  }
  const tenantId = getCookie(req, 'tenantId');

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID not found in cookies' });
  }

  const tenantConfig = mockData[tenantId];

  console.log('tenantConfig ==>', tenantConfig);

  if (!tenantConfig) {
    return res.status(404).json({ message: 'Tenant configuration not found' });
  }
  const CHANNEL_ID = tenantConfig?.CHANNEL_ID;

  if (!token) {
    console.error('No valid token available');
    return res.status(401).json({ message: 'Unauthorized: Token is required' });
  }

  // console.log("Using token:", token);

  let pathString = Array.isArray(path) ? path.join('/') : (path as string);

  if (pathString === '/action/data/v1/form/read') {
    const { action, subType, type } = body.request;
    if (action === 'save' && subType === 'resource') {
      return res.status(200).json(genericEditorSaveFormResponse);
    }

    if (action === 'question-meta-save' && subType === 'questions') {
      return res.status(200).json(contentEditorQuestionMetaFormResponse);
    }

    if (action === 'question-filter-view' && subType === 'questions') {
      return res.status(200).json(contentEditorQuestionFormResponse);
    }

    if (action === 'review' && subType === 'resource') {
      const framework = tenantConfig?.CONTENT_FRAMEWORK;
      console.log('framework ==>', framework);

      switch (framework) {
        case 'atree-framework':
          return res.status(200).json(genericEditorReviewFormResponseatree);

        case 'KEF-framework':
          return res.status(200).json(genericEditorReviewFormResponseshiksha);

        case 'shikshalokam-framework':
        case 'shikshagraha-framework':
        case 'Colab-framework':
        case 'oblf-framework':
        case 'shikshagrahanew-framework':
        case 'kenya-framework':
          return res.status(200).json(genericEditorReviewFormResponseshiksha);

        case 'badal-framework':
          return res.status(200).json(genericEditorReviewFormResponsebadal);

        case 'swadhaar-fw':
          return res.status(200).json(genericEditorReviewFormResponseswadhaar);

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

  console.log('Proxy: Processing request:', {
    method,
    path: pathString,
    tenantId,
    channelId: CHANNEL_ID,
    baseUrl: BASE_URL,
  });

  const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';
  const targetUrl = `${BASE_URL}${pathString}${
    queryString ? `?${queryString}` : ''
  }`;

  console.log('targetUrl =====>', targetUrl);

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
      if (incomingContentType?.includes('application/json')) {
        forwardBody = JSON.stringify(body);
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
        forwardBody = JSON.stringify(body || {});
        headers['Content-Type'] = 'application/json';
      }
    }

    const options: RequestInit = {
      method,
      headers,
      ...(forwardBody !== undefined ? { body: forwardBody } : {}),
    } as any;

    console.log('options =====>', options);
    const response = await fetch(targetUrl, options);
    console.log('response status =====>', response.status);

    const contentType = response.headers.get('content-type') || '';

    // If upstream sends JSON, forward JSON. Otherwise, forward raw text to avoid JSON parse errors
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      // Forward as-is with the same content-type
      res.setHeader('Content-Type', contentType || 'text/plain');
      res.status(response.status).send(text);
    }
  } catch (error: any) {
    console.error('Error in proxy:', error.message);

    if (error?.response?.data?.responseCode === 401) {
      return res
        .status(401)
        .json({ message: 'Unauthorized: Token is invalid' });
    } else {
      res
        .status(500)
        .json({ message: 'Error fetching data', error: error.message });
    }
  }
}
