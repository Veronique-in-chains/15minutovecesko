import { useEffect } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { CATEGORY_BY_ID } from '../score'
import { CZ_CENTER, DEFAULT_ZOOM } from '../geo/czech'

const originIcon = L.divIcon({
  className: 'origin-marker',
  iconSize: [32, 42],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
  html: `
    <svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true">
      <path
        d="M16 1.5c-7.2 0-13 5.8-13 13 0 9.7 13 25.5 13 25.5S29 24.2 29 14.5c0-7.2-5.8-13-13-13z"
        fill="#0f172a"
        stroke="#fff"
        stroke-width="2.5"
      />
      <circle cx="16" cy="14.5" r="5" fill="#fff" />
    </svg>
  `,
})

const ISOCHRONE_STYLE = {
  color: '#2563eb',
  weight: 2,
  fillColor: '#3b82f6',
  fillOpacity: 0.22,
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng)
    },
  })
  return null
}

function FitIsochrone({ geoJson }) {
  const map = useMap()

  useEffect(() => {
    if (!geoJson) return
    const layer = L.geoJSON(geoJson)
    const bounds = layer.getBounds()
    if (!bounds.isValid()) return
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 })
  }, [geoJson, map])

  return null
}

function PoiMarker({ poi }) {
  const category = CATEGORY_BY_ID[poi.category]
  if (!category) return null

  return (
    <CircleMarker
      center={[poi.lat, poi.lng]}
      radius={6}
      pathOptions={{
        color: '#ffffff',
        weight: 1,
        fillColor: category.color,
        fillOpacity: 0.95,
      }}
      eventHandlers={{
        click(event) {
          L.DomEvent.stopPropagation(event)
        },
      }}
    >
      <Popup>
        <p className="m-0 font-medium">{poi.name || category.label}</p>
        <p className="m-0 text-xs text-gray-600">{category.label}</p>
      </Popup>
    </CircleMarker>
  )
}

export default function Map({
  geoJson = null,
  origin = null,
  pois = [],
  onMapClick,
  center = CZ_CENTER,
  zoom = DEFAULT_ZOOM,
}) {
  const geoJsonKey = origin ? `${origin.lat},${origin.lng}` : 'isochrone'

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="z-0 h-full w-full cursor-crosshair"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {geoJson && (
        <>
          <GeoJSON key={geoJsonKey} data={geoJson} style={ISOCHRONE_STYLE} />
          <FitIsochrone geoJson={geoJson} />
        </>
      )}

      {pois.map((poi) => (
        <PoiMarker key={poi.id} poi={poi} />
      ))}

      {origin && (
        <Marker
          position={[origin.lat, origin.lng]}
          icon={originIcon}
          zIndexOffset={1000}
          eventHandlers={{
            click(event) {
              L.DomEvent.stopPropagation(event)
            },
          }}
        >
          <Popup>
            <p className="m-0 font-medium">Vybrané místo</p>
            <p className="m-0 text-xs text-gray-600">Výchozí bod 15minutové chůze</p>
          </Popup>
        </Marker>
      )}

      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
    </MapContainer>
  )
}
