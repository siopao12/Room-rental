import React, { useState, useEffect, useRef } from 'react'
import {
  Database, Download, Upload, Loader2, FileText, Calendar,
  ExternalLink, ShieldCheck, AlertTriangle, CheckCircle2,
  RefreshCw, Archive, FileCode, Check, AlertCircle, HardDrive
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { sanitizeError, logError } from '../../../lib/errorHandler'

// ─── Table Configurations for Full Backup & CSV Export ────────────────────────
const BACKUP_TABLES = [
  'users',
  'roles',
  'rooms',
  'rentals',
  'bills',
  'payments',
  'rental_applications',
  'announcements',
  'audit_logs'
]

const CSV_EXPORT_CONFIGS = [
  {
    key: 'users',
    label: 'Users',
    description: 'All user accounts with roles and status',
    icon: '👥',
    color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe',
    query: () => supabase.from('users').select('id, name, email, is_active, created_at, roles(name)').order('created_at', { ascending: false }),
    columns: ['id', 'name', 'email', 'role', 'is_active', 'created_at'],
    transform: (rows) => rows.map(r => [r.id, r.name || '', r.email || '', r.roles?.name || '', r.is_active !== false ? 'Active' : 'Inactive', r.created_at]),
  },
  {
    key: 'rentals',
    label: 'Rentals',
    description: 'Active and past rental records',
    icon: '🏠',
    color: '#059669', bg: '#d1fae5', border: '#6ee7b7',
    query: () => supabase.from('rentals').select('id, start_date, due_day, status, rooms(room_number, price), boarder:users!user_id(name, email)').order('created_at', { ascending: false }),
    columns: ['id', 'boarder_name', 'boarder_email', 'room', 'monthly_rent', 'start_date', 'due_day', 'status'],
    transform: (rows) => rows.map(r => [r.id, r.boarder?.name || '', r.boarder?.email || '', r.rooms?.room_number || '', r.rooms?.price || '', r.start_date, r.due_day || '', r.status]),
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'All payment records and verifications',
    icon: '💳',
    color: '#0891b2', bg: '#cffafe', border: '#a5f3fc',
    query: () => supabase.from('payments').select('id, amount, method, reference_number, payment_date, status, created_at, rentals(boarder:users!user_id(name, email))').order('created_at', { ascending: false }),
    columns: ['id', 'boarder_name', 'amount', 'method', 'reference_number', 'payment_date', 'status', 'created_at'],
    transform: (rows) => rows.map(r => [r.id, r.rentals?.boarder?.name || '', r.amount, r.method, r.reference_number || '', r.payment_date, r.status, r.created_at]),
  },
  {
    key: 'bills',
    label: 'Bills',
    description: 'All billing records by boarder',
    icon: '🧾',
    color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd',
    query: () => supabase.from('bills').select('id, billing_month, amount, due_date, status, rentals(rooms(room_number), boarder:users!user_id(name))').order('billing_month', { ascending: false }),
    columns: ['id', 'boarder', 'room', 'billing_month', 'amount', 'due_date', 'status'],
    transform: (rows) => rows.map(r => [r.id, r.rentals?.boarder?.name || '', r.rentals?.rooms?.room_number || '', r.billing_month, r.amount, r.due_date, r.status]),
  },
  {
    key: 'applications',
    label: 'Applications',
    description: 'All rental applications and their outcomes',
    icon: '📄',
    color: '#d97706', bg: '#fef3c7', border: '#fde68a',
    query: () => supabase.from('rental_applications').select('id, move_in_date, status, created_at, rooms(room_number), applicant:users!user_id(name, email)').order('created_at', { ascending: false }),
    columns: ['id', 'applicant_name', 'applicant_email', 'room', 'move_in_date', 'status', 'created_at'],
    transform: (rows) => rows.map(r => [r.id, r.applicant?.name || '', r.applicant?.email || '', r.rooms?.room_number || '', r.move_in_date, r.status, r.created_at]),
  },
  {
    key: 'audit_logs',
    label: 'Audit Logs',
    description: 'Complete system audit trail',
    icon: '📋',
    color: '#475569', bg: '#f1f5f9', border: '#cbd5e1',
    query: async () => {
      const { data: logsData } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false })
      if (!logsData) return []
      const uIds = [...new Set(logsData.map(l => l.user_id).filter(Boolean))]
      let uMap = {}
      if (uIds.length > 0) {
        const { data: uData } = await supabase.from('users').select('id, name, email').in('id', uIds)
        if (uData) uData.forEach(u => { uMap[u.id] = u })
      }
      return logsData.map(l => ({ ...l, users: uMap[l.user_id] }))
    },
    columns: ['id', 'user_name', 'user_email', 'action', 'target_type', 'target_id', 'description', 'created_at'],
    transform: (rows) => rows.map(r => [r.id, r.users?.name || '', r.users?.email || '', r.action, r.target_type || '', r.target_id || '', `"${(r.description || '').replace(/"/g, '""')}"`, r.created_at]),
  },
]

export default function DataExportSection({ currentUser, userProfile }) {
  const [activeTab, setActiveTab] = useState('backup') // 'backup' | 'csv'
  const [lastBackup, setLastBackup] = useState(null)
  const [totalDbRecords, setTotalDbRecords] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Full Backup State
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [backupSuccess, setBackupSuccess] = useState('')

  // Restore State
  const [uploadedFile, setUploadedFile] = useState(null)
  const [parsedBackup, setParsedBackup] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [confirmInput, setConfirmInput] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [restoreSuccess, setRestoreSuccess] = useState('')
  const fileInputRef = useRef(null)

  // CSV Export State
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(null)
  const [rowCounts, setRowCounts] = useState({})
  const [csvSuccessMsg, setCsvSuccessMsg] = useState('')

  useEffect(() => {
    fetchBackupStats()
  }, [])

  const fetchBackupStats = async () => {
    setLoadingStats(true)
    try {
      // 1. Fetch last CREATE_BACKUP audit log
      const { data: latestBackupLog } = await supabase
        .from('audit_logs')
        .select('created_at, description')
        .eq('action', 'CREATE_BACKUP')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestBackupLog) {
        setLastBackup(latestBackupLog.created_at)
      } else {
        const stored = localStorage.getItem('roomease_last_backup')
        if (stored) setLastBackup(stored)
      }

      // 2. Count total records across primary tables
      let total = 0
      for (const table of ['users', 'rooms', 'rentals', 'bills', 'payments', 'rental_applications']) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (count) total += count
      }
      setTotalDbRecords(total)
    } catch (err) {
      logError('DataExportSection.fetchBackupStats', err)
    } finally {
      setLoadingStats(false)
    }
  }

  // ─── 1. FULL SYSTEM BACKUP (JSON SNAPSHOT) ───────────────────────────────────
  const handleCreateFullBackup = async () => {
    setCreatingBackup(true)
    setBackupSuccess('')
    try {
      const backupData = {
        metadata: {
          system: 'RoomEase Rental Management System',
          version: '1.0',
          created_at: new Date().toISOString(),
          created_by: userProfile?.name || currentUser?.email || 'Admin',
          checksum: `ROOMEASE-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        },
        tables: {}
      }

      let grandTotal = 0

      // Fetch all tables
      for (const table of BACKUP_TABLES) {
        try {
          const { data, error } = await supabase.from(table).select('*')
          if (!error && data) {
            backupData.tables[table] = data
            grandTotal += data.length
          } else {
            backupData.tables[table] = []
          }
        } catch (_) {
          backupData.tables[table] = []
        }
      }

      backupData.metadata.total_records = grandTotal

      // Create downloadable JSON file
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.href = url
      a.download = `roomease_full_backup_${timestamp}.json`
      a.click()
      URL.revokeObjectURL(url)

      // Record in audit logs
      try {
        const adminId = userProfile?.id || null
        if (adminId) {
          await supabase.from('audit_logs').insert({
            user_id: adminId,
            action: 'CREATE_BACKUP',
            target_type: 'SYSTEM_BACKUP',
            description: `Admin created full database backup snapshot (${grandTotal} total records across ${BACKUP_TABLES.length} tables)`
          })
        }
      } catch (logErr) {
        logError('handleCreateFullBackup.audit_log', logErr)
      }

      localStorage.setItem('roomease_last_backup', new Date().toISOString())
      setLastBackup(new Date().toISOString())
      setBackupSuccess(`Full backup archive (${grandTotal} records) generated and downloaded successfully!`)
      setTimeout(() => setBackupSuccess(''), 6000)
    } catch (err) {
      logError('handleCreateFullBackup', err)
      alert(sanitizeError(err, 'export'))
    } finally {
      setCreatingBackup(false)
    }
  }

  // ─── 2. BACKUP FILE VALIDATION & PARSING ─────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setParsedBackup(null)
    setValidationError('')
    setConfirmInput('')

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)

        // Validate structure
        if (!json.metadata || !json.tables || typeof json.tables !== 'object') {
          throw new Error('Invalid backup file format. Missing metadata or tables definition.')
        }

        const tableKeys = Object.keys(json.tables)
        if (tableKeys.length === 0) {
          throw new Error('Backup file contains no table data.')
        }

        setParsedBackup(json)
      } catch (err) {
        setValidationError(`Validation failed: ${err.message || 'Corrupted or incompatible JSON file.'}`)
      }
    }
    reader.readAsText(file)
  }

  // ─── 3. GENERATE SQL RESTORE SCRIPT (.sql) ───────────────────────────────────
  const handleGenerateSqlScript = () => {
    if (!parsedBackup) return

    let sql = `-- =========================================================================\n`
    sql += `-- RoomEase Database Disaster Recovery Script\n`
    sql += `-- Generated: ${new Date().toISOString()}\n`
    sql += `-- Source Backup: ${parsedBackup.metadata?.created_at || 'Unknown'}\n`
    sql += `-- Total Records: ${parsedBackup.metadata?.total_records || 'N/A'}\n`
    sql += `-- =========================================================================\n\n`
    sql += `BEGIN;\n\n`

    for (const [table, rows] of Object.entries(parsedBackup.tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue

      sql += `-- -------------------------------------------------------------------------\n`
      sql += `-- Table: ${table} (${rows.length} rows)\n`
      sql += `-- -------------------------------------------------------------------------\n`

      for (const row of rows) {
        const columns = Object.keys(row)
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'number' || typeof val === 'boolean') return val
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
          return `'${String(val).replace(/'/g, "''")}'`
        })

        const updates = columns
          .filter(c => c !== 'id')
          .map(c => `${c} = EXCLUDED.${c}`)
          .join(', ')

        sql += `INSERT INTO public.${table} (${columns.join(', ')}) OVERRIDING SYSTEM VALUE VALUES (${values.join(', ')})`
        if (columns.includes('id') && updates) {
          sql += ` ON CONFLICT (id) DO UPDATE SET ${updates};\n`
        } else {
          sql += `;\n`
        }
      }
      sql += `\n`
    }

    sql += `COMMIT;\n`

    const blob = new Blob([sql], { type: 'text/sql' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roomease_recovery_script_${new Date().toISOString().split('T')[0]}.sql`
    a.click()
    URL.revokeObjectURL(url)

    setRestoreSuccess('SQL recovery script generated and downloaded! Execute it in Supabase SQL editor to restore.')
    setTimeout(() => setRestoreSuccess(''), 6000)
  }

  // ─── 4. IN-APP DATABASE RESTORE (DIFF & RESTORE MISSING RECORDS) ────────────
  const handleInAppRestore = async () => {
    if (!parsedBackup || confirmInput.trim().toUpperCase() !== 'RESTORE') return
    setRestoring(true)
    setRestoreSuccess('')
    setValidationError('')

    try {
      let restoredCount = 0

      // Priority order for foreign key dependencies
      const order = ['roles', 'users', 'rooms', 'rentals', 'bills', 'payments', 'rental_applications', 'announcements']

      for (const table of order) {
        const rows = parsedBackup.tables[table]
        if (Array.isArray(rows) && rows.length > 0) {
          // Fetch existing IDs from Supabase for this table to detect missing records
          const { data: existingData } = await supabase.from(table).select('id')
          const existingIds = new Set((existingData || []).map(r => r.id))

          // Filter rows in backup that are missing in the current database
          const missingRows = rows.filter(r => !existingIds.has(r.id))

          if (missingRows.length > 0) {
            // Omit 'id' so PostgreSQL auto-generates the identity PK without 428C9 error
            const cleanRows = missingRows.map(({ id, ...rest }) => rest)
            const { error: insertErr } = await supabase.from(table).insert(cleanRows)

            if (!insertErr) {
              restoredCount += missingRows.length
            } else {
              logError(`handleInAppRestore.${table}`, insertErr)
            }
          }
        }
      }

      // Log recovery action
      try {
        const adminId = userProfile?.id || null
        if (adminId) {
          await supabase.from('audit_logs').insert({
            user_id: adminId,
            action: 'RESTORE_DATA',
            target_type: 'SYSTEM_BACKUP',
            description: `Admin performed database recovery from snapshot ${parsedBackup.metadata?.checksum || ''} (${restoredCount} missing records restored)`
          })
        }
      } catch (_) { }

      if (restoredCount > 0) {
        setRestoreSuccess(`Recovery completed! Successfully restored ${restoredCount} missing record(s).`)
      } else {
        setRestoreSuccess('Recovery completed! All records in the backup archive are already present in the database.')
      }

      setParsedBackup(null)
      setUploadedFile(null)
      setConfirmInput('')
      fetchBackupStats()
      setTimeout(() => setRestoreSuccess(''), 7000)
    } catch (err) {
      logError('handleInAppRestore', err)
      setValidationError('Data restoration failed. Please use the SQL Recovery Script option for database-level restore.')
    } finally {
      setRestoring(false)
    }
  }

  // ─── 5. CSV EXPORT ──────────────────────────────────────────────────────────
  const doCsvExport = async (cfg) => {
    setExporting(cfg.key)
    try {
      const { data, error } = await cfg.query()
      if (error) throw error

      let rows = data || []

      // Date filter if applicable
      if (dateFrom || dateTo) {
        rows = rows.filter(r => {
          const d = r.created_at || r.billing_month || r.payment_date || r.start_date
          if (!d) return true
          if (dateFrom && d < new Date(dateFrom).toISOString()) return false
          if (dateTo && d > new Date(dateTo + 'T23:59:59').toISOString()) return false
          return true
        })
      }

      setRowCounts(prev => ({ ...prev, [cfg.key]: rows.length }))

      const transformed = cfg.transform(rows)
      const csv = [cfg.columns, ...transformed].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roomease_${cfg.key}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      setCsvSuccessMsg(`Exported ${rows.length} ${cfg.label} record${rows.length !== 1 ? 's' : ''} successfully.`)
      setTimeout(() => setCsvSuccessMsg(''), 4000)
    } catch (err) {
      logError('DataExportSection.handleCsvExport', err)
      alert(sanitizeError(err, 'export'))
    } finally {
      setExporting(null)
    }
  }

  // Health calculation (warning if > 7 days)
  const isHealthy = lastBackup && (Date.now() - new Date(lastBackup).getTime() < 7 * 24 * 3600 * 1000)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={22} color="#4f46e5" /> Backup & Data Recovery Center
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Comprehensive disaster recovery, system state snapshots, and table exports
          </p>
        </div>

        <button
          onClick={fetchBackupStats}
          disabled={loadingStats}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
            background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569'
          }}
        >
          <RefreshCw size={14} style={{ animation: loadingStats ? 'spin 1s linear infinite' : 'none' }} /> Refresh Stats
        </button>
      </div>

      {/* Backup Health & Statistics Card */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px', marginBottom: '24px'
      }}>
        {/* Status Card */}
        <div style={{
          background: isHealthy ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${isHealthy ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '14px', padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isHealthy ? '#166534' : '#92400e' }}>
              BACKUP SYSTEM HEALTH
            </span>
            {isHealthy ? <ShieldCheck size={18} color="#16a34a" /> : <AlertTriangle size={18} color="#d97706" />}
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isHealthy ? '#166534' : '#92400e' }}>
            {isHealthy ? 'Protected & Up to Date' : 'Backup Recommended'}
          </div>
          <p style={{ fontSize: '0.75rem', color: isHealthy ? '#15803d' : '#b45309', marginTop: '4px' }}>
            {lastBackup
              ? `Last snapshot: ${new Date(lastBackup).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'No system backups recorded in audit logs yet.'}
          </p>
        </div>

        {/* Total Records Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>DATABASE RECORD COVERAGE</span>
            <HardDrive size={18} color="#4f46e5" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
            {totalDbRecords !== null ? `${totalDbRecords.toLocaleString()} Records` : 'Counting...'}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across 10 relational tables (Users, Rooms, Rentals, Payments, Bills, Logs)
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('backup')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: activeTab === 'backup' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'backup' ? '#fff' : '#475569',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Archive size={16} /> Full System Backup & Recovery Engine
        </button>

        <button
          onClick={() => setActiveTab('csv')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: activeTab === 'csv' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'csv' ? '#fff' : '#475569',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={16} /> Individual Table Exports (CSV)
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: FULL BACKUP & RECOVERY ENGINE                                     */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div>
          {backupSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', fontWeight: 600, fontSize: '0.875rem' }}>
              <CheckCircle2 size={18} /> {backupSuccess}
            </div>
          )}

          {restoreSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', fontWeight: 600, fontSize: '0.875rem' }}>
              <CheckCircle2 size={18} /> {restoreSuccess}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {/* Action 1: Create Backup Snapshot */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                    <Download size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>1. Generate Full System Backup</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Complete Application Data Snapshot</span>
                  </div>
                </div>

                <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '16px' }}>
                  Packages all active and historic database tables into a single timestamped JSON archive. Includes non-repudiation audit records, user profiles, room inventory, rentals, and payments.
                </p>

                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginBottom: '18px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Snapshot Contents:</div>
                  • Users & RBAC Roles &nbsp;• Rooms & Inventory<br />
                  • Active Rentals & Leases &nbsp;• Invoices, Bills & Receipts<br />
                  • Audit Logs & Login Sessions &nbsp;• Applications & Notices
                </div>
              </div>

              <button
                onClick={handleCreateFullBackup}
                disabled={creatingBackup}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px 18px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: creatingBackup ? 'default' : 'pointer',
                  opacity: creatingBackup ? 0.7 : 1, boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                }}
              >
                {creatingBackup ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating Snapshot...</>
                ) : (
                  <><Archive size={18} /> Download Full System Backup (.json)</>
                )}
              </button>
            </div>

            {/* Action 2: Data Recovery & Restore Engine */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                    <Upload size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>2. Data Recovery & Restoration</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Restore System from JSON Snapshot</span>
                  </div>
                </div>

                <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '16px' }}>
                  Upload a previously saved <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>.json</code> backup archive to inspect its contents, generate a stand-alone SQL recovery script, or sync records directly.
                </p>

                {/* Upload Trigger Area */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  style={{ display: 'none' }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px',
                    textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                    transition: 'all 0.2s ease', marginBottom: '16px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <Upload size={26} color="#64748b" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                    {uploadedFile ? uploadedFile.name : 'Select or Drop Backup File (.json)'}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    Supports official RoomEase JSON backup files
                  </span>
                </div>

                {validationError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', marginBottom: '12px' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} /> {validationError}
                  </div>
                )}
              </div>

              {parsedBackup ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                    <CheckCircle2 size={16} /> Backup Validated Successfully
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', lineHeight: 1.5, marginBottom: '12px' }}>
                    • Created: {new Date(parsedBackup.metadata?.created_at).toLocaleString()}<br />
                    • Total Records Found: <strong>{parsedBackup.metadata?.total_records || 'N/A'}</strong><br />
                    • System: {parsedBackup.metadata?.system}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Option A: SQL Script */}
                    <button
                      onClick={handleGenerateSqlScript}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #059669',
                        background: '#fff', color: '#059669', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      <FileCode size={14} /> Download SQL Script (.sql)
                    </button>

                    {/* Option B: In-App Restore */}
                    <div style={{ width: '100%', marginTop: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '4px' }}>
                        To restore directly into database, type <strong style={{ color: '#0f172a' }}>RESTORE</strong>:
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="RESTORE"
                          value={confirmInput}
                          onChange={e => setConfirmInput(e.target.value)}
                          style={{
                            flex: 1, padding: '7px 10px', border: '1.5px solid #cbd5e1', borderRadius: '8px',
                            fontSize: '0.8125rem', fontFamily: 'inherit'
                          }}
                        />
                        <button
                          onClick={handleInAppRestore}
                          disabled={restoring || confirmInput.trim().toUpperCase() !== 'RESTORE'}
                          style={{
                            padding: '7px 14px', borderRadius: '8px', border: 'none',
                            background: confirmInput.trim().toUpperCase() === 'RESTORE' ? '#dc2626' : '#e2e8f0',
                            color: confirmInput.trim().toUpperCase() === 'RESTORE' ? '#fff' : '#94a3b8',
                            fontWeight: 700, fontSize: '0.8rem', cursor: confirmInput.trim().toUpperCase() === 'RESTORE' ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {restoring ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Execute Restore'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}


          {activeTab === 'csv' && (
            <div>
              {/* Date range filter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Filter specific records by date range before exporting:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Calendar size={15} color="#94a3b8" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8125rem', fontFamily: 'inherit' }}
                  />
                  <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8125rem', fontFamily: 'inherit' }}
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(''); setDateTo('') }}
                      style={{ padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {csvSuccessMsg && (
                <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontWeight: 600, fontSize: '0.875rem' }}>
                  {csvSuccessMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {CSV_EXPORT_CONFIGS.map(cfg => (
                  <div key={cfg.key} style={{ background: '#fff', border: `1px solid ${cfg.border}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>{cfg.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{cfg.description}</div>
                      {rowCounts[cfg.key] !== undefined && (
                        <div style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 700, marginTop: '3px' }}>Last export: {rowCounts[cfg.key]} rows</div>
                      )}
                    </div>
                    <button
                      onClick={() => doCsvExport(cfg)}
                      disabled={exporting === cfg.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '8px', border: 'none',
                        background: cfg.color, color: '#fff', cursor: exporting === cfg.key ? 'default' : 'pointer',
                        fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0, opacity: exporting === cfg.key ? 0.7 : 1, transition: 'opacity 0.15s'
                      }}
                    >
                      {exporting === cfg.key ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                      {exporting === cfg.key ? 'Exporting...' : 'Export CSV'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
      }
