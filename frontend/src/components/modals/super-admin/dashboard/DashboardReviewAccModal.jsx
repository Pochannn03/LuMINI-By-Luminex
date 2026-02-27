import React, { useState } from "react";
import { createPortal } from 'react-dom';
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import AdminConfirmModal from '../../super-admin/SuperadminConfirmationModal'; 

export function DashboardReviewOverrideModal({ onView, isClose, ovr, onSuccess }) {
  // Modal State for Confirmation
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {}
  });

  // Lightbox State for zooming the ID Photo
  const [viewImage, setViewImage] = useState(null);

  if (!onView || !ovr) return null;

  // Helper to handle backend image paths
  const getImageUrl = (path) => {
    if (!path) return null;
    return `http://localhost:3000/${path.replace(/\\/g, "/")}`;
  };

  const evidenceUrl = getImageUrl(ovr.id_photo_evidence);
  const formattedDate = new Date(ovr.created_at).toLocaleString([], { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  // --- CONFIRMATION TRIGGERS ---
  const triggerApprove = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Confirm Manual Transfer",
      message: `Are you sure you want to officially record this ${ovr.purpose} for ${ovr.student_details?.first_name}?`,
      confirmText: "Yes, Approve Transfer",
      type: "info",
      onConfirm: () => handleAction('approve')
    });
  };

  const triggerReject = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Discard Transfer Record",
      message: `This will mark the manual transfer as invalid. This record will be kept in history but flagged as unapproved.`,
      confirmText: "Discard Record",
      type: "danger",
      onConfirm: () => handleAction('reject')
    });
  };

  // --- BACKEND ACTIONS ---
  const handleAction = async (actionType) => {
    const endpoint = actionType === 'approve' ? 'approve' : 'reject';
    try {
      const { data } = await axios.patch(
        `http://localhost:3000/api/transfer/override/${endpoint}/${ovr._id}`, 
        {}, 
        { withCredentials: true }
      );
      if (data.success) {
        if (onSuccess) onSuccess(data.msg);
        isClose(); 
      }
    } catch (err) {
      alert(err.response?.data?.msg || "Action failed");
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  return createPortal(
    <>
      {/* --- IMAGE LIGHTBOX --- */}
      {viewImage && (
        <div 
          className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-6 cursor-zoom-out"
          onClick={() => setViewImage(null)}
        >
          <img 
            src={viewImage} 
            alt="Evidence Full View" 
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl border-[4px] border-white/20 object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
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
              <span className="material-symbols-outlined orange-icon text-[24px]">policy</span>
              <h2 className="text-[18px] m-0 font-bold">Review Manual Transfer</h2>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {/* Student & Purpose Header */}
            <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <span className="material-symbols-outlined text-[40px]">child_care</span>
                </div>
                <h3 className="mb-1 text-[20px] font-bold text-cdark">
                    {ovr.student_details?.first_name} {ovr.student_details?.last_name}
                </h3>
                <div className="flex justify-center gap-2">
                    <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase ${ovr.purpose === 'Pick up' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {ovr.purpose}
                    </span>
                </div>
            </div>

            {/* Guardian Info */}
            <div className="text-left mb-6">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Guardian Information</h4>
              <FormInputRegistration 
                label="Guardian Name"
                className='form-input-modal readOnly!'
                value={ovr.user_name || ""}
                readOnly={true}
              />
              <div className="flex gap-3 mt-4">
                <FormInputRegistration 
                  label="Type"
                  className='form-input-modal readOnly!'
                  value={ovr.is_registered_guardian ? "Registered Guardian" : "Guest / Manual Entry"}
                  readOnly={true}
                />
                <FormInputRegistration 
                  label="Time Requested"
                  className='form-input-modal readOnly!'
                  value={formattedDate}
                  readOnly={true}
                />
              </div>
            </div>

            {/* ID Photo Evidence */}
            <div className="text-left mb-2">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Identity Evidence</h4>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Captured ID / Photo</span>
                {evidenceUrl ? (
                  <div 
                    className="w-full h-48 rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in relative group bg-slate-50"
                    onClick={() => setViewImage(evidenceUrl)}
                  >
                    <img src={evidenceUrl} alt="ID Evidence" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center text-white">
                        <span className="material-symbols-outlined text-[32px]">zoom_in</span>
                        <span className="text-xs font-bold">Click to Inspect</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-32 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-[11px] text-slate-400 border border-slate-200 border-dashed">
                    <span className="material-symbols-outlined mb-1 text-slate-300 text-[24px]">no_photography</span>
                    No ID Photo Provided
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-modal close" onClick={isClose}>Close</button>
            <div className="flex-1"></div>
            <button className="btn-modal reject" onClick={triggerReject}>
              <span className="material-symbols-outlined text-[18px]">block</span>
              Discard
            </button>
            <button className="btn-modal approve" onClick={triggerApprove}>
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Approve
            </button>
          </div>
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
    </>,
    document.body
  );
}