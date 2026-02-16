// frontend/src/pages/users/parent/ManageGuardians.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import "../../../styles/user/parent/manage-guardian.css";
import NavBar from "../../../components/navigation/NavBar";
import AddGuardianModal from "../../../components/modals/user/parent/manage-guardian/AddGuardianModal";
import SuccessModal from "../../../components/SuccessModal";
import ConfirmModal from "../../../components/ConfirmModal";
const BACKEND_URL = "http://localhost:3000";

export default function ManageGuardians() {
  const [guardians, setGuardians] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- NEW STATES FOR THE DETAILS MODAL ---
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  // --- NEW: State for the Cancel Success Modal ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // --- NEW: States for Confirmation Modal ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);

  // Helper for Images
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  // --- 1. EXTRACTED FETCH LOGIC ---
  const refreshData = async () => {
    try {
      const [guardiansRes, pendingRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/parent/guardians`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/parent/guardian-requests/pending`, { withCredentials: true })
      ]);
      
      setGuardians(guardiansRes.data);
      setPendingRequests(pendingRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. USE EFFECT NOW JUST CALLS REFRESH DATA ---
  useEffect(() => {
    refreshData();
  }, []);

 // --- PART 1: Opens the modal and remembers the ID ---
  const triggerCancelConfirm = (id) => {
    setRequestToCancel(id);
    setShowConfirmModal(true);
  };

  // --- PART 2: Executes the backend deletion if they click Yes ---
  const executeCancelRequest = async () => {
    if (!requestToCancel) return;

    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/parent/guardian-requests/${requestToCancel}`,
        { withCredentials: true }
      );

      setPendingRequests(pendingRequests.filter(req => req._id !== requestToCancel));
      setSelectedRequest(null);

      // Trigger success modal!
      setSuccessMessage(response.data.message || "Guardian application successfully cancelled.");
      setShowSuccessModal(true);

    } catch (error) {
      console.error("Error cancelling request:", error);
      alert(error.response?.data?.message || "Failed to cancel request.");
    } finally {
      setRequestToCancel(null); // Reset the memory
    }
  };

  return (
    <div className="dashboard-wrapper">
      <NavBar />

      <AddGuardianModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshData} // <-- THIS IS THE MAGIC FIX
      />

      <main className="main-content">
        <div className="guardians-container">
          
          {/* 1. BLUE HEADER BANNER */}
          <div className="header-banner">
            <div className="header-title">
              <h1>Manage Guardians</h1>
              <p>Authorize others to pick up your children.</p>
            </div>
            <button
              className="btn-add-circle"
              title="Add Guardian"
              onClick={() => setIsAddModalOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "24px", fontWeight: "bold" }}>
                add
              </span>
            </button>
          </div>

          {/* 2. FILTER BAR */}
          <div className="filter-bar">
            <div className="search-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search by name..." />
            </div>

            <button className="filter-btn">
              Status: All
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                expand_more
              </span>
            </button>
          </div>

          {/* 3. TABLE CARD */}
          <div className="table-card">
            {loading ? (
              <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                Loading guardians...
              </div>
            ) : guardians.length === 0 && pendingRequests.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined empty-icon">diversity_3</span>
                <h3 className="empty-text">No Guardians Found</h3>
                <p className="empty-subtext">
                  You haven't authorized anyone yet. Click the <strong>+</strong> button above to add a guardian.
                </p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  
                  {/* --- MAP ACTIVE GUARDIANS --- */}
                  {guardians.map((guardian) => (
                    <tr key={guardian._id}>
                      <td>
                        <div className="user-info-cell">
                          <img src={getImageUrl(guardian.profile_picture)} className="table-avatar-circle" alt="Avatar" />
                          <div className="user-text">
                            <span className="user-name">{guardian.first_name} {guardian.last_name}</span>
                            <span className="user-id">ID: {guardian.user_id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="role-badge">{guardian.relationship || "Guardian"}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          <div>{guardian.email}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                            {guardian.phone_number || "No Phone"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="status-indicator status-active">
                          <span className="status-dot"></span> Active
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="icon-btn" style={{ color: "#94a3b8", cursor: "pointer" }}>
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* --- MAP PENDING REQUESTS --- */}
                  {pendingRequests.map((req) => (
                    <tr key={req._id} style={{ background: '#f8fafc', opacity: 0.8 }}>
                      <td>
                        <div className="user-info-cell">
                          <img src={getImageUrl(req.guardianDetails.idPhotoPath)} className="table-avatar-circle" style={{ filter: 'grayscale(50%)' }} alt="ID" />
                          <div className="user-text">
                            <span className="user-name" style={{ color: '#64748b' }}>
                              {req.guardianDetails.firstName} {req.guardianDetails.lastName}
                            </span>
                            <span className="user-id" style={{ color: '#94a3b8' }}>ID: Pending Approval</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="role-badge" style={{ background: '#e2e8f0', color: '#64748b' }}>
                          {req.guardianDetails.role}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                          <div>{req.guardianDetails.tempUsername}</div>
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            {req.guardianDetails.phone}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#d97706', padding: '6px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>hourglass_empty</span>
                          Pending Review
                        </div>
                      </td>
                      
                      {/* --- UPDATED ACTIONS COLUMN (View & Cancel) --- */}
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            onClick={() => setSelectedRequest(req)}
                            style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                            View
                          </button>
                          <button 
                            onClick={() => triggerCancelConfirm(req._id)} // <-- CHANGED THIS LINE
                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.target.style.background = '#fca5a5'}
                            onMouseOut={(e) => e.target.style.background = '#fee2e2'}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}

                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* --- NEW: DETAILS MODAL FOR PARENT --- */}
      {/* ========================================================================= */}
      {selectedRequest && (
        <div className="modal-overlay active" onClick={() => setSelectedRequest(null)} style={{ zIndex: 9000 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', padding: 0, overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{fontSize: '20px', color: '#1e293b', marginBottom: '4px', marginTop: 0}}>Pending Guardian</h2>
                <p style={{color: '#64748b', fontSize: '13px', margin: 0}}>Reviewing details submitted for approval.</p>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedRequest(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#64748b' }}>close</span>
              </button>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Name</label>
                  <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>
                    {selectedRequest.guardianDetails.firstName} {selectedRequest.guardianDetails.lastName}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Relationship</label>
                  <div className="role-tag">{selectedRequest.guardianDetails.role}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Phone Number</label>
                <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>{selectedRequest.guardianDetails.phone}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assigned Username</label>
                <div style={{ fontSize: '16px', color: 'var(--primary-blue)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  {selectedRequest.guardianDetails.tempUsername}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Submitted ID</label>
                <div 
                  onClick={() => setExpandedImage(getImageUrl(selectedRequest.guardianDetails.idPhotoPath))}
                  style={{ 
                    background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', position: 'relative'
                  }}
                >
                  <img 
                    src={getImageUrl(selectedRequest.guardianDetails.idPhotoPath)} 
                    alt="ID Document" 
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <div style={{ position: 'absolute', bottom: '12px', background: 'rgba(15, 23, 42, 0.7)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{fontSize: '14px'}}>zoom_in</span> Click to Enlarge
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX MODAL --- */}
      {expandedImage && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', cursor: 'zoom-out'
          }}
          onClick={() => setExpandedImage(null)}
        >
          <img 
            src={expandedImage} alt="Expanded ID" 
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
          />
          <button 
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setExpandedImage(null)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeCancelRequest}
        title="Cancel Request?"
        message="Are you sure you want to cancel this guardian application? This action cannot be undone."
        confirmText="Yes, Cancel"
        cancelText="No, Keep it"
        isDestructive={true} // Makes the confirm button RED
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </div>
  );
}