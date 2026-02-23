import React, { useState, useEffect } from "react";
import NavBar from "../../components/navigation/NavBar";

export default function SuperAdminBulkRegistration() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // --- DRILL-DOWN STATE ---
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // --- SELECTION & REVIEW STATES ---
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [reviewingRequest, setReviewingRequest] = useState(null);

  // Clear selections if we go back to the teacher list
  useEffect(() => {
    if (!selectedTeacher) {
      setSelectedRequests([]);
    }
  }, [selectedTeacher]);

  // --- DUMMY DATA FOR TEACHERS ---
  const dummyTeachers = [
    { 
      id: 1, 
      name: "Maria Clara", 
      section: "Adviser - Sampaguita", 
      pendingRequests: 5 
    },
    { 
      id: 2, 
      name: "Juan Dela Cruz", 
      section: "Adviser - Rosas", 
      pendingRequests: 2 
    },
    { 
      id: 3, 
      name: "Ana Santos", 
      section: "Adviser - Ilang-Ilang", 
      pendingRequests: 0 
    }
  ];

  // --- DUMMY DATA FOR APPROVED REQUESTS (Waiting for SuperAdmin) ---
  const dummyApprovedRequests = [
    { id: "APP-001", teacherId: 1, parent: { name: "Maria Clara", phone: "09123456789", email: "maria@email.com" }, student: { name: "Arvin Dela Cruz", birthdate: "October 14, 2019", age: 6, gender: "Male", suffix: "" }, section: "Sampaguita", dateApproved: "Feb 23, 2026" },
    { id: "APP-002", teacherId: 1, parent: { name: "Leonor Rivera", phone: "09987654321", email: "leonor@email.com" }, student: { name: "Jose Rizal", birthdate: "June 19, 2018", age: 7, gender: "Male", suffix: "Jr" }, section: "Sampaguita", dateApproved: "Feb 23, 2026" },
    { id: "APP-003", teacherId: 1, parent: { name: "Andres Bonifacio", phone: "09112223333", email: "andres@email.com" }, student: { name: "Emilio Jacinto", birthdate: "Dec 15, 2018", age: 7, gender: "Male", suffix: "" }, section: "Sampaguita", dateApproved: "Feb 24, 2026" },
    { id: "APP-004", teacherId: 2, parent: { name: "Apolinario Mabini", phone: "09334445555", email: "apolinario@email.com" }, student: { name: "Antonio Luna", birthdate: "Oct 29, 2018", age: 7, gender: "Male", suffix: "" }, section: "Rosas", dateApproved: "Feb 24, 2026" },
  ];

  const filteredTeachers = dummyTeachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get requests only for the currently selected teacher
  const currentTeacherRequests = dummyApprovedRequests.filter(req => req.teacherId === selectedTeacher?.id);
  
  // Checkbox logic
  const allSelected = currentTeacherRequests.length > 0 && selectedRequests.length === currentTeacherRequests.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(currentTeacherRequests.map(r => r.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const handleRegisterSelected = () => {
    alert(`Registering ${selectedRequests.length} students into the system database!`);
    setSelectedRequests([]);
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        
        {!selectedTeacher ? (
          
          /* ----------------------------------------------------
             VIEW 1: MASTER LIST (All Teachers)
             ---------------------------------------------------- */
          <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
            <div className="superadmin-banner">
              <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">
                Bulk Registration
              </h1>
              <p className="text-[white]! opacity-80 text-[15px]! m-0">
                Review and finalize teacher-approved student enrollments.
              </p>
            </div>

            <div className="max-w-[1200px] m-auto">
              <div className="card queue-card p-6 sm:p-8">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-cdark flex items-center gap-2">
                      <span className="material-symbols-outlined text-cbrand-blue">inbox_customize</span>
                      Pending Teacher Queues
                    </h2>
                    <p className="text-sm text-cgray mt-1">Select a teacher to review their approved students.</p>
                  </div>

                  <div className="search-bar-small flex items-center gap-2 w-full md:w-auto md:min-w-[300px]">
                    <span className="material-symbols-outlined">search</span>
                    <input 
                      type="text" 
                      placeholder="Search teacher or section..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {filteredTeachers.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      No teachers found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <div 
                        key={teacher.id} 
                        onClick={() => setSelectedTeacher(teacher)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:-translate-y-[2px] hover:shadow-md transition-all border border-slate-200 rounded-xl hover:border-blue-300 bg-white group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                            <img 
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${teacher.name}`} 
                              alt={teacher.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {teacher.name}
                            </h3>
                            <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                              {teacher.section}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t border-slate-100 sm:border-0 pt-3 sm:pt-0">
                          {teacher.pendingRequests > 0 ? (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 font-bold px-3 py-1 rounded-lg text-[12px] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px]">pending_actions</span>
                              {teacher.pendingRequests} Ready to Register
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 text-slate-500 font-bold px-3 py-1 rounded-lg text-[12px] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Caught Up
                            </div>
                          )}
                          
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          </div>

        ) : (

          /* ----------------------------------------------------
             VIEW 2: DETAIL PAGE (Selected Teacher's Workspace)
             ---------------------------------------------------- */
          <div className="animate-[fadeIn_0.3s_ease-out_forwards]">
            
            <div className="superadmin-banner flex justify-between items-center">
              <div>
                <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">
                  {selectedTeacher.name}'s Approvals
                </h1>
                <p className="text-[white]! opacity-80 text-[15px]! m-0">
                  Reviewing approved students for {selectedTeacher.section}
                </p>
              </div>
            </div>

            <div className="max-w-[1200px] m-auto">
              <div className="card queue-card p-6 sm:p-8 min-h-[450px]">
                
                {/* --- TOP ACTION BAR --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-200">
                  
                  {/* Left: Back Button */}
                  <button 
                    onClick={() => setSelectedTeacher(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold text-[13px] bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to Teachers
                  </button>

                  {/* Right: Selection Actions */}
                  <div className="flex items-center gap-5 w-full sm:w-auto">
                    <label className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold text-slate-700 select-none">
                      <input 
                        type="checkbox" 
                        className="w-[18px] h-[18px] rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={currentTeacherRequests.length === 0}
                      />
                      Select All
                    </label>

                    <button 
                      className="bg-[#39a8ed] hover:bg-[#2c8ac4] text-white h-9 px-5 rounded-lg text-[13px] font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={selectedRequests.length === 0}
                      onClick={handleRegisterSelected}
                    >
                      <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                      Register Selected ({selectedRequests.length})
                    </button>
                  </div>
                </div>

                {/* --- LIST OF APPROVED STUDENTS --- */}
                <div className="flex flex-col gap-3">
                  {currentTeacherRequests.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center">
                      <span className="material-symbols-outlined text-slate-300 text-[48px] mb-3">check_circle</span>
                      <h3 className="text-[16px] font-bold text-slate-600">No pending registrations</h3>
                      <p className="text-[13px] text-slate-500">This teacher has no approved students waiting for registration.</p>
                    </div>
                  ) : (
                    currentTeacherRequests.map((req) => (
                      <div 
                        key={req.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 border rounded-xl transition-all ${selectedRequests.includes(req.id) ? 'border-blue-400 bg-blue-50/40 shadow-sm' : 'border-slate-200 hover:border-blue-200 bg-white'}`}
                      >
                        
                        {/* Checkbox & Student Info */}
                        <div className="flex items-center gap-4">
                          <input 
                            type="checkbox" 
                            className="w-[18px] h-[18px] rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0 ml-1"
                            checked={selectedRequests.includes(req.id)}
                            onChange={() => toggleSelect(req.id)}
                          />
                          
                          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${req.student.name}`} alt={req.student.name} />
                          </div>
                          
                          <div>
                            <p className="text-[14px] font-bold text-slate-900 leading-tight mb-0.5">
                              {req.student.name} {req.student.suffix}
                            </p>
                            <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] opacity-70">family_restroom</span>
                              Parent: <span className="text-slate-600">{req.parent.name}</span>
                            </p>
                          </div>
                        </div>

                        {/* Metadata & Review Button */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 pl-9 sm:pl-0">
                          
                          {/* --- UPDATED: Smaller and Opaque Date Label --- */}
                          <div className="text-left sm:text-right hidden md:block opacity-70">
                            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Approved On</p>
                            <p className="text-[11px] font-medium text-slate-600">{req.dateApproved}</p>
                          </div>
                          
                          <button 
                            onClick={() => setReviewingRequest(req)}
                            className="text-[#39a8ed] font-bold text-[12px] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-blue-200"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            Review Details
                          </button>
                        </div>

                      </div>
                    ))
                  )}
                </div>
                
              </div>
            </div>

          </div>

        )}

      </main>

      {/* ==========================================
          REVIEW MODAL
          ========================================== */}
      {reviewingRequest && (
        <div className="approval-modal-overlay" onClick={() => setReviewingRequest(null)}>
          <div className="approval-modal-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '480px', padding: '24px' }}>
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-[18px] font-bold text-slate-900">
                Enrollment Application Review
              </h2>
              <button 
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                onClick={() => setReviewingRequest(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {/* STUDENT DETAILS LIST */}
              <div>
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">school</span> Student Details
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[12px] font-semibold text-slate-500">Name:</span>
                    <span className="text-[13px] font-bold text-slate-900">{reviewingRequest.student.name} {reviewingRequest.student.suffix}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[12px] font-semibold text-slate-500">Birthdate:</span>
                    <span className="text-[13px] font-bold text-slate-900">{reviewingRequest.student.birthdate}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[12px] font-semibold text-slate-500">Age:</span>
                    <span className="text-[13px] font-bold text-slate-900">{reviewingRequest.student.age} yrs old</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-[12px] font-semibold text-slate-500">Gender:</span>
                    <span className="text-[13px] font-bold text-slate-900">{reviewingRequest.student.gender}</span>
                  </div>
                </div>
              </div>

              {/* PARENT DETAILS LIST */}
              <div>
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">family_restroom</span> Parent Details
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[12px] font-semibold text-slate-500">Name:</span>
                    <span className="text-[13px] font-bold text-slate-900">{reviewingRequest.parent.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                    <span className="text-[12px] font-semibold text-slate-500">Contact Number:</span>
                    <span className="text-[13px] font-bold text-slate-900">{reviewingRequest.parent.phone}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-[12px] font-semibold text-slate-500">Email Address:</span>
                    <span className="text-[13px] font-bold text-slate-900 break-all">{reviewingRequest.parent.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-lg transition-colors text-[13px]"
                onClick={() => setReviewingRequest(null)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}