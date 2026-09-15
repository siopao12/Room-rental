import React, { useState, useEffect } from 'react'
import {
  Users, Home, Loader2, RefreshCw, Search, UserCheck, UserX,
  Calendar, LogOut, CheckCircle2, AlertTriangle, X, Clock
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { decryptObject } from '../../../lib/encryptionHelper'
import { createNotification } from '../../../lib/notifyHelper'
import { sanitizeError, logError } from '../../../lib/errorHandler'

export default function BoardersSection() {
  const [boarders, setBoarders] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [assignBoarderId, setAssignBoarderId] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Move-Out Modal State
  const [moveOutTarget, setMoveOutTarget] = useState(null) // { boarder, rental }
  const [moveOutDate, setMoveOutDate] = useState('')
  const [processingMoveOut, setProcessingMoveOut] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch boarders (role_id = 3) with their active/scheduled rentals
      const { data: boarderData } = await supabase
        .from('users')
        .select('*, roles(*), rentals(*, rooms(*))')
        .eq('role_id', 3)
        .order('name', { ascending: true })

      // Fetch available rooms
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .ilike('status', 'available')
        .order('room_number', { ascending: true })

      // Fetch SCHEDULE_MOVEOUT audit logs to display scheduled move-out dates
      const { data: moveOutLogs } = await supabase
        .from('audit_logs')
        .select('target_id, description, created_at')
        .eq('action', 'SCHEDULE_MOVEOUT')
        .order('created_at', { ascending: false })

      const moveOutMap = {}
      ;(moveOutLogs || []).forEach(l => {
        if (l.target_id && !moveOutMap[l.target_id]) {
          const match = (l.description || '').match(/\b\d{4}-\d{2}-\d{2}\b/)
          if (match) moveOutMap[l.target_id] = match[0]
        }
      })

      if (boarderData) {
        boarderData.forEach(b => {
          (b.rentals || []).forEach(r => {
            if (moveOutMap[r.id]) {
              r.scheduled_move_out_date = moveOutMap[r.id]
              r.is_scheduled_move_out = true
            }
          })
        })
      }

      const decryptedBoarders = (boarderData || []).map(b => decryptObject(b, ['phone', 'emergency_contact']))
      setBoarders(decryptedBoarders)
      setRooms(roomData || [])
    } catch (err) {
      console.error('Error fetching boarders:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (boarder) => {
    if (!selectedRoom) return
    setAssigning(true)
    try {
      const room = rooms.find(r => r.id === parseInt(selectedRoom, 10))

      // Check for existing active rental
      const { data: existing } = await supabase
        .from('rentals')
        .select('id')
        .eq('user_id', boarder.id)
        .in('status', ['Active', 'Scheduled Move-Out'])
        .maybeSingle()

      if (existing) {
        alert('This boarder already has an active rental. Please end their current rental first.')
        setAssigning(false)
        return
      }

      const nextDue = new Date()
      nextDue.setMonth(nextDue.getMonth() + 1)

      await supabase.from('rentals').insert({
        user_id: boarder.id,
        room_id: parseInt(selectedRoom, 10),
        monthly_rent: room?.monthly_rent || 3500,
        start_date: new Date().toISOString().split('T')[0],
        next_due_date: nextDue.toISOString().split('T')[0],
        status: 'Active'
      })

      await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', parseInt(selectedRoom, 10))

      await supabase.from('audit_logs').insert({
        action: 'ASSIGN_BOARDER',
        target_type: 'RENTALS',
        description: `Landlord assigned boarder ${boarder.name || boarder.email} to Room ${room?.room_number}`
      })

      setAssignBoarderId(null)
      setSelectedRoom('')
      fetchData()
    } catch (err) {
      logError('BoardersSection.handleAssign', err)
      alert(sanitizeError(err, 'default'))
    } finally {
      setAssigning(false)
    }
  }

  // ── 1. Schedule Move-Out Date ────────────────────────────────────────────────
  const handleScheduleMoveOut = async () => {
    if (!moveOutTarget || !moveOutDate) return
    setProcessingMoveOut(true)
    try {
      const { boarder, rental } = moveOutTarget

      // Log SCHEDULE_MOVEOUT audit record containing the exact date and rental ID
      await supabase.from('audit_logs').insert({
        user_id: boarder.id,
        action: 'SCHEDULE_MOVEOUT',
        target_type: 'RENTALS',
        target_id: rental.id,
        description: `Landlord scheduled move-out for ${boarder.name || boarder.email} (Room ${rental.rooms?.room_number}) on ${moveOutDate}`
      })

      await createNotification(
        boarder.id,
        '📅 Move-Out Date Scheduled',
        `Your landlord has scheduled your move-out date for ${new Date(moveOutDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
        'info'
      )

      setActionSuccessMsg(`Move-out date set for ${new Date(moveOutDate).toLocaleDateString()} successfully!`)
      setTimeout(() => setActionSuccessMsg(''), 4000)
      setMoveOutTarget(null)
      fetchData()
    } catch (err) {
      logError('handleScheduleMoveOut', err)
      alert(sanitizeError(err, 'default'))
    } finally {
      setProcessingMoveOut(false)
    }
  }

  // ── 2. Complete Move-Out & Free Room Now ─────────────────────────────────────
  const handleCompleteMoveOut = async () => {
    if (!moveOutTarget) return
    const { boarder, rental } = moveOutTarget
    if (!window.confirm(`Complete move-out for ${boarder.name || boarder.email}? This will free up Room ${rental.rooms?.room_number} and revert user status.`)) return

    setProcessingMoveOut(true)
    try {
      // 1. Terminate rental with valid status 'Completed'
      await supabase.from('rentals').update({
        status: 'Completed'
      }).eq('id', rental.id)

      // 2. Set room status back to Available
      if (rental.room_id) {
        await supabase.from('rooms').update({ status: 'Available' }).eq('id', rental.room_id)
      }

      // 3. Revert user role back to Applicant (role_id = 4)
      await supabase.from('users').update({ role_id: 4 }).eq('id', boarder.id)

      // 4. Record Audit Log
      await supabase.from('audit_logs').insert({
        action: 'COMPLETE_MOVEOUT',
        target_type: 'RENTALS',
        target_id: rental.id,
        description: `Landlord completed move-out for ${boarder.name || boarder.email}. Room ${rental.rooms?.room_number} is now Available.`
      })

      // 5. Notify boarder
      await createNotification(
        boarder.id,
        '🏡 Rental Lease Completed',
        `Your rental lease for Room ${rental.rooms?.room_number || ''} has been completed. Thank you for staying with us!`,
        'info'
      )

      setActionSuccessMsg(`Move-out completed! Room ${rental.rooms?.room_number || ''} is now Available.`)
      setTimeout(() => setActionSuccessMsg(''), 4000)
      setMoveOutTarget(null)
      fetchData()
    } catch (err) {
      logError('handleCompleteMoveOut', err)
      alert(sanitizeError(err, 'default'))
    } finally {
      setProcessingMoveOut(false)
    }
  }

  // ── 3. Cancel / Remove Scheduled Move-Out ──────────────────────────────────
  const handleCancelMoveOut = async () => {
    if (!moveOutTarget) return
    const { boarder, rental } = moveOutTarget

    setProcessingMoveOut(true)
    try {
      // 1. Delete SCHEDULE_MOVEOUT audit logs for this rental so moveOutMap clears
      await supabase
        .from('audit_logs')
        .delete()
        .eq('action', 'SCHEDULE_MOVEOUT')
        .eq('target_id', rental.id)

      // 2. Revert rental status back to Active
      await supabase
        .from('rentals')
        .update({ status: 'Active' })
        .eq('id', rental.id)

      // 3. Record CANCEL_MOVEOUT Audit Log
      await supabase.from('audit_logs').insert({
        user_id: boarder.id,
        action: 'CANCEL_MOVEOUT',
        target_type: 'RENTALS',
        target_id: rental.id,
        description: `Landlord cancelled scheduled move-out for ${boarder.name || boarder.email} (Room ${rental.rooms?.room_number}). Lease restored to active.`
      })

      // 4. Notify boarder
      await createNotification(
        boarder.id,
        '✅ Move-Out Notice Cancelled',
        `Your scheduled move-out date has been cancelled by your landlord. Your lease for Room ${rental.rooms?.room_number || ''} remains fully active.`,
        'info'
      )

      setActionSuccessMsg(`Scheduled move-out for ${boarder.name || boarder.email} cancelled successfully!`)
      setTimeout(() => setActionSuccessMsg(''), 4000)
      setMoveOutTarget(null)
      fetchData()
    } catch (err) {
      logError('handleCancelMoveOut', err)
      alert(sanitizeError(err, 'default'))
    } finally {
      setProcessingMoveOut(false)
    }
  }

  const filtered = boarders.filter(b =>
    (b.name || b.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Boarders Management</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            View active boarders, manage room assignments, and schedule move-outs
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
      </div>

      {actionSuccessMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontWeight: 600, fontSize: '0.875rem' }}>
          <CheckCircle2 size={18} /> {actionSuccessMsg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Users size={28} color="#1e40af" />
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e40af' }}>{boarders.length}</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af', opacity: 0.85 }}>Total Boarders</div>
          </div>
        </div>
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Home size={28} color="#166534" />
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534' }}>{rooms.length}</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', opacity: 0.85 }}>Available Rooms</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Search boarders by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontFamily: 'inherit', fontSize: '0.875rem' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading boarders...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <Users size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>No Boarders Found</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '6px' }}>No active boarders registered in the system.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(boarder => {
            const activeRental = boarder.rentals?.find(r => r.status === 'Active' || r.status === 'Scheduled Move-Out')
            const moveOutDateVal = activeRental?.scheduled_move_out_date || activeRental?.end_date || activeRental?.move_out_date
            const isScheduled = activeRental?.is_scheduled_move_out || activeRental?.status === 'Scheduled Move-Out' || !!moveOutDateVal

            return (
              <div key={boarder.id} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
                padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '1.125rem', flexShrink: 0
                    }}>
                      {(boarder.name || boarder.email || 'B')[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{boarder.name || 'Unnamed'}</h4>
                      <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{boarder.email}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {activeRental ? (
                      <>
                        <div style={{ textAlign: 'right', minWidth: '130px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '2px' }}>
                            <UserCheck size={14} color={isScheduled ? '#d97706' : '#166534'} />
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isScheduled ? '#d97706' : '#166534' }}>
                              {isScheduled ? 'Scheduled Move-Out' : 'Active Lease'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Room {activeRental.rooms?.room_number} · ₱{Number(activeRental.monthly_rent || 0).toLocaleString()}/mo
                          </div>
                          {moveOutDateVal && (
                            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
                              Move-out: {new Date(moveOutDateVal).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Move-Out Action Button */}
                        <button
                          onClick={() => {
                            setMoveOutTarget({ boarder, rental: activeRental })
                            setMoveOutDate(moveOutDateVal || '')
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 14px', borderRadius: '8px',
                            border: '1.5px solid #fecaca', background: '#fef2f2',
                            color: '#dc2626', fontSize: '0.8125rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                        >
                          <LogOut size={14} /> Move-Out Options
                        </button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {assignBoarderId === boarder.id ? (
                          <>
                            <select
                              value={selectedRoom}
                              onChange={e => setSelectedRoom(e.target.value)}
                              style={{ padding: '7px 12px', border: '1.5px solid #2d6a4f', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem' }}
                            >
                              <option value="">Select room...</option>
                              {rooms.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.room_number} — ₱{Number(r.monthly_rent || 0).toLocaleString()}/mo
                                </option>
                              ))}
                            </select>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAssign(boarder)} disabled={!selectedRoom || assigning} style={{ padding: '7px 14px' }}>
                              {assigning ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Assign'}
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => { setAssignBoarderId(null); setSelectedRoom('') }} style={{ padding: '7px 12px' }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', color: '#94a3b8' }}>
                              <UserX size={14} /> No room
                            </span>
                            <button className="btn btn-outline btn-sm" onClick={() => { setAssignBoarderId(boarder.id); setSelectedRoom('') }} style={{ padding: '6px 14px' }}>
                              Assign Room
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MOVE-OUT MANAGEMENT MODAL ────────────────────────────────────────── */}
      {moveOutTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', maxWidth: '500px', width: '100%',
            padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', position: 'relative'
          }}>
            <button
              onClick={() => setMoveOutTarget(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <LogOut size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Manage Boarder Move-Out</h3>
                <span style={{ fontSize: '0.78125rem', color: '#64748b' }}>
                  {moveOutTarget.boarder?.name || moveOutTarget.boarder?.email} · Room {moveOutTarget.rental?.rooms?.room_number}
                </span>
              </div>
            </div>

            {/* Option 1: Schedule Move-Out Date */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Calendar size={16} color="#d97706" /> Option 1: Schedule Future Move-Out Date
              </div>
              <p style={{ fontSize: '0.78125rem', color: '#64748b', marginBottom: '12px', lineHeight: 1.5 }}>
                Set an official move-out date. The boarder will receive a notification and their status will show "Scheduled Move-Out".
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={e => setMoveOutDate(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.85rem' }}
                />
                <button
                  onClick={handleScheduleMoveOut}
                  disabled={!moveOutDate || processingMoveOut}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: '#d97706', color: '#fff', fontWeight: 700, fontSize: '0.8125rem',
                    cursor: moveOutDate && !processingMoveOut ? 'pointer' : 'not-allowed', opacity: !moveOutDate || processingMoveOut ? 0.6 : 1
                  }}
                >
                  {processingMoveOut ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Date'}
                </button>
              </div>
            </div>

            {/* Option 2: Immediate Checkout / End Lease Now */}
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '14px', padding: '16px', marginBottom: (moveOutTarget.rental?.is_scheduled_move_out || moveOutTarget.rental?.scheduled_move_out_date) ? '18px' : '0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <AlertTriangle size={16} color="#dc2626" /> Option 2: Complete Move-Out & Free Room Now
              </div>
              <p style={{ fontSize: '0.78125rem', color: '#7f1d1d', marginBottom: '12px', lineHeight: 1.5 }}>
                End the lease immediately. This will mark <strong>Room {moveOutTarget.rental?.rooms?.room_number}</strong> as Available for new applicants and complete the rental history.
              </p>

              <button
                onClick={handleCompleteMoveOut}
                disabled={processingMoveOut}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px 16px', borderRadius: '8px', border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  cursor: processingMoveOut ? 'default' : 'pointer', opacity: processingMoveOut ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
                }}
              >
                {processingMoveOut ? (
                  <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing Checkout...</>
                ) : (
                  <><LogOut size={15} /> End Lease & Free Up Room Now</>
                )}
              </button>
            </div>

            {/* Option 3: Cancel Scheduled Move-Out & Keep Boarder Active */}
            {(moveOutTarget.rental?.is_scheduled_move_out || moveOutTarget.rental?.scheduled_move_out_date) && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <UserCheck size={16} color="#166534" /> Option 3: Cancel Scheduled Move-Out
                </div>
                <p style={{ fontSize: '0.78125rem', color: '#14532d', marginBottom: '12px', lineHeight: 1.5 }}>
                  Remove the scheduled move-out date for this boarder and restore their status to a regular <strong>Active Lease</strong>.
                </p>

                <button
                  onClick={handleCancelMoveOut}
                  disabled={processingMoveOut}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '10px 16px', borderRadius: '8px', border: 'none',
                    background: '#166534', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                    cursor: processingMoveOut ? 'default' : 'pointer', opacity: processingMoveOut ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(22, 101, 52, 0.2)'
                  }}
                >
                  {processingMoveOut ? (
                    <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : (
                    <><UserCheck size={15} /> Cancel Move-Out & Restore Active Lease</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
