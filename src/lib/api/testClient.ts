/**
 * Manual testing utility for Azure API client
 * Use this for development and debugging
 */

import { azureClient } from './azureClient';
import { getAvailableRegions } from './filters';
import type { AzureRetailPrice } from '@/types';

export interface TestResult {
  success: boolean;
  data?: AzureRetailPrice[];
  error?: string;
  duration: number;
  requestCount?: number;
}

/**
 * Test VM pricing for a specific region and OS
 */
export async function testVMPricing(
  region: string = 'eastus', 
  os: 'windows' | 'linux' = 'linux',
  skuName?: string
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Testing VM pricing for ${os} in ${region}${skuName ? ` (SKU: ${skuName})` : ''}`);
    
    const data = await azureClient.getVMPrices(region, os, skuName);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Found ${data.length} VM prices in ${duration}ms`);
    
    // Show some sample results
    if (data.length > 0) {
      console.log('Sample results:');
      data.slice(0, 3).forEach(price => {
        console.log(`  - ${price.armSkuName}: $${price.unitPrice}/hour (${price.location})`);
      });
    }
    
    return {
      success: true,
      data,
      duration,
      requestCount: data.length
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ VM pricing test failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Test storage pricing for a specific region and type
 */
export async function testStoragePricing(
  region: string = 'eastus',
  storageType: 'standard-hdd' | 'standard-ssd' | 'premium-ssd' = 'standard-hdd'
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Testing ${storageType} storage pricing in ${region}`);
    
    const data = await azureClient.getStoragePrices(region, storageType);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Found ${data.length} storage prices in ${duration}ms`);
    
    // Show some sample results
    if (data.length > 0) {
      console.log('Sample results:');
      data.slice(0, 3).forEach(price => {
        console.log(`  - ${price.meterName}: $${price.unitPrice}/${price.unitOfMeasure} (${price.location})`);
      });
    }
    
    return {
      success: true,
      data,
      duration,
      requestCount: data.length
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Storage pricing test failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Test API performance with multiple concurrent requests
 */
export async function testConcurrentRequests(requestCount: number = 3): Promise<TestResult[]> {
  console.log(`Testing ${requestCount} concurrent requests...`);
  
  const regions = getAvailableRegions().slice(0, requestCount);
  const promises = regions.map(region => testVMPricing(region.name, 'linux'));
  
  const results = await Promise.all(promises);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ ${successCount}/${requestCount} concurrent requests succeeded`);
  
  return results;
}

/**
 * Test caching behavior
 */
export async function testCaching(): Promise<{ firstRequest: TestResult; secondRequest: TestResult }> {
  console.log('Testing cache behavior...');
  
  // Clear cache first
  azureClient.clearCache();
  
  // First request (should hit API)
  const firstRequest = await testVMPricing('eastus', 'linux');
  
  // Second identical request (should use cache)
  const secondRequest = await testVMPricing('eastus', 'linux');
  
  console.log(`First request: ${firstRequest.duration}ms`);
  console.log(`Second request: ${secondRequest.duration}ms (cached)`);
  console.log(`Cache stats:`, azureClient.getCacheStats());
  
  return { firstRequest, secondRequest };
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Azure API tests...\n');
  
  try {
    // Test VM pricing
    await testVMPricing('eastus', 'linux');
    await testVMPricing('westus', 'windows');
    
    // Test storage pricing
    await testStoragePricing('eastus', 'standard-hdd');
    await testStoragePricing('westus', 'premium-ssd');
    
    // Test caching
    await testCaching();
    
    // Test concurrent requests
    await testConcurrentRequests(3);
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

/**
 * Quick test for development
 */
export async function quickTest(): Promise<void> {
  console.log('🔍 Running quick API test...');
  
  const result = await testVMPricing('eastus', 'linux', 'Standard_D2s_v3');
  
  if (result.success && result.data && result.data.length > 0) {
    const price = result.data[0];
    console.log('\n📊 Sample pricing data:');
    console.log(`VM: ${price.armSkuName}`);
    console.log(`Price: $${price.unitPrice}/hour`);
    console.log(`Region: ${price.location}`);
    console.log(`Service: ${price.serviceName}`);
  }
}

// Export for easy console testing
if (typeof window !== 'undefined') {
  (window as any).azureApiTest = {
    testVMPricing,
    testStoragePricing,
    testCaching,
    testConcurrentRequests,
    runAllTests,
    quickTest,
    client: azureClient
  };
} 