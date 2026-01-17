import React from "react";
import { Link } from 'react-router-dom';

export default function ClassManageEditTeacherModal() {
  return (
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined orange-icon text-[24px]">manage_accounts</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Teacher Profile</h2>
            </div>
          </div>

          <div className="modal-body">
            <input type="hidden" id="editTeacherId" />

            <div className="flex flex-col gap-2">
              <label htmlFor="editTeacherFirst" className="text-cgray text-[13px] font-medium">Full Name</label>
              <div className="flex gap-2.5">
                <input type="text" id="editTeacherFirst" placeholder="First Name" className="form-input-modal "/>
                <input type="text" id="editTeacherLast" placeholder="Last Name" className="form-input-modal" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="editTeacherFirst" className="text-cgray text-[13px] font-medium">Full Name</label>
              <input type="email" id="editTeacherEmail" placeholder="Email Address" className="form-input-modal "/>
              <input type="text" id="editTeacherPhone" placeholder="Phone Number" className="form-input-modal mt-2" />
            </div>

            <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
              <span className="material-symbols-outlined orange-icon">lock</span>
              <h3 className="text-cdark text-[16px] font-semibold">Login Credentials</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Username</label>
              <input type="text" id="editTeacherUsername" class="form-input-modal" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Password</label>
              <input type="password" id="editTeacherPassword" class="form-input-modal" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" id="closeEditTeacherBtn">Cancel</button>
            <button class="btn-save" id="saveTeacherChangesBtn">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}