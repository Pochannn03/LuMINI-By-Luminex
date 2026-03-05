// frontend/src/pages/super-admin/SuperAdminGuardianRegistration.jsx

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import NavBar from "../../components/navigation/NavBar";
import SuccessModal from "../../components/SuccessModal";
import WarningModal from "../../components/WarningModal"; 
import '../../styles/super-admin/class-management.css'; 

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, seed) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${seed || 'User'}`;
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function SuperAdminGuardianRegistration() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, message: "" });
  const [warningConfig, setWarningConfig] = useState({ isOpen: false, title: "", message: "" });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    document.body.classList.add("dashboard-mode");
    return () => document.body.classList.remove("dashboard-mode");
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === "pending" 
        ? "/api/superadmin/guardian-requests/pending-final" 
        : "/api/superadmin/guardian-requests/history";
        
      const response = await axios.get(`${BACKEND_URL}${endpoint}`, { withCredentials: true });
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const gName = `${req.guardianDetails?.firstName || ''} ${req.guardianDetails?.lastName || ''}`.toLowerCase();
      const pName = `${req.parent?.first_name || ''} ${req.parent?.last_name || ''}`.toLowerCase();
      const query = searchQuery.toLowerCase();
      return gName.includes(query) || pName.includes(query);
    });
  }, [requests, searchQuery]);

  const handleFinalAction = async (actionType) => {
    setIsProcessing(true);
    try {
      const endpoint = actionType === 'approve' ? 'final-approve' : 'final-reject';
      
      let payload = {};
      if (actionType === 'reject') {
        payload = { reason: rejectReason };
      }
      
      await axios.put(`${BACKEND_URL}/api/superadmin/guardian-requests/${selectedRequest._id}/${endpoint}`, payload, { withCredentials: true });

      const message = actionType === 'approve' 
        ? "Guardian registration officially finalized & account created!" 
        : "Guardian registration rejected and parent notified.";
      
      setSuccessConfig({ isOpen: true, message });
      
      setRequests(prev => prev.filter(r => r._id !== selectedRequest._id));
      setSelectedRequest(null);
      setShowRejectModal(false);
      setRejectReason("");
    } catch (error) {
      console.error("Action failed:", error);
      setWarningConfig({
        isOpen: true,
        title: "Action Failed",
        message: error.response?.data?.message || "Something went wrong processing this request."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20 min-h-screen">
      <NavBar />

      <main className="flex-1 p-4 sm:p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        
        <div className="superadmin-banner mb-6">
          <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]" style={{ color: 'white' }}>
            Guardian Registration
          </h1>
          <p className="text-[white]! opacity-80 text-[15px]! m-0" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Final review queue for pre-verified guardian access.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-[1200px] m-auto">
          
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
            
            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100 w-full sm:w-auto shrink-0 overflow-hidden">
              <button 
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 focus:outline-none select-none
                  ${activeTab === 'pending' 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
                    : 'text-slate-400 hover:text-slate-600 border border-transparent hover:bg-gray-200/50'}`}
                onClick={() => setActiveTab('pending')}
              >
                Pending
              </button>
              <button 
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 focus:outline-none select-none
                  ${activeTab === 'history' 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
                    : 'text-slate-400 hover:text-slate-600 border border-transparent hover:bg-gray-200/50'}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </div>

            <div className="relative w-full sm:max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Search guardian or parent name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-slate-800 text-[14px] font-medium py-2.5 pl-10 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-gray-50/30 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                 <span className="material-symbols-outlined animate-spin text-4xl text-blue-500 mb-4">sync</span>
                 <p className="text-slate-500 font-medium">Fetching requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              
              <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_0.3s_ease-out]">
                <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[40px] text-gray-300">
                        {activeTab === 'pending' ? 'verified_user' : 'history_toggle_off'}
                    </span>
                </div>
                <h3 className="text-[18px] font-extrabold text-slate-700 mb-1">
                    {activeTab === 'pending' ? 'All Caught Up!' : 'No History Found'}
                </h3>
                <p className="text-slate-400 text-[14px] text-center max-w-[280px]">
                    {activeTab === 'pending' 
                        ? 'There are no pending guardian registrations to review at this time.' 
                        : 'Registration logs will appear here once applications are processed.'}
                </p>
              </div>

            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-[fadeIn_0.3s_ease-out]">
                {filteredRequests.map(req => (
                  <div 
                    key={req._id} 
                    className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col relative overflow-hidden"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div className={`flex items-center gap-1.5 mb-5 text-[10px] font-bold self-start px-2.5 py-1.5 rounded-md border tracking-tight
                        ${req.status === 'rejected' ? 'text-red-700 bg-red-50 border-red-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                          {req.status === 'rejected' ? 'cancel' : 'verified'}
                      </span>
                      {req.status === 'rejected' ? 'Rejected' : `Verified by Teacher ${req.teacher?.first_name || ''} ${req.teacher?.last_name || ''}`}
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white bg-slate-100 font-bold text-lg shadow-inner overflow-hidden shrink-0 border border-gray-100">
                          {/* --- THE FIX: ONERROR FOR CARD AVATAR --- */}
                          <img 
                            src={getImageUrl(req.guardianDetails?.idPhotoPath, req.guardianDetails?.firstName)} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              e.target.onerror = null; 
                              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.guardianDetails?.firstName || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                            }}
                          />
                       </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[16px] font-extrabold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {req.guardianDetails?.firstName} {req.guardianDetails?.lastName}
                        </span>
                        <span className="text-[12px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-tight">
                          <span className="material-symbols-outlined text-[14px]">group</span>
                          {req.guardianDetails?.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-gray-50">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">Child(ren):</span>
                        <span className="text-slate-700 font-extrabold truncate max-w-[60%]">
                          {req.students && req.students.length > 0 
                            ? req.students.map(s => `${s.first_name} ${s.last_name}`).join(", ") 
                            : "Unknown Student"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">Parent:</span>
                        <span className="text-slate-700 font-extrabold truncate max-w-[60%]">{req.parent?.first_name} {req.parent?.last_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedRequest && !showRejectModal && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={() => !isProcessing && setSelectedRequest(null)}>
          <div className="bg-white rounded-3xl w-full max-w-[500px] overflow-hidden shadow-2xl flex flex-col transform scale-100 transition-transform" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-[20px] font-extrabold text-slate-800">Registration Review</h2>
                <p className="text-[13px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-green-600">check_circle</span>
                  Verified by Teacher {selectedRequest.teacher?.first_name} {selectedRequest.teacher?.last_name}
                </p>
              </div>
              <button className="w-8 h-8 rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50" onClick={() => setSelectedRequest(null)} disabled={isProcessing}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex gap-4 items-center">
                {/* --- THE FIX: ONERROR FOR MODAL AVATAR --- */}
                <img 
                  src={getImageUrl(selectedRequest.guardianDetails?.idPhotoPath, selectedRequest.guardianDetails?.firstName)} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm" 
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedRequest.guardianDetails?.firstName || 'User')}&backgroundColor=e2e8f0&textColor=475569`;
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-[22px] font-black text-slate-800 leading-tight">{selectedRequest.guardianDetails?.firstName} {selectedRequest.guardianDetails?.lastName}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-[12px] font-bold uppercase tracking-wide">{selectedRequest.guardianDetails?.role}</span>
                    <span className="text-slate-400 text-[13px] font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span>{selectedRequest.guardianDetails?.phone}</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Linked Child(ren)</span>
                  <span className="text-[14px] font-bold text-slate-800 text-right max-w-[60%]">
                    {selectedRequest.students && selectedRequest.students.length > 0 
                      ? selectedRequest.students.map(s => `${s.first_name} ${s.last_name}`).join(", ") 
                      : "Unknown Student"}
                  </span>
                </div>
                <div className="h-px bg-slate-200 w-full"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">Requesting Parent</span>
                  <span className="text-[14px] font-bold text-slate-800 text-right max-w-[60%]">{selectedRequest.parent?.first_name} {selectedRequest.parent?.last_name}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-bold text-slate-800">Submitted ID Document</span>
                <div 
                  className="w-full h-[180px] bg-slate-100 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group cursor-zoom-in" 
                  onClick={() => setExpandedImage(getImageUrl(selectedRequest.guardianDetails?.idPhotoPath, selectedRequest.guardianDetails?.firstName))}
                >
                  {/* --- THE FIX: ONERROR FOR MODAL ID DOCUMENT --- */}
                  <img 
                    src={getImageUrl(selectedRequest.guardianDetails?.idPhotoPath, selectedRequest.guardianDetails?.firstName)} 
                    alt="Submitted Document" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = `https://placehold.co/600x400/f8fafc/94a3b8?text=ID+Deleted+(Rejected)`;
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/0 group-hover:bg-slate-900/40 transition-all duration-300 opacity-0 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-[32px] mb-1 drop-shadow-md">zoom_in</span>
                    <span className="text-[13px] font-semibold drop-shadow-md">Click to inspect</span>
                  </div>
                </div>
              </div>
            </div>
            
            {activeTab === 'pending' && (
              <div className="flex border-t border-slate-100 mt-auto p-4 gap-4 bg-gray-50/50">
                <button 
                  className="flex-1 py-3 text-[14px] font-bold text-slate-500 bg-white border border-gray-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" 
                  onClick={() => setShowRejectModal(true)} 
                  disabled={isProcessing}
                >
                  Reject
                </button>
                <button 
                  className="flex-1 py-3 text-[14px] font-bold text-white bg-[#334155] rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:bg-slate-400" 
                  onClick={() => handleFinalAction('approve')} 
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Finalize Registration"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-[400px] overflow-hidden shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <span className="material-symbols-outlined text-[32px]">warning</span>
              <h2 className="text-[20px] font-extrabold text-slate-800">Final Rejection</h2>
            </div>
            
            <p className="text-[14px] text-slate-600 mb-5 leading-relaxed">
              Please provide a clear reason for denying this guardian access. This reason will be emailed to the parent.
            </p>

            <div className="mb-6">
              <label className="block text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., The uploaded ID is expired, or name does not match the ID provided..."
                className="w-full p-3 border border-slate-300 rounded-xl text-[14px] text-slate-700 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 min-h-[100px] resize-y"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                disabled={!rejectReason.trim() || isProcessing}
                onClick={() => handleFinalAction('reject')} 
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 transition-colors"
              >
                {isProcessing ? "Rejecting..." : "Send Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedImage && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 cursor-zoom-out animate-[fadeIn_0.2s_ease-out]" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="ID Preview" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
        </div>
      )}

      <SuccessModal isOpen={successConfig.isOpen} onClose={() => setSuccessConfig({ ...successConfig, isOpen: false })} message={successConfig.message} />
      <WarningModal isOpen={warningConfig.isOpen} onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })} title={warningConfig.title} message={warningConfig.message} />

    </div>
  );
}