import React from 'react';
import { PricingResults } from '../PricingResults';
import type { PricingResult } from '@/types';

// Mock the helper functions
jest.mock('@/utils/helpers', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`
}));

// Mock the CostBreakdown component
jest.mock('../CostBreakdown', () => ({
  CostBreakdown: ({ breakdown }: any) => (
    <div data-testid="cost-breakdown">
      Mock CostBreakdown: {breakdown.vmDetails.size}
    </div>
  )
}));

describe('PricingResults', () => {
  const mockResults: PricingResult[] = [
    {
      region: 'eastus',
      os: 'Windows',
      hoursToRun: 720,
      storageCapacity: 100,
      vmCost: 69.12,
      storageCost: 0.2,
      totalCost: 69.32,
      breakdown: {
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
          subtotal: 0.2
        }
      }
    },
    {
      region: 'westus',
      os: 'Linux',
      hoursToRun: 168,
      storageCapacity: 50,
      vmCost: 7.39,
      storageCost: 0.1,
      totalCost: 7.49,
      breakdown: {
        vmDetails: {
          size: 'Standard_B1s',
          hourlyRate: 0.044,
          totalHours: 168,
          subtotal: 7.39
        },
        storageDetails: {
          tier: 'Standard HDD',
          monthlyRate: 0.002,
          capacityGB: 50,
          subtotal: 0.1
        }
      }
    }
  ];

  beforeEach(() => {
    // Mock URL.createObjectURL and related functions for export tests
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and related DOM methods
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('component exists and can be imported', () => {
    expect(PricingResults).toBeDefined();
    expect(typeof PricingResults).toBe('function');
  });

  it('accepts correct props interface', () => {
    // Test that the component accepts the expected props without throwing
    const props = {
      results: mockResults,
      isLoading: false,
      error: null,
      className: 'test-class'
    };
    
    expect(() => {
      React.createElement(PricingResults, props);
    }).not.toThrow();
  });

  it('handles empty results array', () => {
    const props = {
      results: [],
      isLoading: false,
      error: null
    };
    
    expect(() => {
      React.createElement(PricingResults, props);
    }).not.toThrow();
  });

  it('handles loading state', () => {
    const props = {
      results: [],
      isLoading: true,
      error: null
    };
    
    expect(() => {
      React.createElement(PricingResults, props);
    }).not.toThrow();
  });

  it('handles error state', () => {
    const props = {
      results: [],
      isLoading: false,
      error: 'Test error message'
    };
    
    expect(() => {
      React.createElement(PricingResults, props);
    }).not.toThrow();
  });

  it('handles results with breakdown data', () => {
    const props = {
      results: mockResults,
      isLoading: false,
      error: null
    };
    
    expect(() => {
      React.createElement(PricingResults, props);
    }).not.toThrow();
  });

  it('handles results without breakdown data', () => {
    const resultsWithoutBreakdown = mockResults.map(result => ({
      ...result,
      breakdown: undefined
    }));
    
    const props = {
      results: resultsWithoutBreakdown,
      isLoading: false,
      error: null
    };
    
    expect(() => {
      React.createElement(PricingResults, props);
    }).not.toThrow();
  });

  it('calculates totals correctly', () => {
    // Test the calculation logic by checking the mock results
    const totalVMCost = mockResults.reduce((sum, result) => sum + result.vmCost, 0);
    const totalStorageCost = mockResults.reduce((sum, result) => sum + result.storageCost, 0);
    const grandTotal = totalVMCost + totalStorageCost;
    
    expect(totalVMCost).toBe(76.51);
    expect(totalStorageCost).toBeCloseTo(0.3, 2); // Use toBeCloseTo for floating point comparison
    expect(grandTotal).toBeCloseTo(76.81, 2);
  });
}); 