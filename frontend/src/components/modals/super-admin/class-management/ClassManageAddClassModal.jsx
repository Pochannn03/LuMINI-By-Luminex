import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { validateClassRegistrationStep } from '../../../../utils/class-manage-modal/classModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import axios from 'axios';
import ClassManageSelectStudentModal from '../class-management/ClassManageSelectStudentsModal';
import WarningModal from '../../../WarningModal'; 
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ClassManageAddClassModal({ isOpen, onClose, onSuccess }) {
  // DATA STATES
  const [step, setStep] = useState(1); 
  const [teachersList, setTeachersList] = useState([]);  
  const [isEnrollStudents, setIsEnrollStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    sectionName: '',
    classSchedule: '',
    maxCapacity: '',
    description: '',
    assignedTeacher: '',
  });

  // --- CUSTOM DROPDOWN STATES ---
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isTeacherOpen, setIsTeacherOpen] = useState(false);
  const scheduleRef = useRef(null);
  const teacherRef = useRef(null);

  // --- WARNING MODAL STATE ---
  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  // Click outside listener for custom dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (scheduleRef.current && !scheduleRef.current.contains(event.target)) setIsScheduleOpen(false);
      if (teacherRef.current && !teacherRef.current.contains(event.target)) setIsTeacherOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if(isOpen){
      const fetchTeachers = async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/teachers`, {
            withCredentials: true
          });
          if (response.data.success) {
            setTeachersList(response.data.teachers); 
          } else {
            setTeachersList([]);
          }
        } catch (err) {
          console.error("Failed to fetch teachers preview", err);
        }
      }
      fetchTeachers();
    }
  },[isOpen]);

  // HELPERS
  const resetForm = () => {
    setFormData({
      sectionName: '',
      classSchedule: '',
      maxCapacity: '',
      description: '',
      assignedTeacher: '',
    });
    setErrors({});
    setSelectedStudentIds([]);
    setStep(1); 
    setIsScheduleOpen(false);
    setIsTeacherOpen(false);
  };

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  // VALIDATION FOR STEP 1 ONLY
  const handleNextStep = () => {
    const allErrors = validateClassRegistrationStep(formData);
    const step1Errors = {};
    ['sectionName', 'classSchedule', 'maxCapacity'].forEach(field => {
      if (allErrors[field]) step1Errors[field] = allErrors[field];
    });
    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors);
      return;
    }
    setErrors({});
    setStep(2); 
  };

  // FULL FORM VALIDATION FOR STEP 2
  const validateFullForm = () => {
    const newErrors = validateClassRegistrationStep(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // HANDLERS
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleDropdownSelect = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleConfirmSelection = (ids) => {
    setSelectedStudentIds(ids);
    setIsEnrollStudents(false); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFullForm()) return;

    setLoading(true);
    const payload = {
      section_name: formData.sectionName,
      class_schedule: formData.classSchedule,
      max_capacity: formData.maxCapacity,
      description: formData.description,
      user_id: formData.assignedTeacher,
      student_id: selectedStudentIds,
    };

    try {
      await axios.post(`${BACKEND_URL}/api/sections`, payload, { withCredentials: true });
      if (onSuccess) onSuccess("Class created successfully!"); 
      handleCloseModal();
    } catch (error) {
      console.error("Crash Details:", error);
      if (error.response && error.response.status === 409) {
        const backendMsg = error.response.data.msg || "A conflict occurred.";
        setWarningConfig({ isOpen: true, title: "Oops...", message: backendMsg });
      } else if (error.response) {
        const errorMsg = error.response.data.msg || error.response.data.error || "Failed to create class";
        const detailedError = error.response.data.errors ? error.response.data.errors[0].msg : errorMsg;
        setWarningConfig({ isOpen: true, title: "Registration Failed", message: detailedError });
      } else if (error.request) {
        setWarningConfig({ isOpen: true, title: "Network Error", message: "Could not connect to the server. Is the backend running?" });
      } else {
        setWarningConfig({ isOpen: true, title: "System Error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const scheduleOptions = ["Morning", "Afternoon"];
  const selectedTeacher = teachersList.find(t => String(t.user_id) === String(formData.assignedTeacher));

  if (!isOpen) return null;
  
  return createPortal(
    <>
      <WarningModal 
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })}
        title={warningConfig.title}
        message={warningConfig.message}
      />

      <div className="modal-overlay active flex justify-center items-center p-4 z-[9990]" id="addClassModal" onClick={handleCloseModal}>
        <form 
          className="bg-white rounded-3xl w-full max-w-[500px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[95vh]" 
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
        >
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar pr-4">
            
            <style>{`
              .custom-scrollbar::-webkit-scrollbar { width: 5px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
            `}</style>

            {/* --- HEADER --- */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563eb] text-[26px]">add_circle</span>
                  <h2 className="text-[20px] font-extrabold text-[#1e293b]">Create New Class</h2>
                </div>
                <p className="text-[12px]! text-[#64748b] font-medium mt-1 ml-[34px]">
                  Step {step} of 2: {step === 1 ? 'Class Information' : 'Assignments'}
                </p>
              </div>
              <button 
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-500 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* ==========================================
                STEP 1: CLASS INFORMATION
                ========================================== */}
            {step === 1 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                  <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#cbd5e1]">info</span> 
                    Class Details
                  </h4>
                  
                  <div className="flex flex-col gap-4">
                    <FormInputRegistration
                      label='Section Name'
                      name="sectionName"
                      value={formData.sectionName}
                      onChange={handleChange}
                      placeholder="e.g. Sunflower"
                      error={errors.sectionName}
                      className="form-input-modal"
                    />

                    <div className="flex gap-4">
                      {/* CLASS SCHEDULE CUSTOM DROPDOWN */}
                      <div className="flex flex-col gap-1 w-1/2">
                        <label className="text-[13px] font-semibold text-[#64748b] tracking-wide">
                          Class Schedule <span className="text-[#39a8ed]">*</span>
                        </label>
                        <div className="relative" ref={scheduleRef}>
                          <button
                            type="button"
                            onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                            className={`flex items-center justify-between w-full h-[42px] px-3 rounded-xl border bg-slate-50 text-[13px] font-medium transition-all focus:outline-none ${
                              errors.classSchedule
                                ? 'border-red-500 bg-red-50'
                                : isScheduleOpen
                                ? 'border-[#2563eb] ring-2 ring-blue-500/10 bg-white'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={formData.classSchedule ? 'text-slate-800' : 'text-slate-400'}>
                              {formData.classSchedule || 'Select Schedule'}
                            </span>
                            <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 ${isScheduleOpen ? 'rotate-180 text-[#2563eb]' : ''}`}>
                              expand_more
                            </span>
                          </button>

                          {isScheduleOpen && (
                            <div className="absolute top-[46px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 animate-[fadeIn_0.2s_ease-out]">
                              {scheduleOptions.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[#2563eb] transition-colors"
                                  onClick={() => { handleDropdownSelect('classSchedule', opt); setIsScheduleOpen(false); }}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors.classSchedule && (
                          <span className="text-red-500 text-[11px]">{errors.classSchedule}</span>
                        )}
                      </div>

                      <div className="w-1/2">
                        <FormInputRegistration 
                          label="Max Capacity"
                          name="maxCapacity"
                          type="number"
                          value={formData.maxCapacity}
                          onChange={handleChange}
                          placeholder="e.g. 30"
                          error={errors.maxCapacity}
                          className="form-input-modal"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#64748b] tracking-wide">Description</label>
                      <textarea
                        name="description"
                        className={`form-input-modal w-full leading-relaxed h-[90px] resize-none ${errors.description ? 'border-red-500 bg-red-50' : ''}`}
                        placeholder="Enter class description..."
                        onChange={handleChange}
                        value={formData.description}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                STEP 2: ASSIGNMENTS
                ========================================== */}
            {step === 2 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                  <h4 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#cbd5e1]">assignment_ind</span> 
                    Assignments
                  </h4>
                  
                  <div className="flex flex-col gap-5">
                    {/* ASSIGN TEACHER CUSTOM DROPDOWN */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#64748b] tracking-wide">
                        Assign Teacher <span className="text-[#39a8ed]">*</span>
                      </label>
                      <div className="relative" ref={teacherRef}>
                        <button
                          type="button"
                          onClick={() => setIsTeacherOpen(!isTeacherOpen)}
                          className={`flex items-center justify-between w-full h-[42px] px-3 rounded-xl border bg-slate-50 text-[13px] font-medium transition-all focus:outline-none ${
                            errors.assignedTeacher
                              ? 'border-red-500 bg-red-50'
                              : isTeacherOpen
                              ? 'border-[#2563eb] ring-2 ring-blue-500/10 bg-white'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={selectedTeacher ? 'text-slate-800' : 'text-slate-400'}>
                            {selectedTeacher
                              ? `${selectedTeacher.last_name}, ${selectedTeacher.first_name}`
                              : 'Select a Teacher'}
                          </span>
                          <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 ${isTeacherOpen ? 'rotate-180 text-[#2563eb]' : ''}`}>
                            expand_more
                          </span>
                        </button>

                        {isTeacherOpen && (
                          <div className="absolute top-[46px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 flex flex-col gap-0.5 max-h-[200px] overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                            {teachersList.length > 0 ? (
                              teachersList.map((teacher) => (
                                <button
                                  key={teacher.user_id}
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-[#2563eb] transition-colors"
                                  onClick={() => { handleDropdownSelect('assignedTeacher', String(teacher.user_id)); setIsTeacherOpen(false); }}
                                >
                                  {teacher.last_name}, {teacher.first_name}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2.5 text-[13px] text-slate-400">Loading teachers...</div>
                            )}
                          </div>
                        )}
                      </div>
                      {errors.assignedTeacher && (
                        <span className="text-red-500 text-[11px]">{errors.assignedTeacher}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#64748b] tracking-wide">Enroll Students</label>
                      <div className="flex items-center justify-between bg-[#f8fafc] p-3.5 border border-[#e2e8f0] rounded-xl transition-all hover:border-[#cbd5e1]">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#eff6ff] text-[#2563eb] w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[20px]">groups</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#1e293b] font-bold text-[14px] leading-tight">{selectedStudentIds.length} Selected</span>
                            <span className="text-[#64748b] text-[11px] font-medium mt-0.5">Capacity Limit applies</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="bg-white border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9] hover:text-[#1e293b] font-bold px-4 py-2 rounded-lg transition-colors text-[12px] shadow-sm active:scale-95"
                          onClick={() => setIsEnrollStudents(true)}
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- FOOTER BUTTONS --- */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex gap-4 w-full">
              {step === 1 ? (
                <>
                  <button 
                    type="button" 
                    className="flex-1 bg-white border-2 border-[#2ecc71] text-[#2ecc71] hover:bg-[#f0fdf4] font-bold py-2.5 rounded-xl transition-all active:scale-95 text-[14px] flex justify-center items-center" 
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[14px] flex justify-center items-center gap-1.5" 
                    onClick={handleNextStep}
                  >
                    Next
                  </button>
                </>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="flex-1 bg-white border-2 border-[#2ecc71] text-[#2ecc71] hover:bg-[#f0fdf4] font-bold py-2.5 rounded-xl transition-all active:scale-95 text-[14px] flex justify-center items-center" 
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[14px] flex justify-center items-center" 
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Add Class"}
                  </button>
                </>
              )}
            </div>

          </div>
        </form>
      </div>
      
      <ClassManageSelectStudentModal 
        isOpen={isEnrollStudents}
        onClose={() => setIsEnrollStudents(false)}
        maxCapacity={formData.maxCapacity}
        onSave={handleConfirmSelection}
        initialSelected={selectedStudentIds}
      />
    </>,
    document.body
  );
}