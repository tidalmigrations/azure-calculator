'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { 
  ApplicationData, 
  FileUploadState, 
  ColumnMapping, 
  PricingResult, 
  ValidationError,
  ParsedSpreadsheet 
} from '@/types';

// Action types
type CalculatorAction =
  | { type: 'SET_UPLOAD_STATE'; payload: Partial<FileUploadState> }
  | { type: 'SET_PARSED_DATA'; payload: ParsedSpreadsheet | null }
  | { type: 'SET_COLUMN_MAPPING'; payload: ColumnMapping }
  | { type: 'SET_PRICING_RESULTS'; payload: PricingResult[] | null }
  | { type: 'SET_IS_CALCULATING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: ValidationError }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'RESET_STATE' };

// Extended application state
interface CalculatorState extends ApplicationData {
  parsedData: ParsedSpreadsheet | null;
  currentStep: 'upload' | 'mapping' | 'calculate' | 'results';
}

// Initial state
const initialState: CalculatorState = {
  uploadState: {
    isUploading: false,
    progress: 0,
    error: null,
    file: null,
    data: null,
    headers: []
  },
  parsedData: null,
  columnMapping: {
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
  },
  pricingResults: null,
  isCalculating: false,
  errors: [],
  currentStep: 'upload'
};

// Reducer function
function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'SET_UPLOAD_STATE':
      return {
        ...state,
        uploadState: { ...state.uploadState, ...action.payload }
      };

    case 'SET_PARSED_DATA':
      return {
        ...state,
        parsedData: action.payload,
        currentStep: action.payload ? 'mapping' : 'upload'
      };

    case 'SET_COLUMN_MAPPING':
      return {
        ...state,
        columnMapping: action.payload
      };

    case 'SET_PRICING_RESULTS':
      return {
        ...state,
        pricingResults: action.payload,
        currentStep: action.payload ? 'results' : 'calculate',
        isCalculating: false
      };

    case 'SET_IS_CALCULATING':
      return {
        ...state,
        isCalculating: action.payload,
        currentStep: action.payload ? 'calculate' : state.currentStep
      };

    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload]
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: []
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context type
interface CalculatorContextType {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  // Helper functions
  setUploadState: (uploadState: Partial<FileUploadState>) => void;
  setParsedData: (data: ParsedSpreadsheet | null) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  setPricingResults: (results: PricingResult[] | null) => void;
  setIsCalculating: (isCalculating: boolean) => void;
  addError: (error: ValidationError) => void;
  clearErrors: () => void;
  resetState: () => void;
  // Navigation helpers
  goToStep: (step: CalculatorState['currentStep']) => void;
  canProceedToStep: (step: CalculatorState['currentStep']) => boolean;
}

// Create context
const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

// Provider component
interface CalculatorProviderProps {
  children: ReactNode;
}

export const CalculatorProvider: React.FC<CalculatorProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  // Helper functions
  const setUploadState = (uploadState: Partial<FileUploadState>) => {
    dispatch({ type: 'SET_UPLOAD_STATE', payload: uploadState });
  };

  const setParsedData = (data: ParsedSpreadsheet | null) => {
    dispatch({ type: 'SET_PARSED_DATA', payload: data });
  };

  const setColumnMapping = (mapping: ColumnMapping) => {
    dispatch({ type: 'SET_COLUMN_MAPPING', payload: mapping });
  };

  const setPricingResults = (results: PricingResult[] | null) => {
    dispatch({ type: 'SET_PRICING_RESULTS', payload: results });
  };

  const setIsCalculating = (isCalculating: boolean) => {
    dispatch({ type: 'SET_IS_CALCULATING', payload: isCalculating });
  };

  const addError = (error: ValidationError) => {
    dispatch({ type: 'ADD_ERROR', payload: error });
  };

  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  // Navigation helpers
  const goToStep = (_step: CalculatorState['currentStep']) => {
    // Add validation logic here if needed
    dispatch({ type: 'SET_UPLOAD_STATE', payload: {} }); // Trigger re-render with new step
    // For now, we'll handle step changes in the components
  };

  const canProceedToStep = (step: CalculatorState['currentStep']): boolean => {
    switch (step) {
      case 'upload':
        return true;
      case 'mapping':
        return !!state.parsedData && !state.uploadState.error;
      case 'calculate':
        // Only check required fields (hostname is optional)
        return !!(state.columnMapping.region && 
                 state.columnMapping.os && 
                 state.columnMapping.hoursToRun && 
                 state.columnMapping.storageCapacity);
      case 'results':
        return !!state.pricingResults;
      default:
        return false;
    }
  };

  const contextValue: CalculatorContextType = {
    state,
    dispatch,
    setUploadState,
    setParsedData,
    setColumnMapping,
    setPricingResults,
    setIsCalculating,
    addError,
    clearErrors,
    resetState,
    goToStep,
    canProceedToStep
  };

  return (
    <CalculatorContext.Provider value={contextValue}>
      {children}
    </CalculatorContext.Provider>
  );
};

// Custom hook to use the calculator context
export const useCalculator = (): CalculatorContextType => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};

// Export the context for advanced usage
export { CalculatorContext }; 