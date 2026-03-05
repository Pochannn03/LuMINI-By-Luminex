import React, { useState } from 'react';
import { createPortal } from "react-dom";
import axios from 'axios';
import '../../../../styles/super-admin/class-management.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function AccountsDeleteModal({ isOpen, onClose, account, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // <-- NEW: Error state

  if (!isOpen || !account) return null;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(""); // Clear old errors
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/users/archive/${account._id}`, 
        {},
        { withCredentials: true }
      );
      
      // Pass the success message up to trigger the SuccessModal
      onSuccess(response.data.msg || "Account successfully archived.");
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.msg || "Error deleting account. Please try again."); // <-- Removed alert
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined red-icon text-[24px]">warning</span>
            <h2 className="text-cdark text-[18px] font-bold">Delete Account</h2>
          </div>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 bg-[#fee2e2] rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ef4444] text-[32px]">delete_forever</span>
            </div>
            
            <div>
              <h3 className="text-cdark font-bold text-[16px]">Are you sure?</h3>
              <p className="text-cgray text-[14px] mt-1">
                You are about to Archive <strong>@{account.username}</strong>. 
              </p>
            </div>
          </div>
        </div>

        {/* INLINE ERROR DISPLAY */}
        {errorMsg && (
          <div className="px-6 pb-2">
            <div className="p-3 bg-red-50 text-red-600 text-[13px] rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="modal-footer">
          <button 
            onClick={onClose} 
            className="btn-cancel"
          >
            Cancel
          </button>
          
          <button 
            onClick={handleDelete} 
            disabled={loading}
            className="btn-danger"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}