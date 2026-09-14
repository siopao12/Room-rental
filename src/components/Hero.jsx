import React from 'react'
import { KeyRound, Search, ShieldCheck } from 'lucide-react'

export default function Hero({ onOpenAuth }) {
  return (
    <section id="home" className="hero">
      <div className="hero-bg"></div>
      <div className="hero-overlay"></div>
      <div className="container hero-inner">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px' }} />
            RoomEase Rental Platform
          </div>
          <h1 className="hero-title">
            Smart & Secure Room Rentals Made Effortless
          </h1>
          <p className="hero-desc">
            Discover single, double, and suite rooms with real-time availability.
            Easily manage your bookings, payments, and stay connected with your landlord all in one place.
          </p>
          <div className="hero-buttons">
            <a href="#rooms" className="btn btn-primary">
              <Search size={18} />
              Browse Available Rooms
            </a>
            <button className="btn btn-ghost" onClick={onOpenAuth}>
              <KeyRound size={18} />
              Login
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
