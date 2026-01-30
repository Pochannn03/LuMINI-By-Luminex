import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../../styles/super-admin/class-management.css';
import NavBar from "../../components/navigation/NavBar";
import ClassManageClassCard from "../../components/modals/super-admin/class-management/ClassManageClassCard"
import ClassManageAddClassModal from "../../components/modals/super-admin/class-management/ClassManageAddClassModal";
import ClassManageEditClassModal from "../../components/modals/super-admin/class-management/ClassManageEditClassModal";
import ClassManageDeleteClassModal from "../../components/modals/super-admin/class-management/ClassManageDeleteClassModal";
import ClassManageAddTeacherModal from "../../components/modals/super-admin/class-management/ClassManageAddTeacherModal";
import ClassManageAddStudentModal from "../../components/modals/super-admin/class-management/ClassManageAddStudentModal";


export default function SuperAdminClassManagement() {
  // ADD MODAL STATES
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

    // EDIT & DELETE MODAL STATES
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // DATA STATES -- CLASSES -- 
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // CLASS STATE (SELECTED SECTION)
  const [selectedClass, setSelectedClass] = useState(null);

  // FUNCTION FETCH/AXIOS GETTING THE CLASSES
  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      // Adjust URL to your actual backend endpoint
      const response = await axios.get('http://localhost:3000/api/sections', { 
        withCredentials: true 
      });

      if (response.data.success) {
        setClasses(response.data.classes);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // FOR EDIT AND DELETE HANDLERS
  const handleEditClass = (classData) => {
    setSelectedClass(classData);
    setIsEditClassModalOpen(true);
    
    console.log("Selected Class for Edit:", classData); 
  };

  const handleDeleteClick = (classData) => {
    setSelectedClass(classData); // Reuse the same state variable for selection
    setIsDeleteModalOpen(true);
  };

  // const handleDeleteClass = async (id) => {
  //   if(!window.confirm("Are you sure you want to delete this class?")) return;

  //   try {
  //     // Optimistic update: Remove from UI immediately
  //     setClasses(prev => prev.filter(c => (c._id || c.id) !== id));
      
  //     await axios.delete(`http://localhost:3000/delete-class/${id}`, { withCredentials: true });
  //   } catch (error) {
  //     alert("Failed to delete class");
  //     fetchClasses(); // Revert if failed
  //   }
  // };

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

                <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto mb-5 p-[5px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                
                {/* 1. Loading State */}
                  {loadingClasses && (
                    <p className="text-cgray p-[15px]">Loading Classes...</p>
                  )}

                  {/* 2. Empty State */}
                  {!loadingClasses && classes.length === 0 && (
                    <p className="text-cgray p-[15px] text-sm">No active classes found.</p>
                  )}

                  {/* 3. Render Cards */}
                  {!loadingClasses && classes.map((cls) => (
                    <ClassManageClassCard 
                      key={cls._id || cls.id} // MongoDB usually uses _id
                      cls={cls}
                      onEdit={handleEditClass}
                      onDelete={handleDeleteClick}
                    />
                  ))}
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
                    <span className="material-symbols-outlined orange-icon text-[24px]">supervised_user_circle
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
                    <span className="material-symbols-outlined blue-icon text-[24px]"
                    >face</span>
                    <h2 className="text-cdark text-[18px] font-bold">Students Directory</h2>
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
        <ClassManageEditClassModal 
          isOpen={isEditClassModalOpen}
          onClose={() => {
            setIsEditClassModalOpen(false);
            setSelectedClass(null);
          }}
          classData={selectedClass}
          onSuccess={fetchClasses}
        />
        <ClassManageDeleteClassModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedClass(null);
          }}
          classData={selectedClass}
          onSuccess={fetchClasses} // Refresh list after delete
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