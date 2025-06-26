#!/bin/bash

# Deployment script for Azure Calculator to AWS Lambda
# Based on the deployment pattern from the referenced example

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ .env file not found. Please create one with AWS_PROFILE, AWS_REGION, and STACK_NAME"
    exit 1
fi

# Validate required environment variables
if [ -z "$AWS_PROFILE" ] || [ -z "$AWS_REGION" ] || [ -z "$STACK_NAME" ]; then
    echo "❌ Missing required environment variables. Please check your .env file contains:"
    echo "   AWS_PROFILE=your-aws-profile"
    echo "   AWS_REGION=your-aws-region"
    echo "   STACK_NAME=your-stack-name"
    exit 1
fi

echo "🚀 Deploying Azure Calculator to AWS Lambda"
echo "AWS Profile: ${AWS_PROFILE}"
echo "AWS Region: ${AWS_REGION}"
echo "Stack: ${STACK_NAME}"

# Export AWS environment variables
export AWS_PROFILE="${AWS_PROFILE}"
export AWS_REGION="${AWS_REGION}"

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if bucket name exists
if [ ! -f .pulumi-bucket-name ]; then
    echo "❌ Pulumi backend not configured. Run ./setup-backend.sh first"
    exit 1
fi

BUCKET_NAME=$(cat .pulumi-bucket-name)
echo "📦 Using Pulumi state bucket: ${BUCKET_NAME}"

# Login to Pulumi backend
echo "🔑 Logging into Pulumi backend"
pulumi login "s3://${BUCKET_NAME}"

# Select or create stack
echo "📋 Selecting stack: ${STACK_NAME}"
pulumi stack select "${STACK_NAME}" || pulumi stack init "${STACK_NAME}"

# Set AWS region in Pulumi config
echo "🌍 Setting AWS region in Pulumi config"
pulumi config set aws:region "${AWS_REGION}"

# Build the Next.js application (from parent directory)
echo "🔨 Building Next.js application"
cd ..
npm run build
cd infra

# Deploy infrastructure
echo "🚀 Deploying infrastructure"
pulumi up --yes

echo "✅ Deployment complete!"
echo "🔗 Check the outputs above for your Lambda Function URL" 