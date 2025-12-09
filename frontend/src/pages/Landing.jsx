import React from "react";
import { Link } from 'react-router-dom';
import logo from "../assets/lumini-logo.png";

export default function Landing() {
  return (
    <>
      <header className="hero-section">
        <nav className="navbar container">
          <span className="nav-brand">Lumini.</span>
          <div className="nav-links">
            <a href="#" className="nav-link">About</a>
            <a href="#" className="nav-link">Contact</a>
          </div>
        </nav>

        <div className="hero-content container">
          <div className="hero-text fade-in-up">
            <span className="pill-badge">Ver 1.0 Release</span>
            <h1>Stay Connected with your School.</h1>
            <p>
              Bridging the gap between parents, teachers, and guardians.
              Experience seamless communication with simple taps.
            </p>  

            <div className="button-group-row">
              <Link to="/login" className="btn btn-primary">Sign In</Link>
              <Link to="/register" className="btn btn-outline">Sign In</Link>
            </div>
          </div>

          <div className="hero-visual fade-in-up delay-1">
            <img src={logo} alt="Lumini App" className="hero-img" />
          </div>
        </div>
      </header>

      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>What we do for you</h2>
            <p>Simplifying school management one check-in at a time.</p>
          </div>

          <div className="cards-grid">
            <div className="feature-card">
              <div className="icon-box">🛡️</div>
              <h3>Secure Identity</h3>
              <p>Ensure only authorized guardians can pick up students.</p>
            </div>

            <div className="feature-card">
              <div className="icon-box">⚡</div>
              <h3>Fast Check-in</h3>
              <p>QR code integration allows for instant attendance logging.</p>
            </div>

            <div className="feature-card">
              <div className="icon-box">📱</div>
              <h3>Real-time Updates</h3>
              <p>Parents get notified instantly when their child arrives safely.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
