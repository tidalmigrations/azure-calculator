# Azure Cost Calculator

A TypeScript-based web application that calculates Azure VM and storage costs from spreadsheet data using the Azure Retail Prices API.

## Features

- 📊 **Spreadsheet Upload**: Support for CSV and Excel files
- 🎯 **Smart Column Mapping**: Automatic header detection and manual mapping
- 💰 **Cost Calculation**: Real-time Azure pricing for VMs and storage
- 🌍 **Multi-Region Support**: All major Azure regions
- 🖥️ **OS Detection**: Automatic Windows/Linux detection
- 📱 **Responsive Design**: Works on desktop and mobile

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd azure-calculator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Spreadsheet Format

Your spreadsheet should contain the following columns (names can vary):

| Column | Description | Example Values |
|--------|-------------|----------------|
| Region | Azure region | eastus, westeurope |
| OS | Operating System | Windows Server 2019, CentOS 7 |
| Hours | Hours to run | 24, 168, 720 |
| Storage | Storage capacity in GB | 100, 500, 1000 |

## Project Structure

```
azure-calculator/                          # Project root
├── .env.local                             # Environment variables
├── package.json                           # Dependencies & scripts
├── tsconfig.json                          # TypeScript configuration
├── next.config.ts                         # Next.js configuration
├── README.md                              # This file
├── data/                                  # Sample data files
├── plans/                                 # Project documentation
├── src/                                   # Source code
│   ├── app/                               # Next.js app directory
│   │   ├── layout.tsx                     # App layout
│   │   ├── page.tsx                       # Home page
│   │   └── globals.css                    # Global styles
│   ├── components/                        # React components
│   ├── lib/                               # Core libraries
│   │   ├── api/                           # Azure API integration
│   │   ├── parsers/                       # Spreadsheet parsers
│   │   └── calculators/                   # Pricing calculators
│   ├── types/                             # TypeScript interfaces
│   │   └── index.ts                       # Type definitions
│   ├── utils/                             # Utility functions
│   │   ├── constants.ts                   # Azure regions, constants
│   │   └── helpers.ts                     # Helper functions
│   └── hooks/                             # Custom React hooks
├── public/                                # Static assets
└── node_modules/                          # Dependencies
```

## Environment Variables

The project uses the following environment variables (configure in `.env.local`):

```bash
# Azure API Configuration
NEXT_PUBLIC_AZURE_API_BASE_URL=https://prices.azure.com/api/retail/prices
NEXT_PUBLIC_AZURE_API_VERSION=2023-01-01-preview

# Application Settings
NEXT_PUBLIC_APP_NAME=Azure Cost Calculator
NEXT_PUBLIC_DEFAULT_REGION=canadacentral
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 