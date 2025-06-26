const serverless = require("serverless-http");

// Import the Next.js server from the standalone build
const server = require("./server.js");

// Create the Lambda handler by wrapping the Next.js server with serverless-http
const handler = serverless(server);

module.exports.handler = async (event, context) => {
  // Set the AWS Lambda context
  context.callbackWaitsForEmptyEventLoop = false;

  // Handle the request
  return await handler(event, context);
};
