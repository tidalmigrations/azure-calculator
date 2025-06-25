'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { SUPPORTED_FILE_TYPES } from '@/utils/constants';
import type { FileUploadState } from '@/types';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  uploadState: FileUploadState;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  uploadState,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      // Handle rejected files
      const errors = rejectedFiles.map(rejection => 
        rejection.errors.map((error: any) => error.message).join(', ')
      );
      console.error('File upload errors:', errors);
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB limit
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false)
  });

  const getStatusContent = () => {
    if (uploadState.isUploading) {
      return (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Processing file...</p>
          {uploadState.progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              ></div>
            </div>
          )}
        </div>
      );
    }

    if (uploadState.error) {
      return (
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-600 text-center mb-2">Upload Failed</p>
          <p className="text-sm text-gray-500 text-center">{uploadState.error}</p>
        </div>
      );
    }

    if (uploadState.file) {
      return (
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-600 font-medium mb-1">File Uploaded Successfully</p>
          <p className="text-sm text-gray-600">{uploadState.file.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {(uploadState.file.size / 1024).toFixed(1)} KB
          </p>
        </div>
      );
    }

    // Default state
    return (
      <div className="flex flex-col items-center">
        <svg 
          className={`w-12 h-12 mb-4 transition-colors ${
            isDragActive || dragActive ? 'text-blue-500' : 'text-gray-400'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className={`mb-2 transition-colors ${
          isDragActive || dragActive ? 'text-blue-600' : 'text-gray-500'
        }`}>
          {isDragActive ? 'Drop your file here' : 'Drop your spreadsheet here, or click to browse'}
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Supports CSV and Excel files (.csv, .xlsx, .xls)
        </p>
        <p className="text-xs text-gray-400">
          Maximum file size: 10MB
        </p>
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive || dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : uploadState.error 
              ? 'border-red-300 bg-red-50'
              : uploadState.file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
          }
        `}
      >
        <input {...getInputProps()} />
        {getStatusContent()}
      </div>
      
      {uploadState.file && !uploadState.error && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">File Details:</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><span className="font-medium">Name:</span> {uploadState.file.name}</p>
            <p><span className="font-medium">Size:</span> {(uploadState.file.size / 1024).toFixed(1)} KB</p>
            <p><span className="font-medium">Type:</span> {uploadState.file.type || 'Unknown'}</p>
            <p><span className="font-medium">Last Modified:</span> {new Date(uploadState.file.lastModified).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}; 