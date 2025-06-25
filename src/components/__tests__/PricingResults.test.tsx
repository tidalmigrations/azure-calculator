import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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

  it('renders loading state correctly', () => {
    render(<PricingResults results={[]} isLoading={true} />);
    
    expect(screen.getByText('Calculating Azure costs...')).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to calculate costs';
    render(<PricingResults results={[]} error={errorMessage} />);
    
    expect(screen.getByText('Calculation Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    render(<PricingResults results={[]} />);
    
    expect(screen.getByText('No pricing results available')).toBeInTheDocument();
  });

  it('renders pricing results correctly', () => {
    render(<PricingResults results={mockResults} />);
    
    // Check summary cards
    expect(screen.getByText('Total VM Costs')).toBeInTheDocument();
    expect(screen.getByText('Total Storage Costs')).toBeInTheDocument();
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    
    // Check calculated totals
    expect(screen.getByText('$76.51')).toBeInTheDocument(); // Total VM cost
    expect(screen.getByText('$0.30')).toBeInTheDocument(); // Total storage cost
    expect(screen.getByText('$76.81')).toBeInTheDocument(); // Grand total
    
    // Check table headers
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getByText('OS')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Storage (GB)')).toBeInTheDocument();
    
    // Check data rows
    expect(screen.getByText('eastus')).toBeInTheDocument();
    expect(screen.getByText('westus')).toBeInTheDocument();
    expect(screen.getByText('720')).toBeInTheDocument();
    expect(screen.getByText('168')).toBeInTheDocument();
  });

  it('displays OS badges with correct styling', () => {
    render(<PricingResults results={mockResults} />);
    
    const windowsBadge = screen.getByText('Windows');
    const linuxBadge = screen.getByText('Linux');
    
    expect(windowsBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(linuxBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('shows and hides cost breakdown details', () => {
    render(<PricingResults results={mockResults} />);
    
    const showDetailsButtons = screen.getAllByText('Show Details');
    expect(showDetailsButtons).toHaveLength(2);
    
    // Click first "Show Details" button
    fireEvent.click(showDetailsButtons[0]);
    
    // Check that breakdown is shown
    expect(screen.getByTestId('cost-breakdown')).toBeInTheDocument();
    expect(screen.getByText('Mock CostBreakdown: Standard_B2s')).toBeInTheDocument();
    
    // Button text should change to "Hide Details"
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
    
    // Click "Hide Details" to hide breakdown
    fireEvent.click(screen.getByText('Hide Details'));
    
    // Breakdown should be hidden
    expect(screen.queryByTestId('cost-breakdown')).not.toBeInTheDocument();
  });

  it('handles CSV export correctly', () => {
    render(<PricingResults results={mockResults} />);
    
    const csvButton = screen.getByText('📊 Export CSV');
    fireEvent.click(csvButton);
    
    // Check that Blob was created with correct content
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    
    // Check that download was triggered
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('handles JSON export correctly', () => {
    render(<PricingResults results={mockResults} />);
    
    const jsonButton = screen.getByText('📄 Export JSON');
    fireEvent.click(jsonButton);
    
    // Check that Blob was created with correct content
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    
    // Check that download was triggered
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('displays correct server count in table header', () => {
    render(<PricingResults results={mockResults} />);
    
    expect(screen.getByText('Detailed Cost Breakdown (2 servers)')).toBeInTheDocument();
  });

  it('formats numbers correctly in table', () => {
    render(<PricingResults results={mockResults} />);
    
    // Check formatted hours (with commas)
    expect(screen.getByText('720')).toBeInTheDocument();
    expect(screen.getByText('168')).toBeInTheDocument();
    
    // Check storage capacity
    expect(screen.getByText('100 GB')).toBeInTheDocument();
    expect(screen.getByText('50 GB')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<PricingResults results={mockResults} className="custom-class" />);
    
    const container = screen.getByText('Total VM Costs').closest('.space-y-6');
    expect(container).toHaveClass('custom-class');
  });

  it('handles missing breakdown data gracefully', () => {
    const resultsWithoutBreakdown: PricingResult[] = [
      {
        region: 'eastus',
        os: 'Windows',
        hoursToRun: 720,
        storageCapacity: 100,
        vmCost: 69.12,
        storageCost: 0.2,
        totalCost: 69.32
        // No breakdown property
      }
    ];
    
    render(<PricingResults results={resultsWithoutBreakdown} />);
    
    const showDetailsButton = screen.getByText('Show Details');
    fireEvent.click(showDetailsButton);
    
    // Should not show breakdown if it doesn't exist
    expect(screen.queryByTestId('cost-breakdown')).not.toBeInTheDocument();
  });
}); 