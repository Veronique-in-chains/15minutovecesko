import { useRef, useState } from 'react'
import AddressSearch from './components/AddressSearch'
import LocateButton from './components/LocateButton'
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

  const runAnalysis = async (latlng) => {
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
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">15minutové Česko</h1>
            <p className="text-sm text-gray-600">
              Vyhledejte adresu, použijte polohu nebo klikněte do mapy
            </p>
          </div>
          <div className="flex w-full items-start gap-2 md:max-w-lg">
            <AddressSearch onSelect={runAnalysis} />
            <LocateButton onLocated={runAnalysis} onError={setError} />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="relative min-h-0 min-w-0 flex-1">
          <Map
            origin={selectedPoint}
            geoJson={isochrone}
            pois={pois}
            onMapClick={runAnalysis}
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
