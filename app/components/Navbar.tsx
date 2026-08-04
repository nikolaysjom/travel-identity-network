'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

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

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #ddd' }}>
      <Link href="/" style={{ fontWeight: 'bold' }}>Travel Identity Network</Link>
      <div style={{ display: 'flex', gap: '1rem' }}>
   {isLoggedIn ? (
  <>
    <Link href="/lists/new">Ny liste</Link>
    <Link href="/add-city">Legg til by</Link>
    <Link href="/profile">Min profil</Link>
    <button onClick={handleLogout}>Logg ut</button>
  </>
) : (
          <>
            <Link href="/login">Logg inn</Link>
            <Link href="/signup">Registrer</Link>
          </>
        )}
      </div>
    </nav>
  )
}