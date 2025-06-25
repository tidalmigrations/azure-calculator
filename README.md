# Azure Cost Calculator

A TypeScript-based web application that integrates with the Azure Retail Prices API to fetch real-time pricing data for Azure Virtual Machines and storage services.

## Features

- 🔌 **Azure API Integration**: Real-time pricing data from Azure Retail Prices API
- 🌍 **Multi-Region Support**: All major Azure regions (40+ regions)
- 🖥️ **OS Support**: Windows and Linux VM pricing
- 💾 **Storage Pricing**: Standard HDD, Standard SSD, and Premium SSD
- ⚡ **Performance Optimized**: Built-in caching and rate limiting
- 🧪 **Interactive Demo**: Test API integration with live data
- 📱 **Responsive Design**: Modern UI built with Tailwind CSS

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

3. Set up environment variables (optional):
```bash
cp .env.local.example .env.local
# Edit .env.local with your preferred settings
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### API Demo
Visit `/api-demo` to test the Azure API integration:
- Select Azure region and operating system
- Fetch real-time VM and storage pricing
- View detailed pricing breakdown
- Test caching and performance features

### API Integration
The application provides a clean API for fetching Azure pricing data:

```typescript
import { azureClient } from '@/lib/api';

// Get VM prices for a region and OS
const vmPrices = await azureClient.getVMPrices('eastus', 'linux');

// Get storage prices
const storagePrices = await azureClient.getStoragePrices('eastus', 'standard-ssd');

// Custom filtering
const customPrices = await azureClient.searchPrices({
  serviceName: 'Virtual Machines',
  region: 'westus',
  os: 'windows'
});
```

## Project Structure

```
azure-calculator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── azure-prices/          # API proxy route
│   │   ├── api-demo/                  # Interactive demo page
│   │   ├── layout.tsx                 # App layout
│   │   ├── page.tsx                   # Home page
│   │   └── globals.css                # Global styles
│   ├── lib/
│   │   └── api/                       # Azure API integration
│   │       ├── azureClient.ts         # Main API client
│   │       ├── filters.ts             # Query building utilities
│   │       ├── testClient.ts          # Testing utilities
│   │       └── index.ts               # Public exports
│   ├── types/
│   │   └── index.ts                   # TypeScript definitions
│   ├── utils/
│   │   ├── constants.ts               # Azure regions & constants
│   │   └── helpers.ts                 # Utility functions
│   └── hooks/                         # Custom React hooks
├── plans/                             # Project documentation
├── public/                            # Static assets
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
└── next.config.ts                     # Next.js configuration
```

## Environment Variables

Create a `.env.local` file with the following optional configurations:

```bash
# API Rate Limiting
NEXT_PUBLIC_API_RATE_LIMIT_REQUESTS=10
NEXT_PUBLIC_API_RATE_LIMIT_WINDOW=60000

# Caching
NEXT_PUBLIC_CACHE_TTL=3600000

# Azure API
NEXT_PUBLIC_AZURE_API_VERSION=2023-01-01-preview
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server

# Testing & Quality
npm test             # Run test suite
npm run lint         # Run ESLint
```

## API Features

### Caching
- Intelligent in-memory caching with TTL
- Cache statistics and management
- Configurable cache duration

### Rate Limiting
- Configurable request limits
- Window-based rate limiting
- Automatic retry suggestions

### Error Handling
- Comprehensive error types
- Detailed error context
- Graceful fallback handling

### Filtering
- Advanced OData filter construction
- Region name normalization
- OS and storage type filtering
- Custom search capabilities

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 