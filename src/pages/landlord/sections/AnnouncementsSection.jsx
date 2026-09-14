import React, { useState, useEffect } from 'react'
import { Megaphone, Plus, Loader2, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { notifyAllBoarders } from '../../../lib/notifyHelper'
import { sanitizeError, logError } from '../../../lib/errorHandler'

export default function AnnouncementsSection({ currentUser }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' })
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { fetchAnnouncements() }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, poster:users!posted_by(name, email)')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching announcements:', error)
      }
      setAnnouncements(data || [])
    } catch (err) {
      console.error('Error fetching announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    try {
      const { data: landlordData, error: userErr } = await supabase
        .from('users').select('id').eq('auth_id', currentUser.id).single()

      if (userErr || !landlordData) throw new Error('Could not identify landlord account.')

      const { error: insertErr } = await supabase.from('announcements').insert({
        title: form.title,
        content: form.content,
        priority: form.priority,
        posted_by: landlordData.id,
      })

      if (insertErr) throw insertErr

      await supabase.from('audit_logs').insert({
        user_id: landlordData.id,
        action: 'POST_ANNOUNCEMENT',
        target_type: 'ANNOUNCEMENTS',
        description: `Landlord posted announcement: "${form.title}"`
      })

      // Notify all boarders about the new announcement
      await notifyAllBoarders(
        `📢 ${form.title}`,
        form.content.length > 120 ? form.content.slice(0, 120) + '...' : form.content,
        'announcement'
      )

      setSuccessMsg('Announcement posted successfully!')
      setForm({ title: '', content: '', priority: 'normal' })
      setShowForm(false)
      setTimeout(() => setSuccessMsg(''), 3000)
      fetchAnnouncements()
    } catch (err) {
      logError('AnnouncementsSection.handlePost', err)
      setErrorMsg(sanitizeError(err, 'announcement'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete announcement "${title}"?`)) return
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      fetchAnnouncements()
    } catch (err) {
      logError('AnnouncementsSection.handleDelete', err)
      setErrorMsg(sanitizeError(err, 'announcement'))
    }
  }

  const priorityStyle = (priority) => {
    const map = {
      urgent:    { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: '🚨 Urgent' },
      important: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: '⚠️ Important' },
      normal:    { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: '📢 Normal' },
    }
    return map[priority] || map.normal
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Announcements</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Post notices and updates visible to all boarders
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={fetchAnnouncements}><RefreshCw size={14} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Post Announcement
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert-message alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert-message alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Post Form */}
      {showForm && (
        <form onSubmit={handlePost} style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px',
          padding: '24px', marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '18px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={18} /> New Announcement
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water Interruption Notice"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Priority Level</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem', background: '#fff' }}>
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Announcement Content *</label>
              <textarea
                required
                rows={4}
                placeholder="Write your announcement here..."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem', resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Megaphone size={14} />}
              Post Announcement
            </button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <Megaphone size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>No Announcements Yet</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '6px' }}>Post your first announcement for boarders to see.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {announcements.map(ann => {
            const p = priorityStyle(ann.priority)
            return (
              <div key={ann.id} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
                padding: '20px 24px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                borderLeft: `4px solid ${p.border}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{ann.title}</h4>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', background: p.bg, color: p.color, border: `1px solid ${p.border}`, fontSize: '0.75rem', fontWeight: 700 }}>
                      {p.label}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(ann.id, ann.title)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.65, marginBottom: '10px' }}>{ann.content}</p>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Posted by {ann.poster?.name || ann.poster?.email || 'Landlord'} · {new Date(ann.created_at).toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

