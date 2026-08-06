'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { StarDisplay } from '@/app/components/StarRating'
import { Plus, List as ListIcon } from 'lucide-react'
import ConfirmDialog from '@/app/components/ConfirmDialog'
import EditCityDialog, { EditCityData } from '@/app/components/EditCityDialog'
import { Avatar, AvatarPicker } from '@/app/components/Avatar'
import CitySearch, { CitySearchResult } from '@/app/components/CitySearch'
import dynamic from 'next/dynamic'
import type { CountryStatusMap } from '@/app/components/WorldMap'

const WorldMap = dynamic(() => import('@/app/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '220px',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
      }}
    >
      Loading map...
    </div>
  ),
})

type Profile = {
  username: string
  bio: string | null
  is_available_locally: boolean
  is_traveling: boolean
  avatar_url: string | null
  home_city_id: string | null
  traveling_city_id: string | null
  traveling_until: string | null
  home_city: { city_name: string; country_name: string } | null
  current_city: { city_name: string; country_name: string } | null
}

type VisitedCity = {
  id: string
  rating: number | null
  status: string
  personal_note: string | null
  review_title: string | null
  review_text: string | null
  destinations: {
    city_name: string
    country_name: string
  } | null
}

type ListItem = {
  id: string
  title: string
}

const CONTINENT_CENTERS: Record<string, [number, number]> = {
  Europe: [54, 15],
  Asia: [34, 100],
  Africa: [2, 20],
  'North America': [45, -100],
  'South America': [-15, -60],
  Oceania: [-25, 140],
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
  const [countryStatus, setCountryStatus] = useState<CountryStatusMap>({})
  const [worldPercent, setWorldPercent] = useState(0)
  const [continentPercents, setContinentPercents] = useState<{ name: string; percent: number }[]>([])
  const [pendingCityDelete, setPendingCityDelete] = useState<string | null>(null)
  const [pendingListDelete, setPendingListDelete] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [editingCity, setEditingCity] = useState<EditCityData | null>(null)
  const [showLocalCityPicker, setShowLocalCityPicker] = useState(false)
  const [showTravelCityPicker, setShowTravelCityPicker] = useState(false)
  const [travelUntilDate, setTravelUntilDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [travelUnknownDuration, setTravelUnknownDuration] = useState(false)
  const [statusWarning, setStatusWarning] = useState('')
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
        .select('username, bio, is_available_locally, is_traveling, avatar_url, home_city_id, traveling_city_id, traveling_until, home_city:destinations!home_city_id(city_name, country_name), current_city:destinations!traveling_city_id(city_name, country_name)')
        .eq('id', session.user.id)
        .single()

      let finalProfile = profileData

      // Auto-expire "currently traveling" status if the set duration has passed
      if (
        profileData?.is_traveling &&
        profileData.traveling_until &&
        new Date(profileData.traveling_until) < new Date()
      ) {
        await supabase
          .from('profiles')
          .update({ is_traveling: false })
          .eq('id', session.user.id)

        finalProfile = { ...profileData, is_traveling: false }
      }

      setProfile(finalProfile)
      setBioText(finalProfile?.bio || '')

      const { data: citiesData } = await supabase
        .from('user_destinations')
        .select('id, rating, status, personal_note, review_title, review_text, destinations(city_name, country_name)')
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

      // Build country-level map + discovery percentages
      const { data: destStatusData } = await supabase
        .from('user_destinations')
        .select('status, destinations(country_code)')
        .eq('user_id', session.user.id)

      const { data: manualCountryData } = await supabase
        .from('user_countries')
        .select('country_code, status, place_type')
        .eq('user_id', session.user.id)

      const discovered = new Set<string>()
      const cMap: CountryStatusMap = {}

      ;(destStatusData || []).forEach((row: any) => {
        const code = row.destinations?.country_code
        if (!code) return
        if (row.status === 'visited' || row.status === 'lived') {
          discovered.add(code)
          cMap[code] = row.status
        }
      })
      ;(manualCountryData || []).forEach((row: any) => {
        if (row.place_type === 'territory') return
        if (!row.country_code) return
        if (row.status === 'visited' || row.status === 'lived') {
          discovered.add(row.country_code)
          cMap[row.country_code] = row.status
        }
      })

      setCountryStatus(cMap)

      const { data: allCountries } = await supabase
        .from('countries')
        .select('code, continent')
        .eq('place_type', 'country')

      if (allCountries && allCountries.length > 0) {
        const totalCountries = allCountries.length
        setWorldPercent(Math.round((discovered.size / totalCountries) * 100))

        const continentTotals: Record<string, number> = {}
        const continentDiscovered: Record<string, number> = {}

        allCountries.forEach((c: any) => {
          if (!c.continent) return
          continentTotals[c.continent] = (continentTotals[c.continent] || 0) + 1
          if (discovered.has(c.code)) {
            continentDiscovered[c.continent] = (continentDiscovered[c.continent] || 0) + 1
          }
        })

        const percents = Object.keys(continentTotals)
          .sort()
          .map((name) => ({
            name,
            percent: Math.round(((continentDiscovered[name] || 0) / continentTotals[name]) * 100),
          }))

        setContinentPercents(percents)
      }

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

  const handleSaveCityEdit = async (
    id: string,
    status: string,
    rating: number | null,
    personalNote: string,
    reviewTitle: string,
    reviewText: string
  ) => {
    await supabase
      .from('user_destinations')
      .update({
        status,
        rating,
        personal_note: personalNote || null,
        review_title: reviewTitle || null,
        review_text: reviewText || null,
      })
      .eq('id', id)

    setCities((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              rating,
              personal_note: personalNote || null,
              review_title: reviewTitle || null,
              review_text: reviewText || null,
            }
          : c
      )
    )
    setEditingCity(null)
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

    if (profile.is_available_locally) {
      await supabase
        .from('profiles')
        .update({ is_available_locally: false })
        .eq('id', session.user.id)

      setProfile((prev) => (prev ? { ...prev, is_available_locally: false } : prev))
      return
    }

    if (profile.is_traveling) {
      setStatusWarning('You can only be active as a local or currently traveling at a time.')
      return
    }

    setStatusWarning('')

    if (!profile.home_city_id) {
      setShowLocalCityPicker(true)
      return
    }

    await supabase
      .from('profiles')
      .update({ is_available_locally: true })
      .eq('id', session.user.id)

    setProfile((prev) => (prev ? { ...prev, is_available_locally: true } : prev))
  }

  const handleToggleTraveling = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !profile) return

    if (profile.is_traveling) {
      await supabase
        .from('profiles')
        .update({ is_traveling: false })
        .eq('id', session.user.id)

      setProfile((prev) => (prev ? { ...prev, is_traveling: false } : prev))
      return
    }

    if (profile.is_available_locally) {
      setStatusWarning('You can only be active as a local or currently traveling at a time.')
      return
    }

    setStatusWarning('')

    if (!profile.traveling_city_id) {
      setShowTravelCityPicker(true)
      return
    }

    await supabase
      .from('profiles')
      .update({ is_traveling: true })
      .eq('id', session.user.id)

    setProfile((prev) => (prev ? { ...prev, is_traveling: true } : prev))
  }

  const findOrCreateDestination = async (city: CitySearchResult): Promise<string | null> => {
    const { data: existing } = await supabase
      .from('destinations')
      .select('id')
      .ilike('city_name', city.city_name)
      .ilike('country_name', city.country_name)
      .maybeSingle()

    if (existing?.id) return existing.id

    const { data: countryMatch } = await supabase
      .from('countries')
      .select('code')
      .ilike('name', city.country_name)
      .maybeSingle()

    const { data: newDestination } = await supabase
      .from('destinations')
      .insert({
        city_name: city.city_name,
        country_name: city.country_name,
        country_code: countryMatch?.code || null,
        latitude: city.latitude,
        longitude: city.longitude,
      })
      .select()
      .single()

    return newDestination?.id || null
  }

  const handleSetLocalCity = async (city: CitySearchResult) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const destinationId = await findOrCreateDestination(city)
    if (!destinationId) return

    await supabase
      .from('profiles')
      .update({ home_city_id: destinationId, is_available_locally: true })
      .eq('id', session.user.id)

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            home_city_id: destinationId,
            is_available_locally: true,
            home_city: { city_name: city.city_name, country_name: city.country_name },
          }
        : prev
    )
    setShowLocalCityPicker(false)
  }

  const handleSetTravelingCity = async (city: CitySearchResult) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const destinationId = await findOrCreateDestination(city)
    if (!destinationId) return

    let untilIso: string
    if (travelUnknownDuration) {
      const fallback = new Date()
      fallback.setDate(fallback.getDate() + 14)
      untilIso = fallback.toISOString()
    } else {
      untilIso = new Date(travelUntilDate + 'T23:59:59').toISOString()
    }

    await supabase
      .from('profiles')
      .update({ traveling_city_id: destinationId, is_traveling: true, traveling_until: untilIso })
      .eq('id', session.user.id)

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            traveling_city_id: destinationId,
            is_traveling: true,
            traveling_until: untilIso,
            current_city: { city_name: city.city_name, country_name: city.country_name },
          }
        : prev
    )
    setShowTravelCityPicker(false)
  }


  const handleSelectAvatar = async (url: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id)
    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev))
    setShowAvatarPicker(false)
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
              onClick={() =>
                setEditingCity({
                  id: c.id,
                  cityName: c.destinations?.city_name || '',
                  countryName: c.destinations?.country_name || '',
                  status: c.status,
                  rating: c.rating,
                  personalNote: c.personal_note,
                  reviewTitle: c.review_title,
                  reviewText: c.review_text,
                })
              }
              style={{
                background: 'var(--surface)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                borderRadius: '18px',
                padding: '1rem',
                position: 'relative',
                cursor: 'pointer',
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
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingCityDelete(c.id)
                }}
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

      <EditCityDialog
        city={editingCity}
        onSave={handleSaveCityEdit}
        onClose={() => setEditingCity(null)}
      />

      <div style={{ marginBottom: '2rem' }}>
        {showAvatarPicker && (
          <AvatarPicker onSelect={handleSelectAvatar} onClose={() => setShowAvatarPicker(false)} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowAvatarPicker(true)}
            style={{ background: 'transparent', padding: 0, border: 'none' }}
            title="Change avatar"
          >
            <Avatar url={profile.avatar_url} username={profile.username} size={56} />
          </button>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>{profile.username}</h1>
        </div>

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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div>
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
              {profile.home_city
                ? `Available as a local in ${profile.home_city.city_name}`
                : 'Available as a local'}
            </label>

            {profile.is_available_locally && profile.home_city && (
              <button
                onClick={() => setShowLocalCityPicker(true)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  padding: '0.2rem 0.5rem',
                  marginTop: '0.9rem',
                  textDecoration: 'underline',
                  display: 'block',
                }}
              >
                Change city
              </button>
            )}
          </div>

          <div>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.9rem',
                fontSize: '0.85rem',
                color: profile.is_traveling ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={profile.is_traveling}
                onChange={handleToggleTraveling}
                style={{ width: 'auto', accentColor: 'var(--accent)' }}
              />
              {profile.current_city
                ? `Currently in ${profile.current_city.city_name}`
                : 'Currently traveling'}
            </label>

            {profile.is_traveling && profile.current_city && (
              <button
                onClick={() => setShowTravelCityPicker(true)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  padding: '0.2rem 0.5rem',
                  marginTop: '0.9rem',
                  textDecoration: 'underline',
                  display: 'block',
                }}
              >
                Change city
              </button>
            )}
          </div>
        </div>

        {statusWarning && (
          <p style={{ color: '#D1453B', fontSize: '0.8rem', marginTop: '0.6rem' }}>{statusWarning}</p>
        )}
      </div>

      {showLocalCityPicker && (
        <div
          onClick={() => setShowLocalCityPicker(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: '18px',
              padding: '1.5rem',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem' }}>Which city are you local in?</h3>
            <CitySearch onSelect={handleSetLocalCity} placeholder="Search for a city" />
          </div>
        </div>
      )}

      {showTravelCityPicker && (
        <div
          onClick={() => setShowTravelCityPicker(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: '18px',
              padding: '1.5rem',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem' }}>Which city are you in right now?</h3>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Until when will you be there?
            </label>

            {!travelUnknownDuration && (
              <input
                type="date"
                value={travelUntilDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTravelUntilDate(e.target.value)}
                style={{ width: '100%', marginBottom: '0.5rem' }}
              />
            )}

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={travelUnknownDuration}
                onChange={(e) => setTravelUnknownDuration(e.target.checked)}
                style={{ width: 'auto', accentColor: 'var(--accent)' }}
              />
              Not sure yet
            </label>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.9rem' }}>
              {travelUnknownDuration
                ? 'Automatically turns off in 2 weeks unless you update it.'
                : 'Automatically turns off after this date unless you update it.'}
            </p>

            <CitySearch onSelect={handleSetTravelingCity} placeholder="Search for a city" />
          </div>
        </div>
      )}

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
            {Object.keys(countryStatus).length}
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

      <div style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '0.8rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
            World map
          </h2>
          <a href="/map" style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>
            View full map
          </a>
        </div>

        <WorldMap
          countryStatus={countryStatus}
          height="200px"
          interactive={false}
          center={
            continentPercents.length > 0
              ? CONTINENT_CENTERS[
                  [...continentPercents].sort((a, b) => b.percent - a.percent)[0].name
                ]
              : undefined
          }
          zoom={2}
        />

        <div style={{ marginTop: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <span
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                fontFamily: 'var(--font-space-grotesk)',
              }}
            >
              {worldPercent}%
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>of the world discovered</span>
          </div>

          {continentPercents.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1.2rem' }}>
              {continentPercents.map((c) => (
                <div
                  key={c.name}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                  <span style={{ fontWeight: 600 }}>{c.percent}%</span>
                </div>
              ))}
            </div>
          )}
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
