import React, { useState } from "react";
import axios from "axios";
import AdminConfirmModal from '../SuperadminConfirmationModal';
import { DashboardReviewOverrideModal } from "./DasboardReviewManualTransfer";
// You'll likely want a specific modal to view the ID Photo evidence
// import { DashboardReviewOverrideModal } from './DashboardReviewOverrideModal';

export function DashboardPendingOverrideCard({ ovr, onSuccess, isClose }) {
  const [viewOverrideModal, setViewOverrideModal] = useState(false);
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
      title: "Confirm Manual Transfer",
      message: `Are you sure you want to officially record this ${ovr.purpose} for ${ovr.student_details?.first_name}?`,
      confirmText: "Yes, Approve",
      type: "info",
      onConfirm: handleApproveAction
    });
  };

  const triggerReject = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Discard Override",
      message: `This will mark the manual transfer for ${ovr.student_details?.first_name} as invalid. The record will be kept but flagged as unapproved.`,
      confirmText: "Discard Record",
      type: "danger",
      onConfirm: handleRejectAction
    });
  };

  const handleApproveAction = async () => {
    try {
      const { data } = await axios.patch(
        `http://localhost:3000/api/transfer/override/${ovr._id}/approve`, 
        {}, 
        { withCredentials: true }
      );

      if (data.success) {
      if (typeof onSuccess === 'function') {
        onSuccess(data.msg);
      }
      if (typeof isClose === 'function') {
        isClose();
      }
    }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.msg || "Approval failed";
      alert(errorMsg);
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRejectAction = async () => {
    try {
      // 1. Call the specific reject endpoint you provided
      const { data } = await axios.patch(
        `http://localhost:3000/api/transfer/override/${ovr._id}/reject`, 
        {}, 
        { withCredentials: true }
      );

      if (data.success) {
        if (typeof onSuccess === 'function') {
          onSuccess(data.msg); 
        }
        if (typeof isClose === 'function') {
          isClose();
        }
      }
    } catch (err) {
      console.error("Rejection Error:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.msg || "Rejection failed";
      alert(errorMsg);
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };


  const dateString = new Date(ovr.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      <div className="flex items-center p-4 rounded-xl bg-white border border-slate-200 gap-4 transition-all duration-200 hover:bg-[#f8fafc] hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-sm">
    
        {/* Student Icon/Avatar */}
        <div className="w-[45px] h-[45px] rounded-[10px] bg-slate-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-500">child_care</span>
        </div>

        {/* Override Info */}
        <div className="flex-1 flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
                <span className="text-cdark text-[15px] font-bold">
                  {ovr.student_details?.first_name} {ovr.student_details?.last_name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 mb-1 rounded-full font-bold uppercase ${ovr.purpose === 'Pick up' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {ovr.purpose}
                </span>
            </div>
            <span className="text-cgray text-[12px] font-medium">
              Guardian: {ovr.user_name} ({ovr.is_registered_guardian ? 'Registered' : 'Guest'})
            </span>
            <span className="text-slate-400 text-[11px]">
              Requested at: {dateString}
            </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
            <button 
              className="btn-icon-tool h-12! w-12!" 
              title="View Evidence"
              onClick={() => setViewOverrideModal(true)}
            >
                <span className="material-symbols-outlined text-[24px]!">policy</span>
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
      
      <DashboardReviewOverrideModal
        onView={viewOverrideModal}
        isClose={() => setViewOverrideModal(false)}
        ovr={ovr} 
        onSuccess={onSuccess}
      />
    </>
  );
}