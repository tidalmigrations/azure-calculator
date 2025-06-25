/**
 * Azure API Filter Builder
 * Utilities for constructing OData filter strings for the Azure Retail Prices API
 */

export interface PriceFilters {
  serviceName?: string;
  region?: string;
  productName?: string;
  skuName?: string;
  priceType?: 'Consumption' | 'Reservation';
  os?: 'windows' | 'linux';
  storageType?: 'standard-hdd' | 'standard-ssd' | 'premium-ssd';
}

/**
 * Build OData filter string from filter object
 */
export function buildFilter(filters: PriceFilters): string {
  const filterParts: string[] = [];
  
  if (filters.serviceName) {
    filterParts.push(`serviceName eq '${filters.serviceName}'`);
  }
  
  if (filters.region) {
    const normalizedRegion = normalizeRegionName(filters.region);
    filterParts.push(`armRegionName eq '${normalizedRegion}'`);
  }
  
  if (filters.productName) {
    filterParts.push(`contains(tolower(productName), '${filters.productName.toLowerCase()}')`);
  }
  
  if (filters.skuName) {
    filterParts.push(`contains(tolower(armSkuName), '${filters.skuName.toLowerCase()}')`);
  }
  
  if (filters.priceType) {
    filterParts.push(`priceType eq '${filters.priceType}'`);
  }
  
  // Handle OS-specific filtering
  if (filters.os) {
    if (filters.os === 'windows') {
      filterParts.push("contains(tolower(productName), 'windows')");
    } else {
      // Use positive filtering for Linux instead of complex negative filtering
      filterParts.push("contains(tolower(productName), 'linux')");
    }
  }
  
  // Handle storage type filtering
  if (filters.storageType) {
    let productFilter: string;
    switch (filters.storageType) {
      case 'standard-ssd':
        productFilter = "contains(tolower(productName), 'standard ssd')";
        break;
      case 'premium-ssd':
        productFilter = "contains(tolower(productName), 'premium ssd')";
        break;
      default:
        productFilter = "contains(tolower(productName), 'standard hdd')";
    }
    filterParts.push(productFilter);
  }
  
  if (filterParts.length === 0) {
    throw new Error('At least one filter must be provided');
  }
  
  return filterParts.join(' and ');
}

/**
 * Normalize Azure region names to match API expectations
 */
export function normalizeRegionName(region: string): string {
  // Convert common region name variations to Azure ARM region names
  const regionMap: Record<string, string> = {
    // US regions
    'east us': 'eastus',
    'east us 2': 'eastus2',
    'west us': 'westus',
    'west us 2': 'westus2',
    'west us 3': 'westus3',
    'central us': 'centralus',
    'north central us': 'northcentralus',
    'south central us': 'southcentralus',
    'west central us': 'westcentralus',
    
    // Europe regions
    'north europe': 'northeurope',
    'west europe': 'westeurope',
    'uk south': 'uksouth',
    'uk west': 'ukwest',
    'france central': 'francecentral',
    'france south': 'francesouth',
    'germany west central': 'germanywestcentral',
    'germany north': 'germanynorth',
    'norway east': 'norwayeast',
    'norway west': 'norwaywest',
    'switzerland north': 'switzerlandnorth',
    'switzerland west': 'switzerlandwest',
    
    // Asia Pacific regions
    'southeast asia': 'southeastasia',
    'east asia': 'eastasia',
    'australia east': 'australiaeast',
    'australia southeast': 'australiasoutheast',
    'australia central': 'australiacentral',
    'australia central 2': 'australiacentral2',
    'japan east': 'japaneast',
    'japan west': 'japanwest',
    'korea central': 'koreacentral',
    'korea south': 'koreasouth',
    'india central': 'centralindia',
    'india south': 'southindia',
    'india west': 'westindia',
    
    // Other regions
    'canada central': 'canadacentral',
    'canada east': 'canadaeast',
    'brazil south': 'brazilsouth',
    'south africa north': 'southafricanorth',
    'south africa west': 'southafricawest',
    'uae north': 'uaenorth',
    'uae central': 'uaecentral'
  };
  
  const normalized = region.toLowerCase().trim();
  return regionMap[normalized] || normalized.replace(/\s+/g, '');
}

/**
 * Build VM-specific filter
 */
export function buildVMFilter(region: string, os: 'windows' | 'linux', skuName?: string): string {
  return buildFilter({
    serviceName: 'Virtual Machines',
    region,
    os,
    priceType: 'Consumption',
    ...(skuName && { skuName })
  });
}

/**
 * Build storage-specific filter
 */
export function buildStorageFilter(region: string, storageType: 'standard-hdd' | 'standard-ssd' | 'premium-ssd' = 'standard-hdd'): string {
  return buildFilter({
    serviceName: 'Storage',
    region,
    storageType,
    priceType: 'Consumption'
  });
}

/**
 * Common VM SKU patterns for filtering
 */
export const VM_SKU_PATTERNS = {
  // General purpose
  'B-series': 'Standard_B',
  'D-series': 'Standard_D',
  'DS-series': 'Standard_DS',
  'Dv2-series': 'Standard_D.*v2',
  'Dv3-series': 'Standard_D.*v3',
  'Dv4-series': 'Standard_D.*v4',
  'Dv5-series': 'Standard_D.*v5',
  
  // Compute optimized
  'F-series': 'Standard_F',
  'Fs-series': 'Standard_F.*s',
  'Fv2-series': 'Standard_F.*v2',
  
  // Memory optimized
  'E-series': 'Standard_E',
  'Es-series': 'Standard_E.*s',
  'Ev3-series': 'Standard_E.*v3',
  'Ev4-series': 'Standard_E.*v4',
  'Ev5-series': 'Standard_E.*v5',
  'M-series': 'Standard_M',
  
  // Storage optimized
  'L-series': 'Standard_L',
  'Ls-series': 'Standard_L.*s',
  'Lv2-series': 'Standard_L.*v2',
  
  // GPU
  'NC-series': 'Standard_NC',
  'ND-series': 'Standard_ND',
  'NV-series': 'Standard_NV'
} as const;

/**
 * Get available Azure regions
 */
export function getAvailableRegions(): Array<{ name: string; displayName: string }> {
  return [
    // US regions
    { name: 'eastus', displayName: 'East US' },
    { name: 'eastus2', displayName: 'East US 2' },
    { name: 'westus', displayName: 'West US' },
    { name: 'westus2', displayName: 'West US 2' },
    { name: 'westus3', displayName: 'West US 3' },
    { name: 'centralus', displayName: 'Central US' },
    { name: 'northcentralus', displayName: 'North Central US' },
    { name: 'southcentralus', displayName: 'South Central US' },
    { name: 'westcentralus', displayName: 'West Central US' },
    
    // Europe regions
    { name: 'northeurope', displayName: 'North Europe' },
    { name: 'westeurope', displayName: 'West Europe' },
    { name: 'uksouth', displayName: 'UK South' },
    { name: 'ukwest', displayName: 'UK West' },
    { name: 'francecentral', displayName: 'France Central' },
    { name: 'francesouth', displayName: 'France South' },
    { name: 'germanywestcentral', displayName: 'Germany West Central' },
    { name: 'germanynorth', displayName: 'Germany North' },
    { name: 'norwayeast', displayName: 'Norway East' },
    { name: 'norwaywest', displayName: 'Norway West' },
    { name: 'switzerlandnorth', displayName: 'Switzerland North' },
    { name: 'switzerlandwest', displayName: 'Switzerland West' },
    
    // Asia Pacific regions
    { name: 'southeastasia', displayName: 'Southeast Asia' },
    { name: 'eastasia', displayName: 'East Asia' },
    { name: 'australiaeast', displayName: 'Australia East' },
    { name: 'australiasoutheast', displayName: 'Australia Southeast' },
    { name: 'australiacentral', displayName: 'Australia Central' },
    { name: 'australiacentral2', displayName: 'Australia Central 2' },
    { name: 'japaneast', displayName: 'Japan East' },
    { name: 'japanwest', displayName: 'Japan West' },
    { name: 'koreacentral', displayName: 'Korea Central' },
    { name: 'koreasouth', displayName: 'Korea South' },
    { name: 'centralindia', displayName: 'Central India' },
    { name: 'southindia', displayName: 'South India' },
    { name: 'westindia', displayName: 'West India' },
    
    // Other regions
    { name: 'canadacentral', displayName: 'Canada Central' },
    { name: 'canadaeast', displayName: 'Canada East' },
    { name: 'brazilsouth', displayName: 'Brazil South' },
    { name: 'southafricanorth', displayName: 'South Africa North' },
    { name: 'southafricawest', displayName: 'South Africa West' },
    { name: 'uaenorth', displayName: 'UAE North' },
    { name: 'uaecentral', displayName: 'UAE Central' }
  ];
} 