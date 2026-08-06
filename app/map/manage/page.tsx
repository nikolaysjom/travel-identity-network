'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CountrySearch, { CountryResult } from '@/app/components/CountrySearch'
import ConfirmDialog from '@/app/components/ConfirmDialog'
import { ArrowLeft, X } from 'lucide-react'

type PlaceEntry = {
  code: string
  name: string
  continent: string
  status: string
  hasCity: boolean
  manualId: string | null
}

const STATUS_COLOR: Record<string, string> = {
  visited: '#2E9B63',
  lived: '#E8A33D',
  want_to_go: '#5B7A99',
}

const STATUS_LABEL: Record<string, string> = {
  visited: 'Visited',
  lived: 'Lived there',
  want_to_go: 'Want to go',
}

const STATUS_PRIORITY: Record<string, number> = {
  lived: 3,
  visited: 2,
  want_to_go: 1,
}

export default function ManageCountriesPage() {
  const [entries, setEntries] = useState<PlaceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlace, setSelectedPlace] = useState<CountryResult | null>(null)
  const [statusInput, setStatusInput] = useState('visited')
  const [addError, setAddError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const router = useRouter()

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: cityData } = await supabase
      .from('user_destinations')
      .select('status, destinations(country_code)')
      .eq('user_id', session.user.id)

    const { data: manualData } = await supabase
      .from('user_countries')
      .select('id, country_code, status, place_type')
      .eq('user_id', session.user.id)

    const codesInvolved = new Set<string>()
    ;(cityData || []).forEach((row: any) => {
      if (row.destinations?.country_code) codesInvolved.add(row.destinations.country_code)
    })
    ;(manualData || []).forEach((row: any) => {
      if (row.country_code) codesInvolved.add(row.country_code)
    })

    const { data: countryInfo } = await supabase
      .from('countries')
      .select('code, name, continent')
      .in('code', Array.from(codesInvolved))

    const infoMap: Record<string, { name: string; continent: string }> = {}
    ;(countryInfo || []).forEach((c: any) => {
      infoMap[c.code] = { name: c.name, continent: c.continent || 'Other' }
    })

    const merged: Record<string, PlaceEntry> = {}

    ;(cityData || []).forEach((row: any) => {
      const code = row.destinations?.country_code
      const status = row.status
      if (!code || !status) return

      const info = infoMap[code]
      if (!info) return

      const existing = merged[code]
      if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing.status]) {
        merged[code] = {
          code,
          name: info.name,
          continent: info.continent,
          status,
          hasCity: true,
          manualId: existing?.manualId || null,
        }
      } else {
        existing.hasCity = true
      }
    })

    ;(manualData || []).forEach((row: any) => {
      const code = row.country_code
      const status = row.status
      if (!code || !status) return

      const info = infoMap[code]
      if (!info) return

      const existing = merged[code]
      if (!existing) {
        merged[code] = {
          code,
          name: info.name,
          continent: info.continent,
          status,
          hasCity: false,
          manualId: row.id,
        }
      } else {
        existing.manualId = row.id
        if (STATUS_PRIORITY[status] > STATUS_PRIORITY[existing.status]) {
          existing.status = status
        }
      }
    })

    setEntries(Object.values(merged))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [router])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')

    if (!selectedPlace) {
      setAddError('Please select a country from the search results.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase.from('user_countries').upsert(
      {
        user_id: session.user.id,
        country_code: selectedPlace.code,
        status: statusInput,
        place_type: selectedPlace.place_type,
      },
      { onConflict: 'user_id,country_code' }
    )

    if (error) {
      setAddError(error.message)
      return
    }

    setSelectedPlace(null)
    setStatusInput('visited')
    load()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await supabase.from('user_countries').delete().eq('id', pendingDelete)
    setPendingDelete(null)
    load()
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  const continents = Array.from(new Set(entries.map((e) => e.continent))).sort()

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove"
        message="Are you sure you want to remove this from your map?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <a
        href="/map"
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
        Back to map
      </a>

      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Manage countries</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Add or remove countries on your map
      </p>

      <form
        onSubmit={handleAdd}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
          background: 'var(--surface)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          borderRadius: '16px',
          padding: '1.2rem',
          marginBottom: '2rem',
        }}
      >
        <CountrySearch onSelect={setSelectedPlace} placeholder="Search for a country" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { value: 'visited', label: 'Visited' },
            { value: 'lived', label: 'Lived there' },
            { value: 'want_to_go', label: 'Want to go' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusInput(opt.value)}
              style={{
                flex: 1,
                background: statusInput === opt.value ? 'var(--accent)' : 'var(--bg)',
                color: statusInput === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                padding: '0.5rem',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {addError && <p style={{ color: '#D1453B', fontSize: '0.82rem', margin: 0 }}>{addError}</p>}
        <button type="submit">Add</button>
      </form>

      {continents.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nothing added yet.</p>
      ) : (
        continents.map((continent) => (
          <div key={continent} style={{ marginBottom: '1.8rem' }}>
            <h2
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.7rem',
              }}
            >
              {continent}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {entries
                .filter((e) => e.continent === continent)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((entry) => (
                  <div
                    key={entry.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--surface)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      borderRadius: '12px',
                      padding: '0.7rem 1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: STATUS_COLOR[entry.status],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '0.9rem' }}>{entry.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {STATUS_LABEL[entry.status]}
                      </span>
                    </div>

                    {!entry.hasCity && entry.manualId ? (
                      <button
                        onClick={() => setPendingDelete(entry.manualId)}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          padding: '0.2rem',
                          display: 'flex',
                        }}
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
