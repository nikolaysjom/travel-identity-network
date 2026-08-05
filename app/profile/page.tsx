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
    setProfile((prev) => (prev ? { ...prev, bio: bioText } : prev))
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

    setProfile((prev) => (prev ? { ...prev, is_available_locally: newValue } : prev))
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Laster...
      </div>
    )
  }
  if (!profile) return null

  const countries = new Set(cities.map((c) => c.destinations?.country_name))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.7rem', margin: 0 }}>{profile.username}</h1>

        <div style={{ marginTop: '0.6rem' }}>
          {editingBio ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <button onClick={handleSaveBio}>Lagre</button>
            </div>
          ) : (
            <p
              onClick={() => setEditingBio(true)}
              style={{ color: 'var(--text-secondary)', cursor: 'pointer', margin: 0, fontSize: '0.95rem' }}
            >
              {profile.bio || 'Legg til en bio'}
            </p>
          )}
        </div>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.9rem',
            fontSize: '0.85rem',
            color: profile.is_available_locally ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={profile.is_available_locally}
            onChange={handleToggleLocal}
            style={{ width: 'auto', accentColor: 'var(--accent)' }}
          />
          Tilgjengelig som lokal
        </label>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '2.5rem',
          padding: '1.2rem 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          marginBottom: '2.5rem',
        }}
      >
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>
            {countries.size}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>land</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>
            {cities.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>byer</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>
            {followerCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>følgere</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>
            {followingCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>følger</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1rem' }}>
        Besøkte byer
      </h2>
      {cities.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ingen byer lagt til ennå.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '0.9rem',
            marginBottom: '2.5rem',
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
                position: 'relative',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.destinations?.city_name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                {c.destinations?.country_name}
              </div>
              {c.rating && (
                <div
                  style={{
                    marginTop: '0.6rem',
                    fontSize: '0.85rem',
                    color:
                      c.rating < 5
                        ? 'var(--rating-low)'
                        : c.rating < 7.5
                        ? 'var(--rating-mid)'
                        : 'var(--rating-high)',
          }}
        >
          {c.rating}/10
        </div>
      )}
              
              <button
                onClick={() => handleDeleteCity(c.id)}
                style={{
                  position: 'absolute',
                  top: '0.6rem',
                  right: '0.6rem',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.4rem',
                }}
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1rem' }}>
        Mine lister
      </h2>
      {lists.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ingen lister ennå.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
         {lists.map((list) => (
            <a
              key={list.id}
                href={`/lists/${list.id}`}
                style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '0.9rem 1.1rem',
                fontSize: '0.9rem',
                display: 'block',
              }}
            >
              {list.title}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
