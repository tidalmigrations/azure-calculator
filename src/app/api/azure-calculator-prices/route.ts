import { NextRequest, NextResponse } from 'next/server';

/**
 * Azure Pricing Calculator API Proxy
 * 
 * This API route acts as a proxy to the Azure Pricing Calculator API
 * which has more up-to-date VM pricing data than the Retail Prices API.
 */

const AZURE_CALCULATOR_BASE = 'https://azure.microsoft.com/api/v4/pricing/virtual-machines/calculator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    
    if (!region) {
      return NextResponse.json(
        { error: 'Region parameter is required' },
        { status: 400 }
      );
    }

    // Build Azure Calculator API URL
    const azureUrl = `${AZURE_CALCULATOR_BASE}/${region}/?culture=en-us&discount=mca`;

    console.log('Fetching from Azure Calculator API:', azureUrl);

    // Fetch from Azure Calculator API
    const response = await fetch(azureUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Azure-Cost-Calculator/1.0'
      }
    });

    if (!response.ok) {
      console.error('Azure Calculator API error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: `Azure Calculator API error: ${response.status} ${response.statusText}`,
          details: await response.text()
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log some basic info about the response
    const offerCount = data.offers ? Object.keys(data.offers).length : 0;
    console.log(`Azure Calculator API response: ${offerCount} offers for region ${region}`);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Calculator API route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 