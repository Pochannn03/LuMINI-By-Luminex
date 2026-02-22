import React, { useState } from "react";
import axios from 'axios';
import { createPortal } from "react-dom";
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css'; 

export default function ClassManageDeleteClassModal({ isOpen, onClose, classData, onSuccess }) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset input when modal opens/closes
  const handleClose = () => {
    setConfirmationInput("");
    onClose();
  };

  const handleDelete = async () => {
    if (confirmationInput.trim() !== "Confirm") {
      alert("Please type 'Confirm' to proceed.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`http://localhost:3000/api/sections/archive/${classData._id}`, {}, {
        withCredentials: true
      });

      if (response.data.success) {
        onSuccess(response.data.msg); 
      }
      handleClose();

    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete class. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = confirmationInput.trim() === "Confirm";

  if (!isOpen || !classData) return null;

  return createPortal(
    <>
      <div className="modal-overlay active" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined red-icon text-[24px]">warning</span>
              <h2 className="text-cdark text-[18px] font-bold">Delete Class</h2>
            </div>
          </div>

          <div className="modal-body">
            <p className="text-cgray text-[14px] leading-normal">
              Are you sure you want to delete this class? This will remove the
              class and disconnect the assigned teacher.
            </p>
            <strong>This cannot be undone.</strong>

            <div className="flex flex-col gap-2">
              <label htmlFor="" className="text-cgray text-[13px] font-medium"> Type "Confirm to proceed"</label>
              <input 
                type="text" 
                className="form-input-modal border-red-300 focus:border-red-500" 
                placeholder="Type 'Confirm'"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
              />
            </div>

            <input type="hidden" id="deleteTeacherId" />
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={handleClose}>Cancel</button>
            <button 
              className="btn-danger bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              onClick={handleDelete}
              disabled={loading || !isConfirmed}
              style={{ 
                opacity: !isConfirmed ? 0.5 : 1,
                pointerEvents: !isConfirmed ? 'none' : 'auto',
                cursor: !isConfirmed ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? "Deleting..." : "Delete Class"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}