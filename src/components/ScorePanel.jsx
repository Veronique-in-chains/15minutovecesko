import { POI_CATEGORIES } from '../score'

function scoreTone(total) {
  if (total >= 70) return 'text-emerald-700'
  if (total >= 40) return 'text-amber-700'
  return 'text-rose-700'
}

export default function ScorePanel({ score, loading, empty }) {
  if (loading) {
    return (
      <aside className="border-t border-gray-200 bg-white p-4 md:w-80 md:overflow-y-auto md:border-t-0 md:border-l">
        <p className="text-sm text-gray-600">Hledám školy, služby a zeleň v dosahu chůze…</p>
      </aside>
    )
  }

  if (empty || !score) {
    return (
      <aside className="border-t border-gray-200 bg-white p-4 md:w-80 md:overflow-y-auto md:border-t-0 md:border-l">
        <p className="text-sm text-gray-600">
          Klikněte do mapy. Ukážeme 15minutovou chůzi a skóre občanské vybavenosti.
        </p>
      </aside>
    )
  }

  return (
    <aside className="border-t border-gray-200 bg-white p-4 md:w-80 md:overflow-y-auto md:border-t-0 md:border-l">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">15minutové skóre</p>
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
                className="h-full rounded-full"
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
