import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code"; 
import ClassManageDeleteStudentModal from './ClassManageDeleteStudentModal';

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
  const [viewImage, setViewImage] = useState(null); // Zoom State

  const std = studentData || {};
  const fullName = `${std.first_name || ''} ${std.last_name || ''}`;
  
  const photoUrl = getImageUrl(std.profile_picture, std.first_name);
  
  const formattedBday = std.birthday 
    ? new Date(std.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
    : "--";

  const genderStyles = std.gender === 'Male' 
    ? 'text-blue-600 bg-white border border-blue-200' 
  : std.gender === 'Female' 
    ? 'text-pink-600 bg-white border border-pink-200' 
    : 'text-slate-600 bg-white border border-slate-200';

  const sectionName = std.section_details?.section_name || "Unassigned";

  // ==========================================
  // SMART PARENT LOGIC (Passive vs Verified)
  // ==========================================
  let parentDisplayName = "---";
  let isVerified = false;
  let contactPhone = null;
  let contactEmail = null;

  if (Array.isArray(std.user_details) && std.user_details.length > 0) {
    const parentUser = std.user_details.find(u => 
      u.relationship === 'Parent' || u.relationship === 'Guardian'
    );
    if (parentUser) {
      parentDisplayName = `${parentUser.first_name} ${parentUser.last_name}`;
      isVerified = true;
      contactPhone = parentUser.phone_number;
      contactEmail = parentUser.email;
    }
  } else if (std.passive_parent && std.passive_parent.name) {
    parentDisplayName = std.passive_parent.name;
    isVerified = std.passive_parent.is_verified || false;
    contactPhone = std.passive_parent.phone;
    contactEmail = std.passive_parent.email;
  }

  // ==========================================
  // QR GENERATOR
  // ==========================================
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
      ctx.fillText(std.student_id || "N/A", canvas.width / 2, qrSize + padding + (textSpace / 2));
      
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
      <div className="modal-overlay active" onClick={onClose}>
        {/* SLIMMER MODAL: max-w-[400px] and extra rounded corners */}
        <div className="modal-container max-w-[400px] w-[95%] p-0 overflow-hidden shadow-2xl rounded-[24px]" onClick={(e) => e.stopPropagation()}>
          
          {/* HERO HEADER */}
          <div className="relative bg-gradient-to-b from-blue-50/80 to-white pt-6 pb-4 px-5 border-b border-slate-100 flex flex-col items-center text-center">
            <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors" onClick={onClose}>
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            
            <img 
              src={photoUrl} 
              className="w-20 h-20 rounded-full object-cover border-[3px] border-white shadow-md mb-3 cursor-zoom-in hover:scale-105 transition-transform bg-slate-100" 
              alt="Profile" 
              onClick={() => setViewImage(photoUrl)}
              title="Click to zoom"
            />
            <h2 className="text-[18px] font-bold text-slate-800 leading-tight mb-2">{fullName}</h2>
            
            <div className="flex justify-center items-center gap-2 mt-0.5">
              <div className="h-[24px] bg-white border border-slate-200 text-slate-600 px-2.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm leading-none">
                <span className="material-symbols-outlined text-[13px]">badge</span> 
                <span>{std.student_id || '--'}</span>
              </div>
              <div className={`h-[24px] ${genderStyles} px-2.5 rounded-md text-[10px] font-bold flex items-center shadow-sm leading-none`}>
                {std.gender || '---'}
              </div>
            </div>
          </div>

          <div className="p-5 overflow-y-auto max-h-[55vh] custom-scrollbar flex flex-col gap-4 bg-white">
            
            {/* COMPACT DATA GRID: Academics & Age */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center transition-colors hover:border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Current Class</span>
                <span className="text-[12px] font-bold text-blue-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">school</span> <span className="truncate">{sectionName}</span>
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center transition-colors hover:border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Age & DOB</span>
                <span className="text-[12px] font-semibold text-slate-700 truncate">
                  {std.age || '--'} yrs • {formattedBday}
                </span>
              </div>
            </div>

            {/* MEDICAL INFO CARD */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-2">
                <span className="material-symbols-outlined text-[14px] text-red-400">medical_services</span> Health & Medical
              </h4>
              <div className="flex flex-col gap-1 mt-1 text-[12px]">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-medium">Allergies:</span>
                  <span className="font-semibold text-slate-800 text-right">{std.allergies || "None"}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-medium whitespace-nowrap mr-4">History:</span>
                  <span className="font-semibold text-slate-800 text-right leading-snug">{std.medical_history || "None"}</span>
                </div>
              </div>
            </div>

            {/* PARENT CONNECTION CARD */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-2">
                <span className="material-symbols-outlined text-[14px] text-orange-400">family_restroom</span> Parent Connection
              </h4>
              <div className="flex justify-between items-center mt-1">
                <span className={`text-[12px] font-bold truncate pr-2 ${parentDisplayName === '---' ? 'text-slate-400' : 'text-slate-800'}`}>
                  {parentDisplayName}
                </span>
                {parentDisplayName !== "---" && (
                  <span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0 ${isVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                    {isVerified ? 'Verified' : 'Passive'}
                  </span>
                )}
              </div>
              
              {(contactPhone || contactEmail) && (
                <div className="flex flex-col gap-1.5 mt-1.5 pt-2 border-t border-dashed border-slate-100 text-[11px]">
                  {contactPhone && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">call</span> Phone:</span>
                      <span className="font-semibold">{contactPhone}</span>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">mail</span> Email:</span>
                      <span className="font-semibold truncate pl-2">{contactEmail}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* UNIFIED SYSTEM ACCESS (QR + CODE) */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-stretch gap-3">
              <div className="shrink-0 flex flex-col items-center justify-center gap-1.5">
                <div ref={qrRef} className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">
                  {std.student_id ? (
                    <QRCode size={48} value={std.student_id} viewBox={`0 0 256 256`} style={{ height: "auto", width: "100%" }} />
                  ) : (
                    <div className="w-[48px] h-[48px] flex items-center justify-center bg-slate-50"><span className="material-symbols-outlined text-slate-300">qr_code</span></div>
                  )}
                </div>
                {std.student_id && (
                  <button type="button" onClick={downloadQRCode} className="text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 transition-colors">
                    <span className="material-symbols-outlined text-[12px]">download</span> Save
                  </button>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-center border-l border-blue-200/60 pl-3 overflow-hidden">
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider mb-1.5">Invitation Code</span>
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono font-bold tracking-[3px] text-center bg-white text-[13px] text-blue-700 py-1.5 rounded-lg border border-blue-200 shadow-sm truncate">
                    {std.invitation_code || "---"}
                  </span>
                  <button 
                    className="w-[32px] h-[32px] shrink-0 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-transform active:scale-95" 
                    title="Copy Code" 
                    onClick={() => navigator.clipboard.writeText(std.invitation_code)}
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
          
          {/* GROUPED BUTTONS ON THE RIGHT */}
          <div className="modal-footer flex flex-row justify-end items-center gap-3 border-t border-slate-100 p-4 bg-slate-50">
            <button className="text-[12px] font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1.5 px-4 py-2 rounded-xl" onClick={handleDeleteClick}>
              <span className="material-symbols-outlined text-[16px]">delete</span> Delete
            </button>
            <button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-xl font-bold transition-transform active:scale-95 text-[12px]" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
      
      {/* --- IMAGE LIGHTBOX OVERLAY --- */}
      {viewImage && (
        <div 
          className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-6 cursor-zoom-out transition-all"
          onClick={() => setViewImage(null)}
        >
          <img 
            src={viewImage} 
            alt="Fullscreen View" 
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border-[4px] border-white/20 object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            onClick={() => setViewImage(null)}
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>
      )}

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