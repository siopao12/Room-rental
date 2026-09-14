import React from 'react'
import { Home, Wifi, Wind, Bath, BedDouble, UtensilsCrossed, Tv, Refrigerator, AlertCircle } from 'lucide-react'

const AMENITY_ICONS = {
  'Free Wi-Fi': <Wifi size={14} />,
  'Aircon': <Wind size={14} />,
  'Private Bath': <Bath size={14} />,
  'Ensuite Bath': <Bath size={14} />,
  'Single Bed': <BedDouble size={14} />,
  'Twin Beds': <BedDouble size={14} />,
  'Shared Kitchen': <UtensilsCrossed size={14} />,
  'Kitchenette': <UtensilsCrossed size={14} />,
  'Full Kitchen': <UtensilsCrossed size={14} />,
  'Smart TV': <Tv size={14} />,
  'Mini Fridge': <Refrigerator size={14} />,
}

export default function BoarderMyRoomSection({ rentalData }) {
  const room = rentalData?.rooms

  if (!rentalData || !room) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Room</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Details about your assigned room</p>
        </div>
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: '#f8fafc', borderRadius: '16px',
          border: '1px dashed #e2e8f0'
        }}>
          <AlertCircle size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>No Room Assigned</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your room details will appear here once your rental is active.</p>
        </div>
      </div>
    )
  }

  const amenities = room.amenities || []
  const statusColor = room.status?.toLowerCase() === 'occupied'
    ? { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Occupied (Your Room)' }
    : { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: room.status || 'Active' }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Room</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Details about your assigned room</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Room Identity Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderRadius: '20px', padding: '28px', color: '#fff',
          gridColumn: 'span 2', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '180px', height: '180px', borderRadius: '50%',
            background: 'rgba(165, 180, 252, 0.08)'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: 'rgba(165, 180, 252, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc'
                  }}>
                    <Home size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>ROOM NUMBER</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{room.room_number || '—'}</div>
                  </div>
                </div>
              </div>
              <span style={{
                background: statusColor.bg, color: statusColor.color,
                border: `1px solid ${statusColor.border}`,
                padding: '6px 14px', borderRadius: '20px',
                fontSize: '0.75rem', fontWeight: 700
              }}>
                {statusColor.label}
              </span>
            </div>
            {room.description && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', marginTop: '12px', lineHeight: 1.6 }}>
                {room.description}
              </p>
            )}
          </div>
        </div>

        {/* Room Info */}
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '24px',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '18px' }}>Room Details</h3>
          {[
            { label: 'Room Type',    value: (room.room_type || room.type || '—').toUpperCase() },
            { label: 'Floor',        value: room.floor || '—' },
            { label: 'Size',         value: room.size || '—' },
            { label: 'Capacity',     value: room.capacity ? `${room.capacity} Person${room.capacity > 1 ? 's' : ''}` : '—' },
            { label: 'Monthly Rent', value: `₱${Number(rentalData.monthly_rent).toLocaleString()}` },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem'
            }}>
              <span style={{ color: '#64748b' }}>{row.label}</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Amenities */}
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '24px',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '18px' }}>Amenities</h3>
          {amenities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {amenities.map((amenity, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', background: '#eef2ff', borderRadius: '8px',
                  fontSize: '0.875rem', fontWeight: 600, color: '#4f46e5'
                }}>
                  <span style={{ color: '#6366f1' }}>{AMENITY_ICONS[amenity] || <Home size={14} />}</span>
                  {amenity}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No amenities listed.</p>
          )}
        </div>
      </div>
    </div>
  )
}
