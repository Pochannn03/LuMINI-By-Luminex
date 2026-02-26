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

  // --- NEW: Lightbox State for zooming IDs ---
  const [viewImage, setViewImage] = useState(null);

  if (!onView) return null;

  // --- NEW: Safe URL Helper (handles missing images and Windows slashes) ---
  const getImageUrl = (path) => {
    if (!path) return null;
    return `http://localhost:3000/${path.replace(/\\/g, "/")}`;
  };

  const photoUrl = getImageUrl(tch.profile_picture) || "https://via.placeholder.com/150";
  const schoolIdUrl = getImageUrl(tch.school_id_photo);
  const validIdUrl = getImageUrl(tch.valid_id_photo);

  const joinedDate = new Date(tch.created_at).toLocaleDateString();

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
        isClose(); 
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
        isClose(); 
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Rejection failed");
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  return createPortal(
    <>
      {/* --- NEW: IMAGE LIGHTBOX OVERLAY --- */}
      {viewImage && (
        <div 
          className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-6 cursor-zoom-out transition-all"
          onClick={() => setViewImage(null)}
        >
          <img 
            src={viewImage} 
            alt="Fullscreen View" 
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border-[4px] border-white/20 object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            onClick={() => setViewImage(null)}
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>
      )}

      <div className="modal-overlay active">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined purple-icon text-[24px]">verified_user</span>
              <h2 className="text-[18px] m-0 font-bold">Review Application</h2>
            </div>
          </div>

          <div className="p-6 overflow-y-auto text-center max-h-[70vh] custom-scrollbar">
            <img 
              src={photoUrl} 
              alt="Profile" 
              className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-md border-4 border-white bg-slate-100"
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

            <div className="text-left mb-6">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Address Details</h4>
              <FormInputRegistration 
                label="Full Address"
                name="address"
                value={tch.address || ""}
                readOnly={true}
                className='form-input-modal readOnly!'
              />
            </div>

            {/* --- NEW: VERIFICATION DOCUMENTS DISPLAY --- */}
            <div className="text-left mb-2">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Verification Documents</h4>
              <div className="flex gap-4">
                
                {/* School ID Box */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">School ID</span>
                  {schoolIdUrl ? (
                    <div 
                      className="w-full h-28 rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in relative group bg-slate-50"
                      onClick={() => setViewImage(schoolIdUrl)}
                    >
                      <img src={schoolIdUrl} alt="School ID" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-[24px]">zoom_in</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-[11px] text-slate-400 border border-slate-200 border-dashed">
                      <span className="material-symbols-outlined mb-1 text-slate-300 text-[24px]">image_not_supported</span>
                      No ID Provided
                    </div>
                  )}
                </div>

                {/* Valid ID Box */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Valid ID</span>
                  {validIdUrl ? (
                    <div 
                      className="w-full h-28 rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in relative group bg-slate-50"
                      onClick={() => setViewImage(validIdUrl)}
                    >
                      <img src={validIdUrl} alt="Valid ID" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-[24px]">zoom_in</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-[11px] text-slate-400 border border-slate-200 border-dashed">
                      <span className="material-symbols-outlined mb-1 text-slate-300 text-[24px]">image_not_supported</span>
                      No ID Provided
                    </div>
                  )}
                </div>

              </div>
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