#!/bin/bash

# Cleanup script for Azure Calculator AWS Lambda deployment
# This script destroys all infrastructure and optionally removes the S3 backend

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    set -a
    source .env
    set +a
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

echo "🧹 Cleaning up Azure Calculator AWS Lambda deployment"
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
    echo "❌ Pulumi backend not configured. Nothing to clean up."
    exit 0
fi

BUCKET_NAME=$(cat .pulumi-bucket-name)
echo "📦 Using Pulumi state bucket: ${BUCKET_NAME}"

# Login to Pulumi backend
echo "🔑 Logging into Pulumi backend"
pulumi login "s3://${BUCKET_NAME}"

# Check if stack exists
if pulumi stack ls | grep -q "${STACK_NAME}"; then
    echo "🗑️  Destroying stack: ${STACK_NAME}"
    pulumi stack select "${STACK_NAME}"
    pulumi destroy --yes
    
    echo "📋 Removing stack: ${STACK_NAME}"
    pulumi stack rm "${STACK_NAME}" --yes
else
    echo "ℹ️  Stack ${STACK_NAME} not found, skipping destroy"
fi

# Ask if user wants to remove the S3 backend
echo ""
read -p "Do you want to remove the S3 backend bucket (${BUCKET_NAME})? This will delete all Pulumi state! (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing S3 bucket: ${BUCKET_NAME}"
    
    # Remove all objects and versions from bucket
    aws s3api delete-objects \
        --bucket "${BUCKET_NAME}" \
        --delete "$(aws s3api list-object-versions \
            --bucket "${BUCKET_NAME}" \
            --output json \
            --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')" 2>/dev/null || true
    
    # Remove delete markers
    aws s3api delete-objects \
        --bucket "${BUCKET_NAME}" \
        --delete "$(aws s3api list-object-versions \
            --bucket "${BUCKET_NAME}" \
            --output json \
            --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')" 2>/dev/null || true
    
    # Delete the bucket
    aws s3 rb "s3://${BUCKET_NAME}" --force
    
    # Remove the bucket name file
    rm -f .pulumi-bucket-name
    
    echo "✅ S3 backend bucket removed"
else
    echo "ℹ️  S3 backend bucket preserved"
fi

echo "✅ Cleanup complete!" 