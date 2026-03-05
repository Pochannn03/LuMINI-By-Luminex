import React, { useState } from "react";
import axios from 'axios';
import { createPortal } from "react-dom";
import WarningModal from '../../../WarningModal'; // <-- Replaced alert() with your WarningModal

export default function ClassManageDeleteClassModal({ isOpen, onClose, classData, onSuccess }) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- WARNING MODAL STATE ---
  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  if (!isOpen || !classData) return null;

  // Reset input when modal opens/closes
  const handleClose = () => {
    setConfirmationInput("");
    onClose();
  };

  const handleDelete = async (e) => {
    if (e) e.preventDefault();

    if (confirmationInput.trim() !== "Confirm") {
      setWarningConfig({
        isOpen: true,
        title: "Action Required",
        message: "Please type 'Confirm' (case-sensitive) to proceed with the deletion."
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`http://localhost:3000/api/sections/archive/${classData._id}`, {}, {
        withCredentials: true
      });

      if (response.data.success) {
        onSuccess(response.data.msg); 
        handleClose();
      }
    } catch (error) {
      console.error("Delete failed:", error);
      setWarningConfig({
        isOpen: true,
        title: "Delete Failed",
        message: error.response?.data?.msg || "Failed to delete class. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = confirmationInput.trim() === "Confirm";
  const className = `Kinder - ${classData.section_name || 'Class'}`;

  return createPortal(
    <>
      <WarningModal 
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })}
        title={warningConfig.title}
        message={warningConfig.message}
      />

      <div className="modal-overlay active flex justify-center items-center p-4 z-[9995]" id="deleteClassModal" onClick={handleClose}>
        <form 
          className="bg-white rounded-3xl w-full max-w-[480px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col" 
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleDelete}
        >
          <div className="p-6 sm:p-8">
            
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ef4444] text-[26px]">warning</span>
                <h2 className="text-[20px] font-extrabold text-[#1e293b]">Delete Class</h2>
              </div>
              <button 
                type="button"
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-500 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* --- BODY --- */}
            <div className="flex flex-col mb-6">
              <p className="text-[14.5px] text-[#475569] leading-relaxed mb-4">
                Are you sure you want to delete <strong>{className}</strong>? This will remove the class, archive all enrolled students, and disconnect the assigned teacher.
              </p>
              
              {/* Alert Block */}
              <div className="bg-[#fef2f2] text-[#dc2626] px-4 py-3 rounded-xl text-[13px] font-bold flex items-center gap-2 mb-6 border border-[#fca5a5]">
                <span className="material-symbols-outlined text-[18px]">error</span>
                This action cannot be undone.
              </div>

              {/* Input logic */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#64748b] tracking-wide uppercase">
                  Type "Confirm" to proceed
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[#1e293b] text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:bg-white transition-all placeholder:font-normal placeholder:text-slate-400" 
                  placeholder="Type 'Confirm'"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* --- FOOTER BUTTONS --- */}
            <div className="mt-2 pt-6 border-t border-slate-100 flex gap-4 w-full">
              <button 
                type="button" 
                className="flex-1 bg-white border-2 border-[#cbd5e1] text-[#64748b] hover:bg-[#f8fafc] hover:text-[#475569] font-bold py-2.5 rounded-xl transition-all active:scale-95 text-[14px] flex justify-center items-center" 
                onClick={handleClose}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={`flex-1 font-bold py-2.5 rounded-xl transition-all shadow-sm text-[14px] flex justify-center items-center ${
                  isConfirmed 
                    ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white active:scale-95' 
                    : 'bg-[#fca5a5] text-white cursor-not-allowed'
                }`}
                disabled={loading || !isConfirmed}
              >
                {loading ? "Deleting..." : "Delete Class"}
              </button>
            </div>

          </div>
        </form>
      </div>
    </>,
    document.body
  );
}