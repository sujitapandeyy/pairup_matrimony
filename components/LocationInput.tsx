'use client'

import React, { useEffect, useState } from 'react'

interface LocationSuggestion {
  display_name: string
  lat: string
  lon: string
}

interface Props {
  value: string
  onSelect: (location: LocationSuggestion) => void
}

export default function LocationInput({ value, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])

  useEffect(() => {
    const delay = setTimeout(() => {
      if (value.length > 2) {
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=np&q=${encodeURIComponent(
            value
          )}`
        )
          .then((res) => res.json())
          .then((data) => setSuggestions(data))
          .catch(() => setSuggestions([]))
      } else {
        setSuggestions([])
      }
    }, 400)

    return () => clearTimeout(delay)
  }, [value])

  const handleSelect = (location: LocationSuggestion) => {
    onSelect(location)
    setSuggestions([]) 
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) =>
          onSelect({ display_name: e.target.value, lat: '', lon: '' })
        }
        placeholder="Enter your Location"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition"
        autoComplete="off"
        onBlur={() => setTimeout(() => setSuggestions([]), 100)} 
        required
      />
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
          {suggestions.map((sug, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(sug)} 
              className="px-4 py-2 cursor-pointer hover:bg-gray-200"
            >
              {sug.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
