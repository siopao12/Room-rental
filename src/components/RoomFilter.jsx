import React from 'react'

export default function RoomFilter({ currentFilter, setFilter }) {
  const filters = [
    { id: 'all', label: 'All Rooms' },
    { id: 'single', label: 'Single Rooms' },
    { id: 'double', label: 'Double Rooms' },
    { id: 'suite', label: 'Suites' }
  ]

  return (
    <div className="room-filters">
      {filters.map(f => (
        <button
          key={f.id}
          className={`filter-btn ${currentFilter === f.id ? 'active' : ''}`}
          onClick={() => setFilter(f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
