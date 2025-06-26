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
    
    const description = screen.getByText(/upload your spreadsheet to calculate azure vm and storage costs/i)
    expect(description).toBeTruthy()
  })

  it('renders key feature text', () => {
    render(<Page />)
    
    // Check for file upload related text that actually exists in the component
    expect(screen.getByText(/drop your spreadsheet here/i)).toBeTruthy()
    expect(screen.getByText(/supports csv and excel files/i)).toBeTruthy()
    expect(screen.getByText(/azure cost calculator/i)).toBeTruthy()
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