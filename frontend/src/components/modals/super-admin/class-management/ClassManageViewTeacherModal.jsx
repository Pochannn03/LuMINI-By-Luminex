import React from "react";
import { createPortal } from "react-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'Teacher'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function ClassManageViewTeacherModal({ isOpen, onClose, teacherData, classes }) {
  if (!isOpen || !teacherData) return null;

  const photoUrl = getImageUrl(teacherData.profile_picture, teacherData.first_name);
  
  // Dynamically find all sections handled by this teacher
  const assignedSections = classes.filter(c => c.user_id === teacherData.user_id);

  // Address formatter
  const formatAddress = () => {
    const parts = [
      teacherData.houseUnit, 
      teacherData.street, 
      teacherData.barangay, 
      teacherData.city, 
      teacherData.zipCode
    ].filter(Boolean); // removes empty strings/undefined
    
    return parts.length > 0 ? parts.join(", ") : teacherData.address || "No address provided";
  };

  return createPortal(
    <div className="modal-overlay active flex justify-center items-center p-4 z-[9999]" onClick={onClose}>
      {/* Click propagation stopped so clicking inside modal doesn't close it */}
      <div 
        className="bg-white rounded-3xl w-full max-w-lg relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* --- CLOSE BUTTON (Top Right) --- */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-200 text-slate-500 transition-colors z-10"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="p-6 sm:p-8">
          
          {/* --- HERO / AVATAR SECTION --- */}
          <div className="flex flex-col items-center mb-8 pt-2">
            <img 
              src={photoUrl} 
              alt="Teacher Profile" 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-md object-cover bg-slate-100 mb-4"
            />
            <h2 className="text-2xl font-bold text-slate-800">
              {teacherData.first_name} {teacherData.last_name}
            </h2>
            
            {/* --- THE FIX: Perfectly sized and aligned badges using fixed heights (h-8) --- */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="h-8 px-3 bg-slate-50 text-slate-600 rounded-lg text-[12px] font-bold flex items-center gap-1.5 border border-slate-200">
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>{teacherData.username}</span>
              </div>
              <div className="h-8 px-3 bg-blue-50 text-blue-600 rounded-lg text-[12px] font-bold flex items-center border border-blue-100">
                Faculty Member
              </div>
            </div>
            
          </div>

          {/* --- INFO BLOCKS --- */}
          <div className="flex flex-col gap-4">
            
            {/* 1. Handled Sections Block */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">meeting_room</span> 
                Assigned Classes
              </h4>
              {assignedSections.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedSections.map(sec => (
                    <div key={sec.section_id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      <span className="font-bold text-blue-600 text-[13px]">{sec.section_name}</span>
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 rounded font-medium">{sec.class_schedule}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] font-medium text-slate-500 italic">No classes assigned yet.</p>
              )}
            </div>

            {/* 2. Contact Details Block */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">contact_page</span> 
                Contact Information
              </h4>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-bold text-slate-800 break-all">{teacherData.email}</span>
                </div>
                <div className="flex justify-between items-center text-[13px] border-t border-dashed border-slate-200 pt-2">
                  <span className="text-slate-500 font-medium">Phone:</span>
                  <span className="font-bold text-slate-800">{teacherData.phone_number}</span>
                </div>
              </div>
            </div>

            {/* 3. Address Block */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">location_on</span> 
                Home Address
              </h4>
              <p className="text-[13px] font-bold text-slate-800 leading-relaxed">
                {formatAddress()}
              </p>
            </div>

          </div>

          {/* --- FOOTER BUTTON --- */}
          <div className="mt-6 flex justify-end">
            <button 
              className="bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md active:scale-95 text-[14px]"
              onClick={onClose}
            >
              Done
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}