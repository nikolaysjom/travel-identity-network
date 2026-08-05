'use client'

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type MapCity = {
  id: string
  status: string
  city_name: string
  country_name: string
  latitude: number | null
  longitude: number | null
}

type WorldMapProps = {
  cities: MapCity[]
  height?: string
  interactive?: boolean
}

const statusColor: Record<string, string> = {
  visited: '#2DD4BF',
  lived: '#F2C94C',
  want_to_go: '#5B6168',
}

const statusLabel: Record<string, string> = {
  visited: 'Besøkt',
  lived: 'Bodd der',
  want_to_go: 'Ønsker å dra',
}

export default function WorldMap({ cities, height = '420px', interactive = true }: WorldMapProps) {
  const withCoords = cities.filter((c) => c.latitude !== null && c.longitude !== null)

  return (
    <div
      style={{
        height,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <MapContainer
        center={[20, 10]}
        zoom={2}
        style={{ height: '100%', width: '100%', background: '#0E1113' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        {withCoords.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.latitude as number, c.longitude as number]}
            radius={7}
            pathOptions={{
              color: statusColor[c.status] || '#2DD4BF',
              fillColor: statusColor[c.status] || '#2DD4BF',
              fillOpacity: 0.85,
              weight: 1,
            }}
          >
            {interactive && (
              <Popup>
                <strong>{c.city_name}</strong>, {c.country_name}
                <br />
                {statusLabel[c.status] || c.status}
              </Popup>
            )}
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
