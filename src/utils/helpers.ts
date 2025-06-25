import { OS_TYPES } from './constants';

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