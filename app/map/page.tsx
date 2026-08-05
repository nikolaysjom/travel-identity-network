'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { CountryStatusMap, MapCity } from '@/app/components/WorldMap'

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
  const [cities, setCities] = useState<MapCity[]>([])
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
        .select('id, status, destinations(city_name, country_code, latitude, longitude)')
        .eq('user_id', session.user.id)

      const map: CountryStatusMap = {}
      const cityList: MapCity[] = []

      ;(data || []).forEach((row: any) => {
        const dest = row.destinations
        const status = row.status
        if (!dest || !status) return

        if (dest.country_code) {
          const existing = map[dest.country_code]
          if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing]) {
            map[dest.country_code] = status
          }
        }

        if (dest.latitude != null && dest.longitude != null) {
          cityList.push({
            id: row.id,
            city_name: dest.city_name,
            status,
            latitude: dest.latitude,
            longitude: dest.longitude,
          })
        }
      })

      setCountryStatus(map)
      setCities(cityList)
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

  const visitedCount = cities.filter((c) => c.status === 'visited').length
  const livedCount = cities.filter((c) => c.status === 'lived').length
  const wantCount = cities.filter((c) => c.status === 'want_to_go').length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>Map</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        All the places you&apos;ve been, lived, and want to go
      </p>

      <WorldMap countryStatus={countryStatus} cities={cities} height="520px" interactive />

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E9B63', display: 'inline-block' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Visited ({visitedCount})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8A33D', display: 'inline-block' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Lived there ({livedCount})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#9B9B9B', display: 'inline-block' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Want to go ({wantCount})</span>
        </div>
      </div>
    </div>
  )
}
