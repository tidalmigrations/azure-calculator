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

### Local Development

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

### Configuration

Copy `.env.example` to `.env.local` and adjust settings as needed. All environment variables are optional and have sensible defaults.

## Deployment

### Deploy to Vercel

This application is optimized for deployment on Vercel:

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login and link your project:**
```bash
vercel login
vercel link
```

3. **Configure environment variables (optional):**
```bash
# Use the helper script to set up environment variables
./scripts/setup-vercel-env.sh

# Or set them manually via Vercel dashboard
# Go to https://vercel.com/dashboard → Your Project → Settings → Environment Variables
```

4. **Deploy:**
```bash
vercel --prod
```

The application will work with default settings without any environment variables configured.

## Usage

1. **Upload**: Drop your CSV or Excel file on the home page
2. **Map Columns**: Match your spreadsheet columns to required fields
3. **Calculate**: Get Azure cost estimates for your infrastructure

### Required Data Fields

Your spreadsheet must contain these columns:

- **RAM Allocated (GB)**: Memory allocation in gigabytes
- **Storage Allocated (GB)**: Storage capacity in gigabytes  
- **Logical CPU Count**: Number of virtual CPUs
- **Operating System Version**: OS type and version
- **Region**: Azure region identifier
- **Hours to run**: Number of hours per month the server will run

See `data2/sample_servers.csv` for a complete example.

## Project Structure

```
azure-calculator/
├── src/
│   ├── app/
│   │   ├── api/azure-prices/          # API proxy route
│   │   ├── calculator/                # Main calculator interface
│   │   └── page.tsx                   # Home page with uploader
│   ├── components/                    # React components
│   ├── contexts/                      # State management
│   ├── hooks/                         # Custom hooks
│   ├── lib/                          # Core logic & API integration
│   ├── types/                        # TypeScript definitions
│   └── utils/                        # Utility functions
├── scripts/
│   └── setup-vercel-env.sh          # Environment setup helper
└── vercel.json                       # Vercel configuration
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