import React from 'react'
import { Building2 } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#95d5b2" />
              RoomEase
            </h3>
            <p>
              A simple and reliable room rental management system for landlords, boarders, and administrators.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#rooms">Rooms</a></li>
              <li><a href="#features">What We Offer</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>What We Offer</h4>
            <ul>
              <li><a href="#rooms">Browse Rooms</a></li>
              <li><a href="#features">Manage Payments</a></li>
              <li><a href="#features">Bill Tracking</a></li>
              <li><a href="#features">Announcements</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact Info</h4>
            <ul>
              <li>Room Rental Management</li>
              <li>Email: roomeaserentalservice@gmail.com</li>
              <li>Phone: +63 (02) 8123-4567</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} RoomEase Rental System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
