export const WALK_MINUTES = 15
export const WALK_SECONDS = WALK_MINUTES * 60

export class IsochroneError extends Error {
  constructor(message) {
    super(message)
    this.name = 'IsochroneError'
  }
}

function stadiaUrl() {
  // Stadia Maps nemá CORS problémy jako ORS, takže můžeme sahat přímo na jejich API
  return 'https://api.stadiamaps.com/isochrone/v1'
}

function messageForStatus(status, serverMessage) {
  if (status === 401 || status === 403) {
    return 'Neplatný nebo chybějící klíč Stadia Maps (VITE_STADIA_API_KEY).'
  }
  if (status === 429) {
    return 'Stadia Maps právě odmítá další požadavky (vyčerpán limit). Zkuste to za chvíli.'
  }
  return serverMessage || `Isochronu se nepodařilo načíst (HTTP ${status}).`
}

export async function fetchWalkIsochrone({ lat, lng }, { signal } = {}) {
  const apiKey = import.meta.env.VITE_STADIA_API_KEY?.trim()
  if (!apiKey) {
    throw new IsochroneError(
      'Chybí klíč Stadia Maps. Přidejte VITE_STADIA_API_KEY do souboru .env.local a restartujte dev server.',
    )
  }

  const response = await fetch(`${stadiaUrl()}?api_key=${apiKey}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, application/geo+json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      locations: [
        { lat: lat, lon: lng }
      ],
      costing: 'pedestrian',
      costing_options: {
        pedestrian: {
          walking_speed: 4, // Reálnější lidské tempo (km/h)
          use_hills: 0.2      // Větší důraz na zohlednění kopců a terénu
        }
      },
      contours: [
        { time: WALK_MINUTES }
      ],
      polygons: true,
    }),
    signal,
  })

  if (!response.ok) {
    let serverMessage = ''
    try {
      const payload = await response.json()
      serverMessage = payload?.error?.message || payload?.error || ''
      if (typeof serverMessage !== 'string') serverMessage = JSON.stringify(serverMessage)
    } catch {
      // ignore non-JSON error bodies
    }
    throw new IsochroneError(messageForStatus(response.status, serverMessage))
  }

  return response.json()
}