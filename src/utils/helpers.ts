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
    'cacentral': 'canadacentral',
    'ca central': 'canadacentral',
    'can central': 'canadacentral',
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
  return regionMap[normalized] || normalized.replace(/\s+/g, '');
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
    storageCapacity: null,
    hostname: null,
    cpuCount: null,
    ramCapacity: null,
    applicationGroup: null,
    matchType: null,
    confidenceScore: null,
    environment: null,
    fqdn: null,
    ipAddresses: null,
    vmFamily: null
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
    ],
    hostname: [
      /^server\s*hostname$/i,
      /^hostname$/i,
      /^server\s*name$/i,
      /^computer\s*name$/i,
      /^machine\s*name$/i,
      /^host\s*name$/i,
      /^server$/i,
      /^host$/i,
      /^computer$/i,
      /^machine$/i,
      /^system\s*name$/i,
      /^node\s*name$/i,
      /^device\s*name$/i,
      /^asset\s*name$/i,
      /^vm\s*name$/i,
      /^name$/i
    ],
    cpuCount: [
      /^logical\s*cpu\s*count$/i,
      /^cpu\s*count$/i,
      /^vcpu\s*count$/i,
      /^processor\s*count$/i,
      /^core\s*count$/i,
      /^cpu\s*cores$/i,
      /^cores$/i,
      /^cpus$/i,
      /^vcpus$/i,
      /^processors$/i,
      /^cpu$/i
    ],
    ramCapacity: [
      /^ram\s*allocated\s*\(?\s*gb\s*\)?$/i,
      /^memory\s*allocated\s*\(?\s*gb\s*\)?$/i,
      /^ram\s*\(?\s*gb\s*\)?$/i,
      /^memory\s*\(?\s*gb\s*\)?$/i,
      /^ram\s*capacity$/i,
      /^memory\s*capacity$/i,
      /^memory\s*size$/i,
      /^ram\s*size$/i,
      /^memory$/i,
      /^ram$/i
    ],
    applicationGroup: [
      /^application\s*group$/i,
      /^app\s*group$/i,
      /^service\s*group$/i,
      /^workload\s*group$/i,
      /^business\s*unit$/i,
      /^department$/i,
      /^team$/i,
      /^group$/i
    ],
    matchType: [
      /^match\s*type$/i,
      /^matching\s*type$/i,
      /^match\s*method$/i,
      /^identification\s*type$/i,
      /^match$/i
    ],
    confidenceScore: [
      /^confidence\s*score$/i,
      /^confidence\s*level$/i,
      /^match\s*confidence$/i,
      /^accuracy\s*score$/i,
      /^confidence$/i,
      /^score$/i
    ],
    environment: [
      /^environment$/i,
      /^env$/i,
      /^deployment\s*environment$/i,
      /^stage$/i,
      /^tier$/i
    ],
    fqdn: [
      /^fqdn$/i,
      /^fully\s*qualified\s*domain\s*name$/i,
      /^domain\s*name$/i,
      /^dns\s*name$/i,
      /^qualified\s*name$/i
    ],
    ipAddresses: [
      /^ip\s*address(es)?$/i,
      /^ip$/i,
      /^network\s*address$/i,
      /^address$/i,
      /^addresses$/i
    ],
    vmFamily: [
      /^vm\s*family$/i,
      /^virtual\s*machine\s*family$/i,
      /^instance\s*family$/i,
      /^vm\s*type$/i,
      /^instance\s*type$/i,
      /^family$/i
    ]
  };

  // Find best match for each field
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const normalizedHeader = normalizedHeaders[i];

      for (const pattern of fieldPatterns) {
        if (pattern.test(normalizedHeader)) {
          // Score based on pattern specificity (more specific patterns have higher priority)
          const score = fieldPatterns.indexOf(pattern) === 0 ? 3 : 
                       fieldPatterns.indexOf(pattern) < 3 ? 2 : 1;
          
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