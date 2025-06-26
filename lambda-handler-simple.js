const serverless = require("serverless-http");

// Simple Express-like handler for API routes
const handler = (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith("/api/azure-prices")) {
    // Simple health check response
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        message: "Azure Calculator API is running",
        timestamp: new Date().toISOString(),
        path: pathname,
      })
    );
    return;
  }

  if (pathname.startsWith("/api/azure-calculator-prices")) {
    // Simple health check response
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        message: "Azure Calculator Prices API is running",
        timestamp: new Date().toISOString(),
        path: pathname,
      })
    );
    return;
  }

  // Default HTML response for other routes
  res.setHeader("Content-Type", "text/html");
  res.statusCode = 200;
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Azure Calculator</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .status { color: green; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Azure Calculator</h1>
        <p class="status">✅ Lambda function is running successfully!</p>
        <p>This is a simplified version of the Azure Calculator running on AWS Lambda.</p>
        <h2>Available API Endpoints:</h2>
        <ul>
          <li><a href="/api/azure-prices">/api/azure-prices</a> - Azure Prices API</li>
          <li><a href="/api/azure-calculator-prices">/api/azure-calculator-prices</a> - Calculator Prices API</li>
        </ul>
        <p><strong>Path:</strong> ${pathname}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    </body>
    </html>
  `);
};

// Create a simple Express-like app
const app = (req, res) => {
  try {
    handler(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ error: "Internal Server Error", message: error.message })
    );
  }
};

// Export the serverless handler
module.exports.handler = serverless(app);
