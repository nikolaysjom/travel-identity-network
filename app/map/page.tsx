'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const WorldMap = dynamic(() => import('@/app/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '420px',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      Laster kart...
    </div>
  ),
})

type MapCity = {
  id: string
  status: string
  city_name: string
  country_name: string
  latitude: number | null
  longitude: number | null
}

export default function MapPage() {
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
        .select('id, status, destinations(city_name, country_name, latitude, longitude)')
        .eq('user_id', session.user.id)

      const mapped: MapCity[] = (data || []).map((row: any) => ({
        id: row.id,
        status: row.status,
        city_name: row.destinations?.city_name || '',
        country_name: row.destinations?.country_name || '',
        latitude: row.destinations?.latitude ?? null,
        longitude: row.destinations?.longitude ?? null,
      }))

      setCities(mapped)
      setLoading(false)
    }

    loadMap()
  }, [router])

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Laster...
      </div>
    )
  }

  const visitedCount = cities.filter((c) => c.status === 'visited').length
  const livedCount = cities.filter((c) => c.status === 'lived').length
  const wantCount = cities.filter((c) => c.status === 'want_to_go').length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>Kart</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Alle stedene dine på ett sted
      </p>

      <WorldMap cities={cities} height="480px" interactive />

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
          <span style={{ color: 'var(--text-secondary)' }}>Besøkt ({visitedCount})</span>
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
          <span style={{ color: 'var(--text-secondary)' }}>Bodd der ({livedCount})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#5B6168',
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Ønsker å dra ({wantCount})</span>
        </div>
      </div>
    </div>
  )
}
