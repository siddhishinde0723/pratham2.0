import type { NextApiRequest, NextApiResponse } from 'next';

// Mock data
export const mockData: Record<string, any> = {
  'ef99949b-7f3a-4a5f-806a-e67e683e38f3': {
    CHANNEL_ID: 'scp-channel',
    CONTENT_FRAMEWORK: 'level1-framework',
    COLLECTION_FRAMEWORK: 'scp-framework',
  },
  '29f8c9a6-032f-48c7-a14a-9e3db3d7b76e': {
    CHANNEL_ID: 'pos-channel',
    CONTENT_FRAMEWORK: 'level1-framework',
    COLLECTION_FRAMEWORK: 'pos-framework',
  },
  '6c8b810a-66c2-4f0d-8c0c-c025415a4414': {
    CHANNEL_ID: 'youthnet-channel',
    CONTENT_FRAMEWORK: 'level1-framework',
    COLLECTION_FRAMEWORK: 'youthnet-framework',
  },
  '6c386899-7a00-4733-8447-5ef925bbf700': {
    CHANNEL_ID: 'kef-channel',
    CONTENT_FRAMEWORK: 'kef-framework',
    COLLECTION_FRAMEWORK: 'kef-framework',
  },
  '3a849655-30f6-4c2b-8707-315f1ed64fbd': {
    CHANNEL_ID: 'atree-channel',
    CONTENT_FRAMEWORK: 'atree-framework',
    COLLECTION_FRAMEWORK: 'atree-framework',
  },
  'ebae40d1-b78a-4f73-8756-df5e4b060436': {
    CHANNEL_ID: 'shikshagraha-channel',
    CONTENT_FRAMEWORK: 'shiksha-fw',
    COLLECTION_FRAMEWORK: 'shiksha-fw',
  },
  '4730e033-b032-429d-86a5-9eba94b8f05d': {
    CHANNEL_ID: 'saasdev-channel',
    CONTENT_FRAMEWORK: 'saasdev-framework',
    COLLECTION_FRAMEWORK: 'saasdev-framework',
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing tenantId' });
  }

  const config = mockData[tenantId];

  if (!config) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  return res.status(200).json(config);
}
