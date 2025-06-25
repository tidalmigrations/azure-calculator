// Azure regions mapping
export const AZURE_REGIONS = {
  'eastus': 'East US',
  'eastus2': 'East US 2',
  'westus': 'West US',
  'westus2': 'West US 2',
  'westus3': 'West US 3',
  'centralus': 'Central US',
  'northcentralus': 'North Central US',
  'southcentralus': 'South Central US',
  'westcentralus': 'West Central US',
  'canadacentral': 'Canada Central',
  'canadaeast': 'Canada East',
  'brazilsouth': 'Brazil South',
  'northeurope': 'North Europe',
  'westeurope': 'West Europe',
  'uksouth': 'UK South',
  'ukwest': 'UK West',
  'francecentral': 'France Central',
  'francesouth': 'France South',
  'germanywestcentral': 'Germany West Central',
  'norwayeast': 'Norway East',
  'switzerlandnorth': 'Switzerland North',
  'swedencentral': 'Sweden Central',
  'eastasia': 'East Asia',
  'southeastasia': 'Southeast Asia',
  'japaneast': 'Japan East',
  'japanwest': 'Japan West',
  'australiaeast': 'Australia East',
  'australiasoutheast': 'Australia Southeast',
  'koreacentral': 'Korea Central',
  'koreasouth': 'Korea South',
  'southindia': 'South India',
  'centralindia': 'Central India',
  'westindia': 'West India',
  'uaenorth': 'UAE North',
  'southafricanorth': 'South Africa North'
} as const;

// Operating system types
export const OS_TYPES = {
  WINDOWS: 'windows',
  LINUX: 'linux'
} as const;

// Storage types
export const STORAGE_TYPES = {
  STANDARD_HDD: 'Standard HDD',
  STANDARD_SSD: 'Standard SSD',
  PREMIUM_SSD: 'Premium SSD v2'
} as const;

// File types
export const SUPPORTED_FILE_TYPES = {
  CSV: '.csv',
  EXCEL: '.xlsx,.xls'
} as const;

// API configuration
export const API_CONFIG = {
  BASE_URL: 'https://prices.azure.com/api/retail/prices',
  VERSION: '2023-01-01-preview',
  CACHE_DURATION: 3600000, // 1 hour in milliseconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 second
} as const;

// Default values
export const DEFAULTS = {
  REGION: 'eastus',
  VM_SIZE: 'Standard_B2s',
  STORAGE_TYPE: STORAGE_TYPES.STANDARD_HDD,
  CURRENCY: 'USD'
} as const; 