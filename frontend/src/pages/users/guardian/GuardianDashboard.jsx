import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../../context/AuthProvider';
import { io } from "socket.io-client";
import axios from 'axios';
import '../../../styles/user/parent/parent-dashboard.css'; 
import NavBar from "../../../components/navigation/NavBar";
import ScanHandAsset from '../../../assets/scan_hand.png';
import PassModal from '../../../components/modals/user/PassModal';
import ParentDashboardQrScan from "../../../components/modals/user/parent/dashboard/ParentDashboardQrScan";
import ParentNewDayModal from ".././../../components/modals/user/parent/dashboard/ParentNewDayModal"
import ParentFeedbackModal from ".././../../components/modals/user/parent/dashboard/ParentFeedback";
import SuccessModal from "../../../components/SuccessModal";
import WarningModal from "../../../components/WarningModal";

// DYNAMIC BACKEND URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function GuardianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [showScanner, setShowScanner] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isParentOnQueue, setIsParentOnQueue] = useState(false); 
  const [childData, setChildData] = useState(null);
  
  const [allChildren, setAllChildren] = useState([]);
  const [rawStudentData, setRawStudentData] = useState(null); 
  const [showNewDayModal, setShowNewDayModal] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  // --- CUSTOM DROPDOWN STATE ---
  const [isChildSwitcherOpen, setIsChildSwitcherOpen] = useState(false);
  const childSwitcherRef = useRef(null);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (childSwitcherRef.current && !childSwitcherRef.current.contains(event.target)) {
        setIsChildSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${BACKEND_URL}/${cleanPath}`;
  };

  // 1. FETCH ASSIGNED CHILD
  useEffect(() => {
    const fetchChild = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${BACKEND_URL}/api/guardian/children`,
          { withCredentials: true }
        );

        const { success, children } = response.data; 

        if (success === true) {
          setShowNewDayModal(true); 
        }

        if (Array.isArray(children) && children.length > 0) {
          setAllChildren(children);
          const firstChild = children[0];
          setRawStudentData(firstChild);
          
          setChildData({
            firstName: firstChild.first_name,
            lastName: firstChild.last_name,
            profilePicture: firstChild.profile_picture,
            sectionName: firstChild.section_details ? firstChild.section_details.section_name : "Not Assigned",
            status: firstChild.status 
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChild();
  }, []);

  const handleChildSwitch = (child) => {
    setRawStudentData(child);
    setChildData({
      firstName: child.first_name,
      lastName: child.last_name,
      profilePicture: child.profile_picture,
      sectionName: child.section_details?.section_name || "Not Assigned",
      status: child.status
    });
    setIsParentOnQueue(child.on_queue || false);
    setIsChildSwitcherOpen(false);
  };

  // 2. CHECK IF GUARDIAN IS ALREADY IN QUEUE
  useEffect(() => {
    const checkQueueStatus = async () => {
      if (!rawStudentData?.student_id) return;
      try {
        const response = await axios.get(`${BACKEND_URL}/api/queue/check?student_id=${rawStudentData.student_id}`, { 
          withCredentials: true 
        });
        setIsParentOnQueue(response.data.onQueue);
      } catch (error) {
        console.error("Failed to fetch queue status:", error);
      }
    };
    checkQueueStatus();
  }, [rawStudentData]);

  // 3. SOCKET.IO LISTENERS
  useEffect(() => {
    const socket = io(BACKEND_URL, { withCredentials: true });

    socket.on('new_queue_entry', (entry) => {
      if (entry.user_id === user?.user_id && entry.student_id === rawStudentData?.student_id) {
        setIsParentOnQueue(true);
      }
    });

    socket.on('student_status_updated', (data) => {
      if (data.student_id === rawStudentData?.student_id) {
        setChildData(prev => ({ ...prev, status: data.newStatus }));
        setIsParentOnQueue(false); 
        setShowPassModal(false); 
      }
    });

    socket.on('student_status_updated', (data) => {
      if (data.student_id === rawStudentData?.student_id) {
        setChildData(prev => ({ ...prev, status: data.newStatus }));
        setIsParentOnQueue(false);
        setShowPassModal(false);
        if (data.purpose === 'Pick up') setIsFeedbackModalOpen(true); // 👈 added
      }
    });

    return () => {
      socket.off('new_queue_entry');
      socket.off('student_status_updated');
      socket.disconnect();
    };
  }, [rawStudentData, user]);

  // 4. STATUS UPDATE HANDLER
  const handleStatusUpdate = async (statusLabel) => {
    if (!rawStudentData) return;
    try {
      setLoading(true);
      const transferType = (childData?.status === 'Learning') ? 'Pick up' : 'Drop off';
      const response = await axios.post(`${BACKEND_URL}/api/queue`, {
        student_id: rawStudentData.student_id, 
        section_id: rawStudentData.section_id, 
        status: statusLabel,
        purpose: transferType,
        on_queue: true
      }, { withCredentials: true });

      setIsParentOnQueue(true);
      setSuccessMessage(response.data.msg || `Status updated: ${statusLabel}`);
      setIsSuccessModalOpen(true);
    } catch (err) {
      if (err.response?.status === 403) {
        const msg = err.response.data.msg;
        setWarningTitle(msg.toLowerCase().includes("dismissed") ? "Student Dismissed" : "Too Early");
        setWarningMessage(msg);
        setIsWarningModalOpen(true);
      } else {
        alert(err.response?.data?.msg || "Failed to join the queue");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasActivePass = () => {
    if (!rawStudentData) return false;
    const STORAGE_KEY = `lumini_pickup_pass_${rawStudentData.student_id}`;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { expiry } = JSON.parse(saved);
        return Date.now() < expiry;
      } catch (err) { return false; }
    }
    return false;
  };

  const handleScanButtonClick = () => {
    if (hasActivePass()) setShowPassModal(true);
    else setShowScanner(true);
  };

  const handleGateScanSuccess = () => {
    setShowScanner(false);
    setShowPassModal(true);
  };

  const actionType = childData?.status === 'Learning' ? 'Pick up' : 'Drop off';
  const isScanDisabled = !childData || childData.status === 'Dismissed' || !isParentOnQueue || loading;

  return(
    <div className="dashboard-wrapper flex flex-col h-full lg:pl-20 pt-20">
      <NavBar />
      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="welcome-banner">
          <div>
            <h1 className="text-[28px]! font-bold text-[white]! mb-2">{user ? `Welcome, ${user.firstName}!` : "Welcome!"}</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Here is the daily status for your assigned students.</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
          <div className="flex flex-col gap-6">
            <div className="card flex flex-col items-center gap-7 py-10 px-6 bg-[#e1f5fe] border border-[#b3e5fc] rounded-[20px]">

              {/* CUSTOM CHILD SWITCHER DROPDOWN */}
              {allChildren.length > 1 && (
                <div className="w-full flex justify-start mb-[-15px]">
                  <div className="relative" ref={childSwitcherRef}>
                    <button
                      type="button"
                      onClick={() => setIsChildSwitcherOpen(!isChildSwitcherOpen)}
                      className={`flex items-center gap-2 h-[40px] pl-3 pr-3 rounded-xl border bg-white text-[13px] font-bold text-cdark transition-all focus:outline-none shadow-sm ${
                        isChildSwitcherOpen
                          ? 'border-[#39a8ed] ring-2 ring-blue-500/10'
                          : 'border-[#b3e5fc] hover:border-[#39a8ed]'
                      }`}
                    >
                      <span className="truncate max-w-[160px]">
                        {rawStudentData ? `${rawStudentData.first_name} ${rawStudentData.last_name}` : 'Select Child'}
                      </span>
                      <span className={`material-symbols-outlined text-[#39a8ed] text-[20px] transition-transform duration-300 shrink-0 ${isChildSwitcherOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {isChildSwitcherOpen && (
                      <div className="absolute top-[46px] left-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 min-w-[200px] animate-[fadeIn_0.2s_ease-out]">
                        {allChildren.map(child => {
                          const isActive = child.student_id === rawStudentData?.student_id;
                          return (
                            <button
                              key={child.student_id}
                              type="button"
                              onClick={() => handleChildSwitch(child)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors focus:outline-none ${
                                isActive
                                  ? 'bg-blue-50 text-[#39a8ed]'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-[13px] font-semibold truncate flex-1">
                                {child.first_name} {child.last_name}
                              </span>
                              {isActive && (
                                <span className="material-symbols-outlined text-[16px] text-[#39a8ed] shrink-0">check</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-1.5 mt-2">
                <div className="p-1 bg-white rounded-full shadow-sm mb-2"><img src={getImageUrl(childData?.profilePicture)} alt="Profile" className="w-[90px] h-[90px] rounded-full object-cover" /></div>
                <h2 className="text-cdark text-[22px] font-bold">{childData ? `${childData.firstName} ${childData.lastName}` : "Loading..."}</h2>
                <span className="text-cgray text-[14px] font-medium">{childData ? `Section: ${childData.sectionName}` : "..."}</span>
              </div>

              <div className="flex items-start justify-between w-full max-w-[340px] relative my-2.5">
                <div className="absolute top-[18px] left-2.5 right-2.5 h-[3px] bg-[#cfd8dc] z-0 rounded-sm"></div>
                <div className={`tracker-step ${childData?.status === 'On the way' ? 'active-onway' : ''}`}><div className="step-circle"><span className="material-symbols-outlined text-[20px]">directions_walk</span></div><span className="step-label text-[12px]">On Way</span></div>
                <div className={`tracker-step ${childData?.status === 'Learning' ? 'active-learning' : ''}`}><div className="step-circle"><span className="material-symbols-outlined text-[20px]">school</span></div><span className="step-label text-[12px]">Learning</span></div>
                <div className={`tracker-step ${childData?.status === 'Dismissed' ? 'active-dismissed' : ''}`}><div className="step-circle"><span className="material-symbols-outlined text-[20px]">home</span></div><span className="step-label text-[12px]">Dismissed</span></div>
              </div>

              <div className={`status-badge-container ${childData?.status === 'On the way' ? 'badge-onway' : childData?.status === 'Learning' ? 'badge-learning' : childData?.status === 'Dismissed' ? 'badge-dismissed' : ''}`}>
                <p className="status-badge-text">
                  {childData?.status === 'On the way' && "Student is traveling to school"}
                  {childData?.status === 'Learning' && "Learning At School"}
                  {childData?.status === 'Dismissed' && "Student has been dismissed"}
                  {!childData?.status && "Checking status..."}
                </p>
              </div>
            </div>

            <div className="card action-card">
              <div className="mb-6"><div className="flex items-center gap-2.5 mb-2"><span className="material-symbols-outlined blue-icon text-[24px]">tune</span><h2 className="text-cdark text-[18px] font-bold">Quick Actions</h2></div><p className="text-cgray text-[14px]!">Tasks instantly.</p></div>
              <div className="quick-actions-list">
                <button className="quick-action-item" onClick={() => navigate('/guardian/history')}>
                  <div className="flex flex-row items-center"><div className="qa-icon"><span className="material-symbols-outlined mt-1">history</span></div><div className="flex flex-col text-left"><span className="qa-title">History</span><span className="qa-desc">Past pickups</span></div></div>
                  <span className="material-symbols-outlined arrow">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card py-8 px-6 flex flex-col items-center text-center">
              <h2 className="text-cdark text-[20px] font-bold mb-2">Initiate {actionType}</h2>
              <p className="text-cgray text-[14px] mb-6">Scan QR code at the gate.</p>
              <img src={ScanHandAsset} alt="Scan" className="max-w-[180px] mb-6" />
              <button className={`btn btn-primary h-[50px] w-full rounded-xl font-semibold ${isScanDisabled ? 'opacity-50 grayscale' : ''}`} onClick={handleScanButtonClick} disabled={isScanDisabled}>
                {childData?.status === 'Dismissed' ? 'Student Dismissed' : !isParentOnQueue ? 'Update Status to Start' : `Scan for ${actionType}`}
              </button>
            </div>

            <div className="card action-card">
              <div className="flex items-center gap-2.5 mb-6"><span className="material-symbols-outlined yellow-icon text-[24px]">update</span><h2 className="text-cdark text-[18px] font-bold">Update Status</h2></div>
              <div className="status-options-container">
                <button className="status-option-btn status-blue" onClick={() => handleStatusUpdate('On the Way')}><span>On the Way</span><span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span></button>
                <button className="status-option-btn status-green" onClick={() => handleStatusUpdate('At School')}><span>At School</span><span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span></button>
                <button className="status-option-btn status-red" onClick={() => handleStatusUpdate('Running late')}><span>Running late</span><span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span></button>
              </div>
            </div> 
          </div>
        </div>
      </main>

      <SuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} message={successMessage} />
      <WarningModal isOpen={isWarningModalOpen} onClose={() => setIsWarningModalOpen(false)} title={warningTitle} message={warningMessage} />
      <ParentDashboardQrScan isOpen={showScanner} onClose={() => setShowScanner(false)} onScanSuccess={handleGateScanSuccess} />
      <PassModal isOpen={showPassModal} onClose={() => setShowPassModal(false)} studentId={rawStudentData?.student_id} />
      <ParentNewDayModal isOpen={showNewDayModal} onClose={() => setShowNewDayModal(false)} />
      <ParentFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSuccess={(msg) => { setSuccessMessage(msg); setIsSuccessModalOpen(true); }}
      />
    </div>
  );
}