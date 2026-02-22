import React, { useState } from "react";
import { createPortal } from 'react-dom';
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import AdminConfirmModal from '../../super-admin/SuperadminConfirmationModal'; 

export function DashboardReviewAccModal({ onView, isClose, tch, onSuccess }) {
  // Modal State for Confirmation
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {}
  });

  if (!onView) return null;

  const photoUrl = tch.profile_picture 
    ? `http://localhost:3000/${tch.profile_picture}` 
    : "https://via.placeholder.com/150";

  const joinedDate = new Date(tch.created_at).toLocaleDateString();
  const reviewInputStyle = "!bg-slate-50 !text-slate-600 !border-slate-200";

  // --- CONFIRMATION TRIGGERS ---

  const triggerApprove = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Approve Application",
      message: `Are you sure you want to verify ${tch.first_name} ${tch.last_name} as a teacher?`,
      confirmText: "Verify Teacher",
      type: "info",
      onConfirm: handleApproveAction
    });
  };

  const triggerReject = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Reject Application",
      message: `This action will permanently delete ${tch.first_name}'s request and account. This cannot be undone.`,
      confirmText: "Reject & Delete",
      type: "danger",
      onConfirm: handleRejectAction
    });
  };

  // --- BACKEND ACTIONS ---

  const handleApproveAction = async () => {
    try {
      const { data } = await axios.patch(`http://localhost:3000/api/teacher/approval/${tch._id}`, {}, { withCredentials: true });
      if (data.success) {
        if (onSuccess) onSuccess(data.msg);
        isClose(); // Close the review modal upon success
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Approval failed");
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRejectAction = async () => {
    try {
      const { data } = await axios.delete(`http://localhost:3000/api/teacher/rejection/${tch._id}`, { withCredentials: true });
      if (data.success) {
        if (onSuccess) onSuccess(data.msg);
        isClose(); // Close the review modal upon success
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Rejection failed");
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined purple-icon text-[24px]">verified_user</span>
              <h2 className="text-[18px] m-0 font-bold">Review Application</h2>
            </div>
          </div>

          <div className="p-6 overflow-y-auto text-center max-h-[70vh]">
            <img 
              src={photoUrl} 
              alt="Profile" 
              className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-md border-4 border-white"
            />
            <h3 className="mb-1 text-[20px] font-bold text-cdark">{tch.first_name} {tch.last_name}</h3> 
            <p className="text-cgray text-[14px] mb-6 font-medium">@{tch.username}</p> 

            <div className="text-left mb-5">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Contact Information</h4>
              <FormInputRegistration 
                label="Email Address"
                name="email"
                className='form-input-modal readOnly!'
                value={tch.email || ""}
                readOnly={true}
              />
              <div className="flex gap-3 mt-4">
                <FormInputRegistration 
                  label="Phone Number"
                  name="phone"
                  className='form-input-modal readOnly!'
                  value={tch.phone_number || ""}
                  readOnly={true}
                />
                <FormInputRegistration 
                  label="Date Joined"
                  name="date"
                  className='form-input-modal readOnly!'
                  value={joinedDate}
                  readOnly={true}
                />
              </div>
            </div>

            <div className="text-left">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Address Details</h4>
              <FormInputRegistration 
                label="Full Address"
                name="address"
                value={tch.address || ""}
                readOnly={true}
                className='form-input-modal readOnly!'
              />
            </div>
          </div>
            
          <div className="modal-footer">
            <button className="btn-modal close" onClick={isClose}>Close</button>
            <div className="flex-1"></div>
            <button className="btn-modal reject" onClick={triggerReject}>
              <span className="material-symbols-outlined text-[18px]">close</span>
              Reject
            </button>
            <button className="btn-modal approve" onClick={triggerApprove}>
              <span className="material-symbols-outlined text-[18px]">check</span>
              Approve
            </button>
          </div>
        </div>
      </div>

      {/* Reusable Confirmation Step */}
      <AdminConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
      />
    </>,
    document.body
  );
}