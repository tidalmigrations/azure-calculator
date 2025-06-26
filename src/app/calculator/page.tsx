'use client';

import React, { useState, useEffect } from 'react';
import { FileUploader, DataPreview, ColumnMapper, PricingResults } from '@/components';
import { useSpreadsheetUpload } from '@/hooks';
import type { ColumnMapping, PricingResult, SpreadsheetRow } from '@/types';

export default function CalculatorPage() {
  const {
    uploadState,
    parsedData,
    columnMapping,
    handleFileSelect,
    loadParsedData,
    setColumnMapping,
    resetUpload
  } = useSpreadsheetUpload();

  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'calculate' | 'results'>('upload');
  
  // Pricing results state
  const [pricingResults, setPricingResults] = useState<PricingResult[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Check for pre-loaded data from home page
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingFileData');
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData);
        // Clear the stored data
        sessionStorage.removeItem('pendingFileData');
        
                 // Load the data into the hook
         loadParsedData({
           headers: data.headers,
           rows: data.rows,
           hasHeaders: data.hasHeaders
         }, data.fileName, data.fileType);
        
        // Skip to mapping step
        setCurrentStep('mapping');
      } catch (error) {
        console.error('Error loading pending data:', error);
      }
    }
  }, [loadParsedData]);

     // Auto-advance to mapping step when data is uploaded
   useEffect(() => {
     if (!uploadState.isUploading && !uploadState.error && parsedData && currentStep === 'upload') {
       setCurrentStep('mapping');
     }
   }, [uploadState.isUploading, uploadState.error, parsedData, currentStep]);

   const canProceed = () => {
     switch (currentStep) {
       case 'upload':
         return !!parsedData && !uploadState.error;
       case 'mapping':
         // Only check required fields (hostname is optional)
         return columnMapping &&
           columnMapping.region &&
           columnMapping.os &&
           columnMapping.hoursToRun &&
           columnMapping.storageCapacity;
       case 'calculate':
         return !isCalculating;
       case 'results':
         return !!pricingResults;
       default:
         return false;
     }
   };

  const handleNextStep = () => {
    if (!canProceed()) return;
    
    switch (currentStep) {
      case 'upload':
        setCurrentStep('mapping');
        break;
      case 'mapping':
        // Skip the intermediate calculate step and go directly to calculation
        handleCalculate();
        break;
      case 'calculate':
        handleCalculate();
        break;
      case 'results':
        // Reset to start over
        resetUpload();
        setPricingResults(null);
        setCalculationError(null);
        setCurrentStep('upload');
        break;
    }
  };

  const handleCalculate = async () => {
    if (!parsedData || !columnMapping) return;
    
    setCurrentStep('calculate');
    setIsCalculating(true);
    setCalculationError(null);
    
    try {
      // Import the pricing calculator
      const { pricingCalculator } = await import('@/lib/calculators');
      
      // Prepare spreadsheet rows with mapped columns
      const spreadsheetRows: SpreadsheetRow[] = parsedData.rows.map(row => ({
        region: row[columnMapping.region!] || 'eastus',
        os: row[columnMapping.os!] || 'linux',
        hoursToRun: parseFloat(row[columnMapping.hoursToRun!]) || 24,
        storageCapacity: parseFloat(row[columnMapping.storageCapacity!]) || 100,
        // Include hostname if mapped
        ...(columnMapping.hostname && { [columnMapping.hostname]: row[columnMapping.hostname] }),
        // Include CPU count if mapped
        ...(columnMapping.cpuCount && { 'Logical CPU Count': row[columnMapping.cpuCount] }),
        // Include RAM capacity if mapped  
        ...(columnMapping.ramCapacity && { 'RAM Allocated (GB)': row[columnMapping.ramCapacity] }),
        // Include original row data for reference
        ...row
      }));
      
             // Calculate pricing using optimized caching (Phases 3.1, 3.2, 3.4)
       const results = await pricingCalculator.calculateBatchOptimized(
         spreadsheetRows,
         (completed: number, total: number) => {
           // Optional: Update progress indicator
           console.log(`Calculation progress: ${completed}/${total}`);
         }
       );
      
      setPricingResults(results);
      setCurrentStep('results');
    } catch (error) {
      console.error('Calculation error:', error);
      
      let errorMessage = 'Calculation failed due to an unknown error';
      
      if (error instanceof Error) {
        if (error.message.includes('Rate limit exceeded') || 
            error.message.includes('429') || 
            error.message.includes('Too Many Requests')) {
          errorMessage = 'Azure API rate limit exceeded. Please wait a few minutes and try again. The calculation will use fallback pricing for any affected items.';
        } else {
          errorMessage = `Calculation failed: ${error.message}`;
        }
      }
      
      setCalculationError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return 'Upload Spreadsheet';
      case 'mapping': return 'Map Columns';
      case 'calculate': return 'Calculate Costs';
      case 'results': return 'Results';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'upload': return 'Upload your CSV or Excel file';
      case 'mapping': return 'Match your columns to required fields';
      case 'calculate': return 'Calculate Azure costs';
      case 'results': return 'View your cost breakdown';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Azure Cost Calculator
          </h1>
          <p className="text-gray-600">
            {getStepDescription()}
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Step Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {getStepTitle()}
              </h2>
            </div>

            {/* Step Content */}
            {currentStep === 'upload' && (
              <div>
                <FileUploader
                  onFileSelect={handleFileSelect}
                  uploadState={uploadState}
                />
                 {parsedData && (
                   <div className="mt-6">
                     <DataPreview 
                       data={parsedData} 
                     />
                     <div className="mt-4 flex justify-end">
                       <button
                         onClick={handleNextStep}
                         disabled={!canProceed()}
                         className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                       >
                         Next
                       </button>
                     </div>
                   </div>
                 )}
              </div>
            )}

            {currentStep === 'mapping' && parsedData && (
              <div>
                 <ColumnMapper
                   data={parsedData}
                   onMappingChange={setColumnMapping}
                 />
                 <div className="mt-6 flex justify-between">
                   <button
                     onClick={() => setCurrentStep('upload')}
                     className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                   >
                     Back
                   </button>
                   <button
                     onClick={handleNextStep}
                     disabled={!canProceed()}
                     className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                   >
                     Calculate
                   </button>
                 </div>
              </div>
            )}

            {currentStep === 'calculate' && (
              <div className="text-center py-12">
                {isCalculating ? (
                  <div>
                    <div className="w-16 h-16 mx-auto mb-4 animate-spin">
                      <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Calculating costs...
                    </h3>
                    <p className="text-gray-600">
                      Please wait while we calculate your Azure costs
                    </p>
                  </div>
                ) : calculationError ? (
                  <div>
                    <div className="w-16 h-16 mx-auto mb-4 text-red-600">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-red-900 mb-2">
                      Calculation Failed
                    </h3>
                    <p className="text-red-600 mb-4">
                      {calculationError}
                    </p>
                    <button
                      onClick={() => setCurrentStep('mapping')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Ready to Calculate
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Click the button below to calculate your Azure costs
                    </p>
                    <button
                      onClick={handleCalculate}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      Calculate Costs
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'results' && pricingResults && (
              <div>
                <PricingResults 
                  results={pricingResults}
                  isLoading={isCalculating}
                  error={calculationError}
                />
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 