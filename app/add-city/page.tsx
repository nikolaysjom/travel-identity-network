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
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '1rem' }}>
      <h1>Legg til besøkt by</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
        />

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>By lagt til!</p>}

        <button type="submit">Legg til</button>
      </form>
    </div>
  )
}