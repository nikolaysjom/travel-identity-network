'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { StarDisplay } from '@/app/components/StarRating'
import { Plus, List as ListIcon } from 'lucide-react'
import ConfirmDialog from '@/app/components/ConfirmDialog'

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
  const [pendingCityDelete, setPendingCityDelete] = useState<string | null>(null)
  const [pendingListDelete, setPendingListDelete] = useState<string | null>(null)
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

  const confirmDeleteCity = async () => {
    if (!pendingCityDelete) return
    await supabase.from('user_destinations').delete().eq('id', pendingCityDelete)
    setCities((prev) => prev.filter((c) => c.id !== pendingCityDelete))
    setPendingCityDelete(null)
  }

  const confirmDeleteList = async () => {
    if (!pendingListDelete) return
    await supabase.from('lists').delete().eq('id', pendingListDelete)
    setLists((prev) => prev.filter((l) => l.id !== pendingListDelete))
    setPendingListDelete(null)
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
                onClick={() => setPendingCityDelete(c.id)}
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
      <ConfirmDialog
        open={pendingCityDelete !== null}
        title="Remove city"
        message="Are you sure you want to remove this city?"
        onConfirm={confirmDeleteCity}
        onCancel={() => setPendingCityDelete(null)}
      />
      <ConfirmDialog
        open={pendingListDelete !== null}
        title="Delete list"
        message="Are you sure you want to delete this list?"
        onConfirm={confirmDeleteList}
        onCancel={() => setPendingListDelete(null)}
      />

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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.2rem',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Places</h2>
        <a
          href="/add-city"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.45rem 0.8rem',
            fontSize: '0.85rem',
          }}
        >
          <Plus size={15} strokeWidth={2} />
          Add city
        </a>
      </div>

      {renderSection('Visited cities', visited, 'visited', true)}
      {renderSection('Lived there', lived, 'lived', true)}
      {renderSection('Want to go', wantToGo, 'want_to_go', false)}

      {/* Lists - intentionally de-emphasized, small footer-style section */}
      <div
        style={{
          marginTop: '2.5rem',
          paddingTop: '1.2rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Lists {lists.length > 0 ? `(${lists.length})` : ''}
          </span>
          {lists.length === 0 && (
            <a href="/lists/new" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
              + New list
            </a>
          )}
        </div>

        {lists.length > 0 && (
          <ul style={{ margin: '0.6rem 0 0 0', padding: 0, listStyle: 'none' }}>
            {lists.map((list, i) => (
              <li
                key={list.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  fontSize: '0.85rem',
                }}
              >
                <a
                  href={`/lists/${list.id}`}
                  style={{
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <ListIcon size={13} strokeWidth={2} />
                  {list.title}
                </a>
                <button
                  onClick={() => setPendingListDelete(list.id)}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                  }}
                >
                  X
                </button>
              </li>
            ))}
            <li style={{ paddingTop: '0.5rem' }}>
              <a href="/lists/new" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                + New list
              </a>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
