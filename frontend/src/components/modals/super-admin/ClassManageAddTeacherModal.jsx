import React from "react";
import { Link } from 'react-router-dom';
import '../../../styles/super-admin/class-manage-modal/class-manage-add-teacher-modal.css';

export default function ClassManageAddTeacherModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <>
      {/* No Logic Yet */}
      <div className="modal-overlay active" id="addClassModal">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span class="material-symbols-outlined header-icon blue-icon"
                >person_add</span
              >
              <h2 className="text-cdark text-[18px] font-bold">Add New Teacher</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
              <label htmlFor="addTeacherPhoto" className="text-cgray text-[13px] font-medium">Profile Photo</label>
              <input type="file" id="addTeacherPhoto" accept="image/*" hidden />
            
              <div class="custom-file-upload" id="photoUploadTrigger">
                <div id="uploadInitialView">
                  <span
                    class="material-symbols-outlined blue-icon text-[32px]"
                    >cloud_upload</span
                  >
                  <p className="text-cdark font-medium mt-2 mb-1 mx-0">Click to upload profile photo</p>
                  <span class="text-cgray text-[12px]">PNG, JPG (Max 5MB)</span>
                </div>

                {/* this div has hidden js logic will be back soon named "hidden" on vanilla*/}
                {/* Bug on JPG image */}
                <div class="flex justify-between items-center p-[5px]" id="uploadSelectedView">
                  <div className="flex items-center gap-2.5">
                    <span class="material-symbols-outlined blue-icon"
                      >image</span
                    >
                    <span class="text-cdark font-medium max-w-[250px] truncate" id="selectedFileName"
                      >filename.jpg</span
                    >
                  </div>
                  <span class="material-symbols-outlined text-cgray text-[16px]"
                    >alt_route</span
                  >
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="" className="text-cgray text-[13px] font-medium">Full Name</label>
              <div className="flex gap-2.5">
                <input type="text" id="addTeacherFirst" placeholder="First Name" className="form-input-modal" />
                <input type="text" id="addTeacherLast" placeholder="Last Name" className="form-input-modal" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="" className="text-cgray text-[13px] font-medium">Contact Info</label>
              <input type="email" id="addTeacherEmail" className="form-input-modal" placeholder="Email"/>
              <input type="text" id="addTeacherPhone" className="form-input-modal mt-2" placeholder="Phone Number" />
            </div>

            <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
              <span class="material-symbols-outlined blue-icon">lock</span>
              <h3 className="text-cdark font-semibold text-[16px]">Login Credentials</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="" className="text-cgray text-[13px] font-medium">Username</label>
              <input type="text" id="addTeacherUsername" className="form-input-modal" placeholder="e.g. Teacher_Moka"/>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="" className="text-cgray text-[13px] font-medium">Password</label>
              <input type="password" id="addTeacherPassword" className="form-input-modal" placeholder="Initial Password"/>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" onClick={onClose}>Cancel</button>
            <button class="btn-save" id="submitNewTeacherBtn">
              Create Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}