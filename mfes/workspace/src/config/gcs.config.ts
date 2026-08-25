/**
 * Google Cloud Storage Configuration
 * This file contains the service account credentials for GCS
 * 
 * IMPORTANT: In production, store these as environment variables
 * and reference them instead of hardcoding here.
 */

export const GCS_CONFIG = {
  type: 'service_account',
  project_id: 'shiksha-prod',
  private_key_id: '546233c95a740c48ad278a1ed19ec5f4357eb274',
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDa5B+ThCeaqs12
jiyRjAOcsIuCeeWUmsPJenmwViSJfnOWpsQ+nAN4jUry+i8vkNFi0TMofnqFcEY/
bEnwZxJDzIEgHpyy3+2kQNMvtvkfZJnoELJWKese2qFRIUzTpVw3dCjyr7jBAk6x
ThMO79VWljBqeIXoZIZb5SynzruRb0y7j3jC/+FIPQFnVwXWjqKMCQtB2pV0sOkC
1T505CiyqF+ohmVszV1xGFkqlThQ8w4BShoXjHpKHc6wa6R+TzmRgVYQGb/8sa94
cjufBjGWlospFUfA1Fcu/5PpONsqCnp0ENIF+3a8pU+WbyUpIQAlWpS1sVfJ+P3f
oYeIVtpTAgMBAAECggEANyEhesvcFa5TFTr1qqqy9jHY0UHWOrlH+mSoZWssxJxe
jGDwKDyu+xvK9qtgWwCEW/kIg3hnb1g5uRuS+8NZ7E2DcA2Ftd+EQMw65FeXIvr5
cGNUJzNjjl/OJVrXuK57LVRKQ+VSCPqFy044qphpCOfGxeoY/9Dhrh9oQdNlllkU
ShoUtgPznqdZhZpY5b0y1mtKzBbk+nHKmOpIJwqvYC3tIzX+r/ZwJlX/5YZyf0rA
dPKlJGzyey5Qbj0LUowbNQ2zrtHzh30TmvcIDfEMmhQcmEyZ8zLh/fS0R9K33dPp
DtScAYf6HcmBrQlWvPR6Ml0GEANjb5nGQveL3XfW4QKBgQD/c13oMwgrNUCXfgsu
eslFb9agn7S4MGHMYStooBHIw/zWHOOh7yuTA+EJUX7J3LNGJHGr/C4lNtPrE11+
hBdbNAYU4IkRfX3F+6p/LQiIfFb0/8C4sis54sa4RnQfaLI8eyKWI9EXfZCrECBY
v9Km4DKn9m/2mlmBF5uubCz7awKBgQDbXKEgpO0bvsEaRUz7LyISFMAXsreDWloD
rmYKypKP58N+m+8qQeclxAFF7eVj2YHDFyTj/l1DfE6EWHMHbhVJRQ4uKb1AI8+0
IlGhgXPFxxNH7NMc0TriqKXi2uW+Er34gmGMt4O+Ste6ybJHrSglfIGIOrg42JCZ
tekkgGP+uQKBgQD2rDvRPn4z4x91aoR3pJ/5Ck8yGiZT+nxl9KsLRA8IVKExTQJP
W/oy4/sJmYWafiErqYOO9VzGGNS42qFcy0cWjf0VaeFSX2D1rtjsJ9tmmNMLkHBU
qc/t/NuyFG6L6fi7SJiUbQ+65Eivt0nVCZ7r//FKmkFx24h0jQyLePBS8wKBgGB1
QNzr6N90Z9E3e/xP43lz6mwBSDTYPBC2VWSVYxEoZox74RUB2bR/lde8Hkxjzm2M
9cnThgsw1A3aHuq7e1y2ot+ltvRHSwP4u1B7bf8f5NiRyNs5Hd2hLyCsBK4p66Ml
IeQQpju9CVO3cU+XUrn5H7RZrbxBboRIu3YzhsTxAoGAFqJ4az1vdyQpQBWP6Zux
ihp37ekFrySoOFSDbChBLwryk6V5mi7n8HbiEWWENfCjgPSk0BLSJ6MmAtE5sWHC
vQ/CX0DNymNE3kFI9QEfH7KGcA0rQwpylBo/KPbhA4WnfguA9GRrpV33z3l76YfE
TBhbXZ+ue4Qaip6hN0yRomI=
-----END PRIVATE KEY-----
`,
  client_email: 'storge-account-swadhar@shiksha-prod.iam.gserviceaccount.com',
  client_id: '112514251036098283174',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/storge-account-swadhar%40shiksha-prod.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
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
  bucketName: process.env.GCS_BUCKET_NAME || 'swadharprod', // Google Cloud Storage bucket name
});