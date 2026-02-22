import React from "react";
import { createPortal } from "react-dom";
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-student-modal.css'

export default function AdminConfirmPickUpAuth({ isOpen, onClose, data, onConfirm }) {
  
  if (!isOpen || !data) return null;

  const defaultImg = "https://via.placeholder.com/100";
  
  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="bg-(--white) p-6 rounded-2xl shadow-xl w-full max-w-[500px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined blue-icon">qr_code_scanner</span>
              <h3 className="font-bold text-lg">Confirm Pick Up / Drop Off?</h3> {/* Will Change this soon */}
            </div>
            <button className="close-modal-ur" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="modal-body">
            <p className="text-[#64748b] mb-6">Verify that the guardian matches the photo below</p>

            <div className="flex flex-row justify-center gap-[30px] mb-[30px]">
              <div className="flex flex-col items-center gap-2.5">
                <img 
                  src={data.guardian?.photo || defaultImg} 
                  className="w-[100px] h-[100px] rounded-full object-cover border-[3px] border-amber-500 shadow-md" 
                />
                <div className="text-center">
                  <span className="block text-[12px] text-[#94a3b8] font-semibold uppercase">
                    {data.guardian?.relation || "User"}
                  </span>
                  <span className="font-bold text-[#1e293b] text-sm block max-w-[120px] truncate">
                    {data.guardian?.name || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="w-px bg-[#e2e8f0]"></div>

              <div className="flex flex-col items-center gap-2.5">
                <img 
                  src={data.student?.photo || defaultImg} 
                  className="w-[100px] h-[100px] rounded-full object-cover border-[3px] border-blue-500 shadow-md" 
                />
                <div className="text-center">
                  <span className="block text-[12px] text-[#94a3b8] font-semibold uppercase">Student</span>
                  <span className="font-bold text-[#1e293b] text-sm block max-w-[120px] truncate">
                    {data.student?.name || "Unknown"}
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    {data.student?.section || ""}
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={onConfirm}>
              <span class="material-symbols-outlined">check_circle</span>
              Authorize
            </button>

            <button  className="btn btn-cancel flex-1 h-12 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold" onClick={onClose} >
              Deny & Cancel
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}