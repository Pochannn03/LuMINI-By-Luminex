import React, { useState } from "react";
import Header from "../../components/navigation/Header";
import NavBar from "../../components/navigation/NavBar";
import "../../styles/admin-teacher/admin-manage-approvals.css"; 

export default function EnrollmentApproval() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  
  // --- CODES MODAL STATES ---
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // --- DUMMY DATA ---
  const dummyRequests = [
    {
      id: "REQ-001",
      parent: { name: "Maria Clara", phone: "09123456789", email: "maria@email.com" },
      student: { name: "Arvin Dela Cruz", birthdate: "October 14, 2019", age: 6, gender: "Male", suffix: "" },
      section: "Sampaguita",
      dateSubmitted: "Feb 23, 2026",
      status: "pending"
    }
  ];

  const dummySections = [
    { id: 1, name: "Sampaguita", code: "AVC642" },
    { id: 2, name: "Rosas", code: "XYZ123" }
  ];

  const filteredRequests = dummyRequests.filter(req => req.status === activeTab);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000); 
  };

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />
      
      <main className="main-content">
        <div className="approvals-container">
          
          {/* 1. HEADER BANNER - Added md: flex rules for responsiveness */}
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
                  Pending <span className="tab-badge">{dummyRequests.length}</span>
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'reviewed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reviewed')}
                >
                  Reviewed <span className="tab-badge neutral">0</span>
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
            {filteredRequests.length === 0 ? (
              <div className="empty-queue">
                <span className="material-symbols-outlined empty-queue-icon">inbox</span>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No pending enrollments</h3>
                <p className="text-slate-500">You're all caught up! New parent submissions will appear here.</p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className="request-card">
                  
                  <div className="card-split-header">
                    {/* LEFT: PARENT INFO */}
                    <div className="header-half header-left">
                      <span className="info-label">Submitted By (Parent)</span>
                      <div className="person-group">
                        <img 
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${req.parent.name}`} 
                          alt="Parent" 
                          className="header-avatar"
                        />
                        <div className="name-stack">
                          <span className="info-value">{req.parent.name}</span>
                          <span className="role-tag" style={{ background: '#f1f5f9', color: '#475569' }}>
                            {req.parent.phone}
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
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${req.student.name}`} 
                          alt="Student" 
                          className="header-avatar"
                        />
                        <div className="name-stack">
                          <span className="info-value">{req.student.name}</span>
                          <span className="role-tag">New Enrollment</span>
                        </div>
                      </div>
                      <div className="view-details-btn">
                        Review Full Form <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM: REQUEST METADATA - Added responsive flex-col to sm:flex-row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-dashed border-slate-300 bg-white gap-4 sm:gap-0">
                    <div className="text-left w-full sm:w-auto">
                      <span className="info-label block mb-2">Target Section</span>
                      <div className="student-badge-inline m-0">
                        <span className="material-symbols-outlined text-[16px] text-blue-500">meeting_room</span>
                        {req.section}
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <span className="info-label block mb-2">Date Submitted</span>
                      <span className="text-[14px] font-bold text-slate-700">{req.dateSubmitted}</span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="card-actions">
                    <button className="btn-card btn-reject">Reject Application</button>
                    <button className="btn-card btn-approve">Approve & Enroll</button>
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
              {dummySections.map((sec) => (
                // Added flex-col to sm:flex-row so it stacks nicely on tiny screens
                <div key={sec.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-0 transition-all hover:border-blue-300">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</span>
                    <span className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-500">meeting_room</span>
                      {sec.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-lg font-mono font-bold text-blue-600 tracking-[0.1em] bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                      {sec.code}
                    </span>
                    <button 
                      onClick={() => handleCopyCode(sec.code)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm shrink-0"
                      title="Copy Code"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {copiedCode === sec.code ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
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
          <div className="approval-modal-card" onClick={e => e.stopPropagation()} style={{ width: '90%' }}>
            <button className="close-modal-icon" onClick={() => setSelectedApplication(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
              Enrollment Application Review
            </h2>

            <div className="flex flex-col gap-6">
              
              {/* --- STUDENT DETAILS LIST --- */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">school</span> Student Details
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Name:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student.name} {selectedApplication.student.suffix}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Birthdate:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student.birthdate}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Age:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student.age} yrs old</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center pb-1 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Gender:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student.gender}</span>
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
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center border-b border-dashed border-slate-200 pb-2 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Contact Number:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent.phone}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center pb-1 gap-1 sm:gap-0">
                    <span className="text-[13px] font-semibold text-slate-500">Email Address:</span>
                    <span className="text-[14px] font-bold text-slate-800 break-all">{selectedApplication.parent.email}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8 flex gap-3">
              <button className="btn btn-outline flex-1 h-[45px] rounded-xl" onClick={() => setSelectedApplication(null)}>
                Close
              </button>
              <button className="btn btn-primary flex-1 h-[45px] rounded-xl" onClick={() => alert("Ready to hit the API!")}>
                Approve Enrollment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}