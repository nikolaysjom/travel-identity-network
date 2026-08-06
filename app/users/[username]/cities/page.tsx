'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { StarDisplay } from '@/app/components/StarRating'

type VisitedCity = {
  id: string
  rating: number | null
  status: string
  destinations: {
    city_name: string
    country_name: string
  } | null
}

const titles: Record<string, string> = {
  visited: 'Visited cities',
  lived: 'Lived there',
  want_to_go: 'Want to go',
}

function PublicCitiesOverview() {
  const params = useParams()
  const username = params.username as string
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'visited'

  const [cities, setCities] = useState<VisitedCity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

      if (!profileData) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('user_destinations')
        .select('id, rating, status, destinations(city_name, country_name)')
        .eq('user_id', profileData.id)
        .eq('status', status)

      const sorted = ((data as unknown as VisitedCity[]) || []).sort(
        (a, b) => (b.rating ?? -1) - (a.rating ?? -1)
      )
      setCities(sorted)
      setLoading(false)
    }

    load()
  }, [username, status])

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <a href={`/users/${username}`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        &larr; Back to profile
      </a>
      <h1 style={{ fontSize: '1.5rem', marginTop: '0.8rem', marginBottom: '1.5rem' }}>
        {titles[status] || 'Cities'}
      </h1>

      {cities.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nothing here yet.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.9rem',
          }}
        >
          {cities.map((c) => (
            <div
              key={c.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '1rem',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.destinations?.city_name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                {c.destinations?.country_name}
              </div>
              {status !== 'want_to_go' && c.rating && (
                <div style={{ marginTop: '0.6rem' }}>
                  <StarDisplay value={c.rating} size={13} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PublicCitiesOverviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>}>
      <PublicCitiesOverview />
    </Suspense>
  )
}
