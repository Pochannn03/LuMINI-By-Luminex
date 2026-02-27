import React, { useState } from "react";
import { createPortal } from 'react-dom';
import axios from 'axios';
import FormInputRegistration from '../../../FormInputRegistration';
import AdminConfirmModal from '../../super-admin/SuperadminConfirmationModal'; 

export function DashboardReviewOverrideModal({ onView, isClose, ovr, onSuccess }) {
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {}
  });

  const [viewImage, setViewImage] = useState(null);

  const requesterFullName = ovr.requester_details 
    ? `${ovr.requester_details.first_name} ${ovr.requester_details.last_name}`
    : "System/Unknown Staff";

  if (!onView || !ovr) return null;

  const getImageUrl = (path) => {
    if (!path) return null;
    return `http://localhost:3000/${path.replace(/\\/g, "/")}`;
  };

  const evidenceUrl = getImageUrl(ovr.id_photo_evidence);
  const formattedDate = new Date(ovr.created_at).toLocaleDateString();

  const handleApproveAction = async () => {
    try {
      const { data } = await axios.patch(
        `http://localhost:3000/api/transfer/override/${ovr._id}/approve`, 
        {}, 
        { withCredentials: true }
      );

      if (data.success) {
        if (typeof onSuccess === 'function') onSuccess(data.msg);
        if (typeof isClose === 'function') isClose();
      }
    } catch (err) {
      console.error("Approval Error:", err);
      alert(err.response?.data?.error || err.response?.data?.msg || "Approval failed");
    } finally {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRejectAction = async () => {
    try {
      // 1. Calls your updated endpoint
      const { data } = await axios.patch(
        `http://localhost:3000/api/transfer/override/${ovr._id}/reject`, 
        {}, 
        { withCredentials: true }
      );

      if (data.success) {
        // 2. Triggers the SuccessModal in the Dashboard
        if (typeof onSuccess === 'function') onSuccess(data.msg);
        
        // 3. Closes this Review Modal
        if (typeof isClose === 'function') isClose();
      }
    } catch (err) {
      console.error("Rejection Error:", err);
      // Standardizing error message extraction
      const errorMsg = err.response?.data?.error || err.response?.data?.msg || "Rejection failed";
      alert(errorMsg);
    } finally {
      // 4. Closes the AdminConfirmModal
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }
  };

  const triggerApprove = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Confirm Manual Transfer",
      message: `Are you sure you want to record this ${ovr.purpose} for ${ovr.student_details?.first_name}?`,
      confirmText: "Yes, Approve",
      type: "info",
      onConfirm: handleApproveAction // Pointing directly to the approve handler
    });
  };

  const triggerReject = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Discard Transfer Record",
      message: `This will mark the manual transfer for ${ovr.student_details?.first_name} as invalid.`,
      confirmText: "Discard Record",
      type: "danger",
      onConfirm: handleRejectAction // Pointing directly to the reject handler
    });
  };

  return createPortal(
    <>
      {viewImage && (
        <div 
          className="fixed inset-0 z-999999 bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-6 cursor-zoom-out"
          onClick={() => setViewImage(null)}
        >
          <img 
            src={viewImage} 
            alt="Evidence Full View" 
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl border-4 border-white/20 object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
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

          <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar text-center">
            {/* Header: Student Name & Purpose (Smiley container removed) */}
            <div className="mb-6">
              <h3 className="text-[22px] font-bold text-cdark">
                {ovr.student_details?.first_name} {ovr.student_details?.last_name}
              </h3>
              <p className="text-cgray text-[13px] font-bold uppercase tracking-[2px] mt-1">
                {ovr.purpose}
              </p>
            </div>

            {/* Guardian & Requestor Information */}
            <div className="text-left mb-5">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Guardian Details</h4>
              <FormInputRegistration 
                label="Guardian Name"
                className='form-input-modal readOnly!'
                value={ovr.user_name || ""}
                readOnly={true}
              />
              <div className="flex gap-3 mt-4">
                <FormInputRegistration 
                  label="Guardian Type"
                  className='form-input-modal readOnly!'
                  value={ovr.is_registered_guardian ? "Registered" : "Guest (Unauthorized)"}
                  readOnly={true}
                />
                <FormInputRegistration 
                  label="Date Requested"
                  className='form-input-modal readOnly!'
                  value={formattedDate}
                  readOnly={true}
                />
              </div>

              {/* NEW: Requesting Teacher Section */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <FormInputRegistration 
                  label="Requested By (Staff/Teacher)"
                  className='form-input-modal readOnly! font-bold!'
                  value={requesterFullName}
                  readOnly={true}
                />
              </div>
            </div>

            {/* Identity Verification Documents */}
            <div className="text-left mb-2">
              <h4 className="text-cprimary-blue text-[12px] mb-3 font-bold uppercase tracking-wider">Verification Evidence</h4>
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Provided ID Photo</span>
                  {evidenceUrl ? (
                    <div 
                      className="w-full h-32 rounded-xl border border-slate-200 overflow-hidden cursor-zoom-in relative group bg-slate-50"
                      onClick={() => setViewImage(evidenceUrl)}
                    >
                      <img src={evidenceUrl} alt="ID Photo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-[24px]">zoom_in</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-[11px] text-slate-400 border border-slate-200 border-dashed">
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