'use client';

import React from 'react';
import type { CostBreakdown as CostBreakdownType } from '@/types';
import { formatCurrency } from '@/utils/helpers';

interface CostBreakdownProps {
  breakdown: CostBreakdownType;
  className?: string;
}

export const CostBreakdown: React.FC<CostBreakdownProps> = ({
  breakdown,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-4">Cost Breakdown Details</h4>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* VM Details */}
        <div className="space-y-3">
          <div className="flex items-center mb-3">
            <div className="bg-blue-100 rounded-full p-2 mr-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h5 className="text-sm font-medium text-gray-900">Virtual Machine</h5>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">VM Size:</span>
              <span className="font-medium text-gray-900">{breakdown.vmDetails.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hourly Rate:</span>
              <span className="font-medium text-gray-900">{formatCurrency(breakdown.vmDetails.hourlyRate)}/hour</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Hours:</span>
              <span className="font-medium text-gray-900">{breakdown.vmDetails.totalHours.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">VM Subtotal:</span>
                <span className="font-bold text-blue-600">{formatCurrency(breakdown.vmDetails.subtotal)}</span>
              </div>
            </div>
          </div>

          {/* VM Cost Calculation Formula */}
          <div className="bg-blue-50 rounded-lg p-3 mt-3">
            <p className="text-xs text-blue-800 font-medium mb-1">Calculation:</p>
            <p className="text-xs text-blue-700">
              {formatCurrency(breakdown.vmDetails.hourlyRate)} × {breakdown.vmDetails.totalHours.toLocaleString()} hours = {formatCurrency(breakdown.vmDetails.subtotal)}
            </p>
          </div>
        </div>

        {/* Storage Details */}
        <div className="space-y-3">
          <div className="flex items-center mb-3">
            <div className="bg-green-100 rounded-full p-2 mr-3">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <h5 className="text-sm font-medium text-gray-900">Storage</h5>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Storage Tier:</span>
              <span className="font-medium text-gray-900">{breakdown.storageDetails.tier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Rate:</span>
              <span className="font-medium text-gray-900">{formatCurrency(breakdown.storageDetails.monthlyRate)}/GB/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Capacity:</span>
              <span className="font-medium text-gray-900">{breakdown.storageDetails.capacityGB} GB</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Storage Subtotal:</span>
                <span className="font-bold text-green-600">{formatCurrency(breakdown.storageDetails.subtotal)}</span>
              </div>
            </div>
          </div>

          {/* Storage Cost Calculation Formula */}
          <div className="bg-green-50 rounded-lg p-3 mt-3">
            <p className="text-xs text-green-800 font-medium mb-1">Calculation:</p>
            <p className="text-xs text-green-700">
              {formatCurrency(breakdown.storageDetails.monthlyRate)} × {breakdown.storageDetails.capacityGB} GB = {formatCurrency(breakdown.storageDetails.subtotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900">Total Cost</p>
              <p className="text-xs text-gray-600">VM + Storage</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(breakdown.vmDetails.subtotal + breakdown.storageDetails.subtotal)}
              </p>
              <p className="text-xs text-gray-600">
                {formatCurrency(breakdown.vmDetails.subtotal)} + {formatCurrency(breakdown.storageDetails.subtotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Distribution Chart */}
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Cost Distribution</p>
        <div className="flex rounded-lg overflow-hidden h-2">
          <div 
            className="bg-blue-500"
            style={{ 
              width: `${(breakdown.vmDetails.subtotal / (breakdown.vmDetails.subtotal + breakdown.storageDetails.subtotal)) * 100}%` 
            }}
          />
          <div 
            className="bg-green-500"
            style={{ 
              width: `${(breakdown.storageDetails.subtotal / (breakdown.vmDetails.subtotal + breakdown.storageDetails.subtotal)) * 100}%` 
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-600">
          <span>
            VM: {Math.round((breakdown.vmDetails.subtotal / (breakdown.vmDetails.subtotal + breakdown.storageDetails.subtotal)) * 100)}%
          </span>
          <span>
            Storage: {Math.round((breakdown.storageDetails.subtotal / (breakdown.vmDetails.subtotal + breakdown.storageDetails.subtotal)) * 100)}%
          </span>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs font-medium text-yellow-800">Pricing Notes</p>
            <ul className="text-xs text-yellow-700 mt-1 space-y-1">
              <li>• Prices are estimates based on Azure Retail Prices API</li>
              <li>• Actual costs may vary based on usage patterns and discounts</li>
              <li>• Storage costs assume standard tier pricing</li>
              <li>• VM costs are based on pay-as-you-go pricing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}; 