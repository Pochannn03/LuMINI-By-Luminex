import React, { useState } from "react";
import axios from 'axios';
import { createPortal } from "react-dom";
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css'; // Reusing styles

export default function ClassManageDeleteTeacherModal({ isOpen, onClose, teacherData, onSuccess }) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !teacherData) return null;

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
      // Assuming Teachers are in the 'users' collection
      await axios.put(`http://localhost:3000/api/teacher/archive/${teacherData._id}`, {}, {
        withCredentials: true
      });

      alert("Teacher account deleted successfully.");
      if (onSuccess) onSuccess(); 
      handleClose();

    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete teacher. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = confirmationInput.trim() === "Confirm";
  const teacherName = `${teacherData.first_name} ${teacherData.last_name}`;

  return createPortal(
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay active" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined red-icon text-[24px]">warning</span>
              <h2 className="text-cdark text-[18px] font-bold">Delete Teacher Account</h2>
            </div>
          </div>

          <div className="modal-body">
            <p className="text-cgray text-[14px] leading-normal">
              Are you sure you want to delete this <strong>{teacherName}</strong>? This action will
              remove their profile and access immediately.
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

          <div class="modal-footer">
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
              {loading ? "Deleting..." : "Delete Teacher"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}