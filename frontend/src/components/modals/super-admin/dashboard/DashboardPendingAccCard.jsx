import React, { useState } from "react";
import axios from "axios";
import { DashboardReviewAccModal } from './DashboardReviewAccModal';
import AdminConfirmModal from '../../super-admin/SuperadminConfirmationModal';

export function DashboardPendingAccCard({ tch, onSuccess }) {
  const [viewPendingAccModal, setViewPendingAccModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {}
  });

  const triggerApprove = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Approve Teacher",
      message: `Are you sure you want to grant access to ${tch.first_name} ${tch.last_name}?`,
      confirmText: "Yes, Approve",
      type: "info",
      onConfirm: handleApproveAction
    });
  };

  const triggerReject = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Reject Request",
      message: `This will permanently delete the registration request from ${tch.first_name}. This cannot be undone.`,
      confirmText: "Delete Permanently",
      type: "danger",
      onConfirm: handleRejectAction
    });
  };

  const handleApproveAction = async () => {
    try {
      const { data } = await axios.patch(`http://localhost:3000/api/teacher/approval/${tch._id}`, {}, { withCredentials: true });
      if (data.success && onSuccess) onSuccess(data.msg);
    } catch (err) {
      alert(err.response?.data?.msg || "Approval failed");
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRejectAction = async () => {
    try {
      const { data } = await axios.delete(`http://localhost:3000/api/teacher/rejection/${tch._id}`, { withCredentials: true });
      if (data.success && onSuccess) onSuccess(data.msg);
    } catch (err) {
      alert(err.response?.data?.msg || "Rejection failed");
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const photoUrl = tch.profile_picture 
    ? `http://localhost:3000/${tch.profile_picture}` 
    : "https://via.placeholder.com/45";

  const dateString = new Date(tch.created_at).toLocaleDateString();

  return (
    <>
      <div className="flex items-center p-4 rounded-xl bg-(--white) border border-(--border-color) gap-4 transition-all duration-200 hover:bg-[#f8fafc] hover:border-(--primary-blue) hover:-translate-y-0.5 hover:shadow-(--shadow-sm)">
    
        {/* Teacher Avatar */}
        <img 
          src={photoUrl} 
          className="w-[45px] h-[45px] rounded-[10px] object-cover shrink-0" 
          alt="Teacher Avatar"
        />

        {/* Teacher Info (queue-info) */}
        <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-cdark text-[15px] font-bold">
              {tch.first_name} {tch.last_name}
            </span>
            <span className="text-cgray text-[12px] font-medium">
              Role: Teacher • @{tch.username}
            </span>
            <span className="text-slate-400 text-[11px]">
              Joined: {dateString}
            </span>
        </div>

        {/* Action Buttons (action-buttons-small) */}
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

      <AdminConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
      />

      <DashboardReviewAccModal
        onView={viewPendingAccModal}
        isClose={() => setViewPendingAccModal(false)}
        tch={tch} 
      />

    </>
  );
}