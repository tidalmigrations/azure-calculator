import {
  formatCurrency,
  formatNumber,
  detectOSType,
  isValidRegion,
  normalizeRegion,
  isPositiveNumber,
  safeToNumber,
  generateCacheKey,
  debounce
} from '../helpers'

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
}) 