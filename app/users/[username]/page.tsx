'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  username: string
  bio: string | null
}

type VisitedCity = {
  id: string
  rating: number | null
  destinations: {
    city_name: string
    country_name: string
  } | null
}

type ListItem = {
  id: string
  title: string
}

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [cities, setCities] = useState<VisitedCity[]>([])
  const [lists, setLists] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .eq('username', username)
        .single()

      if (profileError || !profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)

      const { data: citiesData } = await supabase
        .from('user_destinations')
        .select('id, rating, destinations(city_name, country_name)')
        .eq('user_id', profileData.id)

      setCities((citiesData as unknown as VisitedCity[]) || [])

      const { data: listsData } = await supabase
        .from('lists')
        .select('id, title')
        .eq('user_id', profileData.id)

      setLists(listsData || [])
      setLoading(false)
    }

    loadUserProfile()
  }, [username])

  if (loading) return <div style={{ padding: '2rem' }}>Laster...</div>
  if (notFound) return <div style={{ padding: '2rem' }}>Fant ikke brukeren "{username}".</div>
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
          {cities.map((c) => (
            <li key={c.id}>
              {c.destinations?.city_name}, {c.destinations?.country_name}
              {c.rating ? ` — ⭐ ${c.rating}/10` : ''}
            </li>
          ))}
        </ul>
      )}

      <h2>Lister</h2>
      {lists.length === 0 ? (
        <p>Ingen lister ennå.</p>
      ) : (
        <ul>
          {lists.map((list) => (
            <li key={list.id}>
              <a href={`/lists/${list.id}`}>{list.title}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}