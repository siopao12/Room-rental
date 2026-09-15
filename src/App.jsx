import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import RoomFilter from './components/RoomFilter'
import RoomCard from './components/RoomCard'
import RoomDetailsModal from './components/RoomDetailsModal'
import AuthModal from './components/AuthModal'
import ResetPasswordModal from './components/ResetPasswordModal'
import RentalApplicationModal from './components/RentalApplicationModal'
import MyApplicationsModal from './components/MyApplicationsModal'

import Footer from './components/Footer'
import LandlordDashboard from './pages/landlord/LandlordDashboard'
import BoarderDashboard from './pages/boarder/BoarderDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import { supabase } from './lib/supabaseClient'
import { decryptObject } from './lib/encryptionHelper'
import { Search, CreditCard, Bell, Phone, Mail, Loader2 } from 'lucide-react'
import NotFoundPage from './pages/NotFoundPage'
import { useSessionSecurity } from './hooks/useSessionSecurity'
import SessionTimeoutModal from './components/SessionTimeoutModal'
import SessionExpiredModal from './components/SessionExpiredModal'
import AccountDeactivatedModal from './components/AccountDeactivatedModal'
import { recordLoginEvent, recordLogoutEvent } from './lib/authActivityHelper'

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Wraps a route so that:
//  1. Unauthenticated users are sent to / immediately.
//  2. Authenticated users with a WRONG role are also sent to /.
//  3. A full-screen spinner is shown while the session + role check is in flight,
//     preventing any dashboard UI from flashing before access is confirmed.
//
// allowedRoles: string[]  — e.g. ['Admin'], ['Landlord'], ['Boarder']
// ─────────────────────────────────────────────────────────────────────────────
function ProtectedRoute({ element, allowedRoles }) {
  const [status, setStatus] = useState('checking') // 'checking' | 'allowed' | 'denied' | 'forbidden'

  useEffect(() => {
    let cancelled = false

    async function verify() {
      try {
        // 1. Check if a valid Supabase session exists
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          if (!cancelled) setStatus('denied')   // not logged in → redirect to /
          return
        }

        // 2. Fetch the user's role from the DB
        const { data: profile } = await supabase
          .from('users')
          .select('is_active, roles(name)')
          .eq('auth_id', session.user.id)
          .maybeSingle()

        if (cancelled) return

        if (profile && profile.is_active === false) {
          await supabase.auth.signOut()
          if (!cancelled) setStatus('denied')
          return
        }

        const roleName = profile?.roles?.name || ''
        if (allowedRoles.includes(roleName)) {
          setStatus('allowed')    // correct role → render the dashboard
        } else {
          setStatus('forbidden')  // wrong role → redirect to /
        }
      } catch {
        if (!cancelled) setStatus('denied')
      }
    }

    verify()
    return () => { cancelled = true }
  }, [allowedRoles])

  if (status === 'checking') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        gap: '16px'
      }}>
        <Loader2 size={40} color="#a5b4fc" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#a5b4fc', fontSize: '0.95rem', fontWeight: 600 }}>Verifying access...</p>
      </div>
    )
  }

  if (status === 'denied') {
    // Not logged in — show 404 (doesn't reveal the route exists)
    return <NotFoundPage type="unauthorized" />
  }

  if (status === 'forbidden') {
    // Wrong role — also show 404 for security (obscures route existence)
    return <NotFoundPage type="forbidden" />
  }

  return element
}

const INITIAL_ROOMS = [
  {
    id: 1,
    name: 'Room 101 — Cozy Single',
    type: 'single',
    price: 3500,
    size: '15 m²',
    capacity: '1 Person',
    floor: '1st Floor',
    amenities: ['Free Wi-Fi', 'Private Bath', 'Study Desk', 'Single Bed', 'Closet'],
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop',
    description: 'Compact single room with private bathroom and dedicated desk area. Perfect for students and solo renters.',
    status: 'available'
  },
  {
    id: 2,
    name: 'Room 102 — Standard Single',
    type: 'single',
    price: 4000,
    size: '18 m²',
    capacity: '1 Person',
    floor: '1st Floor',
    amenities: ['Free Wi-Fi', 'Aircon', 'Study Desk', 'Shared Kitchen', 'Water Heater'],
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=400&fit=crop',
    description: 'Well-lit single room with desk, closet, aircon, and shared kitchen access.',
    status: 'available'
  },
  {
    id: 3,
    name: 'Room 201 — Double Room',
    type: 'double',
    price: 5500,
    size: '24 m²',
    capacity: '2 Persons',
    floor: '2nd Floor',
    amenities: ['Free Wi-Fi', 'Aircon', 'Twin Beds', 'Ensuite Bath', 'Balcony Access'],
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600&h=400&fit=crop',
    description: 'Spacious double room equipped with twin beds, air conditioning, and ensuite bath.',
    status: 'occupied'
  },
  {
    id: 4,
    name: 'Room 202 — Deluxe Double',
    type: 'double',
    price: 6000,
    size: '28 m²',
    capacity: '2 Persons',
    floor: '2nd Floor',
    amenities: ['Free Wi-Fi', 'Aircon', 'Private Balcony', 'Mini Fridge', 'Private Bath', 'Smart TV'],
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=400&fit=crop',
    description: 'Premium double room featuring a scenic balcony view, private bath, mini fridge, and high-speed Wi-Fi.',
    status: 'available'
  },
  {
    id: 5,
    name: 'Room 301 — Executive Suite',
    type: 'suite',
    price: 8500,
    size: '40 m²',
    capacity: '2-3 Persons',
    floor: '3rd Floor',
    amenities: ['Free Wi-Fi', 'Aircon', 'Living Area', 'Kitchenette', 'Private Bath', 'Balcony'],
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=533&fit=crop',
    description: 'Luxury executive suite with separate lounge area, fully equipped kitchenette, private bath, and top views.',
    status: 'available'
  },
  {
    id: 6,
    name: 'Room 302 — Family Suite',
    type: 'suite',
    price: 9500,
    size: '50 m²',
    capacity: '3-4 Persons',
    floor: '3rd Floor',
    amenities: ['Free Wi-Fi', 'Aircon', '2 Bedrooms', 'Full Kitchen', 'Private Bath', 'Dining Area'],
    image: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&h=400&fit=crop',
    description: 'Expansive family suite with two bedrooms, living & dining space, full kitchen, and premium amenities.',
    status: 'occupied'
  }
]

function LandingPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState(INITIAL_ROOMS)
  const [filter, setFilter] = useState('all')
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState('login')
  const [authModalSuccessMsg, setAuthModalSuccessMsg] = useState('')
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [myApplicationsOpen, setMyApplicationsOpen] = useState(false)
  const [selectedDetailRoom, setSelectedDetailRoom] = useState(null)
  const [applicationRoom, setApplicationRoom] = useState(null) // Room currently being applied for
  const [pendingBookingRoom, setPendingBookingRoom] = useState(null) // Room stored before login


  // Fetch rooms from Supabase
  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase.from('rooms').select('*').order('id', { ascending: true })
      if (!error && data && data.length > 0) {
        const formatted = data.map(r => ({
          id: r.id,
          name: r.room_number || r.name,
          type: (r.room_type || r.type || 'single').toLowerCase(),
          price: r.monthly_rent || r.price,
          size: r.size || (r.room_type === 'suite' ? '45 m²' : r.room_type === 'double' ? '25 m²' : '16 m²'),
          capacity: r.capacity ? `${r.capacity} Person${r.capacity > 1 ? 's' : ''}` : '1 Person',
          floor: r.floor || '1st Floor',
          amenities: r.amenities || (
            r.room_type === 'suite'
              ? ['Free Wi-Fi', 'Aircon', 'Living Area', 'Kitchenette', 'Private Bath', 'Balcony']
              : r.room_type === 'double'
                ? ['Free Wi-Fi', 'Aircon', 'Twin Beds', 'Ensuite Bath', 'Balcony Access']
                : ['Free Wi-Fi', 'Private Bath', 'Study Desk', 'Single Bed', 'Closet']
          ),
          image: r.image_url || r.image,
          description: r.description,
          status: (r.status || 'Available').toLowerCase()
        }))
        setRooms(formatted)
      }
    } catch (err) {
      console.error('Error fetching rooms:', err)
    }
  }

  // Fetch user profile & role
  const fetchUserProfile = async (authUser) => {
    if (!authUser) {
      setUserProfile(null)
      return null
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, roles(*)')
        .eq('auth_id', authUser.id)
        .maybeSingle()

      // If there's a real DB/RLS error, log it and bail — don't auto-create
      if (error) {
        console.error('Error loading user profile (possible RLS issue):', error)
        return null
      }

      if (data && data.is_active === false) {
        await supabase.auth.signOut()
        setUserProfile(null)
        return null
      }

      // Only auto-create if there is truly no matching row AND no error
      if (!data) {
        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({
            auth_id: authUser.id,
            role_id: 4, // Applicant
            name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
            email: authUser.email
          })
          .select('*, roles(*)')
          .single()

        if (createErr) {
          console.error('Error auto-creating user profile:', createErr)
          return null
        }

        // Log the account creation with the real user_id so Admin audit logs show the name
        try {
          await supabase.from('audit_logs').insert({
            user_id: newUser.id,
            action: 'CREATE_USER',
            target_type: 'USERS',
            target_id: newUser.id,
            description: `New user account registered as ${newUser.roles?.name || 'Applicant'}: ${newUser.name || newUser.email}`
          })
        } catch (_) { }

        const decryptedNewUser = decryptObject(newUser, ['phone', 'emergency_contact'])
        setUserProfile(decryptedNewUser)
        return decryptedNewUser
      }

      const decryptedData = decryptObject(data, ['phone', 'emergency_contact'])
      setUserProfile(decryptedData)
      return decryptedData
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }


  useEffect(() => {
    fetchRooms()

    // ── Capture recovery & verification state SYNCHRONOUSLY ──
    const isRecoveryFlow =
      window.location.hash.includes('type=recovery') ||
      window.location.href.includes('type=recovery')

    const isVerificationFlow =
      /type=(signup|email_change|invite|email_confirmation|confirmation)/i.test(
        window.location.hash + window.location.search
      )

    if (isRecoveryFlow) {
      setResetPasswordOpen(true)
    }

    if (isVerificationFlow) {
      // User clicked an email confirmation link from Gmail.
      // Sign out immediately so they are NOT auto-logged in,
      // and prompt them to log in manually.
      supabase.auth.signOut().then(() => {
        setUser(null)
        setUserProfile(null)
        if (window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname)
        } else {
          window.location.hash = ''
        }
        setAuthModalTab('login')
        setAuthModalSuccessMsg('Email verified successfully! Please sign in with your account credentials.')
        setAuthModalOpen(true)
      })
      return
    }

    // On initial load: restore session without causing a flash
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (isVerificationFlow) return

      if (session?.user) {
        if (isRecoveryFlow) {
          setResetPasswordOpen(true)
          return
        }

        const profile = await fetchUserProfile(session.user)
        setUser(session.user)

        const roleName = profile?.roles?.name || ''
        if (roleName === 'Admin') {
          navigate('/admin', { replace: true })
        } else if (roleName === 'Landlord') {
          navigate('/landlord', { replace: true })
        } else if (roleName === 'Boarder') {
          navigate('/boarder', { replace: true })
        }
      } else {
        setUser(null)
      }
    })

    // onAuthStateChange handles sign-out and PASSWORD_RECOVERY events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isVerificationFlow) {
        await supabase.auth.signOut()
        setUser(null)
        setUserProfile(null)
        return
      }
      if (event === 'PASSWORD_RECOVERY') {
        setResetPasswordOpen(true)
      } else if (!session?.user) {
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])


  const filteredRooms = filter === 'all'
    ? rooms
    : rooms.filter(r => r.type === filter)

  // Booking Flow Trigger
  const handleBookRoom = (room) => {
    if (!user) {
      // Store room choice & open Auth Modal
      setPendingBookingRoom(room)
      setAuthModalOpen(true)
    } else {
      // User is logged in -> Open Application Form
      setApplicationRoom(room)
    }
  }

  const handleAuthSuccess = async (authenticatedUser) => {
    const profile = await fetchUserProfile(authenticatedUser)
    const roleName = profile?.roles?.name || ''

    // Record login activity in background (non-blocking)
    recordLoginEvent(authenticatedUser, profile)

    // Redirect dashboard roles immediately to eliminate landing page navbar flash
    if (roleName === 'Admin') {
      navigate('/admin', { replace: true })
      return
    }

    if (roleName === 'Landlord') {
      navigate('/landlord', { replace: true })
      return
    }

    if (roleName === 'Boarder') {
      navigate('/boarder', { replace: true })
      return
    }

    // For Applicants/Guests staying on the landing page:
    setUser(authenticatedUser)

    if (pendingBookingRoom) {
      const targetRoom = pendingBookingRoom
      setPendingBookingRoom(null)
      setTimeout(() => {
        setApplicationRoom(targetRoom)
      }, 300)
    }
  }

  return (
    <div className="app">
      <Navbar
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenApplications={() => setMyApplicationsOpen(true)}
        user={user}
        userProfile={userProfile}
        setUser={setUser}
      />

      <Hero onOpenAuth={() => setAuthModalOpen(true)} />

      {/* Available Rooms Section */}
      <section id="rooms" className="section rooms-section">
        <div className="container">
          <div className="section-header center">
            <span className="section-tag">Accommodations</span>
            <h2 className="section-title">Explore Available Rooms</h2>
            <p className="hero-desc">
            Discover verified single, double, and suite rooms with real-time availability.
            Easily manage bookings, payments, and stay connected with your landlord — all in one place.
          </p>
          </div>

          <RoomFilter currentFilter={filter} setFilter={setFilter} />

          <div className="rooms-grid">
            {filteredRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                onViewDetails={(r) => setSelectedDetailRoom(r)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section id="features" className="section features-section">
        <div className="container">
          <div className="section-header center">
            <span className="section-tag">What We Offer</span>
            <h2 className="section-title">Everything You Need in One Place</h2>
            <p className="section-desc">
              RoomEase makes finding and managing your room rental simple, transparent, and stress-free.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Search size={24} />
              </div>
              <h3>Browse & Book Rooms</h3>
              <p>
                Easily explore available single, double, and suite rooms. View photos, amenities, and pricing — then apply in just a few clicks.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <CreditCard size={24} />
              </div>
              <h3>Track Bills & Payments</h3>
              <p>
                View your monthly bills, submit payment proofs, and keep track of your full payment history all in one dashboard.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Bell size={24} />
              </div>
              <h3>Stay Informed</h3>
              <p>
                Receive real-time notifications and announcements from your landlord so you're always up to date.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section">
        <div className="container">
          <div className="section-header center">
            <span className="section-tag">Get in Touch</span>
            <h2 className="section-title">Contact Management</h2>
            <p className="section-desc">Have questions about room availability or leasing terms?</p>
          </div>

          <div className="features-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Phone color="#2d6a4f" size={24} />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Call Us</h4>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>+63 (02) 8123-4567</p>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Mail color="#2d6a4f" size={24} />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Email Support</h4>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>roomeaserentalservice@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Room Details Modal */}
      {selectedDetailRoom && (
        <RoomDetailsModal
          room={selectedDetailRoom}
          onClose={() => setSelectedDetailRoom(null)}
          onBook={handleBookRoom}
        />
      )}

      {/* Rental Application Form Modal */}
      {applicationRoom && (
        <RentalApplicationModal
          isOpen={!!applicationRoom}
          onClose={() => setApplicationRoom(null)}
          room={applicationRoom}
          currentUser={user}
          onApplicationSubmitted={() => {
            fetchRooms()
            setMyApplicationsOpen(true)
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false)
          setAuthModalSuccessMsg('')
        }}
        onAuthSuccess={handleAuthSuccess}
        initialTab={authModalTab}
        initialSuccessMsg={authModalSuccessMsg}
      />

      {/* Reset Password Modal (Recovery Link) */}
      <ResetPasswordModal
        isOpen={resetPasswordOpen}
        onSuccessRedirect={() => {
          setResetPasswordOpen(false)
          window.location.hash = ''
          window.location.reload()
        }}
      />

      {/* My Applications Modal (Applicant Tracking) */}
      <MyApplicationsModal
        isOpen={myApplicationsOpen}
        onClose={() => setMyApplicationsOpen(false)}
        user={user}
        userProfile={userProfile}
      />
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const {
    showWarning,
    remainingSeconds,
    stayLoggedIn,
    logoutNow,
    expiredNotification,
    dismissExpiredNotification,
    deactivatedNotification,
    dismissDeactivatedNotification
  } = useSessionSecurity({
    onSessionExpired: () => {
      navigate('/', { replace: true })
    },
    onAccountDeactivated: () => {
      navigate('/', { replace: true })
    }
  })

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/landlord"
          element={
            <ProtectedRoute
              element={<LandlordDashboard />}
              allowedRoles={['Landlord']}
            />
          }
        />
        <Route
          path="/boarder"
          element={
            <ProtectedRoute
              element={<BoarderDashboard />}
              allowedRoles={['Boarder']}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              element={<AdminDashboard />}
              allowedRoles={['Admin']}
            />
          }
        />
        {/* Catch-all: genuine unknown routes → 404 */}
        <Route path="*" element={<NotFoundPage type="not-found" />} />
      </Routes>

      {/* Global Inactivity Warning Modal */}
      <SessionTimeoutModal
        isOpen={showWarning}
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={stayLoggedIn}
        onLogout={logoutNow}
      />

      {/* Global Session Expired Modal */}
      <SessionExpiredModal
        isOpen={expiredNotification}
        onClose={dismissExpiredNotification}
        onLoginClick={() => {
          dismissExpiredNotification()
          setAuthModalOpen(true)
        }}
      />

      {/* Global Account Deactivated Security Modal */}
      <AccountDeactivatedModal
        isOpen={deactivatedNotification}
        onClose={dismissDeactivatedNotification}
      />

      {/* Auth Modal if triggered after session expired */}
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={() => setAuthModalOpen(false)}
        />
      )}
    </>
  )
}
