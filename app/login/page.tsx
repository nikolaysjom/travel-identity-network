'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      return
    }

    router.push('/')
    router.refresh()
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
        Log in
      </h1>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          textAlign: 'center',
          marginBottom: '2.2rem',
        }}
      >
        Good to see you again
      </p>

      <form
        onSubmit={handleLogin}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p style={{ color: '#E8604C', fontSize: '0.85rem', margin: 0 }}>{error}</p>
        )}

        <button type="submit" style={{ marginTop: '0.5rem' }}>
          Log in
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
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: 'var(--accent)' }}>
          Sign up
        </Link>
      </p>
    </div>
  )
}
