import { describe, expect, it } from 'vitest'
import { getProductVideoEmbed } from '../product-video'

describe('product video links', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'],
    ['https://youtu.be/dQw4w9WgXcQ?t=4', 'youtube'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube'],
    ['https://www.instagram.com/reel/C7Example_12/?igsh=abc', 'instagram'],
    ['https://instagram.com/p/C7Example_12/', 'instagram'],
  ] as const)('recognizes %s as %s media', (url, platform) => {
    expect(getProductVideoEmbed(url)?.platform).toBe(platform)
  })

  it('does not attempt to embed non-video or unsupported links', () => {
    expect(getProductVideoEmbed('https://instagram.com/stories/account/123')).toBeNull()
    expect(getProductVideoEmbed('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(getProductVideoEmbed('https://example.com/video')).toBeNull()
  })
})
