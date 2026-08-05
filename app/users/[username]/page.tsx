'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  username: string
  bio: string | null
  is_available_locally: boolean
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
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUserId(session?.user.id || null)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, bio, is_available_locally')
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

      const { count: followers } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', profileData.id)

      setFollowerCount(followers || 0)

      if (session) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('following_id', profileData.id)
          .single()

        setIsFollowing(!!followData)
      }

      setLoading(false)
    }

    loadUserProfile()
  }, [username])

  const handleFollow = async () => {
    if (!currentUserId || !profile) return

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)

      setIsFollowing(false)
      setFollowerCount((prev) => prev - 1)
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: profile.id })

      setIsFollowing(true)
      setFollowerCount((prev) => prev + 1)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Laster...</div>
  if (notFound) return <div style={{ padding: '2rem' }}>Fant ikke brukeren "{username}".</div>
  if (!profile) return null

  const countries = new Set(cities.map((c) => c.destinations?.country_name))
  const isOwnProfile = currentUserId === profile.id

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem' }}>
      <h1>{profile.username}</h1>
      <p>{profile.bio || 'Ingen bio ennå'}</p>

      {profile.is_available_locally && (
        <p style={{ color: 'green', fontWeight: 'bold' }}>
          📍 Tilgjengelig som lokal
        </p>
      )}

      <div style={{ display: 'flex', gap: '2rem', margin: '1.5rem 0', alignItems: 'center' }}>
        <div>🌎 <strong>{countries.size}</strong> land</div>
        <div>🏙️ <strong>{cities.length}</strong> byer</div>
        <div>👥 <strong>{followerCount}</strong> følgere</div>
        {!isOwnProfile && currentUserId && (
          <button onClick={handleFollow}>
            {isFollowing ? 'Slutt å følge' : 'Følg'}
          </button>
        )}
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