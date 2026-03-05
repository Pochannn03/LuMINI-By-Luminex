import React, { useState } from "react";
import axios from "axios";
import { DashboardReviewAccModal } from './DashboardReviewAccModal';
import AdminConfirmModal from '../../super-admin/SuperadminConfirmationModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function DashboardPendingAccCard({ tch, onSuccess }) {
  const [viewPendingAccModal, setViewPendingAccModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); 
  const [loading, setLoading] = useState(false); // <-- NEW: Loading State

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {}
  });

  const triggerApprove = () => {
    setErrorMsg(""); 
    setConfirmConfig({
      isOpen: true,
      title: `Approve ${tch.relationship}`, 
      message: `Are you sure you want to grant access to ${tch.first_name} ${tch.last_name}?`,
      confirmText: "Yes, Approve",
      type: "info",
      onConfirm: handleApproveAction
    });
  };

  const triggerReject = () => {
    setErrorMsg(""); 
    setConfirmConfig({
      isOpen: true,
      title: `Reject Request`,
      message: `This will permanently delete the registration request from ${tch.first_name}. This cannot be undone.`,
      confirmText: "Delete Permanently",
      type: "danger",
      onConfirm: handleRejectAction
    });
  };

  const handleApproveAction = async () => {
    setLoading(true); // Start Loading
    try {
      const { data } = await axios.patch(`${BACKEND_URL}/api/teacher/approval/${tch._id}`, {}, { withCredentials: true });
      
      // Close the confirm modal first
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      
      // Then trigger the success modal in the parent component
      if (data.success && onSuccess) {
        onSuccess(data.msg || "Account successfully approved!");
      }
    } catch (err) {
      console.error("Approval error:", err);
      setErrorMsg(err.response?.data?.msg || "Approval failed. Please try again."); 
      setConfirmConfig(prev => ({ ...prev, isOpen: false })); // Close on error too
    } finally {
      setLoading(false); // End Loading
    }
  };

  const handleRejectAction = async () => {
    setLoading(true); // Start Loading
    try {
      const { data } = await axios.delete(`${BACKEND_URL}/api/teacher/rejection/${tch._id}`, { withCredentials: true });
      
      // Close the confirm modal first
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));

      // Then trigger the success modal in the parent component
      if (data.success && onSuccess) {
        onSuccess(data.msg || "Account registration permanently rejected.");
      }
    } catch (err) {
      console.error("Rejection error:", err);
      setErrorMsg(err.response?.data?.msg || "Rejection failed. Please try again."); 
      setConfirmConfig(prev => ({ ...prev, isOpen: false })); // Close on error too
    } finally {
      setLoading(false); // End Loading
    }
  };

  const photoUrl = tch.profile_picture 
    ? `${BACKEND_URL}/${tch.profile_picture.replace(/\\/g, "/")}` 
    : "https://via.placeholder.com/45";

  const dateString = new Date(tch.created_at).toLocaleDateString();

  return (
    <>
      <div className={`flex flex-col rounded-xl bg-(--white) border border-(--border-color) transition-all duration-200 hover:bg-[#f8fafc] hover:border-(--primary-blue) hover:-translate-y-0.5 hover:shadow-(--shadow-sm) ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        
        <div className="flex items-center p-4 gap-4">
          <img 
            src={photoUrl} 
            className="w-[45px] h-[45px] rounded-[10px] object-cover shrink-0" 
            alt="Avatar"
          />

          <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-cdark text-[15px] font-bold">
                {tch.first_name} {tch.last_name}
              </span>
              <span className="text-cgray text-[12px] font-medium">
                Role: {tch.relationship} • @{tch.username}
              </span>
              <span className="text-slate-400 text-[11px]">
                Joined: {dateString}
              </span>
          </div>

          <div className="flex items-center gap-2">
              <button 
                className="btn-icon-tool h-12! w-12!" 
                title="Review Details"
                onClick={() => setViewPendingAccModal(true)}
              >
                  <span className="material-symbols-outlined text-[24px]!">visibility</span>
              </button>
              
              <button 
                className="btn-icon-tool h-12! w-12! group hover:bg-green-200!" 
                title="Approve"
                onClick={triggerApprove}
              >
                  <span className="material-symbols-outlined text-[24px]! group-hover:text-green-700">check</span>
              </button>
              
              <button 
                className="btn-icon-tool h-12! w-12! group hover:bg-red-200!" 
                title="Reject"
                onClick={triggerReject}
              >
                <span className="material-symbols-outlined text-[24px]! group-hover:text-red-700!">
                    close
                </span>
              </button>
          </div>
        </div>

        {errorMsg && (
          <div className="px-4 pb-3">
            <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-md flex items-center gap-1 w-fit">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {errorMsg}
            </span>
          </div>
        )}
      </div>

      <AdminConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => !loading && setConfirmConfig(prev => ({ ...prev, isOpen: false }))} // Prevent closing while loading
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
        loading={loading} // <-- PASS LOADING STATE HERE
      />

      <DashboardReviewAccModal
        onView={viewPendingAccModal}
        isClose={() => setViewPendingAccModal(false)}
        tch={tch} 
        onSuccess={onSuccess} 
      />
    </>
  );
}