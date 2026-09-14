import React, { useState, useEffect } from 'react'
import {
  Plus, Edit2, Home, Loader2, RefreshCw, Search,
  ChevronDown, ChevronUp, MapPin, Maximize2, DollarSign,
  Wrench, User, Calendar, Trash2, AlertTriangle, X
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import AddRoomModal from '../../../components/AddRoomModal'
import EditRoomModal from '../../../components/EditRoomModal'

const STATUS_COLORS = {
  available:   { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  occupied:    { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  maintenance: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
}

export default function RoomsSection() {
  const [rooms, setRooms] = useState([])
  const [rentals, setRentals] = useState([]) // active rentals for occupied room info
  const [loading, setLoading] = useState(true)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [deleteRoomTarget, setDeleteRoomTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [expandedRow, setExpandedRow] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => { fetchData() }, [])

  const promptDeleteRoom = (room) => {
    setDeleteError('')
    setDeleteRoomTarget(room)
  }

  const handleConfirmDelete = async () => {
    if (!deleteRoomTarget) return
    setDeleting(true)
    setDeleteError('')

    const roomId = deleteRoomTarget.id
    const activeRental = rentalByRoom[roomId]

    if ((deleteRoomTarget.status || '').toLowerCase() === 'occupied' || activeRental) {
      setDeleteError('Cannot delete this room because it is currently occupied by an active boarder. Please move out the boarder or terminate the rental contract first.')
      setDeleting(false)
      return
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)

      if (error) {
        if (error.code === '23503') {
          throw new Error('Cannot delete this room because it has historical rental, payment, or maintenance records associated with it.')
        }
        throw error
      }

      await supabase.from('audit_logs').insert({
        action: 'DELETE_ROOM',
        target_type: 'ROOMS',
        target_id: roomId,
        description: `Landlord deleted room ${deleteRoomTarget.room_number}`
      })

      setDeleteRoomTarget(null)
      fetchData()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete room. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: roomsData }, { data: rentalsData }] = await Promise.all([
        supabase.from('rooms').select('*').order('id', { ascending: true }),
        supabase.from('rentals')
          .select('*, boarder:users!user_id(name, email), rooms(id)')
          .eq('status', 'Active'),
      ])
      setRooms(roomsData || [])
      setRentals(rentalsData || [])
    } catch (err) {
      console.error('Error fetching rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  // Map room_id → active rental info
  const rentalByRoom = {}
  rentals.forEach(r => {
    if (r.room_id) rentalByRoom[r.room_id] = r
  })

  const filtered = rooms.filter(r => {
    const matchType   = filterType   === 'all' || (r.room_type || '').toLowerCase() === filterType
    const matchStatus = filterStatus === 'all' || (r.status || '').toLowerCase() === filterStatus.toLowerCase()
    const matchSearch = (r.room_number || '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchStatus && matchSearch
  })

  const stats = {
    total:       rooms.length,
    available:   rooms.filter(r => (r.status || '').toLowerCase() === 'available').length,
    occupied:    rooms.filter(r => (r.status || '').toLowerCase() === 'occupied').length,
    maintenance: rooms.filter(r => (r.status || '').toLowerCase() === 'maintenance').length,
  }

  const statusDot = (status) => {
    const s = (status || '').toLowerCase()
    const cfg = STATUS_COLORS[s] || STATUS_COLORS.available
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        {status || 'Available'}
      </span>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Room Management</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Add, update, and manage all rental rooms
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={fetchData}
            title="Refresh"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setAddRoomOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add New Room
          </button>
        </div>
      </div>

      {/* Stats — 4 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Rooms',  value: stats.total,       color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', icon: Home },
          { label: 'Available',    value: stats.available,   color: '#166534', bg: '#dcfce7', border: '#bbf7d0', icon: Home },
          { label: 'Occupied',     value: stats.occupied,    color: '#991b1b', bg: '#fee2e2', border: '#fecaca', icon: User },
          { label: 'Maintenance',  value: stats.maintenance, color: '#92400e', bg: '#fef3c7', border: '#fde68a', icon: Wrench },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: '12px', padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: '12px',
              cursor: s.label !== 'Total Rooms' ? 'pointer' : 'default',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onClick={() => {
              if (s.label === 'Available')   setFilterStatus('available')
              if (s.label === 'Occupied')    setFilterStatus('occupied')
              if (s.label === 'Maintenance') setFilterStatus('maintenance')
              if (s.label === 'Total Rooms') setFilterStatus('all')
            }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, opacity: 0.8, marginTop: '2px' }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search room number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'single', 'double', 'suite'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: '7px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              background: filterType === t ? '#0f172a' : '#fff',
              color: filterType === t ? '#fff' : '#64748b',
              borderColor: filterType === t ? '#0f172a' : '#e2e8f0',
              transition: 'all 0.15s', textTransform: 'capitalize',
            }}>{t === 'all' ? 'All Types' : t}</button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'available', 'occupied', 'maintenance'].map(s => {
            const cfg = s === 'all' ? null : STATUS_COLORS[s]
            const active = filterStatus === s
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '7px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                background: active ? (cfg?.color || '#0f172a') : '#fff',
                color: active ? '#fff' : (cfg?.color || '#64748b'),
                borderColor: active ? (cfg?.color || '#0f172a') : (cfg?.border || '#e2e8f0'),
                transition: 'all 0.15s', textTransform: 'capitalize',
              }}>{s === 'all' ? 'All Status' : s}</button>
            )
          })}
        </div>
      </div>

      {/* Rooms Table */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading rooms...
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
          {/* Table Head */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['', 'Room', 'Type', 'Floor', 'Size', 'Rent/mo', 'Capacity', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(room => {
                const isExpanded = expandedRow === room.id
                const rental = rentalByRoom[room.id]
                const statusKey = (room.status || '').toLowerCase()

                return (
                  <React.Fragment key={room.id}>
                    {/* Main Row */}
                    <tr
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#fafdfb' : '#fff',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = '#fff' }}
                    >
                      {/* Expand toggle */}
                      <td style={{ padding: '12px 8px 12px 14px', width: '32px' }}>
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : room.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '2px' }}
                          title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </td>

                      {/* Room number */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Home size={13} color="#2d6a4f" />
                          </div>
                          {room.room_number}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', color: '#475569', textTransform: 'capitalize' }}>{room.room_type}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8125rem' }}>
                        {room.floor_number ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} color="#94a3b8" /> {room.floor_number}
                          </span>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8125rem' }}>
                        {room.size_sqm ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Maximize2 size={12} color="#94a3b8" /> {room.size_sqm} m²
                          </span>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1b4332' }}>
                        ₱{Number(room.monthly_rent || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {room.capacity} person{room.capacity > 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '12px 14px' }}>{statusDot(room.status)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditRoom(room)}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '0.8125rem' }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => promptDeleteRoom(room)}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '0.8125rem', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                            title="Delete Room"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: '0', borderBottom: '1px solid #e2e8f0', background: '#fafdfb' }}>
                          <div style={{ padding: '16px 20px 20px', display: 'grid', gridTemplateColumns: room.image_url ? '140px 1fr' : '1fr', gap: '20px', borderTop: '1px dashed #e2e8f0' }}>
                            {/* Image */}
                            {room.image_url && (
                              <img
                                src={room.image_url}
                                alt={room.room_number}
                                style={{ width: '140px', height: '100px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0', flexShrink: 0 }}
                                onError={e => e.target.style.display = 'none'}
                              />
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* Info chips */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {room.floor_number && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78125rem', fontWeight: 600 }}>
                                    <MapPin size={12} /> {room.floor_number}
                                  </span>
                                )}
                                {room.size_sqm && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78125rem', fontWeight: 600 }}>
                                    <Maximize2 size={12} /> {room.size_sqm} m²
                                  </span>
                                )}
                                {room.deposit_amount && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#166534', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78125rem', fontWeight: 600 }}>
                                    <DollarSign size={12} /> ₱{Number(room.deposit_amount).toLocaleString()} deposit
                                  </span>
                                )}
                              </div>

                              {/* Description */}
                              {room.description && (
                                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.55 }}>{room.description}</p>
                              )}

                              {/* Amenities */}
                              {Array.isArray(room.amenities) && room.amenities.length > 0 && (
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amenities</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {room.amenities.map(a => (
                                      <span key={a} style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 9px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Current tenant info if occupied */}
                              {statusKey === 'occupied' && rental && (
                                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                                    <User size={14} color="#c2410c" />
                                    <span style={{ fontWeight: 700, color: '#c2410c' }}>Current Tenant:</span>
                                    <span style={{ color: '#7c2d12' }}>{rental.boarder?.name || rental.boarder?.email || 'Unknown'}</span>
                                  </div>
                                  {rental.start_date && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                                      <Calendar size={14} color="#c2410c" />
                                      <span style={{ fontWeight: 700, color: '#c2410c' }}>Since:</span>
                                      <span style={{ color: '#7c2d12' }}>{new Date(rental.start_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                  )}
                                  {rental.next_due_date && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                                      <Calendar size={14} color="#c2410c" />
                                      <span style={{ fontWeight: 700, color: '#c2410c' }}>Next Due:</span>
                                      <span style={{ color: '#7c2d12' }}>{new Date(rental.next_due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    <Home size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                    No rooms found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddRoomModal
        isOpen={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        onRoomAdded={fetchData}
      />

      <EditRoomModal
        room={editRoom}
        isOpen={!!editRoom}
        onClose={() => setEditRoom(null)}
        onSaved={fetchData}
      />

      {/* Delete Confirmation Modal */}
      {deleteRoomTarget && (
        <div className="modal-overlay active" onClick={() => setDeleteRoomTarget(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px',
              padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', position: 'relative'
            }}
          >
            <button
              onClick={() => setDeleteRoomTarget(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: '#f1f5f9', border: 'none', borderRadius: '8px',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', background: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Delete Room</h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '2px 0 0' }}>Confirm room removal</p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to delete <strong>Room {deleteRoomTarget.room_number}</strong> ({deleteRoomTarget.room_type})? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="alert-message alert-error" style={{ marginBottom: '16px', fontSize: '0.8125rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setDeleteRoomTarget(null)}
                style={{ flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                {deleting ? 'Deleting...' : 'Delete Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
