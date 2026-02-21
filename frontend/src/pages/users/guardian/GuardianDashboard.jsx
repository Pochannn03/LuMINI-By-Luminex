import React, { useState, useEffect } from "react";
import { useAuth } from '../../../context/AuthProvider';
import { io } from "socket.io-client";
import axios from 'axios';
import '../../../styles/user/parent/parent-dashboard.css'; 
import NavBar from "../../../components/navigation/NavBar";
import ScanHandAsset from '../../../assets/scan_hand.png';
import PassModal from '../../../components/modals/user/PassModal';
import ParentDashboardQrScan from "../../../components/modals/user/parent/dashboard/ParentDashboardQrScan";
import ParentNewDayModal from ".././../../components/modals/user/parent/dashboard/ParentNewDayModal"

export default function GuardianDashboard() {
  const { user } = useAuth();
  
  // STATES
  const [showScanner, setShowScanner] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isParentOnQueue, setIsParentOnQueue] = useState(false); // Added
  const [childData, setChildData] = useState(null);
  const [rawStudentData, setRawStudentData] = useState(null); // Added for ID references
  const [showNewDayModal, setShowNewDayModal] = useState(false);

  // 1. FETCH ASSIGNED CHILD
  useEffect(() => {
    const fetchChild = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          'http://localhost:3000/api/guardian/children',
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

  // 2. CHECK IF GUARDIAN IS ALREADY IN QUEUE
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

  // 3. SOCKET.IO LISTENERS
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
        setIsParentOnQueue(false); // Reset queue state when child is dismissed/picked up
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

      await axios.post('http://localhost:3000/api/queue', {
        student_id: rawStudentData.student_id, 
        section_id: rawStudentData.section_id, 
        status: statusLabel,
        purpose: transferType,
        on_queue: true
      }, { withCredentials: true });

      setIsParentOnQueue(true);
      alert(`Status updated: ${statusLabel}`);
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to join the queue");
    } finally {
      setLoading(false);
    }
  };

  const hasActivePass = () => {
    const STORAGE_KEY = "lumini_pickup_pass";
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { expiry } = JSON.parse(saved);
        return Date.now() < expiry;
      } catch (err) {
        return false; 
      }
    }
    return false;
  };

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

  // Logic for UI states
  const isScanDisabled = !childData || childData.status === 'Dismissed' || !isParentOnQueue || loading;
  const actionType = childData?.status === 'Learning' ? 'Pick up' : 'Drop off';

  return(
    <div className="dashboard-wrapper flex flex-col h-full lg:pl-20 pt-20">
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="welcome-banner">
          <div>
            <h1 className="text-[28px]! font-bold text-[white]! mb-2">
              {user ? `Welcome, ${user.firstName}!` : "Welcome!"}
            </h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Here is the daily status for your assigned students.</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
          <div className="flex flex-col gap-6">
            <div className="card flex flex-col items-center gap-7 py-10 px-6 bg-[#e1f5fe] border border-[#b3e5fc] rounded-[20px]">
              
              <div className="flex flex-col items-center gap-1.5">
                <div className="p-1 bg-white rounded-full shadow-sm mb-2">
                  <img 
                    src={childData?.profilePicture || "../../../assets/placeholder_image.jpg"} 
                    alt="Child Profile"
                    className="w-[90px] h-[90px] rounded-full object-cover" 
                  />
                </div>
                <h2 className="text-cdark text-[22px] font-bold">
                  {childData ? `${childData.firstName} ${childData.lastName}` : "Loading..."}
                </h2>
                <span className="text-cgray text-[14px] font-medium">
                  {childData ? `Section: ${childData.sectionName}` : "..."}
                </span>
              </div>

              {/* TRACKER */}
              <div className="flex items-start justify-between w-full max-w-[340px] relative my-2.5">
                <div className="absolute top-[18px] left-2.5 right-2.5 h-[3px] bg-[#cfd8dc] z-0 rounded-sm"></div>
              
                <div className={`tracker-step ${childData?.status === 'On the way' ? 'active-onway' : ''}`}>
                  <div className="step-circle"><span className="material-symbols-outlined text-[20px]">directions_walk</span></div>
                  <span className="step-label text-[12px]">On Way</span>
                </div>

                <div className={`tracker-step ${childData?.status === 'Learning' ? 'active-learning' : ''}`}>
                  <div className="step-circle"><span className="material-symbols-outlined text-[20px]">school</span></div>
                  <span className="step-label text-[12px]">Learning</span>
                </div>

                <div className={`tracker-step ${childData?.status === 'Dismissed' ? 'active-dismissed' : ''}`}>
                  <div className="step-circle"><span className="material-symbols-outlined text-[20px]">home</span></div>
                  <span className="step-label text-[12px]">Dismissed</span>
                </div>
              </div>

              {/* DYNAMIC BADGE */}
              <div className={`status-badge-container ${
                childData?.status === 'On the way' ? 'badge-onway' :
                childData?.status === 'Learning' ? 'badge-learning' :
                childData?.status === 'Dismissed' ? 'badge-dismissed' : ''
              }`}>
                <p className="status-badge-text font-bold">
                  {childData?.status || "Checking status..."}
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="card action-card">
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="material-symbols-outlined blue-icon text-[24px]">tune</span>
                  <h2 className="text-cdark text-[18px] font-bold">Quick Actions</h2>
                </div>
              </div>

              <div className="quick-actions-list">
                <button className="quick-action-item">
                  <div className="flex flex-row items-center">
                    <div className="qa-icon"><span className="material-symbols-outlined mt-1">history</span></div>
                    <div className="flex flex-col text-left">
                      <span className="qa-title">Pickup History</span>
                      <span className="qa-desc">View past pickups and drop-offs</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined arrow">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* SCAN CARD */}
            <div className="card py-8 px-6 flex flex-col items-center text-center">
              <h2 className="text-cdark text-[20px] font-bold mb-2">Initiate {actionType}</h2>
              <p className="text-cgray text-[14px] leading-normal mb-6">Scan QR code to begin process.</p>
              <img src={ScanHandAsset} alt="Scan" className="max-w-[180px] mb-6" />

              <button 
                className={`btn btn-primary h-[50px] w-full rounded-xl font-semibold transition-all ${
                  isScanDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''
                }`} 
                onClick={handleScanButtonClick}
                disabled={isScanDisabled}
              >
                {childData?.status === 'Dismissed' ? 'Student Dismissed' : !isParentOnQueue ? 'Update Status to Start' : `Scan for ${actionType}`}
              </button>
            </div>

            {/* UPDATE STATUS CARD */}
            <div className="card action-card">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="material-symbols-outlined yellow-icon text-[24px]">update</span>
                <h2 className="text-cdark text-[18px] font-bold">Update Status</h2>
              </div>

              <div className="status-options-container">
                <button className="status-option-btn status-blue" onClick={() => handleStatusUpdate('On the Way')}>
                  <span>On the Way</span>
                  <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                </button>
                <button className="status-option-btn status-green" onClick={() => handleStatusUpdate('At School')}>
                  <span>At School</span>
                  <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                </button>
                <button className="status-option-btn status-red" onClick={() => handleStatusUpdate('Running late')}>
                  <span>Running late</span>
                  <span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span>
                </button>
              </div>
            </div> 
          </div>
        </div>
      </main>

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