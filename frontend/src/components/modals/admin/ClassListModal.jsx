import React, { useState } from "react";
import "../../../styles/teacher/class-list-modal.css";
import StudentDetailsModal from "./StudentDetailsModal";

export default function ClassListModal({ isOpen, onClose, section }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  if (!isOpen) return null;

  return (
    <div className="class-modal-overlay" onClick={onClose}>
      <div className="class-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="class-modal-header">
          <div>
            <h3>{section?.name || "Class List"}</h3>
            <p>
              <span className="material-symbols-outlined">schedule</span>
              {section?.time || "Time not set"}
            </p>
          </div>
          <button className="class-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search Bar (Optional future feature, but good for UI) */}
        <div className="class-modal-search">
          <span className="material-symbols-outlined search-icon">search</span>
          <input type="text" placeholder="Search student..." />
        </div>

        {/* Student List */}
        <div className="class-modal-body">
          <div className="student-list-container">
            {/* If there are no students, show a message, otherwise map the real students! */}
            {!section?.students || section.students.length === 0 ? (
              <p style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>No students enrolled yet.</p>
            ) : (
              section.students.map((student, index) => (
                <div 
                  key={student.id} 
                  className="student-list-item clickable" // Added 'clickable' class
                  onClick={() => setSelectedStudent(student)} // Set state on click
                >
                  <div className="student-number-circle">
                    {index + 1}
                  </div>
                  <div className="student-info">
                    <span className="student-name">{student.name}</span>
                    <span className="student-id">ID: {student.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>

      {/* --- ADD THIS AT THE BOTTOM, JUST BEFORE THE LAST CLOSING DIV --- */}
      <StudentDetailsModal 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        student={selectedStudent} 
      />
    </div>
  );
}