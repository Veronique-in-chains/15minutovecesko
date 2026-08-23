import { useState, useEffect } from 'react'
import { POI_CATEGORIES } from '../score'

function scoreTone(total) {
  if (total >= 70) return 'text-emerald-700'
  if (total >= 40) return 'text-amber-700'
  return 'text-rose-700'
}

export default function ScorePanel({ score, loading, empty }) {
  // Stav pro mobilní zobrazení: je panel na mobilu zavřený? (výchozí je ne)
  const [isMobileClosed, setIsMobileClosed] = useState(false)

  // Pokaždé, když se začne načítat nové místo (loading) nebo přijdou nová data (score),
  // panel na mobilu znovu automaticky otevřeme.
  useEffect(() => {
    setIsMobileClosed(false)
  }, [score, loading])

  // Základní CSS třídy pro obal panelu (přidali jsme 'relative' kvůli pozicování křížku)
  // Pokud je panel na mobilu zavřený, přidáme 'hidden md:block' (zmizí na mobilu, na desktopu zůstane).
  const baseClasses = "relative border-t border-gray-200 bg-white p-4 md:w-80 md:overflow-y-auto md:border-t-0 md:border-l"
  const visibilityClass = isMobileClosed ? "hidden md:block" : "block"

  if (loading) {
    return (
      <aside className={`${baseClasses} ${visibilityClass}`}>
        <p className="text-sm text-gray-600">Hledám školy, služby a zeleň v dosahu chůze…</p>
      </aside>
    )
  }

  if (empty || !score) {
    return (
      <aside className={`${baseClasses} ${visibilityClass}`}>
        <p className="text-sm text-gray-600">
          Klikněte do mapy. Ukážeme 15minutovou chůzi a skóre občanské vybavenosti.
        </p>
      </aside>
    )
  }

  return (
    <aside className={`${baseClasses} ${visibilityClass}`}>
      
      {/* Zavírací tlačítko - viditelné JEN na mobilu díky třídě 'md:hidden' */}
      <button
        onClick={() => setIsMobileClosed(true)}
        className="md:hidden absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 transition-colors"
        aria-label="Skrýt detaily"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase pr-8 md:pr-0">15minutové skóre</p>
      <p className={`mt-1 text-4xl font-semibold ${scoreTone(score.total)}`}>
        {score.total}
        <span className="ml-1 text-lg font-normal text-gray-400">/ {score.max}</span>
      </p>

      <ul className="mt-4 space-y-3">
        {score.breakdown.map((item) => (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              <span className="text-sm text-gray-600">{item.count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(item.points / item.max) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-gray-500">
        Data: OpenStreetMap. Skóre hodnotí přítomnost {POI_CATEGORIES.length} typů vybavenosti v izochroně.
      </p>
    </aside>
  )
}