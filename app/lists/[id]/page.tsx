'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ConfirmDialog from '@/app/components/ConfirmDialog'
import CitySearch, { CitySearchResult } from '@/app/components/CitySearch'
import { Pencil, Check, GripVertical, X, ArrowLeft, Link2, ChevronUp, ChevronDown } from 'lucide-react'

type Destination = {
  id: string
  city_name: string
  country_name: string
}

type ListDestination = {
  id: string
  position: number
  note: string | null
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
  const [selectedCity, setSelectedCity] = useState<CitySearchResult | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [linkCopied, setLinkCopied] = useState(false)

  const loadData = async () => {
    const { data: listData } = await supabase
      .from('lists')
      .select('title, description')
      .eq('id', listId)
      .single()
    setList(listData)
    setTitleDraft(listData?.title || '')
    setDescriptionDraft(listData?.description || '')

    const { data: itemsData } = await supabase
      .from('list_destinations')
      .select('id, position, note, destinations(id, city_name, country_name)')
      .eq('list_id', listId)
      .order('position')

    const loadedItems = (itemsData as unknown as ListDestination[]) || []
    setItems(loadedItems)

    const notes: Record<string, string> = {}
    loadedItems.forEach((item) => {
      notes[item.id] = item.note || ''
    })
    setNoteDrafts(notes)
  }

  useEffect(() => {
    loadData()
  }, [listId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedCity) {
      setError('Please select a city from the search results.')
      return
    }

    setAdding(true)

    const { data: existing } = await supabase
      .from('destinations')
      .select('id')
      .ilike('city_name', selectedCity.city_name)
      .ilike('country_name', selectedCity.country_name)
      .maybeSingle()

    let destinationId = existing?.id

    if (!destinationId) {
      const { data: countryMatch } = await supabase
        .from('countries')
        .select('code')
        .ilike('name', selectedCity.country_name)
        .maybeSingle()

      const { data: newDestination, error: insertDestError } = await supabase
        .from('destinations')
        .insert({
          city_name: selectedCity.city_name,
          country_name: selectedCity.country_name,
          country_code: countryMatch?.code || null,
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
        })
        .select()
        .single()

      if (insertDestError) {
        setError(insertDestError.message)
        setAdding(false)
        return
      }

      destinationId = newDestination.id
    }

    await supabase.from('list_destinations').insert({
      list_id: listId,
      destination_id: destinationId,
      position: items.length,
    })

    setSelectedCity(null)
    setAdding(false)
    loadData()
  }

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from('list_destinations').delete().eq('id', itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  const handleNoteChange = (itemId: string, value: string) => {
    setNoteDrafts((prev) => ({ ...prev, [itemId]: value }))
  }

  const handleSaveDetails = async () => {
    await supabase
      .from('lists')
      .update({ title: titleDraft, description: descriptionDraft || null })
      .eq('id', listId)

    // Save any note changes too
    await Promise.all(
      items.map((item) =>
        supabase
          .from('list_destinations')
          .update({ note: noteDrafts[item.id] || null })
          .eq('id', item.id)
      )
    )

    setList({ title: titleDraft, description: descriptionDraft || null })
    setItems((prev) => prev.map((item) => ({ ...item, note: noteDrafts[item.id] || null })))
    setIsEditing(false)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return

    const reordered = [...items]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp
    setItems(reordered)

    await supabase.from('list_destinations').update({ position: targetIndex }).eq('id', temp.id)
    await supabase
      .from('list_destinations')
      .update({ position: index })
      .eq('id', reordered[index].id)
  }

  const confirmDeleteList = async () => {
    await supabase.from('lists').delete().eq('id', listId)
    window.location.href = '/profile'
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const reordered = [...items]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, moved)
    setItems(reordered)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    setDraggedIndex(null)
    await Promise.all(
      items.map((item, index) =>
        supabase.from('list_destinations').update({ position: index }).eq('id', item.id)
      )
    )
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
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete list"
        message="Are you sure you want to delete this list?"
        onConfirm={confirmDeleteList}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <a
          href="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Back to profile
        </a>

        <button
          onClick={handleCopyLink}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            color: linkCopied ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            padding: '0.3rem 0.5rem',
          }}
        >
          <Link2 size={14} strokeWidth={2} />
          {linkCopied ? 'Link copied!' : 'Copy link'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
        }}
      >
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                style={{ fontSize: '1.3rem', fontWeight: 700, width: '100%', marginBottom: '0.6rem' }}
              />
              <textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                style={{ width: '100%', resize: 'vertical', fontSize: '0.9rem' }}
              />
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.6rem', margin: 0 }}>{list.title}</h1>
              {list.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                  {list.description}
                </p>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => (isEditing ? handleSaveDetails() : setIsEditing(true))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: isEditing ? 'var(--accent)' : 'var(--surface)',
            color: isEditing ? 'var(--bg)' : 'var(--text-primary)',
            border: '1px solid var(--border)',
            padding: '0.5rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            marginLeft: '0.8rem',
            flexShrink: 0,
          }}
        >
          {isEditing ? <Check size={16} strokeWidth={2} /> : <Pencil size={16} strokeWidth={2} />}
          {isEditing ? 'Done' : 'Edit'}
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
              draggable={isEditing}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '0.9rem 1.1rem',
                opacity: draggedIndex === index ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', cursor: isEditing ? 'grab' : 'default' }}>
                {isEditing && (
                  <>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>
                      <GripVertical size={16} strokeWidth={2} />
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
                      <button
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0}
                        style={{
                          background: 'transparent',
                          color: index === 0 ? 'var(--border)' : 'var(--text-secondary)',
                          padding: '0.05rem',
                          display: 'flex',
                        }}
                      >
                        <ChevronUp size={14} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleMove(index, 1)}
                        disabled={index === items.length - 1}
                        style={{
                          background: 'transparent',
                          color: index === items.length - 1 ? 'var(--border)' : 'var(--text-secondary)',
                          padding: '0.05rem',
                          display: 'flex',
                        }}
                      >
                        <ChevronDown size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </>
                )}
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem' }}>{item.destinations?.city_name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {item.destinations?.country_name}
                  </div>
                  {!isEditing && item.note && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.4rem', marginBottom: 0 }}>
                      {item.note}
                    </p>
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      padding: '0.2rem',
                      display: 'flex',
                    }}
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                )}
              </div>

              {isEditing && (
                <input
                  type="text"
                  value={noteDrafts[item.id] || ''}
                  onChange={(e) => handleNoteChange(item.id, e.target.value)}
                  placeholder="Add a short note (optional)"
                  style={{
                    width: '100%',
                    marginTop: '0.7rem',
                    fontSize: '0.85rem',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <>
          <form
            onSubmit={handleAdd}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <CitySearch onSelect={setSelectedCity} placeholder="Search for a city to add" />
            {error && <p style={{ color: '#E8604C', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={adding}>
              {adding ? 'Adding...' : 'Add to list'}
            </button>
          </form>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'transparent',
              color: '#E8604C',
              fontSize: '0.85rem',
              padding: '0.5rem 0',
              border: 'none',
            }}
          >
            Delete list
          </button>
        </>
      )}
    </div>
  )
}
