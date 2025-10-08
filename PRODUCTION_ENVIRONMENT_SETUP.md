# Production Environment Setup

## Issue
Content upload is working locally but failing in production with `403 Forbidden` error when accessing S3 files.

## Root Cause
1. S3 bucket lacks proper CORS configuration
2. Missing public read permissions on S3 bucket
3. Environment variables not properly configured for production

## Solution Steps

### 1. Configure S3 Bucket CORS

Go to AWS S3 Console → Your Bucket (`saas-prod`) → Permissions → CORS

Add this CORS configuration:

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

### 2. Configure S3 Bucket Policy

Go to AWS S3 Console → Your Bucket → Permissions → Bucket Policy

Add this bucket policy:

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

### 3. Set Production Environment Variables

Create a `.env.production` file or set these in your deployment environment:

```bash
# S3 Configuration
AWS_BUCKET_NAME=saas-prod
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Cloud Storage URLs
CLOUD_STORAGE_URL=https://saas-prod.s3.ap-south-1.amazonaws.com
NEXT_PUBLIC_CLOUD_STORAGE_URL=https://saas-prod.s3.ap-south-1.amazonaws.com

# Base URLs (Update with your actual production domains)
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
NEXT_PUBLIC_WORKSPACE_BASE_URL=https://your-workspace-domain.com
NEXT_PUBLIC_TELEMETRY_URL=https://your-telemetry-domain.com

# Authentication
AUTH_API_TOKEN=your-production-auth-token
```

### 4. Verify S3 Access

Test direct S3 access:

```bash
# Test if file is accessible
curl -I https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/do_21441727907863756811/a-crows-tale.pdf

# Test CORS
curl -H "Origin: https://your-domain.com" -H "Access-Control-Request-Method: GET" -X OPTIONS https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/do_21441727907863756811/a-crows-tale.pdf
```

### 5. Alternative: Use CloudFront

If S3 direct access doesn't work, consider using CloudFront:

1. Create a CloudFront distribution
2. Set origin to your S3 bucket
3. Configure CORS in CloudFront
4. Update `CLOUD_STORAGE_URL` to point to CloudFront domain

### 6. Debugging Steps

1. **Check S3 Bucket Permissions**: Ensure the bucket allows public read access
2. **Verify CORS Configuration**: Test with browser dev tools
3. **Check Environment Variables**: Ensure all production env vars are set
4. **Test API Endpoints**: Verify `/api/s3-assets` endpoint works
5. **Check Network Tab**: Look for CORS errors in browser console

### 7. Common Issues

- **403 Forbidden**: S3 bucket doesn't have public read access
- **CORS Error**: Missing CORS configuration on S3 bucket
- **Environment Variables**: Wrong URLs or missing credentials
- **Network Issues**: Firewall or security group blocking S3 access

## Testing

After implementing these changes:

1. Restart your production application
2. Test content upload flow
3. Verify file access in browser
4. Check browser console for any remaining errors

## Monitoring

Monitor these logs in production:
- S3 access logs
- Application error logs
- Browser console errors
- Network requests in browser dev tools
