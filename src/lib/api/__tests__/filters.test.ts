import { 
  buildFilter, 
  buildVMFilter, 
  buildStorageFilter, 
  normalizeRegionName, 
  getAvailableRegions,
  PriceFilters 
} from '../filters';

describe('Azure API Filters', () => {
  describe('buildFilter', () => {
    it('should build filter with service name', () => {
      const filters: PriceFilters = { serviceName: 'Virtual Machines' };
      const result = buildFilter(filters);
      expect(result).toBe("serviceName eq 'Virtual Machines'");
    });

    it('should build filter with multiple criteria', () => {
      const filters: PriceFilters = {
        serviceName: 'Virtual Machines',
        region: 'eastus',
        priceType: 'Consumption'
      };
      const result = buildFilter(filters);
      expect(result).toContain("serviceName eq 'Virtual Machines'");
      expect(result).toContain("armRegionName eq 'eastus'");
      expect(result).toContain("priceType eq 'Consumption'");
    });

    it('should build filter with Windows OS', () => {
      const filters: PriceFilters = { os: 'windows' };
      const result = buildFilter(filters);
      expect(result).toContain("contains(tolower(productName), 'windows')");
    });

    it('should build filter with Linux OS', () => {
      const filters: PriceFilters = { os: 'linux' };
      const result = buildFilter(filters);
      expect(result).toContain("contains(tolower(productName), 'linux')");
    });

    it('should build filter with storage type', () => {
      const filters: PriceFilters = { storageType: 'premium-ssd' };
      const result = buildFilter(filters);
      expect(result).toContain("contains(tolower(productName), 'premium ssd')");
    });

    it('should throw error when no filters provided', () => {
      expect(() => buildFilter({})).toThrow('At least one filter must be provided');
    });
  });

  describe('normalizeRegionName', () => {
    it('should normalize common region names', () => {
      expect(normalizeRegionName('East US')).toBe('eastus');
      expect(normalizeRegionName('West Europe')).toBe('westeurope');
      expect(normalizeRegionName('Southeast Asia')).toBe('southeastasia');
    });

    it('should handle already normalized names', () => {
      expect(normalizeRegionName('eastus')).toBe('eastus');
      expect(normalizeRegionName('westeurope')).toBe('westeurope');
    });

    it('should handle unknown regions by removing spaces', () => {
      expect(normalizeRegionName('Custom Region Name')).toBe('customregionname');
    });

    it('should handle extra whitespace', () => {
      expect(normalizeRegionName('  East US  ')).toBe('eastus');
    });
  });

  describe('buildVMFilter', () => {
    it('should build VM filter for Windows', () => {
      const result = buildVMFilter('eastus', 'windows');
      expect(result).toContain("serviceName eq 'Virtual Machines'");
      expect(result).toContain("armRegionName eq 'eastus'");
      expect(result).toContain("priceType eq 'Consumption'");
      expect(result).toContain("contains(tolower(productName), 'windows')");
    });

    it('should build VM filter for Linux', () => {
      const result = buildVMFilter('westus', 'linux');
      expect(result).toContain("serviceName eq 'Virtual Machines'");
      expect(result).toContain("armRegionName eq 'westus'");
      expect(result).toContain("contains(tolower(productName), 'linux')");
    });

    it('should include SKU filter when provided', () => {
      const result = buildVMFilter('eastus', 'linux', 'Standard_D2s_v3');
      expect(result).toContain("contains(tolower(armSkuName), 'standard_d2s_v3')");
    });
  });

  describe('buildStorageFilter', () => {
    it('should build storage filter with default HDD', () => {
      const result = buildStorageFilter('eastus');
      expect(result).toContain("serviceName eq 'Storage'");
      expect(result).toContain("armRegionName eq 'eastus'");
      expect(result).toContain("priceType eq 'Consumption'");
      expect(result).toContain("contains(tolower(productName), 'standard hdd')");
    });

    it('should build storage filter for SSD', () => {
      const result = buildStorageFilter('westus', 'standard-ssd');
      expect(result).toContain("contains(tolower(productName), 'standard ssd')");
    });

    it('should build storage filter for premium SSD', () => {
      const result = buildStorageFilter('eastus', 'premium-ssd');
      expect(result).toContain("contains(tolower(productName), 'premium ssd')");
    });
  });

  describe('getAvailableRegions', () => {
    it('should return array of regions with name and displayName', () => {
      const regions = getAvailableRegions();
      expect(Array.isArray(regions)).toBe(true);
      expect(regions.length).toBeGreaterThan(0);
      
      const firstRegion = regions[0];
      expect(firstRegion).toHaveProperty('name');
      expect(firstRegion).toHaveProperty('displayName');
      expect(typeof firstRegion.name).toBe('string');
      expect(typeof firstRegion.displayName).toBe('string');
    });

    it('should include major Azure regions', () => {
      const regions = getAvailableRegions();
      const regionNames = regions.map(r => r.name);
      
      expect(regionNames).toContain('eastus');
      expect(regionNames).toContain('westeurope');
      expect(regionNames).toContain('southeastasia');
    });
  });
}); 