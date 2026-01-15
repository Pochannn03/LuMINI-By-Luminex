import React from "react";
import { Link } from 'react-router-dom';
import '../../../styles/class-manage-add-student-modal.css'

export default function ClassManageAddTeacherModal() {
  return (
    <>
      {/* No Logic Yet */}
      <div className="modal-overlay" id="addStudentModal">
        <div className="modal-container">

          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">person_add</span>
              <h2 className="text-cdark text-[24px] font-bold">Register New Student</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
              <label>Student Photo</label>
              <input type="file" id="addStudentPhoto" accept="image/*" hidden />
              <div className="custom-file-upload" id="studentPhotoTrigger">
                <div className="text-cdark mt-2 mb-1 font-medium" id="stuUploadInitial">
                  <span className="material-symbols-outlined blue-icon text-[32px]">face</span>
                  <p>Click to upload photo</p>
                </div>
                {/* There is a logic for "hidden" attribute of below div that shohuld be added when certain logic was triggered*/}
                <div className="flex justify-between items-center p-[5px]" id="stuUploadSelected">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined blue-icon">image</span>
                    <span className="text-cdark font-medium max-w-[250px] truncate" id="stuFileName"
                      >filename.jpg</span
                    >
                  </div>
                  <span className="material-symbols-outlined text-base text-[#b0bec5]"
                    >check_circle</span
                  >
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label>Full Name</label>
                <div className="flex gap-2.5">
                  <input type="text" id="addStudentFirst" placeholder="First Name" class="form-input-modal"
                  />
                  <input type="text" id="addStudentLast" placeholder="Last Name" class="form-input-modal"
                  />
                </div>
            </div>

            <div className="flex flex-col gap-2">
              <label>Birthdate & Age</label>
                <div className="flex gap-2.5">
                  <input type="date" id="addStudentBirthday" class="form-input-modal flex flex-2" />
                  <input type="text" id="addStudentAge" class="form-input-modal flex flex-1 text-center cursor-not-allowed" placeholder="Age" readonly />
                </div>
            </div>

            <div className="flex flex-col gap-2">
              <label>Student ID (Auto-generated)</label>
                <input type="text" id="addStudentID" class="form-input-modal text-cgray cursor-not-allowed" readonly placeholder="Generating..." />
            </div>

            <div class="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
              <span class="material-symbols-outlined orange-icon">vpn_key</span>
              <h3>Parent Access</h3>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <label className="mb-0">Invitation Code</label>
                  <button type="button" id="refreshInviteCodeBtn" className="text-cprimary-blue bg-none flex items-center border-none cursor-pointer gap-1 text-[12px] font-semibold"
                  >
                    <span class="material-symbols-outlined text-[16px]">refresh</span>
                    Generate New
                  </button>
              </div>
              <input type="text" id="addStudentInviteCode" class="form-input-modal bg-[#f1f5f9] text-cdark tracking-[3px] font-bold text-center text-base" readonly />
              <p className="text-[11px] text-slate-400 mt-1">
                Share this code with the parent to link accounts.
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" id="closeAddStudentBtn">Cancel</button>
            <button class="btn-save" id="submitNewStudentBtn">
              Register Student
            </button>
          </div>

        </div>
      </div>
    </>
  );
}