'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Destination = {
  id: string
  city_name: string
  country_name: string
}

export default function AddCityPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [rating, setRating] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('destinations')
        .select('id, city_name, country_name')
        .order('city_name')

      setDestinations(data || [])
    }

    checkAuthAndLoad()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error: insertError } = await supabase.from('user_destinations').insert({
      user_id: session.user.id,
      destination_id: selectedId,
      rating: rating ? parseFloat(rating) : null,
      review_text: reviewText || null,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSuccess(true)
    setSelectedId('')
    setRating('')
    setReviewText('')
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
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Legg til besøkt by</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Registrer et sted du har vært
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
          <option value="">Velg en by</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.city_name}, {d.country_name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Rating (0-10)"
          min="0"
          max="10"
          step="0.1"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />

        <textarea
          placeholder="Kort anmeldelse (valgfritt)"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          style={{ resize: 'vertical' }}
        />

        {error && <p style={{ color: '#E8604C', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        {success && <p style={{ color: 'var(--rating-high)', fontSize: '0.85rem', margin: 0 }}>By lagt til!</p>}

        <button type="submit" style={{ marginTop: '0.5rem' }}>
          Legg til
        </button>
      </form>
    </div>
  )
}