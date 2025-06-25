import { OS_TYPES } from './constants';
import type { ColumnMapping } from '@/types';

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats a number with commas for readability
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Detects OS type from a string
 */
export function detectOSType(osString: string): 'windows' | 'linux' {
  const normalized = osString.toLowerCase();
  
  // Windows indicators
  const windowsKeywords = [
    'windows', 'win', 'microsoft', 'server 2016', 'server 2019', 
    'server 2022', '2k8', '2k12', '2k16', '2k19'
  ];
  
  // Linux indicators
  const linuxKeywords = [
    'linux', 'ubuntu', 'centos', 'redhat', 'red hat', 'rhel', 
    'debian', 'fedora', 'suse', 'oracle linux'
  ];
  
  // Check for Windows first
  if (windowsKeywords.some(keyword => normalized.includes(keyword))) {
    return OS_TYPES.WINDOWS;
  }
  
  // Check for Linux
  if (linuxKeywords.some(keyword => normalized.includes(keyword))) {
    return OS_TYPES.LINUX;
  }
  
  // Default to Linux if uncertain
  return OS_TYPES.LINUX;
}

/**
 * Validates if a string is a valid Azure region
 */
export function isValidRegion(region: string): boolean {
  const validRegions = [
    'eastus', 'eastus2', 'westus', 'westus2', 'westus3', 'centralus',
    'northcentralus', 'southcentralus', 'westcentralus', 'canadacentral',
    'canadaeast', 'brazilsouth', 'northeurope', 'westeurope', 'uksouth',
    'ukwest', 'francecentral', 'francesouth', 'germanywestcentral',
    'norwayeast', 'switzerlandnorth', 'swedencentral', 'eastasia',
    'southeastasia', 'japaneast', 'japanwest', 'australiaeast',
    'australiasoutheast', 'koreacentral', 'koreasouth', 'southindia',
    'centralindia', 'westindia', 'uaenorth', 'southafricanorth'
  ];
  
  return validRegions.includes(region.toLowerCase());
}

/**
 * Normalizes Azure region name to standard format
 */
export function normalizeRegion(region: string): string {
  const regionMap: Record<string, string> = {
    'east us': 'eastus',
    'east us 2': 'eastus2',
    'west us': 'westus',
    'west us 2': 'westus2',
    'west us 3': 'westus3',
    'central us': 'centralus',
    'north central us': 'northcentralus',
    'south central us': 'southcentralus',
    'west central us': 'westcentralus',
    'canada central': 'canadacentral',
    'canada east': 'canadaeast',
    'brazil south': 'brazilsouth',
    'north europe': 'northeurope',
    'west europe': 'westeurope',
    'uk south': 'uksouth',
    'uk west': 'ukwest',
    'france central': 'francecentral',
    'france south': 'francesouth',
    'germany west central': 'germanywestcentral',
    'norway east': 'norwayeast',
    'switzerland north': 'switzerlandnorth',
    'sweden central': 'swedencentral',
    'east asia': 'eastasia',
    'southeast asia': 'southeastasia',
    'japan east': 'japaneast',
    'japan west': 'japanwest',
    'australia east': 'australiaeast',
    'australia southeast': 'australiasoutheast',
    'korea central': 'koreacentral',
    'korea south': 'koreasouth',
    'south india': 'southindia',
    'central india': 'centralindia',
    'west india': 'westindia',
    'uae north': 'uaenorth',
    'south africa north': 'southafricanorth'
  };
  
  const normalized = region.toLowerCase().trim();
  return regionMap[normalized] || normalized;
}

/**
 * Validates if a number is positive
 */
export function isPositiveNumber(value: any): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/**
 * Safely converts a value to a number
 */
export function safeToNumber(value: any, defaultValue = 0): number {
  // Handle empty strings and null/undefined values
  if (value === '' || value == null) {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Generates a cache key for API requests
 */
export function generateCacheKey(params: Record<string, any>): string {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Automatically detect column mappings based on header names
 */
export function detectColumnMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    region: null,
    os: null,
    hoursToRun: null,
    storageCapacity: null
  };

  // Normalize headers for comparison
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  // Define patterns with priority (more specific patterns first)
  const patterns = {
    region: [
      /^(azure\s*)?region$/i,
      /^location$/i,
      /^datacenter$/i,
      /^zone$/i
    ],
    os: [
      /^operating\s*system(\s*version)?$/i,
      /^os(\s*version)?$/i,
      /^platform$/i,
      /^system$/i
    ],
    hoursToRun: [
      /^hours?\s*(to\s*)?(run|running|usage)$/i,
      /^runtime\s*hours?$/i,
      /^runtime$/i,
      /^monthly\s*hours?$/i,
      /^uptime$/i,
      /^hours?$/i
    ],
    storageCapacity: [
      /^storage\s*(allocated|capacity|size)?\s*\(?\s*gb\s*\)?$/i,
      /^storage\s*capacity$/i,
      /^disk\s*(size|capacity)\s*\(?\s*gb\s*\)?$/i,
      /^storage$/i,
      /^disk$/i,
      /^capacity$/i
    ]
  };

  // For each field, find the best match
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    let bestMatch: string | null = null;
    let bestScore = -1;

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const normalizedHeader = normalizedHeaders[i];

      for (let j = 0; j < fieldPatterns.length; j++) {
        const pattern = fieldPatterns[j];
        if (pattern.test(normalizedHeader)) {
          // Score based on pattern specificity (earlier patterns are more specific)
          // and length bonus for more specific matches
          const patternScore = (fieldPatterns.length - j) * 10;
          const lengthBonus = normalizedHeader.length; // Longer, more specific names get higher score
          const score = patternScore + lengthBonus;

          if (score > bestScore) {
            bestScore = score;
            bestMatch = header;
          }
        }
      }
    }

    if (bestMatch) {
      (mapping as any)[field] = bestMatch;
    }
  }

  return mapping;
} 