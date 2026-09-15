import React from 'react'
import { X, Wifi, Wind, Bath, Bed, Maximize2, Users, CheckCircle, CalendarCheck2, Lock, Layers } from 'lucide-react'

export default function RoomDetailsModal({ room, onClose, onBook }) {
  if (!room) return null

  const isOccupied = room.status === 'occupied'

  // Icon mapping helper for amenities
  const renderAmenityIcon = (name) => {
    const key = name.toLowerCase()
    if (key.includes('wifi')) return <Wifi size={16} />
    if (key.includes('aircon') || key.includes('air conditioning')) return <Wind size={16} />
    if (key.includes('bath') || key.includes('ensuite')) return <Bath size={16} />
    if (key.includes('bed') || key.includes('single') || key.includes('double')) return <Bed size={16} />
    return <CheckCircle size={16} />
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px', padding: '0', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
          <img 
            src={room.image || room.image_url} 
            alt={room.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button 
            className="modal-close" 
            onClick={onClose} 
            style={{ top: '16px', right: '16px', zIndex: 10, background: 'rgba(15, 23, 42, 0.7)', color: '#fff' }}
          >
            <X size={18} />
          </button>
          
          <span className="room-type-badge" style={{ top: '16px', left: '16px' }}>
            {room.type}
          </span>
          <span className={`room-status ${room.status}`} style={{ top: '16px', left: '88px' }}>
            {isOccupied ? 'Occupied' : 'Available'}
          </span>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                {room.name}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                {room.floor_number || room.floor || '1st Floor'} • {room.capacity || '1-2'} Pax Max
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#1b4332' }}>
                ₱{Number(room.price).toLocaleString()}
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>per month</span>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="room-specs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#334155' }}>
              <Maximize2 size={16} color="#2d6a4f" />
              <span><strong>{room.size_sqm ? `${room.size_sqm}m²` : (room.size || '18m²')}</strong> Size</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#334155' }}>
              <Users size={16} color="#2d6a4f" />
              <span><strong>{room.capacity || '1 Person'}</strong> Capacity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#334155' }}>
              <Layers size={16} color="#2d6a4f" />
              <span>Floor <strong>{room.floor_number || room.floor || '1st Floor'}</strong></span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>About this room</h4>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.6' }}>
              {room.description}
            </p>
          </div>

          {/* Amenities Checklist */}
          {room.amenities && room.amenities.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Included Amenities</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {room.amenities.map((amenity, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#334155' }}>
                    <span style={{ color: '#2d6a4f' }}>{renderAmenityIcon(amenity)}</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '12px', pt: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
              Close
            </button>
            <button 
              className="btn btn-primary" 
              disabled={isOccupied} 
              onClick={() => { onClose(); onBook(room); }}
              style={{ flex: 2 }}
            >
              {isOccupied ? (
                <>
                  <Lock size={16} /> Currently Occupied
                </>
              ) : (
                <>
                  <CalendarCheck2 size={16} /> Book This Room
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
