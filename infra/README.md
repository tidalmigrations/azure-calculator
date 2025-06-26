# AWS Lambda Infrastructure for Next.js

Infrastructure as Code (IaC) for deploying Next.js applications to AWS Lambda using Pulumi and TypeScript.

## Features

- AWS Lambda deployment with Function URLs
- S3 backend for Pulumi state management
- Automated deployment and cleanup scripts
- Environment-based configuration
- Security-focused setup with encryption

## Project Structure

```
infra/
├── setup-backend.sh      # S3 backend setup script
├── deploy.sh            # Deployment script
├── cleanup.sh           # Cleanup script
├── env-setup.sh         # Environment setup for manual Pulumi commands
├── index.ts             # Pulumi infrastructure code
├── package.json         # Dependencies
├── Pulumi.yaml          # Project configuration
├── Pulumi.dev.yaml      # Stack configuration (not in git)
├── .env                 # Environment variables (not in git)
└── .env.example         # Environment template
```

## Prerequisites

- Node.js and npm
- Pulumi CLI
- AWS CLI with configured credentials

## Setup

1. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your AWS profile and region
   ```

2. **Set up Pulumi backend**:
   ```bash
   ./setup-backend.sh
   ```

## Configuration

### Environment Variables (.env)

```bash
# Pulumi Configuration
PULUMI_CONFIG_PASSPHRASE=your-secure-passphrase

# AWS Configuration
AWS_PROFILE=your-aws-profile
AWS_REGION=us-east-1
STACK_NAME=dev
```

### Pulumi Stack Configuration

The `Pulumi.dev.yaml` file is automatically created and contains stack-specific settings:

```bash
# Set additional configuration as needed
pulumi config set aws:region us-east-1
pulumi config set --secret app:secret-value your-secret
```

## Usage

**Deploy infrastructure**:
```bash
./deploy.sh
```

**Clean up resources**:
```bash
./cleanup.sh
```

**Manual Pulumi commands**:
```bash
# Set up environment for manual commands
source ./env-setup.sh

# Then run any Pulumi commands
pulumi preview
pulumi up
pulumi destroy
pulumi config list
```
