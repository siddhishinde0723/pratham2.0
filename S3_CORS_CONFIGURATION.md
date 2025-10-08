# S3 CORS Configuration for Production

## Issue
Getting `403 Forbidden` error when accessing S3 files in production. This is due to missing CORS configuration and bucket permissions.

## S3 Bucket CORS Configuration

Add the following CORS configuration to your S3 bucket (`saas-prod`):

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD",
            "POST",
            "PUT",
            "DELETE"
        ],
        "AllowedOrigins": [
            "http://localhost:3002",
            "https://your-production-domain.com",
            "https://dev-shiksha-admin.tekdinext.com",
            "*"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-meta-custom-header"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

## S3 Bucket Policy

Add this bucket policy to allow public read access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::saas-prod/*"
        }
    ]
}
```

## Environment Variables for Production

Ensure these environment variables are set in production:

```bash
# S3 Configuration
AWS_BUCKET_NAME=saas-prod
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Cloud Storage URLs
CLOUD_STORAGE_URL=https://saas-prod.s3.ap-south-1.amazonaws.com
NEXT_PUBLIC_CLOUD_STORAGE_URL=https://saas-prod.s3.ap-south-1.amazonaws.com

# Base URLs
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
NEXT_PUBLIC_WORKSPACE_BASE_URL=https://your-workspace-domain.com
```

## Steps to Fix:

1. **Configure S3 CORS**: Add the CORS configuration above to your S3 bucket
2. **Set Bucket Policy**: Apply the bucket policy for public read access
3. **Update Environment Variables**: Ensure all production environment variables are correctly set
4. **Test Access**: Verify that files can be accessed directly via S3 URLs
5. **Redeploy**: Restart your production application after making these changes

## Verification Commands:

```bash
# Test S3 access
curl -I https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/do_21441727907863756811/a-crows-tale.pdf

# Test with CORS headers
curl -H "Origin: https://your-domain.com" -H "Access-Control-Request-Method: GET" -X OPTIONS https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/do_21441727907863756811/a-crows-tale.pdf
```
