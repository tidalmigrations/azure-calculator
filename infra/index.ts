import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as path from "path";

// Configuration
const config = new pulumi.Config();
const region = aws.config.region || "us-east-1";

// Environment variables with defaults
const projectName = process.env.PROJECT_NAME || "azure-calculator";
const environment = process.env.ENVIRONMENT || "dev";
const lambdaMemorySize = parseInt(process.env.LAMBDA_MEMORY_SIZE || "2048"); // Increased for container
const lambdaTimeout = parseInt(process.env.LAMBDA_TIMEOUT || "60"); // Increased for container
const lambdaDescription = process.env.LAMBDA_DESCRIPTION || "Azure Calculator Lambda Function (Container)";

// 1. ECR Repository to store the Docker image
const repo = new awsx.ecr.Repository(`${projectName}-ecr-repo`, {
    forceDelete: true,
});

// 2. Build and publish the Docker image to ECR
const image = new awsx.ecr.Image(`${projectName}-ecr-image`, {
    repositoryUrl: repo.url,
    context: "..", // Context is the root of the project
    platform: "linux/amd64",
});

// 3. IAM Role for Lambda
const lambdaRole = new aws.iam.Role(`${projectName}-lambda-role`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
    }),
    tags: {
        Project: projectName,
        Environment: environment,
    },
});

// Attach the basic execution policy to the role
new aws.iam.RolePolicyAttachment(`${projectName}-lambda-role-policy`, {
    role: lambdaRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// Attach ECR permissions to the role
new aws.iam.RolePolicyAttachment(`${projectName}-ecr-access`, {
    role: lambdaRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
});


// 4. Lambda Function using Container Image
const lambdaFunction = new aws.lambda.Function(`${projectName}-lambda`, {
    name: projectName,
    packageType: "Image",
    imageUri: image.imageUri,
    role: lambdaRole.arn,
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
    dependsOn: [repo, image],
});

// 5. Lambda Function URL with CORS Configuration
const functionUrl = new aws.lambda.FunctionUrl(`${projectName}-function-url`, {
    functionName: lambdaFunction.name,
    authorizationType: "NONE", // Public access
    cors: {
        allowCredentials: true,
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
export const ecrRepositoryUrl = repo.url;
export const imageUri = image.imageUri;

export const testingInstructions = pulumi.interpolate`
Deployment completed!

🚀 Your ${projectName} is now deployed to AWS Lambda using a container image!

Function URL: ${functionUrl.functionUrl}

Test your deployment:
1. Open the Function URL in your browser. It should show the full Next.js application.
2. Test the file upload functionality on the main page.
`;
