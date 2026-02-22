import React, { useState, useMemo, useEffect } from "react";
import "../../../styles/teacher/class-list-modal.css";
import StudentDetailsModal from "./StudentDetailsModal";

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

export default function ClassListModal({ isOpen, onClose, section }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // <-- NEW: Search state

  // Clear search query when modal closes or changes section
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedStudent(null);
    }
  }, [isOpen, section]);

  // --- NEW: FILTER LOGIC ---
  const filteredStudents = useMemo(() => {
    if (!section?.students) return [];
    if (!searchQuery.trim()) return section.students;

    const query = searchQuery.toLowerCase();
    
    return section.students.filter(student => 
      (student.name && student.name.toLowerCase().includes(query)) ||
      (student.id && student.id.toLowerCase().includes(query))
    );
  }, [section?.students, searchQuery]);

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

        {/* --- UPDATED: FUNCTIONAL SEARCH BAR --- */}
        <div className="class-modal-search">
          <span className="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            placeholder="Search student name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Student List */}
        <div className="class-modal-body">
          <div className="student-list-container">
            
            {/* If the filtered array is empty, show appropriate message */}
            {filteredStudents.length === 0 ? (
              <p style={{ textAlign: "center", color: "#64748b", padding: "30px 20px" }}>
                {searchQuery 
                  ? `No students found matching "${searchQuery}"` 
                  : "No students enrolled yet."}
              </p>
            ) : (
              // Map over the FILTERED array instead of the raw section array
              filteredStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="student-list-item clickable" 
                  onClick={() => setSelectedStudent(student)} 
                  style={{ display: 'flex', alignItems: 'center', gap: '14px' }} 
                >
                  
                  {/* AVATAR */}
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <img 
                      src={getImageUrl(student.profile_picture, student.name)} 
                      alt={student.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div className="student-info">
                    <span className="student-name" style={{ fontWeight: '600', color: '#1e293b' }}>{student.name}</span>
                    <span className="student-id" style={{ fontSize: '12px', color: '#64748b' }}>ID: {student.id}</span>
                  </div>
                </div>
              ))
            )}

          </div>
        </div>
        
      </div>

      {/* Student Details Modal */}
      <StudentDetailsModal 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        student={selectedStudent} 
      />
    </div>
  );
}