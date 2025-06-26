import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as fs from "fs";
import * as path from "path";

// Configuration
const config = new pulumi.Config();
const region = aws.config.region || "us-east-1";

// Environment variables with defaults
const projectName = process.env.PROJECT_NAME || "azure-calculator";
const environment = process.env.ENVIRONMENT || "dev";
const lambdaMemorySize = parseInt(process.env.LAMBDA_MEMORY_SIZE || "1024");
const lambdaTimeout = parseInt(process.env.LAMBDA_TIMEOUT || "30");
const lambdaDescription = process.env.LAMBDA_DESCRIPTION || "Azure Calculator Lambda Function";

// 1. S3 Bucket for Lambda code
const lambdaCodeBucket = new aws.s3.Bucket(`${projectName}-lambda-code`, {
    tags: {
        Project: projectName,
        Environment: environment,
    },
});

// Create a deployment package by zipping the standalone build
const deploymentPackage = new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../.lambda"),
});

// Upload the Lambda code to S3
const lambdaCodeObject = new aws.s3.BucketObject(`${projectName}-lambda-code-object`, {
    bucket: lambdaCodeBucket.id,
    key: "lambda-code.zip",
    source: deploymentPackage,
    tags: {
        Project: projectName,
        Environment: environment,
    },
});

// 2. IAM Role for Lambda
const lambdaRole = new aws.iam.Role(`${projectName}-lambda-role`, {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "lambda.amazonaws.com",
                },
            },
        ],
    }),
    tags: {
        Project: projectName,
        Environment: environment,
    },
});

// Attach the basic execution policy to the role
const lambdaRolePolicyAttachment = new aws.iam.RolePolicyAttachment(`${projectName}-lambda-role-policy`, {
    role: lambdaRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// 3. Lambda Function using S3 code
const lambdaFunction = new aws.lambda.Function(`${projectName}-lambda`, {
    name: projectName,
    runtime: aws.lambda.Runtime.NodeJS18dX,
    handler: "lambda-handler.handler",
    role: lambdaRole.arn,
    s3Bucket: lambdaCodeBucket.id,
    s3Key: lambdaCodeObject.key,
    memorySize: lambdaMemorySize,
    timeout: lambdaTimeout,
    description: lambdaDescription,
    environment: {
        variables: {
            NODE_ENV: "production",
            PROJECT_NAME: projectName,
            ENVIRONMENT: environment,
        },
    },
    tags: {
        Project: projectName,
        Environment: environment,
    },
}, {
    dependsOn: [lambdaRolePolicyAttachment, lambdaCodeObject],
});

// 4. Lambda Function URL with CORS Configuration
const functionUrl = new aws.lambda.FunctionUrl(`${projectName}-function-url`, {
    functionName: lambdaFunction.name,
    authorizationType: "NONE", // Public access as requested
    cors: {
        allowCredentials: false,
        allowHeaders: ["*"],
        allowMethods: ["*"],
        allowOrigins: ["*"],
        exposeHeaders: ["*"],
        maxAge: 86400, // 24 hours
    },
});

// Outputs
export const lambdaFunctionName = lambdaFunction.name;
export const lambdaFunctionArn = lambdaFunction.arn;
export const functionUrlEndpoint = functionUrl.functionUrl;
export const lambdaRoleArn = lambdaRole.arn;
export const lambdaCodeBucketName = lambdaCodeBucket.id;
export const projectNameOutput = projectName;
export const environmentOutput = environment;

// Output instructions for testing
export const testingInstructions = pulumi.interpolate`
Deployment completed! 

🚀 Your ${projectName} is now deployed to AWS Lambda!

Function URL: ${functionUrl.functionUrl}

Test your deployment:
1. Open the Function URL in your browser
2. Navigate to /calculator to test the calculator page
3. Test API endpoints like /api/azure-prices

CORS is configured to allow all origins, methods, and headers for development.
`;
