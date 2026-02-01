import React from "react";
import { createPortal } from "react-dom";

export default function ClassManageViewStudentModal({ isOpen, onClose, studentData }) {

  if(!isOpen) return null;

  const std = studentData || {};
  const fullName = `${std.first_name || ''} ${std.last_name || ''}`;
  const photoUrl = std.profile_picture || "https://api.dicebear.com/7.x/initials/svg?seed=" + (std.first_name || "User");
  const formattedBday = std.birthday 
    ? new Date(std.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : "--";

  // DISPLAYING THE SECTION WHERE THE STUDENT IS BELONG
  const sectionName = std.section_id?.section_name || "Unassigned";

  // PARENT || GUARDIAN RELATION FOR DISPLAYING THEIR NAME
  let parentName = "Not Linked";
  if (Array.isArray(std.user_details) && std.user_details.length > 0) {
    const parentUser = std.user_details.find(u => 
      u.relationship === 'Parent' || u.relationship === 'Guardian'
    );

    if (parentUser) {
      parentName = `${parentUser.first_name} ${parentUser.last_name}`;
    }
  }

  return createPortal(
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay active" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div class="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]" >badge</span>
              <h2 className="text-cdark text-[18px] font-bold">Student Profile</h2>
            </div>
          </div>

          <div className="modal-body items-center text-center">
            <img 
              src={photoUrl} 
              className="w-[100px] h-[100px] rounded-full object-cover border-4 border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.1)] mb-3" 
              alt="Profile"
            />
            <h3 className="text-cdark text-[20px] font-bold mb-1">{fullName || '---'}</h3>
              <div className="flex gap-2 mb-2">
                <span id="viewStudentID" className="text-cprimary-blue bg-[#e0f2fe] py-1 px-2.5 rounded-[20px] text-xs font-semibold">Student ID: {std.student_id || '--'}</span>
                <span id="viewStudentAgeBadge" className="text-cgray bg-[#f1f5f9] py-1 px-2.5 rounded-[20px] text-xs font-semibold">Age: {std.age || '---'}</span>
              </div>
            <p id="viewStudentBday" className="text-[13px]! text-[#64748b] m-0">Born: {formattedBday || '---'}</p>

            <div className="w-full text-left">
              <div className="flex items-center gap-2 mt-2 pb-2 border-b border-[#f0f0f0]">
                <span class="material-symbols-outlined blue-icon">school</span>
                <h3 className="text-cdark text-[16px]! font-semibold">Academic Info</h3>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <label htmlFor="viewStudentClass" className="text-cgray text-[13px] font-medium">Current Class</label>
                <input type="text" id="viewStudentClass" className="form-input-modal" readOnly value={sectionName} />
              </div>

              <div className="w-full mt-6 text-left">
                <div className="flex items-center gap-2 mt-4 pb-2 border-b border-[#f0f0f0]">
                  <span class="material-symbols-outlined text-[#e74c3c]">medical_services</span>
                  <h3 className="text-cdark text-[16px]! font-semibold">Medical Information</h3>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-cgray text-[13px] font-medium mt-4">Allergies</label>
                  <textarea id="viewStudentAllergies" class="form-input-modal bg-[#fff5f5] text-[#c0392b] resize-none h-[60px]" readOnly
                  ></textarea>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="viewStudentMedical" className="text-cgray text-[13px] mt-2 font-medium">Medical History</label>
                  <textarea id="viewStudentMedical" class="form-input-modal bg-[#fff5f5] text-[#c0392b] resize-none h-[60px]" readOnly
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pb-2 border-b border-[#f0f0f0]">
                <span class="material-symbols-outlined orange-icon">family_restroom</span>
                <h3 className="text-cdark text-[16px] font-semibold">Parent Connection</h3>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="viewStudentParent" className="text-cgray text-[13px] font-medium mt-4">Linked Parent</label>
                <input 
                    type="text" 
                    className="form-input-modal" 
                    readOnly 
                    value={parentName}
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label htmlFor="viewStudentInvite" className="text-cgray text-[13px] font-medium">Invitation Code</label>
                <div className="flex flex-row gap-2">
                  <input type="text" id="viewStudentInvite" className="form-input-modal font-semibold tracking-[2px] text-center" readOnly value={std.invitation_code} />
                  <button className="btn-icon-tool mt-1.5" title="Copy"
                    onclick="navigator.clipboard.writeText(document.getElementById('viewStudentInvite').value)">
                  <span className="material-symbols-outlined">content_copy</span>
                  </button> {/* will work on logic soon */}
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer flex flex-row justify-between">
            <button className="btn-danger text-red-600 border-none" id="deleteViewStudentBtn">
              Delete Student
            </button>
            <button className="btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}