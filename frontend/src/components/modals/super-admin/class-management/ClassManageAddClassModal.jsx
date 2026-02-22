import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { validateClassRegistrationStep } from '../../../../utils/class-manage-modal/classModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import axios from 'axios';
import ClassManageSelectStudentModal from '../class-management/ClassManageSelectStudentsModal';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css';

export default function ClassManageAddClassModal({ isOpen, onClose, onSuccess }) {
  // DATA STATES
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

  useEffect(() => {
    if(isOpen){
      const fetchTeachers = async () => {
        try {
          const response = await axios.get('http://localhost:3000/api/teachers', {
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
  };

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  // VALIDATION
  const validateStep = () => {
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

  const handleConfirmSelection = (ids) => {
    setSelectedStudentIds(ids);
    setIsEnrollStudents(false); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep()) {
      return;
    }

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
      const response = await axios.post('http://localhost:3000/api/sections', payload, {
        withCredentials: true
      });

      if (onSuccess) {
        onSuccess("Class created successfully!"); 
      }
      handleCloseModal();

    } catch (error) {
      console.error("Crash Details:", error);
      if (error.response) {
        const errorMsg = error.response.data.msg || error.response.data.error || "Failed to create class";
        if (error.response.data.errors) {
          alert(`Validation Error: ${error.response.data.errors[0].msg}`);
        } else {
          alert(`Error: ${errorMsg}`);
        }
      } else if (error.request) {
        alert("Network Error. Is the backend running?");
      } else {
        alert(`Code Error: ${error.message}`); 
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  
  return createPortal(
    <>
      <div className="modal-overlay active" id="addClassModal">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]">add_circle</span>
              <h2 className="text-cdark text-[18px] font-bold">Create New Class</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
              <FormInputRegistration
                label='Section Name'
                name="sectionName"
                value={formData.sectionName}
                onChange={handleChange}
                placeholder="e.g. Sunflower"
                error={errors.sectionName}
                className="form-input-modal"
               />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="classSchedule" className="text-cgray text-[13px] font-medium">Class Schedule</label>
              <div className="relative">
                <select 
                  className="form-input-modal appearance-none" 
                  name="classSchedule" 
                  onChange={handleChange} 
                  value={formData.classSchedule}
                >
                  <option value="" disabled>Select Schedule</option>
                  <option value="Morning">Morning Session (8:00 AM - 11:30 AM)</option>
                  <option value="Afternoon">Afternoon Session (1:00 PM - 4:30 PM)</option>
                </select>
                <span className="material-symbols-outlined select-arrow">expand_more</span>
              </div>
              {errors.classSchedule && <span className="text-red-500 text-[11px] ml-1">{errors.classSchedule}</span>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Max Capacity</label>
              <FormInputRegistration 
                 name="maxCapacity"
                 type="number"
                 value={formData.maxCapacity}
                 onChange={handleChange}
                 placeholder="e.g. 30"
                 error={errors.maxCapacity}
                 className="form-input-modal"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Description</label>
              <textarea
                name="description"
                className="form-input-modal leading-normal h-[100px] resize-none"
                placeholder="Enter class description..."
                onChange={handleChange}
                value={formData.description}
              ></textarea>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Assign Teacher</label>
              <div className="relative">
                <select 
                  className="form-input-modal appearance-none" 
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
                <span className="material-symbols-outlined select-arrow">expand_more</span>
              </div>
              {errors.assignedTeacher && <span className="text-red-500 text-[11px] ml-1">{errors.assignedTeacher}</span>}
            </div>

            <div className="flex flex-col gap-2 mt-2.5">
              <label className="text-cgray text-[13px] font-medium">Enroll Students</label>
              <div className="flex items-center justify-between bg-[#f8fafc] p-4 border border-[#e2e8f0] rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="icon-box-small blue-bg-soft w-9 h-9 text-[18px]">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-cdark font-bold text-[14px]">{selectedStudentIds.length} Selected</span>
                    <span className="text-cgray text-[11px]">Capacity Limit applies</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn bg-white rounded-md border-2 border-(--border-color) hover:text-(--white) hover:bg-(--brand-blue) hover:border-2 hover:border-(--brand-blue) w-auto h-9 px-4 text-xs"
                  onClick={() => setIsEnrollStudents(true)}
                >
                  Select Students
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" type="button" onClick={handleCloseModal}>Cancel</button>
            <button className="btn-save" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Add Class"}
            </button>
          </div>
        </div>
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