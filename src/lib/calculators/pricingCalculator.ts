import { SpreadsheetRow, PricingResult, CostBreakdown } from '@/types';
import { vmCalculator } from './vmCalculator';
import { storageCalculator } from './storageCalculator';
import { CalculationResult, VMCalculationResult, StorageCalculationResult } from './types';

/**
 * Main Pricing Calculator
 * Orchestrates VM and storage calculations to produce final pricing results
 */
export class PricingCalculator {
  /**
   * Calculate pricing for a single spreadsheet row
   */
  async calculateRow(row: SpreadsheetRow): Promise<PricingResult> {
    try {
      // Only log server/hostname related fields for server selection focus
      const serverFields = {
        hostname: row.hostname || row.serverName || row['Server Name'] || row['Server Hostname'] || row.name || row.server || row['Hostname'],
        region: row.region,
        os: row.os
      };
      console.log('🎯 Server Selection - Processing:', serverFields);
      
      const result = await this.calculateCosts(row);
      
      return {
        ...row,
        vmCost: result.vmResult?.cost || 0,
        storageCost: result.storageResult?.cost || 0,
        totalCost: result.totalCost,
        breakdown: result.breakdown,
        hostname: result.breakdown?.vmDetails?.hostname || row.hostname || row.serverName || row['Server Name'] || row['Server Hostname'] || row.name || row.server || row['Hostname'] || 'Unknown',
        requiredCPUs: result.vmResult?.details.requiredCPUs,
        requiredRAM: result.vmResult?.details.requiredRAM
      };
      
    } catch (error) {
      console.error('Error calculating row:', error);
      
      // Return error result with fallback values
      return {
        ...row,
        vmCost: 0,
        storageCost: 0,
        totalCost: 0,
        breakdown: this.createErrorBreakdown(error instanceof Error ? error.message : 'Calculation failed'),
        hostname: row.hostname || row.serverName || row.name || row.server || row['Server Name'] || row['Server Hostname'] || row['Hostname'] || 'Unknown'
      };
    }
  }

  /**
   * Calculate pricing for multiple rows with progress tracking
   */
  async calculateBatch(
    rows: SpreadsheetRow[], 
    onProgress?: (completed: number, total: number) => void
  ): Promise<PricingResult[]> {
    const results: PricingResult[] = [];
    const total = rows.length;
    
    // Process in smaller batches to avoid overwhelming the API
    // Reduced batch size to be more respectful of rate limits
    const batchSize = 3;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(row => this.calculateRow(row));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results and handle any rejections
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch calculation error:', result.reason);
          // Add error result for failed calculation
          results.push({
            region: 'Unknown',
            os: 'Unknown',
            hoursToRun: 0,
            storageCapacity: 0,
            vmCost: 0,
            storageCost: 0,
            totalCost: 0,
            breakdown: this.createErrorBreakdown('Calculation failed')
          });
        }
      }
      
      // Report progress
      if (onProgress) {
        onProgress(results.length, total);
      }
      
      // Longer delay between batches to be more respectful to the API
      // This helps avoid rate limiting issues
      if (i + batchSize < rows.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased from 200ms to 1000ms
      }
    }
    
    return results;
  }

  /**
   * Calculate costs for VM and storage
   */
  private async calculateCosts(row: SpreadsheetRow): Promise<CalculationResult> {
    // Run VM and storage calculations in parallel
    const [vmResult, storageResult] = await Promise.allSettled([
      this.calculateVMCost(row),
      this.calculateStorageCost(row)
    ]);

    // Extract results or handle errors
    const vm = vmResult.status === 'fulfilled' ? vmResult.value : null;
    const storage = storageResult.status === 'fulfilled' ? storageResult.value : null;

    // Calculate total cost
    const totalCost = (vm?.cost || 0) + (storage?.cost || 0);

    // Create breakdown
    const breakdown = this.createBreakdown(vm, storage);

    return {
      vmResult: vm || undefined,
      storageResult: storage || undefined,
      totalCost,
      breakdown
    };
  }

  /**
   * Calculate VM cost using the VM calculator
   */
  private async calculateVMCost(row: SpreadsheetRow): Promise<VMCalculationResult> {
    const costItem = await vmCalculator.calculate(row);
    
    return {
      cost: costItem.cost,
      details: {
        vmSize: costItem.details.vmSize || 'Unknown',
        hourlyRate: costItem.details.hourlyRate || 0,
        totalHours: costItem.details.totalHours || 0,
        osType: costItem.details.osType || 'Unknown',
        region: costItem.details.region || 'Unknown',
        skuName: costItem.details.skuName || 'Unknown',
        productName: costItem.details.productName || 'Unknown',
        currency: costItem.details.currency || 'USD',
        cpu: costItem.details.cpu || 0,
        ram: costItem.details.ram || 0,
        unitOfMeasure: costItem.details.unitOfMeasure || '1 Hour',
        hostname: costItem.details.hostname || 'Unknown',
        requiredCPUs: costItem.details.requiredCPUs,
        requiredRAM: costItem.details.requiredRAM
      }
    };
  }

  /**
   * Calculate storage cost using the storage calculator
   */
  private async calculateStorageCost(row: SpreadsheetRow): Promise<StorageCalculationResult> {
    const costItem = await storageCalculator.calculate(row);
    
    return {
      cost: costItem.cost,
      details: {
        storageType: costItem.details.storageType || 'Unknown',
        monthlyRatePerGB: costItem.details.monthlyRatePerGB || 0,
        hourlyRatePerGB: costItem.details.hourlyRatePerGB || 0,
        capacityGB: costItem.details.capacityGB || 0,
        region: costItem.details.region || 'Unknown',
        productName: costItem.details.productName || 'Unknown'
      }
    };
  }

  /**
   * Create cost breakdown from calculation results
   */
  private createBreakdown(
    vmResult: VMCalculationResult | null, 
    storageResult: StorageCalculationResult | null
  ): CostBreakdown {
    return {
      vmDetails: {
        size: vmResult?.details.vmSize || 'Not calculated',
        hourlyRate: vmResult?.details.hourlyRate || 0,
        totalHours: vmResult?.details.totalHours || 0,
        subtotal: vmResult?.cost || 0,
        currency: vmResult?.details.currency,
        cpu: vmResult?.details.cpu,
        ram: vmResult?.details.ram,
        hostname: vmResult?.details.hostname
      },
      storageDetails: {
        tier: storageResult?.details.storageType || 'Not calculated',
        monthlyRate: storageResult?.details.monthlyRatePerGB || 0,
        hourlyRate: storageResult?.details.hourlyRatePerGB || 0,
        capacityGB: storageResult?.details.capacityGB || 0,
        subtotal: storageResult?.cost || 0,
        currency: storageResult?.details.currency
      }
    };
  }

  /**
   * Create error breakdown for failed calculations
   */
  private createErrorBreakdown(errorMessage: string): CostBreakdown {
    return {
      vmDetails: {
        size: `Error: ${errorMessage}`,
        hourlyRate: 0,
        totalHours: 0,
        subtotal: 0
      },
      storageDetails: {
        tier: `Error: ${errorMessage}`,
        monthlyRate: 0,
        hourlyRate: 0,
        capacityGB: 0,
        subtotal: 0
      }
    };
  }

  /**
   * Validate input data before calculation
   */
  validateInput(row: SpreadsheetRow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!row.region || String(row.region).trim() === '') {
      errors.push('Region is required');
    }

    if (!row.os || String(row.os).trim() === '') {
      errors.push('Operating System is required');
    }

    if (typeof row.hoursToRun !== 'number' || row.hoursToRun <= 0) {
      errors.push('Hours to run must be a positive number');
    }

    if (typeof row.storageCapacity !== 'number' || row.storageCapacity <= 0) {
      errors.push('Storage capacity must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get estimation accuracy based on available data
   */
  getEstimationAccuracy(row: SpreadsheetRow): {
    accuracy: 'high' | 'medium' | 'low';
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;

    // Region specificity
    if (row.region && String(row.region).trim() !== '') {
      score += 25;
    } else {
      factors.push('Region not specified');
    }

    // OS specificity
    if (row.os && String(row.os).trim() !== '') {
      score += 25;
    } else {
      factors.push('Operating system not specified');
    }

    // Hours specificity
    if (typeof row.hoursToRun === 'number' && row.hoursToRun > 0) {
      score += 25;
    } else {
      factors.push('Runtime hours not specified');
    }

    // Storage specificity
    if (typeof row.storageCapacity === 'number' && row.storageCapacity > 0) {
      score += 25;
    } else {
      factors.push('Storage capacity not specified');
    }

    // Determine accuracy level
    let accuracy: 'high' | 'medium' | 'low';
    if (score >= 75) {
      accuracy = 'high';
    } else if (score >= 50) {
      accuracy = 'medium';
    } else {
      accuracy = 'low';
    }

    return { accuracy, factors };
  }
}

// Export singleton instance
export const pricingCalculator = new PricingCalculator(); 