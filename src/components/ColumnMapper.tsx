'use client';

import React, { useState, useEffect } from 'react';
import type { ColumnMapping, ParsedSpreadsheet } from '@/types';
import { detectColumnMappings } from '@/utils/helpers';

interface ColumnMapperProps {
  data: ParsedSpreadsheet;
  onMappingChange: (mapping: ColumnMapping) => void;
  className?: string;
}

const REQUIRED_FIELDS = [
  {
    key: 'region' as keyof ColumnMapping,
    label: 'Azure Region',
    description: 'The Azure region where resources will be deployed',
    examples: ['eastus', 'westeurope', 'East US', 'West Europe'],
    required: true
  },
  {
    key: 'os' as keyof ColumnMapping,
    label: 'Operating System',
    description: 'The operating system for the virtual machine',
    examples: ['Windows', 'Linux', 'windows', 'linux'],
    required: true
  },
  {
    key: 'hoursToRun' as keyof ColumnMapping,
    label: 'Hours to Run',
    description: 'Number of hours the VM will run per month',
    examples: ['720', '168', '8760'],
    required: true
  },
  {
    key: 'storageCapacity' as keyof ColumnMapping,
    label: 'Storage Capacity (GB)',
    description: 'Storage capacity in gigabytes',
    examples: ['100', '500', '1000'],
    required: true
  },
  {
    key: 'hostname' as keyof ColumnMapping,
    label: 'Server Hostname',
    description: 'Server hostname or name (optional - will be auto-generated if not provided)',
    examples: ['srv-web-01', 'database-server', 'app.domain.com'],
    required: false
  },
  {
    key: 'cpuCount' as keyof ColumnMapping,
    label: 'CPU Count',
    description: 'Number of CPU cores required (optional - helps select appropriate VM size)',
    examples: ['2', '4', '8', '16'],
    required: false
  },
  {
    key: 'ramCapacity' as keyof ColumnMapping,
    label: 'RAM Capacity (GB)',
    description: 'Amount of RAM required in GB (optional - helps select appropriate VM size)',
    examples: ['4', '8', '16', '32'],
    required: false
  },
  {
    key: 'applicationGroup' as keyof ColumnMapping,
    label: 'Application Group',
    description: 'Application or service group classification (optional)',
    examples: ['Web Servers', 'Database', 'Development', 'Production'],
    required: false
  },
  {
    key: 'matchType' as keyof ColumnMapping,
    label: 'Match Type',
    description: 'Type of matching used for server identification (optional)',
    examples: ['exact', 'fuzzy', 'partial'],
    required: false
  },
  {
    key: 'confidenceScore' as keyof ColumnMapping,
    label: 'Confidence Score',
    description: 'Confidence level of the server match (optional)',
    examples: ['1.0', '0.95', '0.8'],
    required: false
  },
  {
    key: 'environment' as keyof ColumnMapping,
    label: 'Environment',
    description: 'Deployment environment (optional)',
    examples: ['Production', 'Development', 'Staging', 'QA'],
    required: false
  },
  {
    key: 'fqdn' as keyof ColumnMapping,
    label: 'FQDN',
    description: 'Fully Qualified Domain Name (optional)',
    examples: ['server.domain.com', 'app.company.local'],
    required: false
  },
  {
    key: 'ipAddresses' as keyof ColumnMapping,
    label: 'IP Addresses',
    description: 'Server IP addresses (optional)',
    examples: ['192.168.1.100', '10.0.0.1', '172.16.0.5'],
    required: false
  },
  {
    key: 'vmFamily' as keyof ColumnMapping,
    label: 'VM Family',
    description: 'Preferred Azure VM family (optional - overrides automatic selection)',
    examples: ['dsv6', 'dsv5', 'B-series', 'Fsv2'],
    required: false
  }
];

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  data,
  onMappingChange,
  className = ''
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({
    region: null,
    os: null,
    hoursToRun: null,
    storageCapacity: null,
    hostname: null,
    cpuCount: null,
    ramCapacity: null,
    applicationGroup: null,
    matchType: null,
    confidenceScore: null,
    environment: null,
    fqdn: null,
    ipAddresses: null,
    vmFamily: null
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Auto-detect column mappings when data changes
  useEffect(() => {
    if (data.headers.length > 0) {
      const autoMapping = detectColumnMappings(data.headers);
      setMapping(autoMapping);
      onMappingChange(autoMapping);
    }
  }, [data.headers, onMappingChange]);

  // Validate mapping and sample data
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    REQUIRED_FIELDS.forEach(field => {
      const selectedColumn = mapping[field.key];
      if (!selectedColumn && field.required) {
        errors[field.key] = 'This field is required';
        return;
      }

      if (selectedColumn && data.rows.length > 0) {
        // Check if the column has data
        const sampleValues = data.rows.slice(0, 5).map(row => row[selectedColumn]);
        const hasData = sampleValues.some(val => val !== null && val !== undefined && val !== '');
        
        if (!hasData) {
          errors[field.key] = 'Selected column appears to be empty';
        }

        // Specific validation for numeric fields
        if ((field.key === 'hoursToRun' || field.key === 'storageCapacity' || field.key === 'cpuCount' || field.key === 'ramCapacity') && hasData) {
          const numericValues = sampleValues.filter(val => val !== null && val !== undefined && val !== '');
          const hasValidNumbers = numericValues.some(val => !isNaN(Number(val)) && Number(val) > 0);
          
          if (!hasValidNumbers) {
            errors[field.key] = 'Selected column should contain numeric values';
          }
        }
      }
    });

    setValidationErrors(errors);
  }, [mapping, data.rows]);

  const handleMappingChange = (fieldKey: keyof ColumnMapping, columnName: string | null) => {
    const newMapping = { ...mapping, [fieldKey]: columnName };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const getSampleValues = (columnName: string | null): string[] => {
    if (!columnName || data.rows.length === 0) return [];
    
    return data.rows
      .slice(0, 3)
      .map(row => row[columnName])
      .filter(val => val !== null && val !== undefined && val !== '')
      .map(val => String(val));
  };

  const isValid = Object.keys(validationErrors).length === 0 && 
    REQUIRED_FIELDS.every(field => mapping[field.key] !== null);

  return (
    <div className={`${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Map Your Columns
        </h3>
        <p className="text-sm text-gray-600">
          Select which columns in your spreadsheet correspond to the required fields for Azure cost calculation.
        </p>
      </div>

      <div className="space-y-6">
        {REQUIRED_FIELDS.map(field => {
          const selectedColumn = mapping[field.key];
          const sampleValues = getSampleValues(selectedColumn);
          const hasError = validationErrors[field.key];

          return (
            <div
              key={field.key}
              className={`p-4 border rounded-lg ${
                hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <p className="text-sm text-gray-600 mb-2">
                    {field.description}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <select
                    value={selectedColumn || ''}
                    onChange={(e) => handleMappingChange(field.key, e.target.value || null)}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${
                      hasError 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select a column...</option>
                    {data.headers.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  
                  {hasError && (
                    <p className="mt-1 text-sm text-red-600">{hasError}</p>
                  )}
                </div>

                <div>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Expected values:</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {field.examples.join(', ')}
                  </div>
                  
                  {selectedColumn && sampleValues.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-700 mb-1">
                        <span className="font-medium">Sample from your data:</span>
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                        {sampleValues.slice(0, 3).join(', ')}
                        {sampleValues.length === 0 && (
                          <span className="text-red-500 italic">No data found</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Mapping Status</h4>
            <p className="text-sm text-gray-600">
              {isValid 
                ? 'All required fields are mapped and validated' 
                : `${Object.keys(validationErrors).length} issue${Object.keys(validationErrors).length !== 1 ? 's' : ''} need attention`
              }
            </p>
          </div>
          <div className={`flex items-center ${isValid ? 'text-green-600' : 'text-red-600'}`}>
            {isValid ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 