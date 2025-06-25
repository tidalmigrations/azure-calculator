import { azureClient } from '@/lib/api';
import { AzureRetailPrice } from '@/types';
import { normalizeRegion } from '@/utils/helpers';
import { 
  StorageCalculationInput, 
  StorageCalculationResult, 
  PricingCalculator, 
  CostItem,
  DEFAULT_STORAGE_TYPES
} from './types';

/**
 * Storage Pricing Calculator
 * Calculates Azure Storage costs using real Azure Retail Prices API data
 */
export class StorageCalculator implements PricingCalculator {
  name = 'Azure Storage';
  requiredFields = ['region', 'storageCapacity'];

  /**
   * Calculate storage costs for a spreadsheet row
   */
  async calculate(data: any): Promise<CostItem> {
    const input = this.parseInput(data);
    const result = await this.calculateStorageCost(input);
    
    return {
      serviceName: this.name,
      cost: result.cost,
      details: result.details
    };
  }

  /**
   * Calculate storage cost with Azure API data
   */
  async calculateStorageCost(input: StorageCalculationInput): Promise<StorageCalculationResult> {
    console.log('💾 STORAGE DEBUG - Starting calculation with input:', {
      region: input.region,
      storageCapacity: input.storageCapacity,
      storageType: input.storageType
    });

    try {
      // Normalize region name
      const normalizedRegion = normalizeRegion(input.region);
      console.log('💾 STORAGE DEBUG - Normalized region:', normalizedRegion);
      
      // Get storage prices from Azure API
      const storageType = input.storageType || 'premium-ssd';
      console.log('💾 STORAGE DEBUG - Using storage type:', storageType);
      
      const storagePrices = await azureClient.getStoragePrices(normalizedRegion, storageType);
      console.log('💾 STORAGE DEBUG - API returned', storagePrices.length, 'storage prices');
      
      if (storagePrices.length === 0) {
        console.warn(`💾 STORAGE DEBUG - No storage prices found for ${storageType} in ${normalizedRegion}, using fallback pricing`);
        return this.getFallbackStoragePricing(input);
      }

      // Log first few storage options for debugging
      console.log('💾 STORAGE DEBUG - Sample storage prices:', storagePrices.slice(0, 3).map(price => ({
        meterName: price.meterName,
        productName: price.productName,
        unitPrice: price.unitPrice,
        unitOfMeasure: price.unitOfMeasure
      })));

      // Find the best storage option
      const selectedStorage = this.selectBestStorage(storagePrices);
      
      if (!selectedStorage) {
        console.warn(`💾 STORAGE DEBUG - No suitable storage found for requirements, using fallback pricing`);
        return this.getFallbackStoragePricing(input);
      }

      console.log('💾 STORAGE DEBUG - Selected storage:', {
        meterName: selectedStorage.meterName,
        productName: selectedStorage.productName,
        unitPrice: selectedStorage.unitPrice,
        unitOfMeasure: selectedStorage.unitOfMeasure
      });

      // Calculate total cost (convert to monthly if needed)
      const monthlyRatePerGB = this.extractMonthlyRate(selectedStorage);
      console.log('💾 STORAGE DEBUG - Monthly rate per GB:', monthlyRatePerGB);
      
      const totalCost = monthlyRatePerGB * input.storageCapacity;
      console.log('💾 STORAGE DEBUG - Total cost calculation:', {
        monthlyRatePerGB,
        capacityGB: input.storageCapacity,
        totalCost
      });

      const result = {
        cost: totalCost,
        details: {
          storageType: this.getStorageTypeName(selectedStorage),
          monthlyRatePerGB,
          hourlyRatePerGB: selectedStorage.unitPrice,
          capacityGB: input.storageCapacity,
          region: normalizedRegion,
          productName: selectedStorage.productName,
          currency: selectedStorage.currencyCode
        }
      };

      console.log('💾 STORAGE DEBUG - Final result:', {
        cost: result.cost,
        monthlyRatePerGB: result.details.monthlyRatePerGB,
        monthlyRateFormattedAsCurrency: `$${result.details.monthlyRatePerGB.toFixed(2)}`,
        monthlyRateFormatted6Decimals: `$${result.details.monthlyRatePerGB.toFixed(6)}`,
        capacityGB: result.details.capacityGB,
        storageType: result.details.storageType,
        productName: result.details.productName
      });

      return result;

    } catch (error) {
      console.warn('💾 STORAGE DEBUG - Storage calculation error, using fallback pricing:', error);
      
      // Check if it's a rate limit error and provide specific messaging
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        console.warn('💾 STORAGE DEBUG - Rate limit exceeded, using fallback pricing for storage calculation');
      }
      
      // Always fallback to estimated pricing instead of throwing
      return this.getFallbackStoragePricing(input);
    }
  }

  /**
   * Parse input data from spreadsheet row
   */
  private parseInput(data: any): StorageCalculationInput {
    // Extract and validate region
    const region = data.region || data.location || 'eastus';
    
    // Parse storage capacity from various field names
    const storageCapacity = this.parseStorageCapacity(
      data.storageCapacity || 
      data.storage || 
      data['Storage Allocated (GB)'] ||
      data.diskSize ||
      data.capacity ||
      100 // default 100GB
    );
    
    // Extract storage type if specified
    const storageType = this.parseStorageType(
      data.storageType || 
      data.diskType || 
      data.tier
    );

    console.log('💾 STORAGE DEBUG - Parsed input:', {
      region: String(region).trim(),
      storageCapacity,
      storageType,
      rawStorageTypeFields: {
        storageType: data.storageType,
        diskType: data.diskType,
        tier: data.tier
      }
    });

    return {
      region: String(region).trim(),
      storageCapacity,
      storageType
    };
  }

  /**
   * Parse storage capacity from various formats
   */
  private parseStorageCapacity(capacityInput: any): number {
    if (typeof capacityInput === 'number') {
      return Math.max(1, capacityInput);
    }
    
    const capacityStr = String(capacityInput).toLowerCase();
    
    // Handle different units (GB, TB, etc.)
    let multiplier = 1;
    if (capacityStr.includes('tb') || capacityStr.includes('terabyte')) {
      multiplier = 1024;
    } else if (capacityStr.includes('mb') || capacityStr.includes('megabyte')) {
      multiplier = 1/1024;
    }
    
    const parsed = parseFloat(capacityStr.replace(/[^\d.]/g, ''));
    const result = isNaN(parsed) ? 100 : Math.max(1, parsed * multiplier);
    
    return Math.round(result);
  }

  /**
   * Parse storage type from input
   */
  private parseStorageType(typeInput: any): 'standard-hdd' | 'standard-ssd' | 'premium-ssd' | undefined {
    if (!typeInput) return undefined;
    
    const typeStr = String(typeInput).toLowerCase();
    
    if (typeStr.includes('premium') || typeStr.includes('fast')) {
      return 'premium-ssd';
    } else if (typeStr.includes('ssd') || typeStr.includes('solid')) {
      return 'standard-ssd';
    } else if (typeStr.includes('hdd') || typeStr.includes('standard') || typeStr.includes('slow')) {
      return 'standard-hdd';
    }
    
    return undefined; // Let the calculator choose the best option
  }

  /**
   * Select the best storage option from available prices
   */
  private selectBestStorage(storagePrices: AzureRetailPrice[]): AzureRetailPrice | null {
    if (storagePrices.length === 0) return null;

    console.log('💾 STORAGE DEBUG - selectBestStorage input:', storagePrices.length, 'prices');

    // Priority 1: Premium SSD v2 (best performance and granular pricing)
    const premiumSSDv2 = storagePrices.filter(storage => 
      storage.productName.toLowerCase().includes('premium ssd v2') &&
      storage.unitOfMeasure.toLowerCase().includes('gib')
    );

    console.log('💾 STORAGE DEBUG - Premium SSD v2 found:', premiumSSDv2.length);
    if (premiumSSDv2.length > 0) {
      console.log('💾 STORAGE DEBUG - Premium SSD v2 options:', premiumSSDv2.map(disk => ({
        meterName: disk.meterName,
        productName: disk.productName,
        unitPrice: disk.unitPrice,
        unitOfMeasure: disk.unitOfMeasure
      })));

      // Select the capacity-based pricing (not IOPS or throughput)
      const capacityPricing = premiumSSDv2.filter(storage => 
        storage.meterName.toLowerCase().includes('capacity') ||
        storage.meterName.toLowerCase().includes('provisioned capacity')
      );

      if (capacityPricing.length > 0) {
        const selected = capacityPricing[0]; // Should be consistent pricing
        console.log('💾 STORAGE DEBUG - Selected Premium SSD v2:', {
          meterName: selected.meterName,
          productName: selected.productName,
          unitPrice: selected.unitPrice,
          unitOfMeasure: selected.unitOfMeasure
        });
        return selected;
      }
    }

    // Priority 2: Filter for managed disks (traditional premium/standard disks)
    const managedDisks = storagePrices.filter(storage => 
      storage.productName.toLowerCase().includes('managed disk') ||
      storage.meterName.toLowerCase().includes('disk')
    );

    console.log('💾 STORAGE DEBUG - Managed disks found:', managedDisks.length);
    if (managedDisks.length > 0) {
      console.log('💾 STORAGE DEBUG - Managed disk options:', managedDisks.map(disk => ({
        meterName: disk.meterName,
        productName: disk.productName,
        unitPrice: disk.unitPrice,
        unitOfMeasure: disk.unitOfMeasure
      })));

      // Sort by price (ascending) and return the most cost-effective
      const sorted = managedDisks.sort((a, b) => a.unitPrice - b.unitPrice);
      const selected = sorted[0];
      console.log('💾 STORAGE DEBUG - Selected managed disk:', {
        meterName: selected.meterName,
        productName: selected.productName,
        unitPrice: selected.unitPrice,
        unitOfMeasure: selected.unitOfMeasure
      });
      return selected;
    }

    // Priority 3: Fallback - return the cheapest available storage
    console.log('💾 STORAGE DEBUG - No managed disks found, using cheapest available storage');
    const sorted = storagePrices.sort((a, b) => a.unitPrice - b.unitPrice);
    const selected = sorted[0];
    console.log('💾 STORAGE DEBUG - Selected fallback storage:', {
      meterName: selected.meterName,
      productName: selected.productName,
      unitPrice: selected.unitPrice,
      unitOfMeasure: selected.unitOfMeasure
    });
    return selected;
  }

  /**
   * Extract monthly rate per GB from Azure pricing data
   */
  private extractMonthlyRate(storagePrice: AzureRetailPrice): number {
    // Azure storage pricing is typically per GB per month
    let rate = storagePrice.unitPrice;
    
    console.log('💾 STORAGE DEBUG - extractMonthlyRate input:', {
      originalRate: rate,
      unitOfMeasure: storagePrice.unitOfMeasure
    });
    
    // Handle different units of measure
    const unit = storagePrice.unitOfMeasure.toLowerCase();
    
    if (unit.includes('hour')) {
      // Convert hourly to monthly (730 hours per month average)
      rate = rate * 730;
      console.log('💾 STORAGE DEBUG - Converted hourly to monthly:', {
        originalRate: storagePrice.unitPrice,
        multiplier: 730,
        finalRate: rate
      });
    } else if (unit.includes('day')) {
      // Convert daily to monthly (30.44 days per month average)
      rate = rate * 30.44;
      console.log('💾 STORAGE DEBUG - Converted daily to monthly:', {
        originalRate: storagePrice.unitPrice,
        multiplier: 30.44,
        finalRate: rate
      });
    } else {
      console.log('💾 STORAGE DEBUG - Using rate as-is (already monthly or per GB):', rate);
    }
    // If it's already monthly or per GB, use as-is
    
    return rate;
  }

  /**
   * Get human-readable storage type name
   */
  private getStorageTypeName(storagePrice: AzureRetailPrice): string {
    const productName = storagePrice.productName.toLowerCase();
    
    if (productName.includes('premium ssd v2')) {
      return 'Premium SSD v2';
    } else if (productName.includes('premium')) {
      return 'Premium SSD';
    } else if (productName.includes('standard') && productName.includes('ssd')) {
      return 'Standard SSD';
    } else if (productName.includes('standard')) {
      return 'Standard HDD';
    }
    
    return storagePrice.productName;
  }

  /**
   * Fallback pricing when API is unavailable
   */
  private getFallbackStoragePricing(input: StorageCalculationInput): StorageCalculationResult {
    console.log('💾 STORAGE DEBUG - Using fallback pricing for input:', input);
    
    // Estimated pricing based on common storage types (as of 2024, per GB per month)
    // Premium SSD v2: $0.000121/GiB/hour * 730 hours = $0.088/GB/month
    const fallbackRates = {
      'standard-hdd': 0.045,
      'standard-ssd': 0.075,
      'premium-ssd': 0.088  // Updated to Premium SSD v2 rate (0.000121 * 730)
    };

    const storageType = input.storageType || 'standard-hdd';
    const monthlyRatePerGB = fallbackRates[storageType];
    const totalCost = monthlyRatePerGB * input.storageCapacity;

    console.log('💾 STORAGE DEBUG - Fallback calculation:', {
      storageType,
      monthlyRatePerGB,
      capacityGB: input.storageCapacity,
      totalCost,
      allFallbackRates: fallbackRates,
      note: 'Premium SSD rate updated to Premium SSD v2 equivalent'
    });

    return {
      cost: totalCost,
      details: {
        storageType: this.getStorageTypeDisplayName(storageType),
        monthlyRatePerGB,
        hourlyRatePerGB: monthlyRatePerGB / 730, // Convert monthly back to hourly for display
        capacityGB: input.storageCapacity,
        region: input.region,
        productName: `${this.getStorageTypeDisplayName(storageType)} Managed Disks (estimated)`,
        currency: 'USD' // Assuming a default currency code
      }
    };
  }

  /**
   * Get display name for storage type
   */
  private getStorageTypeDisplayName(storageType: string): string {
    const displayNames = {
      'standard-hdd': 'Standard HDD',
      'standard-ssd': 'Standard SSD',
      'premium-ssd': 'Premium SSD v2'  // Updated to reflect v2 as the default premium option
    };
    
    return displayNames[storageType as keyof typeof displayNames] || storageType;
  }

  /**
   * Get available storage types for a region (cached)
   */
  async getAvailableStorageTypes(region: string): Promise<string[]> {
    try {
      const normalizedRegion = normalizeRegion(region);
      const availableTypes: string[] = [];
      
      // Check each storage type
      for (const storageType of DEFAULT_STORAGE_TYPES) {
        try {
          const prices = await azureClient.getStoragePrices(normalizedRegion, storageType);
          if (prices.length > 0) {
            availableTypes.push(storageType);
          }
        } catch (error) {
          // Skip this storage type if not available
          console.warn(`Storage type ${storageType} not available in ${region}:`, error);
        }
      }
      
      return availableTypes.length > 0 ? availableTypes : [...DEFAULT_STORAGE_TYPES];
      
    } catch (error) {
      console.error('Failed to get available storage types:', error);
      return [...DEFAULT_STORAGE_TYPES];
    }
  }
}

// Export singleton instance
export const storageCalculator = new StorageCalculator(); 