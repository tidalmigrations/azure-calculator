import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { 
  CalculatorProvider, 
  useCalculator
} from '../CalculatorContext';
import type { 
  FileUploadState, 
  ColumnMapping, 
  PricingResult, 
  ValidationError,
  ParsedSpreadsheet 
} from '@/types';

// Mock data for testing
const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });

const mockParsedData: ParsedSpreadsheet = {
  headers: ['hostname', 'region', 'os', 'hours', 'storage'],
  rows: [
    { hostname: 'server1', region: 'eastus', os: 'linux', hours: 24, storage: 100 },
    { hostname: 'server2', region: 'westus', os: 'windows', hours: 48, storage: 200 }
  ],
  hasHeaders: true
};

const mockColumnMapping: ColumnMapping = {
  region: 'region',
  os: 'os',
  hoursToRun: 'hours',
  storageCapacity: 'storage',
  hostname: 'hostname',
  cpuCount: null,
  ramCapacity: null,
  applicationGroup: null,
  matchType: null,
  confidenceScore: null,
  environment: null,
  fqdn: null,
  ipAddresses: null,
  vmFamily: null
};

const mockPricingResults: PricingResult[] = [
  {
    region: 'eastus',
    os: 'linux',
    hoursToRun: 24,
    storageCapacity: 100,
    vmCost: 50.0,
    storageCost: 10.0,
    totalCost: 60.0,
    hostname: 'server1'
  },
  {
    region: 'westus',
    os: 'windows',
    hoursToRun: 48,
    storageCapacity: 200,
    vmCost: 120.0,
    storageCost: 25.0,
    totalCost: 145.0,
    hostname: 'server2'
  }
];

const mockValidationError: ValidationError = {
  field: 'region',
  message: 'Region is required',
  value: null
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CalculatorProvider>{children}</CalculatorProvider>
);

// Test component to access context
const TestComponent: React.FC = () => {
  const context = useCalculator();
  return (
    <div>
      <div data-testid="current-step">{context.state.currentStep}</div>
      <div data-testid="is-calculating">{context.state.isCalculating.toString()}</div>
      <div data-testid="errors-count">{context.state.errors.length}</div>
      <div data-testid="has-file">{(!!context.state.uploadState.file).toString()}</div>
      <div data-testid="has-parsed-data">{(!!context.state.parsedData).toString()}</div>
      <div data-testid="has-pricing-results">{(!!context.state.pricingResults).toString()}</div>
    </div>
  );
};

describe('CalculatorContext', () => {
  describe('useCalculator hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useCalculator());
      }).toThrow('useCalculator must be used within a CalculatorProvider');

      console.error = originalError;
    });

    it('should provide context when used within provider', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      expect(result.current).toBeDefined();
      expect(result.current.state).toBeDefined();
      expect(result.current.dispatch).toBeDefined();
      expect(typeof result.current.setUploadState).toBe('function');
      expect(typeof result.current.setParsedData).toBe('function');
      expect(typeof result.current.setColumnMapping).toBe('function');
      expect(typeof result.current.setPricingResults).toBe('function');
      expect(typeof result.current.setIsCalculating).toBe('function');
      expect(typeof result.current.addError).toBe('function');
      expect(typeof result.current.clearErrors).toBe('function');
      expect(typeof result.current.resetState).toBe('function');
      expect(typeof result.current.goToStep).toBe('function');
      expect(typeof result.current.canProceedToStep).toBe('function');
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      const { state } = result.current;

      expect(state.currentStep).toBe('upload');
      expect(state.isCalculating).toBe(false);
      expect(state.parsedData).toBeNull();
      expect(state.pricingResults).toBeNull();
      expect(state.errors).toEqual([]);
      
      expect(state.uploadState).toEqual({
        isUploading: false,
        progress: 0,
        error: null,
        file: null,
        data: null,
        headers: []
      });

      expect(state.columnMapping).toEqual({
        region: null,
        os: null,
        hoursToRun: null,
        storageCapacity: null,
        hostname: null,
        cpuCount: null,
        ramCapacity: null,
        applicationGroup: null,
        matchType: null,
        confidenceScore: null,
        environment: null,
        fqdn: null,
        ipAddresses: null,
        vmFamily: null
      });
    });
  });

  describe('State Updates', () => {
    it('should update upload state', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      const newUploadState: Partial<FileUploadState> = {
        isUploading: true,
        progress: 50,
        file: mockFile
      };

      act(() => {
        result.current.setUploadState(newUploadState);
      });

      expect(result.current.state.uploadState.isUploading).toBe(true);
      expect(result.current.state.uploadState.progress).toBe(50);
      expect(result.current.state.uploadState.file).toBe(mockFile);
      expect(result.current.state.uploadState.error).toBeNull(); // Should preserve existing values
    });

    it('should set parsed data and update current step', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.setParsedData(mockParsedData);
      });

      expect(result.current.state.parsedData).toEqual(mockParsedData);
      expect(result.current.state.currentStep).toBe('mapping');
    });

    it('should clear parsed data and reset step to upload', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      // First set data
      act(() => {
        result.current.setParsedData(mockParsedData);
      });

      // Then clear it
      act(() => {
        result.current.setParsedData(null);
      });

      expect(result.current.state.parsedData).toBeNull();
      expect(result.current.state.currentStep).toBe('upload');
    });

    it('should set column mapping', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.setColumnMapping(mockColumnMapping);
      });

      expect(result.current.state.columnMapping).toEqual(mockColumnMapping);
    });

    it('should set pricing results and update step', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.setPricingResults(mockPricingResults);
      });

      expect(result.current.state.pricingResults).toEqual(mockPricingResults);
      expect(result.current.state.currentStep).toBe('results');
      expect(result.current.state.isCalculating).toBe(false);
    });

    it('should clear pricing results and update step', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      // First set results
      act(() => {
        result.current.setPricingResults(mockPricingResults);
      });

      // Then clear them
      act(() => {
        result.current.setPricingResults(null);
      });

      expect(result.current.state.pricingResults).toBeNull();
      expect(result.current.state.currentStep).toBe('calculate');
    });

    it('should set calculating state', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.setIsCalculating(true);
      });

      expect(result.current.state.isCalculating).toBe(true);
      expect(result.current.state.currentStep).toBe('calculate');

      act(() => {
        result.current.setIsCalculating(false);
      });

      expect(result.current.state.isCalculating).toBe(false);
    });

    it('should add errors', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.addError(mockValidationError);
      });

      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0]).toEqual(mockValidationError);

      const secondError: ValidationError = {
        field: 'os',
        message: 'OS is required',
        value: null
      };

      act(() => {
        result.current.addError(secondError);
      });

      expect(result.current.state.errors).toHaveLength(2);
      expect(result.current.state.errors[1]).toEqual(secondError);
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      // Add some errors first
      act(() => {
        result.current.addError(mockValidationError);
      });

      expect(result.current.state.errors).toHaveLength(1);

      // Clear errors
      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.state.errors).toHaveLength(0);
    });

    it('should reset state to initial values', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      // Modify state
      act(() => {
        result.current.setUploadState({ file: mockFile, isUploading: true });
        result.current.setParsedData(mockParsedData);
        result.current.setColumnMapping(mockColumnMapping);
        result.current.setPricingResults(mockPricingResults);
        result.current.addError(mockValidationError);
      });

      // Verify state is modified
      expect(result.current.state.uploadState.file).toBe(mockFile);
      expect(result.current.state.parsedData).toEqual(mockParsedData);
      expect(result.current.state.errors).toHaveLength(1);

      // Reset state
      act(() => {
        result.current.resetState();
      });

      // Verify state is reset
      expect(result.current.state.currentStep).toBe('upload');
      expect(result.current.state.uploadState.file).toBeNull();
      expect(result.current.state.parsedData).toBeNull();
      expect(result.current.state.pricingResults).toBeNull();
      expect(result.current.state.errors).toHaveLength(0);
    });
  });

  describe('Navigation Logic', () => {
    describe('canProceedToStep', () => {
      it('should always allow proceeding to upload step', () => {
        const { result } = renderHook(() => useCalculator(), {
          wrapper: TestWrapper
        });

        expect(result.current.canProceedToStep('upload')).toBe(true);
      });

      it('should allow proceeding to mapping step when parsed data exists and no upload error', () => {
        const { result } = renderHook(() => useCalculator(), {
          wrapper: TestWrapper
        });

        // Without parsed data
        expect(result.current.canProceedToStep('mapping')).toBe(false);

        // With parsed data but with upload error
        act(() => {
          result.current.setParsedData(mockParsedData);
          result.current.setUploadState({ error: 'Upload failed' });
        });

        expect(result.current.canProceedToStep('mapping')).toBe(false);

        // With parsed data and no upload error
        act(() => {
          result.current.setUploadState({ error: null });
        });

        expect(result.current.canProceedToStep('mapping')).toBe(true);
      });

      it('should allow proceeding to calculate step when required column mappings are set', () => {
        const { result } = renderHook(() => useCalculator(), {
          wrapper: TestWrapper
        });

        // Without required mappings
        expect(result.current.canProceedToStep('calculate')).toBe(false);

        // With partial mappings
        act(() => {
          result.current.setColumnMapping({
            ...mockColumnMapping,
            region: 'region',
            os: null // Missing required field
          });
        });

        expect(result.current.canProceedToStep('calculate')).toBe(false);

        // With all required mappings (hostname is optional)
        act(() => {
          result.current.setColumnMapping({
            ...mockColumnMapping,
            hostname: null // Hostname is optional
          });
        });

        expect(result.current.canProceedToStep('calculate')).toBe(true);
      });

      it('should allow proceeding to results step when pricing results exist', () => {
        const { result } = renderHook(() => useCalculator(), {
          wrapper: TestWrapper
        });

        // Without results
        expect(result.current.canProceedToStep('results')).toBe(false);

        // With results
        act(() => {
          result.current.setPricingResults(mockPricingResults);
        });

        expect(result.current.canProceedToStep('results')).toBe(true);
      });
    });

    describe('goToStep', () => {
      it('should execute without error when called', () => {
        const { result } = renderHook(() => useCalculator(), {
          wrapper: TestWrapper
        });

        // The goToStep function should execute without throwing an error
        expect(() => {
          act(() => {
            result.current.goToStep('mapping');
          });
        }).not.toThrow();

        // Verify that the function exists and is callable
        expect(typeof result.current.goToStep).toBe('function');
      });
    });
  });

  describe('Provider Integration', () => {
    it('should render children and provide context', () => {
      render(
        <CalculatorProvider>
          <TestComponent />
        </CalculatorProvider>
      );

      expect(screen.getByTestId('current-step')).toHaveTextContent('upload');
      expect(screen.getByTestId('is-calculating')).toHaveTextContent('false');
      expect(screen.getByTestId('errors-count')).toHaveTextContent('0');
      expect(screen.getByTestId('has-file')).toHaveTextContent('false');
      expect(screen.getByTestId('has-parsed-data')).toHaveTextContent('false');
      expect(screen.getByTestId('has-pricing-results')).toHaveTextContent('false');
    });

    it('should update UI when context state changes', () => {
      const TestUpdatingComponent: React.FC = () => {
        const { setUploadState, setParsedData, addError } = useCalculator();
        
        return (
          <div>
            <TestComponent />
            <button 
              onClick={() => setUploadState({ file: mockFile })}
              data-testid="set-file"
            >
              Set File
            </button>
            <button 
              onClick={() => setParsedData(mockParsedData)}
              data-testid="set-parsed-data"
            >
              Set Parsed Data
            </button>
            <button 
              onClick={() => addError(mockValidationError)}
              data-testid="add-error"
            >
              Add Error
            </button>
          </div>
        );
      };

      render(
        <CalculatorProvider>
          <TestUpdatingComponent />
        </CalculatorProvider>
      );

      // Initial state
      expect(screen.getByTestId('has-file')).toHaveTextContent('false');
      expect(screen.getByTestId('has-parsed-data')).toHaveTextContent('false');
      expect(screen.getByTestId('errors-count')).toHaveTextContent('0');

      // Update file
      act(() => {
        screen.getByTestId('set-file').click();
      });

      expect(screen.getByTestId('has-file')).toHaveTextContent('true');

      // Update parsed data
      act(() => {
        screen.getByTestId('set-parsed-data').click();
      });

      expect(screen.getByTestId('has-parsed-data')).toHaveTextContent('true');
      expect(screen.getByTestId('current-step')).toHaveTextContent('mapping');

      // Add error
      act(() => {
        screen.getByTestId('add-error').click();
      });

      expect(screen.getByTestId('errors-count')).toHaveTextContent('1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid state updates', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      act(() => {
        // Multiple rapid updates
        result.current.setIsCalculating(true);
        result.current.setUploadState({ progress: 25 });
        result.current.setUploadState({ progress: 50 });
        result.current.setUploadState({ progress: 75 });
        result.current.setIsCalculating(false);
      });

      expect(result.current.state.isCalculating).toBe(false);
      expect(result.current.state.uploadState.progress).toBe(75);
    });

    it('should handle setting same state multiple times', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.setParsedData(mockParsedData);
        result.current.setParsedData(mockParsedData);
        result.current.setParsedData(mockParsedData);
      });

      expect(result.current.state.parsedData).toEqual(mockParsedData);
      expect(result.current.state.currentStep).toBe('mapping');
    });

    it('should preserve state references for unchanged values', () => {
      const { result } = renderHook(() => useCalculator(), {
        wrapper: TestWrapper
      });

      const initialColumnMapping = result.current.state.columnMapping;

      act(() => {
        result.current.setUploadState({ progress: 50 });
      });

      // Column mapping reference should be preserved since it wasn't changed
      expect(result.current.state.columnMapping).toBe(initialColumnMapping);
    });
  });
});