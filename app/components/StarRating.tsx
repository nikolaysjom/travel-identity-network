'use client'

import { Star } from 'lucide-react'

type StarInputProps = {
  value: number | null
  onChange: (value: number) => void
}

export function StarInput({ value, onChange }: StarInputProps) {
  return (
    <div style={{ display: 'flex', gap: '0.3rem' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            background: 'transparent',
            padding: '0.2rem',
            display: 'flex',
          }}
        >
          <Star
            size={26}
            strokeWidth={1.5}
            color="var(--accent-secondary)"
            fill={value !== null && n <= value ? 'var(--accent-secondary)' : 'transparent'}
          />
        </button>
      ))}
    </div>
  )
}

type StarDisplayProps = {
  value: number
  size?: number
}

export function StarDisplay({ value, size = 14 }: StarDisplayProps) {
  return (
    <div style={{ display: 'flex', gap: '0.1rem' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          color="var(--accent-secondary)"
          fill={n <= value ? 'var(--accent-secondary)' : 'transparent'}
        />
      ))}
    </div>
  )
}
