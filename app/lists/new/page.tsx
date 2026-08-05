'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewListPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data, error: insertError } = await supabase
      .from('lists')
      .insert({
        user_id: session.user.id,
        title,
        description: description || null,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push(`/lists/${data.id}`)
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
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Ny liste</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Samle stedene dine i en liste
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <input
          type="text"
          placeholder="Tittel (f.eks. Mine topp 10 byer)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Beskrivelse (valgfritt)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ resize: 'vertical' }}
        />

        {error && <p style={{ color: '#E8604C', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

        <button type="submit" style={{ marginTop: '0.5rem' }}>
          Opprett liste
        </button>
      </form>
    </div>
  )
}