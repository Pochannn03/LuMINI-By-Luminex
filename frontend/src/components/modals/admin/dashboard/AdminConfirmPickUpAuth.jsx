import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-student-modal.css'

export default function AdminConfirmPickUpAuth({ isOpen, onClose }) {
  
  if (!isOpen) return null;
  
  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="bg=(--white) p-6 rounded-2xl shadow-xl w-[90%] max-w-[500px] relative overflow-hidden">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <h3 className="text-cdark text-[18px] font-bold">Confirm Pickup?</h3>
              <button class="close-modal-btn" id="closeAuthBtn">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div className="modal-body">
            <p className="text-[#64748b] mb-6">Verify that the guardian matches the photo below</p>

            <div className="flex flex-row justify-center gap-[30px] mb-[30px]">
              <div className="flex flex-col items-center gap-2.5">
                <img id="authParentImg" src="" className="w-[100px] g-[100px] rounded-[50%] object-cover border-[3px] border-amber-500" />
                <div>
                  <span className="block text-[12px] text-[#94a3b8] font-semibold uppercase">Guardian</span>
                  <span className="font-bold text-[#1e293b]">--</span>{/* Parent/Guardian Name */}
                </div>
              </div>

              <div className="w-px bg-[#e2e8f0]"></div>

              <div className="flex flex-col items-center gap-2.5">
                <img id="authStudentImg" src="" className="w-[100px] g-[100px] rounded-[50%] object-cover border-[3px] border-amber-500" />
                <div>
                  <span className="blox text-[12px] text-[#94a3b8] font-semibold uppercase">Student</span>
                  <span className="font-bold text-[#1e293b]">--</span>{/* Parent/Guardian Name */}
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary mb-3" type="button">
              <span class="material-symbols-outlined">check_circle</span>
              Authorize Pickup
            </button>
            <button className="btn btn-cancel" type="submit">
              Deny & Cancel
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}