/* eslint-disable @nx/enforce-module-boundaries */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createArtifactWorkflowService } from '@workspace/services/ContentArtifactWorkflowService';
import { getGCSWorkflowConfig } from '@workspace/config/gcs.config';
import { getCookie } from '@workspace/utils/cookieHelper';

/**
 * API Route handler for processing content artifacts
 * This runs on the server side where @google-cloud/storage can work properly
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { contentData } = req.body;

    // Validate request body
    if (!contentData) {
      return res.status(400).json({ error: 'contentData is required' });
    }

    if (!contentData.identifier) {
      return res.status(400).json({ error: 'contentData.identifier is required' });
    }

    console.log('[API] Processing artifact workflow for content:', contentData.identifier);
    console.log('[API] Content data received:', {
      identifier: contentData.identifier,
      versionKey: contentData.versionKey,
      status: contentData.status,
      artifactUrl: contentData.artifactUrl,
    });

    // Get authentication token and tenant ID from cookies for server-side API calls
    const authToken = getCookie(req, 'authToken') || process.env.AUTH_API_TOKEN;
    const tenantId = getCookie(req, 'tenantId') || process.env.NEXT_PUBLIC_TENANT_ID;
    
    console.log('[API] Authentication:', {
      hasAuthToken: !!authToken,
      tenantId,
    });

    // Get GCS configuration
    const gcsConfig = getGCSWorkflowConfig();

    // Create workflow service instance with auth info for server-side API calls
    const workflowService = createArtifactWorkflowService({
      gcsConfig: {
        projectId: gcsConfig.projectId,
        privateKey: gcsConfig.privateKey,
        clientEmail: gcsConfig.clientEmail,
        bucketName: gcsConfig.bucketName,
      },
      authToken, // Pass auth token for server-side API calls
      tenantId, // Pass tenant ID for server-side API calls
      req, // Pass request object for cookie forwarding
    });

    // Process the artifact workflow
    // Note: contentData should have been fetched in edit mode on the client side
    // The workflow will fetch fresh content again after upload to get updated versionKey
    const workflowResult = await workflowService.processContentArtifact(contentData);

    // Return the result
    return res.status(200).json(workflowResult);
  } catch (error) {
    console.error('[API] Error processing artifact workflow:', error);
    return res.status(500).json({
      error: 'Failed to process artifact workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

