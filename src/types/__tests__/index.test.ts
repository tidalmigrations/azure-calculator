import type {
  AzureRetailPrice,
  SpreadsheetRow,
  PricingResult,
  CostBreakdown,
  FileUploadState,
  ColumnMapping,
  ApplicationData,
  ValidationError
} from '../index'
import { ApiError } from '../index'

// Type tests using TypeScript's type system
describe('Type Definitions', () => {
  describe('AzureRetailPrice', () => {
    it('should have correct structure', () => {
      const mockPrice: AzureRetailPrice = {
        currencyCode: 'USD',
        tierMinimumUnits: 0,
        retailPrice: 0.096,
        unitPrice: 0.096,
        armRegionName: 'eastus',
        location: 'US East',
        effectiveStartDate: '2023-01-01T00:00:00Z',
        meterId: '12345-abcd-6789-efgh',
        meterName: 'B2s',
        productId: 'DZH318Z0BQ5P',
        skuId: 'DZH318Z0BQ5P/003P',
        productName: 'Virtual Machines BS Series',
        skuName: 'B2s',
        serviceName: 'Virtual Machines',
        serviceId: 'DZH313Z7MMC8',
        serviceFamily: 'Compute',
        unitOfMeasure: '1 Hour',
        type: 'Consumption',
        isPrimaryMeterRegion: true,
        armSkuName: 'Standard_B2s'
      }

      expect(mockPrice.currencyCode).toBe('USD')
      expect(mockPrice.retailPrice).toBe(0.096)
      expect(mockPrice.armRegionName).toBe('eastus')
      expect(mockPrice.serviceName).toBe('Virtual Machines')
    })
  })

  describe('SpreadsheetRow', () => {
    it('should have correct structure', () => {
      const mockRow: SpreadsheetRow = {
        region: 'eastus',
        os: 'windows',
        hoursToRun: 720,
        storageCapacity: 100,
        customField: 'value'
      }

      expect(mockRow.region).toBe('eastus')
      expect(mockRow.os).toBe('windows')
      expect(mockRow.hoursToRun).toBe(720)
      expect(mockRow.storageCapacity).toBe(100)
      expect(mockRow.customField).toBe('value')
    })
  })

  describe('PricingResult', () => {
    it('should have correct structure', () => {
      const mockBreakdown: CostBreakdown = {
        vmDetails: {
          size: 'Standard_B2s',
          hourlyRate: 0.096,
          totalHours: 720,
          subtotal: 69.12
        },
        storageDetails: {
          tier: 'Standard HDD',
          monthlyRate: 0.002,
          capacityGB: 100,
          subtotal: 1.44
        }
      }

      const mockResult: PricingResult = {
        region: 'eastus',
        os: 'windows',
        hoursToRun: 720,
        storageCapacity: 100,
        vmCost: 69.12,
        storageCost: 1.44,
        totalCost: 70.56,
        breakdown: mockBreakdown
      }

      expect(mockResult.vmCost).toBe(69.12)
      expect(mockResult.storageCost).toBe(1.44)
      expect(mockResult.totalCost).toBe(70.56)
      expect(mockResult.breakdown?.vmDetails.size).toBe('Standard_B2s')
    })
  })

  describe('FileUploadState', () => {
    it('should have correct structure', () => {
      const mockState: FileUploadState = {
        file: null,
        isUploading: false,
        progress: 0,
        error: null,
        data: null,
        headers: []
      }

      expect(mockState.isUploading).toBe(false)
      expect(mockState.progress).toBe(0)
      expect(mockState.data).toBe(null)
      expect(mockState.headers).toEqual([])
    })
  })

  describe('ColumnMapping', () => {
    it('should have correct structure', () => {
      const mockMapping: ColumnMapping = {
        region: 'Location',
        os: 'Operating System',
        hoursToRun: 'Runtime Hours',
        storageCapacity: 'Storage GB'
      }

      expect(mockMapping.region).toBe('Location')
      expect(mockMapping.os).toBe('Operating System')
      expect(mockMapping.hoursToRun).toBe('Runtime Hours')
      expect(mockMapping.storageCapacity).toBe('Storage GB')
    })
  })

  describe('ApplicationData', () => {
    it('should have correct structure', () => {
      const mockData: ApplicationData = {
        uploadState: {
          file: null,
          isUploading: false,
          progress: 0,
          error: null,
          data: null,
          headers: []
        },
        columnMapping: {
          region: null,
          os: null,
          hoursToRun: null,
          storageCapacity: null
        },
        pricingResults: null,
        isCalculating: false,
        errors: []
      }

      expect(mockData.isCalculating).toBe(false)
      expect(mockData.pricingResults).toBe(null)
      expect(mockData.errors).toEqual([])
    })
  })

  describe('ApiError', () => {
    it('should have correct structure', () => {
      const mockError = new ApiError(
        'API request failed',
        500,
        'INTERNAL_SERVER_ERROR',
        {
          endpoint: '/api/retail/prices',
          timestamp: '2023-01-01T12:00:00Z'
        }
      );

      expect(mockError.message).toBe('API request failed')
      expect(mockError.status).toBe(500)
      expect(mockError.code).toBe('INTERNAL_SERVER_ERROR')
      expect(mockError.name).toBe('ApiError')
    })
  })

  describe('ValidationError', () => {
    it('should have correct structure', () => {
      const mockError: ValidationError = {
        field: 'region',
        message: 'Invalid region specified',
        value: 'invalid-region'
      }

      expect(mockError.field).toBe('region')
      expect(mockError.message).toBe('Invalid region specified')
      expect(mockError.value).toBe('invalid-region')
    })
  })

  // Test type compatibility
  describe('Type Compatibility', () => {
    it('should allow SpreadsheetRow to have additional properties', () => {
      const row: SpreadsheetRow = {
        region: 'eastus',
        os: 'windows',
        hoursToRun: 720,
        storageCapacity: 100,
        serverName: 'web-server-01',
        environment: 'production',
        owner: 'IT Team'
      }

      expect(row.serverName).toBe('web-server-01')
      expect(row.environment).toBe('production')
      expect(row.owner).toBe('IT Team')
    })

    it('should allow partial ColumnMapping', () => {
      const partialMapping: Partial<ColumnMapping> = {
        region: 'Location'
      }

      expect(partialMapping.region).toBe('Location')
      expect(partialMapping.os).toBeUndefined()
    })
  })
}) 