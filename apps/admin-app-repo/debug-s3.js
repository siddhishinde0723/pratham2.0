#!/usr/bin/env node

/**
 * S3 Access Debug Script
 * This script helps debug S3 access issues by testing different authentication methods
 */

const https = require('https');
const http = require('http');

// Your S3 URL
const S3_URL = 'https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/html/do_214403088205086720159-snapshot/index.html';

// Test different authentication methods
async function testS3Access() {
  console.log('=== S3 Access Debug Tests ===\n');
  
  // Test 1: Direct access without authentication
  console.log('1. Testing direct S3 access (no auth)...');
  await testRequest(S3_URL, {});
  
  // Test 2: With Bearer token (if you have one)
  const authToken = process.env.AUTH_TOKEN || 'your-token-here';
  if (authToken && authToken !== 'your-token-here') {
    console.log('\n2. Testing with Bearer token...');
    await testRequest(S3_URL, {
      'Authorization': `Bearer ${authToken}`
    });
  }
  
  // Test 3: With AWS credentials (if available)
  const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (awsAccessKey && awsSecretKey) {
    console.log('\n3. Testing with AWS credentials...');
    // Note: This would require AWS SDK for proper signing
    console.log('AWS credentials found, but proper signing requires AWS SDK');
  }
  
  // Test 4: Check if it's a public bucket
  console.log('\n4. Testing if bucket is public...');
  const bucketUrl = 'https://saas-prod.s3.ap-south-1.amazonaws.com/';
  await testRequest(bucketUrl, {});
}

function testRequest(url, headers) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; S3Debug/1.0)',
        ...headers
      }
    };
    
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      console.log(`  Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`  Headers:`, Object.keys(res.headers));
      
      if (res.statusCode === 200) {
        console.log('  ✅ SUCCESS: Content accessible');
      } else if (res.statusCode === 403) {
        console.log('  ❌ FORBIDDEN: Access denied - authentication required');
      } else if (res.statusCode === 404) {
        console.log('  ❌ NOT FOUND: Resource does not exist');
      } else {
        console.log(`  ⚠️  UNEXPECTED: Status ${res.statusCode}`);
      }
      
      // Read response body for error details
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (body && res.statusCode !== 200) {
          console.log('  Error details:', body.substring(0, 200));
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`  ❌ ERROR: ${error.message}`);
      resolve();
    });
    
    req.end();
  });
}

// Run the tests
testS3Access().then(() => {
  console.log('\n=== Debug Complete ===');
  console.log('\nNext steps:');
  console.log('1. Check if the S3 bucket is public or requires authentication');
  console.log('2. Verify your authentication token is valid');
  console.log('3. Check if the content path exists in S3');
  console.log('4. Review S3 bucket policies and permissions');
});
