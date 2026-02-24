import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import FormInputRegistration from '../../../../FormInputRegistration';
import ConfirmModal from "../../../../ConfirmModal";

export default function ParentAbsenceModal({ isOpen, onClose, onSuccess }) {
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDetails("");
      setError(null);
    }
  }, [isOpen]);

  const handleAttemptSubmit = (e) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleFinalConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:3000/api/attendance/absence', 
        { 
          details,
          date: new Date().toISOString() 
        }, 
        { withCredentials: true }
      );

      if (onSuccess) {
        onSuccess("Absence reported to teacher.");
      }
      onClose();

    } catch (err) {
      console.error("Absence Report Error:", err);
      setError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setLoading(false);
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
          <p className="text-cgray text-[14px] mb-2 text-left">
            Please let the teacher know why the student is unable to attend today.
          </p>
          
          <div className="flex flex-col gap-4 text-left">

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
        message="Are you sure you want to report this absence? Please remember to communicate further with the teacher regarding any missed lessons or requirements."
        confirmText="Confirm Report"
        isDestructive={false}
      />
      
    </div>,
    document.body
  );
}