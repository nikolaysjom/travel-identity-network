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
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>New list</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Collect your favorite places in a list
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          background: 'var(--surface)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          borderRadius: '18px',
          padding: '1.6rem',
        }}
      >
        <input
          type="text"
          placeholder="Title (e.g. My top 10 cities)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ resize: 'vertical' }}
        />

        {error && <p style={{ color: '#E8604C', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

        <button type="submit" style={{ marginTop: '0.5rem' }}>
          Create list
        </button>
      </form>
    </div>
  )
}
