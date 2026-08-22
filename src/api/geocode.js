import { CZ_BBOX, CZ_CENTER } from '../geo/czech'

export class GeocodeError extends Error {
  constructor(message) {
    super(message)
    this.name = 'GeocodeError'
  }
}

function photonUrl() {
  return 'https://photon.komoot.io/api/'
}

export function formatPlaceLabel(properties = {}) {
  const city = properties.city || properties.town || properties.village || properties.district
  const street = [properties.street, properties.housenumber].filter(Boolean).join(' ')
  const name = properties.name
  const line = street && name && name !== properties.street ? `${name}, ${street}` : name || street
  return [line, city && city !== line ? city : null].filter(Boolean).join(', ') || 'Vybrané místo'
}

export async function searchCzechPlaces(query, { signal } = {}) {
  const q = query.trim()
  if (q.length < 3) return []

  const params = new URLSearchParams({
    q,
    limit: '6',
    bbox: CZ_BBOX,
    lat: String(CZ_CENTER[0]),
    lon: String(CZ_CENTER[1]),
  })

  const response = await fetch(`${photonUrl()}?${params}`, { signal })
  if (!response.ok) {
    throw new GeocodeError('Adresy se teď nepodařilo načíst.')
  }

  const payload = await response.json()
  const seen = new Set()
  const places = []

  for (const feature of payload.features ?? []) {
    const [lng, lat] = feature.geometry?.coordinates ?? []
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    const label = formatPlaceLabel(feature.properties)
    const key = `${label}:${lat.toFixed(5)},${lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    places.push({
      id: feature.properties?.osm_id ? `${feature.properties.osm_type}-${feature.properties.osm_id}` : key,
      label,
      lat,
      lng,
    })
  }

  return places
}
