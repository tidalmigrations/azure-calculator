#!/bin/bash

# Environment setup script for manual Pulumi commands
# Usage: source ./env-setup.sh

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ .env file not found. Please create one with AWS_PROFILE, AWS_REGION, and STACK_NAME"
    return 1
fi

# Validate required environment variables
if [ -z "$AWS_PROFILE" ] || [ -z "$AWS_REGION" ] || [ -z "$STACK_NAME" ]; then
    echo "❌ Missing required environment variables. Please check your .env file contains:"
    echo "   AWS_PROFILE=your-aws-profile"
    echo "   AWS_REGION=your-aws-region"
    echo "   STACK_NAME=your-stack-name"
    return 1
fi

echo "🔧 Setting up Pulumi environment"
echo "AWS Profile: ${AWS_PROFILE}"
echo "AWS Region: ${AWS_REGION}"
echo "Stack: ${STACK_NAME}"

# Export AWS environment variables
export AWS_PROFILE="${AWS_PROFILE}"
export AWS_REGION="${AWS_REGION}"

# Check if bucket name exists
if [ ! -f .pulumi-bucket-name ]; then
    echo "❌ Pulumi backend not configured. Run ./setup-backend.sh first"
    return 1
fi

BUCKET_NAME=$(cat .pulumi-bucket-name)
echo "📦 Using Pulumi state bucket: ${BUCKET_NAME}"

# Login to Pulumi backend
echo "🔑 Logging into Pulumi backend"
pulumi login "s3://${BUCKET_NAME}"

# Select stack
echo "📋 Selecting stack: ${STACK_NAME}"
pulumi stack select "${STACK_NAME}" 2>/dev/null || {
    echo "⚠️  Stack ${STACK_NAME} not found. You may need to create it with:"
    echo "   pulumi stack init ${STACK_NAME}"
    return 1
}

# Set AWS region in Pulumi config
echo "🌍 Setting AWS region in Pulumi config"
pulumi config set aws:region "${AWS_REGION}"

echo "✅ Environment ready! You can now run Pulumi commands:"
echo "   pulumi preview"
echo "   pulumi up"
echo "   pulumi destroy"
echo "   pulumi config list" 