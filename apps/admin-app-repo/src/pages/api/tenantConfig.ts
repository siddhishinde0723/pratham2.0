import type { NextApiRequest, NextApiResponse } from 'next';

// Mock data
export const mockData: Record<string, any> = {
  '94f936dc-7fce-4b92-9a9b-0ebb3076793f': {
    CHANNEL_ID: 'Colab-channel',
    CONTENT_FRAMEWORK: 'Colab-framework',
    COLLECTION_FRAMEWORK: 'Colab-framework',
  },
  '6c386899-7a00-4733-8447-5ef925bbf700': {
    CHANNEL_ID: 'KEF-channel',
    CONTENT_FRAMEWORK: 'KEF-framework',
    COLLECTION_FRAMEWORK: 'KEF-framework',
  },
  '3a849655-30f6-4c2b-8707-315f1ed64fbd': {
    CHANNEL_ID: 'atree-channel',
    CONTENT_FRAMEWORK: 'atree-framework',
    COLLECTION_FRAMEWORK: 'atree-framework',
  },
  'ebae40d1-b78a-4f73-8756-df5e4b060436': {
    CHANNEL_ID: 'shikshalokam-channel',
    CONTENT_FRAMEWORK: 'shikshalokam-framework',
    COLLECTION_FRAMEWORK: 'shikshalokam-framework',
  },
  '35529b5d-526f-4da5-bc6e-64f740023d26': {
    CHANNEL_ID: 'swadhaar-channel',
    CONTENT_FRAMEWORK: 'swadhaar-fw',
    COLLECTION_FRAMEWORK: 'swadhaar-fw',
  },
  '8cf74da8-392d-4d02-8ac3-ae2204e34c0a': {
    CHANNEL_ID: 'oblf-channel',
    CONTENT_FRAMEWORK: 'oblf-framework',
    COLLECTION_FRAMEWORK: 'oblf-framework',
  },
  'e2a27046-16c2-4e8b-a493-1d2bc11d290c': {
    CHANNEL_ID: 'shikshagraha-channel',
    CONTENT_FRAMEWORK: 'shikshagraha-framework',
    COLLECTION_FRAMEWORK: 'shikshagraha-framework',
  },
  '87f15a01-7a03-4ff3-9943-20f5875b4791': {
    CHANNEL_ID: 'badal',
    CONTENT_FRAMEWORK: 'badal-framework',
    COLLECTION_FRAMEWORK: 'badal-framework',
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
