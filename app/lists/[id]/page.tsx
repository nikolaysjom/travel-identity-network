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
    const confirmed = confirm('Er du sikker på at du vil slette hele listen?')
    if (!confirmed) return

    await supabase.from('lists').delete().eq('id', listId)
    window.location.href = '/profile'
  }

  if (!list) return <div style={{ padding: '2rem' }}>Laster...</div>

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '1rem' }}>
      <h1>{list.title}</h1>
      <p>{list.description}</p>

      <button onClick={handleDeleteList} style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
        Slett liste
      </button>

      <ol>
        {items.map((item) => (
          <li key={item.id}>
            {item.destinations?.city_name}, {item.destinations?.country_name}
          </li>
        ))}
      </ol>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Velg en by</option>
          {allDestinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.city_name}, {d.country_name}
            </option>
          ))}
        </select>
        <button type="submit">Legg til i listen</button>
      </form>
    </div>
  )
}