import { SpreadsheetParser } from '../spreadsheetParser';

// Mock XLSX module
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));

describe('SpreadsheetParser', () => {
  let parser: SpreadsheetParser;

  beforeEach(() => {
    parser = new SpreadsheetParser();
  });

  describe('CSV parsing', () => {
    it('should parse simple CSV data', async () => {
      const csvContent = 'Name,Age,City\nJohn,25,NYC\nJane,30,LA';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parser.parse(file);

      expect(result.hasHeaders).toBe(true);
      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ Name: 'John', Age: '25', City: 'NYC' });
      expect(result.rows[1]).toEqual({ Name: 'Jane', Age: '30', City: 'LA' });
    });

    it('should handle CSV with quoted fields', async () => {
      const csvContent = 'Name,Description\n"John Doe","Software Engineer, Tech Lead"\n"Jane Smith","Product Manager"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parser.parse(file);

      expect(result.rows[0]).toEqual({ 
        Name: 'John Doe', 
        Description: 'Software Engineer, Tech Lead' 
      });
    });

    it('should handle CSV without headers', async () => {
      const csvContent = '123,456,789\n111,222,333';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parser.parse(file);

      expect(result.hasHeaders).toBe(false);
      expect(result.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle empty CSV', async () => {
      const csvContent = '';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(parser.parse(file)).rejects.toThrow('Empty CSV file');
    });
  });

  describe('Excel parsing', () => {
    it('should parse Excel data', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };

      const mockData = [
        ['Name', 'Age', 'City'],
        ['John', 25, 'NYC'],
        ['Jane', 30, 'LA']
      ];

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue(mockData);

      const file = new File([new ArrayBuffer(8)], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const result = await parser.parse(file);

      expect(result.hasHeaders).toBe(true);
      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle Excel file with no sheets', async () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {}
      };

      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue(mockWorkbook);

      const file = new File([new ArrayBuffer(8)], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      await expect(parser.parse(file)).rejects.toThrow('No sheets found in Excel file');
    });
  });

  describe('Header detection', () => {
    it('should detect headers when first row is strings and second has numbers', async () => {
      const csvContent = 'Name,Age,Score\nJohn,25,95.5\nJane,30,87.2';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parser.parse(file);

      expect(result.hasHeaders).toBe(true);
    });

    it('should not detect headers when all rows are similar', async () => {
      const csvContent = '123,456,789\n111,222,333\n444,555,666';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parser.parse(file);

      expect(result.hasHeaders).toBe(false);
    });
  });

  describe('Options', () => {
    it('should limit rows when maxRows option is provided', async () => {
      const csvContent = 'Name,Age\nJohn,25\nJane,30\nBob,35\nAlice,40';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parser.parse(file, { maxRows: 2 });

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should throw error for unsupported file types', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(parser.parse(file)).rejects.toThrow('Unsupported file type');
    });
  });

  describe('getPreview', () => {
    it('should return limited preview of data', async () => {
      const csvContent = 'Name,Age\nJohn,25\nJane,30\nBob,35\nAlice,40\nCharlie,45';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parser.getPreview(file, 3);

      expect(result.rows).toHaveLength(3);
    });
  });
}); 