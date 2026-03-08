import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import FormInputRegistration from '../../../../FormInputRegistration';
import ConfirmModal from "../../../../ConfirmModal";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ParentAbsenceModal({ isOpen, onClose, onSuccess, studentId }) {
  const [reason, setReason] = useState(""); 
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- CUSTOM DROPDOWN STATE ---
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const reasonRef = useRef(null);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (reasonRef.current && !reasonRef.current.contains(event.target)) setIsReasonOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDetails("");
      setError(null);
      setIsReasonOpen(false);
    }
  }, [isOpen]);

  const handleAttemptSubmit = (e) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason for the absence.");
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/attendance/absence`, 
        { reason, details, student_id: studentId, date: new Date().toISOString() }, 
        { withCredentials: true }
      );
      if (response.data.success) {
        if (onSuccess) onSuccess("Absence reported to teacher.");
        onClose();
      }
    } catch (err) {
      console.error("Absence Report Error:", err);
      setError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  };

  const reasonOptions = [
    { value: "Sick", label: "Sick / Medical Issue" },
    { value: "Family Emergency", label: "Family Emergency" },
    { value: "Travel", label: "Travel / Personal" },
    { value: "Weather", label: "Inclement Weather" },
    { value: "Other", label: "Other" },
  ];

  const getReasonLabel = (value) => reasonOptions.find(r => r.value === value)?.label || 'Select a reason...';

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay active" onClick={onClose}>
      <form 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        onSubmit={handleAttemptSubmit}
        style={{ maxWidth: '450px' }}
      >
        <div className="modal-header">
          <div className="flex justify-center gap-2.5">
            <span className="material-symbols-outlined text-red-500 text-[24px] mt-2">event_busy</span>
            <h2 className="text-cdark text-[24px] font-bold mt-0.5">Report Absence</h2>
          </div>
        </div>
    
        <div className="modal-body">
          <p className="text-cgray! text-[14px]! mb-4 text-left">
            Please let the teacher know why the student is unable to attend today.
          </p>
          
          <div className="flex flex-col gap-4 text-left">
            <div className="form-group">
              <label className="text-[14px] font-bold text-cdark mb-1 block">Reason for Absence</label>

              {/* CUSTOM REASON DROPDOWN */}
              <div className="relative" ref={reasonRef}>
                <button
                  type="button"
                  onClick={() => setIsReasonOpen(!isReasonOpen)}
                  className={`flex items-center justify-between w-full h-[42px] px-3 rounded-xl border bg-slate-50 text-[13px] font-medium transition-all focus:outline-none ${
                    error && !reason
                      ? 'border-red-500 bg-red-50'
                      : isReasonOpen
                      ? 'border-[var(--brand-blue)] ring-2 ring-blue-500/10 bg-white'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={reason ? 'text-slate-800' : 'text-slate-400'}>
                    {getReasonLabel(reason)}
                  </span>
                  <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 ${isReasonOpen ? 'rotate-180 text-[var(--brand-blue)]' : ''}`}>
                    expand_more
                  </span>
                </button>

                {isReasonOpen && (
                  <div className="absolute top-[46px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                    {reasonOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)] transition-colors"
                        onClick={() => { setReason(opt.value); setError(null); setIsReasonOpen(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && !reason && (
                <p className="text-red-500! text-[11px]! mt-1 ml-1">{error}</p>
              )}
            </div>

            <FormInputRegistration
              label="Additional Details"
              name="details"
              type="textarea"
              value={details}
              onChange={(e) => { setDetails(e.target.value); if (error) setError(null); }}
              placeholder="Provide more information (e.g., 'High fever since last night')..."
              rows={3}
              error={error && reason ? error : null}
              required={false}
              className="form-input-modal"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-save bg-red-500 hover:bg-red-600 border-none" type="submit" disabled={loading}>
            {loading ? "Reporting..." : "Submit Report"}
          </button>
        </div>
      </form>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleFinalConfirm}
        title="Confirm Absence Report"
        message="Are you sure you want to report this absence? This will update the attendance record and notify the teacher immediately."
        confirmText="Confirm Report"
        isDestructive={true}
      />
    </div>,
    document.body
  );
}