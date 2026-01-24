import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';
import ClassManageSelectStudentModal from '../class-management/ClassManageSelectStudentsModal';
import '../../../../styles/super-admin/class-manage-modal/class-manage-add-class-modal.css';

export default function ClassManageAddClassModal({ isOpen, onClose }) {
  const [isEnrollStudents, setIsEnrollStudents] = useState(false);
  const [teachersList, setTeachersList] = useState([]);
  const [formData, setFormData] = useState([
    
  ]);

  useEffect(() => {
    if(isOpen){
      const fetchTeachers = async () => {
        try {
          const response = await axios.get('http://localhost:3000/api/getTeachers', {
            withCredentials: true
          });

          setTeachersList(response.data);
        } catch (err) {
          console.error("Failed to fetch teachers preview", err);
        }
        }

        fetchTeachers();
      }
  },[isOpen]);

  if (!isOpen) return null;
  return createPortal (
    <>
      {/* No Logic Yet */}
      <div className="modal-overlay active" id="addClassModal" >
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined blue-icon text-[24px]"
                >add_circle</span>
              <h2 className="text-cdark text-[18px] font-bold">Create New Class</h2>
            </div>
          </div>

          <div className="modal-body">
            <div className="flex flex-col gap-2">
              <label htmlFor="createClassGrade" className="text-cgray text-[13px] font-medium">Section Name</label>
              <input type="text" id="createClassSection" class="form-input-modal" placeholder="e.g. Sunflower" autocomplete="off"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="createClassGrade" className="text-cgray text-[13px] font-medium">Class Schedule</label>
              <div className="relative">
                <select className="form-input-modal appearance-none" id="createClassSchedule">
                  <option className="appearance-none cursor-pointer" value="" disabled selected>Select Schedule</option>
                  <option className="appearance-none cursor-pointer" value="Morning">
                    Morning Session (8:00 AM - 11:30 AM)
                  </option>
                  <option className="appearance-none cursor-pointer" value="Afternoon">
                    Afternoon Session (1:00 PM - 4:30 PM)
                  </option>
                </select>
                <span className="material-symbols-outlined select-arrow">expand_more</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Max Capacity</label>
              <input type="number" 
              id="createClassCapacity" 
              placeholder="e.g. 30" 
              className="form-input-modal"/>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Description</label>
              <textarea
                id="createClassDesc"
                className="form-input-modal leading-normal h-[100px] resize-none"
                placeholder="Enter class description..."
              ></textarea>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-cgray text-[13px] font-medium">Assign Teacher</label>
              <div className="relative">
                <select className="form-input-modal appearance-none" id="createClassTeacher" defaultValue="">
                  <option className="appearance-none cursor-pointer" value="" disabled selected>Select a Teacher</option>
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
            </div>

            <div className="flex flex-col gap-2 mt-2.5">
              <label className="text-cgray text-[13px] font-medium">Enroll Students</label>

              <div className="flex items-center justify-between bg-[#f8fafc] p-4 border border-[#e2e8f0] rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="icon-box-small blue-bg-soft w-9 h-9 text-[18px]">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-cdark font-bold text-[14px]"
                      id="enrollmentSummaryCount">0 Selected</span>
                    <span className="text-cgray text-[11px]">Capacity Limit applies</span>
                  </div>
                </div>

                  <button
                    type="button"
                    id="openEnrollmentModalBtn"
                    className="btn bg-white rounded-md border-2 border-(--border-color) hover:text-(--white) hover:bg-(--brand-blue) hover:border-2 hover:border-(--brand-blue) w-auto h-9 px-4 text-xs"
                    onClick={() => setIsEnrollStudents(true)}
                    >
                    Select Students
                  </button>


                <input type="hidden" id="finalStudentListJSON" value="[]" />
              </div>
            </div>

          </div>

            <div className="modal-footer">
              <button className="btn-cancel" id="closeAddModalBtn" onClick={onClose}>Cancel</button>
              <button className="btn-save" id="submitCreateClassBtn">
                Create Class
              </button>
            </div>
        </div>
      </div>
      
      <ClassManageSelectStudentModal 
        isOpen={isEnrollStudents} 
        onClose={() => setIsEnrollStudents(false)} 
      />
    </>,
    document.body
  );
}