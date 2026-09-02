'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export type ParsedAddress = {
  street: string
  extNo: string
  colonia: string
  cp: string
  city: string
  state: string
}

// One loader for the whole page, shared across mounts.
let placesPromise: Promise<any> | null = null
function loadPlaces(): Promise<any> | null {
  if (!KEY) return null
  if (!placesPromise) {
    placesPromise = new Loader({ apiKey: KEY, version: 'weekly' }).importLibrary('places')
  }
  return placesPromise
}

function pick(components: any[], type: string): string {
  const c = components.find((x: any) => x.types.includes(type))
  return c?.long_name ?? ''
}

function parse(components: any[]): ParsedAddress {
  return {
    street: pick(components, 'route'),
    extNo: pick(components, 'street_number'),
    colonia:
      pick(components, 'sublocality_level_1') ||
      pick(components, 'sublocality') ||
      pick(components, 'neighborhood'),
    cp: pick(components, 'postal_code'),
    city: pick(components, 'locality') || pick(components, 'administrative_area_level_2'),
    state: pick(components, 'administrative_area_level_1'),
  }
}

/**
 * Google Places address search. Type a street, pick from the dropdown, and the
 * parent form's address fields get filled. No-ops (renders nothing) when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset — the manual fields still work.
 */
export function AddressAutocomplete({ onFill }: { onFill: (a: Partial<ParsedAddress>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onFillRef = useRef(onFill)
  onFillRef.current = onFill
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const p = loadPlaces()
    if (!p) return
    let ac: any
    p
      .then((places: any) => {
        if (!inputRef.current) return
        ac = new places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'mx' },
          fields: ['address_components'],
          types: ['address'],
        })
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place?.address_components) return
          const parsed = parse(place.address_components)
          const patch: Partial<ParsedAddress> = {}
          for (const [k, v] of Object.entries(parsed)) if (v) (patch as any)[k] = v
          onFillRef.current(patch)
        })
        setState('ready')
      })
      .catch(() => setState('error'))
    return () => {
      const g = (window as any).google
      if (ac && g?.maps?.event) g.maps.event.clearInstanceListeners(ac)
    }
  }, [])

  if (!KEY) return null

  return (
    <div>
      {/* Google appends its dropdown to <body>; lift it above the modal. */}
      <style>{`.pac-container{z-index:100000!important}`}</style>
      <label className="block text-sm text-gray-400 mb-1">Buscar dirección</label>
      <input
        ref={inputRef}
        type="text"
        placeholder="Escribe tu calle y número…"
        className="input-field w-full"
        autoComplete="off"
        disabled={state === 'error'}
      />
      <p className="mt-1 text-xs text-gray-500">
        {state === 'ready'
          ? 'Elige de la lista y completamos los campos abajo.'
          : state === 'error'
            ? 'No se pudo cargar el buscador — llena los campos manualmente.'
            : 'Cargando buscador…'}
      </p>
    </div>
  )
}
