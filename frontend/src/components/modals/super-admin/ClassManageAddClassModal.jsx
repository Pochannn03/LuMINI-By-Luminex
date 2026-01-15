import React from "react";
import { Link } from 'react-router-dom';
import '../../styles/super-admin/class-manage-modal/class-management-add-class-modal.css';

export default function ClassManageModalAddClass() {
  return (
    <>
      {/* No Logic Yet */}
      <div className="modal-overlay" id="addClassModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined header-icon blue-icon"
                >add_circle</span
              >
              <h2 className="text-cdark text-[18px] font-bold">Create New Class</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
              <label htmlFor="createClassGrade" className="text-cgray text-[13px] font-medium">Grade Level</label>
              <div className="relative">
                <select name="form-input-modal" id="createClassGrade">
                  <option value="" disabled selected>Select Grade Level</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="Grade 1">Grade 1</option>
                </select>
                <span class="material-symbols-outlined select-arrow">expand_more</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="createClassGrade" className="text-cgray text-[13px] font-medium">Class Schedule</label>
              <div class="relative">
                <select class="form-input" id="createClassSchedule">
                  <option className="appearance-none cursor-pointer" value="" disabled selected>Select Schedule</option>
                  <option className="appearance-none cursor-pointer" value="Morning">
                    Morning Session (8:00 AM - 11:30 AM)
                  </option>
                  <option className="appearance-none cursor-pointer" value="Afternoon">
                    Afternoon Session (1:00 PM - 4:30 PM)
                  </option>
                </select>
                <span class="material-symbols-outlined select-arrow">expand_more</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Max Capacity</label>
              <inpu type="number" 
              id="createClassCapacity" 
              placeholder="e.g. 30" 
              class="form-input-modal"/>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Description</label>
              <textarea
                id="createClassDesc"
                class="form-input-modal leading-normal h-[100px] resize-none"
                placeholder="Enter class description..."
              ></textarea>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Assign Teacher</label>
              <div class="relative">
                <select class="form-input-modal" id="createClassTeacher">
                  <option className="appearance-none cursor-pointer" value="" disabled selected>Select a Teacher</option>
                </select>
                <span class="material-symbols-outlined select-arrow">expand_more</span>
              </div>
            </div>

            <div class="form-group mt-2.5">
              <label>Enroll Students</label>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="inside-card-modal">
                  <div className="flex items-center gap-2.5">
                    <div class="icon-box-small blue-bg-soft w-9 h-9 text-[18px]">
                      <span class="material-symbols-outlined">groups</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-cdark font-bold text-[14px]"
                        id="enrollmentSummaryCount">0 Selected</span>
                      <span className="text-cgray text-[11px]">Capacity Limit applies</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="openEnrollmentModalBtn"
                    class="btn-outline w-auto h-9 px-4 text-xs"
                    >
                    Select Students
                  </button>
                </div>

                <input type="hidden" id="finalStudentListJSON" value="[]" />
        
              </div>
            </div>

            <div className="modal-footer">
              <button class="btn-cancel" id="closeAddModalBtn">Cancel</button>
              <button class="btn-save" id="submitCreateClassBtn">
                Create Class
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}