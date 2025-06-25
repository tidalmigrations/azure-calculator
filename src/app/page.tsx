'use client';

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { SpreadsheetParser } from "@/lib/parsers";

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
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Azure Cost Calculator
          </h1>
          <p className="text-gray-600">
            Upload your spreadsheet to calculate Azure VM and storage costs
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto">
          {/* Error message */}
          {processingError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {processingError}
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
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
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
                  <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg text-gray-700 mb-2 font-medium">
                    {isDragActive 
                      ? "Drop your spreadsheet here" 
                      : "Drop your spreadsheet here, or click to browse"
                    }
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports CSV and Excel files (.csv, .xlsx, .xls)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
