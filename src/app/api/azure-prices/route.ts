import { NextRequest, NextResponse } from 'next/server';
import { AzureApiResponse } from '@/types';

/**
 * Azure Retail Prices API Proxy
 * 
 * This API route acts as a proxy to the Azure Retail Prices API to avoid CORS issues
 * when making requests directly from the browser.
 */

const AZURE_API_BASE_URL = 'https://prices.azure.com/api/retail/prices';
const API_VERSION = '2023-01-01-preview';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const skip = searchParams.get('skip');
    
    if (!filter) {
      return NextResponse.json(
        { error: 'Filter parameter is required' },
        { status: 400 }
      );
    }

    // Construct the Azure API URL
    // Note: filter is already URL-encoded by the client, so we don't encode it again
    let azureUrl = `${AZURE_API_BASE_URL}?api-version=${API_VERSION}&$filter=${filter}`;
    if (skip) {
      azureUrl += `&$skip=${skip}`;
    }
    
    console.log(`Proxying request to Azure API: ${azureUrl}`);
    
    // Make the request to Azure API
    const response = await fetch(azureUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Azure-Calculator/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Azure API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { 
          error: `Azure API error: ${response.statusText}`,
          status: response.status 
        },
        { status: response.status }
      );
    }

    const data: AzureApiResponse = await response.json();
    
    console.log(`Azure API returned ${data.Items?.length || 0} items`);
    
    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from Azure API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 