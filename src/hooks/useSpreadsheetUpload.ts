'use client';

import { useState, useCallback } from 'react';
import { SpreadsheetParser } from '@/lib/parsers';
import type { FileUploadState, ParsedSpreadsheet, ColumnMapping } from '@/types';

export interface UseSpreadsheetUploadReturn {
  uploadState: FileUploadState;
  parsedData: ParsedSpreadsheet | null;
  columnMapping: ColumnMapping;
  handleFileSelect: (file: File) => Promise<void>;
  loadParsedData: (data: ParsedSpreadsheet, fileName: string, fileType: string) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  resetUpload: () => void;
}

export function useSpreadsheetUpload(): UseSpreadsheetUploadReturn {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    file: null,
    data: null,
    headers: []
  });

  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    region: null,
    os: null,
    hoursToRun: null,
    storageCapacity: null
  });

  const handleFileSelect = useCallback(async (file: File) => {
    // Reset previous state
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      file: file,
      data: null,
      headers: []
    });
    setParsedData(null);

    try {
      // Simulate progress for better UX
      setUploadState(prev => ({ ...prev, progress: 25 }));

      // Parse the file
      const parser = new SpreadsheetParser();
      const parsed = await parser.parse(file);
      
      setUploadState(prev => ({ ...prev, progress: 75 }));

      // Update state with parsed data
      setParsedData(parsed);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        data: parsed.rows,
        headers: parsed.headers
      }));

    } catch (error) {
      console.error('File parsing error:', error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to parse file'
      }));
      setParsedData(null);
    }
  }, []);

  const loadParsedData = useCallback((data: ParsedSpreadsheet, fileName: string, fileType: string) => {
    // Create a mock file for consistency
    const mockFile = new File([''], fileName, { type: fileType });
    
    // Set the parsed data directly
    setParsedData(data);
    setUploadState({
      isUploading: false,
      progress: 100,
      error: null,
      file: mockFile,
      data: data.rows,
      headers: data.headers
    });
  }, []);

  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      file: null,
      data: null,
      headers: []
    });
    setParsedData(null);
    setColumnMapping({
      region: null,
      os: null,
      hoursToRun: null,
      storageCapacity: null
    });
  }, []);

  return {
    uploadState,
    parsedData,
    columnMapping,
    handleFileSelect,
    loadParsedData,
    setColumnMapping,
    resetUpload
  };
} 