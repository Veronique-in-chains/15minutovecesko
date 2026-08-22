import { bboxOfGeoJson, pointInGeoJson } from '../geo/polygon'

export class PoiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PoiError'
  }
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

function classifyTags(tags = {}) {
  const amenity = tags.amenity
  const leisure = tags.leisure
  const landuse = tags.landuse
  const railway = tags.railway
  const highway = tags.highway
  const publicTransport = tags.public_transport

  if (amenity === 'school' || amenity === 'kindergarten' || amenity === 'college' || amenity === 'university') {
    return 'schools'
  }
  if (amenity === 'hospital' || amenity === 'clinic' || amenity === 'doctors' || amenity === 'pharmacy') {
    return 'health'
  }
  if (
    amenity === 'restaurant' ||
    amenity === 'cafe' ||
    amenity === 'fast_food' ||
    amenity === 'pub' ||
    amenity === 'bar' ||
    amenity === 'bakery'
  ) {
    return 'gastro'
  }
  if (
    highway === 'bus_stop' ||
    railway === 'station' ||
    railway === 'halt' ||
    railway === 'tram_stop' ||
    publicTransport === 'station'
  ) {
    return 'transit'
  }
  if (leisure === 'park' || leisure === 'garden' || leisure === 'playground' || landuse === 'recreation_ground') {
    return 'green'
  }
  return null
}

function elementLatLng(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lng: element.lon }
  }
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon }
  }
  return null
}

function buildQuery(bbox) {
  const box = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`
  return `
[out:json][timeout:40];
(
  node["amenity"~"^(school|kindergarten|college|university|hospital|clinic|doctors|pharmacy|restaurant|cafe|fast_food|pub|bar|bakery)$"](${box});
  way["amenity"~"^(school|kindergarten|college|university|hospital|clinic|pharmacy)$"](${box});
  node["highway"="bus_stop"](${box});
  node["railway"~"^(station|tram_stop|halt)$"](${box});
  way["leisure"~"^(park|garden|playground)$"](${box});
  node["leisure"="playground"](${box});
  way["landuse"="recreation_ground"](${box});
);
out center;
`.trim()
}

async function fetchOverpassJson(query, { signal } = {}) {
  let lastStatus = 0

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, { signal })
      lastStatus = response.status
      if (response.status === 429 || response.status === 502 || response.status === 504) continue
      if (!response.ok) continue
      return response.json()
    } catch (err) {
      if (err.name === 'AbortError') throw err
    }
  }

  if (lastStatus === 429) {
    throw new PoiError('OpenStreetMap je právě přetížený. Zkuste to za chvíli znovu.')
  }
  throw new PoiError('OpenStreetMap právě nevrátil body zájmu. Zkuste to znovu.')
}

export async function fetchPoisInIsochrone(geoJson, { signal } = {}) {
  const bbox = bboxOfGeoJson(geoJson)
  if (!bbox) {
    throw new PoiError('Isochrona nemá platný tvar pro hledání míst.')
  }

  const payload = await fetchOverpassJson(buildQuery(bbox), { signal })
  const seen = new Set()
  const pois = []

  for (const element of payload.elements ?? []) {
    const coords = elementLatLng(element)
    if (!coords) continue
    const category = classifyTags(element.tags)
    if (!category) continue
    if (!pointInGeoJson(coords.lng, coords.lat, geoJson)) continue

    const key = `${category}:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)

    pois.push({
      id: `${element.type}/${element.id}`,
      name: element.tags?.name || null,
      category,
      lat: coords.lat,
      lng: coords.lng,
    })
  }

  return pois
}
