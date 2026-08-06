'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { StarDisplay } from '@/app/components/StarRating'
import { Avatar } from '@/app/components/Avatar'

type Profile = {
  id: string
  username: string
  bio: string | null
  is_available_locally: boolean
  is_traveling: boolean
  traveling_until: string | null
  avatar_url: string | null
  home_city: { city_name: string; country_name: string } | null
  current_city: { city_name: string; country_name: string } | null
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
        .select('id, username, bio, is_available_locally, is_traveling, traveling_until, avatar_url, home_city:destinations!home_city_id(city_name, country_name), current_city:destinations!traveling_city_id(city_name, country_name)')
        .eq('username', username)
        .single()

      if (profileError || !profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // Don't show a stale "currently traveling" badge if it has expired -
      // the owner's own session will clean up the DB row when they next load
      // their profile, but visitors shouldn't see outdated info meanwhile.
      const isTravelExpired =
        profileData.is_traveling &&
        profileData.traveling_until &&
        new Date(profileData.traveling_until) < new Date()

      setProfile(isTravelExpired ? { ...profileData, is_traveling: false } : profileData)

      const { data: citiesData } = await supabase
        .from('user_destinations')
        .select('id, rating, status, destinations(city_name, country_name)')
        .eq('user_id', profileData.id)

      const sorted = ((citiesData as unknown as VisitedCity[]) || []).sort(
        (a, b) => (b.rating ?? -1) - (a.rating ?? -1)
      )
      setCities(sorted)

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

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }
  if (notFound) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Couldn&apos;t find the user &quot;{username}&quot;.
      </div>
    )
  }
  if (!profile) return null

  const isOwnProfile = currentUserId === profile.id

  const visited = cities.filter((c) => c.status === 'visited')
  const lived = cities.filter((c) => c.status === 'lived')
  const countries = new Set([...visited, ...lived].map((c) => c.destinations?.country_name))

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
            href={`/users/${username}/cities?status=${status}`}
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                borderRadius: '18px',
                padding: '1rem',
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
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Avatar url={profile.avatar_url} username={profile.username} size={56} />
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>{profile.username}</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.6rem' }}>
          {profile.bio || 'No bio yet'}
        </p>

        {profile.is_available_locally && (
          <p style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '0.85rem', marginTop: '0.6rem' }}>
            {profile.home_city
              ? `Available as a local in ${profile.home_city.city_name}`
              : 'Available as a local'}
          </p>
        )}

        {profile.is_traveling && (
          <p style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '0.85rem', marginTop: '0.6rem' }}>
            {profile.current_city
              ? `Currently in ${profile.current_city.city_name}`
              : 'Currently traveling'}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '2.5rem',
          alignItems: 'center',
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
        {!isOwnProfile && currentUserId && (
          <button onClick={handleFollow} style={{ marginLeft: 'auto' }}>
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>

      {renderSection('Visited cities', visited, 'visited', true)}
      {renderSection('Lived there', lived, 'lived', true)}

      <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1rem' }}>
        Lists
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                borderRadius: '18px',
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
