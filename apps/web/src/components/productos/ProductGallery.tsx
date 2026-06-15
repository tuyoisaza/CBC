'use client'

import { useState } from 'react'
import { X, Play } from 'lucide-react'

interface MediaItem {
  type: 'image' | 'video'
  url: string
  thumbnail: string
  title: string
  videoId?: string | null
}

export function ProductGallery({ media }: { media: MediaItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const active = media[activeIndex]

  if (media.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl bg-[#1e1e1e] flex items-center justify-center text-gray-500">
        Sin imágenes
      </div>
    )
  }

  return (
    <>
      <div
        className="aspect-[16/10] rounded-2xl overflow-hidden bg-[#1e1e1e] cursor-pointer relative group"
        onClick={() => {
          if (active.type === 'video' && active.videoId) setShowVideo(true)
        }}
      >
        <img
          src={active.thumbnail}
          alt={active.title}
          className="w-full h-full object-cover"
        />
        {active.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="h-16 w-16 rounded-full bg-cbc-yellow flex items-center justify-center">
              <Play className="h-7 w-7 text-black ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {media.map((item, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`relative w-20 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
              i === activeIndex ? 'border-cbc-yellow' : 'border-transparent hover:border-cbc-yellow/50'
            }`}
          >
            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Play className="h-5 w-5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Video overlay */}
      {showVideo && active.type === 'video' && active.videoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-4xl aspect-video">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${active.videoId}?autoplay=1`}
              className="w-full h-full rounded-xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  )
}
