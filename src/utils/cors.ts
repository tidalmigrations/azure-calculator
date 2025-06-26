/**
 * CORS Configuration
 * 
 * Configurable CORS settings for API routes.
 * Update ALLOWED_ORIGINS when deploying to production with your domain.
 */

// Configure allowed origins here
// For development: ['http://localhost:3000', 'http://127.0.0.1:3000']
// For production: ['https://yourdomain.com', 'https://www.yourdomain.com']
// For public API: ['*'] (current setting)
const ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['*']; // Default to allow all origins

/**
 * Get CORS headers for API responses
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // If allowing all origins, use wildcard
  if (ALLOWED_ORIGINS.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    // If specific origin is allowed, use it
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Vary'] = 'Origin'; // Important for caching when using specific origins
  } else {
    // If origin is not allowed, don't set the header (will cause CORS error)
    // This is the secure behavior
  }

  return headers;
}

/**
 * Create a CORS-enabled Response
 */
export function createCorsResponse(
  body: any = null, 
  init: ResponseInit = {}, 
  requestOrigin?: string
): Response {
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  return new Response(body, {
    ...init,
    headers: {
      ...init.headers,
      ...corsHeaders,
    },
  });
}

/**
 * Create a CORS-enabled NextResponse
 */
export function createCorsNextResponse(
  body: any = null, 
  init: ResponseInit = {}, 
  requestOrigin?: string
): Response {
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  if (body === null) {
    return new Response(null, {
      ...init,
      headers: {
        ...init.headers,
        ...corsHeaders,
      },
    });
  }
  
  return Response.json(body, {
    ...init,
    headers: {
      ...init.headers,
      ...corsHeaders,
    },
  });
}

/**
 * Handle CORS preflight OPTIONS request
 */
export function handleCorsOptions(request: Request): Response {
  const origin = request.headers.get('Origin');
  return createCorsResponse(null, { status: 200 }, origin || undefined);
} 