import React from "react";
import "../../../styles/teacher/class-list-modal.css";

export default function StudentDetailsModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  // Temporary Dummy Data until we wire the backend
  const dummyInfo = {
    age: 6,
    gender: "Female",
    address: "123 Sun Valley, Parañaque City",
    guardians: [
      { name: "Maria Clara", relation: "Mother", contact: "09123456789" },
      { name: "Juan Dela Cruz", relation: "Father", contact: "09987654321" },
    ],
  };

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
            <div className="student-avatar-large">
              <span className="material-symbols-outlined">person</span>
            </div>
            <h2>{student.name}</h2>
            <p>ID: {student.id}</p>
          </div>

          {/* Middle: Personal Info */}
          <div className="student-info-section">
            <h4>Personal Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Age</span>
                <span className="info-value">{dummyInfo.age} yrs old</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{dummyInfo.gender}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Address</span>
                <span className="info-value">{dummyInfo.address}</span>
              </div>
            </div>
          </div>

          {/* Bottom: Guardians */}
          <div className="student-info-section">
            <h4>Guardians</h4>
            <div className="guardian-list">
              {dummyInfo.guardians.map((guardian, index) => (
                <div key={index} className="guardian-card">
                  <div className="guardian-icon">
                    <span className="material-symbols-outlined">family_restroom</span>
                  </div>
                  <div className="guardian-details">
                    <p className="guardian-name">{guardian.name}</p>
                    <p className="guardian-relation">
                      {guardian.relation} • {guardian.contact}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}