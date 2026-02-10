// frontend/src/pages/admin-teacher/ManageApprovals.jsx

import React, { useState, useEffect, useRef } from "react";
import "../../styles/admin-teacher/admin-manage-approvals.css";
import NavBar from "../../components/navigation/NavBar";
import Header from "../../components/navigation/Header";

export default function ManageApprovals() {
  const [activeTab, setActiveTab] = useState("pending");

  // Filter Dropdown State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // --- DUMMY DATA FOR REQUEST CARDS ---
  const [requests] = useState([
    {
      id: 1,
      name: "Maria Santos",
      role: "Grandmother",
      date: "Oct 24, 2025 • 2:30 PM",
      student: "Deonilo Caballes",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
      student_img: null,
    },
    {
      id: 2,
      name: "Robert Fox",
      role: "Driver",
      date: "Oct 24, 2025 • 4:15 PM",
      student: "Carlanee Camoro",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
      student_img: null,
    },
    {
      id: 3,
      name: "Jenny Wilson",
      role: "Aunt",
      date: "Oct 23, 2025 • 9:00 AM",
      student: "Deonilo Caballes",
      avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d",
      student_img: null,
    },
  ]);

  // Update counts based on data
  const pendingCount = requests.length;
  const historyCount = 24;

  // Handle closing dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (type) => {
    console.log(`Sorting by: ${type}`);
    setIsFilterOpen(false); // Close menu after selection
  };

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />

      <main className="main-content">
        <div className="approvals-container">
          {/* 1. HEADER BANNER */}
          <div className="header-banner">
            <div className="header-title">
              <h1>Account Approvals</h1>
              <p>Review and manage registration requests.</p>
            </div>
            {/* Admin Icon Decoration */}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "48px", opacity: 0.8 }}
            >
              verified_user
            </span>
          </div>

          {/* 2. CONTROLS BAR (Tabs + Search + Filter) */}
          <div className="controls-bar">
            {/* LEFT SIDE: Tabs & Search */}
            <div className="controls-left">
              <div className="tab-group">
                <button
                  className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveTab("pending")}
                >
                  Pending Requests
                  {pendingCount > 0 && (
                    <span
                      className="tab-badge"
                      style={{
                        marginLeft: "8px",
                        background: "#ef4444",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  Approval History
                  <span
                    style={{
                      fontSize: "10px",
                      opacity: 0.7,
                      marginLeft: "6px",
                    }}
                  >
                    {historyCount}
                  </span>
                </button>
              </div>

              <div className="search-mini">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px", color: "#94a3b8" }}
                >
                  search
                </span>
                <input type="text" placeholder="Search by name or ID..." />
              </div>
            </div>

            {/* RIGHT SIDE: Filter Dropdown Only */}
            <div className="controls-right" ref={filterRef}>
              <div className="filter-wrapper">
                <button
                  className={`btn-filter ${isFilterOpen ? "active" : ""}`}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <span className="material-symbols-outlined">filter_list</span>
                  Filter
                </button>

                {/* DROPDOWN MENU */}
                {isFilterOpen && (
                  <div className="filter-dropdown-menu">
                    <button
                      className="filter-option"
                      onClick={() => handleSort("surname")}
                    >
                      <span className="material-symbols-outlined">
                        sort_by_alpha
                      </span>
                      Via Surname
                    </button>
                    <button
                      className="filter-option"
                      onClick={() => handleSort("date")}
                    >
                      <span className="material-symbols-outlined">
                        calendar_month
                      </span>
                      Via Date
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. CONTENT AREA (The Grid) */}
          <div className="requests-grid">
            {/* EMPTY STATE */}
            {activeTab === "pending" && requests.length === 0 && (
              <div className="empty-queue">
                <span className="material-symbols-outlined empty-queue-icon">
                  inbox_customize
                </span>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "8px",
                  }}
                >
                  All Caught Up!
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                  There are no pending account requests at the moment.
                </p>
              </div>
            )}

            {/* --- REQUEST CARDS RENDER --- */}
            {activeTab === "pending" &&
              requests.map((req) => (
                <div className="request-card" key={req.id}>
                  {/* CARD HEADER */}
                  <div className="card-header">
                    <img
                      src={req.avatar}
                      alt="Avatar"
                      className="applicant-avatar"
                    />
                    <div className="applicant-info">
                      <h4>{req.name}</h4>
                      <span className="applicant-role">{req.role}</span>
                    </div>
                  </div>

                  {/* CARD BODY */}
                  <div className="card-body">
                    {/* Date Row */}
                    <div className="detail-row">
                      <span className="material-symbols-outlined detail-icon">
                        schedule
                      </span>
                      <div className="detail-content">
                        <label>Requested On</label>
                        <p>{req.date}</p>
                      </div>
                    </div>

                    {/* Student Row */}
                    <div className="detail-row">
                      <span className="material-symbols-outlined detail-icon">
                        child_care
                      </span>
                      <div className="detail-content" style={{ width: "100%" }}>
                        <label>Connected Student</label>
                        <div className="student-badge">
                          <img
                            src="https://via.placeholder.com/30"
                            className="student-avatar-mini"
                            alt="student"
                          />
                          <span>{req.student}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD ACTIONS */}
                  <div className="card-actions">
                    <button className="btn-card btn-reject">Reject</button>
                    <button className="btn-card btn-approve">Approve</button>
                  </div>
                </div>
              ))}

            {/* Placeholder for History */}
            {activeTab === "history" && (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  color: "#94a3b8",
                  padding: "40px",
                }}
              >
                History cards will appear here...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
