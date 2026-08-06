'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CitySearch, { CitySearchResult } from '@/app/components/CitySearch'
import CountrySearch, { CountryResult } from '@/app/components/CountrySearch'
import { X } from 'lucide-react'

type CityStats = {
  id: string
  city_name: string
  country_name: string
  avg_rating: number | null
  review_count: number
  newest_review_at: string | null
}

type SortOption = 'newest' | 'top_rated' | 'most_reviewed'

export default function CitiesExplorePage() {
  const [mode, setMode] = useState<'search' | 'browse'>('search')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [selectedCountry, setSelectedCountry] = useState<CountryResult | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('most_reviewed')
  const [results, setResults] = useState<CityStats[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)

  const handleSelectCity = async (city: CitySearchResult) => {
    setError('')
    setLoading(true)

    const { data: existing } = await supabase
      .from('destinations')
      .select('id')
      .ilike('city_name', city.city_name)
      .ilike('country_name', city.country_name)
      .maybeSingle()

    if (existing?.id) {
      router.push(`/cities/${existing.id}`)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('This city hasn\u2019t been added yet. Log in to be the first to add it.')
      setLoading(false)
      return
    }

    const { data: countryMatch } = await supabase
      .from('countries')
      .select('code')
      .ilike('name', city.country_name)
      .maybeSingle()

    const { data: newDestination, error: insertError } = await supabase
      .from('destinations')
      .insert({
        city_name: city.city_name,
        country_name: city.country_name,
        country_code: countryMatch?.code || null,
        latitude: city.latitude,
        longitude: city.longitude,
      })
      .select()
      .single()

    setLoading(false)

    if (insertError || !newDestination) {
      setError('Something went wrong. Please try again.')
      return
    }

    router.push(`/cities/${newDestination.id}`)
  }

  const loadBrowseResults = async () => {
    setBrowseLoading(true)

    let query = supabase.from('destinations').select('id, city_name, country_name')

    if (selectedCountry) {
      query = query.eq('country_code', selectedCountry.code)
    }

    const { data: destinations } = await query.limit(60)

    const withStats: CityStats[] = await Promise.all(
      (destinations || []).map(async (d) => {
        const { data: reviews } = await supabase
          .from('user_destinations')
          .select('rating, created_at')
          .eq('destination_id', d.id)
          .not('rating', 'is', null)

        const ratings = (reviews || []).map((r) => r.rating as number)
        const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

        const dates = (reviews || []).map((r) => r.created_at as string)
        const newest = dates.length > 0 ? dates.sort().reverse()[0] : null

        return {
          id: d.id,
          city_name: d.city_name,
          country_name: d.country_name,
          avg_rating: avg,
          review_count: ratings.length,
          newest_review_at: newest,
        }
      })
    )

    // Only show cities that actually have at least one review when browsing
    const reviewed = withStats.filter((c) => c.review_count > 0)

    const sorted = [...reviewed].sort((a, b) => {
      if (sortBy === 'top_rated') return (b.avg_rating || 0) - (a.avg_rating || 0)
      if (sortBy === 'most_reviewed') return b.review_count - a.review_count
      // newest
      return (b.newest_review_at || '').localeCompare(a.newest_review_at || '')
    })

    setResults(sorted)
    setBrowseLoading(false)
  }

  useEffect(() => {
    if (mode === 'browse') {
      loadBrowseResults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedCountry, sortBy])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Explore cities</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Search reviews and ratings from the community
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setMode('search')}
          style={{
            flex: 1,
            background: mode === 'search' ? 'var(--accent)' : 'var(--surface)',
            color: mode === 'search' ? '#FFFFFF' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
          }}
        >
          Search
        </button>
        <button
          onClick={() => setMode('browse')}
          style={{
            flex: 1,
            background: mode === 'browse' ? 'var(--accent)' : 'var(--surface)',
            color: mode === 'browse' ? '#FFFFFF' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
          }}
        >
          Browse
        </button>
      </div>

      {mode === 'search' ? (
        <>
          <CitySearch onSelect={handleSelectCity} placeholder="Search for a city" />
          {loading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem' }}>
              Loading...
            </p>
          )}
          {error && (
            <p style={{ color: '#D1453B', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            {selectedCountry ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '0.4rem 0.5rem 0.4rem 0.9rem',
                  fontSize: '0.85rem',
                }}
              >
                {selectedCountry.name}
                <button
                  onClick={() => setSelectedCountry(null)}
                  style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '0.15rem', display: 'flex' }}
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <CountrySearch onSelect={setSelectedCountry} placeholder="Filter by country (optional)" />
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[
              { value: 'most_reviewed', label: 'Most reviewed' },
              { value: 'top_rated', label: 'Top rated' },
              { value: 'newest', label: 'Newest' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value as SortOption)}
                style={{
                  flex: 1,
                  background: sortBy === opt.value ? 'var(--accent)' : 'var(--bg)',
                  color: sortBy === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  fontSize: '0.76rem',
                  padding: '0.5rem 0.3rem',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {browseLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading...</p>
          ) : results.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No reviewed cities found{selectedCountry ? ` in ${selectedCountry.name}` : ''} yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {results.map((d) => (
                <a
                  key={d.id}
                  href={`/cities/${d.id}`}
                  className="tin-card-hover"
                  style={{
                    background: 'var(--surface)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                    borderRadius: '16px',
                    padding: '1rem 1.1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{d.city_name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.1rem' }}>
                      {d.country_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                      {d.avg_rating !== null ? `${d.avg_rating.toFixed(1)}/5` : '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {d.review_count} review{d.review_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
