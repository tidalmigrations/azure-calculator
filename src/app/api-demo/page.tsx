'use client';

import { useState } from 'react';
import { azureClient, getAvailableRegions, type AzureRetailPrice } from '@/lib/api';

export default function ApiDemoPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AzureRetailPrice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState('eastus');
  const [os, setOs] = useState<'windows' | 'linux'>('linux');

  const availableRegions = getAvailableRegions();

  const testVMPricing = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      console.log(`Fetching VM prices for ${os} in ${region}...`);
      const prices = await azureClient.getVMPrices(region, os);
      setResults(prices.slice(0, 10)); // Show first 10 results
      console.log(`✅ Found ${prices.length} VM prices`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Failed to fetch VM prices:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testStoragePricing = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      console.log(`Fetching storage prices in ${region}...`);
      const prices = await azureClient.getStoragePrices(region, 'standard-hdd');
      setResults(prices.slice(0, 10)); // Show first 10 results
      console.log(`✅ Found ${prices.length} storage prices`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Failed to fetch storage prices:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    azureClient.clearCache();
    console.log('🧹 Cache cleared');
  };

  const cacheStats = azureClient.getCacheStats();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Azure API Integration Demo
          </h1>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">CORS Issue Resolved ✅</h3>
                <p className="text-sm text-green-700">
                  API requests now work through our proxy server at <code>/api/azure-prices</code> to avoid browser CORS restrictions.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">API Testing Controls</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRegions.slice(0, 10).map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.displayName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating System
                </label>
                <select
                  value={os}
                  onChange={(e) => setOs(e.target.value as 'windows' | 'linux')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  Cache: {cacheStats.size} entries
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={testVMPricing}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Test VM Pricing'}
              </button>
              
              <button
                onClick={testStoragePricing}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Test Storage Pricing'}
              </button>
              
              <button
                onClick={clearCache}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear Cache
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-semibold">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Results ({results.length} shown)
              </h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        SKU / Product
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        Price
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        Unit
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        Location
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        Service
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((price, index) => (
                      <tr key={`${price.meterId}-${index}`} className="border-t">
                        <td className="px-4 py-2 text-sm">
                          <div>
                            <div className="font-medium">
                              {price.armSkuName || price.meterName}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {price.productName}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          ${price.unitPrice.toFixed(4)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {price.unitOfMeasure}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {price.location}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {price.serviceName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-sm text-gray-600">
            <p>
              <strong>Note:</strong> This demo shows the Azure API integration in action. 
              Open your browser's developer console to see detailed logging.
            </p>
            <p className="mt-2">
              The API client includes caching, so subsequent identical requests will be much faster.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 