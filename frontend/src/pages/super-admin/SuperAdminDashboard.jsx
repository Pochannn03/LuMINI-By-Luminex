import React, { useState, useEffect} from "react";
import { Link } from 'react-router-dom';
import { io } from "socket.io-client";
import { DashboardPendingAccCard } from "../../components/modals/super-admin/dashboard/DashboardPendingAccCard";
import { DashboardPendingOverrideCard } from "../../components/modals/super-admin/dashboard/DashbaordPendingManualTransfer";
import { RejectedTransferHistoryModal } from "../../components/modals/super-admin/dashboard/DashboardRejectedManualTransfer";
import DashboardFeedbackModal from "../../components/modals/super-admin/dashboard/DashboardFeedbackModal";
import { DashboardFeedbackCard } from "../../components/modals/super-admin/dashboard/DashboardFeedbackCards";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";
import SuccessModal from "../../components/SuccessModal";
import '../../styles/super-admin/super-admin-dashboard.css';


export default function SuperAdminDashboard() {
  const [pendingOverrides, setPendingOverrides] = useState([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [pendingTeachers, setPendingTeachers] = useState([]); 
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    loading: true
  });

  // --- NEW: SUCCESS MODAL STATE ---
  const [successModalConfig, setSuccessModalConfig] = useState({
    isOpen: false,
    message: ""
  });
  

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/users/cards', { 
          withCredentials: true 
        });

        if (response.data.success) {
          setStats({
            totalStudents: response.data.students.length,
            totalTeachers: response.data.teachers.length,
            totalParents: response.data.users.length,
            loading: false
          });
          setPendingTeachers(response.data.pending_teachers || []);
          setLoadingTeachers(false);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats(prev => ({ ...prev, loading: false }));
        setLoadingTeachers(false);
      }
    };

    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const fetchPendingOverrides = async () => {
        setLoadingOverrides(true);
        try {
            const response = await axios.get('http://localhost:3000/api/transfer/override', { 
                withCredentials: true 
            });

            if (response.data.success) {
                // Update your state with the populated data from the backend
                setPendingOverrides(response.data.overrides || []);
                setLoadingOverrides(false);
            }
        } catch (error) {
            console.error("Error fetching pending overrides:", error);
            // Ensure loading turns off even if the server throws an error
            setLoadingOverrides(false);
        }
    };

    fetchPendingOverrides();
  }, []);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/feedback', { 
          withCredentials: true 
        });

        if (response.data.success) {
          setFeedbacks(response.data.feedbacks);
        }
      } catch (error) {
        console.error("❌ Failed to fetch feedbacks:", error);
      }
    };

    fetchFeedbacks();
  }, []);
  

  useEffect(() => {
    const socket = io("http://localhost:3000", { withCredentials: true });

    socket.on('teacher_processed', (data) => {
      setPendingTeachers(prev => prev.filter(tch => tch._id !== data.id));

      if (data.action === 'approved') {
        setStats(prev => ({
          ...prev,
          totalTeachers: prev.totalTeachers + 1
        }));
      }
    });

    socket.on('new_override_request', (newOverride) => {
      setPendingOverrides(prev => [newOverride, ...prev]);
    });

    socket.on('override_processed', (data) => {
      setPendingOverrides(prev => prev.filter(ovr => ovr._id !== data.id));
    });

    socket.on('teacher_registered', (newTeacher) => {
      setPendingTeachers(prev => [newTeacher, ...prev]);
    });

    socket.on('new_feedback', (newFeedback) => {
      setFeedbacks((prev) => [newFeedback, ...prev]);
    });

    return () => {
      socket.off('teacher_processed');
      socket.off('teacher_registered');
      socket.off('new_override_request');
      socket.off('override_processed');
      socket.off('new_feedback');
      socket.disconnect();
    };
  }, []);

  const handleOpenFeedback = (fb) => {
    setSelectedFeedback(fb);
    setIsFeedbackModalOpen(true);
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">

      {/* --- NEW: RENDER THE SUCCESS MODAL --- */}
      <SuccessModal 
        isOpen={successModalConfig.isOpen}
        onClose={() => setSuccessModalConfig({ isOpen: false, message: "" })}
        message={successModalConfig.message}
      />

      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="superadmin-banner">
          <div>
            <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">System Overview</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Here is what's happening across the school today.</p>
          </div>
        </section>


      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="card stat-card">
              <div className="stat-icon blue-bg">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div className="stat-info">
                <h3 id="statTotalStudents">{stats.loading ? "--" : stats.totalStudents}</h3>
                <p>Total Students</p>
              </div>
            </div>

              <div className="card stat-card">
                <div className="stat-icon purple-bg">
                  <span className="material-symbols-outlined"
                    >cast_for_education</span
                  >
                </div>
                <div className="stat-info">
                  <h3 id="statTotalTeachers">{stats.loading ? "--" : stats.totalTeachers}</h3> 
                  <p>Active Teachers</p>
                </div>
              </div>

              <div className="card stat-card">
                <div className="stat-icon orange-bg">
                  <span className="material-symbols-outlined">family_restroom</span>
                </div>
                <div className="stat-info">
                  <h3 id="statTotalParents">{stats.loading ? "--" : stats.totalParents}</h3>
                  <p>Parents and Guardians Registered</p>
                </div>
            </div>
            
          </div>

          <div className="card queue-card">
            <div className="mb-6">
              <h2 className="text-cdark text-[18px]! font-bold!">Pending Account Approvals</h2>
            </div>

            <div className="flex flex-col gap-4">
              {loadingTeachers && (
                <p className="text-cgray p-[15px]">Loading Pending Teachers...</p>
              )}

              {/* 2. Empty State */}
              {!loadingTeachers && pendingTeachers.length === 0 && (
                <p className="text-cgray p-[15px] text-sm">No Pending Account Found.</p>
              )}

              {/* 3. Render Cards */}
              {!loadingTeachers && pendingTeachers.map((tch) => (
                <DashboardPendingAccCard 
                  key={tch._id || tch.user_id} 
                  tch={tch}
                  // --- NEW: Triggers the dashboard's success modal ---
                  onSuccess={(msg) => setSuccessModalConfig({ isOpen: true, message: msg })}
                />
              ))}
            </div>

          </div>

          <div className="card queue-card">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-cdark text-[18px]! font-bold!">Pending Manual Transfer</h2>
              <button 
                onClick={() => setShowRejectedModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[12px] font-bold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                Show Rejected
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Use loadingOverrides instead of loadingTeachers */}
              {loadingOverrides && (
                <p className="text-cgray p-[15px]">Loading Manual Transfers...</p>
              )}

              {/* Use pendingOverrides state */}
              {!loadingOverrides && pendingOverrides.length === 0 && (
                <p className="text-cgray p-[15px] text-sm">No Pending Manual Transfer Found.</p>
              )}

              {!loadingOverrides && pendingOverrides.map((ovr) => (
                <DashboardPendingOverrideCard 
                  key={ovr._id} 
                  ovr={ovr}
                  onSuccess={(msg) => {
                    setSuccessModalConfig({ isOpen: true, message: msg });
                    // Optional: Remove the item from local state so it disappears immediately
                    setPendingOverrides(prev => prev.filter(item => item._id !== ovr._id));
                  }}
                />
              ))}
            </div>
          </div>

        </div>

        <div className="flex flex-col gap-6">
          <div className="card p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined orange-icon text-[24px]">
                  settings_suggest
                </span>
                <h2 className="text-cdark text-[18px] font-bold">Quick Management</h2>
              </div>
              <p className="text-cgray text-[13px]! leading-normal!">
                Access key administrative areas.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link to="/superadmin/manage-class" className="quick-link-item">
                <div className="link-icon-box icon-blue">
                    <span className="material-symbols-outlined">manage_accounts</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="text-cdark text-[15px]! font-semibold! m-0">Manage Classes & Students</h3>
                  <p className="text-cgray text-[12px]! !leading-[1.4]!">Add, edit, or remove classes and student profiles.</p>
                </div>
                <div>
                  <span className="material-symbols-outlined arrow-icon">
                    chevron_right
                  </span>
                </div>
              </Link>
              
              <Link to="/superadmin/accounts" className="quick-link-item">
                <div className="link-icon-box icon-blue">
                    <span className="material-symbols-outlined">group</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="text-cdark text-[15px]! font-semibold! m-0">Accounts</h3>
                  <p className="text-cgray text-[12px]! !leading-[1.4]!">Manage user accounts and deactivate access.</p>
                </div>
                <div>
                  <span className="material-symbols-outlined arrow-icon">
                    chevron_right
                  </span>
                </div>
              </Link>

              <Link to="/superadmin/qr-gate" className="quick-link-item">
                <div className="link-icon-box icon-blue">
                    <span className="material-symbols-outlined">qr_code</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="text-cdark text-[15px]! font-semibold! m-0">Qr Gate</h3>
                  <p className="text-cgray text-[12px]! !leading-[1.4]!">Qr for Parent or Guardian to scan on gate</p>
                </div>
                <div>
                  <span className="material-symbols-outlined arrow-icon">
                    chevron_right
                  </span>
                </div>
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined purple-icon text-[24px]">
                  dns
                </span>
                <h2 className="text-cdark text-[18px] font-bold">Feedbacks</h2>
              </div>
            </div>
            
            {/* Content Below is for Quick System Notification */}
            <div className="flex flex-col gap-2">
              {feedbacks && feedbacks.length > 0 ? (
                feedbacks.map((fb) => (
                  <DashboardFeedbackCard 
                    key={fb._id} 
                    item={fb} 
                    onClick={handleOpenFeedback} 
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-slate-300 text-[32px] mb-2">
                    chat_bubble_outline
                  </span>
                  <span className="text-cgray text-[13px] font-medium">No feedback yet</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>

    <RejectedTransferHistoryModal 
      isOpen={showRejectedModal} 
      onClose={() => setShowRejectedModal(false)} 
    />

    <DashboardFeedbackModal 
      isOpen={isFeedbackModalOpen} 
      onClose={() => setIsFeedbackModalOpen(false)} 
      feedback={selectedFeedback} 
    />

    </div>
  );
}