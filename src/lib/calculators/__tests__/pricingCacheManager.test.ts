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

describe('PricingCacheManager - Core Functionality', () => {
  let cacheManager: PricingCacheManager;
  
  // Sample mock data
  const mockVMPrices: AzureRetailPrice[] = [
    {
      currencyCode: 'USD',
      tierMinimumUnits: 0,
      retailPrice: 0.1,
      unitPrice: 0.1,
      armRegionName: 'eastus',
      location: 'East US',
      effectiveStartDate: '2023-01-01T00:00:00Z',
      meterId: 'vm-1',
      meterName: 'Standard_D2s_v3',
      productId: 'prod-1',
      skuId: 'sku-1',
      productName: 'Virtual Machines D2s v3',
      skuName: 'D2s v3',
      serviceName: 'Virtual Machines',
      serviceId: 'service-1',
      serviceFamily: 'Compute',
      unitOfMeasure: '1 Hour',
      type: 'Consumption',
      isPrimaryMeterRegion: true,
      armSkuName: 'Standard_D2s_v3'
    },
    {
      currencyCode: 'USD',
      tierMinimumUnits: 0,
      retailPrice: 0.2,
      unitPrice: 0.2,
      armRegionName: 'eastus',
      location: 'East US',
      effectiveStartDate: '2023-01-01T00:00:00Z',
      meterId: 'vm-2',
      meterName: 'Standard_D4s_v3',
      productId: 'prod-2',
      skuId: 'sku-2',
      productName: 'Virtual Machines D4s v3',
      skuName: 'D4s v3',
      serviceName: 'Virtual Machines',
      serviceId: 'service-1',
      serviceFamily: 'Compute',
      unitOfMeasure: '1 Hour',
      type: 'Consumption',
      isPrimaryMeterRegion: true,
      armSkuName: 'Standard_D4s_v3'
    }
  ];

  const mockStoragePrices: AzureRetailPrice[] = [
    {
      currencyCode: 'USD',
      tierMinimumUnits: 0,
      retailPrice: 0.05,
      unitPrice: 0.05,
      armRegionName: 'eastus',
      location: 'East US',
      effectiveStartDate: '2023-01-01T00:00:00Z',
      meterId: 'storage-1',
      meterName: 'Premium SSD Managed Disks P10',
      productId: 'prod-3',
      skuId: 'sku-3',
      productName: 'Premium SSD Managed Disks',
      skuName: 'P10',
      serviceName: 'Storage',
      serviceId: 'service-2',
      serviceFamily: 'Storage',
      unitOfMeasure: '1 Month',
      type: 'Consumption',
      isPrimaryMeterRegion: true,
      armSkuName: 'Premium_LRS'
    }
  ];

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

    // Default mock implementations
    mockAzureClient.getVMPricesFromCalculator.mockResolvedValue(mockVMPrices);
    mockAzureClient.getVMPrices.mockResolvedValue(mockVMPrices);
    mockAzureClient.getStoragePrices.mockResolvedValue(mockStoragePrices);
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Constructor', () => {
    it('should initialize with default cache TTL', () => {
      const manager = new PricingCacheManager();
      expect(manager).toBeDefined();
      expect(manager.isCacheValid()).toBe(true);
      expect(manager.getCacheStats().totalEntries).toBe(0);
    });

    it('should initialize with custom cache TTL', () => {
      const customTtl = 60000; // 1 minute
      const manager = new PricingCacheManager(customTtl);
      expect(manager).toBeDefined();
      
      // Manually set the timestamp to test TTL
      (manager as any).cache.cacheTimestamp = Date.now() - 30000; // 30 seconds ago
      expect(manager.isCacheValid()).toBe(true);
      
      // Now set it to be older than the TTL
      (manager as any).cache.cacheTimestamp = Date.now() - 70000; // 70 seconds ago
      expect(manager.isCacheValid()).toBe(false);
    });
  });

  describe('batchFetchPricing', () => {
    it('should fetch VM and storage prices in batches', async () => {
      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows']),
        storageRequirements: new Set(['eastus:premium-ssd', 'westus:standard-hdd']),
        uniqueRegions: new Set(['eastus', 'westus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd', 'standard-hdd'])
      };

      await cacheManager.batchFetchPricing(requirements);

      // Verify API calls
      expect(mockAzureClient.getVMPricesFromCalculator).toHaveBeenCalledTimes(2);
      expect(mockAzureClient.getVMPricesFromCalculator).toHaveBeenCalledWith('eastus', 'linux');
      expect(mockAzureClient.getVMPricesFromCalculator).toHaveBeenCalledWith('westus', 'windows');
      
      expect(mockAzureClient.getStoragePrices).toHaveBeenCalledTimes(2);
      expect(mockAzureClient.getStoragePrices).toHaveBeenCalledWith('eastus', 'premium-ssd');
      expect(mockAzureClient.getStoragePrices).toHaveBeenCalledWith('westus', 'standard-hdd');

      // Verify cache state
      expect(cacheManager.getVMPrices('eastus', 'linux')).toEqual(mockVMPrices);
      expect(cacheManager.getVMPrices('westus', 'windows')).toEqual(mockVMPrices);
      expect(cacheManager.getStoragePrices('eastus', 'premium-ssd')).toEqual(mockStoragePrices);
      expect(cacheManager.getStoragePrices('westus', 'standard-hdd')).toEqual(mockStoragePrices);

      // Verify cache stats
      const stats = cacheManager.getCacheStats();
      expect(stats.vmCacheSize).toBe(2);
      expect(stats.storageCacheSize).toBe(2);
      expect(stats.totalEntries).toBe(4);
      expect(stats.isValid).toBe(true);
    });

    it('should respect concurrency limits when fetching', async () => {
      // Create spy on the executeWithConcurrencyLimit method
      const concurrencySpy = jest.spyOn(cacheManager as any, 'executeWithConcurrencyLimit');
      
      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows', 'centralus:linux']),
        storageRequirements: new Set(['eastus:premium-ssd', 'westus:standard-hdd']),
        uniqueRegions: new Set(['eastus', 'westus', 'centralus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd', 'standard-hdd'])
      };

      await cacheManager.batchFetchPricing(requirements);

      // Should call executeWithConcurrencyLimit twice (once for VMs, once for storage)
      expect(concurrencySpy).toHaveBeenCalledTimes(2);
      
      // First call should be for VM prices with 3 promises and limit 2
      expect(concurrencySpy.mock.calls[0]?.[1]).toBe(2); // Limit is 2
      expect((concurrencySpy.mock.calls[0]?.[0] as any[])?.length).toBe(3); // 3 VM requirements

      // Second call should be for storage prices with 2 promises and limit 2
      expect(concurrencySpy.mock.calls[1]?.[1]).toBe(2); // Limit is 2
      expect((concurrencySpy.mock.calls[1]?.[0] as any[])?.length).toBe(2); // 2 storage requirements
    });

    it('should use Calculator API first, then fall back to Retail API', async () => {
      // Make the Calculator API fail for one region
      mockAzureClient.getVMPricesFromCalculator
        .mockResolvedValueOnce(mockVMPrices) // Success for eastus:linux
        .mockRejectedValueOnce(new Error('Calculator API unavailable')); // Fail for westus:windows

      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows']),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus', 'westus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      await cacheManager.batchFetchPricing(requirements);

      // Should call Calculator API for both regions
      expect(mockAzureClient.getVMPricesFromCalculator).toHaveBeenCalledTimes(2);
      
      // Should call Retail API only for the region where Calculator API failed
      expect(mockAzureClient.getVMPrices).toHaveBeenCalledTimes(1);
      expect(mockAzureClient.getVMPrices).toHaveBeenCalledWith('westus', 'windows');

      // Both should be cached
      expect(cacheManager.getVMPrices('eastus', 'linux')).toEqual(mockVMPrices);
      expect(cacheManager.getVMPrices('westus', 'windows')).toEqual(mockVMPrices);
    });

    it('should handle empty requirements gracefully', async () => {
      const emptyRequirements: PricingRequirements = {
        vmRequirements: new Set(),
        storageRequirements: new Set(),
        uniqueRegions: new Set(),
        uniqueOSTypes: new Set(),
        uniqueStorageTypes: new Set()
      };

      await cacheManager.batchFetchPricing(emptyRequirements);

      // Should not make any API calls
      expect(mockAzureClient.getVMPricesFromCalculator).not.toHaveBeenCalled();
      expect(mockAzureClient.getVMPrices).not.toHaveBeenCalled();
      expect(mockAzureClient.getStoragePrices).not.toHaveBeenCalled();

      // Cache should be empty
      const stats = cacheManager.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('Cache Operations', () => {
    it('should retrieve VM prices from cache', async () => {
      // Setup cache
      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux']),
        storageRequirements: new Set([]),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set(['linux']),
        uniqueStorageTypes: new Set([])
      };

      await cacheManager.batchFetchPricing(requirements);
      
      // Clear mock calls
      mockAzureClient.getVMPricesFromCalculator.mockClear();
      
      // Get from cache
      const cachedPrices = cacheManager.getVMPrices('eastus', 'linux');
      
      // Verify results
      expect(cachedPrices).toEqual(mockVMPrices);
      expect(mockAzureClient.getVMPricesFromCalculator).not.toHaveBeenCalled(); // Should not call API again
    });

    it('should retrieve storage prices from cache', async () => {
      // Setup cache
      const requirements: PricingRequirements = {
        vmRequirements: new Set([]),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set([]),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      await cacheManager.batchFetchPricing(requirements);
      
      // Clear mock calls
      mockAzureClient.getStoragePrices.mockClear();
      
      // Get from cache
      const cachedPrices = cacheManager.getStoragePrices('eastus', 'premium-ssd');
      
      // Verify results
      expect(cachedPrices).toEqual(mockStoragePrices);
      expect(mockAzureClient.getStoragePrices).not.toHaveBeenCalled(); // Should not call API again
    });

    it('should return null for non-existent cache entries', () => {
      // No cache setup
      
      // Try to get non-existent entries
      const vmPrices = cacheManager.getVMPrices('nonexistent', 'linux');
      const storagePrices = cacheManager.getStoragePrices('nonexistent', 'premium-ssd');
      
      // Verify results
      expect(vmPrices).toBeNull();
      expect(storagePrices).toBeNull();
    });

    it('should clear the cache', async () => {
      // Setup cache
      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux']),
        storageRequirements: new Set(['eastus:premium-ssd']),
        uniqueRegions: new Set(['eastus']),
        uniqueOSTypes: new Set(['linux']),
        uniqueStorageTypes: new Set(['premium-ssd'])
      };

      await cacheManager.batchFetchPricing(requirements);
      
      // Verify cache has entries
      expect(cacheManager.getCacheStats().totalEntries).toBe(2);
      
      // Clear cache
      cacheManager.clearCache();
      
      // Verify cache is empty
      expect(cacheManager.getCacheStats().totalEntries).toBe(0);
      expect(cacheManager.getVMPrices('eastus', 'linux')).toBeNull();
      expect(cacheManager.getStoragePrices('eastus', 'premium-ssd')).toBeNull();
    });

    it('should provide accurate cache statistics', async () => {
      // Setup cache with multiple entries
      const requirements: PricingRequirements = {
        vmRequirements: new Set(['eastus:linux', 'westus:windows']),
        storageRequirements: new Set(['eastus:premium-ssd', 'westus:standard-hdd', 'centralus:standard-ssd']),
        uniqueRegions: new Set(['eastus', 'westus', 'centralus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd', 'standard-hdd', 'standard-ssd'])
      };

      await cacheManager.batchFetchPricing(requirements);
      
      // Get stats
      const stats = cacheManager.getCacheStats();
      
      // Verify stats
      expect(stats.vmCacheSize).toBe(2);
      expect(stats.storageCacheSize).toBe(3);
      expect(stats.totalEntries).toBe(5);
      expect(stats.isValid).toBe(true);
      expect(stats.cacheAge).toBeGreaterThanOrEqual(0);
      expect(stats.cacheAge).toBeLessThan(5000); // Should be recent (less than 5 seconds)
    });
  });

  describe('Cache Validation', () => {
    it('should correctly identify valid cache', () => {
      const manager = new PricingCacheManager(60000); // 1 minute TTL
      expect(manager.isCacheValid()).toBe(true);
    });

    it('should correctly identify expired cache', () => {
      const manager = new PricingCacheManager(100); // 100ms TTL
      
      // Force cache timestamp to be old
      (manager as any).cache.cacheTimestamp = Date.now() - 200; // 200ms ago
      
      expect(manager.isCacheValid()).toBe(false);
    });

    it('should refresh cache timestamp when clearing', () => {
      const manager = new PricingCacheManager(100); // 100ms TTL
      
      // Force cache timestamp to be old
      (manager as any).cache.cacheTimestamp = Date.now() - 200; // 200ms ago
      expect(manager.isCacheValid()).toBe(false);
      
      // Clear cache should reset timestamp
      manager.clearCache();
      expect(manager.isCacheValid()).toBe(true);
    });
  });

  describe('Integration with Requirements', () => {
    it('should handle real-world pricing requirements', async () => {
      // Create a realistic set of requirements
      const requirements: PricingRequirements = {
        vmRequirements: new Set([
          'eastus:linux',   // Web servers
          'eastus:windows', // SQL servers
          'westus:linux',   // Backup servers
          'centralus:linux' // Development servers
        ]),
        storageRequirements: new Set([
          'eastus:premium-ssd',  // High-performance production storage
          'eastus:standard-ssd', // Medium-performance storage
          'westus:standard-hdd', // Backup storage
          'centralus:standard-ssd' // Development storage
        ]),
        uniqueRegions: new Set(['eastus', 'westus', 'centralus']),
        uniqueOSTypes: new Set(['linux', 'windows']),
        uniqueStorageTypes: new Set(['premium-ssd', 'standard-ssd', 'standard-hdd'])
      };

      // Mock different responses for different regions/types
      mockAzureClient.getVMPricesFromCalculator
        .mockImplementation((region, os) => {
          // Return different number of VMs based on region and OS
          const count = region === 'eastus' ? 10 : 5;
          const price = os === 'windows' ? 0.2 : 0.1;
          
          return Promise.resolve(Array(count).fill(0).map((_, i) => ({
            ...mockVMPrices[0],
            armRegionName: region,
            retailPrice: price + (i * 0.05),
            meterName: `Standard_D${i+2}s_v3`,
            skuName: `D${i+2}s v3`
          })));
        });

      mockAzureClient.getStoragePrices
        .mockImplementation((region, storageType) => {
          // Return different number of storage options based on type
          const count = storageType === 'premium-ssd' ? 5 : 3;
          const basePrice = 
            storageType === 'premium-ssd' ? 0.1 : 
            storageType === 'standard-ssd' ? 0.05 : 0.02;
          
          return Promise.resolve(Array(count).fill(0).map((_, i) => ({
            ...mockStoragePrices[0],
            armRegionName: region,
            retailPrice: basePrice + (i * 0.01),
            meterName: `${(storageType || 'standard-hdd').toUpperCase()} P${i+1}0`,
            skuName: `P${i+1}0`
          })));
        });

      // Fetch all pricing
      await cacheManager.batchFetchPricing(requirements);
      
      // Verify cache contents
      expect(cacheManager.getVMPrices('eastus', 'linux')).toHaveLength(10);
      expect(cacheManager.getVMPrices('eastus', 'windows')).toHaveLength(10);
      expect(cacheManager.getVMPrices('westus', 'linux')).toHaveLength(5);
      expect(cacheManager.getVMPrices('centralus', 'linux')).toHaveLength(5);
      
      expect(cacheManager.getStoragePrices('eastus', 'premium-ssd')).toHaveLength(5);
      expect(cacheManager.getStoragePrices('eastus', 'standard-ssd')).toHaveLength(3);
      expect(cacheManager.getStoragePrices('westus', 'standard-hdd')).toHaveLength(3);
      expect(cacheManager.getStoragePrices('centralus', 'standard-ssd')).toHaveLength(3);
      
      // Verify cache stats
      const stats = cacheManager.getCacheStats();
      expect(stats.vmCacheSize).toBe(4);
      expect(stats.storageCacheSize).toBe(4);
      expect(stats.totalEntries).toBe(8);
    });
  });
}); 