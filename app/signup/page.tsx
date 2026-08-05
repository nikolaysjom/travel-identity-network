'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (signupError) {
      setError(signupError.message)
      return
    }

    router.push('/')
  }

  return (
    <div
      style={{
        maxWidth: 380,
        margin: '0 auto',
        padding: '5rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem', textAlign: 'center' }}>
        Opprett konto
      </h1>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          textAlign: 'center',
          marginBottom: '2.2rem',
        }}
      >
        Bygg din digitale reiseidentitet
      </p>

      <form
        onSubmit={handleSignup}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
      >
        <input
          type="text"
          placeholder="Brukernavn"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Passord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p style={{ color: '#E8604C', fontSize: '0.85rem', margin: 0 }}>{error}</p>
        )}

        <button type="submit" style={{ marginTop: '0.5rem' }}>
          Opprett konto
        </button>
      </form>

      <p
        style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          marginTop: '1.5rem',
        }}
      >
        Har du allerede en konto?{' '}
        <Link href="/login" style={{ color: 'var(--accent)' }}>
          Logg inn
        </Link>
      </p>
    </div>
  )
}