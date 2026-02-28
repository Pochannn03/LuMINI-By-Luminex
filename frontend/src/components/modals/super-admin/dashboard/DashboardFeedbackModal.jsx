import React from "react";
import { createPortal } from "react-dom";

export default function DashboardFeedbackModal({ isOpen, onClose, feedback }) {
  if (!isOpen || !feedback) return null;

  const isPositive = feedback.rating === 'up';

  return createPortal(
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container max-w-[450px]" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header border-b-0 pb-0">
           <div className="flex flex-col items-center w-full gap-2">
              {/* Added mt-6 for icon margin-top */}
              <div className={`${isPositive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} w-16 h-16 rounded-full flex items-center justify-center mt-6`}>
                <span className="material-symbols-outlined text-[32px] fill-1">
                   {isPositive ? "thumb_up" : "thumb_down"}
                </span>
              </div>
              <h2 className="text-cdark text-[22px] font-bold">Feedback Detail</h2>
           </div>
        </div>

        <div className="modal-body mt-6 px-8">
          {/* Section: Submitted By (Text Left) */}
          <div className="text-left mb-6">
            <p className="text-slate-400 text-[11px]! uppercase tracking-widest font-bold mb-1">
              Submitted by
            </p>
            <p className="text-cdark font-bold text-[18px]!">
              {feedback.user_name || "Anonymous Parent"}
            </p>
          </div>
          
          {/* Section: Remark (Text Left) */}
          <div className="text-left">
            <p className="text-slate-400 text-[11px]! uppercase tracking-widest font-bold mb-1">
              Feedback Details
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-cdark text-[15px]! leading-relaxed whitespace-pre-wrap">
                "{feedback.remark || "No remarks provided."}"
                </p>
            </div>
          </div>

          <p className="text-center text-slate-400 text-[11px]! mt-6">
            Received: {feedback.time || "Today"}
          </p>
        </div>

        <div className="modal-footer border-t-0 p-8 pt-2">
          <button className="btn-save w-full h-12! rounded-xl!" onClick={onClose}>
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}