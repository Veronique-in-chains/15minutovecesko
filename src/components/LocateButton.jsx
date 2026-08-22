import { useState } from 'react'

function messageForGeoError(error) {
  if (!window.isSecureContext) {
    return 'Polohu lze použít jen na localhost nebo přes HTTPS.'
  }
  if (!error) return 'Polohu se nepodařilo zjistit.'
  if (error.code === error.PERMISSION_DENIED) {
    return 'Přístup k poloze je zablokovaný. Povolte ho v prohlížeči.'
  }
  if (error.code === error.TIMEOUT) {
    return 'Zjištění polohy trvalo moc dlouho. Zkuste to znovu.'
  }
  return 'Polohu se nepodařilo zjistit. Zkuste adresu nebo kliknutí do mapy.'
}

export default function LocateButton({ onLocated, onError }) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    if (!navigator.geolocation) {
      onError?.('Tento prohlížeč nezjišťuje polohu.')
      return
    }
    if (!window.isSecureContext) {
      onError?.(messageForGeoError())
      return
    }

    setLoading(true)
    onError?.(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false)
        onLocated?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        setLoading(false)
        onError?.(messageForGeoError(error))
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30_000,
      },
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Použít moji polohu"
      aria-label="Použít moji polohu"
      className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    </button>
  )
}
