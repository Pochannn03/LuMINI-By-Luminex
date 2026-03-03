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
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- STATES FOR THE DETAILS MODAL ---
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  // --- States for the Cancel/Success Feedback ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // --- States for Confirmation Modal (Cancel) ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);

  // --- States for Revoke Modal ---
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [requestToRevoke, setRequestToRevoke] = useState(null);
  const [revokeConfirmationText, setRevokeConfirmationText] = useState("");

  // --- THE FIX: Smart Image URL Generator with Fallback Initials ---
  const getImageUrl = (path, fallbackName = "User") => {
    if (!path || path === "" || path === "null") {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}&backgroundColor=e2e8f0&textColor=475569`;
    }
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  // --- REFRESH DATA LOGIC ---
  const refreshData = async () => {
    try {
      const [guardiansRes, pendingRes, historyRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/parent/guardians`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/parent/guardian-requests/pending`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/parent/guardian-requests/history`, { withCredentials: true })
      ]);
      
      setGuardians(guardiansRes.data);
      setPendingRequests(pendingRes.data);
      setApprovedRequests(historyRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- CANCEL FLOW ---
  const triggerCancelConfirm = (id) => {
    setRequestToCancel(id);
    setShowConfirmModal(true);
  };

  const executeCancelRequest = async () => {
    if (!requestToCancel) return;
    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/parent/guardian-requests/${requestToCancel}`,
        { withCredentials: true }
      );
      setPendingRequests(pendingRequests.filter(req => req._id !== requestToCancel));
      setSelectedRequest(null);
      setSuccessMessage(response.data.message || "Guardian application successfully cancelled.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error cancelling request:", error);
      alert(error.response?.data?.message || "Failed to cancel request.");
    } finally {
      setRequestToCancel(null);
    }
  };

  // --- REVOKE FLOW ---
  const triggerRevokeConfirm = (req) => {
    setRequestToRevoke(req);
    setRevokeConfirmationText(""); 
    setShowRevokeModal(true);
  };

  const executeRevokeRequest = async () => {
    if (!requestToRevoke) return;
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/parent/guardian-requests/${requestToRevoke._id}/revoke`,
        {},
        { withCredentials: true }
      );
      setShowRevokeModal(false);
      refreshData();
      setSuccessMessage(response.data.message || "Guardian access permanently revoked.");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error revoking access:", error);
      alert(error.response?.data?.message || "Failed to revoke access.");
    } finally {
      setRequestToRevoke(null);
      setRevokeConfirmationText("");
    }
  };

  return (
    <>
      <div className="dashboard-wrapper">
        <NavBar />

        <AddGuardianModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={refreshData} 
        />

        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <div className="guardians-container" style={{ width: '100%', maxWidth: '1200px' }}>
            
            {/* 1. HEADER BANNER */}
            <div className="header-banner" style={{ marginBottom: '24px' }}>
              <div className="header-title">
                <h1>Manage Guardians</h1>
                <p>Authorize others to pick up your children.</p>
              </div>
            </div>

            {/* FILTER BAR HAS BEEN REMOVED */}

            {/* 3. CARD GRID CONTAINER (NOW WITH WHITE BACKGROUND AND STYLING) */}
            <div className="table-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', width: '100%' }}>
              
              {/* --- NEW HEADER INJECTED INTO THE CONTAINER --- */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Authorized Personnel List</h3>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                    {guardians.length + pendingRequests.length + approvedRequests.length} / 3 Registered
                  </span>
                </div>
                
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#3b82f6', 
                    color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', 
                    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)', transition: 'background-color 0.2s, transform 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  <span className="hide-on-mobile">Add Guardian</span>
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                  Loading guardians...
                </div>
              ) : guardians.length === 0 && pendingRequests.length === 0 && approvedRequests.length === 0 ? (
                <div className="empty-state" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <span className="material-symbols-outlined empty-icon">diversity_3</span>
                  <h3 className="empty-text">No Guardians Found</h3>
                  <p className="empty-subtext">
                    You haven't authorized anyone yet. Click the <strong>+ Add Guardian</strong> button above to get started.
                  </p>
                </div>
              ) : (
                
                /* --- GRID LAYOUT FIX --- */
                <div className="guardian-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  
                  {/* --- ACTIVE GUARDIANS (Fetched from User Model) --- */}
                  {guardians.map((guardian) => (
                    <div className="guardian-card border-active" key={guardian._id}>
                      <div className="card-header-row">
                        <div className="card-user-info">
                          <img 
                            src={getImageUrl(guardian.profile_picture, guardian.first_name)} 
                            className="card-avatar" 
                            alt="Avatar" 
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(guardian.first_name || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                            }}
                          />
                          <div className="card-name-stack">
                            <span className="card-user-name">{guardian.first_name} {guardian.last_name}</span>
                          </div>
                        </div>
                        <span className="role-badge">{guardian.relationship || "Guardian"}</span>
                      </div>
                      <div className="card-middle-row">
                        <div className="detail-line"><span className="detail-label">USERNAME:</span> {guardian.username || "N/A"}</div>
                        <div className="detail-line"><span className="detail-label">CONTACT#:</span> {guardian.phone_number || "N/A"}</div>
                      </div>
                      <div className="card-actions-row">
                        <button className="btn-action view-btn" style={{flex: 1}}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_horiz</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* --- PENDING REQUESTS --- */}
                  {pendingRequests.map((req) => (
                    <div className="guardian-card border-pending" key={req._id}>
                      <div className="card-header-row">
                        <div className="card-user-info">
                          <img 
                            src={getImageUrl(req.guardianDetails.idPhotoPath, req.guardianDetails.firstName)} 
                            className="card-avatar grayscale" 
                            alt="ID" 
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.guardianDetails.firstName || 'User')}&backgroundColor=fef3c7&textColor=d97706`;
                            }}
                          />
                          <div className="card-name-stack">
                            <span className="card-user-name text-muted">
                              {req.guardianDetails.firstName} {req.guardianDetails.lastName}
                            </span>
                          </div>
                        </div>
                        <span className="role-badge muted-badge">{req.guardianDetails.role}</span>
                      </div>
                      <div className="card-middle-row">
                        <div className="detail-line"><span className="detail-label">USERNAME:</span> {req.guardianDetails.tempUsername}</div>
                        <div className="detail-line"><span className="detail-label">CONTACT#:</span> {req.guardianDetails.phone}</div>
                      </div>
                      <div className="card-actions-row">
                        <button className="btn-action view-btn" onClick={() => setSelectedRequest(req)}>
                          VIEW
                        </button>
                        <button className="btn-action cancel-btn" onClick={() => triggerCancelConfirm(req._id)}>
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* --- APPROVED HISTORY --- */}
                  {approvedRequests.map((req) => (
                    <div className="guardian-card border-approved" key={req._id}>
                      <div className="card-header-row">
                        <div className="card-user-info">
                          <img 
                            src={getImageUrl(req.guardianDetails.idPhotoPath, req.guardianDetails.firstName)} 
                            className="card-avatar" 
                            alt="ID" 
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.guardianDetails.firstName || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                            }}
                          />
                          <div className="card-name-stack">
                            <span className="card-user-name">
                              {req.guardianDetails.firstName} {req.guardianDetails.lastName}
                            </span>
                          </div>
                        </div>
                        <span className="role-badge muted-badge">{req.guardianDetails.role}</span>
                      </div>
                      <div className="card-middle-row">
                        <div className="detail-line"><span className="detail-label">USERNAME:</span> {req.guardianDetails.tempUsername}</div>
                        <div className="detail-line"><span className="detail-label">CONTACT#:</span> {req.guardianDetails.phone}</div>
                      </div>
                      <div className="card-actions-row">
                        <button className="btn-action view-btn" onClick={() => setSelectedRequest(req)}>
                          VIEW
                        </button>
                        <button className="btn-action revoke-btn" onClick={() => triggerRevokeConfirm(req)}>
                          REVOKE
                        </button>
                      </div>
                    </div>
                  ))}

                </div>
              )}
            </div>
          </div>
        </main>

        {/* --- DETAILS MODAL --- */}
        {selectedRequest && (
          <div className="modal-overlay active" onClick={() => setSelectedRequest(null)} style={{ zIndex: 9000 }}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', padding: 0, overflow: 'hidden' }}>
              
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{fontSize: '20px', color: '#1e293b', marginBottom: '4px', marginTop: 0}}>Guardian Details</h2>
                  <p style={{color: '#64748b', fontSize: '13px', margin: 0}}>Reviewing details submitted for approval.</p>
                </div>
                <button className="close-modal-btn" onClick={() => setSelectedRequest(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#64748b' }}>close</span>
                </button>
              </div>

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
                    <div className="role-tag" style={{ background: '#e2e8f0', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                      {selectedRequest.guardianDetails.role}
                    </div>
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
                    onClick={() => setExpandedImage(getImageUrl(selectedRequest.guardianDetails.idPhotoPath, selectedRequest.guardianDetails.firstName))}
                    style={{ 
                      background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', position: 'relative'
                    }}
                  >
                    <img 
                      src={getImageUrl(selectedRequest.guardianDetails.idPhotoPath, selectedRequest.guardianDetails.firstName)} 
                      alt="ID Document" 
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }}
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedRequest.guardianDetails.firstName || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                      }}
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

        {/* --- REVOKE ACCESS MODAL --- */}
        {showRevokeModal && (
          <div className="modal-overlay active" style={{ zIndex: 9999 }}>
            <div className="modal-card" style={{ maxWidth: '420px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>warning</span>
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Revoke Guardian Access</h2>
              </div>
              
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                You are about to permanently revoke access for <strong style={{color: '#1e293b'}}>{requestToRevoke?.guardianDetails?.firstName || requestToRevoke?.first_name} {requestToRevoke?.guardianDetails?.lastName || requestToRevoke?.last_name}</strong>. 
                <br/><br/>They will be removed from your active guardians and will no longer be able to pick up your child. This action cannot be undone.
              </p>

              <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                  Please type <strong style={{ color: '#ef4444' }}>I understand</strong> to confirm:
                </label>
                <input 
                  type="text" 
                  value={revokeConfirmationText}
                  onChange={(e) => setRevokeConfirmationText(e.target.value)}
                  placeholder="I understand"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'monospace' }}
                  autoComplete="off"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => setShowRevokeModal(false)}
                  style={{ background: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  disabled={revokeConfirmationText !== "I understand"}
                  onClick={executeRevokeRequest} 
                  style={{ 
                    background: revokeConfirmationText === "I understand" ? '#ef4444' : '#fca5a5', 
                    color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, 
                    cursor: revokeConfirmationText === "I understand" ? 'pointer' : 'not-allowed'
                  }}
                >
                  Revoke Access
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={executeCancelRequest}
          title="Cancel Request?"
          message="Are you sure you want to cancel this guardian application? This action cannot be undone."
          confirmText="Yes, Cancel"
          cancelText="No, Keep it"
          isDestructive={true} 
        />

        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          message={successMessage}
        />
      </div>
    </>
  );
}