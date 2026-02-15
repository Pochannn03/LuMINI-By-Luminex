// frontend/src/pages/admin-teacher/ManageApprovals.jsx

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../../styles/admin-teacher/admin-manage-approvals.css";
import NavBar from "../../components/navigation/NavBar";
import Header from "../../components/navigation/Header";

const BACKEND_URL = "http://localhost:3000";

export default function ManageApprovals() {
  const [activeTab, setActiveTab] = useState("pending");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // --- NEW: REAL DATA STATE ---
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending requests on load
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/teacher/guardian-requests/pending`,
          { withCredentials: true }
        );
        setRequests(response.data);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Helper for formatting Dates beautifully
  const formatDateTime = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options).replace(',', ' •');
  };

  // Helper for Images (Avatars)
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150"; // Fallback image
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  const pendingCount = requests.length;
  const historyCount = 0; // We'll hook this up later

  // Close dropdown when clicking outside
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
  // ==========================================
  // --- ACTION: APPROVE ---
  // ==========================================
  const handleApprove = async (e, id) => {
    e.stopPropagation(); // Prevents the modal from opening when button is clicked
    
    // Optional confirm dialog to prevent accidental clicks
    if (!window.confirm("Are you sure you want to approve this guardian? An account will be created.")) return;

    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/teacher/guardian-requests/${id}/approve`,
        {}, // Empty body
        { withCredentials: true }
      );
      
      alert(response.data.message);
      
      // Instantly remove the approved card from the UI array
      setRequests(requests.filter(req => req._id !== id));
      setSelectedRequest(null); // Close modal if open

    } catch (error) {
      console.error("Error approving request:", error);
      alert(error.response?.data?.message || "Failed to approve request.");
    }
  };

  // ==========================================
  // --- ACTION: REJECT ---
  // ==========================================
  const handleReject = async (e, id) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to reject this application?")) return;

    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/teacher/guardian-requests/${id}/reject`,
        {},
        { withCredentials: true }
      );
      
      alert(response.data.message);
      
      // Instantly remove the rejected card from the UI array
      setRequests(requests.filter(req => req._id !== id));
      setSelectedRequest(null);

    } catch (error) {
      console.error("Error rejecting request:", error);
      alert(error.response?.data?.message || "Failed to reject request.");
    }
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
            <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.8 }}>verified_user</span>
          </div>

          {/* 2. CONTROLS BAR */}
          <div className="controls-bar">
             <div className="controls-left">
                <div className="tab-group">
                  <button className={`tab-btn ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
                    Pending Requests {pendingCount > 0 && <span className="tab-badge" style={{ marginLeft: "8px" }}>{pendingCount}</span>}
                  </button>
                  <button className={`tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
                    Approval History <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "6px" }}>{historyCount}</span>
                  </button>
                </div>
                <div className="search-mini">
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#94a3b8" }}>search</span>
                  <input type="text" placeholder="Search by name or ID..." />
                </div>
             </div>
             <div className="controls-right" ref={filterRef}>
                <div className="filter-wrapper">
                  <button className={`btn-filter ${isFilterOpen ? "active" : ""}`} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                    <span className="material-symbols-outlined">filter_list</span> Filter
                  </button>
                  {isFilterOpen && (
                    <div className="filter-dropdown-menu">
                      <button className="filter-option" onClick={() => handleSort("surname")}><span className="material-symbols-outlined">sort_by_alpha</span> Via Surname</button>
                      <button className="filter-option" onClick={() => handleSort("date")}><span className="material-symbols-outlined">calendar_month</span> Via Date</button>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* 3. GRID AREA */}
          <div className="requests-grid">
            
            {loading ? (
              <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                 Fetching pending requests...
              </div>
            ) : activeTab === "pending" && requests.length === 0 ? (
              <div className="empty-queue">
                <span className="material-symbols-outlined empty-queue-icon">inbox_customize</span>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#334155", marginBottom: "8px" }}>All Caught Up!</h3>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>There are no pending account requests at the moment.</p>
              </div>
            ) : null}

            {/* --- MAP REAL REQUEST CARDS --- */}
            {activeTab === "pending" && !loading &&
              requests.map((req) => (
                <div className="request-card" key={req._id}>
                  
                  {/* TOP ROW: Split Header */}
                  <div className="card-split-header">
                    
                    {/* LEFT: Parent Info (Populated from User DB) */}
                    <div className="header-half header-left">
                      <span className="info-label">Legal Parent</span>
                      <div className="person-group">
                        <img 
                          src={req.parent ? getImageUrl(req.parent.profile_picture) : getImageUrl(null)} 
                          alt="Parent" 
                          className="header-avatar" 
                        />
                        <span className="info-value">
                          {req.parent ? `${req.parent.first_name} ${req.parent.last_name}` : "Unknown Parent"}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT: Guardian Info (From guardianDetails object) */}
                    <div className="header-half guardian-clickable" onClick={() => handleCardClick(req)}>
                      <span className="info-label">Requested Guardian</span>
                      <div className="person-group">
                        {/* ID Photo mapped here for quick visual */}
                        <img src={getImageUrl(req.guardianDetails.idPhotoPath)} alt="Guardian ID" className="header-avatar" />
                        <div className="name-stack">
                          <span className="info-value">{req.guardianDetails.firstName} {req.guardianDetails.lastName}</span>
                          <span className="role-tag">{req.guardianDetails.role}</span>
                        </div>
                      </div>
                      
                      <div className="view-details-btn">
                        <span className="material-symbols-outlined" style={{fontSize: '14px'}}>visibility</span>
                        View Details
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE ROW 1: Linked Child */}
                  <div className="card-row">
                    <span className="info-label">Linked Child</span>
                    <div className="student-badge-inline">
                      <span className="material-symbols-outlined" style={{fontSize: '18px'}}>face</span>
                      
                      {/* --- THE FIX: DYNAMIC STUDENT NAME --- */}
                      {req.student 
                        ? `${req.student.first_name} ${req.student.last_name}` 
                        : "Unknown Student"}

                    </div>
                  </div>

                  {/* MIDDLE ROW 2: Requested On */}
                  <div className="card-row">
                    <span className="info-label">Requested On</span>
                    <span className="info-value" style={{fontWeight: 500, fontSize: '13px'}}>
                      {formatDateTime(req.createdAt)}
                    </span>
                  </div>

                  {/* BOTTOM ROW: Actions */}
                  <div className="card-actions">
                    <button className="btn-card btn-reject" onClick={(e) => handleReject(e, req._id)}>Reject</button>
                    <button className="btn-card btn-approve" onClick={(e) => handleApprove(e, req._id)}>Approve</button>
                  </div>

                </div>
              ))}

            {activeTab === "history" && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#94a3b8", padding: "40px" }}>
                History cards will appear here...
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- DETAILS MODAL --- */}
      {selectedRequest && (
        <div className="approval-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="approval-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{fontSize: '22px', color: '#1e293b', marginBottom: '4px'}}>Guardian Application</h2>
                <p style={{color: '#64748b', fontSize: '14px', margin: 0}}>
                  Submitted by <strong>{selectedRequest.parent ? `${selectedRequest.parent.first_name} ${selectedRequest.parent.last_name}` : "Unknown Parent"}</strong>
                </p>
              </div>
              <button className="close-modal-icon" onClick={() => setSelectedRequest(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body (2 Columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '32px' }}>
              
              {/* LEFT COLUMN: Data */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                  Applicant Details
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>First Name</label>
                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>{selectedRequest.guardianDetails.firstName}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Last Name</label>
                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>{selectedRequest.guardianDetails.lastName}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Relationship</label>
                    <div className="role-tag" style={{ marginTop: '4px' }}>{selectedRequest.guardianDetails.role}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Phone Number</label>
                    <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>{selectedRequest.guardianDetails.phone}</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assigned Username</label>
                  <div style={{ fontSize: '16px', color: 'var(--primary-blue)', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {selectedRequest.guardianDetails.tempUsername}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: ID Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                  Valid ID Verification
                </h3>
                <div style={{ 
                  flex: 1, 
                  background: '#f8fafc', 
                  border: '2px dashed #cbd5e1', 
                  borderRadius: '12px', 
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={getImageUrl(selectedRequest.guardianDetails.idPhotoPath)} 
                    alt="ID Document" 
                    style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              </div>

            </div>
            
            {/* Modal Footer Actions */}
            <div style={{ padding: '20px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-card btn-reject" style={{ padding: '10px 24px' }} onClick={(e) => handleReject(e, selectedRequest._id)}>
                Reject Application
              </button>
              <button className="btn-card btn-approve" style={{ padding: '10px 24px' }} onClick={(e) => handleApprove(e, selectedRequest._id)}>
                Approve Guardian
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}