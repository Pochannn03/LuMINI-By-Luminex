import React, {useState, useEffect} from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import { validateClassRegistrationStep } from '../../../../utils/class-manage-modal/classModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css';
import ClassManageSelectStudentModal from "./ClassManageSelectStudentsModal";
import WarningModal from '../../../WarningModal'; 

export default function ClassManageEditClassModal({ isOpen, onClose, classData, onSuccess }) {
  // STATES
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [teachersList, setTeachersList] = useState([]);
  const [errors, setErrors] = useState({});
  const [isEnrollStudents, setIsEnrollStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  
  // --- WARNING MODAL STATE ---
  const [warningConfig, setWarningConfig] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  // STATE FORM
  const [formData, setFormData] = useState({
    sectionName: '',
    classSchedule: 'Morning',
    maxCapacity: 30,
    description: '',
    assignedTeacher: '',
    studentIds: [] 
  });

  // 1. Fetch Teachers List (Run once when modal opens)
  useEffect(() => {
    if (isOpen) {
      axios.get('http://localhost:3000/api/teachers', { withCredentials: true })
        .then(res => {
          if (res.data && res.data.success) {
            setTeachersList(res.data.teachers); 
          } else {
            setTeachersList([]);
          }
        })
        .catch(err => console.error("Failed to load teachers", err));
    }
  }, [isOpen]);

  // 2. Load Class Data when Modal Opens
  useEffect(() => {
    if (classData && isOpen) {
      setFormData({
        sectionName: classData.section_name || '',
        classSchedule: classData.class_schedule || 'Morning',
        maxCapacity: classData.max_capacity || 30,
        description: classData.description || '',
        assignedTeacher: classData.user_details ? classData.user_details.user_id : (classData.user_id || ''),
        studentIds: classData.students || [] 
      });

      // --- SANITIZE STUDENT IDs ---
      const rawStudents = classData.student_details || classData.students || classData.student_id || [];
      
      const cleanIds = rawStudents.map(item => {
        if (typeof item === 'object' && item !== null && item.student_id) {
          return String(item.student_id);
        }
        return String(item);
      }).filter(id => /^\d{4}-\d{4}$/.test(id)); // STRICTLY enforce YYYY-XXXX format

      setSelectedStudentIds(cleanIds);
      setErrors({});
      setStep(1); // Always reset to step 1 when opening
    }
  }, [classData, isOpen]);

  // HANDLERS
  const handleCloseModal = () => {
    setStep(1);
    setErrors({});
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleConfirmSelection = (ids) => {
    setSelectedStudentIds(ids);
    setIsEnrollStudents(false); 
  };

  // --- VALIDATION FOR STEP 1 ONLY ---
  const handleNextStep = (e) => {
    if (e) e.preventDefault(); 

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trap Enter key presses on Step 1
    if (step === 1) {
      handleNextStep();
      return;
    }

    if (!validateFullForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        section_name: formData.sectionName,
        class_schedule: formData.classSchedule,
        max_capacity: Number(formData.maxCapacity),
        description: formData.description,
        user_id: Number(formData.assignedTeacher),
        student_id: selectedStudentIds.filter(id => /^\d{4}-\d{4}$/.test(id)),
      };

      const response = await axios.put(`http://localhost:3000/api/sections/${classData._id}`, payload, {
        withCredentials: true
      });

      if (response.data.success) {
        onSuccess(response.data.msg); 
      }
      handleCloseModal();

    } catch (error) {
      console.error("Backend Rejection Details:", error.response?.data);
      
      if (error.response && error.response.status === 409) {
        setWarningConfig({
          isOpen: true,
          title: "Oops...",
          message: error.response.data.msg || "A conflict occurred."
        });
      } else {
        const specificError = error.response?.data?.errors?.[0]?.msg 
                           || error.response?.data?.msg 
                           || "Failed to update class.";
        setWarningConfig({
          isOpen: true,
          title: "Update Failed",
          message: specificError
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !classData) return null;

  return createPortal(
    <>
      <WarningModal 
        isOpen={warningConfig.isOpen}
        onClose={() => setWarningConfig({ ...warningConfig, isOpen: false })}
        title={warningConfig.title}
        message={warningConfig.message}
      />

      <div className="modal-overlay active flex justify-center items-center p-4 z-[9990]" id="editClassModal" onClick={handleCloseModal}>
        <form 
          className="bg-white rounded-3xl w-full max-w-[500px] relative overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]" 
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
        >
          
          {/* --- MODERN SLIM SCROLLBAR STYLES --- */}
          <style>
            {`
              .custom-scrollbar::-webkit-scrollbar {
                width: 5px; 
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

          {/* --- HEADER (Fixed Top) --- */}
          <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-4 flex items-start justify-between shrink-0 border-b border-transparent">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563eb] text-[24px]">edit_square</span>
                <h2 className="text-[20px] font-extrabold text-[#1e293b]">Edit Class Details</h2>
              </div>
              <p className="text-[12px] text-[#64748b] font-medium mt-1 ml-[32px]">
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

          {/* --- SCROLLABLE BODY (Middle) --- */}
          {/* The padding is inside the scrollable container to prevent right-side alignment glitches */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-6 sm:px-8 pb-2 pt-1">
              
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
                        <div className="flex flex-col w-1/2">
                          {/* Pixel-perfect label margin applied here */}
                          <label className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">
                            Class Schedule <span className="text-[#39a8ed]">*</span>
                          </label>
                          <div className="relative">
                            <select 
                              className={`form-input-modal w-full appearance-none pr-10 ${errors.classSchedule ? 'border-red-500 bg-red-50' : ''}`} 
                              name="classSchedule" 
                              onChange={handleChange} 
                              value={formData.classSchedule}
                            >
                              <option value="Morning">Morning (8:00 AM - 11:30 AM)</option>
                              <option value="Afternoon">Afternoon (1:00 PM - 4:30 PM)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                          </div>
                          {errors.classSchedule && <span className="text-red-500 text-[11px] mt-1">{errors.classSchedule}</span>}
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

                      <div className="flex flex-col">
                        <label className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">Description</label>
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
                      <div className="flex flex-col">
                        <label className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">
                          Assign Teacher <span className="text-[#39a8ed]">*</span>
                        </label>
                        <div className="relative">
                          <select 
                            className={`form-input-modal w-full appearance-none pr-10 ${errors.assignedTeacher ? 'border-red-500 bg-red-50' : ''}`} 
                            name="assignedTeacher"
                            value={formData.assignedTeacher} 
                            onChange={handleChange}
                          > 
                            <option value="" disabled>Select a Teacher</option>
                            {teachersList.length > 0 ? (
                              teachersList.map((teacher) => (
                                <option key={teacher.user_id} value={teacher.user_id}>
                                  {teacher.last_name}, {teacher.first_name}
                                </option>
                              ))
                            ) : (
                              <option disabled>Loading teachers...</option>
                            )}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                        {errors.assignedTeacher && <span className="text-red-500 text-[11px] mt-1">{errors.assignedTeacher}</span>}
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[13px] font-semibold text-[#64748b] tracking-wide mb-1.5">
                          Manage Students <span className="text-slate-400 font-normal text-[11px] ml-1">(Optional)</span>
                        </label>
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
                            Edit List
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- FOOTER (Fixed Bottom) --- */}
          <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 border-t border-slate-100 flex gap-4 w-full shrink-0">
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
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
      
      <ClassManageSelectStudentModal 
        isOpen={isEnrollStudents}
        onClose={() => setIsEnrollStudents(false)}
        maxCapacity={formData.maxCapacity}
        onSave={handleConfirmSelection}
        initialSelected={selectedStudentIds}
        sectionId={classData?.section_id ?? classData?.sectionId}
      />
    </>,
    document.body
  );
}