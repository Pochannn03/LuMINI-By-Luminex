// frontend/src/pages/admin-teacher/ManageApprovals.jsx

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf"; 
import autoTable from "jspdf-autotable"; 
import "../../styles/admin-teacher/admin-manage-approvals.css";
import NavBar from "../../components/navigation/NavBar";
import Header from "../../components/navigation/Header";
import SuccessModal from "../../components/SuccessModal";
import TeacherConfirmationModal from "../../components/modals/admin/TeacherConfirmationModal"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ManageApprovals() {
  const [activeTab, setActiveTab] = useState("pending");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [requests, setRequests] = useState([]); 
  const [historyRequests, setHistoryRequests] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [expandedImage, setExpandedImage] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [modalType, setModalType] = useState("approve");
  
  // --- NEW: REJECT REASON STATE ---
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pendingRes, historyRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/teacher/guardian-requests/pending`, { withCredentials: true }),
          axios.get(`${BACKEND_URL}/api/teacher/guardian-requests/history`, { withCredentials: true })
        ]);
        
        setRequests(pendingRes.data);
        setHistoryRequests(historyRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDateTime = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options).replace(',', ' •');
  };

  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150"; 
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  const filterBySearch = (list) => {
    if (!searchQuery) return list;
    const lowerQ = searchQuery.toLowerCase();
    return list.filter(req => {
      const gName = `${req.guardianDetails?.firstName || ''} ${req.guardianDetails?.lastName || ''}`.toLowerCase();
      const pName = req.parent ? `${req.parent.first_name} ${req.parent.last_name}`.toLowerCase() : '';
      return gName.includes(lowerQ) || pName.includes(lowerQ);
    });
  };

  const filteredPending = filterBySearch(requests);
  const filteredHistory = filterBySearch(historyRequests);

  const pendingCount = requests.length;
  const historyCount = historyRequests.length;

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

  const handleApproveClick = (e, id) => {
    e.stopPropagation();
    setPendingActionId(id);
    setModalType("approve");
    setConfirmModalOpen(true);
  };

  const handleRejectClick = (e, id) => {
    e.stopPropagation();
    setPendingActionId(id);
    setModalType("reject");
    setRejectReason(""); // Reset reason field
    setConfirmModalOpen(true);
  };

  // --- UPDATED: SEND REASON TO BACKEND ---
  const handleConfirmAction = async () => {
    const id = pendingActionId;
    const endpoint = modalType; 
    
    let payload = {};
    if (modalType === "reject") {
      if (!rejectReason.trim()) {
        alert("Please provide a reason for rejection.");
        return;
      }
      payload = { reason: rejectReason };
    }

    setConfirmModalOpen(false); 
    
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/teacher/guardian-requests/${id}/${endpoint}`,
        payload, { withCredentials: true }
      );

      setSuccessMessage(modalType === "approve" 
        ? "Request verified and forwarded to Superadmin." 
        : "Application has been rejected and the parent has been notified.");
      setShowSuccessModal(true);

      const actedRequest = requests.find(req => req._id === id);
      if (actedRequest) {
        setRequests(requests.filter(req => req._id !== id));
        setHistoryRequests([{ ...actedRequest, status: modalType === 'approve' ? 'teacher_approved' : 'rejected' }, ...historyRequests]);
      }
      setSelectedRequest(null);
    } catch (error) {
      console.error("Action failed:", error);
      alert(error.response?.data?.message || "Failed to process request.");
    }
  };

  const exportHistoryToPDF = () => {
    try {
      if (!filteredHistory || filteredHistory.length === 0) {
        alert("No history records to export.");
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text("Guardian Approval History", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableColumn = ["Date", "Parent", "Guardian", "Role", "Child", "Status"];
      const tableRows = [];

      filteredHistory.forEach(req => {
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Unknown";
        
        let parentName = "N/A";
        if (req.parent && req.parent.first_name) {
            parentName = `${req.parent.first_name} ${req.parent.last_name}`;
        } else if (typeof req.parent === 'string') {
            parentName = "ID: " + req.parent.substring(0, 5) + "..."; 
        }

        const gDetails = req.guardianDetails || {};
        const guardianName = `${gDetails.firstName || 'Unknown'} ${gDetails.lastName || ''}`.trim();
        const role = gDetails.role || "N/A";
        
        let childName = "N/A";
          if (req.students && req.students.length > 0) {
            childName = req.students.map(s => {
              return s.first_name ? `${s.first_name} ${s.last_name}` : "Unknown";
            }).join(", ");
          }

        const status = (req.status || "Unknown").toUpperCase();

        tableRows.push([date, parentName, guardianName, role, childName, status]);
      });

      autoTable(doc, {
        startY: 36,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [57, 168, 237] }, 
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save("Guardian_Approval_History.pdf");

    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Check the console for details.");
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />

      <main className="main-content">
        <div className="approvals-container">
          
          <div className="header-banner">
             <div className="header-title">
              <h1>Account Approvals</h1>
              <p>Review and manage registration requests.</p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.8 }}>verified_user</span>
          </div>

          <div className="controls-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', position: 'relative', zIndex: 50 }}>
             
             <div className="tab-group" style={{ display: 'flex', flex: '1 1 auto', minWidth: '280px', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
                <button 
                  className={`tab-btn ${activeTab === "pending" ? "active" : ""}`} 
                  onClick={() => setActiveTab("pending")}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', margin: 0, borderRadius: '8px' }}
                >
                  Pending {pendingCount > 0 && <span className="tab-badge" style={{ marginLeft: "8px" }}>{pendingCount}</span>}
                </button>
                <button 
                  className={`tab-btn ${activeTab === "history" ? "active" : ""}`} 
                  onClick={() => setActiveTab("history")}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', margin: 0, borderRadius: '8px' }}
                >
                  History <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "6px" }}>{historyCount}</span>
                </button>
             </div>

             <div style={{ display: 'flex', flex: '1 1 auto', gap: '12px', minWidth: '280px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', padding: '4px 4px 4px 12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94a3b8', marginRight: '8px' }}>search</span>
                  
                  <input 
                    type="text" 
                    placeholder="Search by name or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', minWidth: '50px', height: '34px' }} 
                  />
                  
                  <div style={{ position: 'relative' }} ref={filterRef}>
                    <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: isFilterOpen ? '#f1f5f9' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s', height: '100%' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_list</span>
                      <span className="hide-on-mobile">Filter</span>
                    </button>

                    {isFilterOpen && (
                      <div className="filter-dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, zIndex: 9999, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '8px', minWidth: '180px' }}>
                        <button className="filter-option" onClick={() => handleSort("surname")} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#334155', borderRadius: '6px', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#f1f5f9'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sort_by_alpha</span> Via Surname</button>
                        <button className="filter-option" onClick={() => handleSort("date")} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#334155', borderRadius: '6px', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='#f1f5f9'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span> Via Date</button>
                      </div>
                    )}
                  </div>
                </div>

                {activeTab === "history" && (
                  <button 
                    className="btn-outline" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '44px', padding: '0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                    onClick={() => exportHistoryToPDF()}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>picture_as_pdf</span>
                    <span className="hide-on-mobile" style={{ fontWeight: 600, fontSize: '14px' }}>Export PDF</span>
                  </button>
                )}
             </div>
          </div>

          <div className="requests-grid">
            {loading ? (
              <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                 Fetching pending requests...
              </div>
            ) : activeTab === "pending" && filteredPending.length === 0 ? (
              <div className="empty-queue">
                <span className="material-symbols-outlined empty-queue-icon">inbox_customize</span>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#334155", marginBottom: "8px" }}>
                  {searchQuery ? "No matches found." : "All Caught Up!"}
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                  {searchQuery ? "Try a different search term." : "There are no pending account requests at the moment."}
                </p>
              </div>
            ) : null}

            {activeTab === "pending" && !loading &&
              filteredPending.map((req) => (
                <div className="request-card" key={req._id}>
                  <div className="card-split-header">
                    <div className="header-half header-left">
                      <span className="info-label">Legal Parent</span>
                      <div className="person-group">
                        <img src={req.parent ? getImageUrl(req.parent.profile_picture) : getImageUrl(null)} alt="Parent" className="header-avatar" />
                        <span className="info-value">
                          {req.parent ? `${req.parent.first_name} ${req.parent.last_name}` : "Unknown Parent"}
                        </span>
                      </div>
                    </div>
                    <div className="header-half guardian-clickable" onClick={() => handleCardClick(req)}>
                      <span className="info-label">Requested Guardian</span>
                      <div className="person-group">
                        {/* --- THE FIX: ONERROR FOR CARD AVATAR --- */}
                        <img 
                          src={getImageUrl(req.guardianDetails.idPhotoPath)} 
                          alt="Guardian ID" 
                          className="header-avatar" 
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.guardianDetails.firstName || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                          }}
                        />
                        <div className="name-stack">
                          <span className="info-value">{req.guardianDetails.firstName} {req.guardianDetails.lastName}</span>
                          <span className="role-tag">{req.guardianDetails.role}</span>
                        </div>
                      </div>
                      <div className="view-details-btn">
                        <span className="material-symbols-outlined" style={{fontSize: '14px'}}>visibility</span> View Details
                      </div>
                    </div>
                  </div>
                  <div className="card-row">
                    <span className="info-label">Linked Child</span>
                    <div className="student-badge-inline" style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }}>
                      <span className="material-symbols-outlined" style={{fontSize: '18px'}}>face</span>
                      {req.students && req.students.length > 0 
                        ? req.students.map(s => `${s.first_name} ${s.last_name}`).join(", ") 
                        : "Unknown Student"}
                    </div>
                  </div>
                  <div className="card-row">
                    <span className="info-label">Requested On</span>
                    <span className="info-value" style={{fontWeight: 500, fontSize: '13px'}}>{formatDateTime(req.createdAt)}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn-card btn-reject" onClick={(e) => handleRejectClick(e, req._id)}>Reject</button>
                    <button className="btn-card btn-approve" onClick={(e) => handleApproveClick(e, req._id)}>Verify</button>
                  </div>
                </div>
              ))}

            {activeTab === "history" && !loading && filteredHistory.length === 0 ? (
              <div className="empty-queue">
                <span className="material-symbols-outlined empty-queue-icon">history</span>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#334155", marginBottom: "8px" }}>
                  {searchQuery ? "No matches found." : "No History Yet"}
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                  {searchQuery ? "Try a different search term." : "Approved and rejected applications will appear here."}
                </p>
              </div>
            ) : activeTab === "history" && !loading && (
              filteredHistory.map((req) => (
                <div className="request-card" key={req._id} style={{ opacity: 0.9 }}> 
                  <div className="card-split-header">
                    <div className="header-half header-left">
                      <span className="info-label">Legal Parent</span>
                      <div className="person-group">
                        <img src={req.parent ? getImageUrl(req.parent.profile_picture) : getImageUrl(null)} alt="Parent" className="header-avatar" />
                        <span className="info-value">
                          {req.parent ? `${req.parent.first_name} ${req.parent.last_name}` : "Unknown Parent"}
                        </span>
                      </div>
                    </div>
                    <div className="header-half guardian-clickable" onClick={() => handleCardClick(req)}>
                      <span className="info-label">Requested Guardian</span>
                      <div className="person-group">
                        {/* --- THE FIX: ONERROR FOR HISTORY CARD AVATAR --- */}
                        <img 
                          src={getImageUrl(req.guardianDetails.idPhotoPath)} 
                          alt="Guardian ID" 
                          className="header-avatar" 
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.guardianDetails.firstName || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                          }}
                        />
                        <div className="name-stack">
                          <span className="info-value">{req.guardianDetails.firstName} {req.guardianDetails.lastName}</span>
                          <span className="role-tag" style={{ background: '#e2e8f0', color: '#64748b' }}>{req.guardianDetails.role}</span>
                        </div>
                      </div>
                      <div className="view-details-btn" style={{ color: '#64748b' }}>
                        <span className="material-symbols-outlined" style={{fontSize: '14px'}}>visibility</span> View Details
                      </div>
                    </div>
                  </div>
                  <div className="card-row">
                    <span className="info-label">Linked Child</span>
                    <div className="student-badge-inline" style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }}>
                      <span className="material-symbols-outlined" style={{fontSize: '18px'}}>face</span>
                      {req.students && req.students.length > 0 
                        ? req.students.map(s => `${s.first_name} ${s.last_name}`).join(", ") 
                        : "Unknown Student"}
                    </div>
                  </div>
                  <div className="card-actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', padding: '16px' }}>
                    {req.status === 'teacher_approved' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold', fontSize: '15px' }}>
                        <span className="material-symbols-outlined">forward_to_inbox</span> Forwarded to Admin
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 'bold', fontSize: '15px' }}>
                        <span className="material-symbols-outlined">check_circle</span> Application Approved
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 'bold', fontSize: '15px' }}>
                        <span className="material-symbols-outlined">cancel</span> Application Rejected
                      </span>
                    )}
                    {req.status === 'revoked' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 'bold', fontSize: '15px' }}>
                        <span className="material-symbols-outlined">block</span> Access Revoked
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* --- UNIFIED DETAILS MODAL --- */}
      {selectedRequest && (
        <div className="approval-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="approval-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
            
            <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{fontSize: '20px', color: '#1e293b', marginBottom: '4px'}}>Guardian Application</h2>
                <p style={{color: '#64748b', fontSize: '13px', margin: 0}}>
                  Submitted by <strong>{selectedRequest.parent ? `${selectedRequest.parent.first_name} ${selectedRequest.parent.last_name}` : "Unknown Parent"}</strong>
                </p>
              </div>
              <button className="close-modal-icon" onClick={() => setSelectedRequest(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', margin: 0 }}>
                  Applicant Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>First Name</label>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedRequest.guardianDetails.firstName}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Last Name</label>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedRequest.guardianDetails.lastName}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Relationship</label>
                    <div className="role-tag" style={{ marginTop: '2px' }}>{selectedRequest.guardianDetails.role}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Phone Number</label>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{selectedRequest.guardianDetails.phone}</div>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assigned Username</label>
                  <div style={{ fontSize: '15px', color: 'var(--primary-blue)', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {selectedRequest.guardianDetails.tempUsername}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '15px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', margin: 0 }}>
                  Valid ID Verification
                </h3>
                <div 
                  onClick={() => setExpandedImage(getImageUrl(selectedRequest.guardianDetails.idPhotoPath))}
                  style={{ 
                    background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', 
                    padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'zoom-in', position: 'relative', transition: 'border-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  {/* --- THE FIX: ONERROR FOR ID DOCUMENT IN MODAL --- */}
                  <img 
                    src={getImageUrl(selectedRequest.guardianDetails.idPhotoPath)} 
                    alt="ID Document" 
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }} 
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = `https://placehold.co/600x400/f8fafc/94a3b8?text=ID+Deleted+(Rejected)`;
                    }}
                  />
                  <div style={{ position: 'absolute', bottom: '12px', background: 'rgba(15, 23, 42, 0.7)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{fontSize: '14px'}}>zoom_in</span> Click to Enlarge
                  </div>
                </div>
              </div>
            </div>
            
            {selectedRequest.status === 'pending' ? (
              <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                <button className="btn-card btn-reject" style={{ flex: 1, padding: '12px 0' }} onClick={(e) => handleRejectClick(e, selectedRequest._id)}>Reject</button>
                <button className="btn-card btn-approve" style={{ flex: 1, padding: '12px 0' }} onClick={(e) => handleApproveClick(e, selectedRequest._id)}>Verify</button>
              </div>
            ) : (
              <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
                 {selectedRequest.status === 'teacher_approved' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 'bold', fontSize: '15px' }}>
                    <span className="material-symbols-outlined">forward_to_inbox</span> Forwarded to Admin
                  </span>
                )}
                {selectedRequest.status === 'approved' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: 'bold', fontSize: '15px' }}>
                    <span className="material-symbols-outlined">check_circle</span> Application Approved
                  </span>
                )}
                {selectedRequest.status === 'rejected' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 'bold', fontSize: '15px' }}>
                    <span className="material-symbols-outlined">cancel</span> Application Rejected
                  </span>
                )}
                {selectedRequest.status === 'revoked' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 'bold', fontSize: '15px' }}>
                    <span className="material-symbols-outlined">block</span> Access Revoked
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {expandedImage && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', cursor: 'zoom-out' }} onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="Expanded ID" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} />
        </div>
      )}

      {modalType === "approve" && (
        <TeacherConfirmationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={handleConfirmAction}
          title="Verify Application?"
          message="Are you sure? This will verify the request and forward it to the Superadmin for final approval."
          confirmText="Yes, Verify"
          type="info"
        />
      )}

      {/* --- NEW CUSTOM REJECTION MODAL WITH REASON INPUT --- */}
      {modalType === "reject" && confirmModalOpen && (
        <div className="modal-overlay active" style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#ef4444' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>warning</span>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Reject Application?</h2>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
              You are about to reject this guardian request. Please provide a reason to help the parent understand what needs to be fixed.
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                Reason for Rejection <span style={{color: '#ef4444'}}>*</span>
              </label>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., ID is blurry, Name does not match, Unrecognized person..."
                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', minHeight: '80px', resize: 'vertical' }}
              />
            </div>
            {/* --- FIX: UPDATED JUSTIFYCONTENT SYNTAX --- */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setConfirmModalOpen(false)} style={{ background: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button disabled={!rejectReason.trim()} onClick={handleConfirmAction} style={{ background: rejectReason.trim() ? '#ef4444' : '#fca5a5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed' }}>Reject & Notify Parent</button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />

    </div>
  );
}