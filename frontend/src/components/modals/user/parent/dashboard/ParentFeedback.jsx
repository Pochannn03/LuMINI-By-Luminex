import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import FormInputRegistration from '../../../../FormInputRegistration';

export default function ParentFeedbackModal({ isOpen, onClose, onSuccess }) {
  const [remark, setRemark] = useState("");
  const [satisfaction, setSatisfaction] = useState(null); // 'up' or 'down'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRemark("");
      setSatisfaction(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Require at least a thumb selection or a remark
    if (!satisfaction) {
      setError("Please select a satisfaction rating.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:3000/api/feedback', 
        { 
          remark, 
          rating: satisfaction
        }, 
        { withCredentials: true }
      );

      if (onSuccess) {
        onSuccess("Feedback submitted! Thank you.");
      }
      onClose();

    } catch (err) {
      console.error("Feedback Error:", err);
      setError(err.response?.data?.error || "Failed to submit feedback.");
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
        onSubmit={handleSubmit}
        style={{ maxWidth: '450px' }}
      >
        <div className="modal-header">
          <div className="flex justify-center gap-2.5">
            <span className="material-symbols-outlined blue-icon text-[24px] mt-2">rate_review</span>
            <h2 className="text-cdark text-[24px] font-bold mt-0.5">Daily Feedback</h2>
          </div>
        </div>
    
        <div className="modal-body text-center">
          <p className="text-cgray text-[14px] mb-3 text-left">How was the process today? Let us know your thoughts.</p>
          
          {/* SATISFACTION METER */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 border-2 
                  ${satisfaction === 'up' 
                    ? 'bg-[#e0f2fe] border-[#39a8ed] scale-110 shadow-md' 
                    : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                onClick={() => setSatisfaction('up')}
              >
                <span className={`material-symbols-outlined text-[32px] ${satisfaction === 'up' ? 'text-[#39a8ed] fill-1' : 'text-slate-400'}`}>
                  thumb_up
                </span>
              </button>
              <span className={`text-[12px] font-bold uppercase tracking-wider ${satisfaction === 'up' ? 'text-[#39a8ed]' : 'text-slate-400'}`}>
                Great
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 border-2 
                  ${satisfaction === 'down' 
                    ? 'bg-[#fef2f2] border-[#ef4444] scale-110 shadow-md' 
                    : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                onClick={() => setSatisfaction('down')}
              >
                <span className={`material-symbols-outlined text-[32px] ${satisfaction === 'down' ? 'text-[#ef4444] fill-1' : 'text-slate-400'}`}>
                  thumb_down
                </span>
              </button>
              <span className={`text-[12px] font-bold uppercase tracking-wider ${satisfaction === 'down' ? 'text-[#ef4444]' : 'text-slate-400'}`}>
                Poor
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-left">
            <FormInputRegistration
              label="Additional Remarks (Optional)"
              name="remark"
              type="textarea"
              value={remark}
              onChange={(e) => {
                setRemark(e.target.value);
                if(error) setError(null);
              }}
              placeholder="Tell us more about your experience..."
              rows={4}
              error={error}
              required={false}
              className="form-input-modal"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>Skip for now</button>
          <button className="btn-save" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}