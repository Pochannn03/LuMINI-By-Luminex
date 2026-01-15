import React from "react";
import { Link } from 'react-router-dom';
import '../../styles/super-admin/class-manage-modal/class-management-add-class-modal.css';

export default function ClassManageEditStudentModal() {
  return (
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined header-icon blue-icon">edit_square</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Student Profile</h2>
            </div>
          </div>

          <div className="modal-body">
            <input type="hidden" id="editStudentDbId" />
            <div className="flex flex-col items-center gap-2">
              <img className="w-[100px] h-[100px] rounded-full object-cover border-4 border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.1)] mb-3" id="editStudentPreview" src=""/>
              <label htmlFor="editStudentPhotoInput" className="text-cprimary-blue cursor-pointer block text-[13px] font-semibold transition-colors duration-200 hover:text-[#2c8ac4]">Change Photo</label>
              <input type="file" id="editStudentPhotoInput" accept="image/*" hidden/>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label htmlFor="fullName" className="text-cgray text-[13px] font-medium">Full Name</label>
              <div className="flex gap-2.5">
                <input type="text" id="editStudentFirst" placeholder="First Name" className="form-input-modal" />
                <input type="text" id="editStudentLast" placeholder="Last Name" className="form-input-modal" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label htmlFor="birthdateAge" className="text-cgray text-[13px] font-medium">Birthdate & Age</label>
              <div className="flex gap-2.5">
                <input type="date" id="editStudentBirthday" placeholder="First Name" className="form-input-modal flex flex-2" />
                <input type="text" id="editStudentAge" placeholder="Last Name" className="form-input-modal flex flex-1 bg-[#f1f5f9] text-center" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label htmlFor="editStudentID">Student ID (Locked)</label>
              <input type="text" id="editStudentID" class="form-input-modal bg-[#f1f5f9]" readonly />
            </div>  
          </div>

          <div className="modal-footer">
            <button class="btn-cancel" id="closeEditStudentBtn">Cancel</button>
            <button class="btn-save" id="saveStudentChangesBtn">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}