import { AzureRetailPricesClient } from '../azureClient';
import { ApiError } from '@/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('AzureRetailPricesClient', () => {
  let client: AzureRetailPricesClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new AzureRetailPricesClient();
    mockFetch.mockReset();
    client.clearCache(); // Clear cache between tests
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPrices', () => {
    const mockApiResponse = {
      Items: [
        {
          currencyCode: 'USD',
          tierMinimumUnits: 0,
          retailPrice: 0.0464,
          unitPrice: 0.0464,
          armRegionName: 'eastus',
          location: 'US East',
          effectiveStartDate: '2023-01-01T00:00:00Z',
          meterId: 'test-meter-id',
          meterName: 'D2s v3',
          productId: 'test-product-id',
          skuId: 'test-sku-id',
          productName: 'Virtual Machines Dsv3 Series',
          skuName: 'D2s v3',
          serviceName: 'Virtual Machines',
          serviceId: 'test-service-id',
          serviceFamily: 'Compute',
          unitOfMeasure: '1 Hour',
          type: 'Consumption',
          isPrimaryMeterRegion: true,
          armSkuName: 'Standard_D2s_v3'
        }
      ],
      Count: 1
    };

    it('should fetch prices successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await client.fetchPrices("serviceName eq 'Virtual Machines'");

      expect(result).toEqual(mockApiResponse.Items);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle pagination', async () => {
      const firstPageResponse = {
        Items: [mockApiResponse.Items[0]],
        NextPageLink: 'https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=serviceName%20eq%20%27Virtual%20Machines%27&$skip=100',
        Count: 1
      };

      const secondPageResponse = {
        Items: [{ ...mockApiResponse.Items[0], meterId: 'second-meter' }],
        Count: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => firstPageResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => secondPageResponse,
        } as Response);

      const result = await client.fetchPrices("serviceName eq 'Virtual Machines'");

      expect(result).toHaveLength(2);
      expect(result[0].meterId).toBe('test-meter-id');
      expect(result[1].meterId).toBe('second-meter');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use cache for repeated requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const filter = "serviceName eq 'Virtual Machines'";
      
      // First request
      const result1 = await client.fetchPrices(filter);
      // Second request (should use cache)
      const result2 = await client.fetchPrices(filter);

      expect(result1).toEqual(result2);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should throw ApiError on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(client.fetchPrices("invalid filter"))
        .rejects
        .toThrow(ApiError);
    });

    it('should throw ApiError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.fetchPrices("serviceName eq 'Virtual Machines'"))
        .rejects
        .toThrow(ApiError);
    }, 20000); // Increase timeout to 20 seconds to account for exponential backoff retries
  });

  describe('getVMPrices', () => {
    it('should build correct filter for Windows VMs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      await client.getVMPrices('eastus', 'windows');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/azure-prices');
      expect(calledUrl).toContain('filter=');
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("contains(tolower(productName), 'windows')");
    });

    it('should build correct filter for Linux VMs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      await client.getVMPrices('eastus', 'linux');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/azure-prices');
      expect(calledUrl).toContain('filter=');
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("contains(tolower(productName), 'linux')");
    });

    it('should include SKU filter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      await client.getVMPrices('eastus', 'linux', 'Standard_D2s_v3');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/azure-prices');
      expect(calledUrl).toContain('filter=');
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("contains(tolower(armSkuName), 'standard_d2s_v3')");
    });
  });

  describe('getStoragePrices', () => {
    it('should build correct filter for standard HDD', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      await client.getStoragePrices('eastus', 'standard-hdd');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/azure-prices');
      expect(calledUrl).toContain('filter=');
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("contains(tolower(productName), 'standard hdd')");
    });

    it('should build correct filter for premium SSD', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      await client.getStoragePrices('eastus', 'premium-ssd');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/azure-prices');
      expect(calledUrl).toContain('filter=');
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("contains(tolower(productName), 'premium ssd')");
    });
  });

  describe('searchPrices', () => {
    it('should build filter from multiple criteria', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      await client.searchPrices({
        serviceName: 'Virtual Machines',
        region: 'eastus',
        priceType: 'Consumption'
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/azure-prices');
      expect(calledUrl).toContain('filter=');
      const decodedUrl = decodeURIComponent(calledUrl);
      expect(decodedUrl).toContain("serviceName eq 'Virtual Machines'");
      expect(decodedUrl).toContain("armRegionName eq 'eastus'");
      expect(decodedUrl).toContain("priceType eq 'Consumption'");
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      const filter = "serviceName eq 'Virtual Machines'";
      
      // Make request to populate cache
      await client.fetchPrices(filter);
      expect(client.getCacheStats().size).toBe(1);
      
      // Clear cache
      client.clearCache();
      expect(client.getCacheStats().size).toBe(0);
      
      // Next request should hit API again
      await client.fetchPrices(filter);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return cache statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ Items: [], Count: 0 }),
      } as Response);

      await client.fetchPrices("serviceName eq 'Virtual Machines'");
      await client.fetchPrices("serviceName eq 'Storage'");

      const stats = client.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
    });
  });
}); 