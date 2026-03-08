// frontend/src/pages/admin-teacher/EnrollmentApproval.jsx

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx"; 
import Header from "../../components/navigation/Header";
import NavBar from "../../components/navigation/NavBar";
import ConfirmModal from "../../components/ConfirmModal"; 
import SuccessModal from "../../components/SuccessModal"; 
import WarningModal from "../../components/WarningModal"; 
import "../../styles/admin-teacher/admin-manage-approvals.css"; 

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function EnrollmentApproval() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [viewImage, setViewImage] = useState(null); 
  
  const [requests, setRequests] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCodesModal, setShowCodesModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const [inviteStep, setInviteStep] = useState(1); 
  const [selectedSectionForInvite, setSelectedSectionForInvite] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [manualInput, setManualInput] = useState({ firstName: '', lastName: '', email: '' });
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(""); 
  const fileInputRef = useRef(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false); 
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false); 
  
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    isDestructive: false,
    actionData: null 
  });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectActionData, setRejectActionData] = useState(null);

  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  const showWarning = (title, message) => {
    setWarningConfig({ isOpen: true, title, message });
  };

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
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${BACKEND_URL}/${cleanPath}`;
  };

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

        setRecipients(prev => {
          const newRecipients = [];
          let duplicateCount = 0;

          parsed.forEach(incoming => {
            const inEmail = incoming.email.toLowerCase();
            const inFirst = incoming.firstName.toLowerCase();
            const inLast = incoming.lastName.toLowerCase();

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

          if (newRecipients.length > 0) {
            setUploadSuccessMsg(`Loaded ${newRecipients.length} emails! ${duplicateCount > 0 ? `(${duplicateCount} duplicates skipped)` : ''}`);
            setTimeout(() => setUploadSuccessMsg(""), 4500);
          } else if (duplicateCount > 0) {
            showWarning("Duplicates Found", `All ${duplicateCount} rows in the file were already in your list.`);
          }

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
      
      setInviteStep(1);
      setRecipients([]);
      setSelectedSectionForInvite(null);
    } catch (error) {
      console.error("Failed to send invites:", error);
      showWarning("Action Failed", "Failed to send invitations to parents.");
    } finally {
      setIsSendingInvites(false);
      setIsSendConfirmOpen(false);
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
    }, 300); 
  };

  const promptApprove = (id, studentName) => {
    setConfirmConfig({
      isOpen: true,
      title: "Approve & Register Student?",
      message: `You are about to approve the enrollment application for ${studentName}. This will instantly register the student into your class and email the parent their invitation code. Do you want to proceed?`,
      confirmText: "Yes, Register",
      isDestructive: false,
      actionData: { id, status: 'Registered' }
    });
  };

  const promptReject = (id, studentName) => {
    setRejectActionData({ id, studentName });
    setRejectReason("");
    setShowRejectModal(true);
  };

  const executeApproveAction = async () => {
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
        setSuccessMessage("Student successfully approved and registered!");
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      showWarning("Registration Error", "Something went wrong while processing the application.");
    } finally {
      setConfirmConfig({ ...confirmConfig, isOpen: false });
    }
  };

  const executeRejectAction = async () => {
    const { id } = rejectActionData;
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/teacher/enrollments/${id}/status`,
        { status: 'Rejected', reason: rejectReason },
        { withCredentials: true }
      );

      if (response.data.success) {
        setRequests(prevRequests => 
          prevRequests.map(req => req._id === id ? { ...req, status: 'Rejected' } : req)
        );
        setSelectedApplication(null); 
        setSuccessMessage("Application rejected and parent notified via email.");
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Failed to reject application:", error);
      showWarning("Rejection Error", "Something went wrong while rejecting the application.");
    } finally {
      setShowRejectModal(false);
      setRejectReason("");
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === 'pending' 
      ? req.status === 'Pending' 
      : ['Rejected', 'Registered'].includes(req.status);

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
      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={executeApproveAction}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDestructive={confirmConfig.isDestructive}
      />

      {showRejectModal && (
        <div className="modal-overlay active z-[9999]">
          <div className="modal-card max-w-[400px] p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h2 className="text-lg m-0 font-bold">Reject Application?</h2>
            </div>
            <p className="text-[14px]! text-slate-600 mb-5 leading-relaxed">
              You are about to reject the pre-enrollment for <strong>{rejectActionData?.studentName}</strong>. Please provide a reason to help the parent understand what needs to be fixed.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 mb-2">Reason for Rejection <span className="text-red-500">*</span></label>
              <textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="e.g., Child is not on my masterlist..." 
                className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none min-h-[80px] resize-y" 
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowRejectModal(false)} 
                className="bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={!rejectReason.trim()} 
                onClick={executeRejectAction} 
                className={`text-white border-none px-4 py-2 rounded-lg font-semibold ${rejectReason.trim() ? 'bg-red-500 cursor-pointer' : 'bg-red-300 cursor-not-allowed'}`}
              >
                Reject & Notify Parent
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)} onConfirm={() => setRecipients([])} title="Clear All Recipients?" message="Are you sure you want to completely clear the list of recipients?" confirmText="Clear List" cancelText="Cancel" isDestructive={true} />
      <ConfirmModal isOpen={isSendConfirmOpen} onClose={() => setIsSendConfirmOpen(false)} onConfirm={handleSendBulkInvites} title="Send Invitations?" message={`Are you sure you want to send ${recipients.length} invitation email(s)?`} confirmText="Yes, Send Emails" cancelText="Cancel" isDestructive={false} />
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />
      <WarningModal isOpen={warningConfig.isOpen} onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })} title={warningConfig.title} message={warningConfig.message} />

      <main className="main-content">
        <div className="approvals-container">
          <div className="header-banner flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
            <div className="header-title">
              <h1>Student Registrations</h1>
              <p className="text-[14px]!">Review new pre-enrollments and register students directly to your class.</p>
            </div>
            <button onClick={() => setShowCodesModal(true)} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 sm:px-5 py-3 rounded-xl backdrop-blur-sm transition-all font-semibold border border-white/30 shadow-sm w-full md:w-auto justify-center">
              <span className="material-symbols-outlined text-[20px]">key</span>
              <span className="hidden sm:inline">Section Codes & Invites</span>
            </button>
          </div>

          <div className="controls-bar">
            <div className="controls-left">
              <div className="tab-group">
                <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending {requests.filter(r => r.status === 'Pending').length > 0 && <span className="tab-badge">{requests.filter(r => r.status === 'Pending').length}</span>}</button>
                <button className={`tab-btn ${activeTab === 'reviewed' ? 'active' : ''}`} onClick={() => setActiveTab('reviewed')}>Reviewed {requests.filter(r => r.status !== 'Pending').length > 0 && <span className="tab-badge neutral">{requests.filter(r => r.status !== 'Pending').length}</span>}</button>
              </div>
            </div>
            <div className="controls-right">
              <div className="search-mini">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                <input type="text" placeholder="Search parent or student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="requests-grid">
            {loading ? (
              <div className="text-center py-10 text-slate-500 font-medium w-full col-span-full">Loading pending enrollments...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="empty-queue col-span-full">
                <span className="material-symbols-outlined empty-queue-icon">inbox</span>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No {activeTab} enrollments</h3>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req._id} className="request-card">
                  <div className="card-split-header">
                    <div className="header-half header-left">
                      <span className="info-label">Submitted By (Parent)</span>
                      <div className="person-group">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shrink-0">{req.parent_name.charAt(0)}</div>
                        <div className="name-stack overflow-hidden">
                          <span className="info-value truncate" title={req.parent_name}>{req.parent_name}</span>
                          <span className="role-tag bg-slate-100 text-slate-600">{req.parent_phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="header-half guardian-clickable" onClick={() => setSelectedApplication(req)}>
                      <span className="info-label text-blue-600">Prospective Student</span>
                      <div className="person-group">
                        <img src={getImageUrl(req.student_photo) || `https://api.dicebear.com/7.x/initials/svg?seed=${req.student_first_name}`} alt="Student" className="header-avatar object-cover bg-slate-100" />
                        <div className="name-stack overflow-hidden">
                          <span className="info-value truncate" title={`${req.student_first_name} ${req.student_last_name}`}>{req.student_first_name} {req.student_last_name}</span>
                          <span className="role-tag">New Enrollment</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <div className="w-full p-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                    {req.status === 'Pending' ? (
                      <div className="flex w-full gap-3">
                        <button className="btn-card btn-reject flex-1 flex items-center justify-center gap-1.5" onClick={() => promptReject(req._id, `${req.student_first_name} ${req.student_last_name}`)}>
                          <span className="material-symbols-outlined text-[18px]">close</span>
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                        <button className="btn-card btn-approve flex-1 flex items-center justify-center gap-1.5" onClick={() => promptApprove(req._id, `${req.student_first_name} ${req.student_last_name}`)}>
                          <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                          <span className="hidden sm:inline">Approve</span>
                        </button>
                      </div>
                    ) : (
                      <div className={`w-full font-bold text-[14px] text-center py-3 rounded-xl border flex justify-center items-center gap-2 ${req.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        <span className="material-symbols-outlined text-[18px]">{req.status === 'Rejected' ? 'cancel' : 'verified_user'}</span>
                        {req.status === 'Rejected' ? 'Application Rejected' : 'Enrolled & Registered'}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {showCodesModal && (
        <div className="approval-modal-overlay" onClick={closeCodesModal}>
          <div className={`approval-modal-card transition-all duration-300 relative overflow-hidden w-[90%] min-h-[300px] ${inviteStep === 1 ? 'max-w-[500px]' : 'max-w-[650px]'}`} onClick={e => e.stopPropagation()}>
            {isSendingInvites && (
              <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                <span className="material-symbols-outlined animate-spin text-blue-600 text-[48px] mb-4">autorenew</span>
                <h3 className="text-xl font-bold text-slate-800">Sending Invitations...</h3>
              </div>
            )}
            <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500" onClick={closeCodesModal}><span className="material-symbols-outlined text-[18px]">close</span></button>
            <div className="pt-10">
              {inviteStep === 1 && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <div className="mb-6 pr-12"><h2 className="text-xl font-bold text-slate-800 mb-2">Your Classrooms</h2><p className="text-[14px]! text-slate-500">Share codes with parents or invite via email.</p></div>
                  <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-2">
                    {sections.map((sec, index) => (
                      <div key={sec._id || sec.id || index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div><span className="text-[11px] font-bold text-slate-400 uppercase">Section</span><span className="text-[16px] font-bold text-slate-800 flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-blue-500">meeting_room</span>{sec.section_name || sec.name}</span></div>
                          <div className="flex items-center gap-2"><span className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">{sec.section_code || sec.code}</span><button onClick={() => handleCopyCode(sec.section_code || sec.code)} className="w-[38px] h-[38px] flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500"><span className="material-symbols-outlined text-[18px]">{copiedCode === (sec.section_code || sec.code) ? 'check' : 'content_copy'}</span></button></div>
                        </div>
                        <div className="border-t border-slate-200 pt-3 flex justify-end"><button className="text-[13px] font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-lg flex items-center gap-2" onClick={() => { setSelectedSectionForInvite(sec); setInviteStep(2); }}><span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>Invite Parents</button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inviteStep === 2 && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4"><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><span className="material-symbols-outlined text-[22px] text-blue-500">meeting_room</span>{selectedSectionForInvite?.section_name}</h2><div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"><span className="text-[14px] font-bold text-blue-700">{recipients.length} Ready</span></div></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col relative"><h3 className="text-[13px] font-bold text-slate-700 mb-2">Upload Excel / CSV</h3>{uploadSuccessMsg && (<div className="absolute inset-0 top-[26px] z-10 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex flex-col items-center justify-center text-emerald-700 p-4 text-center"><span className="material-symbols-outlined text-[40px] mb-2">check_circle</span><span className="text-[13px] font-bold">{uploadSuccessMsg}</span></div>)}<div className="border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[180px]" onClick={() => fileInputRef.current.click()}><span className="material-symbols-outlined text-blue-500 text-[40px] mb-2">upload_file</span><span className="text-[13px] font-bold text-blue-700 mb-1">Browse Files</span><input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" /></div></div>
                    <div className="flex flex-col"><h3 className="text-[13px] font-bold text-slate-700 mb-2">Or Add Manually</h3><div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3"><div className="flex gap-2"><input type="text" placeholder="First Name" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px]" value={manualInput.firstName} onChange={(e) => setManualInput({...manualInput, firstName: e.target.value})} /><input type="text" placeholder="Last Name" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px]" value={manualInput.lastName} onChange={(e) => setManualInput({...manualInput, lastName: e.target.value})} /></div><input type="email" placeholder="Email Address" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px]" value={manualInput.email} onChange={(e) => setManualInput({...manualInput, email: e.target.value})} /><button onClick={handleAddManual} className="h-10 bg-white border border-blue-200 text-blue-600 font-bold text-[13px] rounded-lg flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[16px]">add</span>Add to List</button></div></div>
                  </div>
                  <div className="mt-8 flex justify-between border-t border-slate-100 pt-5"><button onClick={() => setInviteStep(1)} className="flex items-center gap-2 text-slate-600 bg-slate-100 px-4 py-2.5 rounded-xl font-bold text-[13px]"><span className="material-symbols-outlined text-[18px]">arrow_back</span>Back</button><button disabled={recipients.length === 0} onClick={() => setInviteStep(3)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-[13px] disabled:opacity-50">Review List<span className="material-symbols-outlined text-[16px]">arrow_forward</span></button></div>
                </div>
              )}
              {inviteStep === 3 && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4"><h2 className="text-xl font-bold text-slate-800">Review Recipients</h2><div className="bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-blue-700 text-[14px]">{recipients.length} Total</div></div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6"><div className="max-h-[300px] overflow-y-auto"><table className="w-full text-left border-collapse"><thead className="bg-slate-100 text-[11px] font-bold text-slate-500 uppercase sticky top-0"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3 text-center">Action</th></tr></thead><tbody className="text-[13px] divide-y divide-slate-100 bg-white">{recipients.map((r) => (<tr key={r.id}><td className="px-4 py-2.5 font-medium">{r.firstName} {r.lastName}</td><td className="px-4 py-2.5 text-slate-500">{r.email}</td><td className="px-4 py-2.5 text-center"><button onClick={() => handleRemoveRecipient(r.id)} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-[18px]">delete</span></button></td></tr>))}</tbody></table></div></div>
                  <div className="flex justify-between border-t border-slate-100 pt-5"><button onClick={() => setInviteStep(2)} className="bg-slate-100 px-4 py-2.5 rounded-xl font-bold text-[13px]">Back</button><div className="flex gap-3"><button className="text-red-600 bg-red-50 border border-red-100 w-[44px] h-[44px] rounded-xl flex items-center justify-center" onClick={() => setIsClearConfirmOpen(true)}><span className="material-symbols-outlined">delete</span></button><button onClick={() => setIsSendConfirmOpen(true)} className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold text-[13px] flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">send</span>Send Invites</button></div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedApplication && (
        <div className="approval-modal-overlay" onClick={() => setSelectedApplication(null)}>
          <div className="approval-modal-card w-[90%] max-w-[500px]" onClick={e => e.stopPropagation()}>
            {/* UPDATED HEADER SECTION */}
            <div className="flex flex-row justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800 text-left m-0">Enrollment Application Review</h2>
              <button className="text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90 bg-transparent border-none cursor-pointer flex items-center justify-center p-2 z-50" onClick={() => setSelectedApplication(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center">
                <img src={getImageUrl(selectedApplication.student_photo) || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedApplication.student_first_name}`} alt="Student" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-slate-100 cursor-zoom-in" onClick={() => setViewImage(getImageUrl(selectedApplication.student_photo) || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedApplication.student_first_name}`)} />
                <h3 className="text-[18px] font-bold text-slate-800 mt-3">{selectedApplication.student_first_name} {selectedApplication.student_last_name}</h3>
                <p className="text-[13px]! font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">New Enrollment</p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">school</span> Student Details</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2"><span className="text-[13px] font-semibold text-slate-500">Birthdate:</span><span className="text-[14px] font-bold text-slate-800">{formatDate(selectedApplication.student_dob)}</span></div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2"><span className="text-[13px] font-semibold text-slate-500">Age:</span><span className="text-[14px] font-bold text-slate-800">{calculateAge(selectedApplication.student_dob)} yrs</span></div>
                  <div className="flex justify-between"><span className="text-[13px] font-semibold text-slate-500">Gender:</span><span className="text-[14px] font-bold text-slate-800">{selectedApplication.student_gender}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">family_restroom</span> Parent Details</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2"><span className="text-[13px] font-semibold text-slate-500">Name:</span><span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent_name}</span></div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2"><span className="text-[13px] font-semibold text-slate-500">Phone:</span><span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent_phone}</span></div>
                  <div className="flex justify-between"><span className="text-[13px] font-semibold text-slate-500">Email:</span><span className="text-[14px] font-bold text-slate-800 break-all">{selectedApplication.parent_email}</span></div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button className="btn btn-outline flex-1 h-[45px] rounded-xl font-bold" onClick={() => setSelectedApplication(null)}>Close</button>
              {selectedApplication.status === 'Pending' && (<button className="btn btn-primary flex-1 h-[45px] rounded-xl font-bold" onClick={() => { setSelectedApplication(null); promptApprove(selectedApplication._id, `${selectedApplication.student_first_name} ${selectedApplication.student_last_name}`); }}>Approve</button>)}
            </div>
          </div>
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex justify-center items-center p-6 cursor-zoom-out" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="Fullscreen View" className="max-w-full max-h-full rounded-2xl shadow-2xl border-[6px] border-white/10" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 text-white rounded-full transition-colors" onClick={() => setViewImage(null)}><span className="material-symbols-outlined text-[28px]">close</span></button>
        </div>
      )}
    </div>
  );
}