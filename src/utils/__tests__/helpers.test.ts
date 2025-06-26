import {
  formatCurrency,
  formatNumber,
  detectOSType,
  isValidRegion,
  normalizeRegion,
  isPositiveNumber,
  safeToNumber,
  generateCacheKey,
  debounce,
  detectColumnMappings
} from '../helpers'

import {
  AZURE_REGIONS,
  OS_TYPES,
  STORAGE_TYPES,
  SUPPORTED_FILE_TYPES,
  API_CONFIG,
  DEFAULTS
} from '../constants'

describe('Helper Functions', () => {
  describe('formatCurrency', () => {
    it('should format numbers as USD currency by default', () => {
      expect(formatCurrency(123.45)).toBe('$123.45')
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format numbers with different currencies', () => {
      expect(formatCurrency(123.45, 'EUR')).toBe('€123.45')
      expect(formatCurrency(123.45, 'CAD')).toBe('CA$123.45')
    })

    it('should handle large numbers', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1234567)).toBe('1,234,567')
      expect(formatNumber(123)).toBe('123')
    })

    it('should handle decimal numbers', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56')
    })
  })

  describe('detectOSType', () => {
    it('should detect Windows OS', () => {
      expect(detectOSType('Windows Server 2019')).toBe('windows')
      expect(detectOSType('Microsoft Windows Server 2016')).toBe('windows')
      expect(detectOSType('Win 10')).toBe('windows')
      expect(detectOSType('2k8r2')).toBe('windows')
    })

    it('should detect Linux OS', () => {
      expect(detectOSType('Ubuntu 20.04')).toBe('linux')
      expect(detectOSType('CentOS 7')).toBe('linux')
      expect(detectOSType('Red Hat Enterprise Linux')).toBe('linux')
      expect(detectOSType('Debian GNU/Linux')).toBe('linux')
    })

    it('should default to Linux for unknown OS', () => {
      expect(detectOSType('Unknown OS')).toBe('linux')
      expect(detectOSType('')).toBe('linux')
      expect(detectOSType('Some random string')).toBe('linux')
    })

    it('should be case insensitive', () => {
      expect(detectOSType('WINDOWS SERVER 2019')).toBe('windows')
      expect(detectOSType('ubuntu linux')).toBe('linux')
    })
  })

  describe('isValidRegion', () => {
    it('should validate correct Azure regions', () => {
      expect(isValidRegion('eastus')).toBe(true)
      expect(isValidRegion('westeurope')).toBe(true)
      expect(isValidRegion('canadacentral')).toBe(true)
    })

    it('should reject invalid regions', () => {
      expect(isValidRegion('invalid-region')).toBe(false)
      expect(isValidRegion('')).toBe(false)
      expect(isValidRegion('random')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isValidRegion('EASTUS')).toBe(true)
      expect(isValidRegion('WestEurope')).toBe(true)
    })
  })

  describe('normalizeRegion', () => {
    it('should normalize region names', () => {
      expect(normalizeRegion('East US')).toBe('eastus')
      expect(normalizeRegion('West Europe')).toBe('westeurope')
      expect(normalizeRegion('Canada Central')).toBe('canadacentral')
    })

    it('should handle already normalized regions', () => {
      expect(normalizeRegion('eastus')).toBe('eastus')
      expect(normalizeRegion('westeurope')).toBe('westeurope')
    })

    it('should handle case variations', () => {
      expect(normalizeRegion('EAST US')).toBe('eastus')
      expect(normalizeRegion('east us')).toBe('eastus')
    })

    it('should trim whitespace', () => {
      expect(normalizeRegion('  East US  ')).toBe('eastus')
    })

    it('should return original if no mapping found', () => {
      expect(normalizeRegion('unknown-region')).toBe('unknown-region')
    })
  })

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true)
      expect(isPositiveNumber(123.45)).toBe(true)
      expect(isPositiveNumber('123')).toBe(true)
      expect(isPositiveNumber('45.67')).toBe(true)
    })

    it('should return false for non-positive numbers', () => {
      expect(isPositiveNumber(0)).toBe(false)
      expect(isPositiveNumber(-1)).toBe(false)
      expect(isPositiveNumber('-123')).toBe(false)
    })

    it('should return false for non-numeric values', () => {
      expect(isPositiveNumber('abc')).toBe(false)
      expect(isPositiveNumber('')).toBe(false)
      expect(isPositiveNumber(null)).toBe(false)
      expect(isPositiveNumber(undefined)).toBe(false)
    })
  })

  describe('safeToNumber', () => {
    it('should convert valid numbers', () => {
      expect(safeToNumber('123')).toBe(123)
      expect(safeToNumber('45.67')).toBe(45.67)
      expect(safeToNumber(123)).toBe(123)
    })

    it('should return default value for invalid inputs', () => {
      expect(safeToNumber('abc')).toBe(0)
      expect(safeToNumber('')).toBe(0)
      expect(safeToNumber(null)).toBe(0)
      expect(safeToNumber(undefined)).toBe(0)
    })

    it('should use custom default value', () => {
      expect(safeToNumber('abc', 100)).toBe(100)
      expect(safeToNumber('', -1)).toBe(-1)
    })
  })

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const params1 = { region: 'eastus', os: 'windows' }
      const params2 = { os: 'windows', region: 'eastus' }
      
      expect(generateCacheKey(params1)).toBe(generateCacheKey(params2))
    })

    it('should generate different keys for different params', () => {
      const params1 = { region: 'eastus', os: 'windows' }
      const params2 = { region: 'westus', os: 'windows' }
      
      expect(generateCacheKey(params1)).not.toBe(generateCacheKey(params2))
    })

    it('should handle empty params', () => {
      expect(generateCacheKey({})).toBe('')
    })

    it('should sort parameters alphabetically', () => {
      const params = { zebra: 'z', alpha: 'a', beta: 'b' }
      const key = generateCacheKey(params)
      
      expect(key).toBe('alpha=a&beta=b&zebra=z')
    })
  })

  describe('debounce', () => {
    jest.useFakeTimers()

    afterEach(() => {
      jest.clearAllTimers()
    })

    it('should delay function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should cancel previous calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments correctly', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1', 'arg2')
      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('detectColumnMappings', () => {
    it('should detect exact column matches', () => {
      const headers = ['Region', 'Operating System', 'Hours to Run', 'Storage Capacity']
      const mapping = detectColumnMappings(headers)

      expect(mapping.region).toBe('Region')
      expect(mapping.os).toBe('Operating System')
      expect(mapping.hoursToRun).toBe('Hours to Run')
      expect(mapping.storageCapacity).toBe('Storage Capacity')
    })

    it('should detect partial matches', () => {
      const headers = ['Location', 'OS', 'Runtime', 'Storage']
      const mapping = detectColumnMappings(headers)

      expect(mapping.region).toBe('Location')
      expect(mapping.os).toBe('OS')
      expect(mapping.hoursToRun).toBe('Runtime')
      expect(mapping.storageCapacity).toBe('Storage')
    })

    it('should handle case-insensitive matching', () => {
      const headers = ['REGION', 'operating system version', 'Hours', 'storage allocated (gb)']
      const mapping = detectColumnMappings(headers)

      expect(mapping.region).toBe('REGION')
      expect(mapping.os).toBe('operating system version')
      expect(mapping.hoursToRun).toBe('Hours')
      expect(mapping.storageCapacity).toBe('storage allocated (gb)')
    })

    it('should return null for unmatched fields', () => {
      const headers = ['Name', 'Description', 'Owner']
      const mapping = detectColumnMappings(headers)

      expect(mapping.region).toBe(null)
      expect(mapping.os).toBe(null)
      expect(mapping.hoursToRun).toBe(null)
      expect(mapping.storageCapacity).toBe(null)
    })

    it('should handle real-world server data headers', () => {
      const headers = [
        'Application Group', 'Server Hostname', 'RAM Allocated (GB)', 
        'Storage Allocated (GB)', 'Logical CPU Count', 'Operating System Version'
      ]
      const mapping = detectColumnMappings(headers)

      expect(mapping.os).toBe('Operating System Version')
      expect(mapping.storageCapacity).toBe('Storage Allocated (GB)')
      // These might not be detected without explicit region/hours columns
      expect(mapping.region).toBe(null)
      expect(mapping.hoursToRun).toBe(null)
    })

    it('should prefer more specific matches', () => {
      const headers = ['Storage', 'Storage Capacity', 'Storage Allocated (GB)']
      const mapping = detectColumnMappings(headers)

      // Should pick the most specific match
      expect(mapping.storageCapacity).toBe('Storage Allocated (GB)')
    })
  })
})

describe('Constants', () => {
  describe('AZURE_REGIONS', () => {
    it('should contain major Azure regions', () => {
      expect(AZURE_REGIONS.eastus).toBe('East US')
      expect(AZURE_REGIONS.westeurope).toBe('West Europe')
      expect(AZURE_REGIONS.canadacentral).toBe('Canada Central')
      expect(AZURE_REGIONS.japaneast).toBe('Japan East')
    })

    it('should have at least 30 regions', () => {
      expect(Object.keys(AZURE_REGIONS).length).toBeGreaterThanOrEqual(30)
    })

    it('should have consistent naming format', () => {
      Object.keys(AZURE_REGIONS).forEach(key => {
        // Region keys should be lowercase letters and numbers
        expect(key).toMatch(/^[a-z0-9]+$/)
        expect(AZURE_REGIONS[key as keyof typeof AZURE_REGIONS]).toMatch(/^[A-Z]/)
      })
    })
  })

  describe('OS_TYPES', () => {
    it('should define Windows and Linux OS types', () => {
      expect(OS_TYPES.WINDOWS).toBe('windows')
      expect(OS_TYPES.LINUX).toBe('linux')
    })

    it('should only have two OS types', () => {
      expect(Object.keys(OS_TYPES)).toHaveLength(2)
    })
  })

  describe('STORAGE_TYPES', () => {
    it('should define storage types', () => {
      expect(STORAGE_TYPES.STANDARD_HDD).toBe('Standard HDD')
      expect(STORAGE_TYPES.STANDARD_SSD).toBe('Standard SSD')
      expect(STORAGE_TYPES.PREMIUM_SSD).toBe('Premium SSD v2')
    })

    it('should have three storage types', () => {
      expect(Object.keys(STORAGE_TYPES)).toHaveLength(3)
    })
  })

  describe('SUPPORTED_FILE_TYPES', () => {
    it('should define supported file extensions', () => {
      expect(SUPPORTED_FILE_TYPES.CSV).toBe('.csv')
      expect(SUPPORTED_FILE_TYPES.EXCEL).toBe('.xlsx,.xls')
    })

    it('should have two file type categories', () => {
      expect(Object.keys(SUPPORTED_FILE_TYPES)).toHaveLength(2)
    })
  })

  describe('API_CONFIG', () => {
    it('should define API configuration', () => {
      expect(API_CONFIG.BASE_URL).toBe('https://prices.azure.com/api/retail/prices')
      expect(API_CONFIG.VERSION).toBe('2023-01-01-preview')
      expect(typeof API_CONFIG.CACHE_DURATION).toBe('number')
      expect(typeof API_CONFIG.MAX_RETRIES).toBe('number')
    })
  })

  describe('DEFAULTS', () => {
    it('should define default values', () => {
      expect(typeof DEFAULTS.REGION).toBe('string')
      expect(typeof DEFAULTS.VM_SIZE).toBe('string')
      expect(typeof DEFAULTS.STORAGE_TYPE).toBe('string')
      expect(typeof DEFAULTS.CURRENCY).toBe('string')
    })
  })
}) 