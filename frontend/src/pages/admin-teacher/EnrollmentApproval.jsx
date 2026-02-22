import React, { useState } from "react";
import Header from "../../components/navigation/Header";
import NavBar from "../../components/navigation/NavBar";
import "../../styles/admin-teacher/admin-manage-approvals.css"; 

export default function EnrollmentApproval() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);

  // --- DUMMY DATA FOR UI TESTING ---
  const dummyRequests = [
    {
      id: "REQ-001",
      parent: { name: "Maria Clara", phone: "09123456789", email: "maria@email.com" },
      // Added birthdate to match your new modal design
      student: { name: "Arvin Dela Cruz", birthdate: "October 14, 2019", age: 6, gender: "Male", suffix: "" },
      section: "Sampaguita",
      dateSubmitted: "Feb 23, 2026",
      status: "pending"
    }
  ];

  const filteredRequests = dummyRequests.filter(req => req.status === activeTab);

  return (
    <div className="dashboard-wrapper">
      <Header />
      <NavBar />
      
      <main className="main-content">
        <div className="approvals-container">
          
          {/* 1. HEADER BANNER */}
          <div className="header-banner">
            <div className="header-title">
              <h1>Enrollment Requests</h1>
              <p>Review and verify new student pre-enrollments submitted by parents.</p>
            </div>
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

                  {/* BOTTOM: REQUEST METADATA */}
                  <div className="flex items-center justify-between p-4 border-b border-dashed border-slate-300 bg-white">
                    <div className="text-left">
                      <span className="info-label block mb-2">Target Section</span>
                      <div className="student-badge-inline m-0">
                        <span className="material-symbols-outlined text-[16px] text-blue-500">meeting_room</span>
                        {req.section}
                      </div>
                    </div>
                    <div className="text-right">
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

      {/* 4. DETAILS MODAL (UPDATED DESIGN) */}
      {selectedApplication && (
        <div className="approval-modal-overlay" onClick={() => setSelectedApplication(null)}>
          <div className="approval-modal-card" onClick={e => e.stopPropagation()}>
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
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[13px] font-semibold text-slate-500">Name:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student.name} {selectedApplication.student.suffix}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[13px] font-semibold text-slate-500">Birthdate:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student.birthdate}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[13px] font-semibold text-slate-500">Age:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.student.age} yrs old</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
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
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[13px] font-semibold text-slate-500">Name:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[13px] font-semibold text-slate-500">Contact Number:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent.phone}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-[13px] font-semibold text-slate-500">Email Address:</span>
                    <span className="text-[14px] font-bold text-slate-800">{selectedApplication.parent.email}</span>
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