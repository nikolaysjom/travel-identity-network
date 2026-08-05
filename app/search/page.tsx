'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = {
  username: string
  bio: string | null
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
      .select('username, bio')
      .ilike('username', `%${query}%`)
      .limit(20)

    setResults(data || [])
    setSearched(true)
  }

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '1rem' }}>
      <h1>Finn brukere</h1>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Søk etter brukernavn"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Søk</button>
      </form>

      {searched && results.length === 0 && <p>Ingen brukere funnet.</p>}

      <ul>
        {results.map((user) => (
          <li key={user.username} style={{ marginBottom: '0.5rem' }}>
            <a href={`/users/${user.username}`}>{user.username}</a>
            {user.bio && <span style={{ color: '#888' }}> — {user.bio}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}