'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { SpreadsheetParser } from "@/lib/parsers";
import type { ParsedSpreadsheet } from "@/types";

export default function Home() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setIsProcessing(true);
      setProcessingError(null);

      try {
        // Parse the file immediately
        const parser = new SpreadsheetParser();
        const result = await parser.parse(file);
        
        // Store the parsed data in sessionStorage
        sessionStorage.setItem('pendingFileData', JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          headers: result.headers,
          rows: result.rows,
          hasHeaders: result.hasHeaders,
          timestamp: Date.now()
        }));
        
        // Redirect to calculator
        router.push('/calculator');
      } catch (error) {
        console.error('Error processing file:', error);
        setProcessingError(error instanceof Error ? error.message : 'Failed to process file');
        setIsProcessing(false);
      }
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Azure Cost Calculator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Calculate Azure VM and storage costs from your spreadsheet data using real-time Azure pricing
          </p>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drag & Drop Upload
            </h3>
            <p className="text-gray-600">
              Simply drag and drop your CSV or Excel files to get started
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Automatic Column Mapping
            </h3>
            <p className="text-gray-600">
              Intelligent detection and mapping of your spreadsheet columns
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Real-time Azure Pricing
            </h3>
            <p className="text-gray-600">
              Get accurate costs using the latest Azure retail pricing API
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Upload your spreadsheet to calculate Azure VM and storage costs
            </p>
            
            {/* Error message */}
            {processingError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-red-800">
                      <strong>Error processing file:</strong> {processingError}
                    </p>
                  </div>
                  <button 
                    onClick={() => setProcessingError(null)}
                    className="ml-auto text-red-600 hover:text-red-800 text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isProcessing 
                  ? 'border-blue-300 bg-blue-50 cursor-wait' 
                  : isDragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                {isProcessing ? (
                  <>
                    <div className="w-12 h-12 mb-4 animate-spin">
                      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <p className="text-blue-600 mb-2 font-medium">
                      Processing your file...
                    </p>
                    <p className="text-sm text-blue-500">
                      Please wait while we parse your spreadsheet
                    </p>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-500 mb-2">
                      {isDragActive 
                        ? "Drop your spreadsheet here..." 
                        : "Drop your spreadsheet here, or click to browse"
                      }
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                      Supports CSV and Excel files (.csv, .xlsx, .xls)
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      ✅ Drag & drop processes files instantly!
                    </p>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-6 text-center space-x-4">
              <a 
                href="/calculator" 
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Start Calculator
              </a>
              <a 
                href="/api-demo" 
                className="inline-block px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                View API Demo
              </a>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 text-center">
                🌐 <strong>Development Server:</strong> <code>http://localhost:3001</code>
              </p>
              <p className="text-xs text-blue-600 text-center mt-1">
                Note: Server is running on port 3001 (port 3000 was in use)
              </p>
            </div>
            
            <div className="mt-6 text-sm text-gray-500 text-center">
              <p>✅ Phase 1: Project Setup & Architecture - Complete</p>
              <p>✅ Phase 2: Azure API Integration - Complete</p>
              <p>✅ Phase 3: Spreadsheet Processing - Complete</p>
              <p>🚧 Phase 4: UI Development - In Progress</p>
              <p>⏳ Phase 5: Pricing Calculator - Pending</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
