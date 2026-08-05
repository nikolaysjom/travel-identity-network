'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Search, PlusCircle, ListPlus, User, LogOut, Map } from 'lucide-react'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const iconStyle = (path: string) => ({
    color: pathname === path ? 'var(--accent)' : 'var(--text-secondary)',
  })

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.1rem 2rem',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 10,
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: '-0.02em',
        }}
      >
        Travel Identity Network
      </Link>

      {isLoggedIn ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
          <Link href="/search" style={iconStyle('/search')} title="Søk">
            <Search size={20} strokeWidth={2} />
          </Link>
          <Link href="/add-city" style={iconStyle('/add-city')} title="Legg til by">
            <PlusCircle size={20} strokeWidth={2} />
          </Link>
          <Link href="/lists/new" style={iconStyle('/lists/new')} title="Ny liste">
            <ListPlus size={20} strokeWidth={2} />
          </Link>
          <Link href="/profile" style={iconStyle('/profile')} title="Min profil">
            <User size={20} strokeWidth={2} />
           <Link href="/map" style={iconStyle('/map')} title="Kart">
            <Map size={20} strokeWidth={2} />
          </Link> 
          </Link>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Logg ut"
          >
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href="/login"
            style={{ color: 'var(--text-secondary)', padding: '0.5rem 0.9rem', fontSize: '0.9rem' }}
          >
            Logg inn
          </Link>
          <Link href="/signup">
            <span
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              Registrer
            </span>
          </Link>
        </div>
      )}
    </nav>
  )
}