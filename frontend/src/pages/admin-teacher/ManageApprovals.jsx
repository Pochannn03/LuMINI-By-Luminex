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
    setRejectReason(""); 
    setConfirmModalOpen(true);
  };

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
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <Header />
      <NavBar />

      <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        <div className="max-w-[1200px] mx-auto w-full">
          
          {/* BANNER */}
          <div className="admin-banner mb-6 flex justify-between items-center px-8 py-6 rounded-2xl">
             <div>
              <h1 className="text-white! text-[28px]! font-bold mb-2 tracking-[-0.5px]">Account Approvals</h1>
              <p className="text-white! opacity-90 m-0">Review and manage registration requests.</p>
            </div>
          </div>

          {/* CONTROLS BAR */}
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-xl border border-slate-200 mb-6 relative z-50 shadow-sm w-full items-center">
             
             {/* TABS */}
             <div className="flex w-full md:w-[320px] shrink-0 bg-slate-50 p-1 rounded-[10px]">
                <button 
                  className={`flex-1 flex justify-center items-center m-0 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${activeTab === "pending" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`} 
                  onClick={() => setActiveTab("pending")}
                >
                  Pending {pendingCount > 0 && <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>}
                </button>
                <button 
                  className={`flex-1 flex justify-center items-center m-0 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${activeTab === "history" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`} 
                  onClick={() => setActiveTab("history")}
                >
                  History <span className="ml-2 text-[10px] opacity-70 bg-slate-200 px-2 py-0.5 rounded-full">{historyCount}</span>
                </button>
             </div>

             {/* SEARCH, FILTER & EXPORT */}
             <div className="flex w-full flex-1 gap-2 sm:gap-3 items-center">
              
              {/* SEARCH & FILTER */}
              <div className="flex flex-1 items-center border border-slate-300 rounded-lg bg-white p-1 pl-2 sm:pl-3 transition-colors focus-within:border-blue-400 min-w-0">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-slate-400 mr-1 sm:mr-2 shrink-0">search</span>
                
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-none outline-none bg-transparent text-sm w-full min-w-0 h-[34px] text-slate-700 placeholder-slate-400" 
                />
                
                <div className="relative h-full shrink-0" ref={filterRef}>
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md cursor-pointer text-slate-600 text-[13px] font-semibold transition-colors h-full ${isFilterOpen ? 'bg-slate-100' : 'bg-transparent hover:bg-slate-50'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                    <span className="hidden sm:block">Filter</span>
                  </button>

                  {isFilterOpen && (
                    <div className="absolute top-[calc(100%+12px)] right-0 z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl p-2 min-w-[180px] animate-[fadeIn_0.2s_ease-out]">
                      <button className="w-full flex items-center gap-2 p-2.5 bg-transparent border-none cursor-pointer text-left text-slate-700 rounded-md transition-colors hover:bg-slate-100" onClick={() => handleSort("surname")}>
                        <span className="material-symbols-outlined text-[18px]">sort_by_alpha</span> Via Surname
                      </button>
                      <button className="w-full flex items-center gap-2 p-2.5 bg-transparent border-none cursor-pointer text-left text-slate-700 rounded-md transition-colors hover:bg-slate-100" onClick={() => handleSort("date")}>
                        <span className="material-symbols-outlined text-[18px]">calendar_month</span> Via Date
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* EXPORT BUTTON */}
              {activeTab === "history" && (
                <button 
                  className="flex items-center justify-center gap-1.5 h-[44px] px-3 sm:px-4 rounded-lg border border-slate-300 bg-white text-slate-600 cursor-pointer whitespace-nowrap transition-colors hover:bg-slate-50 shrink-0 shadow-sm"
                  onClick={() => exportHistoryToPDF()}
                >
                  <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                  <span className="hidden sm:block font-semibold text-sm">Export PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* REQUESTS LIST */}
          <div className="requests-grid">
            {loading ? (
              <div className="p-[60px] text-center text-slate-500 font-medium">
                Fetching pending requests...
              </div>
            ) : activeTab === "pending" && filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center">
                <span className="material-symbols-outlined text-[48px] text-slate-300 mb-4">inbox_customize</span>
                <h3 className="text-lg font-bold text-slate-700 mb-2">
                  {searchQuery ? "No matches found." : "All Caught Up!"}
                </h3>
                <p className="text-slate-400 text-sm">
                  {searchQuery ? "Try a different search term." : "There are no pending account requests at the moment."}
                </p>
              </div>
            ) : null}

            {activeTab === "pending" && !loading &&
              filteredPending.map((req) => (
                <div className="request-card shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow" key={req._id}>
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
                        <span className="material-symbols-outlined text-[14px]">visibility</span> View Details
                      </div>
                    </div>
                  </div>
                  <div className="card-row border-t border-slate-100 p-4 flex justify-between items-center">
                    <span className="info-label text-slate-500 font-semibold text-xs">Linked Child</span>
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold">
                      <span className="material-symbols-outlined text-[18px]">face</span>
                      {req.students && req.students.length > 0 
                        ? req.students.map(s => `${s.first_name} ${s.last_name}`).join(", ") 
                        : "Unknown Student"}
                    </div>
                  </div>
                  <div className="card-row border-t border-slate-100 p-4 flex justify-between items-center bg-slate-50">
                    <span className="info-label text-slate-500 font-semibold text-xs">Requested On</span>
                    <span className="info-value font-medium text-[13px] text-slate-700">{formatDateTime(req.createdAt)}</span>
                  </div>
                  <div className="card-actions flex gap-3 p-4 border-t border-slate-100">
                    <button className="flex-1 py-2.5 rounded-lg border-none bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors" onClick={(e) => handleRejectClick(e, req._id)}>Reject</button>
                    <button className="flex-1 py-2.5 rounded-lg border-none bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm" onClick={(e) => handleApproveClick(e, req._id)}>Verify</button>
                  </div>
                </div>
              ))}

            {activeTab === "history" && !loading && filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center">
                <span className="material-symbols-outlined text-[48px] text-slate-300 mb-4">history</span>
                <h3 className="text-lg font-bold text-slate-700 mb-2">
                  {searchQuery ? "No matches found." : "No History Yet"}
                </h3>
                <p className="text-slate-400 text-sm">
                  {searchQuery ? "Try a different search term." : "Approved and rejected applications will appear here."}
                </p>
              </div>
            ) : activeTab === "history" && !loading && (
              filteredHistory.map((req) => (
                <div className="request-card opacity-90 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white" key={req._id}> 
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
                        <img 
                          src={getImageUrl(req.guardianDetails.idPhotoPath)} 
                          alt="Guardian ID" 
                          className="header-avatar grayscale" 
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.guardianDetails.firstName || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                          }}
                        />
                        <div className="name-stack">
                          <span className="info-value">{req.guardianDetails.firstName} {req.guardianDetails.lastName}</span>
                          <span className="role-tag bg-slate-200 text-slate-500">{req.guardianDetails.role}</span>
                        </div>
                      </div>
                      <div className="view-details-btn text-slate-500">
                        <span className="material-symbols-outlined text-[14px]">visibility</span> View Details
                      </div>
                    </div>
                  </div>
                  <div className="card-row border-t border-slate-100 p-4 flex justify-between items-center">
                    <span className="info-label text-slate-500 font-semibold text-xs">Linked Child</span>
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full text-xs font-bold">
                      <span className="material-symbols-outlined text-[18px]">face</span>
                      {req.students && req.students.length > 0 
                        ? req.students.map(s => `${s.first_name} ${s.last_name}`).join(", ") 
                        : "Unknown Student"}
                    </div>
                  </div>
                  <div className="flex justify-center items-center bg-slate-50 p-4 border-t border-slate-100">
                    {req.status === 'teacher_approved' && (
                      <span className="flex items-center gap-2 text-blue-500 font-bold text-[15px]">
                        <span className="material-symbols-outlined">forward_to_inbox</span> Forwarded to Admin
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="flex items-center gap-2 text-green-600 font-bold text-[15px]">
                        <span className="material-symbols-outlined">check_circle</span> Application Approved
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="flex items-center gap-2 text-red-600 font-bold text-[15px]">
                        <span className="material-symbols-outlined">cancel</span> Application Rejected
                      </span>
                    )}
                    {req.status === 'revoked' && (
                      <span className="flex items-center gap-2 text-slate-500 font-bold text-[15px]">
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

      {selectedRequest && (
        <div className="fixed inset-0 z-99999 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[450px] w-full overflow-hidden animate-[fadeIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-white">
              <div>
                <h2 className="text-xl text-slate-800 mb-1 font-extrabold">Guardian Application</h2>
                <p className="text-slate-500 text-[13px]! m-0">
                  Submitted by <strong className="text-slate-700">{selectedRequest.parent ? `${selectedRequest.parent.first_name} ${selectedRequest.parent.last_name}` : "Unknown Parent"}</strong>
                </p>
              </div>
              <button className="text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer" onClick={() => setSelectedRequest(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-[15px] font-bold text-slate-800 border-b-2 border-slate-100 pb-2 m-0">
                  Applicant Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">First Name</label>
                    <div className="text-sm text-slate-800 font-semibold">{selectedRequest.guardianDetails.firstName}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Last Name</label>
                    <div className="text-sm text-slate-800 font-semibold">{selectedRequest.guardianDetails.lastName}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Relationship</label>
                    <div className="inline-block bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[11px] font-bold uppercase mt-0.5">{selectedRequest.guardianDetails.role}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Phone Number</label>
                    <div className="text-sm text-slate-800 font-semibold">{selectedRequest.guardianDetails.phone}</div>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-[10px] border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Assigned Username</label>
                  <div className="text-[15px] text-(--brand-blue) font-bold tracking-wide mt-1">
                    {selectedRequest.guardianDetails.tempUsername}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-[15px] font-bold text-slate-800 border-b-2 border-slate-100 pb-2 m-0">
                  Valid ID Verification
                </h3>
                <div 
                  onClick={() => setExpandedImage(getImageUrl(selectedRequest.guardianDetails.idPhotoPath))}
                  className="group bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-2 flex items-center justify-center cursor-zoom-in relative transition-colors hover:border-(--brand-blue)"
                >
                  <img 
                    src={getImageUrl(selectedRequest.guardianDetails.idPhotoPath)} 
                    alt="ID Document" 
                    className="w-full h-[160px] object-cover rounded-md"
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = `https://placehold.co/600x400/f8fafc/94a3b8?text=ID+Deleted+(Rejected)`;
                    }}
                  />
                  <div className="absolute bottom-3 bg-slate-900/80 text-white px-3 py-1.5 rounded-full text-[11px] font-semibold flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[14px]">zoom_in</span> Click to Enlarge
                  </div>
                </div>
              </div>
            </div>
            
            {selectedRequest.status === 'pending' ? (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button className="flex-1 py-3 rounded-xl border-none bg-red-100 text-red-600 font-bold text-sm hover:bg-red-200 transition-colors cursor-pointer" onClick={(e) => { setSelectedRequest(null); handleRejectClick(e, selectedRequest._id); }}>Reject</button>
                <button className="flex-1 py-3 rounded-xl border-none bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm cursor-pointer" onClick={(e) => { setSelectedRequest(null); handleApproveClick(e, selectedRequest._id); }}>Verify</button>
              </div>
              ) : (
              /* UPDATED: Increased py-4 to py-8 and added pb-10 for extra space at the very bottom */
              <div className="px-6 py-8 pb-10 bg-slate-50 border-t border-slate-100 flex justify-center">
                  {selectedRequest.status === 'teacher_approved' && (
                  <span className="flex items-center gap-2 text-blue-500 font-bold text-[15px]">
                    <span className="material-symbols-outlined">forward_to_inbox</span> Forwarded to Admin
                  </span>
                )}
                {selectedRequest.status === 'approved' && (
                  <span className="flex items-center gap-2 text-green-600 font-bold text-[15px]">
                    <span className="material-symbols-outlined">check_circle</span> Application Approved
                  </span>
                )}
                {selectedRequest.status === 'rejected' && (
                  <span className="flex items-center gap-2 text-red-600 font-bold text-[15px]">
                    <span className="material-symbols-outlined">cancel</span> Application Rejected
                  </span>
                )}
                {selectedRequest.status === 'revoked' && (
                  <span className="flex items-center gap-2 text-slate-500 font-bold text-[15px]">
                    <span className="material-symbols-outlined">block</span> Access Revoked
                  </span>
                )}
              </div>
              )}
          </div>
        </div>
      )}

      {/* --- EXPANDED IMAGE VIEW --- */}
      {expandedImage && (
        <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-sm flex justify-center items-center p-5 cursor-zoom-out" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="Expanded ID" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
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
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h2 className="text-lg m-0 font-bold text-slate-800">Reject Application?</h2>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              You are about to reject this guardian request. Please provide a reason to help the parent understand what needs to be fixed.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., ID is blurry, Name does not match, Unrecognized person..."
                className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none min-h-[80px] resize-y focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModalOpen(false)} 
                className="bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={!rejectReason.trim()} 
                onClick={handleConfirmAction} 
                className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors border-none ${rejectReason.trim() ? 'bg-red-500 hover:bg-red-600 cursor-pointer shadow-md' : 'bg-red-300 cursor-not-allowed'}`}
              >
                Reject & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />

    </div>
  );
}