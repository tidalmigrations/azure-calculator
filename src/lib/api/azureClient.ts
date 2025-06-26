import { AzureRetailPrice, AzureApiResponse, CachedResponse, ApiError } from '@/types';
import { buildVMFilter, buildStorageFilter, PriceFilters, buildFilter } from './filters';

/**
 * Rate limiter with exponential backoff retry logic
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

  /**
   * Reset rate limiter (useful after extended delays)
   */
  reset(): void {
    this.requests = [];
  }
}

/**
 * Exponential backoff utility for handling retries
 */
class ExponentialBackoff {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly jitterFactor: number;

  constructor(maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000, jitterFactor = 0.1) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.jitterFactor = jitterFactor;
  }

  /**
   * Calculate delay for retry attempt with exponential backoff and jitter
   */
  calculateDelay(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    
    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.jitterFactor * Math.random();
    return cappedDelay + jitter;
  }

  /**
   * Execute function with exponential backoff retry logic
   */
  async execute<T>(fn: () => Promise<T>, shouldRetry: (error: any) => boolean = () => true): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry if we've exhausted attempts or if error shouldn't be retried
        if (attempt === this.maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        console.warn(`⏳ Retry attempt ${attempt + 1}/${this.maxRetries} after ${Math.round(delay)}ms delay. Error:`, 
          error instanceof Error ? error.message : String(error));
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

/**
 * Azure Retail Prices API Client
 * Handles API calls with caching, rate limiting, exponential backoff, and error handling
 */
export class AzureRetailPricesClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly cache = new Map<string, CachedResponse>();
  private readonly rateLimiter: RateLimiter;
  private readonly backoff: ExponentialBackoff;
  private readonly cacheTtl: number;

  constructor() {
    // Use our proxy API route instead of calling Azure directly to avoid CORS issues
    this.baseUrl = '/api/azure-prices';
    this.apiVersion = process.env.NEXT_PUBLIC_AZURE_API_VERSION || '2023-01-01-preview';
    this.cacheTtl = parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '3600000'); // 1 hour default
    
    // More conservative rate limiting to avoid API issues
    const maxRequests = parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT_REQUESTS || '3'); // Reduced from 5 to 3
    const windowMs = parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT_WINDOW || '60000');
    this.rateLimiter = new RateLimiter(maxRequests, windowMs);
    
    // Configure exponential backoff for retries
    this.backoff = new ExponentialBackoff(
      3,    // maxRetries
      2000, // baseDelayMs - start with 2 seconds
      60000, // maxDelayMs - cap at 60 seconds
      0.2   // jitterFactor - 20% jitter
    );
  }

  /**
   * Fetch prices with pagination support, rate limiting, and retry logic
   */
  async fetchPrices(filter: string): Promise<AzureRetailPrice[]> {
    const cacheKey = `prices:${filter}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if valid
    if (cached && cached.expiry > Date.now()) {
      console.log(`📦 Using cached data for filter: ${filter.substring(0, 100)}...`);
      return cached.data;
    }

    // Execute with exponential backoff retry logic
    return this.backoff.execute(async () => {
      return this.fetchPricesInternal(filter, cacheKey);
    }, (error) => {
      // Retry on rate limit errors, network errors, and server errors
      if (error instanceof ApiError) {
        return error.status === 429 || error.status >= 500;
      }
      // Retry on network errors
      return error instanceof TypeError && error.message.includes('fetch');
    });
  }

  /**
   * Internal fetch implementation with rate limiting
   */
  private async fetchPricesInternal(filter: string, cacheKey: string): Promise<AzureRetailPrice[]> {
    // Check rate limit before making request
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
        
        console.log(`🌐 Making API request: ${url.substring(0, 150)}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
          // Handle specific HTTP status codes
          if (response.status === 429) {
            // Extract retry-after header if available
            const retryAfter = response.headers.get('retry-after');
            const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : this.rateLimiter.getRetryAfter();
            
            throw new ApiError(
              `Azure API rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`,
              429,
              'RATE_LIMIT_EXCEEDED',
              { retryAfter: retryAfterMs, url, filter }
            );
          }
          
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
        
        // Progressive delay between requests based on request count
        if (nextPageLink) {
          const delay = Math.min(500 + (requestCount * 200), 2000); // 500ms to 2s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } while (nextPageLink);

      // Cache the results
      this.cache.set(cacheKey, {
        data: prices,
        expiry: Date.now() + this.cacheTtl
      });
      
      console.log(`✅ Successfully fetched ${prices.length} prices with ${requestCount} API calls`);
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
   * Convert normalized region to Calculator API format (with dashes)
   */
  private convertToCalculatorRegion(normalizedRegion: string): string {
    const regionMap: Record<string, string> = {
      'canadacentral': 'canada-central',
      'canadaeast': 'canada-east',
      'eastus': 'east-us',
      'eastus2': 'east-us-2',
      'westus': 'west-us',
      'westus2': 'west-us-2',
      'westus3': 'west-us-3',
      'centralus': 'central-us',
      'northcentralus': 'north-central-us',
      'southcentralus': 'south-central-us',
      'westcentralus': 'west-central-us',
      'brazilsouth': 'brazil-south',
      'northeurope': 'north-europe',
      'westeurope': 'west-europe',
      'uksouth': 'uk-south',
      'ukwest': 'uk-west',
      'francecentral': 'france-central',
      'francesouth': 'france-south',
      'germanywestcentral': 'germany-west-central',
      'norwayeast': 'norway-east',
      'switzerlandnorth': 'switzerland-north',
      'swedencentral': 'sweden-central',
      'eastasia': 'east-asia',
      'southeastasia': 'southeast-asia',
      'japaneast': 'japan-east',
      'japanwest': 'japan-west',
      'koreacentral': 'korea-central',
      'koreasouth': 'korea-south',
      'australiaeast': 'australia-east',
      'australiasoutheast': 'australia-southeast',
      'southafricanorth': 'south-africa-north',
      'southindia': 'south-india',
      'centralindia': 'central-india',
      'westindia': 'west-india'
    };
    
    return regionMap[normalizedRegion] || normalizedRegion;
  }

  /**
   * Get VM prices for a specific region and OS using the Pricing Calculator API
   * This API has more up-to-date VM pricing data than the Retail Prices API
   */
  async getVMPricesFromCalculator(region: string, os: 'windows' | 'linux'): Promise<AzureRetailPrice[]> {
    const cacheKey = `calc-vm-prices:${region}:${os}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if valid
    if (cached && cached.expiry > Date.now()) {
      console.log(`📦 Using cached VM data for ${os} in ${region}`);
      return cached.data;
    }

    // Execute with exponential backoff retry logic
    return this.backoff.execute(async () => {
      return this.getVMPricesFromCalculatorInternal(region, os, cacheKey);
    }, (error) => {
      // Retry on rate limit errors, network errors, and server errors
      if (error instanceof ApiError) {
        return error.status === 429 || error.status >= 500;
      }
      // Retry on network errors
      return error instanceof TypeError && error.message.includes('fetch');
    });
  }

  /**
   * Internal VM prices fetch implementation with rate limiting
   */
  private async getVMPricesFromCalculatorInternal(region: string, os: 'windows' | 'linux', cacheKey: string): Promise<AzureRetailPrice[]> {
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

    try {
      const calculatorRegion = this.convertToCalculatorRegion(region);
      console.log(`🔍 VM DEBUG - Region conversion: '${region}' -> '${calculatorRegion}'`);
      const url = `/api/azure-calculator-prices?region=${calculatorRegion}`;
      
      console.log(`🌐 Making VM Calculator API request: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : this.rateLimiter.getRetryAfter();
          
          throw new ApiError(
            `VM Calculator API rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`,
            429,
            'RATE_LIMIT_EXCEEDED',
            { retryAfter: retryAfterMs, url, region, calculatorRegion }
          );
        }
        
        throw new ApiError(
          `Calculator API Error: ${response.statusText}`,
          response.status,
          'CALCULATOR_API_ERROR',
          { url, region, calculatorRegion }
        );
      }
      
      const data = await response.json();
      const prices: AzureRetailPrice[] = [];
      
      if (data.offers) {
        console.log(`🔍 API SOURCE - Processing ${Object.keys(data.offers).length} VM offers for ${os} in ${region}`);
        
        let osMatchCount = 0;
        let totalOffers = 0;
        
        // Debug: Show first few offers structure
        const sampleOffers = Object.entries(data.offers).slice(0, 3);
        console.log('🔍 VM DEBUG - Sample offer structure:', sampleOffers.map(([key, offer]: [string, any]) => {
          const keyParts = key.split('-');
          const extractedOS = keyParts[0];
          const vmName = keyParts.slice(1, -1).join('-');
          return {
            key,
            extractedOS,
            vmName,
            cores: offer.cores,
            ram: offer.ram,
            hasPrice: !!offer.prices?.perhour?.[calculatorRegion]
          };
        }));
        
        // Process each offer
        Object.entries(data.offers).forEach(([key, offer]: [string, any]) => {
          totalOffers++;
          
          // Extract OS from the key (e.g., "linux-f4sv2-standard" -> "linux")
          const keyParts = key.split('-');
          const offerOS = keyParts[0]; // First part is the OS
          
          if (offerOS && offerOS.toLowerCase() === os.toLowerCase()) {
            osMatchCount++;
            
            // Extract VM name from key (e.g., "linux-f4sv2-standard" -> "f4sv2")
            const vmNameFromKey = keyParts.slice(1, -1).join('-'); // Remove OS and "standard"
            
            // Convert VM name to standard format
            const standardName = this.convertToStandardVMName(vmNameFromKey);
            
            if (offer.prices?.perhour?.[calculatorRegion]) {
              prices.push({
                currencyCode: 'USD',
                tierMinimumUnits: 0,
                retailPrice: offer.prices.perhour[calculatorRegion].value,
                unitPrice: offer.prices.perhour[calculatorRegion].value,
                armRegionName: region,
                location: region,
                effectiveStartDate: new Date().toISOString(),
                meterId: key,
                meterName: standardName,
                productId: key,
                skuId: key,
                productName: `Virtual Machines ${standardName} Series ${os}`,
                skuName: standardName,
                serviceName: 'Virtual Machines',
                serviceId: 'DZH318Z0BQ5P',
                serviceFamily: 'Compute',
                unitOfMeasure: '1 Hour',
                type: 'Consumption',
                isPrimaryMeterRegion: true,
                armSkuName: standardName
              });
            }
          }
        });
        
        console.log(`🔍 VM DEBUG - OS matching: ${osMatchCount}/${totalOffers} offers matched OS '${os}'`);
        console.log(`🔍 API SOURCE - Successfully processed ${prices.length} ${os} VMs from ${osMatchCount} matching offers`);
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: prices,
        expiry: Date.now() + this.cacheTtl
      });
      
      console.log(`✅ Server Selection - Found ${prices.length} ${os} VMs from Calculator API`);
      return prices;
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        `Failed to fetch VM prices from Calculator API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'CALCULATOR_FETCH_ERROR',
        { region, os, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Convert calculator API VM names to standard Azure VM names
   * e.g., "d4sv6" -> "Standard_D4s_v6"
   */
  private convertToStandardVMName(vmName: string): string {
    // Handle various patterns
    const patterns = [
      // Standard D-series patterns
      { regex: /^d(\d+)sv(\d+)$/, replacement: 'Standard_D$1s_v$2' },
      { regex: /^d(\d+)dsv(\d+)$/, replacement: 'Standard_D$1ds_v$2' },
      { regex: /^d(\d+)asv(\d+)$/, replacement: 'Standard_D$1as_v$2' },
      { regex: /^d(\d+)adsv(\d+)$/, replacement: 'Standard_D$1ads_v$2' },
      { regex: /^d(\d+)alsv(\d+)$/, replacement: 'Standard_D$1als_v$2' },
      { regex: /^d(\d+)aldsv(\d+)$/, replacement: 'Standard_D$1alds_v$2' },
      { regex: /^d(\d+)psv(\d+)$/, replacement: 'Standard_D$1ps_v$2' },
      { regex: /^d(\d+)pdsv(\d+)$/, replacement: 'Standard_D$1pds_v$2' },
      { regex: /^d(\d+)plsv(\d+)$/, replacement: 'Standard_D$1pls_v$2' },
      { regex: /^d(\d+)pldsv(\d+)$/, replacement: 'Standard_D$1plds_v$2' },
      { regex: /^d(\d+)lsv(\d+)$/, replacement: 'Standard_D$1ls_v$2' },
      { regex: /^d(\d+)ldsv(\d+)$/, replacement: 'Standard_D$1lds_v$2' },
      
      // E-series patterns
      { regex: /^e(\d+)sv(\d+)$/, replacement: 'Standard_E$1s_v$2' },
      { regex: /^e(\d+)dsv(\d+)$/, replacement: 'Standard_E$1ds_v$2' },
      { regex: /^e(\d+)asv(\d+)$/, replacement: 'Standard_E$1as_v$2' },
      { regex: /^e(\d+)adsv(\d+)$/, replacement: 'Standard_E$1ads_v$2' },
      { regex: /^e(\d+)psv(\d+)$/, replacement: 'Standard_E$1ps_v$2' },
      { regex: /^e(\d+)pdsv(\d+)$/, replacement: 'Standard_E$1pds_v$2' },
      
      // F-series patterns
      { regex: /^f(\d+)sv(\d+)$/, replacement: 'Standard_F$1s_v$2' },
      { regex: /^f(\d+)asv(\d+)$/, replacement: 'Standard_F$1as_v$2' },
      { regex: /^f(\d+)alsv(\d+)$/, replacement: 'Standard_F$1als_v$2' },
      { regex: /^f(\d+)amsv(\d+)$/, replacement: 'Standard_F$1ams_v$2' },
      
      // Special patterns with complex naming
      { regex: /^e(\d+)-(\d+)sv(\d+)$/, replacement: 'Standard_E$1-$2s_v$3' },
      { regex: /^e(\d+)-(\d+)dsv(\d+)$/, replacement: 'Standard_E$1-$2ds_v$3' },
      { regex: /^e(\d+)idsv(\d+)$/, replacement: 'Standard_E$1ids_v$2' },
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(vmName)) {
        return vmName.replace(pattern.regex, pattern.replacement);
      }
    }
    
    // Fallback: capitalize first letter and add Standard_ prefix
    return `Standard_${vmName.charAt(0).toUpperCase()}${vmName.slice(1)}`;
  }

  /**
   * Get VM prices for a specific region and OS (fallback to retail API)
   */
  async getVMPrices(region: string, os: 'windows' | 'linux', skuName?: string): Promise<AzureRetailPrice[]> {
    const filter = buildVMFilter(region, os, skuName);
    console.log(`🔍 Server Selection - Azure API filter: ${filter}`);
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

  /**
   * Reset rate limiter (useful for recovery from rate limiting)
   */
  resetRateLimit(): void {
    this.rateLimiter.reset();
    console.log('🔄 Rate limiter reset - ready for new requests');
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { canMakeRequest: boolean; retryAfterMs: number } {
    return {
      canMakeRequest: this.rateLimiter.canMakeRequest(),
      retryAfterMs: this.rateLimiter.getRetryAfter()
    };
  }
}

// Export a singleton instance
export const azureClient = new AzureRetailPricesClient(); 