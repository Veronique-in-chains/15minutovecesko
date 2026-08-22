export const POI_CATEGORIES = [
  {
    id: 'schools',
    label: 'Školy',
    color: '#ca8a04',
    description: 'Mateřské, základní a střední školy',
  },
  {
    id: 'health',
    label: 'Zdravotnictví',
    color: '#dc2626',
    description: 'Lékaři, nemocnice a lékárny',
  },
  {
    id: 'gastro',
    label: 'Gastro',
    color: '#ea580c',
    description: 'Restaurace, kavárny a obchody s jídlem',
  },
  {
    id: 'transit',
    label: 'MHD',
    color: '#4f46e5',
    description: 'Zastávky a stanice veřejné dopravy',
  },
  {
    id: 'green',
    label: 'Zeleň',
    color: '#16a34a',
    description: 'Parky, hřiště a odpočinková zeleň',
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(POI_CATEGORIES.map((item) => [item.id, item]))

function pointsForCount(count, { first = 12, extra = 2, max = 20 } = {}) {
  if (count <= 0) return 0
  return Math.min(max, first + (count - 1) * extra)
}

export function computeWalkScore(pois) {
  const counts = Object.fromEntries(POI_CATEGORIES.map((item) => [item.id, 0]))
  for (const poi of pois) {
    if (counts[poi.category] != null) counts[poi.category] += 1
  }

  const breakdown = POI_CATEGORIES.map((item) => {
    const count = counts[item.id]
    const extra = item.id === 'transit' ? 1 : 2
    const points = pointsForCount(count, { first: 12, extra, max: 20 })
    return { ...item, count, points, max: 20 }
  })

  const total = breakdown.reduce((sum, item) => sum + item.points, 0)

  return { total, max: 100, breakdown }
}
