import React from 'react'
import { ArrowRight, Eye, Wifi, Wind, Bath } from 'lucide-react'

export default function RoomCard({ room, onViewDetails }) {
  const isOccupied = room.status === 'occupied'

  return (
    <div className="room-card" onClick={() => onViewDetails(room)} style={{ cursor: 'pointer' }}>
      <div className="room-image">
        <img src={room.image || room.image_url} alt={room.name} />
        <span className="room-type-badge">{room.type}</span>
        <span className={`room-status ${room.status}`}>
          {isOccupied ? 'Occupied' : 'Available'}
        </span>
      </div>

      <div className="room-body">
        <h3>{room.name}</h3>
        <p>{room.description}</p>

        {/* Quick Amenities Preview Pills */}
        {room.amenities && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {room.amenities.slice(0, 3).map((amenity, idx) => (
              <span key={idx} style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                {amenity}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, padding: '4px 6px' }}>
                +{room.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="room-footer">
          <div className="room-price">
            ₱{Number(room.price).toLocaleString()}
            <span>/month</span>
          </div>

          <button 
            className="btn btn-primary btn-sm" 
            onClick={(e) => { e.stopPropagation(); onViewDetails(room); }}
            style={{ borderRadius: '20px', padding: '8px 16px' }}
          >
            View Details <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
