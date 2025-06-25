# Azure Cost Calculator

A TypeScript-based web application for calculating Azure VM and storage costs from spreadsheet data.

## Features

- Upload CSV and Excel files with drag-and-drop interface
- Smart column mapping with automatic detection
- Real-time Azure pricing via Azure Retail Prices API
- Multi-region support (40+ Azure regions)
- Windows and Linux VM pricing
- Storage cost calculation

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

1. **Upload**: Drop your CSV or Excel file on the home page
2. **Map Columns**: Match your spreadsheet columns to required fields (Region, OS, Hours, Storage)
3. **Calculate**: Get Azure cost estimates for your infrastructure

### Required Data Fields
Your spreadsheet should contain:
- **Region**: Azure region (e.g., "East US", "West Europe")
- **Operating System**: Windows or Linux
- **Hours to Run**: Number of hours per month
- **Storage Capacity**: Storage size in GB

## Project Structure

```
azure-calculator/
├── src/
│   ├── app/
│   │   ├── api/azure-prices/          # API proxy route
│   │   ├── calculator/                # Main calculator interface
│   │   ├── layout.tsx                 # App layout
│   │   └── page.tsx                   # Home page with uploader
│   ├── components/
│   │   ├── FileUploader.tsx           # File upload component
│   │   ├── DataPreview.tsx            # Data preview table
│   │   ├── ColumnMapper.tsx           # Column mapping interface
│   │   ├── PricingResults.tsx         # Results display
│   │   └── CostBreakdown.tsx          # Cost breakdown component
│   ├── contexts/
│   │   └── CalculatorContext.tsx      # State management
│   ├── hooks/
│   │   └── useSpreadsheetUpload.ts    # Upload hook
│   ├── lib/
│   │   ├── api/                       # Azure API integration
│   │   └── parsers/                   # Spreadsheet parsing
│   ├── types/
│   │   └── index.ts                   # TypeScript definitions
│   └── utils/
│       ├── constants.ts               # Azure regions & constants
│       └── helpers.ts                 # Utility functions
└── package.json                       # Dependencies & scripts
```

## API Integration

```typescript
import { azureClient } from '@/lib/api';

// Get VM prices
const vmPrices = await azureClient.getVMPrices('eastus', 'linux');

// Get storage prices
const storagePrices = await azureClient.getStoragePrices('eastus', 'standard-ssd');
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run test suite
npm run lint         # Run ESLint
```

## License

MIT License - see the [LICENSE](LICENSE) file for details. 