import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileUploader } from '../FileUploader';
import type { FileUploadState } from '@/types';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn()
}));

describe('FileUploader', () => {
  const mockOnFileSelect = jest.fn();
  
  const defaultUploadState: FileUploadState = {
    isUploading: false,
    progress: 0,
    error: null,
    file: null,
    data: null,
    headers: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { useDropzone } = require('react-dropzone');
    useDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: false
    });
  });

  it('renders default upload state', () => {
    render(
      <FileUploader 
        onFileSelect={mockOnFileSelect}
        uploadState={defaultUploadState}
      />
    );

    expect(screen.getByText(/drop your spreadsheet here/i)).toBeInTheDocument();
    expect(screen.getByText(/supports csv and excel files/i)).toBeInTheDocument();
    expect(screen.getByText(/maximum file size: 10mb/i)).toBeInTheDocument();
  });

  it('renders uploading state', () => {
    const uploadingState: FileUploadState = {
      ...defaultUploadState,
      isUploading: true,
      progress: 50
    };

    render(
      <FileUploader 
        onFileSelect={mockOnFileSelect}
        uploadState={uploadingState}
      />
    );

    expect(screen.getByText(/processing file/i)).toBeInTheDocument();
    
    // Check for progress bar
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('renders error state', () => {
    const errorState: FileUploadState = {
      ...defaultUploadState,
      error: 'File too large'
    };

    render(
      <FileUploader 
        onFileSelect={mockOnFileSelect}
        uploadState={errorState}
      />
    );

    expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    expect(screen.getByText('File too large')).toBeInTheDocument();
  });

  it('renders success state with file details', () => {
    const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
    const successState: FileUploadState = {
      isUploading: false,
      progress: 100,
      error: null,
      file: mockFile,
      data: [],
      headers: []
    };

    render(
      <FileUploader 
        onFileSelect={mockOnFileSelect} 
        uploadState={successState} 
      />
    );

    expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/file details/i)).toBeInTheDocument();
    // Use getAllByText to handle multiple instances of the filename
    const fileNameElements = screen.getAllByText('test.csv');
    expect(fileNameElements.length).toBeGreaterThan(0);
  });

  it('shows drag active state', () => {
    const { useDropzone } = require('react-dropzone');
    useDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: true
    });

    render(
      <FileUploader 
        onFileSelect={mockOnFileSelect}
        uploadState={defaultUploadState}
      />
    );

    expect(screen.getByText(/drop your file here/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FileUploader 
        onFileSelect={mockOnFileSelect}
        uploadState={defaultUploadState}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('configures dropzone with correct options', () => {
    const { useDropzone } = require('react-dropzone');
    
    render(
      <FileUploader 
        onFileSelect={mockOnFileSelect}
        uploadState={defaultUploadState}
      />
    );

    expect(useDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: {
          'text/csv': ['.csv'],
          'application/vnd.ms-excel': ['.xls'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024
      })
    );
  });
}); 