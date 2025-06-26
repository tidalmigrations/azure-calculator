'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import type { PricingResult } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { CostBreakdown } from '@/components';

interface PricingResultsProps {
  results: PricingResult[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export const PricingResults: React.FC<PricingResultsProps> = ({
  results,
  isLoading = false,
  error = null,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Calculating Azure costs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-red-800">Calculation Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="text-gray-500 text-center">No pricing results available</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalVMCost = results.reduce((sum, result) => sum + result.vmCost, 0);
  const totalStorageCost = results.reduce((sum, result) => sum + result.storageCost, 0);
  const grandTotal = totalVMCost + totalStorageCost;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total VM Costs</p>
              <p className="text-2xl font-bold">{formatCurrency(totalVMCost)}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-50 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Storage Costs</p>
              <p className="text-2xl font-bold">{formatCurrency(totalStorageCost)}</p>
            </div>
            <div className="bg-green-400 bg-opacity-50 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Grand Total</p>
              <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="bg-purple-400 bg-opacity-50 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Detailed Cost Breakdown ({results.length} servers)
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hostname
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VM Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RAM (GB)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage (GB)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VM Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => (
                <PricingResultRow 
                  key={index} 
                  result={result} 
                  index={index}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium text-gray-900">Export Results</h4>
            <p className="text-sm text-gray-600 mt-1">
              Download your cost calculations for further analysis
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => exportToExcel(results)}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              📊 Export Excel
            </button>
            <button
              onClick={() => exportToJSON(results)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              📄 Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual result row component
interface PricingResultRowProps {
  result: PricingResult;
  index: number;
}

const PricingResultRow: React.FC<PricingResultRowProps> = ({ result, index: _index }) => {
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {result.hostname || result.breakdown?.vmDetails?.hostname || 'Unknown'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {result.region}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            result.os.toLowerCase().includes('windows') 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {result.os}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {result.breakdown?.vmDetails?.size || 'Unknown'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {result.requiredCPUs || result.breakdown?.vmDetails?.cpu || 'Unknown'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {result.requiredRAM || result.breakdown?.vmDetails?.ram || 'Unknown'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {result.hoursToRun.toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {result.storageCapacity} GB
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {formatCurrency(result.vmCost)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {formatCurrency(result.storageCost)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
          {formatCurrency(result.totalCost)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {result.breakdown?.vmDetails?.currency || result.breakdown?.storageDetails?.currency || 'USD'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showBreakdown ? 'Hide' : 'Show'} Details
          </button>
        </td>
      </tr>
      {showBreakdown && result.breakdown && (
        <tr>
          <td colSpan={13} className="px-6 py-4 bg-gray-50">
            <CostBreakdown breakdown={result.breakdown} />
          </td>
        </tr>
      )}
    </>
  );
};

// Export functions
const exportToExcel = (results: PricingResult[]) => {
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  
  // Prepare data with headers
  const headers = ['Hostname', 'Region', 'OS', 'VM Size', 'CPU', 'RAM (GB)', 'Hours', 'Storage (GB)', 'VM Cost', 'Storage Cost', 'Total Cost', 'Currency'];
  
  // Prepare data rows
  const dataRows = results.map((result, _index) => [
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
  const _totalRowIndex = dataRows.length + 2; // +1 for header, +1 for 0-indexed
  const vmCostColumn = 'I'; // VM Cost column (9th column, I)
  const storageCostColumn = 'J'; // Storage Cost column (10th column, J)
  const totalCostColumn = 'K'; // Total Cost column (11th column, K)
  
  const totalsRow = [
    'TOTALS', '', '', '', '', '', '', '',
    '', '', '', // Placeholders for formula cells
    'USD'
  ];
  
  worksheetData.push(totalsRow);
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Add formulas to the totals row after worksheet creation
  const totalsRowIndexForFormulas = worksheetData.length - 1;
  worksheet[XLSX.utils.encode_cell({ r: totalsRowIndexForFormulas, c: 8 })] = { 
    f: `SUM(${vmCostColumn}2:${vmCostColumn}${totalsRowIndexForFormulas})` 
  }; // VM Cost total
  worksheet[XLSX.utils.encode_cell({ r: totalsRowIndexForFormulas, c: 9 })] = { 
    f: `SUM(${storageCostColumn}2:${storageCostColumn}${totalsRowIndexForFormulas})` 
  }; // Storage Cost total
  worksheet[XLSX.utils.encode_cell({ r: totalsRowIndexForFormulas, c: 10 })] = { 
    f: `SUM(${totalCostColumn}2:${totalCostColumn}${totalsRowIndexForFormulas})` 
  }; // Grand total
  
  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Hostname
    { wch: 15 }, // Region
    { wch: 35 }, // OS
    { wch: 18 }, // VM Size
    { wch: 8 },  // CPU
    { wch: 12 }, // RAM (GB)
    { wch: 10 }, // Hours
    { wch: 12 }, // Storage (GB)
    { wch: 12 }, // VM Cost
    { wch: 12 }, // Storage Cost
    { wch: 12 }, // Total Cost
    { wch: 10 }  // Currency
  ];
  worksheet['!cols'] = columnWidths;
  
  // Style the header row
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E5E7EB' } }, // Gray background
      alignment: { horizontal: 'center' }
    };
  }
  
  // Style the totals row
  for (let col = 0; col < headers.length; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalsRowIndexForFormulas, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'DBEAFE' } }, // Blue background
      alignment: { horizontal: col === 0 ? 'left' : 'right' }
    };
  }
  
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

const exportToJSON = (results: PricingResult[]) => {
  const jsonContent = JSON.stringify(results, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'azure-cost-calculation.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 