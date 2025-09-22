#!/usr/bin/env node

/**
 * Test S3 Assets API Fix
 * This script tests the corrected S3 assets API
 */

const http = require('http');

function testS3AssetsAPI() {
  console.log('=== Testing S3 Assets API Fix ===\n');
  
  const testPath = 'content/html/do_214403088205086720159-snapshot/index.html';
  const apiUrl = `http://localhost:3002/api/s3-assets?path=${encodeURIComponent(testPath)}`;
  
  console.log('Testing URL:', apiUrl);
  console.log('Expected S3 URL: https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/html/do_214403088205086720159-snapshot/index.html\n');
  
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: `/api/s3-assets?path=${encodeURIComponent(testPath)}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; S3Test/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    console.log('Headers:', Object.keys(res.headers));
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS: Content loaded successfully');
        console.log('Content preview:', body.substring(0, 200) + '...');
      } else {
        console.log('❌ ERROR:', res.statusCode);
        console.log('Error details:', body);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log('❌ REQUEST ERROR:', error.message);
  });
  
  req.end();
}

// Run the test
testS3AssetsAPI();
