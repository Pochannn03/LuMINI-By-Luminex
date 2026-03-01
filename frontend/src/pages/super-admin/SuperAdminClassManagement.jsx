import React, { useState, useEffect, useCallback } from "react";
import { Link } from 'react-router-dom';
import { io } from "socket.io-client";
import axios from 'axios';
import '../../styles/super-admin/class-management.css';
import NavBar from "../../components/navigation/NavBar";
import ClassManageClassCard from "../../components/modals/super-admin/class-management/ClassManageClassCard"
import ClassManageTeacherCard from "../../components/modals/super-admin/class-management/ClassManageTeacherCard"
import ClassManageStudentCard from "../../components/modals/super-admin/class-management/ClassManageStudentCard"
import ClassManageAddClassModal from "../../components/modals/super-admin/class-management/ClassManageAddClassModal";
import ClassManageEditClassModal from "../../components/modals/super-admin/class-management/ClassManageEditClassModal";
import ClassManageDeleteClassModal from "../../components/modals/super-admin/class-management/ClassManageDeleteClassModal";
import ClassManageAddTeacherModal from "../../components/modals/super-admin/class-management/ClassManageAddTeacherModal";
import ClassManageEditTeacherModal from "../../components/modals/super-admin/class-management/ClassManageEditTeacherModal";
import ClassManageDeleteTeacherModal from "../../components/modals/super-admin/class-management/ClassManageDeleteTeacherModal";
import ClassManageAddStudentModal from "../../components/modals/super-admin/class-management/ClassManageAddStudentModal";
import ClassManageViewStudentModal from "../../components/modals/super-admin/class-management/ClassManageViewStudentModal";
import ClassManageEditStudentModal from "../../components/modals/super-admin/class-management/ClassManageEditStudentModal";
import ClassManageViewTeacherModal from "../../components/modals/super-admin/class-management/ClassManageViewTeacherModal";
import SuccessModal from '../../components/SuccessModal';


export default function SuperAdminClassManagement() {
  // ADD MODAL STATES 
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // EDIT & DELETE MODAL STATES
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeletClassModalOpen, setisDeletClassModalOpen] = useState(false);
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);
  const [isDeleteTeacherModalOpen, setIsDeleteTeacherModalOpen] = useState(false);
  const [isViewTeacherModalOpen, setIsViewTeacherModalOpen] = useState(false);
  const [isViewStudentModalOpen, setIsViewStudentModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);

  // DATA STATES
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // DATA SELECTION
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // FUNCTION FETCH/AXIOS GETTING THE CLASSES
  const fetchClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
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
  }, []); 

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]); 

  // FUNCTION FETCH/AXIOS GETTING THE TEACHERS
 const fetchTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const response = await axios.get('http://localhost:3000/api/teachers', { 
        withCredentials: true 
      });

      if (response.data.success) {
        setTeachers(response.data.teachers);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoadingTeachers(false);
    }
  }, []); 

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]); 

  // FUNCTION FETCH/AXIOS GETTING THE STUDENTS
 const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const response = await axios.get('http://localhost:3000/api/students', { 
        withCredentials: true 
      });

      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoadingStudents(false);
    }
  }, []); 

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // WEBSOCKET FOR LIVE FETCHING
  useEffect(() => {
    const socket = io("http://localhost:3000", {
      withCredentials: true
    });

    socket.on("teacher_added", (newTeacher) => {
      setTeachers((prev) => [...prev, newTeacher]);
      fetchTeachers();
    });

    socket.on("student_added", (newStudent) => {
      setStudents((prev) => [...prev, newStudent]);
      fetchStudents();
    });

    socket.on("section_updated", () => {
      fetchClasses();
      fetchStudents();
      fetchTeachers();
    });

    socket.on("section_added", (newSection) => {
      setClasses((prev) => [...prev, newSection]);
      fetchClasses();
      fetchStudents();
      fetchTeachers();
    });

    socket.on("section_archived", () => {
      fetchClasses();
      fetchStudents(); 
      fetchTeachers();
    });

    // 4. Cleanup on unmount
    return () => {
      socket.off("teacher_added");
      socket.off("student_added");
      socket.off("section_added");
      socket.off("section_archived");
      socket.disconnect();
    };
  }, [fetchTeachers, fetchStudents, fetchClasses]);


  // FOR EDIT AND DELETE HANDLERS 
  // --CLASSES--
  const handleEditClass = (classData) => {
    setSelectedClass(classData);
    setIsEditClassModalOpen(true);
  };

  const handleDeleteClass = (classData) => {
    setSelectedClass(classData); 
    setisDeletClassModalOpen(true);
  };

  // --TEACHERS--
  const handleEditTeacher = (teacherData) => {
    setSelectedTeacher(teacherData);
    setIsEditTeacherModalOpen(true); 
  };

  const handleDeleteTeacher = (teacherData) => {
    setSelectedTeacher(teacherData); 
    setIsDeleteTeacherModalOpen(true);
  };

  const handleViewTeacher = (teacherData) => {
    setSelectedTeacher(teacherData);
    setIsViewTeacherModalOpen(true);
  };

  // --STUDENTS--
  const handleViewStudent = (studentData) => {
    setSelectedStudent(studentData);
    setIsViewStudentModalOpen(true); 
  };

  const handleEditStudent = (studentData) => {
    setSelectedStudent(studentData); 
    setIsEditStudentModalOpen(true);
  };

  const handleShowSuccess = (msg) => {
    setSuccessMessage(msg);
    setIsSuccessModalOpen(true);
  };

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

                <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto mb-5 p-[5px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                
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
                      key={cls._id || cls.section_id} 
                      cls={cls}
                      onEdit={handleEditClass}
                      onDelete={handleDeleteClass}
                    />
                  ))}
                </div>

                <div className="border-ctop mt-6 pt-4">
                  <button 
                    className="btn btn-outline gap-2 h-12 rounded-xl font-semibold text-[14px] w-full" 
                    onClick={() => setIsAddClassModalOpen(true)}
                  >
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

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto mb-5 p-[5px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {/* 1. Loading State */}
                  {loadingTeachers && (
                    <p className="text-cgray p-[15px]">Loading Teachers...</p>
                  )}

                  {/* 2. Empty State */}
                  {!loadingTeachers && teachers.length === 0 && (
                    <p className="text-cgray p-[15px] text-sm">No Teacher found.</p>
                  )}

                  {/* 3. Render Cards */}
                  {!loadingTeachers && teachers.map((tch) => (
                    <ClassManageTeacherCard 
                      key={tch._id || tch.user_id} 
                      tch={tch}
                      onView={handleViewTeacher}
                      onEdit={handleEditTeacher}
                      onDelete={handleDeleteTeacher}
                    />
                  ))}
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
                   {/* 1. Loading State */}
                  {loadingStudents && (
                    <p className="text-cgray p-[15px]">Loading Students...</p>
                  )}

                  {/* 2. Empty State */}
                  {!loadingStudents && students.length === 0 && (
                    <p className="text-cgray p-[15px] text-sm">No active students found.</p>
                  )}

                  {/* 3. Render Cards */}
                  {!loadingStudents && students.map((std) => (
                    <ClassManageStudentCard
                      key={std._id || std.section_id} 
                      std={std}
                      onView={handleViewStudent}
                      onEdit={handleEditStudent}
                    />
                  ))}
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
      {/* CLASSES */}
      <ClassManageAddClassModal 
        isOpen={isAddClassModalOpen} 
        onClose={() => setIsAddClassModalOpen(false)}
        onSuccess={(msg) => handleShowSuccess(msg)}
      />
        <ClassManageEditClassModal 
          isOpen={isEditClassModalOpen}
          onClose={() => {
            setIsEditClassModalOpen(false);
            setSelectedClass(null);
          }}
          classData={selectedClass}
          onSuccess={(msg) => {
            fetchClasses();
            handleShowSuccess(msg);
          }}
        />
        <ClassManageDeleteClassModal
          isOpen={isDeletClassModalOpen}
          onClose={() => {
            setisDeletClassModalOpen(false);
            setSelectedClass(null);
          }}
          classData={selectedClass}
          onSuccess={(msg) => {
            fetchClasses();
            handleShowSuccess(msg);
          }}
        />

      {/* TEACHERS */}
      <ClassManageAddTeacherModal 
        isOpen={isAddTeacherModalOpen} 
        onClose={() => setIsAddTeacherModalOpen(false)}
        onSuccess={(msg) => handleShowSuccess(msg)}
      />
      <ClassManageViewTeacherModal 
        isOpen={isViewTeacherModalOpen}
        onClose={() => {
          setIsViewTeacherModalOpen(false);
          setSelectedTeacher(null);
        }}
        teacherData={selectedTeacher}
        classes={classes} // <-- Pass the classes array so it can filter sections!
      />
      <ClassManageEditTeacherModal 
        isOpen={isEditTeacherModalOpen}
        onClose={() => {
          setIsEditTeacherModalOpen(false);
          setSelectedTeacher(null);
        }}
        teacherData={selectedTeacher}
        onSuccess={(msg) => {
          fetchTeachers();
          handleShowSuccess(msg);
        }}
      />
      <ClassManageDeleteTeacherModal
        isOpen={isDeleteTeacherModalOpen}
        onClose={() => {
          setIsDeleteTeacherModalOpen(false);
          setSelectedTeacher(null);
        }}
        teacherData={selectedTeacher}
        onSuccess={(msg) => {
          fetchTeachers();
          handleShowSuccess(msg);
        }}
      />

      {/* STUDENTS */}
      <ClassManageAddStudentModal 
        isOpen={isAddStudentModalOpen} 
        onClose={() => setIsAddStudentModalOpen(false)}
        onSuccess={(msg) => handleShowSuccess(msg)}
      />
        <ClassManageViewStudentModal 
          isOpen={isViewStudentModalOpen}
          onClose={() => {
            setIsViewStudentModalOpen(false);
            setSelectedStudent(null);
          }}
          studentData={selectedStudent}
          onSuccess={(msg) => {
            fetchStudents();
            handleShowSuccess(msg);
          }}
        />
        <ClassManageEditStudentModal 
          isOpen={isEditStudentModalOpen}
          onClose={() => {
            setIsEditStudentModalOpen(false);
            setSelectedStudent(null);
          }}
          studentData={selectedStudent}
          onSuccess={(msg) => {
            fetchStudents();
            handleShowSuccess(msg);
          }}
        />

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        message={successMessage}
      />
      
    </div>

    
  );
}