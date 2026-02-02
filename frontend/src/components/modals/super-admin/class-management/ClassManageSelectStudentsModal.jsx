import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import "../../../../styles/super-admin/class-manage-modal/class-manage-select-students-modal.css";
import ClassManageAddStudentCard from "./ClassManageAddStudentCard";

export default function ClassManageSelectStudentModal({ isOpen, onClose, maxCapacity, onSave, initialSelected }) {
  const [studentList, setStudentList] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialSelected || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelected || []);
    }
  }, [isOpen, initialSelected]);
  
  useEffect(() => {
    if (isOpen) {
      const fetchStudents = async () => {
        setLoading(true);
        try {
          const response = await axios.get('http://localhost:3000/api/students', { withCredentials: true });
          if (response.data.success) {
            setStudentList(response.data.students || []); 
          }
        } catch (err) {
          console.error("Fetch error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [isOpen]);

  const handleToggle = (id) => {
    setSelectedIds(prev => {
      const isAlreadySelected = prev.includes(id);
      
      // If adding a new one, check if we've hit the limit
      if (!isAlreadySelected && maxCapacity && prev.length >= parseInt(maxCapacity)) {
        alert(`Limit reached! This class only allows ${maxCapacity} students.`);
        return prev;
      }

      return isAlreadySelected 
        ? prev.filter(item => item !== id) 
        : [...prev, id];
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* No Logic Yet soon to be implemented */}
      <div className="modal-overlay active " id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">checklist</span>
              <div>
                <h2 className="text-cdark text-[18px] font-bold mb-0.5">Select Students</h2>
                <p className="text-cgray text-[12px] font-normal m-0">
                  Selected: <span id="currentSelectionCount">{selectedIds.length}</span> / 
                  <span id="maxCapacityDisplay"> {maxCapacity || ''}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="modal-body pb-0">
            <div className="search-bar-small">
              <span className="material-symbols-outlined">search</span>
              <input type="text" id="enrollmentSearchInput" placeholder="Search student name..." />
            </div>

            <div className="max-h-[300px] flex flex-col gap-1.5 overflow-y-auto mt-2.5" id="enrollmentChecklistContainer">
              {loading ? (
                <p className="text-center py-10 text-slate-400 text-sm">Loading students...</p>
              ) : (
                studentList.map(student => (
                  <ClassManageAddStudentCard 
                    key={student._id}
                    student={student}
                    isSelected={selectedIds.includes(student.student_id)}
                    onToggle={handleToggle}
                  />
                ))
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-save" onClick={() => onSave(selectedIds)}>
              Done
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}