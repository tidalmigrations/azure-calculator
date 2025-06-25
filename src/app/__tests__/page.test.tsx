import { render, screen } from '@testing-library/react'
import Page from '../page'

// Mock the environment variables
jest.mock('../../utils/constants', () => ({
  ...jest.requireActual('../../utils/constants'),
  API_CONFIG: {
    BASE_URL: 'https://prices.azure.com/api/retail/prices',
    VERSION: '2023-01-01-preview',
    CACHE_DURATION: 3600000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
  }
}))

describe('Home Page', () => {
  it('renders without crashing', () => {
    const { container } = render(<Page />)
    expect(container).toBeTruthy()
  })

  it('renders the main heading', () => {
    render(<Page />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeTruthy()
    expect(heading.textContent).toContain('Azure Cost Calculator')
  })

  it('renders the description text', () => {
    render(<Page />)
    
    const description = screen.getByText(/calculate azure vm and storage costs from your spreadsheet data using real-time azure pricing/i)
    expect(description).toBeTruthy()
  })

  it('renders key feature text', () => {
    render(<Page />)
    
    // Check for main features mentioned - use more specific text to avoid duplicates
    expect(screen.getByText('Drag & Drop Upload')).toBeTruthy()
    expect(screen.getByText('Automatic Column Mapping')).toBeTruthy()
    expect(screen.getByText('Real-time Azure Pricing')).toBeTruthy()
  })

  it('has proper semantic structure', () => {
    render(<Page />)
    
    // Check for main element
    const main = screen.getByRole('main')
    expect(main).toBeTruthy()
    
    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders file format information', () => {
    render(<Page />)
    
    // Look for CSV and Excel mentions
    const text = document.body.textContent || ''
    expect(text.toLowerCase()).toContain('csv')
    expect(text.toLowerCase()).toContain('excel')
  })
}) 