import { NextApiRequest, NextApiResponse } from 'next';
import {
  genericEditorSaveFormResponse,
  creatLockResponse,
  genericEditorReviewFormResponse,
  genericEditorRequestForChangesFormResponse,
  publishResourceFormResponse,
} from './mocked-response';
import * as cookie from 'cookie';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, body, query } = req;
  const { path } = query;

  const BASE_URL = process.env.BASE_URL as string;
  const API_KEY = process.env.AUTH_API_TOKEN as string;
  const NEXT_PUBLIC_TENANT_ID = localStorage.getItem('tenantId') as string;
  const NEXT_PUBLIC_CHANNEL_ID = process.env.NEXT_PUBLIC_CHANNEL_ID as string;

  const cookies = cookie.parse(req.headers.cookie || '');

  console.log(cookies?.authToken);

  const token = cookies?.authToken || API_KEY;

  if (!token) {
    console.error('No valid token available');
    return res.status(401).json({ message: 'Unauthorized: Token is required' });
  }

  console.log('Using token:', token);

  let pathString = Array.isArray(path) ? path.join('/') : (path as string);

  if (pathString === '/action/data/v1/form/read') {
    const { action, subType, type } = body.request;
    if (action === 'save' && subType === 'resource') {
      return res.status(200).json(genericEditorSaveFormResponse);
    }
    if (action === 'review' && subType === 'resource') {
      console.log(
        'genericEditorReviewFormResponse ==>',
        genericEditorReviewFormResponse
      );
      return res.status(200).json(genericEditorReviewFormResponse);
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
        ...(localStorage.getItem('tenantId') && {
          tenantId: localStorage.getItem('tenantId')!,
        }),
        'X-Channel-Id': NEXT_PUBLIC_CHANNEL_ID,
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
    res
      .status(500)
      .json({ message: 'Error fetching data', error: error.message });
  }
}
