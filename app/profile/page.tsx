'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { StarDisplay } from '@/app/components/StarRating'

type Profile = {
  username: string
  bio: string | null
  is_available_locally: boolean
  is_private: boolean
}

type VisitedCity = {
  id: string
  rating: number | null
  status: string
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
        .select('username, bio, is_available_locally, is_private')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData)
      setBioText(profileData?.bio || '')

      const { data: citiesData } = await supabase
        .from('user_destinations')
        .select('id, rating, status, destinations(city_name, country_name)')
        .eq('user_id', session.user.id)

      const sortedCities = ((citiesData as unknown as VisitedCity[]) || []).sort(
        (a, b) => (b.rating ?? -1) - (a.rating ?? -1)
      )
      setCities(sortedCities)

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
    const confirmed = confirm('Are you sure you want to remove this city?')
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

  const handleTogglePrivate = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !profile) return

    const newValue = !profile.is_private

    await supabase
      .from('profiles')
      .update({ is_private: newValue })
      .eq('id', session.user.id)

    setProfile((prev) => (prev ? { ...prev, is_private: newValue } : prev))
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }
  if (!profile) return null

  const visited = cities.filter((c) => c.status === 'visited')
  const lived = cities.filter((c) => c.status === 'lived')
  const wantToGo = cities.filter((c) => c.status === 'want_to_go')
  const countries = new Set(
    cities.filter((c) => c.status !== 'want_to_go').map((c) => c.destinations?.country_name)
  )

  const renderSection = (title: string, list: VisitedCity[], status: string, showRating: boolean) => (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
          {title}
        </h2>
        {list.length > 3 && (
          <a
            href={`/profile/cities?status=${status}`}
            style={{ color: 'var(--accent)', fontSize: '0.8rem' }}
          >
            View all ({list.length})
          </a>
        )}
      </div>
      {list.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Nothing added yet.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.9rem',
            marginBottom: '2.5rem',
          }}
        >
          {list.slice(0, 3).map((c) => (
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
              {showRating && c.rating && (
                <div style={{ marginTop: '0.6rem' }}>
                  <StarDisplay value={c.rating} size={13} />
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
    </>
  )

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
              <button onClick={handleSaveBio}>Save</button>
            </div>
          ) : (
            <p
              onClick={() => setEditingBio(true)}
              style={{ color: 'var(--text-secondary)', cursor: 'pointer', margin: 0, fontSize: '0.95rem' }}
            >
              {profile.bio || 'Add a bio'}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
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
            Available as a local
          </label>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.9rem',
              marginLeft: '1.2rem',
              fontSize: '0.85rem',
              color: profile.is_private ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={profile.is_private}
              onChange={handleTogglePrivate}
              style={{ width: 'auto', accentColor: 'var(--accent)' }}
            />
            Private profile (hides your content from others)
          </label>
        </div>
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
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>countries</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>
            {visited.length + lived.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>cities</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>
            {followerCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>followers</div>
        </div>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>
            {followingCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>following</div>
        </div>
      </div>

      {renderSection('Visited cities', visited, 'visited', true)}
      {renderSection('Lived there', lived, 'lived', true)}
      {renderSection('Want to go', wantToGo, 'want_to_go', false)}

      <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1rem' }}>
        My lists
      </h2>
      {lists.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No lists yet.</p>
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
