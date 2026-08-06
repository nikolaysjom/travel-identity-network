'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CitySearch, { CitySearchResult } from '@/app/components/CitySearch'
import { StarInput } from '@/app/components/StarRating'
import { ArrowLeft } from 'lucide-react'

export default function AddCityPage() {
  const [selectedCity, setSelectedCity] = useState<CitySearchResult | null>(null)
  const [status, setStatus] = useState('visited')
  const [rating, setRating] = useState<number | null>(null)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [personalNote, setPersonalNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedCity) {
      setError('Please select a city from the search results.')
      return
    }

    setSubmitting(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setSubmitting(false)
      return
    }

    const { data: existing } = await supabase
      .from('destinations')
      .select('id')
      .ilike('city_name', selectedCity.city_name)
      .ilike('country_name', selectedCity.country_name)
      .maybeSingle()

    let destinationId = existing?.id

    if (!destinationId) {
      const { data: countryMatch } = await supabase
        .from('countries')
        .select('code')
        .ilike('name', selectedCity.country_name)
        .maybeSingle()

      const { data: newDestination, error: insertDestError } = await supabase
        .from('destinations')
        .insert({
          city_name: selectedCity.city_name,
          country_name: selectedCity.country_name,
          country_code: countryMatch?.code || null,
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
        })
        .select()
        .single()

      if (insertDestError) {
        setError(insertDestError.message)
        setSubmitting(false)
        return
      }

      destinationId = newDestination.id
    }

    const { error: insertError } = await supabase.from('user_destinations').insert({
      user_id: session.user.id,
      destination_id: destinationId,
      status,
      rating: status !== 'want_to_go' ? rating : null,
      personal_note: personalNote || null,
      review_title: reviewTitle || null,
      review_text: reviewText || null,
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSuccess(true)
    setSelectedCity(null)
    setStatus('visited')
    setRating(null)
    setPersonalNote('')
    setReviewTitle('')
    setReviewText('')
    setShowReview(false)
  }

  return (
    <div
      style={{
        maxWidth: 440,
        margin: '0 auto',
        padding: '4rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <a
        href="/profile"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          marginBottom: '1.2rem',
        }}
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Back to profile
      </a>

      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Add a city</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Register a place you have visited, lived in, or want to go
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
          background: 'var(--surface)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          borderRadius: '18px',
          padding: '1.6rem',
        }}
      >
        <CitySearch onSelect={setSelectedCity} placeholder="Search for a city" />

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { value: 'visited', label: 'Visited' },
            { value: 'lived', label: 'Lived there' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              style={{
                flex: 1,
                background: status === opt.value ? 'var(--accent)' : 'var(--surface)',
                color: status === opt.value ? 'var(--bg)' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                padding: '0.6rem 0.5rem',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {status !== 'want_to_go' && (
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Rating <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <StarInput value={rating} onChange={setRating} />
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
            Description <span style={{ opacity: 0.6 }}>(private, just for you)</span>
          </label>
          <textarea
            placeholder="A note to yourself about this place"
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
            rows={3}
            style={{ resize: 'vertical', width: '100%' }}
          />
        </div>

        {showReview ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.7rem',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.9rem',
            }}
          >
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Public review &mdash; posted to Explore Cities
            </label>
            <input
              type="text"
              placeholder="Title (e.g. Best food city I've ever visited)"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
            />
            <textarea
              placeholder="Share your thoughts"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              style={{ resize: 'vertical', width: '100%' }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowReview(true)}
            style={{
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}
          >
            + Write a public review
          </button>
        )}

        {error && <p style={{ color: '#E8604C', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        {success && (
          <p style={{ color: 'var(--rating-high)', fontSize: '0.85rem', margin: 0 }}>City added!</p>
        )}

        <button type="submit" disabled={submitting} style={{ marginTop: '0.5rem' }}>
          {submitting ? 'Adding...' : 'Add city'}
        </button>
      </form>
    </div>
  )
}
