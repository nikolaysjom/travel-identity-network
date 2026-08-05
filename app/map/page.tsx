'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { CountryStatusMap } from '@/app/components/WorldMap'

const WorldMap = dynamic(() => import('@/app/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '480px',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      Loading map...
    </div>
  ),
})

const STATUS_PRIORITY: Record<string, number> = {
  lived: 3,
  visited: 2,
  want_to_go: 1,
}

export default function MapPage() {
  const [countryStatus, setCountryStatus] = useState<CountryStatusMap>({})
  const [counts, setCounts] = useState({ visited: 0, lived: 0, want: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadMap = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('user_destinations')
        .select('status, destinations(country_code)')
        .eq('user_id', session.user.id)

      const map: CountryStatusMap = {}
      let visitedCount = 0
      let livedCount = 0
      let wantCount = 0

      ;(data || []).forEach((row: any) => {
        const code = row.destinations?.country_code
        const status = row.status
        if (!code || !status) return

        if (status === 'visited') visitedCount++
        if (status === 'lived') livedCount++
        if (status === 'want_to_go') wantCount++

        const existing = map[code]
        if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing]) {
          map[code] = status
        }
      })

      setCountryStatus(map)
      setCounts({ visited: visitedCount, lived: livedCount, want: wantCount })
      setLoading(false)
    }

    loadMap()
  }, [router])

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>Map</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        All the places you&apos;ve been, lived, and want to go
      </p>

      <WorldMap countryStatus={countryStatus} height="480px" interactive />

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#2DD4BF',
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Visited ({counts.visited})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#F2C94C',
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Lived there ({counts.lived})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#4A5056',
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Want to go ({counts.want})</span>
        </div>
      </div>
    </div>
  )
}
