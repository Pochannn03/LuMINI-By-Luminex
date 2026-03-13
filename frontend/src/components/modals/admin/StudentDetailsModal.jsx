import React, { useRef } from "react";
import QRCode from "react-qr-code";
import "../../../styles/teacher/class-list-modal.css";

// --- ADDED IMAGE HELPER ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, fallbackName) => {
  if (!path) return `https://ui-avatars.com/api/?name=${fallbackName || 'User'}&background=random`;
  if (path.startsWith("http")) return path;
  
  // Clean up backslashes and remove leading slash to prevent double-slashes
  let cleanPath = path.replace(/\\/g, "/");
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
  
  return `${BACKEND_URL}/${cleanPath}`;
};
// --------------------------

export default function StudentDetailsModal({ isOpen, onClose, student }) {
  const qrRef = useRef(null);

  if (!isOpen || !student) return null;

  const studentId = student.id || student.student_id;

  // --- NEW: Filter out archived guardians ---
  // This ensures we only map over guardians who are active
  const activeGuardians = student.guardians?.filter(guardian => guardian.is_archive !== true) || [];

  // --- QR DOWNLOAD LOGIC ---
  const downloadQRCode = () => {
    if (!qrRef.current || !studentId) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

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
      // Draw background
      ctx.fillStyle = "white"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR Image
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      // Draw Student ID Text
      ctx.fillStyle = "#64748b"; 
      ctx.font = "bold 24px monospace"; 
      ctx.textAlign = "center";
      ctx.fillText(studentId, canvas.width / 2, qrSize + padding + (textSpace / 2));
      
      // Trigger Download
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${studentId}.png`; 
      downloadLink.href = pngFile; 
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };
  // -------------------------

  return (
    // Note the inline z-index: 10000 to ensure it sits ON TOP of the previous modal
    <div className="class-modal-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="class-modal-card student-details-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="class-modal-header">
          <div>
            <h3>Student Profile</h3>
          </div>
          <button className="text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90 bg-transparent border-none cursor-pointer flex items-center justify-center p-2 z-50" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="class-modal-body">
          
          {/* Top: Avatar & Name */}
          <div className="student-profile-header">
            <div className="student-avatar-large" style={{ padding: 0, overflow: 'hidden', border: '3px solid #e2e8f0' }}>
              <img 
                src={getImageUrl(student.profile_picture, student.name)} 
                alt={student.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <h2>{student.name}</h2>
            <p>ID: {studentId}</p>

            {/* --- ADDED QR CODE RENDERER --- */}
            {studentId && (
              <div 
                onClick={downloadQRCode}
                title="Click to download QR Code"
                style={{ 
                  marginTop: '16px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', 
                  cursor: 'pointer', padding: '12px 24px', border: '1px solid #e2e8f0', borderRadius: '12px', 
                  backgroundColor: '#f8fafc', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#93c5fd'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div ref={qrRef} style={{ background: 'white', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <QRCode 
                    size={64} 
                    value={studentId} 
                    viewBox={`0 0 256 256`} 
                    style={{ height: "auto", maxWidth: "100%", width: "64px" }} 
                  />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span> Download QR
                </span>
              </div>
            )}
            {/* ------------------------------ */}

          </div>

          {/* Middle: Personal & Medical Info */}
          <div className="student-info-section">
            <h4>Personal & Medical Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Age</span>
                <span className="info-value">{student.age ? `${student.age} yrs old` : "N/A"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{student.gender || "N/A"}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Allergies</span>
                <span className="info-value">{student.allergies || "None"}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Medical History</span>
                <span className="info-value">{student.medical_history || "None"}</span>
              </div>
            </div>
          </div>

          {/* Bottom: Guardians */}
          <div className="student-info-section">
            <h4>Guardians</h4>
            <div className="guardian-list">
              {/* UPDATED: Mapping over activeGuardians instead of student.guardians */}
              {activeGuardians.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>No active guardians linked.</p>
              ) : (
                activeGuardians.map((guardian, index) => {
                  const guardianName = `${guardian.first_name} ${guardian.last_name}`;
                  return (
                    <div key={index} className="guardian-card" style={{ alignItems: 'flex-start' }}>
                      
                      <div className="guardian-icon" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'transparent', marginTop: '4px' }}>
                        <img 
                          src={getImageUrl(guardian.profile_picture, guardianName)} 
                          alt={guardianName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      </div>
                      
                      <div className="guardian-details" style={{ flex: 1 }}>
                        <p className="guardian-name" style={{ marginBottom: '2px' }}>{guardianName}</p>
                        <p className="guardian-relation" style={{ marginBottom: '8px' }}>
                          {guardian.relationship || "Guardian"} • {guardian.phone_number || "No contact"}
                        </p>
                        
                        {/* --- NEW: Email and Address Section --- */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                          
                          {/* Email */}
                          <p style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8' }}>mail</span> 
                            {guardian.email || "No email provided"}
                          </p>
                          
                          {/* Address */}
                          <p style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '6px', margin: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8', marginTop: '1px' }}>location_on</span> 
                            <span style={{ flex: 1, lineHeight: '1.4' }}>{guardian.address || "No address provided"}</span>
                          </p>
                          
                        </div>
                        {/* -------------------------------------- */}

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}