'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Compass, Map, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const iconStyle = (path: string) => ({
    color: pathname === path ? 'var(--accent)' : 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.2rem',
  })

  return (
    <nav className="tin-bottom-nav">
      <Link href="/search" style={iconStyle('/search')}>
        <Search size={22} strokeWidth={2} />
      </Link>
      <Link href="/cities" style={iconStyle('/cities')}>
        <Compass size={22} strokeWidth={2} />
      </Link>
      <Link href="/map" style={iconStyle('/map')}>
        <Map size={22} strokeWidth={2} />
      </Link>
      <Link href="/profile" style={iconStyle('/profile')}>
        <User size={22} strokeWidth={2} />
      </Link>
    </nav>
  )
}
