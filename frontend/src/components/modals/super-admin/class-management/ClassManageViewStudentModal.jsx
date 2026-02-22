import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code"; // Ensure this is imported!
import ClassManageDeleteStudentModal from './ClassManageDeleteStudentModal';
import FormInputRegistration from '../../../FormInputRegistration';

// --- ADDED HELPER ---
const BACKEND_URL = "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'User'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};
// --------------------

export default function ClassManageViewStudentModal({ isOpen, onClose, onSuccess, studentData }) {
  const qrRef = useRef(null);
  const [isOpenDeleteStudentModal, setIsOpenDeleteStudentModal] = useState(false);

  const std = studentData || {};
  const fullName = `${std.first_name || ''} ${std.last_name || ''}`;
  
  // --- APPLIED HELPER HERE ---
  const photoUrl = getImageUrl(std.profile_picture, std.first_name);
  
  const formattedBday = std.birthday 
    ? new Date(std.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : "--";

  const genderStyles = std.gender === 'Male' 
    ? 'text-indigo-600 bg-indigo-100' 
  : std.gender === 'Female' 
    ? 'text-pink-500 bg-pink-100' 
    : 'text-cgray bg-[#f1f5f9]';

  const sectionName = std.section_details?.section_name || "Unassigned";

  // PARENT LOGIC
  let parentName = "Not Linked";
  if (Array.isArray(std.user_details) && std.user_details.length > 0) {
    const parentUser = std.user_details.find(u => 
      u.relationship === 'Parent' || u.relationship === 'Guardian'
    );
    if (parentUser) {
      parentName = `${parentUser.first_name} ${parentUser.last_name}`;
    }
  }

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    const qrSize = 500; 
    const padding = 60; 
    const textSpace = 80; 
    
    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + padding + textSpace;

    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      ctx.fillStyle = "#64748b"; 
      ctx.font = "bold 24px monospace"; 
      ctx.textAlign = "center";
      
      ctx.fillText(
        std.student_id || "N/A", 
        canvas.width / 2, 
        qrSize + padding + (textSpace / 2)
      );
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${std.student_id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleDeleteClick = () => setIsOpenDeleteStudentModal(true);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-overlay active">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">badge</span>
              <h2 className="text-cdark text-[18px] font-bold">Student Profile</h2>
            </div>
          </div>

          <div className="modal-body items-center text-center">
            <img src={photoUrl} className="w-[100px] h-[100px] rounded-full object-cover border-4 border-slate-50 shadow-md mb-3 mx-auto" alt="Profile" />
            <h3 className="text-cdark text-[20px] font-bold">{fullName}</h3>
            <span className={`${genderStyles} py-1 px-2.5 rounded-[20px] text-xs font-semibold`}>
              {std.gender || '---'}
            </span>
            
            <div className="flex gap-2 mb-2 justify-center">
              <span className="text-cprimary-blue bg-[#e0f2fe] py-1 px-2.5 rounded-[20px] text-xs font-semibold">Student ID: {std.student_id || '--'}</span>
              <span className="text-cgray bg-[#f1f5f9] py-1 px-2.5 rounded-[20px] text-xs font-semibold">Age: {std.age || '---'}</span>
            </div>
            <p className="text-[13px]! text-[#64748b] mb-4">Born: {formattedBday}</p>

            <div className="w-full text-left overflow-y-auto max-h-[400px] pr-2">
              {/* ACADEMIC INFO */}
              <div className="flex items-center gap-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined blue-icon">school</span>
                <h3 className="text-cdark text-[16px] font-semibold">Academic Info</h3>
              </div>
              <div className="mt-3 mb-5">
                <FormInputRegistration label="Current Class" value={sectionName} readOnly className="form-input-modal" />
              </div>

              {/* MEDICAL INFO */}
              <div className="flex items-center gap-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined text-[#e74c3c]">medical_services</span>
                <h3 className="text-cdark text-[16px] font-semibold">Medical Information</h3>
              </div>
              <div className="mt-3 flex flex-col gap-3 mb-5">
                <FormInputRegistration label="Allergies" value={std.allergies || "None"} readOnly className="form-input-modal" />
                <FormInputRegistration label="Medical History" type="textarea" value={std.medical_history || "None"} readOnly rows={3} className="form-input-modal" />
              </div>

              {/* PARENT INFO */}
              <div className="flex items-center gap-2 pb-2 border-b border-[#f0f0f0]">
                <span className="material-symbols-outlined orange-icon">family_restroom</span>
                <h3 className="text-cdark text-[16px] font-semibold">Parent Connection</h3>
              </div>
              <div className="mt-3 flex flex-col gap-3 mb-5">
                <FormInputRegistration label="Linked Parent" value={parentName} readOnly className="form-input-modal" />
                <div className="flex flex-row gap-2 items-end">
                    <div className="flex-1">
                        <FormInputRegistration label="Invitation Code" value={std.invitation_code || "---"} readOnly className="form-input-modal font-semibold tracking-[2px] text-center" />
                    </div>
                    <button className="btn-icon-tool mb-1" title="Copy" onClick={() => navigator.clipboard.writeText(std.invitation_code)}>
                        <span className="material-symbols-outlined">content_copy</span>
                    </button>
                </div>
              </div>

              {/* QR CODE SECTION */}
              <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f0] mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined blue-icon">qr_code_2</span>
                  <h3 className="text-cdark text-[16px] font-semibold">Student QR Code</h3>
                </div>
                {std.student_id && (
                  <button type="button" onClick={downloadQRCode} className="text-cprimary-blue flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download PNG
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col items-center" ref={qrRef}>
                  {std.student_id ? (
                    <>
                      <QRCode size={120} value={std.student_id} viewBox={`0 0 256 256`} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                      <p className="text-[10px] font-mono mt-2 text-slate-500 tracking-widest uppercase">{std.student_id}</p>
                    </>
                  ) : (
                    <p className="text-cgray text-xs italic">No ID available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer flex flex-row justify-between">
            <button className="btn-danger text-red-600 border-none font-semibold" onClick={handleDeleteClick}>Delete Student</button>
            <button className="btn-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
      
      <ClassManageDeleteStudentModal
        isOpen={isOpenDeleteStudentModal}
        onClose={() => setIsOpenDeleteStudentModal(false)}
        studentData={std} 
        onSuccess={(msg) => { 
          if(onSuccess) onSuccess(msg);
          onClose();
        }}
      />
    </>
  , document.body);
}