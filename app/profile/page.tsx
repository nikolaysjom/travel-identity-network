'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = {
  username: string
  bio: string | null
}

type VisitedCity = {
  rating: number | null
  destinations: {
    city_name: string
    country_name: string
  } | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cities, setCities] = useState<VisitedCity[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, bio')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData)

      const { data: citiesData } = await supabase
        .from('user_destinations')
        .select('rating, destinations(city_name, country_name)')
        .eq('user_id', session.user.id)

      setCities((citiesData as unknown as VisitedCity[]) || [])
      setLoading(false)
    }

    loadProfile()
  }, [router])

  if (loading) return <div style={{ padding: '2rem' }}>Laster...</div>
  if (!profile) return null

  const countries = new Set(cities.map((c) => c.destinations?.country_name))

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem' }}>
      <h1>{profile.username}</h1>
      <p>{profile.bio || 'Ingen bio ennå'}</p>

      <div style={{ display: 'flex', gap: '2rem', margin: '1.5rem 0' }}>
        <div>🌎 <strong>{countries.size}</strong> land</div>
        <div>🏙️ <strong>{cities.length}</strong> byer</div>
      </div>

      <h2>Besøkte byer</h2>
      {cities.length === 0 ? (
        <p>Ingen byer lagt til ennå.</p>
      ) : (
        <ul>
          {cities.map((c, i) => (
            <li key={i}>
              {c.destinations?.city_name}, {c.destinations?.country_name}
              {c.rating ? ` — ⭐ ${c.rating}/10` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}