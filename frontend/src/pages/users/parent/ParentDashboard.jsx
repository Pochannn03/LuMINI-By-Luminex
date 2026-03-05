import React, { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
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
import ParentAbsenceModal from ".././../../components/modals/user/parent/dashboard/ParentAbsenceModal";
import ParentWhoEarlyPickUpStudent from "../../../components/modals/user/parent/dashboard/ParentWhoEarlyPickUpStudent";
import SuccessModal from "../../../components/SuccessModal";
import WarningModal from "../../../components/WarningModal";
import UserConfirmModal from "../../../components/modals/user/UserConfirmationModal";

// DYNAMIC BACKEND URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path) => {
  if (!path) return "/assets/placeholder_image.jpg"; 
  if (path.startsWith("http")) return path;
  const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BACKEND_URL}/${cleanPath}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [showScanner, setShowScanner] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isParentOnQueue, setIsParentOnQueue] = useState(false);
  const [showNewDayModal, setShowNewDayModal] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [selectedPicker, setSelectedPicker] = useState(null);
  const [authorizedPickers, setAuthorizedPickers] = useState([]);
  const [loadingPickers, setLoadingPickers] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [childData, setChildData] = useState(null);
  const [allChildren, setAllChildren] = useState([]);
  const [rawStudentData, setRawStudentData] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [isEarlyPickupConfirmOpen, setIsEarlyPickupConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchChild = async () => {
      try {
        setLoading(true); 
        // Updated to BACKEND_URL
        const response = await axios.get(
          `${BACKEND_URL}/api/parent/children`,
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
      if (!rawStudentData?.student_id) return; 
      try {
        // Updated to BACKEND_URL
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

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Updated to BACKEND_URL
        const response = await axios.get(`${BACKEND_URL}/api/announcement`, {
          withCredentials: true
        });
        if (response.data.success) {
          setAnnouncements(response.data.announcements);
        }
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      } finally {
        setLoadingAnnouncements(false);
      }
    };
    fetchAnnouncements();
  }, [rawStudentData]);

  useEffect(() => {
    const fetchPickers = async () => {
      const idsToFetch = rawStudentData?.user_id; 
      if (idsToFetch && idsToFetch.length > 0) {
        try {
          setLoadingPickers(true);
          // Updated to BACKEND_URL
          const response = await axios.post(`${BACKEND_URL}/api/users/profiles`, {
            userIds: idsToFetch
          }, { withCredentials: true });

          if (response.data.success) {
            setAuthorizedPickers(response.data.users);
          }
        } catch (err) {
          console.error("Failed to fetch authorized pickers:", err);
        } finally {
          setLoadingPickers(false);
        }
      }
    };
    fetchPickers();
  }, [rawStudentData]);
  

  useEffect(() => {
    // Updated to BACKEND_URL
    const socket = io(BACKEND_URL, { withCredentials: true });

    socket.on('new_queue_entry', (entry) => {
      if (entry.user_id === user?.user_id && entry.student_id === rawStudentData?.student_id) {
        setIsParentOnQueue(true);
      }
    });

    socket.on('student_status_updated', (data) => {
      if (String(data.student_id) === String(rawStudentData?.student_id)) {
        setChildData(prev => ({ ...prev, status: data.newStatus }));
        setIsParentOnQueue(false);
        setShowPassModal(false);
        if (data.purpose === 'Pick up') {
            setIsFeedbackModalOpen(true);
        }
    }
    });

    socket.on('new_announcement', (newAnn) => {
      setAnnouncements(prev => {
        const exists = prev.some(ann => ann._id === newAnn._id);
        if (exists) return prev;
        const isGlobal = !newAnn.section_id;
        const matchesSection = rawStudentData && Number(newAnn.section_id) === Number(rawStudentData.section_id);
        if (isGlobal || matchesSection) {
          return [newAnn, ...prev];
        }
        return prev;
      });
    });

    return () => {
      socket.off('new_queue_entry');
      socket.off('student_status_updated');
      socket.disconnect();
    };
  }, [rawStudentData, user]);

  const handleChildSwitch = (e) => {
    const selectedId = e.target.value;
    const selectedChild = allChildren.find(c => c.student_id === selectedId);
    if (selectedChild) {
      setRawStudentData(selectedChild);
      setChildData({
        firstName: selectedChild.first_name,
        lastName: selectedChild.last_name,
        profilePicture: selectedChild.profile_picture,
        sectionName: selectedChild.section_details?.section_name || "Not Assigned",
        status: selectedChild.status,
        onQueue: selectedChild.on_queue
      });
      setIsParentOnQueue(selectedChild.on_queue || false);
    }
  };

  const handleStatusUpdate = async (statusLabel, isEarlyPickup = false, authorizedPickerId = null) => {
    if (!rawStudentData) return; 

    if (isEarlyPickup && childData?.status !== 'Learning') {
      setWarningTitle("Action Restricted");
      setWarningMessage("You can only request an Early Pickup if the student is currently 'Learning' at school.");
      setIsWarningModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      const transferType = isEarlyPickup ? 'Pick up' : (childData?.status === 'Learning' ? 'Pick up' : 'Drop off');

      // Updated to BACKEND_URL
      const response = await axios.post(`${BACKEND_URL}/api/queue`, {
        student_id: rawStudentData.student_id, 
        section_id: rawStudentData.section_id, 
        status: statusLabel,
        purpose: transferType,
        isEarly: isEarlyPickup,
        authorized_picker_id: authorizedPickerId || user?.user_id 
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

  const handleEarlyPickupClick = () => {
    if (childData?.status !== 'Learning') {
      setWarningTitle("Action Restricted");
      setWarningMessage("You can only request an Early Pickup if the student is currently 'Learning' at school.");
      setIsWarningModalOpen(true);
      return;
    }
    setIsPickerModalOpen(true);
  };

  const handlePersonSelected = (person) => {
    setSelectedPicker(person);
    setIsPickerModalOpen(false);
    setIsEarlyPickupConfirmOpen(true); 
  };

  const handleConfirmEarlyPickup = () => {
    setIsEarlyPickupConfirmOpen(false);
    handleStatusUpdate('At School', true, selectedPicker?.user_id); 
  };

  const isScanDisabled = !childData || childData.status === 'Dismissed' || !isParentOnQueue || loading;
  const actionType = childData?.status === 'Learning' ? 'Pick up' : 'Drop off';

  const getImageUrl = (path) => {
    if (!path) return "../../../assets/placeholder_image.jpg"; 
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  const isUnassigned = !loading && childData && childData.sectionName === "Not Assigned";

  return(
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />
      <main className={`relative h-full p-6 animate-[fadeIn_0.4s_ease-out_forwards] ${isUnassigned ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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
            <div className="flex flex-col gap-6"> 
              <div className="card flex flex-col items-center gap-7 py-10 px-6 bg-[#e1f5fe] border border-[#b3e5fc] rounded-[20px]">
                {allChildren.length > 1 && (
                  <div className="w-full flex justify-start mb-[-15px]"> 
                    <div className="relative inline-block">
                      <select className="appearance-none bg-white border border-[#b3e5fc] text-cdark text-[13px] font-bold py-2.5 pl-4 pr-10 rounded-xl cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39a8ed] transition-all" value={rawStudentData?.student_id || ""} onChange={handleChildSwitch}>
                        {allChildren.map(child => (<option key={child.student_id} value={child.student_id}>{child.first_name} {child.last_name}</option>))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-cgray pointer-events-none">expand_more</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <div className="p-1 bg-white rounded-full shadow-[0_4px_12px_rgba(57,168,237,0.2)] mb-2">
                    <img src={getImageUrl(childData?.profilePicture)} alt="Child" className="w-[90px] h-[90px] rounded-full object-cover block" />
                  </div>
                  <h2 className="text-cdark text-[22px] font-bold">{childData ? `${childData.firstName} ${childData.lastName}` : "Loading..."}</h2>
                  <span className={`text-[14px] font-medium ${childData?.sectionName === "Not Assigned" ? "text-red-500" : "text-cgray"}`}>
                    {childData ? `Section: ${childData.sectionName}` : "..."}
                  </span>
                </div>

                <div className="flex items-start justify-between w-full max-w-[340px] relative my-2.5">
                  <div className="absolute top-[18px] left-2.5 right-2.5 h-[3px] bg-[#cfd8dc] z-0 rounded-sm"></div>
                  <div className={`tracker-step ${childData?.status === 'On the way' ? 'active-onway' : ''}`}><div className="step-circle"><span className="material-symbols-outlined text-[20px]">directions_walk</span></div><span className="step-label text-[12px]">On the Way</span></div>
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
                <div className="mb-6"><div className="flex items-center gap-2.5 mb-2"><span className="material-symbols-outlined blue-icon text-[24px]">tune</span><h2 className="text-cdark text-[18px] font-bold">Quick Actions</h2></div><p className="text-cgray text-[14px]!">Access tasks instantly.</p></div>
                <div className="quick-actions-list">
                  <button className="quick-action-item" onClick={() => navigate('/parent/guardians')}><div className="flex flex-row items-center"><div className="qa-icon"><span className="material-symbols-outlined mt-1">group</span></div><div className="flex flex-col text-left"><span className="qa-title">Guardians</span><span className="qa-desc">Manage authorized persons</span></div></div><span className="material-symbols-outlined arrow">chevron_right</span></button>
                  <button className="quick-action-item" onClick={() => navigate('/parent/history')}><div className="flex flex-row items-center"><div className="qa-icon"><span className="material-symbols-outlined mt-1">history</span></div><div className="flex flex-col text-left"><span className="qa-title">Pickup History</span><span className="qa-desc">View past transfers</span></div></div><span className="material-symbols-outlined arrow">chevron_right</span></button>
                  <button className="quick-action-item" onClick={handleEarlyPickupClick}><div className="flex flex-row items-center"><div className="qa-icon"><span className="material-symbols-outlined mt-1">schedule</span></div><div className="flex flex-col text-left"><span className="qa-title">Early Pickup</span><span className="qa-desc">Notify school for early departure</span></div></div><span className="material-symbols-outlined arrow">chevron_right</span></button>
                  <button className="quick-action-item" onClick={() => setIsAbsenceModalOpen(true)}><div className="flex flex-row items-center"><div className="qa-icon"><span className="material-symbols-outlined mt-1">notification_important</span></div><div className="flex flex-col text-left"><span className="qa-title">Report Absence</span><span className="qa-desc">Notify school about absence</span></div></div><span className="material-symbols-outlined arrow">chevron_right</span></button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="card py-8 px-6 flex flex-col items-center text-center">
                <h2 className="text-cdark text-[20px] font-bold mb-2">Initiate {actionType}</h2>
                <p className="text-cgray text-[14px] m-auto">Scan QR code at the gate.</p>
                <div className="flex justify-center my-6"><img src={ScanHandAsset} alt="Scan QR" className="max-w-[180px]" /></div>
                <button className={`btn btn-primary h-[50px] font-semibold w-full rounded-xl transition-all ${isScanDisabled ? 'opacity-50 grayscale' : ''}`} onClick={handleScanButtonClick} disabled={isScanDisabled}>
                  {childData?.status === 'Dismissed' ? 'Student Dismissed' : !isParentOnQueue ? 'Update Status to Start' : `Scan for ${actionType}`}
                </button>
              </div>

              <div className="card action-card">
                <div className="mb-6"><div className="flex items-center gap-2.5 mb-2"><span className="material-symbols-outlined yellow-icon text-[24px]">update</span><h2 className="text-cdark text-[18px] font-bold">Update Status</h2></div><p className="text-cgray text-[14px]!">Keep school informed.</p></div>
                <div className="status-options-container">
                  <button className="status-option-btn status-blue" onClick={() => handleStatusUpdate('On the Way')}><span>On the Way</span><span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span></button>
                  <button className="status-option-btn status-green" onClick={() => handleStatusUpdate('At School')}><span>At School</span><span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span></button>
                  <button className="status-option-btn status-red" onClick={() => handleStatusUpdate('Running late')}><span>Running late</span><span className="material-symbols-outlined arrow-icon">keyboard_double_arrow_right</span></button>
                </div>
              </div>

              <div className="card queue-card">
                <div className="mb-6"><div className="flex center gap-2.5 mb-2"><span className="material-symbols-outlined purple-icon text-[24px]">notifications_active</span><h2 className="text-cdark text-[18px] font-bold">Recent Updates</h2></div></div>
                <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"> 
                  {loadingAnnouncements ? (<p className="text-center py-4">Loading...</p>) : announcements.length === 0 ? (<div className="text-center py-6 opacity-60"><p className="text-cgray text-[14px]">No announcements yet.</p></div>) : (announcements.map((ann) => (
                    <div key={ann._id} className="bg-[white] flex items-start p-4 rounded-xl border border-[#f1f5f9] gap-4 hover:bg-[#fafafa] transition-colors shrink-0">
                      <div className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] ${ann.category === 'campaign' ? 'bg-[#fff1f2] text-[#f43f5e]' : ann.category === 'calendar_month' ? 'bg-[#f0fdf4] text-[#22c55e]' : 'bg-[#eff6ff] text-[#3b82f6]'}`}><span className="material-symbols-outlined">{ann.category || 'campaign'}</span></div>
                      <div className="flex flex-col gap-0.5"><span className="text-cdark text-[15px] font-bold">{ann.category === 'campaign' ? 'Alert' : ann.category === 'calendar_month' ? 'Event' : 'General'}</span><span className="text-cgray text-[13px] leading-relaxed">{ann.announcement}</span><div className="flex items-center gap-2 mt-1"><span className="text-[#94a3b8] text-[11px] font-medium">{ann.role === 'superadmin' ? ann.full_name : `By Teacher ${ann.full_name}`}</span><span className="text-[#cbd5e1]">•</span><span className="text-[#94a3b8] text-[11px] font-medium">{new Date(ann.created_at).toLocaleDateString()}</span></div></div>
                    </div>)))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isUnassigned && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '120px', paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px' }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '450px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', width: '80px', height: '80px', borderRadius: '50%', marginBottom: '20px' }}><span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#ef4444' }}>warning</span></div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>Action Required</h2>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>Your child is not enrolled in any sections. Contact the adviser to unlock dashboard features.</p>
            </div>
          </div>
        )}
      </main>

      <SuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} message={successMessage} />
      <WarningModal isOpen={isWarningModalOpen} onClose={() => setIsWarningModalOpen(false)} title={warningTitle} message={warningMessage} />
      <ParentWhoEarlyPickUpStudent isOpen={isPickerModalOpen} onClose={() => setIsPickerModalOpen(false)} onSelect={handlePersonSelected} people={authorizedPickers} getImageUrl={getImageUrl} loading={loadingPickers} currentUser={user} />
      <UserConfirmModal isOpen={isEarlyPickupConfirmOpen} onClose={() => setIsEarlyPickupConfirmOpen(false)} onConfirm={handleConfirmEarlyPickup} title="Confirm Early Pickup" message={`Authorize ${selectedPicker?.first_name} to pick up the student?`} confirmText="Confirm" type="info" />
      <ParentDashboardQrScan isOpen={showScanner} onClose={() => setShowScanner(false)} onScanSuccess={handleGateScanSuccess} />
      <ParentFeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} onSuccess={(msg) => { setSuccessMessage(msg); setIsSuccessModalOpen(true); }} />
      <PassModal isOpen={showPassModal} onClose={() => setShowPassModal(false)} studentId={rawStudentData?.student_id} />
      <ParentNewDayModal isOpen={showNewDayModal} onClose={() => setShowNewDayModal(false)} />
      <ParentAbsenceModal isOpen={isAbsenceModalOpen} onClose={() => setIsAbsenceModalOpen(false)} onSuccess={(msg) => { setSuccessMessage(msg); setIsSuccessModalOpen(true); }} studentId={rawStudentData?.student_id} />
    </div>
  );
}