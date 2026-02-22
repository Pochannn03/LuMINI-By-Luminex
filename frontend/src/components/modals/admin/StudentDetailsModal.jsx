import React from "react";
import "../../../styles/teacher/class-list-modal.css";

// --- ADDED IMAGE HELPER ---
const BACKEND_URL = "http://localhost:3000";

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
  if (!isOpen || !student) return null;

  return (
    // Note the inline z-index: 10000 to ensure it sits ON TOP of the previous modal
    <div className="class-modal-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="class-modal-card student-details-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="class-modal-header">
          <div>
            <h3>Student Profile</h3>
          </div>
          <button className="class-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">arrow_back</span>
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
            <p>ID: {student.id}</p>
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
              {!student.guardians || student.guardians.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>No guardians linked.</p>
              ) : (
                student.guardians.map((guardian, index) => {
                  const guardianName = `${guardian.first_name} ${guardian.last_name}`;
                  return (
                    <div key={index} className="guardian-card">
                      <div className="guardian-icon" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'transparent' }}>
                        <img 
                          src={getImageUrl(guardian.profile_picture, guardianName)} 
                          alt={guardianName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      </div>
                      <div className="guardian-details">
                        <p className="guardian-name">{guardianName}</p>
                        <p className="guardian-relation">
                          {guardian.relationship || "Guardian"} • {guardian.phone_number || "No contact"}
                        </p>
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