'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export type CountryStatusMap = Record<string, 'visited' | 'lived' | 'want_to_go'>

export type MapCity = {
  id: string
  city_name: string
  status: 'visited' | 'lived' | 'want_to_go'
  latitude: number
  longitude: number
}

type WorldMapProps = {
  countryStatus: CountryStatusMap
  cities?: MapCity[]
  height?: string
  interactive?: boolean
}

const STATUS_COLOR: Record<string, string> = {
  visited: '#2DD4BF',
  lived: '#F2C94C',
  want_to_go: '#4A5056',
}

const STATUS_LABEL: Record<string, string> = {
  visited: 'Visited',
  lived: 'Lived there',
  want_to_go: 'Want to go',
}

export default function WorldMap({
  countryStatus,
  cities = [],
  height = '420px',
  interactive = true,
}: WorldMapProps) {
  const [geoData, setGeoData] = useState<any>(null)

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then((res) => res.json())
      .then(setGeoData)
      .catch(() => setGeoData(null))
  }, [])

  const styleFeature = (feature: any) => {
    const code = feature?.id
    const status = code ? countryStatus[code] : undefined

    if (!status) {
      // No relationship to this country - stay fully transparent,
      // don't obscure the base map at all.
      return {
        fillOpacity: 0,
        weight: 0,
      }
    }

    return {
      fillColor: STATUS_COLOR[status],
      fillOpacity: 0.12,
      color: STATUS_COLOR[status],
      weight: 1.6,
      opacity: 0.9,
    }
  }

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
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        {geoData && <GeoJSON data={geoData} style={styleFeature} />}

        {cities.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.latitude, c.longitude]}
            radius={5}
            pathOptions={{
              color: STATUS_COLOR[c.status],
              fillColor: STATUS_COLOR[c.status],
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          >
            {interactive && (
              <Popup>
                <strong>{c.city_name}</strong>
                <br />
                {STATUS_LABEL[c.status]}
              </Popup>
            )}
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
