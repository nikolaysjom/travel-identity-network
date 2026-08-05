'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = {
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cities, setCities] = useState<VisitedCity[]>([])
  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState<ListItem[]>([])
  const [editingBio, setEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
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
        .select('username, bio, is_available_locally')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData)
      setBioText(profileData?.bio || '')

      const { data: citiesData } = await supabase
        .from('user_destinations')
        .select('id, rating, destinations(city_name, country_name)')
        .eq('user_id', session.user.id)

      setCities((citiesData as unknown as VisitedCity[]) || [])

      const { data: listsData } = await supabase
        .from('lists')
        .select('id, title')
        .eq('user_id', session.user.id)

      setLists(listsData || [])

      const { count: followers } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', session.user.id)

      setFollowerCount(followers || 0)

      const { count: following } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', session.user.id)

      setFollowingCount(following || 0)

      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleDeleteCity = async (destinationRowId: string) => {
    const confirmed = confirm('Er du sikker på at du vil slette denne byen?')
    if (!confirmed) return

    await supabase.from('user_destinations').delete().eq('id', destinationRowId)
    window.location.reload()
  }

  const handleSaveBio = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('profiles').update({ bio: bioText }).eq('id', session.user.id)
    setProfile((prev) => prev ? { ...prev, bio: bioText } : prev)
    setEditingBio(false)
  }

  const handleToggleLocal = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !profile) return

  const newValue = !profile.is_available_locally

  await supabase
    .from('profiles')
    .update({ is_available_locally: newValue })
    .eq('id', session.user.id)

  setProfile((prev) => prev ? { ...prev, is_available_locally: newValue } : prev)
}

  if (loading) return <div style={{ padding: '2rem' }}>Laster...</div>
  if (!profile) return null

  const countries = new Set(cities.map((c) => c.destinations?.country_name))

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem' }}>
      <h1>{profile.username}</h1>

      {editingBio ? (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleSaveBio}>Lagre</button>
        </div>
      ) : (
        <p onClick={() => setEditingBio(true)} style={{ cursor: 'pointer' }}>
          {profile.bio || 'Ingen bio ennå'} <span style={{ fontSize: '0.8rem', color: '#888' }}>(klikk for å redigere)</span>
        </p>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          type="checkbox"
          checked={profile.is_available_locally}
         onChange={handleToggleLocal}
  />
  Tilgjengelig som lokal
</label>

      <div style={{ display: 'flex', gap: '2rem', margin: '1.5rem 0' }}>
        <div>🌎 <strong>{countries.size}</strong> land</div>
        <div>🏙️ <strong>{cities.length}</strong> byer</div>
        <div>👥 <strong>{followerCount}</strong> følgere</div>
        <div>➡️ <strong>{followingCount}</strong> følger</div>
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
              {' '}
              <button onClick={() => handleDeleteCity(c.id)} style={{ fontSize: '0.8rem' }}>Slett</button>
            </li>
          ))}
        </ul>
      )}

      <h2>Mine lister</h2>
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