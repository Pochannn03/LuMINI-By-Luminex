import React, { useState, useEffect } from "react";
import axios from "axios";
import Header from "../../components/navigation/Header";
import NavBar from "../../components/navigation/NavBar";
import ConfirmModal from "../../components/ConfirmModal"; 
import SuccessModal from "../../components/SuccessModal"; 
import "../../styles/admin-teacher/admin-manage-approvals.css"; 

const BACKEND_URL = "http://localhost:3000"; // Ensure this matches your backend

export default function EnrollmentApproval() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [viewImage, setViewImage] = useState(null); 
  
  // --- REAL DATA STATES ---
  const [requests, setRequests] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CODES MODAL STATES ---
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // --- CONFIRM & SUCCESS MODAL STATES ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    isDestructive: false,
    actionData: null // Stores the ID and target status so we know what to do on confirm
  });

  // ==========================================
  // FETCH DATA ON MOUNT
  // ==========================================
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const [requestsRes, statsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/teacher/enrollments/pending`, { withCredentials: true }),
          axios.get(`${BACKEND_URL}/api/students/teacher/totalStudents`, { withCredentials: true })
        ]);

        if (requestsRes.data.success) {
          setRequests(requestsRes.data.requests);
        }
        
        if (statsRes.data.success && statsRes.data.sections) {
          setSections(statsRes.data.sections);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000); 
  };

  const calculateAge = (dob) => {
    if (!dob) return 0;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  // ==========================================
  // HANDLE APPROVE / REJECT FLOW
  // ==========================================
  
  // 1. Trigger the Confirm Modal
  const promptUpdateStatus = (id, newStatus, studentName) => {
    if (newStatus === 'Approved_By_Teacher') {
      setConfirmConfig({
        isOpen: true,
        title: "Approve Enrollment?",
        message: `You are about to approve the enrollment application for ${studentName}. This will be sent to the Super Admin for finalization and system registration. Do you want to proceed?`,
        confirmText: "Yes, Approve",
        isDestructive: false,
        actionData: { id, status: newStatus }
      });
    } else {
      setConfirmConfig({
        isOpen: true,
        title: "Reject Application?",
        message: `You are about to reject the enrollment application for ${studentName}. This action will discard the request. Do you wish to proceed?`,
        confirmText: "Yes, Reject",
        isDestructive: true,
        actionData: { id, status: newStatus }
      });
    }
  };

  // 2. Execute the API Call (Runs when they click "Confirm" in the modal)
  const executeStatusUpdate = async () => {
    const { id, status } = confirmConfig.actionData;
    
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/teacher/enrollments/${id}/status`,
        { status: status },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Instantly update the UI
        setRequests(prevRequests => 
          prevRequests.map(req => req._id === id ? { ...req, status: status } : req)
        );
        setSelectedApplication(null); // Close the detail modal if it's open
        
        // Trigger Success Modal
        setSuccessMessage(`Application successfully ${status === 'Rejected' ? 'rejected' : 'approved and sent to Admin'}!`);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Something went wrong. Please try again.");
    }
  };


  // --- SEARCH & TAB FILTER ---
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;
  const reviewedRequestsCount = requests.filter(r => r.status !== 'Pending').length;

  const filteredRequests = requests.filter(req => {
    // 1. Check Tab
    const matchesTab = activeTab === 'pending' 
      ? req.status === 'Pending' 
      : (req.status === 'Approved_By_Teacher' || req.status === 'Rejected');

    if (!matchesTab) return false;

    // 2. Check Search Query
    const studentName = `${req.student_first_name} ${req.student_last_name}`.toLowerCase();
    const parentName = req.parent_name.toLowerCase();
    const query = searchQuery.toLowerCase();
    return studentName.includes(query) || parentName.includes(query);
  });

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />
      
      {/* --- REUSABLE MODALS --- */}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={executeStatusUpdate}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDestructive={confirmConfig.isDestructive}
      />

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      <main className="main-content">
        <div className="approvals-container">
          
          {/* 1. HEADER BANNER */}
          <div className="header-banner flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
            <div className="header-title">
              <h1>Enrollment Requests</h1>
              <p>Review and verify new student pre-enrollments submitted by parents.</p>
            </div>

            <button 
              onClick={() => setShowCodesModal(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-3 rounded-xl backdrop-blur-sm transition-all font-semibold border border-white/30 shadow-sm hover:shadow-md w-full md:w-auto justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">key</span>
              View Section Codes
            </button>
          </div>

          {/* 2. CONTROLS BAR */}
          <div className="controls-bar">
            <div className="controls-left">
              <div className="tab-group">
                <button 
                  className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pending {pendingRequestsCount > 0 && <span className="tab-badge">{pendingRequestsCount}</span>}
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'reviewed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reviewed')}
                >
                  Reviewed {reviewedRequestsCount > 0 && <span className="tab-badge neutral">{reviewedRequestsCount}</span>}
                </button>
              </div>
            </div>
            
            <div className="controls-right">
              <div className="search-mini">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                <input 
                  type="text" 
                  placeholder="Search parent or student..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. REQUESTS GRID */}
          <div className="requests-grid">
            {loading ? (
              <div className="text-center py-10 text-slate-500 font-medium w-full col-span-full">
                Loading pending enrollments...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="empty-queue col-span-full">
                <span className="material-symbols-outlined empty-queue-icon">inbox</span>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No {activeTab} enrollments</h3>
                <p className="text-slate-500">
                  {activeTab === 'pending' ? "You're all caught up! New parent submissions will appear here." : "You haven't reviewed any applications yet."}
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req._id} className="request-card">
                  
                  <div className="card-split-header">
                    {/* LEFT: PARENT INFO */}
                    <div className="header-half header-left">
                      <span className="info-label">Submitted By (Parent)</span>
                      <div className="person-group">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shrink-0">
                          {req.parent_name.charAt(0)}
                        </div>
                        <div className="name-stack overflow-hidden">
                          <span className="info-value truncate" title={req.parent_name}>{req.parent_name}</span>
                          <span className="role-tag" style={{ background: '#f1f5f9', color: '#475569' }}>
                            {req.parent_phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: STUDENT INFO (Clickable) */}
                    <div 
                      className="header-half guardian-clickable"
                      onClick={() => setSelectedApplication(req)}
                    >
                      <span className="info-label text-blue-600">Prospective Student</span>
                      <div className="person-group">
                        <img 
                          src={getImageUrl(req.student_photo) || `https://api.dicebear.com/7.x/initials/svg?seed=${req.student_first_name}`} 
                          alt="Student" 
                          className="header-avatar object-cover bg-slate-100"
                        />
                        <div className="name-stack overflow-hidden">
                          <span className="info-value truncate" title={`${req.student_first_name} ${req.student_last_name}`}>
                            {req.student_first_name} {req.student_last_name}
                          </span>
                          <span className="role-tag">New Enrollment</span>
                        </div>
                      </div>
                      <div className="view-details-btn">
                        Review Full Form <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM: REQUEST METADATA */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-dashed border-slate-300 bg-white gap-4 sm:gap-0">
                    <div className="text-left w-full sm:w-auto">
                      <span className="info-label block mb-2">Target Section</span>
                      <div className="student-badge-inline m-0 bg-blue-50/50 border-blue-100">
                        <span className="material-symbols-outlined text-[16px] text-blue-500">meeting_room</span>
                        <span className="font-bold text-blue-700">{req.section_id?.section_name || "Unknown"}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <span className="info-label block mb-2">Date Submitted</span>
                      <span className="text-[14px] font-bold text-slate-700">{formatDate(req.created_at)}</span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="w-full p-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                    {req.status === 'Pending' ? (
                      <div className="flex w-full gap-3">
                        <button 
                          className="btn-card btn-reject flex-1"
                          onClick={() => promptUpdateStatus(req._id, 'Rejected', `${req.student_first_name} ${req.student_last_name}`)}
                        >
                          Reject Application
                        </button>
                        <button 
                          className="btn-card btn-approve flex-1"
                          onClick={() => promptUpdateStatus(req._id, 'Approved_By_Teacher', `${req.student_first_name} ${req.student_last_name}`)}
                        >
                          Approve & Send to Admin
                        </button>
                      </div>
                    ) : (
                      // Display History Status in the Reviewed Tab (Now GUARANTEED full width)
                      <div className={`w-full font-bold text-[14px] text-center py-3 rounded-xl border ${req.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {req.status === 'Rejected' ? 'Application Rejected' : 'Sent to Super Admin'}
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      </main>

      {/* --- SECTION CODES MODAL --- */}
      {showCodesModal && (
        <div className="approval-modal-overlay" onClick={() => setShowCodesModal(false)}>
          <div className="approval-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
            <button className="close-modal-icon" onClick={() => setShowCodesModal(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-xl font-bold text-slate-800 mb-2">Your Classrooms</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Share these 6-digit section codes with parents so they can register their child directly to your roster.
            </p>

            <div className="flex flex-col gap-3">
              {sections.length === 0 ? (
                 <p className="text-center text-slate-400 py-4 text-sm font-medium">No sections assigned to you yet.</p>
              ) : (
                sections.map((sec, index) => (
                  <div key={sec._id || sec.id || index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-0 transition-all hover:border-blue-300">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</span>
                      <span className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-blue-500">meeting_room</span>
                        {sec.section_name || sec.name || "Unknown Section"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-lg font-mono font-bold text-blue-600 tracking-[0.1em] bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                        {sec.section_code || sec.code || "N/A"}
                      </span>
                      <button 
                        onClick={() => handleCopyCode(sec.section_code || sec.code)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm shrink-0"
                        title="Copy Code"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {copiedCode === (sec.section_code || sec.code) ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button className="btn btn-outline w-full h-[45px] rounded-xl mt-8" onClick={() => setShowCodesModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. APPLICATION DETAILS MODAL */}
      {selectedApplication && (
        <div className="approval-modal-overlay" onClick={() => setSelectedApplication(null)}>
          <div className="approval-modal-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px' }}>
            <button className="close-modal-icon" onClick={() => setSelectedApplication(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 text-center">
              Enrollment Application Review
            </h2>

            <div className="flex flex-col gap-6">
              
              {/* --- NEW: CENTERED HERO PROFILE PICTURE --- */}
              <div className="flex flex-col items-center">
                <img 
                  src={getImageUrl(selectedApplication.student_photo) || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedApplication.student_first_name}`} 
                  alt="Student Profile" 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-md object-cover bg-slate-100 cursor-zoom-in hover:scale-105 transition-transform"
                  onClick={() => setViewImage(getImageUrl(selectedApplication.student_photo) || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedApplication.student_first_name}`)}
                  title="Click to enlarge"
                />
                <h3 className="text-[18px] font-bold text-slate-800 mt-3">
                  {selectedApplication.student_first_name} {selectedApplication.student_last_name} {selectedApplication.student_suffix}
                </h3>
                <p className="text-[13px] font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-1 border border-blue-100">
                  New Enrollment
                </p>
              </div>

              {/* --- STUDENT DETAILS LIST --- */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">school</span> Student Details
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Birthdate:</span>
                    <span className="text-[14px] font-bold text-slate-800">{formatDate(selectedApplication.student_dob)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Age:</span>
                    <span className="text-[14px] font-bold text-slate-800">{calculateAge(selectedApplication.student_dob)} yrs old</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center pb-1 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Gender:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student_gender}</span>
                  </div>
                </div>
              </div>

              {/* --- PARENT DETAILS LIST --- */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">family_restroom</span> Parent Details
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Name:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent_name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Contact Number:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent_phone}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center pb-1 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Email Address:</span>
                    <span className="text-[14px] font-bold text-slate-800 break-all">{selectedApplication.parent_email}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8 flex gap-3">
              <button className="btn btn-outline flex-1 h-[45px] rounded-xl" onClick={() => setSelectedApplication(null)}>
                Close
              </button>
              
              {selectedApplication.status === 'Pending' && (
                <button 
                  className="btn btn-primary flex-1 h-[45px] rounded-xl" 
                  onClick={() => promptUpdateStatus(selectedApplication._id, 'Approved_By_Teacher', `${selectedApplication.student_first_name} ${selectedApplication.student_last_name}`)}
                >
                  Approve Enrollment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- IMAGE LIGHTBOX OVERLAY --- */}
      {viewImage && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex justify-center items-center p-6 cursor-zoom-out transition-all"
          onClick={() => setViewImage(null)}
        >
          <img 
            src={viewImage} 
            alt="Fullscreen View" 
            className="max-w-full max-h-full rounded-2xl shadow-2xl border-[6px] border-white/10"
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            onClick={() => setViewImage(null)}
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>
      )}

    </div>
  );
}