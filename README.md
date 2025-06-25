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
2. **Map Columns**: Match your spreadsheet columns to required fields
3. **Calculate**: Get Azure cost estimates for your infrastructure

### Required Data Fields

Your spreadsheet must contain these columns for the calculator to work:

#### Essential Fields (Required)
- **RAM Allocated (GB)**: Memory allocation in gigabytes (e.g., 4, 8, 16)
- **Storage Allocated (GB)**: Storage capacity in gigabytes (e.g., 120.5, 500)
- **Logical CPU Count**: Number of virtual CPUs (e.g., 2, 4, 8)
- **Operating System Version**: OS type and version (e.g., "Ubuntu 20.04 LTS (64-bit)", "Microsoft Windows Server 2019 (64-bit)")
- **Region**: Azure region identifier (e.g., "eastus", "westus2", "centralus")
- **Hours to run**: Number of hours per month the server will run (e.g., 730 for 24/7)

#### Optional Fields (For Better Organization)
- **Application Group**: Logical grouping of servers (e.g., "E-Commerce Prod", "CRM Dev")
- **Server Hostname**: Server identifier
- **Environment**: Environment type (e.g., "Production", "Development", "QA")
- **VM Family**: Azure VM family (e.g., "dsv6") - will be auto-detected if not provided

### Sample Data Format

See `data2/sample_servers.csv` for a complete example with the correct column structure.

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