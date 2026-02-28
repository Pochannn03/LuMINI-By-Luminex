import React, { useState, useEffect, useRef } from "react";
import { Link } from 'react-router-dom';
import { io } from "socket.io-client";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";
import AdminQueueParentGuardian from "../../components/modals/admin/dashboard/AdminQueueParentGuardian"
import AdminDashboardQrScan from "../../components/modals/admin/dashboard/AdminDashboardQrScan"
import AdminConfirmPickUpAuth from "../../components/modals/admin/dashboard/AdminConfirmPickUpAuth";
import AdminActionFeedbackModal from '../../components/modals/admin/TeacherActionModal';
import AdminEmergencyOverrideModal from "../../components/modals/admin/dashboard/AdminEmergencyOverride";
import WarningModal from "../../components/WarningModal";
import "../../styles/admin-teacher/admin-dashboard.css"

export default function AdminDashboard() {
  // REF
  const teacherSections = useRef([]);

  // EMERGENCY OVERRIDE STATE
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // MODAL STATES
  const [activeScanMode, setActiveScanMode] = useState(null);
  const [queue, setQueue] = useState([]);
  const [errorTitle, setErrorTitle] = useState("Error");
  const [errorMainMsg, setErrorMainMsg] = useState("An error occurred");
  const [errorMessage, setErrorMessage] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [transferSuccessData, setTransferSuccessData] = useState(null);
  const [posting, setPosting] = useState(false);

  // STATE FOR ANNOUNCEMENT
  const [announcementData, setAnnouncementData] = useState({
    content: '',
    category: 'notifications_active'
  });

  // STATES FOR QR SCANNING AUTHENTICATION
  const [scannedData, setScannedData] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);

  // STUDENT QR AUTHENTICATION (ATTENDANCE)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [scannedStudentData, setScannedStudentData] = useState(null);

  // STATE FOR ANNOUNCEMENT
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [systemAnnouncements, setSystemAnnouncements] = useState([]);

  // WARNING STATE
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  // GETTING INFORMATION
  const handleScanSuccess = async (rawValue) => {
    setActiveScanMode(null);
    setLoadingScan(true);

    const parentTokenRegex = /^[0-9a-f]{32}$/i;
    const studentIdRegex = /^\d{4}-\d{4}$/;

    try {
      if (activeScanMode === 'user') {
        if (!parentTokenRegex.test(rawValue)) {
          throw new Error("Invalid Parent Pass. Please scan a valid Pickup Token.");
        }

        const response = await axios.get(`http://localhost:3000/api/scan/pass/${rawValue}`, {
          withCredentials: true
        });

        if (response.data.valid) {
          setScannedData({
            ...response.data,
            token: rawValue
          });
          setIsAuthModalOpen(true);
        }
      } 

      else if (activeScanMode === 'student') {
        if (!studentIdRegex.test(rawValue)) {
          throw new Error("Invalid Student ID. Please scan a valid Student ID QR.");
        }

        const response = await axios.post(`http://localhost:3000/api/attendance`, 
          { studentId: rawValue }, 
          { withCredentials: true }
        );

        setScannedStudentData({
          studentName: response.data.student.full_name,
          studentId: response.data.student.student_id,
          timeIn: response.data.student.time_in,
          status: response.data.student.status,
          displayMsg: response.data.msg
        });
        setIsAttendanceModalOpen(true);
      }

    } catch (error) {
      const finalMessage = error.response?.data?.error || error.message || "An unexpected error occurred.";
      setErrorTitle("Scan Error");
      setErrorMainMsg("Could not process QR");
      setErrorMessage(finalMessage);
      setIsErrorModalOpen(true);
    } finally {
      setLoadingScan(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementData.content.trim()) return;

    try {
      setPosting(true);
      
      const response = await axios.post("http://localhost:3000/api/announcements", 
        { announcement: announcementData.content,
          category: announcementData.category
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const newAnn = response.data.announcement; 
        setAnnouncementData({ content: '', category: 'notifications_active' });
        
        setTransferSuccessData({
          type: 'success',
          title: 'Announcement Posted',
          message: 'Your update has been shared with all parents.',
          details: [
            { label: 'Author', value: `${newAnn.user.first_name} ${newAnn.user.last_name}` },
            { label: 'Status', value: 'Live' }
          ]
        });
      }
    } catch (err) {
      // Capture the specific backend error message
      const backendError = err.response?.data?.error || "Failed to post announcement.";
      
      setErrorTitle("Post Failed");
      setErrorMainMsg("Announcement Error");
      setErrorMessage(backendError);
      setIsErrorModalOpen(true);
    } finally {
      setPosting(false);
    }
  };

  // CONFIRM DROP OFF/PICK UP AUTHORIZATION
  const handleConfirmPickup = async () => {
    try {
      setLoadingScan(true);
      const response = await axios.post(`http://localhost:3000/api/transfer`, {
        studentId: scannedData.student.studentId,
        studentName: scannedData.student.name,
        sectionId: scannedData.student.sectionId,
        sectionName: scannedData.student.sectionName,
        guardianId: scannedData.guardian.userId,
        guardianName: scannedData.guardian.name,
        purpose: scannedData.purpose,
        token: scannedData.token
      }, { withCredentials: true });

      if (response.data.success) {
        setIsAuthModalOpen(false);
        setTransferSuccessData({
          title: response.data.message.purpose === 'Drop off' ? 'Entry Confirmed' : 'Exit Confirmed',
          message: response.data.message.text, 
          type: 'success',
          details: [
            { label: 'Student', value: response.data.studentName },
            { label: 'Activity', value: response.data.message.purpose },
            { label: 'Guardian', value: response.data.guardianName }
          ]
        });
        setScannedData(null);
      }

    } catch (err) {
      setIsAuthModalOpen(false); 
      setIsErrorModalOpen(false); 

      const backendError = err.response?.data?.error || "An unexpected error occurred.";
      setTransferSuccessData({
          type: 'error',
          title: 'Transfer Failed',
          message: 'Invalid Pass', 
          details: [
              { label: 'Reason', value: backendError },
              { label: 'Status', value: 'Access Denied' }
          ],
          buttonText: 'Try Again'
      });
    } finally {
      setLoadingScan(false);
    }
  };

  useEffect(() => {
    const fetchSystemAnnouncements = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/announcement/teacher`, 
          { withCredentials: true });
        setSystemAnnouncements(res.data.announcements);
      } catch (err) {
        console.error("Could not load system updates", err);
      }
    };
    fetchSystemAnnouncements();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/announcement/teacher', {
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
  }, []);

  useEffect(() => {
    const fetchInitialQueue = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/queue", 
          { withCredentials: true }
        );

        if (response.data.success) {
          setQueue(response.data.queue);
          teacherSections.current = response.data.authorized_sections || [];
          }
      } catch (err) {
          console.error("Failed to fetch queue:", err);
      }
    };

    fetchInitialQueue();

    const socket = io("http://localhost:3000");
    
    socket.on("new_queue_entry", (newEntry) => {
      setQueue(prevQueue => {
        const isAllowed = teacherSections.current.some(id => Number(id) === Number(newEntry.section_id));

        if (!isAllowed) {
            return prevQueue; 
        }

        const filtered = prevQueue.filter(q => q.user_id !== newEntry.user_id);
        return [newEntry, ...filtered];
      });
    });

    socket.on("remove_queue_entry", (userId) => {
      setQueue(prevQueue => 
        prevQueue.filter(q => Number(q.user_id) !== Number(userId))
      );
    });

    socket.on('new_announcement', (newAnn) => {

    const incomingRole = newAnn.role || newAnn.user?.role;

      setAnnouncements(prev => {
        const exists = prev.some(ann => ann._id === newAnn._id);
        if (exists) return prev;
        if (incomingRole === 'superadmin' || Number(newAnn.user_id) === Number(user?.user_id)) {
            return [newAnn, ...prev];
        }
        
        return prev;
      });
    });

    socket.on('new_notification', (notif) => {
      const isEarlyPickup = notif.type === 'Transfer';
      const forThisTeacher = Number(notif.recipient_id) === Number(user?.user_id);

      if (isEarlyPickup && forThisTeacher) {
        if (!isAuthModalOpen && !transferSuccessData) {
          setWarningTitle(notif.title);
          setWarningMessage(notif.message);
          setIsWarningModalOpen(true);
        }
      }
    });

    return () => socket.disconnect();
  }, []);

  const handleCloseScanner = () => {
    setActiveScanMode(null);
  };

  const handleAnnChange = (e) => {
    const { name, value } = e.target;
    setAnnouncementData(prev => ({ ...prev, [name]: value }));
  };

  // SUCCESS OVERRIDE
  const handleOverrideSuccess = (msg) => {
    setTransferSuccessData({
      type: 'success',
      title: 'Override Successful',
      message: msg,
      details: [
        { label: 'Method', value: 'Manual Emergency Entry' },
        { label: 'Status', value: 'Waiting For Approval' },
        { label: 'Note', value: 'Please remind the User that this transfer will not be officially recorded in the Transfer History until approved by a SuperAdmin.' }
      ]
    });
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="admin-banner">
          <div>
            <h1 className="text-[28px]! font-bold text-[white]! mb-2 tracking-[-0.5px]">Welcome Back!</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Ready for your next class?</p>
          </div>
        </section>


      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
        {/* Left Part of Content */}
        <div className="flex flex-col gap-6">
          <div className="card queue-card">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb2">
                <span className="material-symbols-outlined blue-icon text-[24px]">schedule</span>
                <h2 className="text-cdark text-[18px] font-bold" id="queueTitle">Queue</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal ml-0">Real-time updates from parents.</p>
            </div>

            <div className="flex flex-col gap-4" id="queueContainer">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-60">
                  <span className="material-symbols-outlined text-[40px] mb-2">inbox</span>
                  <p className="text-[#94a3b8] text-center">No parents in the queue.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <AdminQueueParentGuardian 
                    key={item._id} 
                    item={item}
                    setQueue={setQueue}
                  />
                ))
              )}
            </div>
          </div>

          <div className="card emergency-card" onClick={() => setIsOverrideModalOpen(true)}>
            <div className="emergency-card-wrapper">
              <span className="material-symbols-outlined shrink-0">e911_emergency</span>
            </div>
            <div>
              <h3 className="text-[#c53030] text-[16px]! font-bold mb-0.5">Transfer Override</h3>
              <p className="text-[#742a2a] text-[12px]!">Override standard student transfer process.</p>
            </div>
            <span className="material-symbols-outlined arrow-icon ml-auto text-[#c53030]!">arrow_forward</span>
          </div>

          <div className="card action-card flex flex-col p-6">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                  announcementData.category === 'campaign' ? 'bg-red-50' : 
                  announcementData.category === 'calendar_month' ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                  <span className={`material-symbols-outlined text-[22px] ${
                    announcementData.category === 'campaign' ? 'text-red-600' : 
                    announcementData.category === 'calendar_month' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {announcementData.category}
                  </span>
                </div>

                <h2 className="text-cdark font-bold text-[18px]! -m-2">Class Announcement</h2>
              </div>

              <p className="text-cgray leading-normal text-[14px]! mb-3">Post updates to parents.</p>

              <select 
                name="category"
                value={announcementData.category}
                onChange={handleAnnChange}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-[14px] outline-none bg-white cursor-pointer transition-all focus:border-slate-400"
              >
                <option value="notifications_active">General Announcement</option>
                <option value="campaign">Emergency Alert</option>
                <option value="calendar_month">Meeting / Event</option>
              </select>
            </div>

            {/* Announcement Box: Textarea area */}
            <div className="announcement-box mt-1">
              <textarea 
                name="content"
                className="text-cdark w-full h-20 border-none bg-transparent resize-none text-[14px] outline-none" 
                placeholder="Write an announcement..."
                value={announcementData.content}
                onChange={handleAnnChange}
                disabled={posting}
              />
              <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-slate-100">
                <div className="text-[12px] text-cgray">
                  {announcementData.content.length} characters
                </div>
                <button 
                  className={`btn-post ${posting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handlePostAnnouncement}
                  disabled={posting || !announcementData.content.trim()}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Part of the Content */}
        <div className="flex flex-col gap-6">
          <div className="card action-card flex flex-col gap-5">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined orange-icon text-[24px]">qr_code_scanner</span>
                <h2 className="text-cdark text-[18px] font-bold">Guardian QR Verification</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal ml-0">Scan guardian's QR code for student pickup.</p>
            </div>

            <div className="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0">
              <span className="material-symbols-outlined qr-large-icon">qr_code_2</span>
            </div>

            <div className="flex flex-col gap-3">
              <button className="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" id="scanGuardianBtn" onClick={() => setActiveScanMode('user')}>
                <span className="material-symbols-outlined text-[20px]!">center_focus_weak</span>
                  Scan Parent or Guardian QR Code
              </button>
              <button className="btn btn-outline gap-2 h-[50px] font-semibold rounded-xl text-[14px]! border-none w-full">Verify Manually</button>
            </div>
          </div>

          <div className="card action-card flex flex-col gap-5 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined orange-icon text-[24px]">qr_code_2</span>
                <h2 className="text-cdark text-[18px]! font-bold">Student QR Attendance</h2>
              </div>
              <p className="text-cgray leading-normal ml-0 text-[14px]!">Initiate scan for daily student attendance.</p>
            </div>

            <div className="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0">
              <span className="material-symbols-outlined qr-large-icon">qr_code_2</span>
            </div>

            <div className="flex flex-col gap-3">
              <button className="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" id="startScanBtn" onClick={() => setActiveScanMode('student')}>
                <span className="material-symbols-outlined">center_focus_weak</span>
                Scan Student QR Code
              </button>
            </div>
          </div>

          <div className="card queue-card">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined purple-icon text-[24px]">notifications_active</span>
                <h2 className="text-cdark text-[18px] font-bold">Recent Updates</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal">System-wide broadcasts and alerts.</p>
            </div>

            <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar"> 
              {loadingAnnouncements ? (
                <p className="text-center text-cgray py-4">Loading updates...</p>
              ) : announcements.length === 0 ? (
                <div className="text-center py-6 opacity-60">
                  <span className="material-symbols-outlined text-[40px] mb-2 text-slate-300">notifications_off</span>
                  <p className="text-cgray text-[14px]">No recent updates.</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann._id} className="bg-[white] flex items-start p-4 rounded-xl border border-[#f1f5f9] gap-4 hover:bg-[#fafafa] transition-colors shrink-0">
                    <div className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] ${
                      ann.category === 'campaign' ? 'bg-[#fff1f2] text-[#f43f5e]' : 
                      ann.category === 'calendar_month' ? 'bg-[#f0fdf4] text-[#22c55e]' : 
                      'bg-[#eff6ff] text-[#3b82f6]'
                    }`}>
                      <span className="material-symbols-outlined">
                        {ann.category || 'notifications_active'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-cdark text-[15px] font-bold">
                        {/* Check if the poster is a SuperAdmin (adjust property name based on your payload) */}
                        {ann.role === 'superadmin' ? 'System Update' : (
                          ann.category === 'campaign' ? 'Emergency Alert' : 
                          ann.category === 'calendar_month' ? 'Event' : 
                          'General Announcement'
                        )}
                      </span>
                      <span className="text-cgray text-[13px] leading-relaxed">
                        {ann.announcement}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[#94a3b8] text-[11px] font-medium">
                          {ann.role === 'superadmin' ? ann.full_name : `By Teacher ${ann.full_name}`}
                        </span>
                        <span className="text-[#cbd5e1]">•</span>
                        <span className="text-[#94a3b8] text-[11px] font-medium">
                          {new Date(ann.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </main>

      <WarningModal 
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        title={warningTitle}
        message={warningMessage}
      />

      <AdminEmergencyOverrideModal 
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        onSuccess={handleOverrideSuccess}
      />

      <AdminDashboardQrScan 
        isOpen={!!activeScanMode}
        onClose={handleCloseScanner}
        scanMode={activeScanMode}
        onScan={handleScanSuccess}
      />

      <AdminConfirmPickUpAuth 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        data={scannedData}
        onConfirm={handleConfirmPickup}
      />

      <AdminActionFeedbackModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        type={scannedStudentData?.status === 'Late' ? 'warning' : 'success'}
        title="Attendance Recorded"
        message={scannedStudentData?.displayMsg}
        details={[
          { label: 'Student ID', value: scannedStudentData?.studentId },
          { label: 'Student', value: scannedStudentData?.studentName},
          { label: 'Time In', value: scannedStudentData?.timeIn },
          { label: 'Status', value: scannedStudentData?.status }
        ]}
      />

      <AdminActionFeedbackModal
        isOpen={!!transferSuccessData}
        onClose={() => setTransferSuccessData(null)}
        type={transferSuccessData?.type || 'success'}
        title={transferSuccessData?.title}
        message={transferSuccessData?.message}
        details={transferSuccessData?.details}
        buttonText={transferSuccessData?.type === 'error' ? 'Try Again' : 'Great'}
      />

      <AdminActionFeedbackModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        type="error"
        title={errorTitle}
        message={errorMainMsg}
        details={[
          { label: 'Reason', value: errorMessage } 
        ]}
        buttonText="Try Again"
      />

      {loadingScan && (
        <div className="fixed inset-0 bg-black/50 z-9999 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined animate-spin text-blue-600">sync</span>
                <span>Verifying Pass...</span>
            </div>
        </div>
      )}

    </div>
  );
}