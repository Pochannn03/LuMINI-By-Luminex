import React from "react";
import { Link } from 'react-router-dom';

export default function ClassManageDeleteClassModal() {
  return (
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined red-icon text-[24px]">warning</span>
              <h2 className="text-cdark text-[18px] font-bold">Delete Class</h2>
            </div>
          </div>

          <div className="modal-body">
            <p className="text-cgray text-[14px] leading-normal">
              Are you sure you want to delete this class? This will remove the
              class and disconnect the assigned teacher.
            </p>
            <strong>This cannot be undone.</strong>

            <div className="flex flex-col gap-2">
              <label htmlFor="" className="text-cgray text-[13px] font-medium"> Type "Confirm to proceed"</label>
              <input type="text" id="deleteClassConfirmationInput" className="form-input-modal" placeholder="Type 'Confirm'"
              />
            </div>

            <input type="hidden" id="deleteTeacherId" />
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" id="cancelDeleteTeacherBtn">Cancel</button>
            <button class="btn-danger" id="confirmDeleteTeacherBtn">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}