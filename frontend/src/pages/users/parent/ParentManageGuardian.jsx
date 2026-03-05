// frontend/src/pages/users/parent/ManageGuardians.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import "../../../styles/user/parent/manage-guardian.css";
import NavBar from "../../../components/navigation/NavBar";
import AddGuardianModal from "../../../components/modals/user/parent/manage-guardian/AddGuardianModal";
import SuccessModal from "../../../components/SuccessModal";
import ConfirmModal from "../../../components/ConfirmModal";
import WarningModal from "../../../components/WarningModal";

// DYNAMIC BACKEND URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ManageGuardians() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [requestToRevoke, setRequestToRevoke] = useState(null);
  const [revokeConfirmationText, setRevokeConfirmationText] = useState("");

  const getImageUrl = (path, fallbackName = "User") => {
    if (!path || path === "" || path === "null") {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}&backgroundColor=e2e8f0&textColor=475569`;
    }
    if (path.startsWith("http")) return path;
    // Sanitized to prevent double-slashes in production
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${BACKEND_URL}/${cleanPath}`;
  };

  const refreshData = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/parent/guardian-requests/pending`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/parent/guardian-requests/history`, { withCredentials: true })
      ]);
      
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

  const handleOpenAddModal = () => {
    const totalGuardians = pendingRequests.length + approvedRequests.length;
    if (totalGuardians >= 3) {
      setShowWarningModal(true); 
    } else {
      setIsAddModalOpen(true); 
    }
  };

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
            
            <div className="header-banner" style={{ marginBottom: '24px' }}>
              <div className="header-title">
                <h1>Manage Guardians</h1>
                <p>Authorize others to pick up your children.</p>
              </div>
            </div>

            <div className="table-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', width: '100%' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Authorized Personnel List</h3>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {pendingRequests.length + approvedRequests.length} / 3 Registered
                  </span>
                </div>
                <button onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)', transition: 'background-color 0.2s, transform 0.1s', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  <span className="hide-on-mobile">Add Guardian</span>
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading guardians...</div>
              ) : pendingRequests.length === 0 && approvedRequests.length === 0 ? (
                <div className="empty-state" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <span className="material-symbols-outlined empty-icon">diversity_3</span>
                  <h3 className="empty-text">No Guardians Found</h3>
                  <p className="empty-subtext">Authorize someone to help with pickups by clicking the <strong>+ Add Guardian</strong> button above.</p>
                </div>
              ) : (
                <div className="guardian-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {pendingRequests.map((req) => {
                    const isTier2 = req.status === 'teacher_approved';
                    return (
                      <div className="guardian-card border-pending" key={req._id} style={{ border: `1px solid ${isTier2 ? '#bfdbfe' : '#e2e8f0'}`, background: `linear-gradient(180deg, ${isTier2 ? '#eff6ff' : '#fffbeb'} 0%, #ffffff 40%)`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <img src={getImageUrl(req.guardianDetails.idPhotoPath, req.guardianDetails.firstName)} alt="ID" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffffff', boxShadow: `0 2px 6px ${isTier2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, filter: 'grayscale(100%)' }} onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.guardianDetails.firstName || 'User')}&backgroundColor=fef3c7&textColor=d97706`; }} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{req.guardianDetails.firstName} {req.guardianDetails.lastName}</span>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{req.guardianDetails.role}</span>
                              <span style={{ backgroundColor: isTier2 ? '#dbeafe' : '#fef3c7', color: isTier2 ? '#1d4ed8' : '#d97706', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{isTier2 ? "Pending Admin" : "Pending Teacher"}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', width: '80px' }}>USERNAME:</span><span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>{req.guardianDetails.tempUsername}</span></div>
                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', width: '80px' }}>CONTACT#:</span><span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>{req.guardianDetails.phone}</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                          <button onClick={() => setSelectedRequest(req)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>VIEW</button>
                          <button onClick={() => triggerCancelConfirm(req._id)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>CANCEL</button>
                        </div>
                      </div>
                    );
                  })}

                  {approvedRequests.map((req) => {
                    const liveUser = req.guardianDetails?.createdUserId;
                    const isSetupComplete = liveUser && liveUser.is_first_login === false;
                    const avatarSrc = isSetupComplete ? getImageUrl(liveUser.profile_picture, liveUser.first_name) : getImageUrl(req.guardianDetails.idPhotoPath, req.guardianDetails.firstName);
                    const displayName = isSetupComplete ? `${liveUser.first_name} ${liveUser.last_name}` : `${req.guardianDetails.firstName} ${req.guardianDetails.lastName}`;
                    const displayUsername = isSetupComplete ? liveUser.username : req.guardianDetails.tempUsername;
                    const displayPhone = isSetupComplete ? (liveUser.phone_number || "N/A") : req.guardianDetails.phone;

                    return (
                      <div className="guardian-card border-approved" key={req._id} style={{ border: '1px solid #e2e8f0', background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 40%)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <img src={avatarSrc} alt="Avatar" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffffff', boxShadow: '0 2px 6px rgba(34, 197, 94, 0.2)' }} onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=e2e8f0&textColor=475569`; }} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{displayName}</span>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{req.guardianDetails.role}</span>
                              {!isSetupComplete && <span style={{ backgroundColor: '#fef3c7', color: '#d97706', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>Awaiting Setup</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', width: '80px' }}>USERNAME:</span><span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{displayUsername}</span></div>
                          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', width: '80px' }}>CONTACT#:</span><span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{displayPhone}</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                          <button onClick={() => setSelectedRequest(req)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>VIEW</button>
                          <button onClick={() => triggerRevokeConfirm(req)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>REVOKE</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* MODALS RENDERED BELOW */}
        <ConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={executeCancelRequest} title="Cancel Request?" message="Are you sure you want to cancel this application? This action cannot be undone." confirmText="Yes, Cancel" isDestructive={true} />
        <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />
        <WarningModal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title="Guardian Limit" message="You can only have a maximum of 3 authorized guardians." />
      </div>
    </>
  );
}