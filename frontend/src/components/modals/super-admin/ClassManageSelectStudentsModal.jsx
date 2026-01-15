import React from "react";
import { Link } from 'react-router-dom';
import '../../styles/super-admin/class-manage-modal/class-management-select-students-modal.css';

export default function ClassManageEditStudentModal() {
  return (
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">checklist</span>
              <div>
                <h2 className="text-cdark text-[18px] font-bold mb-0.5">Select Students</h2>
                <p className="text-cgray text-[12px] font-normal m-0">
                  Selected: <span id="currentSelectionCount">0</span> /
                  <span id="maxCapacityDisplay">--</span>
                </p>
              </div>
            </div>
          </div>

          <div className="modal-body pb-0">
            <div className="search-bar-small">
              <span className="material-symbols-outlined">search</span>
              <input type="text" id="enrollmentSearchInput" placeholder="Search student name..." />
            </div>

            <div className="max-h-[300px] flex flex-col gap-1.5 overflow-y-auto mt-2.5" id="enrollmentChecklistContainer" style="max-height: 300px; margin-top: 10px"
            >
              <p className="p-2.5 text-[#888]">Loading students...</p>
            </div>
          </div>

          <div className="modal-footer">
            <button class="btn-save" id="saveEnrollmentSelectionBtn">Done</button>
          </div>
        </div>
      </div>
    </>
  );
}