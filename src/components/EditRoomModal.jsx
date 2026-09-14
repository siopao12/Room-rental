import React, { useState, useEffect, useRef } from 'react'
import { X, Edit2, Loader2, Upload, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { sanitizeError, logError } from '../lib/errorHandler'

const AMENITY_OPTIONS = [
  'Free Wi-Fi', 'Aircon', 'Private Bath', 'Shared Bath', 'Hot Water',
  'Study Desk', 'Closet', 'Single Bed', 'Double Bed', 'Bunk Bed',
  'Mini Fridge', 'Kitchen Access', 'Balcony', 'Smart TV', 'Cable TV',
  'Laundry Access', 'Parking', 'Security Camera', 'CCTV',
]

const FLOOR_OPTIONS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor']

export default function EditRoomModal({ room, isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    room_number: '',
    room_type: 'single',
    monthly_rent: '',
    capacity: '1',
    floor_number: '1st Floor',
    size_sqm: '',
    deposit_amount: '',
    status: 'Available',
    description: '',
    image_url: '',
  })
  const [amenities, setAmenities] = useState([])
  const [imageFile, setImageFile] = useState(null)      // new File to upload
  const [imagePreview, setImagePreview] = useState(null) // local preview URL or existing image_url
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (room) {
      setForm({
        room_number: room.room_number || '',
        room_type: room.room_type || 'single',
        monthly_rent: room.monthly_rent || '',
        capacity: room.capacity || 1,
        floor_number: room.floor_number || '1st Floor',
        size_sqm: room.size_sqm || '',
        deposit_amount: room.deposit_amount || '',
        status: room.status || 'Available',
        description: room.description || '',
        image_url: room.image_url || '',
      })
      setAmenities(Array.isArray(room.amenities) ? room.amenities : [])
      setImageFile(null)
      setImagePreview(room.image_url || null) // show existing image as initial preview
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [room])

  if (!isOpen || !room) return null

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleImageFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WEBP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image must be under 5MB.')
      return
    }
    setImageFile(file)
    // Revoke old blob URL if any
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
    setErrorMsg('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleImageFile(e.dataTransfer.files[0])
  }

  const clearImage = () => {
    setImageFile(null)
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    set('image_url', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleAmenity = (item) => {
    setAmenities(prev =>
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]
    )
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      // Upload new image if a new file was selected
      let finalImageUrl = form.image_url || null
      if (imageFile) {
        try {
          const ext = imageFile.name.split('.').pop()
          const fileName = `room-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('room-images')
            .upload(fileName, imageFile, { cacheControl: '3600', upsert: false })

          if (uploadErr) {
            console.warn('[RoomEase] Supabase Storage upload skipped:', uploadErr.message)
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result)
              reader.onerror = () => resolve(null)
              reader.readAsDataURL(imageFile)
            })
            finalImageUrl = base64 || form.image_url
          } else {
            const { data: { publicUrl } } = supabase.storage.from('room-images').getPublicUrl(uploadData.path)
            finalImageUrl = publicUrl
          }
        } catch (imgErr) {
          console.warn('[RoomEase] Image upload exception, using fallback:', imgErr)
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(imageFile)
          })
          finalImageUrl = base64 || form.image_url
        }
      }
      const { error } = await supabase.from('rooms').update({
        room_number: form.room_number.trim(),
        room_type: form.room_type,
        monthly_rent: parseFloat(form.monthly_rent),
        capacity: parseInt(form.capacity, 10),
        floor_number: form.floor_number,
        size_sqm: form.size_sqm ? parseFloat(form.size_sqm) : null,
        deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
        amenities: amenities.length > 0 ? amenities : null,
        status: form.status,
        description: form.description.trim(),
        image_url: finalImageUrl,
      }).eq('id', room.id)

      if (error) throw error

      await supabase.from('audit_logs').insert({
        action: 'UPDATE_ROOM',
        target_type: 'ROOMS',
        target_id: room.id,
        description: `Landlord updated room ${form.room_number} — type: ${form.room_type}, rent: ₱${form.monthly_rent}`
      })

      setSuccessMsg('Room updated successfully!')
      setTimeout(() => { onSaved(); onClose() }, 900)
    } catch (err) {
      logError('EditRoomModal.handleSubmit', err)
      setErrorMsg(sanitizeError(err, 'room'))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px',
    fontSize: '0.875rem', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: '0.8125rem', fontWeight: 600, color: '#374151',
    display: 'block', marginBottom: '5px',
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '620px',
          maxHeight: '90vh', overflowY: 'auto',
          margin: '20px auto', padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: '#f1f5f9', border: 'none', borderRadius: '8px',
            width: '32px', height: '32px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit2 color="#2d6a4f" size={18} /> Edit Room
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Update details for <strong>{room.room_number}</strong>
          </p>
        </div>

        {errorMsg && <div className="alert-message alert-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}
        {successMsg && <div className="alert-message alert-success" style={{ marginBottom: '16px' }}>{successMsg}</div>}

        <form onSubmit={handleSave}>
          {/* Row 1: Room Number + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Room Number / Name *</label>
              <input style={inputStyle} type="text" required
                value={form.room_number} onChange={e => set('room_number', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Room Type *</label>
              <select style={{ ...inputStyle, background: '#fff' }} value={form.room_type} onChange={e => set('room_type', e.target.value)}>
                <option value="single">Single Room</option>
                <option value="double">Double Room</option>
                <option value="suite">Executive Suite</option>
              </select>
            </div>
          </div>

          {/* Row 2: Rent + Capacity + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Monthly Rent (₱) *</label>
              <input style={inputStyle} type="number" required min={0}
                value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Max Capacity *</label>
              <input style={inputStyle} type="number" required min={1} max={10}
                value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Status *</label>
              <select style={{ ...inputStyle, background: '#fff' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          {/* Row 3: Floor + Size + Deposit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Floor</label>
              <select style={{ ...inputStyle, background: '#fff' }} value={form.floor_number} onChange={e => set('floor_number', e.target.value)}>
                {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Room Size (m²)</label>
              <input style={inputStyle} type="number" placeholder="18" min={1}
                value={form.size_sqm} onChange={e => set('size_sqm', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Deposit (₱)</label>
              <input style={inputStyle} type="number" placeholder="9000" min={0}
                value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} />
            </div>
          </div>

          {/* Amenities */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Amenities</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {AMENITY_OPTIONS.map(item => {
                const selected = amenities.includes(item)
                return (
                  <button
                    key={item} type="button"
                    onClick={() => toggleAmenity(item)}
                    style={{
                      padding: '5px 12px', borderRadius: '20px', fontSize: '0.78125rem', fontWeight: 600,
                      cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
                      background: selected ? '#2d6a4f' : '#f8fafc',
                      color: selected ? '#fff' : '#475569',
                      borderColor: selected ? '#2d6a4f' : '#e2e8f0',
                    }}
                  >
                    {selected ? '✓ ' : ''}{item}
                  </button>
                )
              })}
            </div>
            {amenities.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#2d6a4f', fontWeight: 600 }}>
                {amenities.length} amenit{amenities.length === 1 ? 'y' : 'ies'} selected
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Room Photo</label>

            {imagePreview ? (
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <img
                  src={imagePreview}
                  alt="Room preview"
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px', border: '1.5px solid #e2e8f0', display: 'block' }}
                  onError={e => e.target.style.display = 'none'}
                />
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <Upload size={12} /> Change
                  </button>
                  <button
                    type="button"
                    onClick={clearImage}
                    style={{ background: 'rgba(220,38,38,0.75)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
                {imageFile && (
                  <div style={{ marginTop: '5px', fontSize: '0.75rem', color: '#64748b' }}>
                    📎 New: {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: '6px',
                  border: `2px dashed ${dragOver ? '#2d6a4f' : '#cbd5e1'}`,
                  borderRadius: '10px', padding: '24px 20px', textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? '#f0fdf4' : '#f8fafc',
                  transition: 'all 0.2s',
                }}
              >
                <Upload size={22} color={dragOver ? '#2d6a4f' : '#94a3b8'} style={{ margin: '0 auto 7px', display: 'block' }} />
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: dragOver ? '#2d6a4f' : '#475569' }}>Click to upload or drag & drop</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>JPG, PNG, WEBP — max 5MB</div>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleImageFile(e.target.files[0])} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              rows={3}
              placeholder="Describe the room..."
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '8px', background: '#2d6a4f', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Edit2 size={16} />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
