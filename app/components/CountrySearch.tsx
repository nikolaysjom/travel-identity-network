'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type CountryResult = {
  code: string
  name: string
  place_type: 'country' | 'territory'
}

type CountrySearchProps = {
  onSelect: (country: CountryResult) => void
  placeholder?: string
}

export default function CountrySearch({ onSelect, placeholder }: CountrySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CountryResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2 || query === selectedLabel) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('countries')
        .select('code, name, place_type')
        .ilike('name', `${query}%`)
        .order('name')
        .limit(8)

      setResults(data || [])
      setShowResults(true)
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selectedLabel])

  const handlePick = (country: CountryResult) => {
    setQuery(country.name)
    setSelectedLabel(country.name)
    setShowResults(false)
    onSelect(country)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder || 'Search for a country'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setSelectedLabel('')
        }}
        onFocus={() => results.length > 0 && setShowResults(true)}
        autoComplete="off"
      />
      {showResults && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.4rem',
            background: 'var(--surface)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          {results.map((c, i) => (
            <div
              key={c.code}
              onClick={() => handlePick(c)}
              className="tin-dropdown-item"
              style={{
                padding: '0.7rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
