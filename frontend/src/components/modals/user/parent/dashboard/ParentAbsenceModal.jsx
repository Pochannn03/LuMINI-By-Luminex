import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import FormInputRegistration from '../../../../FormInputRegistration';
import ConfirmModal from "../../../../ConfirmModal";

// Added dynamic backend URL support
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ParentAbsenceModal({ isOpen, onClose, onSuccess, studentId }) {
  const [reason, setReason] = useState(""); 
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDetails("");
      setError(null);
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
      // Updated to use dynamic BACKEND_URL
      const response = await axios.post(`${BACKEND_URL}/api/attendance/absence`, 
        { 
          reason,
          details,
          student_id: studentId,
          date: new Date().toISOString() 
        }, 
        { withCredentials: true }
      );

      if (response.data.success) {
        if (onSuccess) {
          onSuccess("Absence reported to teacher.");
        }
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
          <p className="text-cgray text-[14px] mb-4 text-left">
            Please let the teacher know why the student is unable to attend today.
          </p>
          
          <div className="flex flex-col gap-4 text-left">
            <div className="form-group">
              <label className="text-[14px] font-bold text-cdark mb-1 block">Reason for Absence</label>
              <select 
                className="form-input-modal w-full p-2 border rounded-lg text-[14px]"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                required
              >
                <option value="">Select a reason...</option>
                <option value="Sick">Sick / Medical Issue</option>
                <option value="Family Emergency">Family Emergency</option>
                <option value="Travel">Travel / Personal</option>
                <option value="Weather">Inclement Weather</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <FormInputRegistration
              label="Additional Details"
              name="details"
              type="textarea"
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                if(error) setError(null);
              }}
              placeholder="Provide more information (e.g., 'High fever since last night')..."
              rows={3}
              error={error}
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