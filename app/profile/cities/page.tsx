'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { StarDisplay } from '@/app/components/StarRating'
import ConfirmDialog from '@/app/components/ConfirmDialog'
import EditCityDialog, { EditCityData } from '@/app/components/EditCityDialog'

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

const titles: Record<string, string> = {
  visited: 'Visited cities',
  lived: 'Lived there',
  want_to_go: 'Want to go',
}

function CitiesOverview() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'visited'
  const router = useRouter()

  const [cities, setCities] = useState<VisitedCity[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [editingCity, setEditingCity] = useState<EditCityData | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('user_destinations')
      .select('id, rating, status, personal_note, review_title, review_text, destinations(city_name, country_name)')
      .eq('user_id', session.user.id)
      .eq('status', status)

    const sorted = ((data as unknown as VisitedCity[]) || []).sort(
      (a, b) => (b.rating ?? -1) - (a.rating ?? -1)
    )
    setCities(sorted)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [status, router])

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await supabase.from('user_destinations').delete().eq('id', pendingDelete)
    setCities((prev) => prev.filter((c) => c.id !== pendingDelete))
    setPendingDelete(null)
  }

  const handleSaveCityEdit = async (
    id: string,
    newStatus: string,
    rating: number | null,
    personalNote: string,
    reviewTitle: string,
    reviewText: string
  ) => {
    await supabase
      .from('user_destinations')
      .update({
        status: newStatus,
        rating,
        personal_note: personalNote || null,
        review_title: reviewTitle || null,
        review_text: reviewText || null,
      })
      .eq('id', id)

    // If the status changed, this city no longer belongs on this page's
    // filtered list, so just reload from scratch.
    setEditingCity(null)
    load()
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove city"
        message="Are you sure you want to remove this city?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <EditCityDialog
        city={editingCity}
        onSave={handleSaveCityEdit}
        onClose={() => setEditingCity(null)}
        onDelete={(id) => {
          setPendingDelete(id)
          setEditingCity(null)
        }}
      />

      <a href="/profile" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        &larr; Back to profile
      </a>
      <h1 style={{ fontSize: '1.5rem', marginTop: '0.8rem', marginBottom: '1.5rem' }}>
        {titles[status] || 'Cities'}
      </h1>

      {cities.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nothing here yet.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.9rem',
          }}
        >
          {cities.map((c) => (
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
              {status !== 'want_to_go' && c.rating && (
                <div style={{ marginTop: '0.6rem' }}>
                  <StarDisplay value={c.rating} size={13} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CitiesOverviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>}>
      <CitiesOverview />
    </Suspense>
  )
}
