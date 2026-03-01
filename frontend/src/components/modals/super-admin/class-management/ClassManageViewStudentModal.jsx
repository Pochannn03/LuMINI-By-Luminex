import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code"; 
import axios from "axios";
import ClassManageDeleteStudentModal from './ClassManageDeleteStudentModal';
import FormInputRegistration from '../../../FormInputRegistration';
import ConfirmModal from '../../../ConfirmModal'; 

const BACKEND_URL = "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'User'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function ClassManageViewStudentModal({ isOpen, onClose, onSuccess, studentData }) {
  const qrRef = useRef(null);
  const [isOpenDeleteStudentModal, setIsOpenDeleteStudentModal] = useState(false);
  const [viewImage, setViewImage] = useState(null); 
  const [isSendCodeModalOpen, setIsSendCodeModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const std = studentData || {};
  const fullName = `${std.first_name || ''} ${std.last_name || ''}`;
  const photoUrl = getImageUrl(std.profile_picture, std.first_name);
  
  const formattedBday = std.birthday 
    ? new Date(std.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
    : "N/A";

  const sectionName = std.section_details?.section_name || "Unassigned";

  // PARENT LOGIC
  let parentDisplayName = "---";
  let isVerified = false;
  let contactPhone = null;
  let contactEmail = null;

  if (Array.isArray(std.user_details) && std.user_details.length > 0) {
    const parentUser = std.user_details.find(u => u.relationship === 'Parent' || u.relationship === 'Guardian');
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

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const qrSize = 500; const padding = 60; const textSpace = 80; 
    canvas.width = qrSize + (padding * 2); canvas.height = qrSize + padding + textSpace;

    img.onload = () => {
      ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      ctx.fillStyle = "#64748b"; ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
      ctx.fillText(std.student_id || "N/A", canvas.width / 2, qrSize + padding + (textSpace / 2));
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${std.student_id}.png`; downloadLink.href = pngFile; downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/students/send-invitation`, { student_id: std.student_id }, { withCredentials: true });
      if (response.data.success) { if(onSuccess) onSuccess(response.data.msg); onClose(); }
    } catch (error) {
      alert(error.response?.data?.msg || "Failed to send email.");
    } finally { setIsSendingEmail(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-overlay active flex justify-center items-center p-4 z-[9990]" onClick={onClose}>
        <div className="bg-white rounded-3xl w-full max-w-[480px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          
          {/* 1. PREMIUM HEADER WITH LARGE AVATAR */}
          <div className="relative pt-12 pb-6 px-6 sm:px-8 border-b border-slate-100 flex flex-col items-center shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-500 transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 mb-4 cursor-zoom-in hover:scale-105 transition-transform" onClick={() => setViewImage(photoUrl)}>
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>

            <h2 className="text-[22px] font-extrabold text-[#1e293b] leading-tight">{fullName}</h2>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[11px] font-bold tracking-wide flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[14px]">badge</span> {std.student_id || '--'}
              </span>
              <span className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold tracking-wide uppercase shadow-sm ${std.gender === 'Male' ? 'bg-blue-50 text-blue-600 border-blue-100' : std.gender === 'Female' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                {std.gender || '---'}
              </span>
            </div>
          </div>

          {/* 2. SCROLLABLE CONTENT BODY */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }`}</style>
            
            <div className="px-6 sm:px-8 py-6 flex flex-col gap-5">
              
              {/* ACADEMIC & BASIC INFO */}
              <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Current Class</span>
                    <div className="flex items-center gap-2 text-[#2563eb] font-bold text-[14px]">
                      <span className="material-symbols-outlined text-[18px]">school</span> {sectionName}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-right border-l border-slate-100 pl-4">
                    <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Age & DOB</span>
                    <div className="text-[#475569] font-bold text-[13.5px]">
                      {std.age || '--'} yrs • {formattedBday}
                    </div>
                  </div>
                </div>
              </div>

              {/* HEALTH & MEDICAL */}
              <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                <h4 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-red-400">medical_services</span> Health & Medical
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                    <span className="text-[13px] text-[#64748b] font-medium">Allergies:</span>
                    <span className="text-[13px] font-bold text-[#1e293b] text-right">{std.allergies || 'None'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[13px] text-[#64748b] font-medium">Medical History:</span>
                    <span className="text-[13px] font-bold text-[#1e293b] text-right leading-snug">{std.medical_history || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* PARENT CONNECTION */}
              <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                <h4 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-orange-400">family_restroom</span> Parent Connection
                </h4>
                
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100 mb-4 flex items-center justify-between">
                  <span className={`text-[14px] font-bold ${parentDisplayName === '---' ? 'text-slate-400' : 'text-[#1e293b]'}`}>{parentDisplayName}</span>
                  {parentDisplayName !== "---" && (
                    <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-tighter ${isVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {isVerified ? 'Verified' : 'Passive'}
                    </span>
                  )}
                </div>

                <div className="space-y-3 px-1">
                  {contactPhone && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">call</span>
                      <span className="text-[13px] text-[#1e293b] font-medium">{contactPhone}</span>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">mail</span>
                      <span className="text-[13px] text-[#1e293b] font-medium truncate">{contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SYSTEM ACCESS (QR + CODE) */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-stretch gap-4 relative overflow-hidden">
                {isSendingEmail && (
                  <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex items-center justify-center transition-all">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-blue-600 text-[28px]">progress_activity</span>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Sending Email...</span>
                    </div>
                  </div>
                )}

                <div className="shrink-0 flex flex-col items-center justify-center relative group bg-white p-2 rounded-xl border border-blue-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all hover:shadow-md" onClick={std.student_id ? downloadQRCode : undefined}>
                  <div ref={qrRef}>
                    {std.student_id ? <QRCode size={56} value={std.student_id} viewBox={`0 0 256 256`} style={{ height: "auto", width: "100%" }} /> : <span className="material-symbols-outlined text-slate-300 text-[40px]">qr_code</span>}
                  </div>
                  <div className="absolute inset-0 bg-slate-900/60 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-[24px]">download</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center border-l border-blue-200/50 pl-4 overflow-hidden">
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">key</span> Invitation Code
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono font-bold tracking-[3px] text-center bg-white text-[13px] text-blue-700 py-1.5 rounded-lg border border-blue-200 shadow-sm truncate">
                      {std.invitation_code || "---"}
                    </span>
                    {contactEmail && !isVerified ? (
                      <button className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-transform active:scale-95" title="Send to Email" onClick={() => setIsSendCodeModalOpen(true)}>
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      </button>
                    ) : (
                      <button className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm transition-transform active:scale-95" title="Copy Code" onClick={() => navigator.clipboard.writeText(std.invitation_code)}>
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          {/* 3. SYMMETRICAL EDGE-TO-EDGE FOOTER (UPDATED: Done button is now green) */}
          <div className="px-6 py-5 sm:px-8 shrink-0 bg-white border-t border-slate-100 flex gap-4 w-full">
            <button className="flex-1 text-[13px] font-bold text-red-600 bg-white border-2 border-red-100 hover:bg-red-50 py-2.5 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2" onClick={() => setIsOpenDeleteStudentModal(true)}>
              <span className="material-symbols-outlined text-[18px]">delete</span> Delete Account
            </button>
            <button className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] text-white py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-[13px] flex justify-center items-center" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
      
      {/* IMAGE ZOOM LIGHTBOX */}
      {viewImage && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-6 cursor-zoom-out" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="Fullscreen View" className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl border-4 border-white/20 object-contain animate-[zoomIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors" onClick={() => setViewImage(null)}><span className="material-symbols-outlined text-[28px]">close</span></button>
        </div>
      )}

      {/* SUB-MODALS */}
      <ConfirmModal isOpen={isSendCodeModalOpen} onClose={() => setIsSendCodeModalOpen(false)} onConfirm={handleSendEmail} title="Send Invitation?" message={`Are you sure you want to email the system invitation code to ${contactEmail}?`} confirmText="Yes, Send Email" cancelText="Cancel" />
      <ClassManageDeleteStudentModal isOpen={isOpenDeleteStudentModal} onClose={() => setIsOpenDeleteStudentModal(false)} studentData={std} onSuccess={(msg) => { if(onSuccess) onSuccess(msg); onClose(); }} />
    </>
  , document.body);
}