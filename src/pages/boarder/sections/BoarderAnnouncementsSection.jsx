import React, { useState, useEffect } from 'react'
import { Megaphone, AlertCircle, Loader2, Pin } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function BoarderAnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      setAnnouncements(data || [])
    } catch (err) {
      console.error('Error fetching announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getPriorityStyle = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'urgent':    return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', tag: 'URGENT',  tagBg: '#fee2e2' }
      case 'important': return { bg: '#fef3c7', border: '#fde68a', color: '#92400e', tag: 'IMPORTANT', tagBg: '#fef3c7' }
      default:          return { bg: '#f8fafc', border: '#e2e8f0', color: '#334155', tag: null,     tagBg: null }
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Announcements</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
          Messages and notices from your landlord
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <Megaphone size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>No Announcements</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your landlord hasn't posted any announcements yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {announcements.map((ann) => {
            const s = getPriorityStyle(ann.priority)
            return (
              <div key={ann.id} style={{
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: '14px', padding: '20px 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: '#fff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#4f46e5',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                    }}>
                      <Megaphone size={16} />
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {ann.title || 'Announcement'}
                    </h4>
                    {s.tag && (
                      <span style={{
                        background: s.tagBg, color: s.color,
                        padding: '2px 10px', borderRadius: '10px',
                        fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.05em'
                      }}>
                        {s.tag}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    {formatDate(ann.created_at)}
                  </span>
                </div>
                <p style={{
                  fontSize: '0.9rem', color: s.color, lineHeight: 1.7,
                  margin: 0, paddingLeft: '42px'
                }}>
                  {ann.content || ann.message || ''}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
