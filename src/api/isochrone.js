export const WALK_MINUTES = 15
export const WALK_SECONDS = WALK_MINUTES * 60

const ORS_ISOCHRONE_PATH = '/v2/isochrones/foot-walking'

export class IsochroneError extends Error {
  constructor(message) {
    super(message)
    this.name = 'IsochroneError'
  }
}

function orsUrl() {
  return import.meta.env.DEV
    ? `/api/ors${ORS_ISOCHRONE_PATH}`
    : `https://api.openrouteservice.org${ORS_ISOCHRONE_PATH}`
}

function messageForStatus(status, orsMessage) {
  if (status === 401 || status === 403) {
    return 'Neplatný nebo chybějící klíč OpenRouteService (VITE_ORS_API_KEY).'
  }
  if (status === 429) {
    return 'OpenRouteService právě odmítá další požadavky. Zkuste to za chvíli.'
  }
  if (orsMessage?.toLowerCase().includes('routable') || orsMessage?.includes('2010')) {
    return 'Z tohoto bodu nelze spočítat chůzi po cestách. Klikněte blíže k silnici nebo pěšině.'
  }
  return orsMessage || `Isochronu se nepodařilo načíst (HTTP ${status}).`
}

export async function fetchWalkIsochrone({ lat, lng }, { signal } = {}) {
  const apiKey = import.meta.env.VITE_ORS_API_KEY?.trim()
  if (!apiKey) {
    throw new IsochroneError(
      'Chybí klíč OpenRouteService. Přidejte VITE_ORS_API_KEY do souboru .env.local a restartujte dev server.',
    )
  }

  const response = await fetch(orsUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json, application/geo+json',
      Authorization: apiKey,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      locations: [[lng, lat]],
      range: [WALK_SECONDS],
      range_type: 'time',
      location_type: 'start',
      smoothing: 0.4,
    }),
    signal,
  })

  if (!response.ok) {
    let orsMessage = ''
    try {
      const payload = await response.json()
      orsMessage = payload?.error?.message || payload?.error || ''
      if (typeof orsMessage !== 'string') orsMessage = JSON.stringify(orsMessage)
    } catch {
      // ignore non-JSON error bodies
    }
    throw new IsochroneError(messageForStatus(response.status, orsMessage))
  }

  return response.json()
}
