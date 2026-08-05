'use client'

type AvatarProps = {
  url: string | null
  username: string
  size?: number
}

export function Avatar({ url, username, size = 44 }: AvatarProps) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={username}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          background: 'var(--surface-hover)',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--surface-hover)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
        textTransform: 'uppercase',
      }}
    >
      {username?.charAt(0) || '?'}
    </div>
  )
}

// A fixed set of seeds gives a stable, varied set of preset avatars
// using DiceBear's free illustrated-avatar API (no key required).
const AVATAR_SEEDS = [
  'wanderer', 'nomad', 'voyager', 'explorer',
  'compass', 'atlas', 'horizon', 'summit',
  'harbor', 'meridian', 'odyssey', 'trailblazer',
]

export function getPresetAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundType=gradientLinear`
}

type AvatarPickerProps = {
  onSelect: (url: string) => void
  onClose: () => void
}

export function AvatarPicker({ onSelect, onClose }: AvatarPickerProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '18px',
          padding: '1.5rem',
          maxWidth: 360,
          width: '100%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Choose an avatar</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.7rem',
          }}
        >
          {AVATAR_SEEDS.map((seed) => (
            <button
              key={seed}
              onClick={() => onSelect(getPresetAvatarUrl(seed))}
              style={{
                background: 'transparent',
                padding: 0,
                border: 'none',
                borderRadius: '50%',
                overflow: 'hidden',
              }}
              title={seed}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPresetAvatarUrl(seed)}
                alt={seed}
                width={64}
                height={64}
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '50%' }}
              />
            </button>
          ))}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '1rem', marginBottom: 0 }}>
          Custom photo uploads are coming soon.
        </p>
      </div>
    </div>
  )
}
