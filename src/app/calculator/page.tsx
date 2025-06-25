'use client';

import React, { useState, useEffect } from 'react';
import { FileUploader, DataPreview, ColumnMapper } from '@/components';
import { useSpreadsheetUpload } from '@/hooks';
import type { ColumnMapping } from '@/types';

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

  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'calculate'>('upload');
  const [showHomePageNotification, setShowHomePageNotification] = useState(false);

  // Check for pending file from home page
  useEffect(() => {
    const pendingFileData = sessionStorage.getItem('pendingFileData');
    if (pendingFileData) {
      try {
        const fileData = JSON.parse(pendingFileData);
        
        // Load the pre-parsed data directly
        const parsedData = {
          headers: fileData.headers,
          rows: fileData.rows,
          hasHeaders: fileData.hasHeaders
        };
        
        loadParsedData(parsedData, fileData.fileName, fileData.fileType);
        setShowHomePageNotification(true);
        
        // Clear the pending file
        sessionStorage.removeItem('pendingFileData');
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => setShowHomePageNotification(false), 5000);
        
      } catch (error) {
        console.error('Error parsing pending file data:', error);
        sessionStorage.removeItem('pendingFileData');
      }
    }
  }, [loadParsedData]);

  // Handle step progression
  const handleNextStep = () => {
    if (currentStep === 'upload' && parsedData) {
      setCurrentStep('mapping');
    } else if (currentStep === 'mapping') {
      setCurrentStep('calculate');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('upload');
    } else if (currentStep === 'calculate') {
      setCurrentStep('mapping');
    }
  };

  const handleReset = () => {
    resetUpload();
    setCurrentStep('upload');
  };

  // Check if we can proceed to next step
  const canProceed = () => {
    if (currentStep === 'upload') {
      return parsedData && !uploadState.error;
    } else if (currentStep === 'mapping') {
      return Object.values(columnMapping).every(value => value !== null);
    }
    return false;
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: 'Upload File', icon: '📁' },
      { key: 'mapping', label: 'Map Columns', icon: '🗂️' },
      { key: 'calculate', label: 'Calculate Costs', icon: '💰' }
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const isActive = currentStep === step.key;
          const isComplete = steps.findIndex(s => s.key === currentStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : isComplete 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }
              `}>
                {isComplete ? '✓' : step.icon}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Your Spreadsheet
              </h2>
              <p className="text-gray-600">
                Upload a CSV or Excel file containing your server data to get started with Azure cost calculations.
              </p>
            </div>
            
            <FileUploader
              onFileSelect={handleFileSelect}
              uploadState={uploadState}
              className="max-w-2xl mx-auto"
            />

            {parsedData && (
              <div className="mt-8">
                <DataPreview 
                  data={parsedData} 
                  maxRows={5}
                  className="max-w-6xl mx-auto"
                />
              </div>
            )}
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Map Your Columns
              </h2>
              <p className="text-gray-600">
                Tell us which columns in your spreadsheet correspond to the required fields for Azure pricing.
              </p>
            </div>

            {parsedData && (
              <ColumnMapper
                data={parsedData}
                onMappingChange={setColumnMapping}
                className="max-w-4xl mx-auto"
              />
            )}
          </div>
        );

      case 'calculate':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Calculate Azure Costs
              </h2>
              <p className="text-gray-600">
                Ready to calculate costs for your {parsedData?.rows.length} servers using Azure pricing.
              </p>
            </div>

            <div className="max-w-4xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium text-yellow-800">Coming Soon - Phase 5</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    The pricing calculator component will be implemented in Phase 5. 
                    For now, you can see your mapped data is ready for processing.
                  </p>
                </div>
              </div>
            </div>

            {parsedData && (
              <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mapping Summary</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(columnMapping).map(([field, column]) => (
                    <div key={field} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-gray-600">{column || 'Not mapped'}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <strong>Data ready:</strong> {parsedData.rows.length} rows × {parsedData.headers.length} columns
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Azure Cost Calculator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload your server inventory and get accurate Azure VM and storage cost estimates
          </p>
        </div>

        {/* Home page notification */}
        {showHomePageNotification && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Welcome from the home page!</strong> Please upload your file using the area below to get started.
                  </p>
                </div>
                <button 
                  onClick={() => setShowHomePageNotification(false)}
                  className="ml-auto text-blue-600 hover:text-blue-800 text-xl"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-7xl mx-auto">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              {currentStep !== 'upload' && (
                <button
                  onClick={handlePreviousStep}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  ← Previous
                </button>
              )}
              
              <button
                onClick={handleReset}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
              >
                🔄 Start Over
              </button>
            </div>

            <div className="flex space-x-3">
              {currentStep !== 'calculate' && (
                <button
                  onClick={handleNextStep}
                  disabled={!canProceed()}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    canProceed()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next →
                </button>
              )}
              
              {currentStep === 'calculate' && (
                <button
                  disabled
                  className="px-6 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                >
                  Calculate Costs (Phase 5)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>✅ Phase 1: Project Setup - Complete</p>
          <p>✅ Phase 2: Azure API Integration - Complete</p>
          <p>✅ Phase 3: Spreadsheet Processing - Complete</p>
          <p>🚧 Phase 4: UI Development - In Progress</p>
          <p>⏳ Phase 5: Pricing Calculator - Coming Soon</p>
        </div>
      </div>
    </main>
  );
} 