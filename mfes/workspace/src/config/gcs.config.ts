/**
 * Google Cloud Storage Configuration
 * This file contains the service account credentials for GCS
 * 
 * IMPORTANT: In production, store these as environment variables
 * and reference them instead of hardcoding here.
 */

export const GCS_CONFIG = {
  type: '',
  project_id: '',
  private_key_id: '',
  private_key: `
`,
  client_email: '',
  client_id: '',
  auth_uri: '',
  token_uri: '',
  auth_provider_x509_cert_url: '',
  client_x509_cert_url: '',
  universe_domain: '',
};

/**
 * GCS Service Configuration for the Content Artifact Workflow
 * These values can be overridden by environment variables
 */
export const getGCSWorkflowConfig = () => ({
  // Note: Do NOT use NEXT_PUBLIC_ prefix for sensitive credentials (server-side only)
  projectId: process.env.GCS_PROJECT_ID || GCS_CONFIG.project_id,
  privateKey: process.env.GCS_PRIVATE_KEY || GCS_CONFIG.private_key,
  clientEmail: process.env.GCS_CLIENT_EMAIL || GCS_CONFIG.client_email,
  bucketName: process.env.GCS_BUCKET_NAME || '', // Google Cloud Storage bucket name
});

