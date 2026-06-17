'use client'

import { useEffect } from 'react'
import { initDebugCapture } from '@/lib/debug-capture'

export function DebugCaptureInit() {
  useEffect(() => { initDebugCapture() }, [])
  return null
}
