import React from "react";
import { Link } from 'react-router-dom';

export default function ClassManageEditClassModal() {
  return (
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div class="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]" >edit_square</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Class Details</h2>
            </div>
          </div>

          <div className="modal-body">
              <input type="hidden" id="editClassId_Hidden" />

              <div className="flex flex-col gap-2">
                <label>Grade Level</label>
                <div className="relative">
                  <select className="form-input-modal" id="editClassGrade">
                    <option className="appearance-none cursor-pointer" value="Kindergarten">Kindergarten</option>
                    <option className="appearance-none cursor-pointer" value="Grade 1">Grade 1</option>
                  </select>
                  <span className="material-symbols-outlined select-arrow">expand_more</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label>Section Name</label>
                  <input type="text" id="editClassSection" className="form-input-modal" placeholder="e.g. Sunflower" autocomplete="off"
                  />
              </div>

              <div className="flex flex-col gap-2">
                <label>Class Schedule</label>
                <div class="relative">
                  <select class="form-input-modal" id="editClassSchedule">
                    <option className="appearance-none cursor-pointer" value="Morning">
                      Morning Session (8:00 AM - 11:30 AM)
                    </option>
                    <option className="appearance-none cursor-pointer" value="Afternoon">
                      Afternoon Session (1:00 PM - 4:30 PM)
                    </option>
                  </select>
                  <span className="material-symbols-outlined select-arrow">expand_more</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label>Max Capacity</label>
                <input type="number" id="editClassCapacity" placeholder="e.g. 30" className="form-input-modal" />
              </div>

              <div className="flex flex-col gap-2">
                <label>Description</label>
                <textarea type="number" id="editClassDesc" placeholder="e.g. 30" className="form-input-modal resize-none h-[100px] leading-normal" ></textarea>
              </div>

              {/* Needs a logic for options css due to data will be on server/database which will be looped inside */}
              <div className="flex flex-col gap-2">
                <label>Assign Teacher</label>
                <div className="relative">
                  <select className="form-input-modal" id="editClassTeacher">
                    <option value="" disabled selected>Select a Teacher</option>
                  </select>
                  <span className="material-symbols-outlined select-arrow" >expand_more</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2.5">
                <label>Manage Students</label>
                  <div className="flex items-center justify-between bg-[#f8fafc] p-4 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="text-cprimary-blue bg-[#e0f2fe] w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-[18px]">
                        <span className="material-symbols-outlined">groups</span>
                      </div>
                      <div className="flex flex-col">
                        <span id="editEnrollmentSummaryCount" className="text-cdark font-bold text-[14px]">0 Selected</span>
                        <span className="text-cgray text-[11px]">Capacity Limit applies</span>
                      </div>
                    </div>
                    <button type="button" id="openEditEnrollmentModalBtn" className="btn-outline w-auto h-9 px-4 text-xs">
                      Edit List
                    </button>
                  </div>
                  <input type="hidden" id="editStudentListJSON" value="[]" />
                </div>
            </div>

            <div class="modal-footer">
              <button class="btn-cancel" id="closeEditClassBtn">Cancel</button>
              <button class="btn-save" id="saveClassChangesBtn">
                Save Changes
              </button>
            </div>
        </div>
      </div>
    </>
  );
}