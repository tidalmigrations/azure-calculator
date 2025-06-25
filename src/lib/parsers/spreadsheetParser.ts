import * as XLSX from 'xlsx';
import type { ParsedSpreadsheet } from '@/types';

export interface ParserOptions {
  maxRows?: number;
  encoding?: string;
}

export class SpreadsheetParser {
  /**
   * Parse a spreadsheet file (CSV or Excel)
   */
  async parse(file: File, options: ParserOptions = {}): Promise<ParsedSpreadsheet> {
    const data = await this.readFile(file);
    
    if (file.name.toLowerCase().endsWith('.csv')) {
      return this.parseCSV(data, options);
    } else if (file.name.toLowerCase().match(/\.(xlsx?|xls)$/)) {
      return this.parseExcel(data, options);
    } else {
      throw new Error(`Unsupported file type: ${file.name}`);
    }
  }

  /**
   * Read file as ArrayBuffer
   */
  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as ArrayBuffer);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse CSV data
   */
  private parseCSV(data: ArrayBuffer, options: ParserOptions): ParsedSpreadsheet {
    // Convert ArrayBuffer to string
    const decoder = new TextDecoder(options.encoding || 'utf-8');
    const csvText = decoder.decode(data);
    
    // Parse CSV manually to handle various formats
    const lines = this.parseCSVLines(csvText);
    
    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }

    return this.processData(lines, options);
  }

  /**
   * Parse Excel data
   */
  private parseExcel(data: ArrayBuffer, options: ParserOptions): ParsedSpreadsheet {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      return this.processData(jsonData as any[][], options);
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse CSV lines handling quoted fields and commas
   */
  private parseCSVLines(csvText: string): string[][] {
    const lines: string[][] = [];
    const rows = csvText.split(/\r?\n/);
    
    for (const row of rows) {
      if (row.trim() === '') continue;
      
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
          if (inQuotes && row[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add final field
      fields.push(current.trim());
      lines.push(fields);
    }
    
    return lines;
  }

  /**
   * Detect if first row contains headers
   */
  private detectHeaders(rows: any[][]): boolean {
    if (rows.length < 2) return true; // Assume headers if only one row
    
    const firstRow = rows[0];
    const secondRow = rows[1];
    
    // Check if first row contains mostly strings and second row contains numbers/different patterns
    let firstRowStringCount = 0;
    let firstRowNonEmptyCount = 0;
    let secondRowNumberCount = 0;
    let secondRowNonEmptyCount = 0;
    
    for (let i = 0; i < Math.min(firstRow.length, secondRow.length); i++) {
      const firstCell = firstRow[i];
      const secondCell = secondRow[i];
      
      // Count non-empty cells in first row
      if (firstCell !== null && firstCell !== undefined && String(firstCell).trim() !== '') {
        firstRowNonEmptyCount++;
        
        // Check if it's a string that's not a number
        if (typeof firstCell === 'string' && isNaN(Number(firstCell.trim()))) {
          firstRowStringCount++;
        }
      }
      
      // Count non-empty cells and numbers in second row
      if (secondCell !== null && secondCell !== undefined && String(secondCell).trim() !== '') {
        secondRowNonEmptyCount++;
        
        // Check if it's a number or numeric string
        if (typeof secondCell === 'number' || 
            (typeof secondCell === 'string' && !isNaN(Number(secondCell.trim())) && secondCell.trim() !== '')) {
          secondRowNumberCount++;
        }
      }
    }
    
    // If first row is mostly strings and second row has some numbers, likely headers
    const firstRowStringRatio = firstRowNonEmptyCount > 0 ? firstRowStringCount / firstRowNonEmptyCount : 0;
    const secondRowNumberRatio = secondRowNonEmptyCount > 0 ? secondRowNumberCount / secondRowNonEmptyCount : 0;
    
    // Headers if:
    // 1. First row has mostly string values (>50%)
    // 2. Second row has some numeric values (>25%) OR first row strings are significantly different from second row
    return firstRowStringRatio > 0.5 && (secondRowNumberRatio > 0.25 || firstRowStringRatio > 0.8);
  }

  /**
   * Process raw data into structured format
   */
  private processData(rows: any[][], options: ParserOptions): ParsedSpreadsheet {
    if (rows.length === 0) {
      throw new Error('No data found in file');
    }

    // Apply row limit if specified
    const limitedRows = options.maxRows ? rows.slice(0, options.maxRows + 1) : rows;
    
    const hasHeaders = this.detectHeaders(limitedRows);
    const headers = hasHeaders 
      ? limitedRows[0].map((header: any) => String(header).trim())
      : limitedRows[0].map((_: any, i: number) => `Column ${i + 1}`);
    
    const dataRows = hasHeaders ? limitedRows.slice(1) : limitedRows;
    
    // Convert rows to objects
    const processedRows = dataRows.map((row: any[]) => {
      const obj: Record<string, any> = {};
      headers.forEach((header: string, index: number) => {
        const value = row[index];
        obj[header] = value === undefined || value === null ? '' : value;
      });
      return obj;
    });
    
    return { 
      headers: headers.filter(h => h), // Remove empty headers
      rows: processedRows, 
      hasHeaders 
    };
  }

  /**
   * Get a preview of the data (first few rows)
   */
  async getPreview(file: File, maxRows: number = 5): Promise<ParsedSpreadsheet> {
    return this.parse(file, { maxRows });
  }
}

// Export singleton instance
export const spreadsheetParser = new SpreadsheetParser(); 