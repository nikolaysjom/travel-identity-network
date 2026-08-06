'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { CountryStatusMap, MapCity } from '@/app/components/WorldMap'
import { Settings } from 'lucide-react'

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
  const [territoryStatus, setTerritoryStatus] = useState<CountryStatusMap>({})
  const [cities, setCities] = useState<MapCity[]>([])
  const [loading, setLoading] = useState(true)
  const [statusCounts, setStatusCounts] = useState({ visited: 0, lived: 0, want_to_go: 0 })
  const router = useRouter()

  useEffect(() => {
    const loadMap = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: cityData } = await supabase
        .from('user_destinations')
        .select('id, status, destinations(city_name, country_code, latitude, longitude)')
        .eq('user_id', session.user.id)

      const { data: countryData } = await supabase
        .from('user_countries')
        .select('id, country_code, status, place_type')
        .eq('user_id', session.user.id)

      const countryMap: CountryStatusMap = {}
      const territoryMap: CountryStatusMap = {}
      const cityList: MapCity[] = []
      const visitedCountries = new Set<string>()
      const livedCountries = new Set<string>()
      const wantCountries = new Set<string>()

      ;(cityData || []).forEach((row: any) => {
        const dest = row.destinations
        const status = row.status
        if (!dest || !status) return

        if (dest.country_code) {
          const existing = countryMap[dest.country_code]
          if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing]) {
            countryMap[dest.country_code] = status
          }
          if (status === 'visited') visitedCountries.add(dest.country_code)
          if (status === 'lived') livedCountries.add(dest.country_code)
          if (status === 'want_to_go') wantCountries.add(dest.country_code)
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

      ;(countryData || []).forEach((row: any) => {
        const { country_code, status, place_type } = row
        if (!country_code || !status) return

        if (place_type === 'territory') {
          const existing = territoryMap[country_code]
          if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing]) {
            territoryMap[country_code] = status
          }
        } else {
          const existing = countryMap[country_code]
          if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing]) {
            countryMap[country_code] = status
          }
          if (status === 'visited') visitedCountries.add(country_code)
          if (status === 'lived') livedCountries.add(country_code)
          if (status === 'want_to_go') wantCountries.add(country_code)
        }
      })

      setCountryStatus(countryMap)
      setTerritoryStatus(territoryMap)
      setCities(cityList)
      setStatusCounts({
        visited: visitedCountries.size,
        lived: livedCountries.size,
        want_to_go: wantCountries.size,
      })
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Map</h1>
        <a
          href="/map/manage"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.45rem 0.8rem',
            fontSize: '0.85rem',
          }}
        >
          <Settings size={15} strokeWidth={2} />
          Manage countries
        </a>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        All the places you&apos;ve been, lived, and want to go
      </p>

      <WorldMap
        countryStatus={countryStatus}
        territoryStatus={territoryStatus}
        cities={cities}
        height="520px"
        interactive
      />

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E9B63', display: 'inline-block' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Visited ({statusCounts.visited})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8A33D', display: 'inline-block' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Lived there ({statusCounts.lived})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{ width: 10, height: 10, borderRadius: '50%', background: '#5B7A99', display: 'inline-block' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Want to go ({statusCounts.want_to_go})</span>
        </div>
      </div>
    </div>
  )
}
