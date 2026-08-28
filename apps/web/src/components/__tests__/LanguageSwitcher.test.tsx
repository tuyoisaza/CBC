import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

import { LanguageSwitcher } from '../public/LanguageSwitcher'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockUsePathname.mockReset()
  })

  it('shows EN label when on Spanish path (default locale)', () => {
    mockUsePathname.mockReturnValue('/cotizar')
    render(React.createElement(LanguageSwitcher))
    expect(screen.getByText('EN')).toBeDefined()
  })

  it('shows ES label when on English path', () => {
    mockUsePathname.mockReturnValue('/en/cotizar')
    render(React.createElement(LanguageSwitcher))
    expect(screen.getByText('ES')).toBeDefined()
  })

  it('links to /en path when on Spanish path', () => {
    mockUsePathname.mockReturnValue('/cotizar')
    render(React.createElement(LanguageSwitcher))
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/en/cotizar')
  })

  it('links to Spanish root when on English root', () => {
    mockUsePathname.mockReturnValue('/en')
    render(React.createElement(LanguageSwitcher))
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/')
  })

  it('preserves subpath when switching from English', () => {
    mockUsePathname.mockReturnValue('/en/tracking/ABC123')
    render(React.createElement(LanguageSwitcher))
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/tracking/ABC123')
  })
})
