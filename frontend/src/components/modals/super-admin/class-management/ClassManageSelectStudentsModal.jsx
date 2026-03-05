import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import ClassManageAddStudentCard from "./ClassManageAddStudentCard";
import WarningModal from '../../../WarningModal'; 
import "../../../../styles/super-admin/class-manage-modal/class-manage-select-students-modal.css";

export default function ClassManageSelectStudentModal({ isOpen, onClose, maxCapacity, onSave, initialSelected, sectionId}) {
  const [studentList, setStudentList] = useState([]);
  const [filteredList, setFilteredList] = useState([]); // For search functionality
  const [selectedIds, setSelectedIds] = useState(initialSelected || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // --- WARNING MODAL STATE ---
  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelected || []);
      setSearchQuery(""); // Reset search on open
    }
  }, [isOpen, initialSelected]);
  
  useEffect(() => {
    if (isOpen) {
      const fetchStudents = async () => {
        setLoading(true);
        try {
          const idToPass = (sectionId !== undefined && sectionId !== null) ? sectionId : '';
          
          const response = await axios.get(
            `http://localhost:3000/api/students/available?editingSectionId=${idToPass}`, 
            { withCredentials: true }
          );
          
          if (response.data.success) {
            const students = response.data.students || [];
            setStudentList(students); 
            setFilteredList(students);
          }
        } catch (err) {
          console.error("Fetch error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [isOpen, sectionId]);

  // Handle Search Filtering
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredList(studentList);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = studentList.filter(student => 
        (student.first_name && student.first_name.toLowerCase().includes(lowerQuery)) ||
        (student.last_name && student.last_name.toLowerCase().includes(lowerQuery)) ||
        (student.student_id && String(student.student_id).toLowerCase().includes(lowerQuery))
      );
      setFilteredList(filtered);
    }
  }, [searchQuery, studentList]);

  const handleToggle = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        if (maxCapacity && prev.length >= parseInt(maxCapacity)) {
          setWarningConfig({
            isOpen: true,
            title: "Capacity Reached",
            message: `You cannot select more than ${maxCapacity} students for this class.`
          });
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <WarningModal 
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })}
        title={warningConfig.title}
        message={warningConfig.message}
      />

      <div className="modal-overlay active flex justify-center items-center p-4 z-[9999]" id="selectStudentModal" onClick={onClose}>
        <div 
          className="bg-white rounded-3xl w-full max-w-[480px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[85vh]" 
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* --- MODERN SLIM SCROLLBAR STYLES --- */}
          <style>
            {`
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px; 
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent; 
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #cbd5e1; 
                border-radius: 10px; 
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: #94a3b8; 
              }
            `}
          </style>

          {/* --- HEADER --- */}
          <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-4 shrink-0 border-b border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb] text-[26px]">checklist</span>
                <h2 className="text-[20px] font-extrabold text-[#1e293b]">Select Students</h2>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search Bar & Capacity Badge */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">search</span>
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[#1e293b] text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:bg-white transition-all placeholder:font-normal placeholder:text-slate-400" 
                  placeholder="Search name or ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={`px-3 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1 border shrink-0 ${
                selectedIds.length === parseInt(maxCapacity) 
                  ? 'bg-red-50 text-red-600 border-red-200' 
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                {selectedIds.length} <span className="font-medium opacity-70">/</span> {maxCapacity || '∞'}
              </div>
            </div>
          </div>

          {/* --- SCROLLABLE LIST --- */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-8 py-2">
            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-sm font-medium">Loading available students...</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="material-symbols-outlined text-[48px] text-slate-200 mb-2">person_off</span>
                  <p className="text-slate-500 text-[14px] font-medium">No students found.</p>
                </div>
              ) : (
                filteredList.map(student => (
                  <ClassManageAddStudentCard 
                    key={student._id || student.student_id}
                    student={student}
                    isSelected={selectedIds.includes(student.student_id)}
                    onToggle={() => handleToggle(student.student_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* --- FOOTER --- */}
          <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 border-t border-slate-100 flex gap-4 w-full shrink-0">
            <button 
              type="button" 
              className="flex-1 bg-white border-2 border-[#cbd5e1] text-[#64748b] hover:bg-[#f8fafc] hover:text-[#475569] font-bold py-2.5 rounded-xl transition-all active:scale-95 text-[14px] flex justify-center items-center" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[14px] flex justify-center items-center" 
              onClick={() => onSave(selectedIds)}
            >
              Save Selection
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}