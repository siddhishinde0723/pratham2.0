#!/usr/bin/env node

/**
 * Test S3 URL Construction
 * This script tests the URL cleaning logic
 */

function testUrlConstruction() {
  console.log('=== Testing S3 URL Construction ===\n');
  
  const testCases = [
    'https://saas-prod.s3.ap-south-1.amazonaws.com',
    'https://saas-prod.s3.ap-south-1.amazonaws.com/sunbird-content-prod',
    'https://saas-prod.s3.ap-south-1.amazonaws.com/sunbird-content-prod/',
    'https://saas-prod.s3.ap-south-1.amazonaws.com/content',
    'https://saas-prod.s3.ap-south-1.amazonaws.com/content/',
  ];
  
  const testPath = 'content/html/do_214403088205086720159-snapshot/index.html';
  
  testCases.forEach((cloudStorageUrl, index) => {
    console.log(`Test ${index + 1}:`);
    console.log(`  Input URL: ${cloudStorageUrl}`);
    
    // Apply the same cleaning logic as in the API
    const baseUrl = cloudStorageUrl
      .replace(/\/sunbird-content-prod.*$/, '')
      .replace(/\/content.*$/, '')
      .replace(/\/$/, '');
    
    const correctedPath = testPath.startsWith('content/') 
      ? testPath.replace('content/', 'content/assets/')
      : testPath;
    
    const finalUrl = `${baseUrl}/${correctedPath}`;
    
    console.log(`  Cleaned Base: ${baseUrl}`);
    console.log(`  Corrected Path: ${correctedPath}`);
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Expected: https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/html/do_214403088205086720159-snapshot/index.html`);
    console.log(`  ✅ Match: ${finalUrl === 'https://saas-prod.s3.ap-south-1.amazonaws.com/content/assets/html/do_214403088205086720159-snapshot/index.html'}`);
    console.log('');
  });
}

testUrlConstruction();
