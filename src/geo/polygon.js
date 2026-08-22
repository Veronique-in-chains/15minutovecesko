/** GeoJSON coordinates are [lng, lat]. */

function walkGeometry(geoJson, visit) {
  if (!geoJson) return
  if (geoJson.type === 'FeatureCollection') {
    geoJson.features?.forEach((feature) => walkGeometry(feature, visit))
    return
  }
  if (geoJson.type === 'Feature') {
    walkGeometry(geoJson.geometry, visit)
    return
  }
  if (geoJson.type === 'Polygon') visit(geoJson.coordinates)
  if (geoJson.type === 'MultiPolygon') {
    geoJson.coordinates?.forEach((polygon) => visit(polygon))
  }
}

function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function extractPolygons(geoJson) {
  const polygons = []
  walkGeometry(geoJson, (rings) => {
    if (rings?.length) polygons.push(rings)
  })
  return polygons
}

export function bboxOfGeoJson(geoJson) {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const rings of extractPolygons(geoJson)) {
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        minLng = Math.min(minLng, lng)
        minLat = Math.min(minLat, lat)
        maxLng = Math.max(maxLng, lng)
        maxLat = Math.max(maxLat, lat)
      }
    }
  }

  if (!Number.isFinite(minLng)) return null
  return { minLat, minLng, maxLat, maxLng }
}

export function pointInGeoJson(lng, lat, geoJson) {
  return extractPolygons(geoJson).some((rings) => {
    if (!pointInRing(lng, lat, rings[0])) return false
    for (let i = 1; i < rings.length; i += 1) {
      if (pointInRing(lng, lat, rings[i])) return false
    }
    return true
  })
}
