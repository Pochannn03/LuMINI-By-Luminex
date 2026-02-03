import React, {useState, useEffect} from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import { validateClassRegistrationStep } from '../../../../utils/modal-validation/classModalValidation';
import FormInputRegistration from '../../../FormInputRegistration';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css';
import ClassManageSelectStudentModal from "./ClassManageSelectStudentsModal";

export default function ClassManageEditClassModal({ isOpen, onClose, classData, onSuccess }) {
  // STATES
  const [loading, setLoading] = useState(false);
  const [teachersList, setTeachersList] = useState([]);
  const [errors, setErrors] = useState({});
  const [isEnrollStudents, setIsEnrollStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  
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
      setSelectedStudentIds(classData.student_id || []);
      setErrors({});
    }
  }, [classData, isOpen]);

  // VALIDATION 
  const validateStep = () => {
    const newErrors = validateClassRegistrationStep(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // HANDLERS
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

  const handleSubmit = async () => {
    setLoading(true);

    if (!validateStep()) {
      return;
    }

    try {
      const payload = {
        section_name: formData.sectionName,
        class_schedule: formData.classSchedule,
        max_capacity: formData.maxCapacity,
        description: formData.description,
        user_id: formData.assignedTeacher,
        student_id: selectedStudentIds,
      };

      // Use the ID from classData to target the update
      await axios.put(`http://localhost:3000/api/sections/${classData._id}`, payload, {
        withCredentials: true
      });

      alert("Class updated successfully!");
      if (onSuccess) onSuccess(); // Refresh parent list
      onClose();

    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update class. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !classData) return null;

  return createPortal(
    <>
      <div className="modal-overlay active" id="editStudentModal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]" >edit_square</span>
              <h2 className="text-cdark text-[18px] font-bold">Edit Class Details</h2>
            </div>
          </div>

          <div className="modal-body">

              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Section Name</label>
                  <FormInputRegistration 
                    name="sectionName"
                    value={formData.sectionName}
                    onChange={handleChange}
                    placeholder="e.g. Sunflower"
                    error={errors.sectionName}
                    className="form-input-modal"
                  />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Class Schedule</label>
                <div class="relative">
                  <select 
                    className="form-input-modal appearance-none" 
                    name="classSchedule"
                    value={formData.classSchedule} 
                    onChange={handleChange}
                  >
                    <option value="Morning">
                      Morning Session (8:00 AM - 11:30 AM)
                    </option>
                    <option value="Afternoon">
                      Afternoon Session (1:00 PM - 4:30 PM)
                    </option>
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
                    value={formData.description}
                    onChange={handleChange}
                    className="form-input-modal resize-none h-[100px] leading-normal" 
                    placeholder="Enter description..."
                ></textarea>
              </div>

              {/* Needs a logic for options css due to data will be on server/database which will be looped inside */}
              <div className="flex flex-col gap-2">
                <label className="text-cgray text-[13px] font-medium">Assign Teacher</label>
                <div className="relative">
                  <select 
                    className="form-input-modal appearance-none" 
                    name="assignedTeacher"
                    value={formData.assignedTeacher}
                    onChange={handleChange}
                  >
                    <option value="" disabled selected>Select a Teacher</option>
                    {teachersList.map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.last_name}, {t.first_name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined select-arrow" >expand_more</span>
                </div>
                {errors.assignedTeacher && <span className="text-red-500 text-[11px] ml-1">{errors.assignedTeacher}</span>}
              </div>

              <div className="flex flex-col gap-2 mt-2.5">
                <label className="text-cgray text-[13px] font-medium">Manage Students</label>
                  <div className="flex items-center justify-between bg-[#f8fafc] p-4 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="text-cprimary-blue bg-[#e0f2fe] w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-[18px]">
                        <span className="material-symbols-outlined">groups</span>
                      </div>
                      <div className="flex flex-col">
                        <span id="editEnrollmentSummaryCount" className="text-cdark font-bold text-[14px]">{selectedStudentIds.length} Selected</span>
                        <span className="text-cgray text-[11px]">Capacity Limit applies</span>
                      </div>
                    </div>
                    <button type="button" id="openEditEnrollmentModalBtn" className="btn bg-white rounded-md border-2 border-(--border-color) hover:text-(--white) hover:bg-(--brand-blue) hover:border-2 hover:border-(--brand-blue) w-auto h-9 px-4 text-xs" onClick={() => setIsEnrollStudents(true)}>
                      Edit List
                    </button>
                  </div>
                  <input type="hidden" id="editStudentListJSON" value="[]" />
                </div>
            </div>

            <div class="modal-footer">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button className="btn-save" onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
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
        sectionId={classData?.section_id ?? classData?.sectionId}
      />

    </>,
    document.body
  );
}