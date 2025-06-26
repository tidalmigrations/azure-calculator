import { AzureRetailPrice } from '@/types';
import { azureClient } from '@/lib/api';
import { PricingRequirements, PricingCache } from './types';

/**
 * Phase 3.2: Batch API Fetching & Phase 3.3: In-Memory Caching
 * Manages batch fetching of pricing data and in-memory caching for the duration of a user session
 */
export class PricingCacheManager {
  private cache: PricingCache;

  constructor(cacheTtl: number = 3600000) { // 1 hour default TTL
    this.cache = {
      vmPrices: new Map<string, AzureRetailPrice[]>(),
      storagePrices: new Map<string, AzureRetailPrice[]>(),
      cacheTimestamp: Date.now(),
      cacheTtl
    };
  }

  /**
   * Phase 3.2: Batch fetch all required pricing data
   * Makes minimal API calls to retrieve all necessary pricing information
   */
  async batchFetchPricing(requirements: PricingRequirements): Promise<void> {
    console.log('🚀 Phase 3.2 - Starting batch API fetching');
    
    const startTime = Date.now();
    const totalRequests = requirements.vmRequirements.size + requirements.storageRequirements.size;
    
    console.log('📊 Phase 3.2 - Batch fetch plan:', {
      vmRequirements: requirements.vmRequirements.size,
      storageRequirements: requirements.storageRequirements.size,
      totalRequests,
      estimatedTime: `${Math.ceil(totalRequests * 2)}s (with rate limiting)`
    });

    // Batch fetch VM prices
    await this.batchFetchVMPrices(requirements.vmRequirements);
    
    // Batch fetch storage prices  
    await this.batchFetchStoragePrices(requirements.storageRequirements);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Phase 3.2 - Batch fetching complete:', {
      duration: `${Math.round(duration / 1000)}s`,
      vmCacheSize: this.cache.vmPrices.size,
      storageCacheSize: this.cache.storagePrices.size,
      totalCachedEntries: this.cache.vmPrices.size + this.cache.storagePrices.size
    });
  }

  /**
   * Batch fetch VM prices for all unique region:os combinations
   */
  private async batchFetchVMPrices(vmRequirements: Set<string>): Promise<void> {
    console.log('🖥️  Phase 3.2 - Fetching VM prices for', vmRequirements.size, 'combinations');
    
    const vmPromises = Array.from(vmRequirements).map(async (vmKey) => {
      const [region, os] = vmKey.split(':') as [string, 'windows' | 'linux'];
      
      try {
        console.log(`🔄 Phase 3.2 - Fetching VM prices: ${region}, ${os}`);
        
        // Try Calculator API first, fallback to Retail API
        let vmPrices: AzureRetailPrice[];
        try {
          vmPrices = await azureClient.getVMPricesFromCalculator(region, os);
          console.log(`✅ Phase 3.2 - VM Calculator API: ${region}:${os} -> ${vmPrices.length} prices`);
        } catch (error) {
          console.warn(`⚠️  Phase 3.2 - Calculator API failed for ${region}:${os}, using Retail API`);
          vmPrices = await azureClient.getVMPrices(region, os);
          console.log(`✅ Phase 3.2 - VM Retail API: ${region}:${os} -> ${vmPrices.length} prices`);
        }
        
        this.cache.vmPrices.set(vmKey, vmPrices);
        
      } catch (error) {
        console.error(`❌ Phase 3.2 - Failed to fetch VM prices for ${vmKey}:`, error);
        // Store empty array to prevent retry attempts
        this.cache.vmPrices.set(vmKey, []);
      }
    });

    // Execute all VM price fetches with controlled concurrency
    await this.executeWithConcurrencyLimit(vmPromises, 2); // Limit to 2 concurrent requests
  }

  /**
   * Batch fetch storage prices for all unique region:storageType combinations
   */
  private async batchFetchStoragePrices(storageRequirements: Set<string>): Promise<void> {
    console.log('💾 Phase 3.2 - Fetching storage prices for', storageRequirements.size, 'combinations');
    
    const storagePromises = Array.from(storageRequirements).map(async (storageKey) => {
      const [region, storageType] = storageKey.split(':') as [string, 'standard-hdd' | 'standard-ssd' | 'premium-ssd'];
      
      try {
        console.log(`🔄 Phase 3.2 - Fetching storage prices: ${region}, ${storageType}`);
        
        const storagePrices = await azureClient.getStoragePrices(region, storageType);
        console.log(`✅ Phase 3.2 - Storage API: ${region}:${storageType} -> ${storagePrices.length} prices`);
        
        this.cache.storagePrices.set(storageKey, storagePrices);
        
      } catch (error) {
        console.error(`❌ Phase 3.2 - Failed to fetch storage prices for ${storageKey}:`, error);
        // Store empty array to prevent retry attempts
        this.cache.storagePrices.set(storageKey, []);
      }
    });

    // Execute all storage price fetches with controlled concurrency
    await this.executeWithConcurrencyLimit(storagePromises, 2); // Limit to 2 concurrent requests
  }

  /**
   * Execute promises with concurrency limit to avoid overwhelming the API
   */
  private async executeWithConcurrencyLimit<T>(promises: Promise<T>[], limit: number): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit);
      const batchResults = await Promise.allSettled(batch);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Batch execution failed for promise ${i + index}:`, result.reason);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + limit < promises.length) {
        const delay = 1000; // 1 second delay between batches
        console.log(`⏳ Phase 3.2 - Waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  /**
   * Phase 3.3: Get VM prices from cache
   */
  getVMPrices(region: string, os: 'windows' | 'linux'): AzureRetailPrice[] | null {
    const key = `${region}:${os}`;
    const cached = this.cache.vmPrices.get(key);
    
    if (cached) {
      console.log(`📦 Phase 3.3 - Cache hit for VM prices: ${key} (${cached.length} prices)`);
      return cached;
    }
    
    console.log(`❌ Phase 3.3 - Cache miss for VM prices: ${key}`);
    return null;
  }

  /**
   * Phase 3.3: Get storage prices from cache
   */
  getStoragePrices(region: string, storageType: 'standard-hdd' | 'standard-ssd' | 'premium-ssd'): AzureRetailPrice[] | null {
    const key = `${region}:${storageType}`;
    const cached = this.cache.storagePrices.get(key);
    
    if (cached) {
      console.log(`📦 Phase 3.3 - Cache hit for storage prices: ${key} (${cached.length} prices)`);
      return cached;
    }
    
    console.log(`❌ Phase 3.3 - Cache miss for storage prices: ${key}`);
    return null;
  }

  /**
   * Check if cache is valid (not expired)
   */
  isCacheValid(): boolean {
    const now = Date.now();
    const isValid = (now - this.cache.cacheTimestamp) < this.cache.cacheTtl;
    
    if (!isValid) {
      console.log('⏰ Phase 3.3 - Cache expired, will need to refresh');
    }
    
    return isValid;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    console.log('🧹 Phase 3.3 - Clearing pricing cache');
    this.cache.vmPrices.clear();
    this.cache.storagePrices.clear();
    this.cache.cacheTimestamp = Date.now();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    vmCacheSize: number;
    storageCacheSize: number;
    totalEntries: number;
    cacheAge: number;
    isValid: boolean;
  } {
    const now = Date.now();
    return {
      vmCacheSize: this.cache.vmPrices.size,
      storageCacheSize: this.cache.storagePrices.size,
      totalEntries: this.cache.vmPrices.size + this.cache.storagePrices.size,
      cacheAge: now - this.cache.cacheTimestamp,
      isValid: this.isCacheValid()
    };
  }
} 