import React, { useState } from 'react';
import { createPortal } from "react-dom";
import axios from 'axios';
import '../../../../styles/super-admin/class-management.css';

export default function AccountsDeleteModal({ isOpen, onClose, account, onSuccess }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !account) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await axios.put(
        `http://localhost:3000/api/users/archive/${account._id}`, 
        {},
        { withCredentials: true }
      );
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error deleting account.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay active" onClick={onClose}>
      {/* ✅ Standard modal container (defaults to 400px width in your CSS, which is perfect for alerts) */}
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
          {/* Centered Warning Icon & Text */}
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 bg-[#fee2e2] rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ef4444] text-[32px]">delete_forever</span>
            </div>
            
            <div>
              <h3 className="text-cdark font-bold text-[16px]">Are you sure?</h3>
              <p className="text-cgray text-[14px] mt-1">
                You are about to delete <strong>@{account.username}</strong>. 
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button 
            onClick={onClose} 
            className="btn-cancel"
          >
            Cancel
          </button>
          
          {/* ✅ Uses .btn-danger from your index.css */}
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