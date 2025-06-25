'use client';

import React from 'react';
import type { ParsedSpreadsheet } from '@/types';

interface DataPreviewProps {
  data: ParsedSpreadsheet;
  maxRows?: number;
  className?: string;
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  data,
  maxRows = 5,
  className = ''
}) => {
  const previewRows = data.rows.slice(0, maxRows);

  if (data.headers.length === 0 || previewRows.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500 text-center">No data to preview</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Preview</h3>
        <p className="text-sm text-gray-600">
          Showing {Math.min(maxRows, data.rows.length)} of {data.rows.length} rows
          {data.hasHeaders && ' (headers detected automatically)'}
        </p>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center space-x-1">
                    <span className="truncate max-w-32" title={header}>
                      {header}
                    </span>
                    {!data.hasHeaders && (
                      <span className="text-gray-400 text-xs">(auto)</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {data.headers.map((header, colIndex) => {
                  const value = row[header];
                  const displayValue = value === null || value === undefined ? '' : String(value);
                  
                  return (
                    <td
                      key={colIndex}
                      className="px-4 py-3 text-sm text-gray-900"
                    >
                      <div 
                        className="truncate max-w-32" 
                        title={displayValue}
                      >
                        {displayValue || (
                          <span className="text-gray-400 italic">empty</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.rows.length > maxRows && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          ... and {data.rows.length - maxRows} more rows
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="font-medium text-blue-900">Total Rows</div>
          <div className="text-blue-700">{data.rows.length}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="font-medium text-green-900">Total Columns</div>
          <div className="text-green-700">{data.headers.length}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="font-medium text-purple-900">Headers</div>
          <div className="text-purple-700">
            {data.hasHeaders ? 'Detected' : 'Auto-generated'}
          </div>
        </div>
      </div>
    </div>
  );
}; 