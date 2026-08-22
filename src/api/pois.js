import { bboxOfGeoJson, pointInGeoJson } from '../geo/polygon'

export class PoiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PoiError'
  }
}

function overpassUrl() {
  return import.meta.env.DEV ? '/api/overpass' : 'https://overpass-api.de/api/interpreter'
}

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
    publicTransport === 'stop_position' ||
    publicTransport === 'platform'
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
[out:json][timeout:25];
(
  nwr["amenity"~"^(school|kindergarten|college|university)$"](${box});
  nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](${box});
  nwr["amenity"~"^(restaurant|cafe|fast_food|pub|bar|bakery)$"](${box});
  nwr["highway"="bus_stop"](${box});
  nwr["railway"~"^(station|tram_stop|halt)$"](${box});
  nwr["public_transport"~"^(stop_position|platform)$"](${box});
  nwr["leisure"~"^(park|garden|playground)$"](${box});
  nwr["landuse"="recreation_ground"](${box});
);
out center;
`.trim()
}

export async function fetchPoisInIsochrone(geoJson, { signal } = {}) {
  const bbox = bboxOfGeoJson(geoJson)
  if (!bbox) {
    throw new PoiError('Isochrona nemá platný tvar pro hledání míst.')
  }

  const response = await fetch(overpassUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ data: buildQuery(bbox) }),
    signal,
  })

  if (!response.ok) {
    throw new PoiError('OpenStreetMap právě nevrátil body zájmu. Zkuste to znovu.')
  }

  const payload = await response.json()
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
