// Azure API Types
export interface AzureRetailPrice {
  currencyCode: string;
  tierMinimumUnits: number;
  retailPrice: number;
  unitPrice: number;
  armRegionName: string;
  location: string;
  effectiveStartDate: string;
  meterId: string;
  meterName: string;
  productId: string;
  skuId: string;
  productName: string;
  skuName: string;
  serviceName: string;
  serviceId: string;
  serviceFamily: string;
  unitOfMeasure: string;
  type: string;
  isPrimaryMeterRegion: boolean;
  armSkuName: string;
}

// Application Types
export interface SpreadsheetRow {
  region: string;
  os: string;
  hoursToRun: number;
  storageCapacity: number;
  [key: string]: any;
}

export interface ColumnMapping {
  region: string | null;
  os: string | null;
  hoursToRun: string | null;
  storageCapacity: string | null;
  hostname: string | null;
  cpuCount: string | null;
  ramCapacity: string | null;
  applicationGroup: string | null;
  matchType: string | null;
  confidenceScore: string | null;
  environment: string | null;
  fqdn: string | null;
  ipAddresses: string | null;
  vmFamily: string | null;
}

export interface PricingResult extends SpreadsheetRow {
  vmCost: number;
  storageCost: number;
  totalCost: number;
  breakdown?: CostBreakdown;
  hostname?: string;
  requiredCPUs?: number;
  requiredRAM?: number;
}

export interface CostBreakdown {
  vmDetails: {
    size: string;
    hourlyRate: number;
    totalHours: number;
    subtotal: number;
    currency?: string;
    cpu?: number;
    ram?: number;
    hostname?: string;
  };
  storageDetails: {
    tier: string;
    monthlyRate: number;
    capacityGB: number;
    subtotal: number;
    currency?: string;
  };
}

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, any>[];
  hasHeaders: boolean;
}

// File upload types
export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  file: File | null;
  data: Record<string, any>[] | null;
  headers: string[];
}

// Application state
export interface ApplicationData {
  uploadState: FileUploadState;
  columnMapping: ColumnMapping;
  pricingResults: PricingResult[] | null;
  isCalculating: boolean;
  errors: ValidationError[];
}

// Error types
export interface ApiErrorInterface {
  message: string;
  status: number;
  code: string;
  details?: Record<string, any>;
}

export class ApiError extends Error implements ApiErrorInterface {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, status: number, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

// API Response types
export interface AzureApiResponse {
  Items: AzureRetailPrice[];
  NextPageLink?: string;
  Count: number;
}

// Cached response type
export interface CachedResponse {
  data: AzureRetailPrice[];
  expiry: number;
} 