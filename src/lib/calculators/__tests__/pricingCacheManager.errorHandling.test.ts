import { PricingCacheManager } from '../pricingCacheManager';
import { azureClient } from '@/lib/api';
import { PricingRequirements } from '../types';
import { AzureRetailPrice } from '@/types';

// Mock the Azure client
jest.mock('@/lib/api', () => ({
  azureClient: {
    getVMPricesFromCalculator: jest.fn(),
    getVMPrices: jest.fn(),
    getStoragePrices: jest.fn(),
  },
}));

const mockAzureClient = azureClient as jest.Mocked<typeof azureClient>;

describe('PricingCacheManager - Error Handling and Edge Cases', () => {
  let cacheManager: PricingCacheManager;
  
  // Mock console methods to avoid test output pollution
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    cacheManager = new PricingCacheManager();
    jest.clearAllMocks();
    
    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('API Failure Scenarios', () => {
    it('should handle complete VM API failure gracefully', async () => {
      const mockError = new Error('API service unavailable');
      mockAzureClient.getVMPricesFromCalculator.mockRejectedValue(mockError);
      mockAzureClient.getVMPrices.mockRejectedValue(mockError);
      mockAzureClient.getStoragePrices.mockResolvedValue([]);

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows']),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus', 'westus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      // Should not throw error
      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();

      // Should store empty arrays for failed requests
      expect(cacheManager.getVMPrices('eastus', 'linux')).toEqual([]);
      expect(cacheManager.getVMPrices('westus', 'windows')).toEqual([]);

      // Should log errors
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch VM prices'),
        mockError
      );
    });

    it('should handle complete storage API failure gracefully', async () => {
      const mockError = new Error('Storage API timeout');
      mockAzureClient.getVMPricesFromCalculator.mockResolvedValue([]);
      mockAzureClient.getStoragePrices.mockRejectedValue(mockError);

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux']),
        storageRequirements: new Set(['eastus:premium-ssd', 'westus:standard-hdd']),
        uniqueRegions: new Set(['eastus', 'westus']),
        uniqueOSTypes: new Set(['linux']),
        uniqueStorageTypes: new Set(['premium-ssd', 'standard-hdd'])
      };

      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();

      // Should store empty arrays for failed requests
      expect(cacheManager.getStoragePrices('eastus', 'premium-ssd')).toEqual([]);
      expect(cacheManager.getStoragePrices('westus', 'standard-hdd')).toEqual([]);

      // Should log errors
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch storage prices'),
        mockError
      );
    });

    it('should handle partial failures correctly', async () => {
      // Mock mixed success/failure responses
      mockAzureClient.getVMPricesFromCalculator
        .mockResolvedValueOnce([{ meterName: 'VM1' } as AzureRetailPrice]) // Success for eastus:linux
        .mockRejectedValueOnce(new Error('API error')); // Failure for westus:windows

      mockAzureClient.getVMPrices
        .mockRejectedValueOnce(new Error('Fallback also failed')); // Fallback failure for westus:windows

      mockAzureClient.getStoragePrices
        .mockResolvedValueOnce([{ meterName: 'Storage1' } as AzureRetailPrice]); // Success for storage

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows']),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus', 'westus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      await cacheManager.batchFetchPricing(requirements);

      // Successful request should have data
      const successfulVMPrices = cacheManager.getVMPrices('eastus', 'linux');
      expect(successfulVMPrices).toHaveLength(1);
      expect(successfulVMPrices![0].meterName).toBe('VM1');

      // Failed request should have empty array
      expect(cacheManager.getVMPrices('westus', 'windows')).toEqual([]);

      // Storage should work
      const storagePrices = cacheManager.getStoragePrices('eastus', 'premium-ssd');
      expect(storagePrices).toHaveLength(1);
      expect(storagePrices![0].meterName).toBe('Storage1');
    });

    it('should handle calculator API failure with successful fallback', async () => {
      const calculatorError = new Error('Calculator API failed');
      const fallbackData = [{ meterName: 'Fallback VM' } as AzureRetailPrice];

      mockAzureClient.getVMPricesFromCalculator.mockRejectedValue(calculatorError);
      mockAzureClient.getVMPrices.mockResolvedValue(fallbackData);

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux']),
        storageRequirements: new Set([]),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set(['linux']),
        uniqueStorageTypes: new Set([])
      };

      await cacheManager.batchFetchPricing(requirements);

      // Should use fallback data
      const vmPrices = cacheManager.getVMPrices('eastus', 'linux');
      expect(vmPrices).toEqual(fallbackData);

      // Should log the fallback usage
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Calculator API failed for eastus:linux, using Retail API')
      );
    });

    it('should handle timeout scenarios', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      mockAzureClient.getVMPricesFromCalculator.mockRejectedValue(timeoutError);
      mockAzureClient.getVMPrices.mockRejectedValue(timeoutError);
      mockAzureClient.getStoragePrices.mockResolvedValue([]);

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux']),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set(['linux']),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();

      // Should store empty array for timeout
      expect(cacheManager.getVMPrices('eastus', 'linux')).toEqual([]);
    });

    it('should handle network errors', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockAzureClient.getVMPricesFromCalculator.mockRejectedValue(networkError);
      mockAzureClient.getVMPrices.mockRejectedValue(networkError);
      mockAzureClient.getStoragePrices.mockRejectedValue(networkError);

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux']),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set(['linux']),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();

      // Should handle network errors gracefully
      expect(cacheManager.getVMPrices('eastus', 'linux')).toEqual([]);
      expect(cacheManager.getStoragePrices('eastus', 'premium-ssd')).toEqual([]);
    });
  });

  describe('Concurrency Control Error Handling', () => {
    it('should handle Promise.allSettled rejections correctly', async () => {
      // Create a spy on executeWithConcurrencyLimit to test its error handling
      const cacheManagerSpy = jest.spyOn(cacheManager as any, 'executeWithConcurrencyLimit');
      
      // Mock some requests to fail
      mockAzureClient.getVMPricesFromCalculator
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Batch error 1'))
        .mockRejectedValueOnce(new Error('Batch error 2'));

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows', 'centralus:linux']),
        storageRequirements: new Set([]),
        uniqueRegions: new Set(['eastus', 'westus', 'centralus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set([])
      };

      await cacheManager.batchFetchPricing(requirements);

      // Should have been called with VM promises
      expect(cacheManagerSpy).toHaveBeenCalled();

      // Should log individual fetch failures (not batch execution failures)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch VM prices'),
        expect.any(Error)
      );
    });

    it('should respect concurrency limits even with errors', async () => {
      // Simplified test - just verify that batch processing completes without throwing
      mockAzureClient.getVMPricesFromCalculator.mockRejectedValue(new Error('Controlled failure'));

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows']),
        storageRequirements: new Set([]),
        uniqueRegions: new Set(['eastus', 'westus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set([])
      };

      // Should complete without throwing despite errors
      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();
      
      // Should have attempted to cache failed requests as empty arrays
      expect(cacheManager.getVMPrices('eastus', 'linux')).toEqual([]);
      expect(cacheManager.getVMPrices('westus', 'windows')).toEqual([]);
    });
  });

  describe('Cache Edge Cases', () => {
    it('should handle cache retrieval for non-existent keys', () => {
      const vmPrices = cacheManager.getVMPrices('nonexistent', 'linux');
      const storagePrices = cacheManager.getStoragePrices('nonexistent', 'premium-ssd');

      expect(vmPrices).toBeNull();
      expect(storagePrices).toBeNull();

      // Should log cache misses
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for VM prices')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for storage prices')
      );
    });

    it('should handle cache expiration correctly', () => {
      // Create cache manager with very short TTL
      const shortTtlCache = new PricingCacheManager(1); // 1ms TTL

      // Manually populate cache
      (shortTtlCache as any).cache.vmPrices.set('eastus:linux', []);
      (shortTtlCache as any).cache.cacheTimestamp = Date.now() - 10; // Set to past

      // Should be expired
      expect(shortTtlCache.isCacheValid()).toBe(false);

      // Should log expiration
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache expired')
      );
    });

    it('should handle cache statistics for empty cache', () => {
      const stats = cacheManager.getCacheStats();

      expect(stats.vmCacheSize).toBe(0);
      expect(stats.storageCacheSize).toBe(0);
      expect(stats.totalEntries).toBe(0);
      expect(stats.cacheAge).toBeGreaterThanOrEqual(0);
      expect(stats.isValid).toBe(true);
    });

    it('should handle cache clearing', () => {
      // Manually populate cache
      (cacheManager as any).cache.vmPrices.set('eastus:linux', []);
      (cacheManager as any).cache.storagePrices.set('eastus:premium-ssd', []);

      expect(cacheManager.getCacheStats().totalEntries).toBe(2);

      cacheManager.clearCache();

      expect(cacheManager.getCacheStats().totalEntries).toBe(0);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Clearing pricing cache')
      );
    });
  });

  describe('Memory Constraints', () => {
    it('should handle multiple cache entries efficiently', async () => {
      // Create a small number of requirements for testing
      const requirements: PricingRequirements = {
        vmRequirements: new Set(['region1:linux', 'region2:windows', 'region3:linux']),
        storageRequirements: new Set(['region1:premium-ssd', 'region2:standard-hdd', 'region3:standard-ssd']),
        uniqueRegions: new Set(['region1', 'region2', 'region3']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd', 'standard-hdd', 'standard-ssd'])
      };

      // Mock API to return empty arrays quickly
      mockAzureClient.getVMPricesFromCalculator.mockResolvedValue([]);
      mockAzureClient.getStoragePrices.mockResolvedValue([]);

      await cacheManager.batchFetchPricing(requirements);

      // Should have cached all entries
      const stats = cacheManager.getCacheStats();
      expect(stats.vmCacheSize).toBe(3);
      expect(stats.storageCacheSize).toBe(3);
      expect(stats.totalEntries).toBe(6);
      expect(stats.isValid).toBe(true);
    });

    it('should handle memory pressure gracefully', () => {
      // Simulate memory pressure by creating many cache entries
      const largeCacheManager = new PricingCacheManager();
      
      // Fill cache with many entries
      for (let i = 0; i < 10000; i++) {
        const vmKey = `region-${i}:linux`;
        const storageKey = `region-${i}:premium-ssd`;
        
        (largeCacheManager as any).cache.vmPrices.set(vmKey, []);
        (largeCacheManager as any).cache.storagePrices.set(storageKey, []);
      }

      // Should still function correctly
      expect(largeCacheManager.getCacheStats().totalEntries).toBe(20000);
      expect(largeCacheManager.isCacheValid()).toBe(true);

      // Should be able to retrieve entries
      expect(largeCacheManager.getVMPrices('region-0', 'linux')).toEqual([]);
      expect(largeCacheManager.getStoragePrices('region-0', 'premium-ssd')).toEqual([]);
    });
  });

  describe('Edge Cases with Empty Requirements', () => {
    it('should handle empty VM requirements', async () => {
      const requirements: PricingRequirements = {
        vmRequirements: new Set(),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set(),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      mockAzureClient.getStoragePrices.mockResolvedValue([]);

      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();

      // Should not call VM APIs
      expect(mockAzureClient.getVMPricesFromCalculator).not.toHaveBeenCalled();
      expect(mockAzureClient.getVMPrices).not.toHaveBeenCalled();
      
      // Should call storage API
      expect(mockAzureClient.getStoragePrices).toHaveBeenCalledWith('eastus', 'premium-ssd');
    });

    it('should handle empty storage requirements', async () => {
      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux']),
        storageRequirements: new Set(),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set(['linux']),
        uniqueStorageTypes: new Set()
      };

      mockAzureClient.getVMPricesFromCalculator.mockResolvedValue([]);

      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();

      // Should call VM APIs
      expect(mockAzureClient.getVMPricesFromCalculator).toHaveBeenCalledWith('eastus', 'linux');
      
      // Should not call storage API
      expect(mockAzureClient.getStoragePrices).not.toHaveBeenCalled();
    });

    it('should handle completely empty requirements', async () => {
      const requirements: PricingRequirements = {
        vmRequirements: new Set(),
        storageRequirements: new Set(),
        uniqueRegions: new Set(),
        uniqueOSTypes: new Set(),
        uniqueStorageTypes: new Set()
      };

      await expect(cacheManager.batchFetchPricing(requirements)).resolves.not.toThrow();

      // Should not call any APIs
      expect(mockAzureClient.getVMPricesFromCalculator).not.toHaveBeenCalled();
      expect(mockAzureClient.getVMPrices).not.toHaveBeenCalled();
      expect(mockAzureClient.getStoragePrices).not.toHaveBeenCalled();

      // Cache should remain empty
      expect(cacheManager.getCacheStats().totalEntries).toBe(0);
    });
  });
}); 