import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- IMPORT YOUR NEW MODALS HERE ---
// Adjust these paths depending on where your modal components are located!
import ConfirmModal from '../../../ConfirmModal'; 
import SuccessModal from '../../../SuccessModal';
import WarningModal from '../../../WarningModal';

export default function AdminEmergencyBroadcastModal({ isOpen, onClose }) {
  const [recipientMode, setRecipientMode] = useState('all'); // 'all' or 'specific'
  const [messageType, setMessageType] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // States for Students & CC Search logic
  const [students, setStudents] = useState([]);
  const [selectedStudentObjects, setSelectedStudentObjects] = useState([]); 
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // States for Custom Modals
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningTitle, setWarningTitle] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Quick Templates
  const templates = {
    medical: "EMERGENCY: There is a medical situation at the school. Please check your Lumini App for immediate updates regarding your child.",
    weather: "ALERT: Severe weather warning. The school is initiating emergency dismissal protocols. Please proceed to the pickup area safely.",
    evacuation: "URGENT: School is being evacuated to the designated safe zone. All students are accounted for. Await further instructions.",
    others: "" 
  };

  // Fetch students when modal opens
  useEffect(() => {
    if (isOpen) {
        const fetchMyStudents = async () => {
          setIsLoadingStudents(true);
          try {
              const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/teacher/students`, { withCredentials: true });
              if (res.data.success) {
                  setStudents(res.data.students || []);
              }
          } catch (err) {
              console.error("Failed to fetch students", err);
          } finally {
              setIsLoadingStudents(false);
          }
        };
        fetchMyStudents();
    } else {
        // Reset states when closed
        setRecipientMode('all');
        setMessageType('');
        setCustomMessage('');
        setSelectedStudentObjects([]);
        setSearchQuery('');
        setShowDropdown(false);
        setShowConfirm(false);
        setShowSuccess(false);
        setShowWarning(false);
    }
  }, [isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
            searchInputRef.current && !searchInputRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleTemplateSelect = (type) => {
    setMessageType(type);
    setCustomMessage(templates[type] || '');
  };

  // CC Logic: Add student
  const addStudent = (student) => {
    setSelectedStudentObjects(prev => [...prev, student]);
    setSearchQuery('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // CC Logic: Remove student
  const removeStudent = (studentId) => {
    setSelectedStudentObjects(prev => prev.filter(s => s.student_id !== studentId));
  };

  // Filter available students for the dropdown
  const availableStudents = students.filter(s => 
    !selectedStudentObjects.some(sel => sel.student_id === s.student_id) &&
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // STEP 1: Validations before showing the Confirm Modal
  const triggerDispatch = () => {
    const targetStudentIds = recipientMode === 'all' 
      ? students.map(s => s.student_id) 
      : selectedStudentObjects.map(s => s.student_id);

    if (targetStudentIds.length === 0) {
      setWarningTitle("No Recipients Selected");
      setWarningMessage(recipientMode === 'all' ? "You have no students in your classes." : "Please select at least one student from the list.");
      setShowWarning(true);
      return;
    }

    if (!customMessage.trim()) {
      setWarningTitle("Empty Message");
      setWarningMessage("Please enter an emergency message to broadcast.");
      setShowWarning(true);
      return;
    }

    // If all is well, open the Confirmation Modal
    setShowConfirm(true);
  };

  // STEP 2: Actual API Execution (Triggered by Confirm Modal)
  const executeBroadcast = async () => {
    const targetStudentIds = recipientMode === 'all' 
      ? students.map(s => s.student_id) 
      : selectedStudentObjects.map(s => s.student_id);

    setIsSending(true);
    
    try {
      const payload = {
        recipientMode,
        studentIds: targetStudentIds,
        message: customMessage
      };

      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/teacher/emergency-broadcast`, payload, {
        withCredentials: true
      });

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        setShowSuccess(true);
      }

    } catch (error) {
      console.error("Broadcast Failed:", error);
      setWarningTitle("Broadcast Failed");
      setWarningMessage(error.response?.data?.error || "Failed to dispatch the emergency broadcast. Please try again.");
      setShowWarning(true);
    } finally {
      setIsSending(false);
    }
  };

  // STEP 3: Handle Final Close
  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onClose(); // Closes the main parent modal too
  };

  return (
    <>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={!isSending ? onClose : undefined}>
        <div className="bg-white rounded-3xl w-full max-w-[600px] overflow-hidden shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
          
          {/* --- HEADER --- */}
          <div className="bg-[#ef4444] p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[28px] text-white">warning</span>
                <h2 className="text-[20px] sm:text-[22px] font-black tracking-tight m-0" style={{ color: 'white' }}>Emergency Broadcast</h2>
              </div>
              <p className="text-[13px] sm:text-[14px] font-medium m-0 max-w-[90%] sm:max-w-[85%]" style={{ color: 'white', opacity: 0.9 }}>
                Send an immediate SMS alert to parents for critical situations.
              </p>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -top-4 text-[120px] text-white opacity-10 pointer-events-none select-none">
              campaign
            </span>
          </div>

          {/* --- BODY --- */}
          <div className="p-5 sm:p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
            {/* Target Audience */}
            <div className="flex flex-col gap-3">
              <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">1. Select Recipients</label>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full mb-1">
                <button 
                  type="button"
                  className={`flex-1 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all focus:outline-none ring-1 ring-inset ${recipientMode === 'all' ? 'bg-white text-red-600 shadow-sm ring-slate-200' : 'ring-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setRecipientMode('all')}
                >
                  All Parents in Class
                </button>
                <button 
                  type="button"
                  className={`flex-1 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all focus:outline-none ring-1 ring-inset ${recipientMode === 'specific' ? 'bg-white text-red-600 shadow-sm ring-slate-200' : 'ring-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setRecipientMode('specific')}
                >
                  Specific Students
                </button>
              </div>
              
              {/* --- GMAIL CC STYLE SEARCH INPUT --- */}
              {recipientMode === 'specific' && (
                <div className="relative">
                  <div 
                    className={`min-h-[46px] w-full bg-white border rounded-xl flex flex-wrap items-center gap-1.5 p-1.5 transition-all cursor-text ${showDropdown ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={() => { searchInputRef.current?.focus(); setShowDropdown(true); }}
                  >
                    {/* Selected Chips */}
                    {selectedStudentObjects.map(student => (
                      <span key={student.student_id} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md text-[13px] font-semibold animate-[fadeIn_0.2s_ease-out]">
                        {student.first_name} {student.last_name}
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); removeStudent(student.student_id); }}
                          className="flex items-center justify-center w-[15px] h-[15px] ml-1 rounded-full bg-blue-600 text-white hover:bg-blue-800 transition-colors focus:outline-none"
                        >
                          <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                        </button>
                      </span>
                    ))}

                    {/* Search Input */}
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder={selectedStudentObjects.length === 0 ? "Search for a student..." : ""}
                      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[13px] sm:text-[14px] text-slate-800 p-1 placeholder:text-slate-400"
                      disabled={isLoadingStudents}
                    />
                    {isLoadingStudents && <span className="material-symbols-outlined animate-spin text-slate-400 text-[18px] pr-2">sync</span>}
                  </div>

                  {/* Dropdown Suggestions */}
                  {showDropdown && !isLoadingStudents && (
                    <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {availableStudents.length > 0 ? (
                        <ul className="flex flex-col py-1">
                          {availableStudents.map(student => (
                            <li 
                              key={student.student_id} 
                              onClick={() => addStudent(student)}
                              className="flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors text-[13px] sm:text-[14px] text-slate-700"
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                                <span className="material-symbols-outlined text-[16px]">person</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{student.first_name} {student.last_name}</span>
                                <span className="text-[11px] text-slate-400 font-medium">ID: {student.student_id}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-[13px] text-slate-500 font-medium">
                          {searchQuery ? "No matching students found." : "All students selected."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Templates */}
            <div className="flex flex-col gap-3">
              <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">2. Select Message Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  type="button"
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'medical' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                  onClick={() => handleTemplateSelect('medical')}
                >
                  <span className={`material-symbols-outlined text-[20px] ${messageType === 'medical' ? 'text-red-500' : 'text-slate-400'}`}>medical_services</span>
                  <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'medical' ? 'text-red-700' : 'text-slate-700'}`}>Medical Situation</span>
                </button>
                
                <button 
                  type="button"
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'weather' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                  onClick={() => handleTemplateSelect('weather')}
                >
                  <span className={`material-symbols-outlined text-[20px] ${messageType === 'weather' ? 'text-red-500' : 'text-slate-400'}`}>storm</span>
                  <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'weather' ? 'text-red-700' : 'text-slate-700'}`}>Weather Alert</span>
                </button>

                <button 
                  type="button"
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'evacuation' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                  onClick={() => handleTemplateSelect('evacuation')}
                >
                  <span className={`material-symbols-outlined text-[20px] ${messageType === 'evacuation' ? 'text-red-500' : 'text-slate-400'}`}>directions_run</span>
                  <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'evacuation' ? 'text-red-700' : 'text-slate-700'}`}>Evacuation</span>
                </button>

                <button 
                  type="button"
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'others' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                  onClick={() => handleTemplateSelect('others')}
                >
                  <span className={`material-symbols-outlined text-[20px] ${messageType === 'others' ? 'text-red-500' : 'text-slate-400'}`}>edit_square</span>
                  <div className="flex flex-col">
                    <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'others' ? 'text-red-700' : 'text-slate-700'}`}>
                      Others
                    </span>
                    <span className={`text-[10px] font-medium tracking-tight mt-0.5 leading-tight ${messageType === 'others' ? 'text-red-500/90' : 'text-slate-400'}`}>
                      (Please specify below)
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Message Area */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                  <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">3. Review Message</label>
                  <span className="text-[11px] sm:text-[12px] text-slate-400 font-medium">{customMessage.length}/160</span>
              </div>
              <textarea 
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Select a template or type your emergency message here..."
                className="w-full h-32 p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl text-[13px] sm:text-[14px] text-slate-800 outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50 transition-all resize-none"
              />
            </div>

          </div>

          {/* --- FOOTER --- */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 bg-slate-50">
            <button 
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-[14px] font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors focus:outline-none"
              disabled={isSending}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={triggerDispatch}
              disabled={isSending}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-[14px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-red-200 focus:outline-none"
            >
              {isSending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    Broadcasting...
                  </>
              ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Dispatch SMS Alert
                  </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- MOUNT CUSTOM MODALS HERE --- */}
      
      <ConfirmModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeBroadcast}
        title="Dispatch Emergency Broadcast?"
        message={`You are about to send an SMS alert to ${recipientMode === 'all' ? 'all parents in your classes' : 'the parents of the selected students'}. Do you want to proceed?`}
        confirmText="Yes, Send Alert"
        cancelText="Cancel"
        isDestructive={true} // Will use your red styling
      />

      <SuccessModal 
        isOpen={showSuccess}
        onClose={handleCloseSuccess}
        message={successMessage}
      />

      <WarningModal 
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        title={warningTitle}
        message={warningMessage}
      />
    </>
  );
}