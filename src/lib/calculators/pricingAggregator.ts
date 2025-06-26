import { SpreadsheetRow } from '@/types';
import { normalizeRegion, detectOSType } from '@/utils/helpers';
import { PricingRequirements } from './types';

/**
 * Phase 3.1: Data Aggregation
 * Aggregates all unique pricing requirements from spreadsheet data
 * to minimize API calls by identifying unique (region, VM family) and (region, storage class) combinations
 */
export class PricingAggregator {
  /**
   * Aggregate unique pricing requirements from spreadsheet rows
   * This is Phase 3.1 implementation
   */
  static aggregateRequirements(rows: SpreadsheetRow[]): PricingRequirements {
    console.log('🔍 Phase 3.1 - Starting data aggregation for', rows.length, 'rows');
    
    const requirements: PricingRequirements = {
      vmRequirements: new Set<string>(),
      storageRequirements: new Set<string>(),
      uniqueRegions: new Set<string>(),
      uniqueOSTypes: new Set<'windows' | 'linux'>(),
      uniqueStorageTypes: new Set<'standard-hdd' | 'standard-ssd' | 'premium-ssd'>()
    };

    for (const row of rows) {
      // Extract and normalize region
      const region = normalizeRegion(row.region || row.location || 'eastus');
      requirements.uniqueRegions.add(region);

      // Extract and normalize OS
      const os = detectOSType(row.os || 'linux');
      requirements.uniqueOSTypes.add(os);

      // Create VM requirement key
      const vmKey = `${region}:${os}`;
      requirements.vmRequirements.add(vmKey);

      // Extract storage type
      const storageType = this.parseStorageType(row);
      requirements.uniqueStorageTypes.add(storageType);

      // Create storage requirement key
      const storageKey = `${region}:${storageType}`;
      requirements.storageRequirements.add(storageKey);
    }

    console.log('✅ Phase 3.1 - Aggregation complete:', {
      totalRows: rows.length,
      uniqueVMRequirements: requirements.vmRequirements.size,
      uniqueStorageRequirements: requirements.storageRequirements.size,
      uniqueRegions: requirements.uniqueRegions.size,
      uniqueOSTypes: requirements.uniqueOSTypes.size,
      uniqueStorageTypes: requirements.uniqueStorageTypes.size,
      vmRequirements: Array.from(requirements.vmRequirements),
      storageRequirements: Array.from(requirements.storageRequirements)
    });

    return requirements;
  }

  /**
   * Parse storage type from spreadsheet row data
   */
  private static parseStorageType(row: SpreadsheetRow): 'standard-hdd' | 'standard-ssd' | 'premium-ssd' {
    const storageTypeInput = row.storageType || row.diskType || row.tier;
    
    if (!storageTypeInput) {
      return 'premium-ssd'; // Default to premium SSD for best performance
    }

    const storageStr = String(storageTypeInput).toLowerCase();
    
    if (storageStr.includes('premium') || storageStr.includes('ssd')) {
      return 'premium-ssd';
    } else if (storageStr.includes('standard') && storageStr.includes('ssd')) {
      return 'standard-ssd';
    } else if (storageStr.includes('hdd') || storageStr.includes('standard')) {
      return 'standard-hdd';
    }
    
    return 'premium-ssd'; // Default fallback
  }

  /**
   * Calculate the efficiency gain from aggregation
   */
  static calculateEfficiencyGain(totalRows: number, requirements: PricingRequirements): {
    originalApiCalls: number;
    optimizedApiCalls: number;
    reductionPercentage: number;
  } {
    // Original approach: 2 API calls per row (VM + Storage)
    const originalApiCalls = totalRows * 2;
    
    // Optimized approach: unique VM requirements + unique Storage requirements
    const optimizedApiCalls = requirements.vmRequirements.size + requirements.storageRequirements.size;
    
    const reductionPercentage = ((originalApiCalls - optimizedApiCalls) / originalApiCalls) * 100;

    return {
      originalApiCalls,
      optimizedApiCalls,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100
    };
  }
} 