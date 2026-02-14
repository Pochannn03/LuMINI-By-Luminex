// frontend/src/pages/admin-teacher/ManageApprovals.jsx

import React, { useState, useEffect, useRef } from "react";
import "../../styles/admin-teacher/admin-manage-approvals.css";
import NavBar from "../../components/navigation/NavBar";
import Header from "../../components/navigation/Header";

export default function ManageApprovals() {
  const [activeTab, setActiveTab] = useState("pending");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // --- DUMMY DATA WITH AVATARS ---
  const [requests] = useState([
    {
      id: 1,
      parentName: "Sarah Caballes",
      parentAvatar: "https://i.pravatar.cc/150?u=parent1",
      guardianName: "Maria Santos",
      guardianAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
      role: "Grandmother",
      date: "Oct 24, 2025 • 2:30 PM",
      student: "Deonilo Caballes",
    },
    {
      id: 2,
      parentName: "Mark Camoro",
      parentAvatar: "https://i.pravatar.cc/150?u=parent2",
      guardianName: "Robert Fox",
      guardianAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
      role: "Driver",
      date: "Oct 24, 2025 • 4:15 PM",
      student: "Carlanee Camoro",
    },
    {
      id: 3,
      parentName: "Sarah Caballes",
      parentAvatar: "https://i.pravatar.cc/150?u=parent1",
      guardianName: "Jenny Wilson",
      guardianAvatar: "https://i.pravatar.cc/150?u=a04258114e29026302d",
      role: "Aunt",
      date: "Oct 23, 2025 • 9:00 AM",
      student: "Deonilo Caballes",
    },
  ]);

  const pendingCount = requests.length;
  const historyCount = 24;

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (type) => setIsFilterOpen(false);
  const handleCardClick = (req) => setSelectedRequest(req);
  const handleApprove = (id) => alert(`Approved request ID: ${id}`);
  const handleReject = (id) => alert(`Rejected request ID: ${id}`);

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />

      <main className="main-content">
        <div className="approvals-container">
          {/* ... (Header Banner & Controls Bar remain exactly the same) ... */}
          {/* I will omit them here for brevity, keep your existing ones! */}
          <div className="header-banner">
            <div className="header-title">
              <h1>Account Approvals</h1>
              <p>Review and manage registration requests.</p>
            </div>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "48px", opacity: 0.8 }}
            >
              verified_user
            </span>
          </div>

          <div className="controls-bar">
            {/* Left side tabs/search */}
            <div className="controls-left">
              <div className="tab-group">
                <button
                  className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveTab("pending")}
                >
                  Pending Requests{" "}
                  {pendingCount > 0 && (
                    <span className="tab-badge" style={{ marginLeft: "8px" }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  Approval History{" "}
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
            {/* Right side filter */}
            <div className="controls-right" ref={filterRef}>
              <div className="filter-wrapper">
                <button
                  className={`btn-filter ${isFilterOpen ? "active" : ""}`}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <span className="material-symbols-outlined">filter_list</span>{" "}
                  Filter
                </button>
                {isFilterOpen && (
                  <div className="filter-dropdown-menu">
                    <button
                      className="filter-option"
                      onClick={() => handleSort("surname")}
                    >
                      <span className="material-symbols-outlined">
                        sort_by_alpha
                      </span>{" "}
                      Via Surname
                    </button>
                    <button
                      className="filter-option"
                      onClick={() => handleSort("date")}
                    >
                      <span className="material-symbols-outlined">
                        calendar_month
                      </span>{" "}
                      Via Date
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. GRID AREA */}
          <div className="requests-grid">
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

            {/* --- NEW REQUEST CARDS DESIGN --- */}
            {activeTab === "pending" &&
              requests.map((req) => (
                <div className="request-card" key={req.id}>
                  {/* TOP ROW: Split Header */}
                  <div className="card-split-header">
                    {/* LEFT: Parent (NOT CLICKABLE) */}
                    <div className="header-half header-left">
                      <span className="info-label">Legal Parent</span>
                      <div className="person-group">
                        <img
                          src={req.parentAvatar}
                          alt="Parent"
                          className="header-avatar"
                        />
                        <span className="info-value">{req.parentName}</span>
                      </div>
                    </div>

                    {/* RIGHT: Guardian (CLICKABLE WITH BLUE TINT) */}
                    <div
                      className="header-half guardian-clickable"
                      onClick={() => handleCardClick(req)}
                    >
                      <span className="info-label">Requested Guardian</span>
                      <div className="person-group">
                        <img
                          src={req.guardianAvatar}
                          alt="Guardian"
                          className="header-avatar"
                        />
                        <div className="name-stack">
                          <span className="info-value">{req.guardianName}</span>
                          <span className="role-tag">{req.role}</span>
                        </div>
                      </div>

                      {/* View Details Text Button */}
                      <div className="view-details-btn">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "14px" }}
                        >
                          visibility
                        </span>
                        View Details
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE ROW 1: Linked Child */}
                  <div className="card-row">
                    <span className="info-label">Linked Child</span>
                    <div className="student-badge-inline">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px" }}
                      >
                        face
                      </span>
                      {req.student}
                    </div>
                  </div>

                  {/* MIDDLE ROW 2: Requested On */}
                  <div className="card-row">
                    <span className="info-label">Requested On</span>
                    <span
                      className="info-value"
                      style={{ fontWeight: 500, fontSize: "13px" }}
                    >
                      {req.date}
                    </span>
                  </div>

                  {/* BOTTOM ROW: Actions */}
                  <div className="card-actions">
                    <button
                      className="btn-card btn-reject"
                      onClick={() => handleReject(req.id)}
                    >
                      Reject
                    </button>
                    <button
                      className="btn-card btn-approve"
                      onClick={() => handleApprove(req.id)}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}

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

      {/* --- DETAILS MODAL --- */}
      {selectedRequest && (
        <div
          className="approval-modal-overlay"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="approval-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal-icon"
              onClick={() => setSelectedRequest(null)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2
              style={{
                fontSize: "20px",
                color: "#1e293b",
                marginBottom: "8px",
              }}
            >
              Guardian Details
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              Submitted by <strong>{selectedRequest.parentName}</strong>
            </p>

            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #cbd5e1",
                borderRadius: "12px",
                color: "#94a3b8",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "48px", color: "#cbd5e1" }}
              >
                badge
              </span>
              Detailed Form & ID Photo will be mapped here...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
