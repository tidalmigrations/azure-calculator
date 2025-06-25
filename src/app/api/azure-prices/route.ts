import { NextRequest, NextResponse } from 'next/server';
import { vmCalculator } from '@/lib/calculators';

/**
 * Azure Retail Prices API Proxy
 * 
 * This API route acts as a proxy to the Azure Retail Prices API to avoid CORS issues
 * when making requests directly from the browser.
 */

const AZURE_API_BASE = 'https://prices.azure.com/api/retail/prices';
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

    // Build Azure API URL
    let azureUrl = `${AZURE_API_BASE}?api-version=${API_VERSION}&$filter=${encodeURIComponent(filter)}`;
    
    if (skip) {
      azureUrl += `&$skip=${skip}`;
    }

    console.log('Fetching from Azure API:', azureUrl);

    // Fetch from Azure API
    const response = await fetch(azureUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Azure-Cost-Calculator/1.0'
      }
    });

    if (!response.ok) {
      console.error('Azure API error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: `Azure API error: ${response.status} ${response.statusText}`,
          details: await response.text()
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log some basic info about the response
    console.log(`Azure API response: ${data.Items?.length || 0} items, NextPageLink: ${!!data.NextPageLink}`);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for direct VM calculations (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 VM Calculation Request:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.hostname || !body.region || !body.os || !body.hoursToRun) {
      return NextResponse.json(
        { error: 'Missing required fields: hostname, region, os, hoursToRun' },
        { status: 400 }
      );
    }

    // Calculate VM cost using the VM calculator
    const result = await vmCalculator.calculate(body);
    
    console.log('🧪 VM Calculation Result:', JSON.stringify(result, null, 2));
    
    // Return result in a format similar to the batch calculation
    return NextResponse.json({
      servers: [{
        hostname: body.hostname,
        vmSize: result.details.vmSize,
        hourlyRate: result.details.hourlyRate,
        totalCost: result.cost,
        totalHours: result.details.totalHours,
        region: result.details.region,
        os: result.details.osType,
        currency: result.details.currency,
        cpu: result.details.cpu,
        ram: result.details.ram,
        skuName: result.details.skuName,
        productName: result.details.productName,
        unitOfMeasure: result.details.unitOfMeasure,
        requiredCPUs: result.details.requiredCPUs,
        requiredRAM: result.details.requiredRAM
      }]
    });
    
  } catch (error) {
    console.error('VM calculation error:', error);
    return NextResponse.json(
      { 
        error: 'VM calculation failed',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 