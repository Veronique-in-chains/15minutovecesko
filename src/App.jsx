import { useRef, useState } from 'react'
import Map from './components/Map'
import ScorePanel from './components/ScorePanel'
import { fetchWalkIsochrone, WALK_MINUTES } from './api/isochrone'
import { fetchPoisInIsochrone } from './api/pois'
import { computeWalkScore } from './score'

function App() {
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [isochrone, setIsochrone] = useState(null)
  const [pois, setPois] = useState([])
  const [score, setScore] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const handleMapClick = async (latlng) => {
    const point = { lat: latlng.lat, lng: latlng.lng }
    setSelectedPoint(point)
    setIsochrone(null)
    setPois([])
    setScore(null)
    setError(null)
    setPhase('isochrone')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const geoJson = await fetchWalkIsochrone(point, { signal: controller.signal })
      setIsochrone(geoJson)
      setPhase('pois')

      try {
        const nextPois = await fetchPoisInIsochrone(geoJson, { signal: controller.signal })
        setPois(nextPois)
        setScore(computeWalkScore(nextPois))
        setPhase('idle')
      } catch (poiErr) {
        if (poiErr.name === 'AbortError') return
        setPois([])
        setScore(computeWalkScore([]))
        setError(poiErr.message || 'Body zájmu se nepodařilo načíst.')
        setPhase('idle')
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Analýzu se nepodařilo dokončit.')
      setPhase('idle')
    }
  }

  const loadingMessage =
    phase === 'isochrone'
      ? `Počítám ${WALK_MINUTES}minutovou chůzi…`
      : phase === 'pois'
        ? 'Hledám školy, služby a zeleň…'
        : null

  return (
    <div className="flex h-svh flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">15minutové Česko</h1>
        <p className="text-sm text-gray-600">
          Klikněte do mapy pro izochronu {WALK_MINUTES} minut chůze a skóre vybavenosti
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="relative min-h-0 min-w-0 flex-1">
          <Map
            origin={selectedPoint}
            geoJson={isochrone}
            pois={pois}
            onMapClick={handleMapClick}
          />

          {(loadingMessage || error) && (
            <div className="pointer-events-none absolute top-4 left-1/2 z-10 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2">
              <div
                className={`rounded-lg px-4 py-2 text-center text-sm shadow-md ${
                  error ? 'bg-red-50 text-red-800' : 'bg-white text-gray-700'
                }`}
              >
                {error ?? loadingMessage}
              </div>
            </div>
          )}
        </main>

        <ScorePanel
          score={score}
          loading={phase === 'isochrone' || phase === 'pois'}
          empty={!score}
        />
      </div>
    </div>
  )
}

export default App
