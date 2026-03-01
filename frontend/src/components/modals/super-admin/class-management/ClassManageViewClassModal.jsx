import React from "react";
import { createPortal } from "react-dom";

// --- ADDED HELPER ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'User'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};
// --------------------

export default function ClassManageViewClassModal({ isOpen, onClose, classData }) {
  if (!isOpen || !classData) return null;

  // --- UPDATED TEACHER EXTRACTION ---
  const teacherName = classData.user_details 
    ? `${classData.user_details.first_name} ${classData.user_details.last_name}`
    : "No teacher assigned";
    
  const teacherPhoto = classData.user_details?.profile_picture;
  const teacherFirstName = classData.user_details?.first_name;
  // ----------------------------------

  // Safely extract students list
  const students = classData.student_details || [];

  return createPortal(
    <div className="modal-overlay active flex justify-center items-center p-4 z-[9999]" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-[500px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* --- HEADER --- */}
        <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-5 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white">
          <div className="flex flex-col pr-4">
            <h2 className="text-[24px] font-extrabold text-[#1e293b] leading-tight mb-2">
              Section {classData.section_name}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                classData.class_schedule === 'Morning' 
                  ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}>
                {classData.class_schedule} Session
              </span>
              <span className="px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-md text-[11px] font-bold tracking-wide">
                Capacity: {students.length} / {classData.max_capacity}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-500 transition-colors shrink-0 mt-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* --- SCROLLABLE BODY --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          <style>
            {`
              .custom-scrollbar::-webkit-scrollbar { width: 5px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
            `}
          </style>

          <div className="px-6 sm:px-8 py-6 flex flex-col gap-5">
            
            {/* CARD 1: CLASS DETAILS */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
              <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#cbd5e1]">info</span> 
                Class Information
              </h4>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  {/* --- UPDATED TEACHER PHOTO DISPLAY --- */}
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-slate-100">
                    <img 
                      src={getImageUrl(teacherPhoto, teacherFirstName)} 
                      alt={teacherFirstName || "Teacher"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#64748b] font-semibold uppercase tracking-wider">Adviser</span>
                    <span className="text-[#1e293b] font-bold text-[15px] leading-tight">{teacherName}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[#64748b] font-semibold uppercase tracking-wider ml-1">Description</span>
                  <p className="text-[13px] text-[#475569] leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-slate-100 italic">
                    "{classData.description || "No description provided for this class."}"
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: ENROLLED STUDENTS */}
            <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
              <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#cbd5e1]">groups</span> 
                Enrolled Students ({students.length})
              </h4>
              
              {students.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {students.map((student, index) => (
                    <div key={student._id || index} className="flex items-center gap-3 py-2.5 px-3 hover:bg-[#f8fafc] rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm group-hover:shadow-md transition-shadow bg-slate-100">
                        <img 
                          src={getImageUrl(student.profile_picture, student.first_name)} 
                          alt={student.first_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#1e293b] group-hover:text-[#2563eb] transition-colors">
                          {student.first_name} {student.last_name}
                        </span>
                        <span className="text-[11px] font-medium text-[#64748b] tracking-wide">
                          ID: {student.student_id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#f8fafc] rounded-xl border border-slate-100 border-dashed">
                  <span className="material-symbols-outlined text-[32px] text-slate-300 mb-2">person_off</span>
                  <p className="text-[13px] font-medium text-slate-500">No students enrolled yet.</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="px-6 py-5 sm:px-8 shrink-0 bg-white border-t border-slate-100 flex justify-end">
          <button 
            className="bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[14px]"
            onClick={onClose}
          >
            Done
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}