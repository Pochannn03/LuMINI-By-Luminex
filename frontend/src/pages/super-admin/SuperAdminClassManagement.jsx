import React, {useState} from "react";
import { Link } from 'react-router-dom';
import '../../styles/super-admin/class-management.css';
import NavBar from "../../components/navigation/NavBar";
import ClassManageAddClassModal from "../../components/modals/super-admin/class-management/ClassManageAddClassModal";
import ClassManageAddTeacherModal from "../../components/modals/super-admin/class-management/ClassManageAddTeacherModal";
import ClassManageAddStudentModal from "../../components/modals/super-admin/class-management/ClassManageAddStudentModal";


export default function SuperAdminClassManagement() {
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">

      <NavBar />

        <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
          <div className="superadmin-banner">
            <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">Class Management</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Manage your classes, faculty, and student body.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 max-w-[1200px] m-auto lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col gap-6">
              <div className="card queue-card">
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="material-symbols-outlined blue-icon text-[24px]">meeting_room</span>
                    <h2 className="text-cdark text-[18px] font-bold">Active Classes</h2>
                  </div>
                  <p className="text-cgray text-[14px]! leading-normal">
                    Current classes in sesssion.
                  </p>
                </div>

                <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto mb-5 p-[5px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" id="activeClassesList">
                  <p className="text-cgray p-[15px]">Loading Classes...</p> {/* Data where classes will be shown */}
                </div>

                <div className="border-ctop mt-6 pt-4">
                  <button className="btn btn-outline gap-2 h-12 rounded-xl font-semibold text-[14px] border-0 w-full" id="addClassBtn" onClick={() => setIsAddClassModalOpen(true)}>
                    <span className="material-symbols-outlined">add</span>
                    Add New Class
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="card queue-card">
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span class="material-symbols-outlined orange-icon text-[24px]">supervised_user_circle
                    </span>
                    <h2 className="text-cdark text-[18px] font-bold">Teacher's Directory</h2>
                  </div>
                  <p className="text-cgray leading-normal text-[14px]!">Faculty members and advisers.</p>
                </div>

                <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto mb-5 p-[5px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" id="teachersDirectoryList">
                  <p className="text-cgray p-[15px]">Loading Teachers...</p> {/* Data where teachers will be shown */}
                </div>

                <button className="btn btn-primary gap-2 h-12 rounded-xl font-semibold text-[14px] border-0 w-full" id="addTeacherBtn" onClick={() => setIsAddTeacherModalOpen(true)}>
                  <span className="material-symbols-outlined">person_add</span>
                  Add Teacher
                </button>
              </div>
              

              <div className="card queue-card">
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span class="material-symbols-outlined blue-icon text-[24px]"
                    >face</span>
                    <h2 className="text-cdark text-[18px] font-bold">Sutdents Directory</h2>
                  </div>
                  <p className="text-cgray leading-noirmal text-[14px]!">Currently Enrolled students.</p>
                </div>

                <div className="search-bar-small flex items-center gap-2 mb-[15px]">
                  <span className="material-symbols-outlined">search</span>
                  <input type="text" placeholder="Search student name or ID..." />
                </div>

                <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto mb-5 p-[5px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" id="teachersDirectoryList">
                  <p className="text-cgray p-[15px]">Loading Teachers...</p> {/* Data where teachers will be shown */}
                </div>

                <div className="">
                  <button className="btn btn-primary gap-2 h-12 rounded-xl font-semibold text-[14px] border-0 w-full" id="btnAddStudentMain" onClick={() => setIsAddStudentModalOpen(true)}>
                    <span className="material-symbols-outlined">person_add</span>
                    Add Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      
      {/* For Modal of Adding Classes, Students and Teachers */}
      <ClassManageAddClassModal 
        isOpen={isAddClassModalOpen} 
        onClose={() => setIsAddClassModalOpen(false)} 
      />
      <ClassManageAddTeacherModal 
        isOpen={isAddTeacherModalOpen} 
        onClose={() => setIsAddTeacherModalOpen(false)} 
      />
      <ClassManageAddStudentModal 
        isOpen={isAddStudentModalOpen} 
        onClose={() => setIsAddStudentModalOpen(false)} 
      />
      
    </div>

    
  );
}