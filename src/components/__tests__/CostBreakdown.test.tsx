import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CostBreakdown } from '../CostBreakdown';
import type { CostBreakdown as CostBreakdownType } from '@/types';

// Mock the helper functions
jest.mock('@/utils/helpers', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`
}));

describe('CostBreakdown', () => {
  const mockBreakdown: CostBreakdownType = {
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
  };

  it('renders cost breakdown details correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    // Check main title
    expect(screen.getByText('Cost Breakdown Details')).toBeInTheDocument();
    
    // Check VM section
    expect(screen.getByText('Virtual Machine')).toBeInTheDocument();
    expect(screen.getByText('Standard_B2s')).toBeInTheDocument();
    expect(screen.getByText('$0.10/hour')).toBeInTheDocument();
    expect(screen.getByText('720')).toBeInTheDocument();
    
    // Check Storage section
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Standard HDD')).toBeInTheDocument();
    expect(screen.getByText('$0.00/GB/month')).toBeInTheDocument();
    expect(screen.getByText('100 GB')).toBeInTheDocument();
  });

  it('displays VM cost calculation correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    // Check VM subtotal
    expect(screen.getByText('$69.12')).toBeInTheDocument();
    
    // Check calculation formula
    expect(screen.getByText('$0.10 × 720 hours = $69.12')).toBeInTheDocument();
  });

  it('displays storage cost calculation correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    // Check storage subtotal
    expect(screen.getByText('$0.20')).toBeInTheDocument();
    
    // Check calculation formula
    expect(screen.getByText('$0.00 × 100 GB = $0.20')).toBeInTheDocument();
  });

  it('calculates and displays total cost correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    // Check total cost (VM + Storage)
    const totalCost = 69.12 + 0.2;
    expect(screen.getByText(`$${totalCost.toFixed(2)}`)).toBeInTheDocument();
    
    // Check breakdown in total section
    expect(screen.getByText('$69.12 + $0.20')).toBeInTheDocument();
  });

  it('displays cost distribution percentages correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    const total = 69.12 + 0.2;
    const vmPercentage = Math.round((69.12 / total) * 100);
    const storagePercentage = Math.round((0.2 / total) * 100);
    
    expect(screen.getByText(`VM: ${vmPercentage}%`)).toBeInTheDocument();
    expect(screen.getByText(`Storage: ${storagePercentage}%`)).toBeInTheDocument();
  });

  it('displays pricing notes correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    expect(screen.getByText('Pricing Notes')).toBeInTheDocument();
    expect(screen.getByText('• Prices are estimates based on Azure Retail Prices API')).toBeInTheDocument();
    expect(screen.getByText('• Actual costs may vary based on usage patterns and discounts')).toBeInTheDocument();
    expect(screen.getByText('• Storage costs assume standard tier pricing')).toBeInTheDocument();
    expect(screen.getByText('• VM costs are based on pay-as-you-go pricing')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} className="custom-class" />);
    
    const container = screen.getByText('Cost Breakdown Details').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('handles large numbers correctly', () => {
    const largeBreakdown: CostBreakdownType = {
      vmDetails: {
        size: 'Standard_D16s_v3',
        hourlyRate: 0.768,
        totalHours: 8760, // Full year
        subtotal: 6729.28
      },
      storageDetails: {
        tier: 'Premium SSD',
        monthlyRate: 0.125,
        capacityGB: 1000,
        subtotal: 125.0
      }
    };

    render(<CostBreakdown breakdown={largeBreakdown} />);
    
    // Check that large numbers are formatted correctly
    expect(screen.getByText('8,760')).toBeInTheDocument();
    expect(screen.getByText('$6,729.28')).toBeInTheDocument();
    expect(screen.getByText('1,000 GB')).toBeInTheDocument();
  });

  it('handles zero costs correctly', () => {
    const zeroBreakdown: CostBreakdownType = {
      vmDetails: {
        size: 'Standard_B1s',
        hourlyRate: 0.0,
        totalHours: 0,
        subtotal: 0.0
      },
      storageDetails: {
        tier: 'Standard HDD',
        monthlyRate: 0.0,
        capacityGB: 0,
        subtotal: 0.0
      }
    };

    render(<CostBreakdown breakdown={zeroBreakdown} />);
    
    // Check that zero values are displayed correctly
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('0 GB')).toBeInTheDocument();
  });

  it('renders cost distribution chart with correct styling', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    // Check that cost distribution section exists
    expect(screen.getByText('Cost Distribution')).toBeInTheDocument();
    
    // The chart is rendered as divs with background colors
    const chartContainer = screen.getByText('Cost Distribution').nextElementSibling;
    expect(chartContainer).toHaveClass('flex', 'rounded-lg', 'overflow-hidden', 'h-2');
  });

  it('displays VM and storage icons correctly', () => {
    render(<CostBreakdown breakdown={mockBreakdown} />);
    
    // Check that sections have proper structure (icons are SVGs)
    const vmSection = screen.getByText('Virtual Machine').closest('div');
    const storageSection = screen.getByText('Storage').closest('div');
    
    expect(vmSection).toBeInTheDocument();
    expect(storageSection).toBeInTheDocument();
  });

  it('handles decimal precision correctly', () => {
    const precisionBreakdown: CostBreakdownType = {
      vmDetails: {
        size: 'Standard_B1s',
        hourlyRate: 0.0104,
        totalHours: 100,
        subtotal: 1.04
      },
      storageDetails: {
        tier: 'Standard HDD',
        monthlyRate: 0.0015,
        capacityGB: 50,
        subtotal: 0.075
      }
    };

    render(<CostBreakdown breakdown={precisionBreakdown} />);
    
    // Check that small decimal values are formatted correctly
    expect(screen.getByText('$0.01/hour')).toBeInTheDocument();
    expect(screen.getByText('$0.00/GB/month')).toBeInTheDocument();
  });
}); 