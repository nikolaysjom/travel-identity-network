'use client'

import { useState, useEffect } from 'react'
import { StarInput } from '@/app/components/StarRating'

export type EditCityData = {
  id: string
  cityName: string
  countryName: string
  status: string
  rating: number | null
  personalNote: string | null
  reviewTitle: string | null
  reviewText: string | null
}

type EditCityDialogProps = {
  city: EditCityData | null
  onSave: (
    id: string,
    status: string,
    rating: number | null,
    personalNote: string,
    reviewTitle: string,
    reviewText: string
  ) => void
  onClose: () => void
}

export default function EditCityDialog({ city, onSave, onClose }: EditCityDialogProps) {
  const [status, setStatus] = useState('visited')
  const [rating, setRating] = useState<number | null>(null)
  const [personalNote, setPersonalNote] = useState('')
  const [showPublicReview, setShowPublicReview] = useState(false)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewText, setReviewText] = useState('')

  useEffect(() => {
    if (city) {
      setStatus(city.status)
      setRating(city.rating)
      setPersonalNote(city.personalNote || '')
      setReviewTitle(city.reviewTitle || '')
      setReviewText(city.reviewText || '')
      setShowPublicReview(!!(city.reviewTitle || city.reviewText))
    }
  }, [city])

  if (!city) return null

  const handleSave = () => {
    onSave(
      city.id,
      status,
      status === 'want_to_go' ? null : rating,
      personalNote,
      reviewTitle,
      reviewText
    )
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '18px',
          padding: '1.5rem',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem' }}>{city.cityName}</h3>
        <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {city.countryName}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.1rem' }}>
          {[
            { value: 'visited', label: 'Visited' },
            { value: 'lived', label: 'Lived there' },
            { value: 'want_to_go', label: 'Want to go' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              style={{
                flex: 1,
                background: status === opt.value ? 'var(--accent)' : 'var(--bg)',
                color: status === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontSize: '0.78rem',
                padding: '0.5rem 0.4rem',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {status !== 'want_to_go' && (
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Rating
            </label>
            <StarInput value={rating} onChange={setRating} />
          </div>
        )}

        <div style={{ marginBottom: '1.1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
            Description <span style={{ opacity: 0.6 }}>(private, just for you)</span>
          </label>
          <textarea
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
            placeholder="A note to yourself about this place"
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {showPublicReview ? (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.9rem',
              marginBottom: '1.2rem',
            }}
          >
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
              Public review &mdash; posted to Explore Cities
            </label>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Title"
              style={{ width: '100%', marginBottom: '0.6rem' }}
            />
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPublicReview(true)}
            style={{
              background: 'var(--bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontSize: '0.82rem',
              width: '100%',
              marginBottom: '1.2rem',
            }}
          >
            + Write a public review
          </button>
        )}

        <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
