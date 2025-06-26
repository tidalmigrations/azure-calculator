import { SpreadsheetRow, CostBreakdown, AzureRetailPrice } from '@/types';

/**
 * Base interface for all pricing calculators
 */
export interface PricingCalculator {
  name: string;
  requiredFields: string[];
  calculate(data: SpreadsheetRow): Promise<CostItem>;
}

/**
 * Individual cost item calculated by a specific calculator
 */
export interface CostItem {
  serviceName: string;
  cost: number;
  details: Record<string, any>;
}

/**
 * Pricing requirements aggregated from spreadsheet data
 * Used for Phase 3.1 - Data Aggregation
 */
export interface PricingRequirements {
  vmRequirements: Set<string>; // Set of "region:os" combinations
  storageRequirements: Set<string>; // Set of "region:storageType" combinations
  uniqueRegions: Set<string>;
  uniqueOSTypes: Set<'windows' | 'linux'>;
  uniqueStorageTypes: Set<'standard-hdd' | 'standard-ssd' | 'premium-ssd'>;
}

/**
 * Pricing cache structure for Phase 3.3 - In-Memory Caching
 */
export interface PricingCache {
  vmPrices: Map<string, AzureRetailPrice[]>; // Key: "region:os"
  storagePrices: Map<string, AzureRetailPrice[]>; // Key: "region:storageType"
  cacheTimestamp: number;
  cacheTtl: number;
}

/**
 * VM-specific calculation input
 */
export interface VMCalculationInput {
  region: string;
  os: 'windows' | 'linux';
  hoursToRun: number;
  vmSize?: string; // Optional, will use default if not specified
  hostname?: string; // Server hostname/name
  forcedFamily?: string; // Optional, force specific VM family (e.g., 'dsv6', 'b-series')
  requiredCPUs?: number; // Optional, minimum CPU count required
  requiredRAM?: number; // Optional, minimum RAM in GB required
}

/**
 * VM calculation result
 */
export interface VMCalculationResult {
  cost: number;
  details: {
    vmSize: string;
    hourlyRate: number;
    totalHours: number;
    osType: string;
    region: string;
    skuName: string;
    productName: string;
    currency: string;
    cpu: number; // Minimum required CPUs (from input)
    ram: number; // Minimum required RAM in GB (from input)
    azureVMCpu?: number; // Actual Azure VM CPUs (for reference)
    azureVMRam?: number; // Actual Azure VM RAM in GB (for reference)
    unitOfMeasure: string;
    hostname?: string;
    requiredCPUs?: number;
    requiredRAM?: number;
  };
}

/**
 * Storage-specific calculation input
 */
export interface StorageCalculationInput {
  region: string;
  storageCapacity: number; // in GB
  storageType?: 'standard-hdd' | 'standard-ssd' | 'premium-ssd';
}

/**
 * Storage calculation result
 */
export interface StorageCalculationResult {
  cost: number;
  details: {
    storageType: string;
    monthlyRatePerGB: number;
    hourlyRatePerGB?: number;  // Original per GiB/hour rate (e.g., 0.000121)
    capacityGB: number;
    region: string;
    productName: string;
    currency?: string;
  };
}

/**
 * Combined calculation result for a single row
 */
export interface CalculationResult {
  vmResult?: VMCalculationResult;
  storageResult?: StorageCalculationResult;
  totalCost: number;
  breakdown: CostBreakdown;
}

/**
 * OS detection result
 */
export interface OSDetectionResult {
  os: 'windows' | 'linux';
  confidence: number;
  detectedFrom: string;
}

/**
 * VM size mapping for different workload types
 */
export interface VMSizeMapping {
  general: string[];
  compute: string[];
  memory: string[];
  storage: string[];
  gpu: string[];
}

/**
 * Default VM sizes by category
 */
export const DEFAULT_VM_SIZES: VMSizeMapping = {
  general: ['Standard_D2s_v6', 'Standard_D4s_v6', 'Standard_D2s_v5', 'Standard_D4s_v5', 'Standard_D2s_v4', 'Standard_D2s_v3', 'Standard_B2s'],
  compute: ['Standard_F2s_v2', 'Standard_F4s_v2', 'Standard_F8s_v2'],
  memory: ['Standard_E2s_v3', 'Standard_E4s_v3', 'Standard_E8s_v3'],
  storage: ['Standard_L4s', 'Standard_L8s', 'Standard_L16s'],
  gpu: ['Standard_NC6', 'Standard_NC12', 'Standard_NC24']
};

/**
 * Default storage types priority (best performance and value first)
 */
export const DEFAULT_STORAGE_TYPES = [
  'premium-ssd',    // Premium SSD v2 - best performance and granular pricing
  'standard-ssd',   // Standard SSD - good performance
  'standard-hdd'    // Standard HDD - lowest cost, lowest performance
] as const; 