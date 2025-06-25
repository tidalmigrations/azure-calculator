import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import NotFound from '../not-found'

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('Not Found Page', () => {
  it('renders without crashing', () => {
    render(<NotFound />)
    expect(screen.getByText('404')).toBeTruthy()
  })

  it('displays the correct heading', () => {
    render(<NotFound />)
    expect(screen.getByText('Page Not Found')).toBeTruthy()
  })

  it('displays the error message', () => {
    render(<NotFound />)
    expect(screen.getByText(/sorry, we couldn't find the page you're looking for/i)).toBeTruthy()
  })

  it('has a return home link', () => {
    render(<NotFound />)
    const homeLink = screen.getByText('Return Home')
    expect(homeLink).toBeTruthy()
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('has proper styling classes', () => {
    render(<NotFound />)
    const container = screen.getByText('404').closest('div')
    expect(container?.parentElement?.parentElement).toHaveClass('min-h-screen', 'bg-gradient-to-br')
  })
}) 