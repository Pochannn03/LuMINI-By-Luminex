import React from "react";
import { createPortal } from "react-dom";
import "../../../../styles/super-admin/class-manage-modal/class-manage-select-students-modal.css";

export default function ClassManageSelectStudentModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return createPortal(
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay active index-second-modal" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">checklist</span>
              <div>
                <h2 className="text-cdark text-[18px] font-bold mb-0.5">Select Students</h2>
                <p className="text-cgray text-[12px] font-normal m-0">
                  Selected: <span id="currentSelectionCount">0</span> / 
                  <span id="maxCapacityDisplay"> --</span>
                </p>
              </div>
            </div>
          </div>

          <div className="modal-body pb-0">
            <div className="search-bar-small">
              <span className="material-symbols-outlined">search</span>
              <input type="text" id="enrollmentSearchInput" placeholder="Search student name..." />
            </div>

            <div className="max-h-[300px] flex flex-col gap-1.5 overflow-y-auto mt-2.5" id="enrollmentChecklistContainer"
            >
              <p className="p-2.5 text-[#888]">Loading students...</p>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-save" onClick={onClose}>Close</button>
            <button className="btn-save" id="saveEnrollmentSelectionBtn">Done</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}