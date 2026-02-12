import React from "react";
import { createPortal } from "react-dom";

/**
 * ATTENDANCE SUCCESS MODAL
 * Usage: Triggered after a successful QR scan to mark attendance.
 */
export default function AttendanceSuccessModal({ isOpen, onClose, studentData }) {
  // Guard clause: If not open or no data, don't render
  if (!isOpen || !studentData) return null;

  const fullName = `${studentData.first_name || ''} ${studentData.last_name || ''}`;
  const photoUrl = studentData.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`;

  return createPortal(
    <>
      {/* Uses the same overlay and container structure as your Delete Modal */}
      <div className="modal-overlay active" onClick={onClose}>
        <div 
          className="modal-container text-center" 
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '400px' }} 
        >
          <div className="modal-header justify-center">
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="bg-green-100 p-3 rounded-full mb-2">
                <span className="material-symbols-outlined text-green-600 text-[40px] leading-none">
                  check_circle
                </span>
              </div>
              <h2 className="text-cdark text-[22px] font-bold">Attendance Marked!</h2>
            </div>
          </div>

          <div className="modal-body flex flex-col items-center gap-4 py-6">
            {/* Student Profile Identity for Verification */}
            <img 
              src={photoUrl} 
              className="w-[120px] h-[120px] rounded-full object-cover border-4 border-green-50 shadow-md" 
              alt="Student"
            />
            
            <div className="flex flex-col gap-1">
              <h3 className="text-cdark text-[18px] font-bold">{fullName}</h3>
              <span className="text-cprimary-blue bg-[#e0f2fe] py-1 px-3 rounded-[20px] text-xs font-bold self-center">
                ID: {studentData.student_id}
              </span>
            </div>

            <p className="text-cgray text-[14px] leading-normal px-4">
              Student has been successfully recorded as <strong>Present</strong> for today.
            </p>
          </div>

          <div className="modal-footer justify-center pb-6">
            <button 
              className="btn-save w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95" 
              onClick={onClose}
            >
              Scan Next Student
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}