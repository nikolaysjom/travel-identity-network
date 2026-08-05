'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Search, User, LogOut, Map } from 'lucide-react'

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
          <Link href="/search" style={iconStyle('/search')} title="Search">
            <Search size={20} strokeWidth={2} />
          </Link>
          <Link href="/map" style={iconStyle('/map')} title="Map">
            <Map size={20} strokeWidth={2} />
          </Link>
          <Link href="/profile" style={iconStyle('/profile')} title="Profile">
            <User size={20} strokeWidth={2} />
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
            title="Log out"
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
            Log in
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
              Sign up
            </span>
          </Link>
        </div>
      )}
    </nav>
  )
}
