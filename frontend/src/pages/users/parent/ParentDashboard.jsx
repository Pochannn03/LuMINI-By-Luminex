import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthProvider';
import { io } from "socket.io-client";
import axios from 'axios';
import '../../../styles/user/parent/parent-dashboard.css';
import NavBar from "../../../components/navigation/NavBar";
import ScanHandAsset from '../../../assets/scan_hand.png';
import PassModal from '../../../components/modals/user/PassModal';
import ParentDashboardQrScan from "../../../components/modals/user/parent/dashboard/ParentDashboardQrScan";
import ParentNewDayModal from ".././../../components/modals/user/parent/dashboard/ParentNewDayModal"
import SuccessModal from "../../../components/SuccessModal";

export default function Dashboard() {
  // AUTH PROVIDER INFORMATION
  const { user } = useAuth();
  
  // STATES
  const [showScanner, setShowScanner] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isParentOnQueue, setIsParentOnQueue] = useState(false);
  const [showNewDayModal, setShowNewDayModal] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [childData, setChildData] = useState(null);
  const [rawStudentData, setRawStudentData] = useState(null);

  // USEEFFECT
  useEffect(() => {
    const fetchChild = async () => {
      try {
        setLoading(true); 
        const response = await axios.get(
          'http://localhost:3000/api/parent/children',
          { withCredentials: true }
        );

        const { success, children } = response.data; 

        if (success === true) {
          setShowNewDayModal(true); 
        }

        if (Array.isArray(children) && children.length > 0) {
          const firstChild = children[0];
          setRawStudentData(firstChild);

          setChildData({
            firstName: firstChild.first_name,
            lastName: firstChild.last_name,
            profilePicture: firstChild.profile_picture,
            sectionName: firstChild.section_details?.section_name || "Not Assigned",
            status: firstChild.status,
            onQueue: firstChild.on_queue
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

  useEffect(() => {
    const checkQueueStatus = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/queue/check', { 
          withCredentials: true 
        });
        setIsParentOnQueue(response.data.onQueue);
      } catch (error) {
        console.error("Failed to fetch queue status:", error);
      }
    };
    checkQueueStatus();
  }, []);
  

  useEffect(() => {
    const socket = io("http://localhost:3000", { withCredentials: true });

    socket.on('new_queue_entry', (entry) => {
      if (entry.user_id === user?.user_id) {
        setIsParentOnQueue(true);
      }
    });

    socket.on('student_status_updated', (data) => {
      if (data.student_id === rawStudentData?.student_id) {
        setChildData(prev => ({ ...prev, status: data.newStatus }));
        setIsParentOnQueue(false); 
      }
    });

    return () => {
      socket.off('new_queue_entry');
      socket.off('student_status_updated');
      socket.disconnect();
    };
  }, [rawStudentData, user]);

  const handleStatusUpdate = async (statusLabel) => {
    if (!rawStudentData) {
      console.error("Student data not loaded yet");
      return; 
    }

    try {
      setLoading(true);
      const transferType = (childData?.status === 'Learning') ? 'Pick up' : 'Drop off';

      // 2. Send to Queue Endpoint
      const response = await axios.post('http://localhost:3000/api/queue', {
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
      alert(err.response?.data?.msg || "Failed to join the queue");
    } finally {
      setLoading(false);
    }
  };

  // PASS CHECKER
  const hasActivePass = () => {
    const STORAGE_KEY = "lumini_pickup_pass";
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { expiry } = JSON.parse(saved);
        return Date.now() < expiry;
      } catch (err) {
        console.log(err)
        return false;
      }
    }
    return false;
  };

  // HANDLERS
  const handleScanButtonClick = () => {
    if (hasActivePass()) {
      setShowPassModal(true);
    } else {
      setShowScanner(true);
    }
  };

  const handleGateScanSuccess = () => {
    setShowScanner(false);
    setShowPassModal(true);
  };

  const isScanDisabled = 
    !childData || 
    childData.status === 'Dismissed' || 
    !isParentOnQueue || 
    loading;

  const actionType = childData?.status === 'Learning' ? 'Pick up' : 'Drop off';

  // HELPER FOR IMAGE
  const BACKEND_URL = "http://localhost:3000";
  const getImageUrl = (path) => {
    if (!path) return "../../../assets/placeholder_image.jpg"; 
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  // Check if they are blocked from using the dashboard
  const isUnassigned = !loading && childData && childData.sectionName === "Not Assigned";

  return(
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      {/* MAIN CONTENT AREA 
        We added "relative" so the blocker modal stays trapped inside this box, 
        leaving the NavBar completely clickable! 
      */}
      <main className={`relative h-full p-6 animate-[fadeIn_0.4s_ease-out_forwards] ${isUnassigned ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        
        {/* We wrap the dashboard content in a div that blurs itself out if unassigned */}
        <div className={`transition-all duration-300 ${isUnassigned ? 'blur-md pointer-events-none select-none opacity-50' : ''}`}>
          <section className="welcome-banner">
            <div>
              <h1 className="text-[28px]! font-bold text-[white]! mb-2 tracking-[-0.5px]">
                {user ? `Welcome, ${user.firstName}!` : "Welcome!"}
              </h1>
              <p className="text-[white]! opacity-80 text-[15px]! m-0">Here is the daily status for your children.</p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
            <div className="flex flex-col gap-6"> {/* Grid Left */}
              <div className="card flex flex-col items-center gap-7 py-10 px-6 bg-[#e1f5fe] border border-[#b3e5fc] rounded-[20px]">

                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-1 bg-white rounded-full shadow-[0_4px_12px_rgba(57,168,237,0.2)] mb-2">
                    <img 
                      src={getImageUrl(childData?.profilePicture)} 
                      alt="Child Profile"
                      className="w-[90px] h-[90px] rounded-full object-cover block" 
                    />
                  </div>
                  <h2 className="text-cdark text-[22px] font-bold">
                    {childData ? `${childData.firstName} ${childData.lastName}` : "Loading..."}
                  </h2>
                  <span className={`text-[14px] font-medium ${childData?.sectionName === "Not Assigned" ? "text-red-500" : "text-cgray"}`}>
                    {childData ? `Section: ${childData.sectionName}` : "..."}
                  </span>
                </div>

                <div className="flex items-start justify-between w-full max-w-[340px] relative my-2.5">
                  <div className="absolute top-[18px] left-2.5 right-2.5 h-[3px] bg-[#cfd8dc] z-0 rounded-sm"></div>

                  <div className={`tracker-step ${childData?.status === 'On the way' ? 'active-onway' : ''}`}>
                    <div className="step-circle">
                      <span className="material-symbols-outlined text-[20px]">directions_walk</span>
                    </div>
                    <span className="step-label text-[12px]">On the Way</span>
                  </div>

                  <div className={`tracker-step ${childData?.status === 'Learning' ? 'active-learning' : ''}`}>
                    <div className="step-circle">
                      <span className="material-symbols-outlined text-[20px]">school</span>
                    </div>
                    <span className="step-label text-[12px]">Learning</span>
                  </div>

                  <div className={`tracker-step ${childData?.status === 'Dismissed' ? 'active-dismissed' : ''}`}>
                    <div className="step-circle">
                      <span className="material-symbols-outlined text-[20px]">home</span>
                    </div>
                    <span className="step-label text-[12px]">Dismissed</span>
                  </div>
                </div>

                <div className={`status-badge-container ${
                  childData?.status === 'On the way' ? 'badge-onway' :
                  childData?.status === 'Learning' ? 'badge-learning' :
                  childData?.status === 'Dismissed' ? 'badge-dismissed' : 
                  ''
                }`}>
                  <p className="status-badge-text">
                    {childData?.status === 'On the way' && "Student is traveling to school"}
                    {childData?.status === 'Learning' && "Learning At School"}
                    {childData?.status === 'Dismissed' && "Student has been dismissed"}
                    {!childData?.status && "Checking status..."}
                  </p>
                </div>
              </div>

              <div className="card action-card">
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span class="material-symbols-outlined blue-icon text-[24px]">tune</span>
                    <h2 className="text-cdark text-[18px] font-bold">Quick Actions</h2>
                  </div>
                  <p className="text-cgray text-[14px]! leading-normal">Access the most important tasks instantly.</p>
                </div>

                <div className="quick-actions-list">
                  <button className="quick-action-item">
                    <div className="flex flex-row items-center">
                      <div className="qa-icon">
                        <span className="material-symbols-outlined mt-1">group</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="qa-title">Guardian Management</span>
                        <span className="qa-desc">Manage authorized guardians</span>
                      </div>
                    </div>
                    <span class="material-symbols-outlined arrow">chevron_right</span>
                  </button>

                  <button className="quick-action-item">
                    <div className="flex flex-row items-center">
                      <div className="qa-icon">
                        <span className="material-symbols-outlined mt-1">history</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="qa-title">Pickup History</span>
                        <span className="qa-desc">View past pickups and approvals</span>
                      </div>
                    </div>
                    <span class="material-symbols-outlined arrow">chevron_right</span>
                  </button>

                  <button className="quick-action-item">
                    <div className="flex flex-row items-center">
                      <div className="qa-icon">
                        <span className="material-symbols-outlined mt-1">notification_important</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="qa-title">Report Absence</span>
                        <span className="qa-desc">Notify school about absence or delay</span>
                      </div>
                    </div>
                    <span class="material-symbols-outlined arrow">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6"> {/* Right Grid */}
              <div className="card py-8 px-6 flex flex-col items-center text-center">
                <div>
                  <h2 className="text-cdark text-[20px] font-bold mb-2">
                    Initiate {actionType}
                  </h2>
                  <p className="text-cgray text-[14px]! leading-normal m-auto">
                    Scan the school's entry QR code to begin the <span className="font-bold">{actionType}</span> process and generate your dynamic pass.
                  </p>
                </div>

                <div className="flex justify-center my-6 w-full">
                  <img src={ScanHandAsset} alt="Scan QR Illustration" className="max-w-[180px] h-auto block" />
                </div>

                <button 
                  className={`btn btn-primary h-[50px] text-[14px]! font-semibold w-full rounded-xl transition-all ${
                    isScanDisabled ? 'opacity-50 cursor-not-allowed! grayscale' : ''
                  }`} 
                  id="scanQrBtn"
                  onClick={handleScanButtonClick}
                  disabled={isScanDisabled}
                >
                  {childData?.status === 'Dismissed' 
                    ? 'Student Dismissed' 
                    : !isParentOnQueue 
                      ? 'Update Status to Start' 
                      : `Scan for ${actionType}`}
                </button>
              </div>

              <div className="card action-card" id="dropoffCard">
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="material-symbols-outlined yellow-icon text-[24px]">update</span>
                    <h2 className="text-cdark text-[18px] font-bold">Update Status</h2>
                  </div>
                  <p className="text-cgray text-[14px]! leading-normal">Keep the school and parents informed about your arrival progress.</p>
                </div>

                <div className="status-options-container" id="statusButtonsContainer">
                  <button 
                    className="status-option-btn status-blue" 
                    onClick={() => handleStatusUpdate('On the Way')}
                  >
                    <span>On the Way</span>
                    <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                  </button>

                  <button 
                    className="status-option-btn status-green"
                    onClick={() => handleStatusUpdate('At School')}
                  >
                    <span>At School</span>
                    <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                  </button>

                  <button 
                    className="status-option-btn status-red"
                    onClick={() => handleStatusUpdate('Running late')}
                  >
                    <span>Running late</span>
                    <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                  </button>
                </div>
              </div>

              <div className="card queue-card">
                <div className="mb-6">
                  <div className="flex center gap-2.5 mb-2">
                    <span class="material-symbols-outlined purple-icon text-[24px]">notifications_active</span>
                    <h2 className="text-cdark text-[18px] font-bold">Recent Updates</h2>
                  </div>
                </div>

                <div className="flex flex-col gap-4"> 
                  <div className="bg-[white] flex items-start p-4 rounded-xl border-b-[#f0f0f0] gap-4 hover:bg-[#fafafa]">
                    <div className="bg-[#fff1f2] text-[#f43f5e] flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px]">
                      <span className="material-symbols-outlined">campaign</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-cdark text-[15px] font-bold">Early Dismissal</span>
                      <span className="text-cgray text-[13px]" >Classes end at 1:00 PM today due to faculty meeting.</span>
                      <span className="text-[#94a3b8] text-[11px] font-medium mt-2">2 hours ago</span>
                    </div>
                  </div>

                  <div className="bg-[white] flex items-start p-4 rounded-xl border-b-[#f0f0f0] gap-4 hover:bg-[#fafafa]">
                    <div className="bg-[#f0fdf4] text-[#22c55e] flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px]">
                      <span className="material-symbols-outlined">event</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-cdark text-[15px] font-bold">Parent-Teacher Conference</span>
                      <span className="text-cgray text-[13px]" >Schedule posted. Check your calendar.</span>
                      <span className="text-[#94a3b8] text-[11px] font-medium mt-2">Yesterday</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            ANTI-BUG: UNAUTH/UNASSIGNED ENROLLMENT BLOCKER MODAL
            Position is ABSOLUTE so it only covers the Dashboard main area!
            ======================================================= */}
        {isUnassigned && (
          <div 
            style={{
              position: 'absolute', inset: 0, zIndex: 50, 
              background: 'rgba(255, 255, 255, 0.2)', // Light wash
              display: 'flex', justifyContent: 'center', 
              alignItems: 'flex-start', /* <-- CHANGED: Anchors to the top */
              paddingTop: '120px',      /* <-- CHANGED: Pushes it down into view */
              paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px'
            }}
          >
            <div 
              style={{
                background: 'white', padding: '32px', borderRadius: '24px', 
                maxWidth: '450px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #e2e8f0', animation: 'modalPop 0.3s ease-out'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', width: '80px', height: '80px', borderRadius: '50%', marginBottom: '20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#ef4444' }}>
                  warning
                </span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                Action Required
              </h2>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                Your child is currently not enrolled in any sections. Please contact your child's adviser regarding this issue to unlock dashboard features.
              </p>
            </div>
          </div>
        )}
      </main>

      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        message={successMessage}
      />

      <ParentDashboardQrScan 
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleGateScanSuccess}
      />

      <PassModal 
         isOpen={showPassModal} 
         onClose={() => setShowPassModal(false)} 
      />

      <ParentNewDayModal 
        isOpen={showNewDayModal} 
        onClose={() => setShowNewDayModal(false)} 
      />
    </div>
  );
}