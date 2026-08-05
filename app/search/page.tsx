'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/app/components/Avatar'

type Profile = {
  username: string
  bio: string | null
  avatar_url: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const { data } = await supabase
      .from('profiles')
      .select('username, bio, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(20)

    setResults(data || [])
    setSearched(true)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Find users</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.7rem', marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Search by username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Search</button>
      </form>

      {searched && results.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No users found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {results.map((user) => (
          <a
            key={user.username}
            href={`/users/${user.username}`}
            className="tin-card-hover"
            style={{
              background: 'var(--surface)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              borderRadius: '16px',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
            }}
          >
            <Avatar url={user.avatar_url} username={user.username} size={40} />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.username}</div>
              {user.bio && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  {user.bio}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
