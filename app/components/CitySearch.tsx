'use client'

import { useState, useEffect, useRef } from 'react'

export type CitySearchResult = {
  city_name: string
  country_name: string
  latitude: number
  longitude: number
}

type CitySearchProps = {
  onSelect: (city: CitySearchResult) => void
  placeholder?: string
}

type MapboxFeature = {
  text: string
  center: [number, number] // [lon, lat]
  context?: { id: string; text: string }[]
}

export default function CitySearch({ onSelect, placeholder }: CitySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MapboxFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  const getCountry = (f: MapboxFeature) =>
    f.context?.find((c) => c.id.startsWith('country'))?.text || ''

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 3 || query === selectedLabel) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const thisRequestId = ++requestIdRef.current
      setLoading(true)
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${token}&types=place&language=en&limit=8`
        )
        const data = await res.json()
        const features: MapboxFeature[] = Array.isArray(data?.features) ? data.features : []

        if (thisRequestId !== requestIdRef.current) return

        setResults(features)
        setShowResults(true)
      } catch {
        if (thisRequestId === requestIdRef.current) setResults([])
      } finally {
        if (thisRequestId === requestIdRef.current) setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selectedLabel])

  const handlePick = (f: MapboxFeature) => {
    const cityName = f.text
    const countryName = getCountry(f)
    if (!cityName || !countryName) return

    const label = `${cityName}, ${countryName}`
    setQuery(label)
    setSelectedLabel(label)
    setShowResults(false)

    onSelect({
      city_name: cityName,
      country_name: countryName,
      latitude: f.center[1],
      longitude: f.center[0],
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder || 'Search for a city'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setSelectedLabel('')
        }}
        onFocus={() => results.length > 0 && setShowResults(true)}
        autoComplete="off"
      />
      {loading && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          Searching...
        </div>
      )}
      {showResults && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.4rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          {results.map((f, i) => (
            <div
              key={i}
              onClick={() => handlePick(f)}
              style={{
                padding: '0.7rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {f.text}, {getCountry(f)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
