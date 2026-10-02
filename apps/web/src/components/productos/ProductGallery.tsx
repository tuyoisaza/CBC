'use client'

import { useState } from 'react'
import { X, Play } from 'lucide-react'

interface MediaItem {
  type: 'image' | 'video'
  url: string
  thumbnail: string
  title: string
  platform?: 'youtube' | 'instagram'
  embedUrl?: string
}

export function ProductGallery({ media, aspectClass = 'aspect-[16/10]' }: { media: MediaItem[]; aspectClass?: 'aspect-video' | 'aspect-[16/10]' }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const active = media[activeIndex]

  if (media.length === 0) {
    return (
      <div className={`${aspectClass} rounded-2xl bg-[#1e1e1e] flex items-center justify-center text-gray-500`}>
        Sin imágenes
      </div>
    )
  }

  return (
    <>
      <div
        className={`${aspectClass} rounded-2xl overflow-hidden bg-[#1e1e1e] cursor-pointer relative group`}
        onClick={() => {
          if (active.type === 'video') {
            if (active.embedUrl) setShowVideo(true)
            else window.open(active.url, '_blank', 'noopener,noreferrer')
          }
        }}
      >
        <img
          src={active.thumbnail}
          alt={active.title}
          className={`w-full h-full ${aspectClass === 'aspect-video' ? 'object-contain' : 'object-cover'}`}
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
            aria-label={`Ver ${item.title}, imagen ${i + 1}`}
            className={`relative w-20 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
              i === activeIndex ? 'border-cbc-yellow' : 'border-transparent hover:border-cbc-yellow/50'
            }`}
          >
            <img src={item.thumbnail} alt="" className={`w-full h-full ${aspectClass === 'aspect-video' ? 'object-contain' : 'object-cover'}`} />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Play className="h-5 w-5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Video overlay */}
      {showVideo && active.type === 'video' && active.embedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className={`relative w-full ${active.platform === 'instagram' ? 'max-w-md aspect-[4/5]' : 'max-w-4xl aspect-video'}`} onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <iframe
              src={active.platform === 'youtube' ? `${active.embedUrl}?autoplay=1` : active.embedUrl}
              className="w-full h-full rounded-xl"
              title={active.title}
              allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
              allowFullScreen
            />
            <a href={active.url} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 left-2 rounded-md bg-black/80 px-3 py-2 text-xs font-medium text-white underline decoration-white/50 underline-offset-2 hover:bg-black">
              {active.platform === 'instagram' ? 'Si no carga, abrir en Instagram ↗' : 'Abrir video en YouTube ↗'}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
