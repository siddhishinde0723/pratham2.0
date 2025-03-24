import { NextApiRequest, NextApiResponse } from 'next';
import {
  genericEditorSaveFormResponse,
  creatLockResponse,
  genericEditorReviewFormResponseatree,
  genericEditorReviewFormResponsekef,
  genericEditorReviewFormResponse,
  genericEditorRequestForChangesFormResponse,
  publishResourceFormResponse,
  contentEditorQuestionFormResponse,
  contentEditorQuestionMetaFormResponse,
  genericEditorReviewFormResponseshiksha,
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

  const BASE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL as string;
  const tenantId =
    getCookie(req, 'tenantId') || (process.env.NEXT_PUBLIC_TENANT_ID as string);

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

    if (action === 'review' && subType === 'resource') {
      const framework = tenantConfig?.CONTENT_FRAMEWORK;
      console.log('framework ==>', framework);
      if (framework == 'atree-framework') {
        return res.status(200).json(genericEditorReviewFormResponseatree);
      } else if (framework == 'kef-framework') {
        return res.status(200).json(genericEditorReviewFormResponsekef);
      } else if (framework == 'shiksha-fw') {
        return res.status(200).json(genericEditorReviewFormResponseshiksha);
      }
      // Default response if the framework doesn't match the specified values
      return res.status(200).json(genericEditorReviewFormResponse);
    }

    if (action === 'requestforchanges' && subType === 'resource') {
      return res.status(200).json(genericEditorRequestForChangesFormResponse);
    }
    if (action === 'publish' && subType === 'resource' && type === 'content') {
      return res.status(200).json(publishResourceFormResponse);
    }
    if (
      action === 'question-filter-view' &&
      subType === 'questions' &&
      type === 'content'
    ) {
      return res.status(200).json(contentEditorQuestionFormResponse);
    }
    if (
      action === 'question-meta-save' &&
      subType === 'questions' &&
      type === 'content'
    ) {
      return res.status(200).json(contentEditorQuestionMetaFormResponse);
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

  const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';
  const targetUrl = `${BASE_URL}${pathString}${
    queryString ? `?${queryString}` : ''
  }`;

  console.log('targetUrl =====>', targetUrl);

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        tenantId: tenantId,
        'X-Channel-Id': CHANNEL_ID,
      },
      ...(method === 'POST' || method === 'PATCH'
        ? { body: JSON.stringify(body) }
        : {}),
    };

    console.log('options =====>', options);
    const response = await fetch(targetUrl, options);
    console.log('response =====>', response);
    const data = await response.json();
    console.log('data =====>', data);
    res.status(response.status).json(data);
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
