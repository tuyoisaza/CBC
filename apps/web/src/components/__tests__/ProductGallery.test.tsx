import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductGallery } from '@/components/productos/ProductGallery'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('product gallery video playback', () => {
  it('embeds Instagram posts and keeps an open-in-Instagram fallback', () => {
    render(<ProductGallery media={[{
      type: 'video', url: 'https://www.instagram.com/reel/C7Example_12/', thumbnail: '/product.jpg', title: 'Instagram clip',
      platform: 'instagram', embedUrl: 'https://www.instagram.com/reel/C7Example_12/embed/',
    }]} />)
    fireEvent.click(screen.getByAltText('Instagram clip'))
    expect(screen.getByTitle('Instagram clip')).toHaveAttribute('src', 'https://www.instagram.com/reel/C7Example_12/embed/')
    expect(screen.getByRole('link', { name: /abrir en instagram/i })).toHaveAttribute('target', '_blank')
  })

  it('opens unsupported video links in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<ProductGallery media={[{ type: 'video', url: 'https://videos.example.com/watch/1', thumbnail: '/product.jpg', title: 'External video' }]} />)
    fireEvent.click(screen.getByAltText('External video'))
    expect(open).toHaveBeenCalledWith('https://videos.example.com/watch/1', '_blank', 'noopener,noreferrer')
  })
})
