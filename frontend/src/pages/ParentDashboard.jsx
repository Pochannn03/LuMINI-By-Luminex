import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/parent_dashboard.css";

// HELPER: Data for "Recent Updates"
const RECENT_UPDATES = [
  {
    id: 1,
    type: "warning", 
    icon: "campaign",
    title: "Early Dismissal",
    desc: "Classes end at 1:00 PM today due to faculty meeting.",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "success",
    icon: "event",
    title: "Parent-Teacher Conference",
    desc: "Schedule posted. Check your calendar.",
    time: "Yesterday",
  },
];

export default function ParentDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- HANDLER: Toggle State ---
  const toggleSidebar = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };
  
  // --- EFFECT: Manage the global document.body class and handle resize ---
  useEffect(() => {
    const checkViewportAndSetBodyClass = () => {
        const isDesktop = window.innerWidth >= 1024;
        
        if (isSidebarOpen && isDesktop) {
            // DESKTOP: Apply 'sidebar-open' for content shift
            document.body.classList.add("sidebar-open");
        } else {
            // MOBILE or CLOSED: Ensure the class is removed
            document.body.classList.remove("sidebar-open");
        }
    };

    // 1. Initial check and anytime isSidebarOpen changes
    checkViewportAndSetBodyClass();
    
    // 2. Attach listener for screen resize (to switch between desktop/mobile logic)
    window.addEventListener('resize', checkViewportAndSetBodyClass);
    
    // 3. Cleanup function: runs on component unmount
    return () => {
        document.body.classList.remove("sidebar-open");
        window.removeEventListener('resize', checkViewportAndSetBodyClass);
    };
  }, [isSidebarOpen]); 

  // --- DYNAMIC CLASS CALCULATION ---
  // We use this logic for rendering the Sidebar and Overlay classes
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  
  let sidebarClasses = "sidebar";
  let overlayClasses = "nav-overlay";
  
  if (isSidebarOpen) {
    if (isDesktop) {
      // Desktop: Uses 'expanded' class
      sidebarClasses += " expanded";
      // Overlay is not visible on desktop
    } else {
      // Mobile: Uses 'active' class
      sidebarClasses += " active";
      overlayClasses += " active";
    }
  }

  return (
    <div className="dashboard-wrapper">
      
      {/* --- HEADER --- */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            id="burgerIconOpenNav"
            className="icon-btn"
            onClick={toggleSidebar}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        <div className="header-right">
          <button className="icon-btn notification-btn">
            <span className="material-symbols-outlined">notifications</span>
            <span className="notification-badge"></span>
          </button>

          <div className="header-separator"></div>

          <div className="user-profile">
            <img
              className="profile-avatar"
              src="/assets/placeholder_image.jpg"
              alt="Profile"
            />
            <span className="user-name">Sarah Chen</span>
          </div>
        </div>
      </header>

      {/* --- OVERLAY & SIDEBAR --- */}
      {/* The overlay click handler closes the menu in both desktop (if applicable) and mobile */}
      <div 
        className={overlayClasses} 
        onClick={toggleSidebar} 
      ></div>

      <aside 
        className={sidebarClasses} 
        id="sideNavBar"
      >
        <div className="sidebar-header">
          <img src="../assets/lumini-logo.png" alt="Lumini" className="sidebar-logo" />
        </div>

        <nav className="sidebar-menu">
          <Link to="/dashboard" className="nav-item active">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>

          <Link to="/pickup-history" className="nav-item">
            <span className="material-symbols-outlined">history</span>
            <span>Pickup History</span>
          </Link>

          <Link to="/manage-guardians" className="nav-item">
            <span className="material-symbols-outlined">manage_accounts</span>
            <span>Manage Guardians</span>
          </Link>

          <Link to="/profile" className="nav-item">
            <span className="material-symbols-outlined">person</span>
            <span>Profile</span>
          </Link>
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content">
        <section className="welcome-banner">
          <div>
            <h1>Good Afternoon, Sarah!</h1>
            <p>Here is the daily status for your children.</p>
          </div>
        </section>

        <div className="dashboard-grid">
          
          {/* --- LEFT COLUMN --- */}
          <div className="grid-column-left">
            
            {/* CARD: Visual Status Tracker */}
            <div className="card visual-status-card">
              <div className="visual-profile-section">
                <div className="avatar-ring">
                  <img
                    src="/assets/placeholder_image.jpg"
                    className="visual-avatar"
                    alt="Child"
                  />
                </div>
                <h2 className="visual-name">Mia Chen</h2>
                <span className="visual-grade">Kindergarten - Class A</span>
              </div>

              <div className="status-tracker-container">
                <div className="tracker-line"></div>

                {/* Step 1: Completed (Mia is On Way) */}
                <div className="tracker-step completed">
                  <div className="step-circle">
                    <span className="material-symbols-outlined">directions_walk</span>
                  </div>
                  <span className="step-label">On Way</span>
                </div>

                {/* Step 2: Active (Mia is Learning) */}
                <div className="tracker-step active">
                  <div className="step-circle">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <span className="step-label">Learning</span>
                </div>

                {/* Step 3: Pending */}
                <div className="tracker-step">
                  <div className="step-circle">
                    <span className="material-symbols-outlined">home</span>
                  </div>
                  <span className="step-label">Dismissed</span>
                </div>
              </div>

              <div className="current-status-badge">Learning at School</div>
            </div>

            {/* CARD: Quick Actions */}
            <div className="card action-card">
              <div className="clean-header">
                <div className="header-title-row">
                  <span className="material-symbols-outlined header-icon blue-icon">tune</span>
                  <h2>Quick Actions</h2>
                </div>
                <p className="header-desc">Access the most important tasks instantly.</p>
              </div>

              <div className="quick-actions-list">
                <button className="quick-action-item">
                  <div className="qa-icon">
                    <span className="material-symbols-outlined">group</span>
                  </div>
                  <div className="qa-content">
                    <span className="qa-title">Guardian Management</span>
                    <span className="qa-desc">Manage authorized guardians for Alice</span>
                  </div>
                  <span className="material-symbols-outlined arrow">chevron_right</span>
                </button>

                <button className="quick-action-item">
                  <div className="qa-icon">
                    <span className="material-symbols-outlined">history</span>
                  </div>
                  <div className="qa-content">
                    <span className="qa-title">Pickup History</span>
                    <span className="qa-desc">View past pickups and approvals</span>
                  </div>
                  <span className="material-symbols-outlined arrow">chevron_right</span>
                </button>

                <button className="quick-action-item">
                  <div className="qa-icon">
                    <span className="material-symbols-outlined">notification_important</span>
                  </div>
                  <div className="qa-content">
                    <span className="qa-title">Report Absence</span>
                    <span className="qa-desc">Notify school about absence or delay</span>
                  </div>
                  <span className="material-symbols-outlined arrow">chevron_right</span>
                </button>

                <button className="quick-action-item danger-item">
                  <div className="qa-icon">
                    <span className="material-symbols-outlined">e911_emergency</span>
                  </div>
                  <div className="qa-content">
                    <span className="qa-title">Emergency Override</span>
                  </div>
                  <span className="material-symbols-outlined arrow">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN --- */}
          <div className="grid-column-right">
            
            {/* CARD: Initiate Pickup */}
            <div className="card initiate-pickup-card">
              <div className="pickup-header">
                <h2>Initiate Pickup</h2>
                <p>
                  Scan the school's entry QR code to begin the pickup process and
                  generate your dynamic pickup pass.
                </p>
              </div>

              <div className="pickup-illustration">
                <img src="/assets/illustration_scan_qr.png" alt="Scan QR Illustration" />
              </div>

              <button className="btn btn-primary big-scan-btn">
                Scan Entry QR
              </button>
            </div>

            {/* CARD: Update Status */}
            <div className="card action-card">
              <div className="clean-header">
                <div className="header-title-row">
                  <span className="material-symbols-outlined header-icon yellow-icon">update</span>
                  <h2>Update Status</h2>
                </div>
                <p className="header-desc">
                  Keep the school and parents informed about your arrival progress.
                </p>
              </div>

              <div className="status-options-container">
                <button className="status-option-btn status-blue">
                  <span>On the Way</span>
                  <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                </button>

                <button className="status-option-btn status-green">
                  <span>At School</span>
                  <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                </button>

                <button className="status-option-btn status-red">
                  <span>Running late</span>
                  <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                </button>
              </div>
            </div>

            {/* CARD: Recent Updates (Notifications) */}
            <div className="card queue-card">
              <div className="clean-header">
                <div className="header-title-row">
                  <span className="material-symbols-outlined header-icon purple-icon">notifications_active</span>
                  <h2>Recent Updates</h2>
                </div>
              </div>

              <div className="queue-list-container">
                {RECENT_UPDATES.map((update) => (
                  <div className="queue-item" key={update.id}>
                    <div className={`icon-box-small ${update.type}`}>
                      <span className="material-symbols-outlined">{update.icon}</span>
                    </div>
                    <div className="queue-info">
                      <span className="q-name">{update.title}</span>
                      <span className="q-action">{update.desc}</span>
                      <span className="q-time">{update.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}