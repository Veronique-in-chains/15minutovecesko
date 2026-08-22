import { useEffect, useId, useRef, useState } from 'react'
import { searchCzechPlaces } from '../api/geocode'

export default function AddressSearch({ onSelect }) {
  const listId = useId()
  const rootRef = useRef(null)
  const abortRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      abortRef.current?.abort()
      setResults([])
      setSearching(false)
      setError(null)
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setSearching(true)
      setError(null)
      try {
        const places = await searchCzechPlaces(q, { signal: controller.signal })
        setResults(places)
        setActiveIndex(places.length ? 0 : -1)
        setOpen(true)
      } catch (err) {
        if (err.name === 'AbortError') return
        setResults([])
        setError(err.message || 'Adresy se teď nepodařilo načíst.')
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 280)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const pick = (place) => {
    setQuery(place.label)
    setOpen(false)
    setResults([])
    onSelect?.({ lat: place.lat, lng: place.lng })
  }

  const handleKeyDown = (event) => {
    if (!open || !results.length) {
      if (event.key === 'Escape') setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      pick(results[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <form
      ref={rootRef}
      className="relative min-w-0 w-full"
      onSubmit={(event) => {
        event.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) pick(results[activeIndex])
      }}
    >
      <label htmlFor="address-search" className="sr-only">
        Vyhledat adresu
      </label>
      <input
        id="address-search"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Zadejte adresu nebo město…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {open && query.trim().length >= 3 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
        >
          {searching && !results.length && (
            <li className="px-3 py-2 text-gray-500">Hledám adresy…</li>
          )}
          {!searching && error && (
            <li className="px-3 py-2 text-red-700">{error}</li>
          )}
          {!searching && !error && !results.length && (
            <li className="px-3 py-2 text-gray-500">Nic se nenašlo. Zkuste přesnější adresu.</li>
          )}
          {results.map((place, index) => (
            <li key={place.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left ${
                  index === activeIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-800'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
