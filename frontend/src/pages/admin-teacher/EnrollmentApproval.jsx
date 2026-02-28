import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx"; 
import Header from "../../components/navigation/Header";
import NavBar from "../../components/navigation/NavBar";
import ConfirmModal from "../../components/ConfirmModal"; 
import SuccessModal from "../../components/SuccessModal"; 
import WarningModal from "../../components/WarningModal"; 
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

  // --- BULK INVITE (WIZARD) STATES ---
  const [inviteStep, setInviteStep] = useState(1); // 1: List, 2: Upload/Input, 3: Review
  const [selectedSectionForInvite, setSelectedSectionForInvite] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [manualInput, setManualInput] = useState({ firstName: '', lastName: '', email: '' });
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(""); 
  const fileInputRef = useRef(null);

  // --- CONFIRM, SUCCESS & WARNING MODAL STATES ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false); 
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false); // <-- NEW: For Sending Invites
  
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    isDestructive: false,
    actionData: null 
  });

  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  // Helper to trigger Warning Modal
  const showWarning = (title, message) => {
    setWarningConfig({ isOpen: true, title, message });
  };

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
  // EXCEL PARSING & RESTRICTED BULK INVITE LOGIC
  // ==========================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Smart Extraction Logic
        const parsed = data.map(row => {
          const getVal = (regex) => {
            const key = Object.keys(row).find(k => regex.test(k.trim()));
            return key ? String(row[key]).trim() : '';
          };

          return {
            id: Date.now() + Math.random(),
            firstName: getVal(/first.*name/i) || getVal(/^given.*name/i) || '',
            lastName: getVal(/last.*name/i) || getVal(/^surname/i) || '',
            email: getVal(/email/i) || ''
          };
        }).filter(r => r.email);

        // Deduplication Logic
        setRecipients(prev => {
          const newRecipients = [];
          let duplicateCount = 0;

          parsed.forEach(incoming => {
            const inEmail = incoming.email.toLowerCase();
            const inFirst = incoming.firstName.toLowerCase();
            const inLast = incoming.lastName.toLowerCase();

            // Check if email OR full name is already in the list
            const isDup = prev.some(r => 
              r.email.toLowerCase() === inEmail || 
              (r.firstName.toLowerCase() === inFirst && r.lastName.toLowerCase() === inLast && inFirst !== '')
            ) || newRecipients.some(r => 
              r.email.toLowerCase() === inEmail || 
              (r.firstName.toLowerCase() === inFirst && r.lastName.toLowerCase() === inLast && inFirst !== '')
            );

            if (!isDup) {
              newRecipients.push(incoming);
            } else {
              duplicateCount++;
            }
          });

          // Feedback message
          setTimeout(() => {
            if (newRecipients.length > 0) {
              setUploadSuccessMsg(`Loaded ${newRecipients.length} emails! ${duplicateCount > 0 ? `(${duplicateCount} duplicates skipped)` : ''}`);
              setTimeout(() => setUploadSuccessMsg(""), 4500);
            } else if (duplicateCount > 0) {
              showWarning("Duplicates Found", `All ${duplicateCount} rows in the file were already in your list. No new emails were added.`);
            } else {
              showWarning("No Emails Found", "We couldn't find any valid emails in the file. Please ensure columns are named First Name, Last Name, and Email.");
            }
          }, 0);

          return [...prev, ...newRecipients];
        });

      } catch (err) {
        console.error("Error parsing file", err);
        showWarning("Parsing Error", "Could not read the file. Please ensure it's a valid Excel (.xlsx) or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleAddManual = () => {
    if (!manualInput.email || !manualInput.firstName) {
      showWarning("Incomplete Details", "Please provide at least a First Name and an Email Address.");
      return;
    }

    const inEmail = manualInput.email.trim().toLowerCase();
    const inFirst = manualInput.firstName.trim().toLowerCase();
    const inLast = manualInput.lastName.trim().toLowerCase();

    // Check restriction
    const isDuplicate = recipients.some(r => 
      r.email.toLowerCase() === inEmail || 
      (r.firstName.toLowerCase() === inFirst && r.lastName.toLowerCase() === inLast && inFirst !== '')
    );

    if (isDuplicate) {
      showWarning("Duplicate Entry", "This parent's name or email is already in the list!");
      return;
    }

    setRecipients(prev => [...prev, { 
      ...manualInput, 
      firstName: manualInput.firstName.trim(),
      lastName: manualInput.lastName.trim(),
      email: manualInput.email.trim(),
      id: Date.now() 
    }]);
    setManualInput({ firstName: '', lastName: '', email: '' });
  };

  const handleRemoveRecipient = (id) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const handleSendBulkInvites = async () => {
    if (recipients.length === 0) return;
    setIsSendingInvites(true);
    
    try {
      await axios.post(`${BACKEND_URL}/api/teacher/bulk-invite-section`, {
        sectionId: selectedSectionForInvite.section_id || selectedSectionForInvite.id,
        sectionName: selectedSectionForInvite.section_name || selectedSectionForInvite.name,
        sectionCode: selectedSectionForInvite.section_code || selectedSectionForInvite.code,
        recipients: recipients
      }, { withCredentials: true });

      setSuccessMessage(`Successfully sent invitations to ${recipients.length} parents!`);
      setShowSuccessModal(true);
      
      // Reset Wizard
      setInviteStep(1);
      setRecipients([]);
      setSelectedSectionForInvite(null);
    } catch (error) {
      console.error("Failed to send invites:", error);
      showWarning("Action Failed", "Failed to send invitations to parents. Please check your connection and try again.");
    } finally {
      setIsSendingInvites(false);
    }
  };

  const closeCodesModal = () => {
    setShowCodesModal(false);
    setTimeout(() => {
      setInviteStep(1);
      setRecipients([]);
      setSelectedSectionForInvite(null);
      setManualInput({ firstName: '', lastName: '', email: '' });
      setUploadSuccessMsg(""); 
    }, 300); // Reset after animation
  };

  // ==========================================
  // HANDLE APPROVE / REJECT FLOW
  // ==========================================
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

  const executeStatusUpdate = async () => {
    const { id, status } = confirmConfig.actionData;
    
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/teacher/enrollments/${id}/status`,
        { status: status },
        { withCredentials: true }
      );

      if (response.data.success) {
        setRequests(prevRequests => 
          prevRequests.map(req => req._id === id ? { ...req, status: status } : req)
        );
        setSelectedApplication(null); 
        
        setSuccessMessage(`Application successfully ${status === 'Rejected' ? 'rejected' : 'approved and sent to Admin'}!`);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      showWarning("Update Error", "Something went wrong while updating the application. Please try again.");
    }
  };

  // --- SEARCH & TAB FILTER ---
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;
  const reviewedRequestsCount = requests.filter(r => r.status !== 'Pending').length;

  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === 'pending' 
      ? req.status === 'Pending' 
      : ['Approved_By_Teacher', 'Rejected', 'Registered'].includes(req.status);

    if (!matchesTab) return false;

    const studentName = `${req.student_first_name} ${req.student_last_name}`.toLowerCase();
    const parentName = req.parent_name.toLowerCase();
    const query = searchQuery.toLowerCase();
    return studentName.includes(query) || parentName.includes(query);
  });

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />
      
      {/* GLOBAL MODALS */}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={executeStatusUpdate}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDestructive={confirmConfig.isDestructive}
      />

      <ConfirmModal 
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => setRecipients([])}
        title="Clear All Recipients?"
        message="Are you sure you want to completely clear the list of recipients? You will need to re-upload or re-enter them."
        confirmText="Clear List"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* --- NEW: SEND CONFIRMATION MODAL --- */}
      <ConfirmModal 
        isOpen={isSendConfirmOpen}
        onClose={() => setIsSendConfirmOpen(false)}
        onConfirm={handleSendBulkInvites}
        title="Send Invitations?"
        message={`Are you sure you want to send ${recipients.length} invitation email(s) for the section ${selectedSectionForInvite?.section_name || 'selected'}?`}
        confirmText="Yes, Send Emails"
        cancelText="Cancel"
        isDestructive={false}
      />

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      <WarningModal 
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })}
        title={warningConfig.title}
        message={warningConfig.message}
      />

      <main className="main-content">
        <div className="approvals-container">
          
          {/* 1. HEADER BANNER */}
          <div className="header-banner flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
            <div className="header-title">
              <h1>System Registration Requests</h1>
              <p>Review and verify new student pre-enrollments submitted by parents.</p>
            </div>

            <button 
              onClick={() => setShowCodesModal(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 sm:px-5 py-3 rounded-xl backdrop-blur-sm transition-all font-semibold border border-white/30 shadow-sm hover:shadow-md w-full md:w-auto justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">key</span>
              <span className="hidden sm:inline">Section Codes & Invites</span>
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
                      <div className="view-details-btn flex items-center gap-1">
                        <span className="hidden sm:inline">Review Full Form</span>
                        <span className="sm:hidden">Review</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
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
                          className="btn-card btn-reject flex-1 flex items-center justify-center gap-1.5"
                          onClick={() => promptUpdateStatus(req._id, 'Rejected', `${req.student_first_name} ${req.student_last_name}`)}
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                          <span className="hidden sm:inline">Reject Application</span>
                        </button>
                        <button 
                          className="btn-card btn-approve flex-1 flex items-center justify-center gap-1.5"
                          onClick={() => promptUpdateStatus(req._id, 'Approved_By_Teacher', `${req.student_first_name} ${req.student_last_name}`)}
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                          <span className="hidden sm:inline">Approve & Send to Admin</span>
                        </button>
                      </div>
                    ) : (
                      <div className={`w-full font-bold text-[14px] text-center py-3 rounded-xl border flex justify-center items-center gap-2 ${
                        req.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' : 
                        req.status === 'Registered' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {req.status === 'Rejected' ? 'cancel' : req.status === 'Registered' ? 'verified_user' : 'task_alt'}
                        </span>
                        {req.status === 'Rejected' ? 'Application Rejected' : 
                         req.status === 'Registered' ? 'Officially Enrolled by Admin' : 
                         'Sent to Super Admin'}
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      </main>

      {/* =========================================================
          NEW WIZARD: SECTION CODES & BULK INVITE MODAL
          ========================================================= */}
      {showCodesModal && (
        <div className="approval-modal-overlay" onClick={closeCodesModal}>
          <div 
            className="approval-modal-card transition-all duration-300 relative overflow-hidden" 
            onClick={e => e.stopPropagation()} 
            style={{ width: '90%', maxWidth: inviteStep === 1 ? '500px' : '650px', minHeight: '300px' }}
          >
            {/* Loading Overlay */}
            {isSendingInvites && (
              <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                <span className="material-symbols-outlined animate-spin text-blue-600 text-[48px] mb-4">autorenew</span>
                <h3 className="text-xl font-bold text-slate-800">Sending Invitations...</h3>
                <p className="text-slate-500 font-medium">Please do not close this window.</p>
              </div>
            )}

            {/* Absolute Floating X Button */}
            <button 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors z-50" 
              onClick={closeCodesModal}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            
            <div className="pt-10">
              
              {/* STEP 1: SELECT SECTION */}
              {inviteStep === 1 && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <div className="mb-6 pr-12">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Your Classrooms</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Share these 6-digit section codes with parents manually, or use the <strong>Invite feature</strong> to email them in bulk.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    {sections.length === 0 ? (
                      <p className="text-center text-slate-400 py-8 text-sm font-medium">No sections assigned to you yet.</p>
                    ) : (
                      sections.map((sec, index) => (
                        <div key={sec._id || sec.id || index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4 transition-all hover:border-blue-300 group">
                          
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</span>
                              <span className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] text-blue-500">meeting_room</span>
                                {sec.section_name || sec.name || "Unknown Section"}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-mono font-bold text-blue-600 tracking-[0.1em] bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                                {sec.section_code || sec.code || "N/A"}
                              </span>
                              <button 
                                onClick={() => handleCopyCode(sec.section_code || sec.code)}
                                className="w-[38px] h-[38px] flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm shrink-0"
                                title="Copy Code"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {copiedCode === (sec.section_code || sec.code) ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-slate-200 pt-3 flex justify-end">
                            <button 
                              className="text-[13px] font-bold text-white bg-slate-800 hover:bg-slate-900 px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
                              onClick={() => {
                                setSelectedSectionForInvite(sec);
                                setInviteStep(2);
                              }}
                            >
                              <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                              <span className="hidden sm:inline">Invite Parents</span>
                            </button>
                          </div>
                          
                        </div>
                      ))
                    )}
                  </div>

                  <button className="btn btn-outline w-full h-[45px] rounded-xl mt-6 flex justify-center items-center gap-2" onClick={closeCodesModal}>
                    <span className="material-symbols-outlined text-[18px] sm:hidden">close</span>
                    <span className="hidden sm:inline">Close Window</span>
                  </button>
                </div>
              )}

              {/* STEP 2: UPLOAD EXCEL & MANUAL INPUT */}
              {inviteStep === 2 && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 leading-tight">
                      <span className="material-symbols-outlined text-[22px] text-blue-500">meeting_room</span>
                      {selectedSectionForInvite?.section_name || selectedSectionForInvite?.name}
                    </h2>
                    <div className="flex items-center gap-1.5 bg-blue-50/80 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-blue-600 text-[18px]">check_circle</span>
                      <span className="text-[14px] font-bold text-blue-700">{recipients.length} Ready</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Excel Upload */}
                    <div className="flex flex-col relative">
                      <h3 className="text-[13px] font-bold text-slate-700 mb-2">Upload Excel / CSV</h3>
                      
                      {uploadSuccessMsg && (
                        <div className="absolute inset-0 top-[26px] z-10 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex flex-col items-center justify-center text-emerald-700 animate-[fadeIn_0.2s_ease-out] p-4 text-center">
                          <span className="material-symbols-outlined text-[40px] mb-2">check_circle</span>
                          <span className="text-[13px] font-bold leading-snug">{uploadSuccessMsg}</span>
                        </div>
                      )}

                      <div 
                        className="border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-full min-h-[180px]"
                        onClick={() => fileInputRef.current.click()}
                      >
                        <span className="material-symbols-outlined text-blue-500 text-[40px] mb-2">upload_file</span>
                        <span className="text-[13px] font-bold text-blue-700 mb-1">Click to Browse Files</span>
                        <span className="text-[11px] text-slate-500">Requires columns: First Name, Last Name, Email</span>
                        
                        <input 
                          type="file" 
                          accept=".xlsx, .xls, .csv" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                      </div>
                    </div>

                    {/* Right: Manual Entry */}
                    <div className="flex flex-col">
                      <h3 className="text-[13px] font-bold text-slate-700 mb-2">Or Add Manually</h3>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="First Name" 
                            className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500" 
                            value={manualInput.firstName}
                            onChange={(e) => setManualInput({...manualInput, firstName: e.target.value})}
                          />
                          <input 
                            type="text" 
                            placeholder="Last Name" 
                            className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500" 
                            value={manualInput.lastName}
                            onChange={(e) => setManualInput({...manualInput, lastName: e.target.value})}
                          />
                        </div>
                        <input 
                          type="email" 
                          placeholder="Email Address" 
                          className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500" 
                          value={manualInput.email}
                          onChange={(e) => setManualInput({...manualInput, email: e.target.value})}
                        />
                        <button 
                          onClick={handleAddManual}
                          className="h-10 bg-white border border-blue-200 text-blue-600 font-bold text-[13px] rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          <span className="hidden sm:inline">Add to List</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-5">
                    <button
                      onClick={() => setInviteStep(1)}
                      className="flex justify-center items-center gap-2 text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors font-bold text-[13px] sm:w-[140px] w-[44px] h-[44px] rounded-xl active:scale-95"
                      title="Back"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      <span className="hidden sm:inline">Back</span>
                    </button>
                    
                    <button 
                      className="flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white sm:w-[140px] w-[44px] h-[44px] rounded-xl font-bold transition-transform active:scale-95 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                      disabled={recipients.length === 0}
                      onClick={() => setInviteStep(3)}
                      title="Review List"
                    >
                      <span className="hidden sm:inline">Review List</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & SEND */}
              {inviteStep === 3 && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  
                  {/* COMPLETELY CLEAN HEADER */}
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800 leading-tight">Review Recipients</h2>
                    <div className="flex items-center gap-1.5 bg-blue-50/80 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-blue-600 text-[18px]">group</span>
                      <span className="text-[14px] font-bold text-blue-700">{recipients.length} Total</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 backdrop-blur-md">
                          <tr>
                            <th className="px-4 py-3 border-b border-slate-200">Name</th>
                            <th className="px-4 py-3 border-b border-slate-200">Email</th>
                            <th className="px-4 py-3 border-b border-slate-200 w-[60px] text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-[13px] text-slate-700 divide-y divide-slate-100 bg-white">
                          {recipients.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2.5 font-medium">{r.firstName} {r.lastName}</td>
                              <td className="px-4 py-2.5 text-slate-500">{r.email}</td>
                              <td className="px-4 py-2.5 text-center">
                                <button 
                                  onClick={() => handleRemoveRecipient(r.id)}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors mx-auto"
                                  title="Remove"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-5">
                    <button
                      onClick={() => setInviteStep(2)}
                      className="flex justify-center items-center gap-2 text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors font-bold text-[13px] sm:w-[140px] w-[44px] h-[44px] rounded-xl active:scale-95 shrink-0"
                      title="Back"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      <span className="hidden sm:inline">Back</span>
                    </button>
                    
                    <div className="flex items-center gap-3">
                      
                      <button 
                        className="flex justify-center items-center text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors w-[44px] h-[44px] rounded-xl active:scale-95 shrink-0" 
                        onClick={() => setIsClearConfirmOpen(true)}
                        title="Clear All"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>

                      {/* --- THE FIX: Now opens the Send Confirm Modal --- */}
                      <button 
                        className="flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white sm:min-w-[140px] w-[44px] h-[44px] rounded-xl font-bold transition-transform active:scale-95 text-[13px] shadow-md shadow-emerald-500/20 disabled:opacity-50 shrink-0"
                        disabled={recipients.length === 0}
                        onClick={() => setIsSendConfirmOpen(true)}
                        title="Send Invites"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        <span className="hidden sm:inline">Send Invites</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              <button className="btn btn-outline flex-1 h-[45px] rounded-xl flex justify-center items-center gap-2" onClick={() => setSelectedApplication(null)}>
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span className="hidden sm:inline">Close</span>
              </button>
              
              {selectedApplication.status === 'Pending' && (
                <button 
                  className="btn btn-primary flex-1 h-[45px] rounded-xl flex justify-center items-center gap-2" 
                  onClick={() => promptUpdateStatus(selectedApplication._id, 'Approved_By_Teacher', `${selectedApplication.student_first_name} ${selectedApplication.student_last_name}`)}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span className="hidden sm:inline">Approve Enrollment</span>
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