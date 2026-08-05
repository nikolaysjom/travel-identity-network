'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Destination = {
  id: string
  city_name: string
  country_name: string
}

type ListDestination = {
  id: string
  destinations: Destination | null
}

type ListInfo = {
  title: string
  description: string | null
}

export default function ListPage() {
  const params = useParams()
  const listId = params.id as string

  const [list, setList] = useState<ListInfo | null>(null)
  const [items, setItems] = useState<ListDestination[]>([])
  const [allDestinations, setAllDestinations] = useState<Destination[]>([])
  const [selectedId, setSelectedId] = useState('')

  const loadData = async () => {
    const { data: listData } = await supabase
      .from('lists')
      .select('title, description')
      .eq('id', listId)
      .single()
    setList(listData)

    const { data: itemsData } = await supabase
      .from('list_destinations')
      .select('id, destinations(id, city_name, country_name)')
      .eq('list_id', listId)
      .order('position')
    setItems((itemsData as unknown as ListDestination[]) || [])

    const { data: destData } = await supabase
      .from('destinations')
      .select('id, city_name, country_name')
      .order('city_name')
    setAllDestinations(destData || [])
  }

  useEffect(() => {
    loadData()
  }, [listId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return

    await supabase.from('list_destinations').insert({
      list_id: listId,
      destination_id: selectedId,
      position: items.length,
    })

    setSelectedId('')
    loadData()
  }

  const handleDeleteList = async () => {
    const confirmed = confirm('Are you sure you want to delete this list?')
    if (!confirmed) return

    await supabase.from('lists').delete().eq('id', listId)
    window.location.href = '/profile'
  }

  if (!list) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0 }}>{list.title}</h1>
          {list.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
              {list.description}
            </p>
          )}
        </div>
        <button
          onClick={handleDeleteList}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            padding: '0.4rem 0.7rem',
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          Delete list
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          No cities in this list yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
          {items.map((item, index) => (
            <div
              key={item.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.9rem',
              }}
            >
              <span
                style={{
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-space-grotesk)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  width: '1.5rem',
                }}
              >
                {index + 1}
              </span>
              <div>
                <div style={{ fontSize: '0.95rem' }}>{item.destinations?.city_name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {item.destinations?.country_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        style={{
          display: 'flex',
          gap: '0.7rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '1.5rem',
        }}
      >
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">Choose a city</option>
          {allDestinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.city_name}, {d.country_name}
            </option>
          ))}
        </select>
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
