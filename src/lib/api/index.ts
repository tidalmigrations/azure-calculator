/**
 * Azure API Integration
 * 
 * This module provides a complete TypeScript client for the Azure Retail Prices API
 * with caching, rate limiting, error handling, and comprehensive filtering capabilities.
 */

// Main API client
export { AzureRetailPricesClient, azureClient } from './azureClient';

// Filter utilities
export {
  buildFilter,
  buildVMFilter,
  buildStorageFilter,
  normalizeRegionName,
  getAvailableRegions,
  VM_SKU_PATTERNS,
  type PriceFilters
} from './filters';

// Testing utilities (development only)
export {
  testVMPricing,
  testStoragePricing,
  testCaching,
  testConcurrentRequests,
  runAllTests,
  quickTest,
  type TestResult
} from './testClient';

// Re-export types from main types file
export type {
  AzureRetailPrice,
  AzureApiResponse,
  CachedResponse,
  ApiError
} from '@/types';

/**
 * Quick start examples:
 * 
 * ```typescript
 * import { azureClient, getAvailableRegions } from '@/lib/api';
 * 
 * // Get VM prices for Linux in East US
 * const vmPrices = await azureClient.getVMPrices('eastus', 'linux');
 * 
 * // Get storage prices for premium SSD
 * const storagePrices = await azureClient.getStoragePrices('westus', 'premium-ssd');
 * 
 * // Search with custom filters
 * const customPrices = await azureClient.searchPrices({
 *   serviceName: 'Virtual Machines',
 *   region: 'eastus',
 *   os: 'windows',
 *   priceType: 'Consumption'
 * });
 * 
 * // Get available regions
 * const regions = getAvailableRegions();
 * ```
 */ 