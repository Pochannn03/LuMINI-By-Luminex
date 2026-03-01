import React from "react";
import { createPortal } from "react-dom";
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-student-modal.css'

const BACKEND_URL = "http://localhost:3000";

export default function AdminConfirmPickUpAuth({ isOpen, onClose, data, onConfirm }) {
  
  if (!isOpen || !data) return null;

  // Standard fallback image
  const defaultImg = "https://via.placeholder.com/100";

  // Helper to resolve image paths from the server
  const getImageUrl = (path) => {
    if (!path) return defaultImg;
    if (path.startsWith("http")) return path;
    // Standardize slashes for Windows/Linux paths
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };
  
  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-[500px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined blue-icon">qr_code_scanner</span>
              <h3 className="font-bold text-lg">
                Confirm {data.purpose === 'Drop off' ? 'Drop Off' : 'Pick Up'}?
              </h3>
            </div>
            <button className="close-modal-ur" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="modal-body">
            <p className="text-[#64748b] mb-6 text-center">
              Verify that the {data.guardian?.relation || 'person'} at the gate matches the records below.
            </p>

            <div className="flex flex-row justify-center gap-[30px] mb-[30px]">
              {/* GUARDIAN/PARENT SECTION */}
              <div className="flex flex-col items-center gap-2.5">
                <img 
                  src={getImageUrl(data.guardian?.photo)} 
                  className="w-[100px] h-[100px] rounded-full object-cover border-[3px] border-amber-500 shadow-md" 
                  alt="Guardian"
                  onError={(e) => { e.target.src = defaultImg; }}
                />
                <div className="text-center">
                  <span className="block text-[12px] text-[#94a3b8] font-semibold uppercase tracking-wider">
                    {data.guardian?.relation || "User"}
                  </span>
                  <span className="font-bold text-[#1e293b] text-sm block max-w-[120px] truncate">
                    {data.guardian?.name || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="w-px bg-[#e2e8f0]"></div>

              {/* STUDENT SECTION */}
              <div className="flex flex-col items-center gap-2.5">
                <img 
                  src={getImageUrl(data.student?.photo)} 
                  className="w-[100px] h-[100px] rounded-full object-cover border-[3px] border-blue-500 shadow-md" 
                  alt="Student"
                  onError={(e) => { e.target.src = defaultImg; }}
                />
                <div className="text-center">
                  <span className="block text-[12px] text-[#94a3b8] font-semibold uppercase tracking-wider">Student</span>
                  <span className="font-bold text-[#1e293b] text-sm block max-w-[120px] truncate">
                    {data.student?.name || "Unknown"}
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    Section {data.student?.sectionName || ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer flex gap-3">
            <button className="btn btn-primary flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-all shadow-md active:scale-95" onClick={onConfirm}>
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              Authorize
            </button>

            <button className="btn btn-cancel flex-1 h-12 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold transition-all border border-slate-100" onClick={onClose}>
              Deny & Cancel
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}