import { AzureRetailPrice, AzureApiResponse, CachedResponse, ApiError } from '@/types';
import { buildVMFilter, buildStorageFilter, PriceFilters, buildFilter } from './filters';

/**
 * Rate limiter to prevent API abuse
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getRetryAfter(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
}

/**
 * Azure Retail Prices API Client
 * Handles API calls with caching, rate limiting, and error handling
 */
export class AzureRetailPricesClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly cache = new Map<string, CachedResponse>();
  private readonly rateLimiter: RateLimiter;
  private readonly cacheTtl: number;

  constructor() {
    // Use our proxy API route instead of calling Azure directly to avoid CORS issues
    this.baseUrl = '/api/azure-prices';
    this.apiVersion = process.env.NEXT_PUBLIC_AZURE_API_VERSION || '2023-01-01-preview';
    this.cacheTtl = parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '3600000'); // 1 hour default
    
    const maxRequests = parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT_REQUESTS || '10');
    const windowMs = parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT_WINDOW || '60000');
    this.rateLimiter = new RateLimiter(maxRequests, windowMs);
  }

  /**
   * Fetch prices with pagination support
   */
  async fetchPrices(filter: string): Promise<AzureRetailPrice[]> {
    const cacheKey = `prices:${filter}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if valid
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Check rate limit
    if (!this.rateLimiter.canMakeRequest()) {
      const retryAfter = this.rateLimiter.getRetryAfter();
      throw new ApiError(
        `Rate limit exceeded. Retry after ${Math.ceil(retryAfter / 1000)} seconds.`,
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfter }
      );
    }

    const prices: AzureRetailPrice[] = [];
    let nextPageLink: string | null = null;
    let requestCount = 0;
    const maxPages = 10; // Prevent infinite loops

    try {
      do {
        if (requestCount >= maxPages) {
          console.warn(`Reached maximum page limit (${maxPages}) for filter: ${filter}`);
          break;
        }

        let url: string;
        if (nextPageLink) {
          // For pagination, extract the filter from the NextPageLink URL
          const nextUrl = new URL(nextPageLink);
          const nextFilter = nextUrl.searchParams.get('$filter');
          const skip = nextUrl.searchParams.get('$skip');
          url = `${this.baseUrl}?filter=${encodeURIComponent(nextFilter || filter)}${skip ? `&skip=${skip}` : ''}`;
        } else {
          url = `${this.baseUrl}?filter=${encodeURIComponent(filter)}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new ApiError(
            `Azure API Error: ${response.statusText}`,
            response.status,
            'API_ERROR',
            { url, filter }
          );
        }
        
        const data: AzureApiResponse = await response.json();
        prices.push(...data.Items);
        nextPageLink = data.NextPageLink || null;
        requestCount++;
        
        // Small delay between requests to be respectful
        if (nextPageLink) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } while (nextPageLink);

      // Cache the results
      this.cache.set(cacheKey, {
        data: prices,
        expiry: Date.now() + this.cacheTtl
      });
      
      return prices;
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        `Failed to fetch Azure prices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'FETCH_ERROR',
        { filter, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get VM prices for a specific region and OS
   */
  async getVMPrices(region: string, os: 'windows' | 'linux', skuName?: string): Promise<AzureRetailPrice[]> {
    const filter = buildVMFilter(region, os, skuName);
    return this.fetchPrices(filter);
  }

  /**
   * Get storage prices for a specific region and storage type
   */
  async getStoragePrices(region: string, storageType: 'standard-hdd' | 'standard-ssd' | 'premium-ssd' = 'standard-hdd'): Promise<AzureRetailPrice[]> {
    const filter = buildStorageFilter(region, storageType);
    return this.fetchPrices(filter);
  }

  /**
   * Search prices with custom filters
   */
  async searchPrices(filters: PriceFilters): Promise<AzureRetailPrice[]> {
    const filter = buildFilter(filters);
    return this.fetchPrices(filter);
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export a singleton instance
export const azureClient = new AzureRetailPricesClient(); 