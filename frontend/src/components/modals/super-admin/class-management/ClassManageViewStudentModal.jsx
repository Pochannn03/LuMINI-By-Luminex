import React from "react";
import { Link } from 'react-router-dom';

export default function ClassManageViewStudentModal() {
  return (
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div class="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]" >badge</span>
              <h2 className="text-cdark text-[18px] font-bold">Student Profile</h2>
            </div>
          </div>

          <div className="modal-body items-center">
            <img src="../../../assets/placeholder_image.jpg" id="viewStudentPhoto" className="w-[100px] h-[100px] rounded-full object-cover border-4 border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.1)] mb-3" />
            <h3 className="text-cdark text-[20px] font-bold mb-1">Student Name</h3>
              <div className="flex gap-2 mb-2">
                <span id="viewStudentID" className="text-cprimary-blue bg-[#e0f2fe] py-1 px-2.5 rounded-[20px] text-xs font-semibold">ID: --</span>
                <span id="viewStudentAgeBadge" className="text-cgray bg-[#f1f5f9] py-1 px-2.5 rounded-[20px] text-xs font-semibold">Age: --</span>
              </div>
            <p id="viewStudentBday" className="text-[13px] text-[#64748b] m-0">Born: --</p>

            <div className="w-full mt-6 text-left">
              <div className="flex itemcs-center gap-2 mt-2 p-2 border-b border-[#f0f0f0]">
                <span class="material-symbols-outlined blue-icon">school</span>
                <h3 className="text-cdark text-[16px] font-semibold">Academic Info</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="viewStudentClass" className="text-cgray text-[13px] font-medium">Current Class</label>
                <input type="text" id="viewStudentClass" className="form-input-modal" readonly value="Unassigned" />
              </div>

              <div className="w-full mt-6 text-left">
                <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                  <span class="material-symbols-outlined text-[#e74c3c]">medical_services</span>
                  <h3 className="text-cdark text-[16px] font-semibold">Medical Information</h3>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="viewStudentAllergies" className="text-cgray text-[13px] font-medium">Allergies</label>
                  <textarea id="viewStudentAllergies" class="form-input-modal bg-[#fff5f5] text-[#c0392b] resize-none h-[60px]" readonly
                  ></textarea>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="viewStudentMedical" className="text-cgray text-[13px] font-medium">Medical History</label>
                  <textarea id="viewStudentMedical" class="form-input-modal bg-[#fff5f5] text-[#c0392b] resize-none h-[60px]" readonly
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                <span class="material-symbols-outlined orange-icon">family_restroom</span>
                <h3 className="text-cdark text-[16px] font-semibold">Parent Connection</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="viewStudentParent" className="text-cgray text-[13px] font-medium">Linked Parent</label>
                <input type="text" id="viewStudentParent" class="form-input-modal" readonly value="Not Linked"/>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex gap-2">
                  <label htmlFor="viewStudentInvite" className="text-cgray text-[13px] font-medium">Invitation Code</label>
                  <input type="text" id="viewStudentInvite" className="form-input-modal font-semibold tracking-[2px]" readonly value="XYZ123" />
                  <button className="btn-icon-tool" title="Copy"
                    onclick="navigator.clipboard.writeText(document.getElementById('viewStudentInvite').value)"
                  >
                  <span className="material-symbols-outlined">content_copy</span>
                  </button> {/* will work on logic soon */}
                </div>
              </div>
            </div>
          </div>
          
          <div className="modala-footer justify-between">
            <button className="btn-danger enabled flex-none text-red-600 border-none px-5" id="deleteViewStudentBtn">
              Delete Student
            </button>
            <button className="btn-cancel flex-none! px-6" id="closeViewStudentBtn">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}