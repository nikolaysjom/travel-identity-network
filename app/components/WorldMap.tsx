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
  territoryStatus?: CountryStatusMap
  cities?: MapCity[]
  height?: string
  interactive?: boolean
  center?: [number, number]
  zoom?: number
}

const STATUS_COLOR: Record<string, string> = {
  visited: '#2E9B63',
  lived: '#E8A33D',
  want_to_go: '#5B7A99',
}

const STATUS_LABEL: Record<string, string> = {
  visited: 'Visited',
  lived: 'Lived there',
  want_to_go: 'Want to go',
}

export default function WorldMap({
  countryStatus,
  territoryStatus = {},
  cities = [],
  height = '420px',
  interactive = true,
  center,
  zoom,
}: WorldMapProps) {
  const [geoData, setGeoData] = useState<any>(null)

  useEffect(() => {
    fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_subunits.geojson'
    )
      .then((res) => res.json())
      .then(setGeoData)
      .catch(() => setGeoData(null))
  }, [])

  // A subunit is treated as the country's "main" territory only when its
  // own name matches the overall admin name - this excludes named outlying
  const getValidCode = (value: any) => (value && value !== '-99' ? value : null)

  const styleFeature = (feature: any) => {
    const iso = getValidCode(feature?.properties?.ISO_A3 || feature?.properties?.iso_a3)
    const adm0 = getValidCode(feature?.properties?.ADM0_A3 || feature?.properties?.adm0_a3)
    const su = getValidCode(feature?.properties?.SU_A3 || feature?.properties?.su_a3)

    // Territory entries (specific islands etc) match on the feature's own
    // ISO code if it has one, otherwise its unique subunit code - this lets
    // us color just that one place, distinct from its parent country.
    const territoryCode = iso || su
    const territoryMatch = territoryCode ? territoryStatus[territoryCode] : undefined
    if (territoryMatch) {
      return {
        fillColor: STATUS_COLOR[territoryMatch],
        fillOpacity: 0.18,
        color: STATUS_COLOR[territoryMatch],
        weight: 1.8,
        opacity: 0.9,
      }
    }

    // Country entries color every feature that shares the country's code -
    // consistently across all countries, including island nations made up
    // of many separate landmasses (Japan, Indonesia, Philippines, etc).
    const countryCode = iso || adm0
    const status = countryCode ? countryStatus[countryCode] : undefined
    if (!status) {
      return {
        fillOpacity: 0,
        weight: 0,
      }
    }

    return {
      fillColor: STATUS_COLOR[status],
      fillOpacity: 0.18,
      color: STATUS_COLOR[status],
      weight: 1.8,
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
        position: 'relative',
        isolation: 'isolate',
        zIndex: 0,
      }}
    >
      <MapContainer
        center={center || [20, 10]}
        zoom={zoom ?? (interactive ? 3 : 2)}
        minZoom={interactive ? 3 : 1}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', background: '#F7F7F7' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          noWrap={true}
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
