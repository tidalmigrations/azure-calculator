import {
  AZURE_REGIONS,
  OS_TYPES,
  STORAGE_TYPES,
  SUPPORTED_FILE_TYPES,
  API_CONFIG,
  DEFAULTS
} from '../constants'

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
      expect(STORAGE_TYPES.PREMIUM_SSD).toBe('Premium SSD')
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
  })

  describe('API_CONFIG', () => {
    it('should have valid Azure API configuration', () => {
      expect(API_CONFIG.BASE_URL).toBe('https://prices.azure.com/api/retail/prices')
      expect(API_CONFIG.VERSION).toBe('2023-01-01-preview')
      expect(API_CONFIG.CACHE_DURATION).toBe(3600000)
      expect(API_CONFIG.MAX_RETRIES).toBe(3)
      expect(API_CONFIG.RETRY_DELAY).toBe(1000)
    })

    it('should have reasonable cache duration', () => {
      expect(API_CONFIG.CACHE_DURATION).toBeGreaterThan(0)
      expect(API_CONFIG.CACHE_DURATION).toBeLessThanOrEqual(86400000) // 24 hours
    })

    it('should have reasonable retry configuration', () => {
      expect(API_CONFIG.MAX_RETRIES).toBeGreaterThan(0)
      expect(API_CONFIG.MAX_RETRIES).toBeLessThanOrEqual(10)
      expect(API_CONFIG.RETRY_DELAY).toBeGreaterThan(0)
    })
  })

  describe('DEFAULTS', () => {
    it('should have valid default values', () => {
      expect(DEFAULTS.REGION).toBe('eastus')
      expect(DEFAULTS.VM_SIZE).toBe('Standard_B2s')
      expect(DEFAULTS.STORAGE_TYPE).toBe(STORAGE_TYPES.STANDARD_HDD)
      expect(DEFAULTS.CURRENCY).toBe('USD')
    })

    it('should use valid Azure region as default', () => {
      expect(Object.keys(AZURE_REGIONS)).toContain(DEFAULTS.REGION)
    })
  })
}) 