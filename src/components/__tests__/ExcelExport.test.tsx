import * as XLSX from 'xlsx';
import type { PricingResult } from '@/types';

// Mock XLSX module
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    aoa_to_sheet: jest.fn(() => ({
      '!ref': 'A1:L4',
      '!cols': []
    })),
    book_append_sheet: jest.fn(),
    encode_cell: jest.fn((cell) => `${String.fromCharCode(65 + cell.c)}${cell.r + 1}`),
    decode_range: jest.fn(() => ({ s: { c: 0, r: 0 }, e: { c: 11, r: 3 } }))
  },
  write: jest.fn(() => new ArrayBuffer(8))
}));

describe('Excel Export Functionality', () => {
  let mockResults: PricingResult[];
  let originalBlob: any;
  let originalURL: any;
  let mockAnchor: any;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock test data
    mockResults = [
      {
        region: 'canadacentral',
        os: 'Windows Server 2019, 64-bit (Build 17763.6775)',
        hoursToRun: 730,
        storageCapacity: 74.11,
        vmCost: 148.92,
        storageCost: 6.546136300000001,
        totalCost: 155.4661363,
        hostname: 'test-web-server-01',
        requiredCPUs: 2,
        requiredRAM: 4,
        breakdown: {
          vmDetails: {
            size: 'Standard_D2s_v6',
            hourlyRate: 0.204,
            totalHours: 730,
            subtotal: 148.92,
            cpu: 2,
            ram: 4,
            currency: 'USD'
          },
          storageDetails: {
            tier: 'Standard HDD',
            monthlyRate: 0.002,
            capacityGB: 74.11,
            subtotal: 6.546136300000001,
            currency: 'USD'
          }
        }
      },
      {
        region: 'eastus',
        os: 'Red Hat Enterprise Linux 7 (64-bit)',
        hoursToRun: 168,
        storageCapacity: 50,
        vmCost: 75.5,
        storageCost: 2.1,
        totalCost: 77.6,
        hostname: 'test-server-01',
        requiredCPUs: 4,
        requiredRAM: 8,
        breakdown: {
          vmDetails: {
            size: 'Standard_D4s_v6',
            hourlyRate: 0.45,
            totalHours: 168,
            subtotal: 75.5,
            cpu: 4,
            ram: 8,
            currency: 'USD'
          },
          storageDetails: {
            tier: 'Premium SSD',
            monthlyRate: 0.042,
            capacityGB: 50,
            subtotal: 2.1,
            currency: 'USD'
          }
        }
      }
    ];

    // Mock DOM APIs
    originalBlob = global.Blob;
    originalURL = global.URL;
    
    global.Blob = jest.fn().mockImplementation((content, options) => ({
      content,
      options,
      size: content[0].byteLength || 0,
      type: options?.type || 'application/octet-stream'
    }));
    
    global.URL = {
      ...originalURL,
      createObjectURL: jest.fn(() => 'mock-blob-url'),
      revokeObjectURL: jest.fn()
    } as any;

    mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
      style: {},
      setAttribute: jest.fn(),
      getAttribute: jest.fn()
    };
    
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.Blob = originalBlob;
    global.URL = originalURL;
  });

  // Helper function to simulate the export function (extracted from PricingResults component)
  const exportToExcel = (results: PricingResult[]) => {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Prepare data with headers
    const headers = ['Hostname', 'Region', 'OS', 'VM Size', 'CPU', 'RAM (GB)', 'Hours', 'Storage (GB)', 'VM Cost', 'Storage Cost', 'Total Cost', 'Currency'];
    
    // Prepare data rows
    const dataRows = results.map((result) => [
      result.hostname || result.breakdown?.vmDetails?.hostname || 'Unknown',
      result.region,
      result.os,
      result.breakdown?.vmDetails?.size || 'Unknown',
      result.requiredCPUs || result.breakdown?.vmDetails?.cpu || 'Unknown',
      result.requiredRAM || result.breakdown?.vmDetails?.ram || 'Unknown',
      result.hoursToRun,
      result.storageCapacity,
      result.vmCost,
      result.storageCost,
      result.totalCost,
      result.breakdown?.vmDetails?.currency || result.breakdown?.storageDetails?.currency || 'USD'
    ]);

    // Create worksheet data
    const worksheetData = [headers, ...dataRows];
    
    // Add totals row
    const _totalRowIndex = dataRows.length + 2;
    const vmCostColumn = 'I';
    const storageCostColumn = 'J';
    const totalCostColumn = 'K';
    
    const totalsRow = [
      'TOTALS', '', '', '', '', '', '', '',
      '', '', '',
      'USD'
    ];
    
    worksheetData.push(totalsRow);
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Add formulas to the totals row after worksheet creation
    const totalsRowIndexForFormulas = worksheetData.length - 1;
    worksheet[XLSX.utils.encode_cell({ r: totalsRowIndexForFormulas, c: 8 })] = { 
      f: `SUM(${vmCostColumn}2:${vmCostColumn}${totalsRowIndexForFormulas})` 
    };
    worksheet[XLSX.utils.encode_cell({ r: totalsRowIndexForFormulas, c: 9 })] = { 
      f: `SUM(${storageCostColumn}2:${storageCostColumn}${totalsRowIndexForFormulas})` 
    };
    worksheet[XLSX.utils.encode_cell({ r: totalsRowIndexForFormulas, c: 10 })] = { 
      f: `SUM(${totalCostColumn}2:${totalCostColumn}${totalsRowIndexForFormulas})` 
    };
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 18 },
      { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Azure Cost Analysis');
    
    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azure-cost-calculation-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  it('should create a new workbook', () => {
    exportToExcel(mockResults);
    expect(XLSX.utils.book_new).toHaveBeenCalled();
  });

  it('should create worksheet with correct headers', () => {
    exportToExcel(mockResults);
    
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['Hostname', 'Region', 'OS', 'VM Size', 'CPU', 'RAM (GB)', 'Hours', 'Storage (GB)', 'VM Cost', 'Storage Cost', 'Total Cost', 'Currency']
      ])
    );
  });

  it('should handle complex OS names with commas', () => {
    exportToExcel(mockResults);
    
    const callArgs = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls[0][0];
    const dataRow = callArgs.find((row: any[]) => 
      row.includes('Windows Server 2019, 64-bit (Build 17763.6775)')
    );
    
    expect(dataRow).toBeDefined();
    expect(dataRow).toContain('Windows Server 2019, 64-bit (Build 17763.6775)');
  });

  it('should include totals row with correct structure', () => {
    exportToExcel(mockResults);
    
    const callArgs = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls[0][0];
    const totalsRow = callArgs.find((row: any[]) => row[0] === 'TOTALS');
    
    expect(totalsRow).toBeDefined();
    expect(totalsRow[0]).toBe('TOTALS');
    expect(totalsRow[11]).toBe('USD'); // Currency column
  });

  it('should add formulas to worksheet cells', () => {
    const mockWorksheet = {
      '!ref': 'A1:L4',
      '!cols': []
    };
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue(mockWorksheet);
    
    exportToExcel(mockResults);
    
    // Check that formulas were added to the worksheet
    expect(XLSX.utils.encode_cell).toHaveBeenCalledWith({ r: 3, c: 8 }); // VM Cost total
    expect(XLSX.utils.encode_cell).toHaveBeenCalledWith({ r: 3, c: 9 }); // Storage Cost total
    expect(XLSX.utils.encode_cell).toHaveBeenCalledWith({ r: 3, c: 10 }); // Grand total
  });

  it('should set column widths', () => {
    const mockWorksheet = {
      '!ref': 'A1:L4',
      '!cols': []
    };
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue(mockWorksheet);
    
    exportToExcel(mockResults);
    
    expect(mockWorksheet['!cols']).toEqual([
      { wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 18 },
      { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
    ]);
  });

  it('should append worksheet to workbook with correct name', () => {
    const mockWorkbook = {};
    const mockWorksheet = { '!ref': 'A1:L4', '!cols': [] };
    
    (XLSX.utils.book_new as jest.Mock).mockReturnValue(mockWorkbook);
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue(mockWorksheet);
    
    exportToExcel(mockResults);
    
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      mockWorkbook,
      mockWorksheet,
      'Azure Cost Analysis'
    );
  });

  it('should generate Excel file with correct MIME type', () => {
    exportToExcel(mockResults);
    
    expect(XLSX.write).toHaveBeenCalledWith(
      expect.any(Object),
      { bookType: 'xlsx', type: 'array' }
    );
    
    expect(global.Blob).toHaveBeenCalledWith(
      [expect.any(ArrayBuffer)],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
  });

  it('should create download link with date in filename', () => {
    const mockDate = '2024-01-15';
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:30:00.000Z');
    
    exportToExcel(mockResults);
    
    expect(mockAnchor.download).toBe(`azure-cost-calculation-${mockDate}.xlsx`);
    expect(mockAnchor.href).toBe('mock-blob-url');
  });

  it('should trigger download and cleanup', () => {
    exportToExcel(mockResults);
    
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
  });

  it('should handle empty results array', () => {
    expect(() => exportToExcel([])).not.toThrow();
    expect(XLSX.utils.book_new).toHaveBeenCalled();
  });

  it('should handle results with missing breakdown data', () => {
    const resultsWithoutBreakdown: PricingResult[] = [
      {
        region: 'eastus',
        os: 'Linux',
        hoursToRun: 168,
        storageCapacity: 50,
        vmCost: 75.5,
        storageCost: 2.1,
        totalCost: 77.6,
        hostname: 'test-server'
      }
    ];
    
    // Clear previous mock calls
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockClear();
    
    expect(() => exportToExcel(resultsWithoutBreakdown)).not.toThrow();
    
    const callArgs = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls[0][0];
    const dataRow = callArgs.find((row: any[]) => row[0] === 'test-server');
    
    expect(dataRow).toBeDefined();
    expect(dataRow[3]).toBe('Unknown'); // VM Size should default to 'Unknown'
  });

  it('should format data correctly for various data types', () => {
    exportToExcel(mockResults);
    
    const callArgs = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls[0][0];
    const firstDataRow = callArgs[1]; // Skip header row
    
          expect(firstDataRow[0]).toBe('test-web-server-01'); // Hostname (string)
    expect(firstDataRow[1]).toBe('canadacentral'); // Region (string)
    expect(firstDataRow[6]).toBe(730); // Hours (number)
    expect(firstDataRow[7]).toBe(74.11); // Storage capacity (number)
    expect(firstDataRow[8]).toBe(148.92); // VM Cost (number)
  });
}); 