import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "../../styles/super-admin/class-management.css";
import NavBar from "../../components/navigation/NavBar";
import ClassManageClassCard from "../../components/modals/super-admin/class-management/ClassManageClassCard";
import ClassManageViewClassModal from "../../components/modals/super-admin/class-management/ClassManageViewClassModal";
import ClassManageTeacherCard from "../../components/modals/super-admin/class-management/ClassManageTeacherCard";
import ClassManageStudentCard from "../../components/modals/super-admin/class-management/ClassManageStudentCard";
import ClassManageAddClassModal from "../../components/modals/super-admin/class-management/ClassManageAddClassModal";
import ClassManageEditClassModal from "../../components/modals/super-admin/class-management/ClassManageEditClassModal";
import ClassManageDeleteClassModal from "../../components/modals/super-admin/class-management/ClassManageDeleteClassModal";
import ClassManageAddTeacherModal from "../../components/modals/super-admin/class-management/ClassManageAddTeacherModal";
import ClassManageEditTeacherModal from "../../components/modals/super-admin/class-management/ClassManageEditTeacherModal";
import ClassManageDeleteTeacherModal from "../../components/modals/super-admin/class-management/ClassManageDeleteTeacherModal";
import ClassManageAddStudentModal from "../../components/modals/super-admin/class-management/ClassManageAddStudentModal";
import ClassManageViewStudentModal from "../../components/modals/super-admin/class-management/ClassManageViewStudentModal";
import ClassManageEditStudentModal from "../../components/modals/super-admin/class-management/ClassManageEditStudentModal";
import ClassManageArchivedClassesModal from "../../components/modals/super-admin/class-management/ClassManageArchivedClassModal";
import ClassManageViewTeacherModal from "../../components/modals/super-admin/class-management/ClassManageViewTeacherModal";
import SuccessModal from "../../components/SuccessModal";

export default function SuperAdminClassManagement() {
  // --- SEARCH & FILTER STATES ---
  const [searchClasses, setSearchClasses] = useState("");
  const [searchTeachers, setSearchTeachers] = useState("");
  const [searchStudents, setSearchStudents] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All Sections");

  // MODAL STATES
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isArchiveListModalOpen, setIsArchiveListModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isViewClassModalOpen, setIsViewClassModalOpen] = useState(false);

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

  // --- CRASH-PROOF FILTER LOGIC ---
  const filteredClasses = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    return classes.filter(cls => 
      (cls?.section_name || "").toLowerCase().includes((searchClasses || "").toLowerCase())
    );
  }, [classes, searchClasses]);

  const filteredTeachers = useMemo(() => {
    if (!Array.isArray(teachers)) return [];
    return teachers.filter(tch => {
      const fullName = `${tch?.first_name || ""} ${tch?.last_name || ""}`.toLowerCase();
      return fullName.includes((searchTeachers || "").toLowerCase());
    });
  }, [teachers, searchTeachers]);

  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(std => {
      // 1. Safe Search Check
      const fullName = `${std?.first_name || ""} ${std?.last_name || ""}`.toLowerCase();
      const id = String(std?.student_id || "").toLowerCase();
      const query = (searchStudents || "").toLowerCase();
      const matchesSearch = fullName.includes(query) || id.includes(query);

      // 2. Safe Section Filter Check
      const studentSection = std?.section_details?.section_name || "Unassigned";
      const matchesSection = sectionFilter === "All Sections" || studentSection === sectionFilter;

      return matchesSearch && matchesSection;
    });
  }, [students, searchStudents, sectionFilter]);

  // FETCH FUNCTIONS
  const fetchClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
      const response = await axios.get("http://localhost:3000/api/sections", { withCredentials: true });
      if (response.data && response.data.success) setClasses(response.data.classes || []);
    } catch (error) { console.error("Error fetching classes:", error); } 
    finally { setLoadingClasses(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const response = await axios.get("http://localhost:3000/api/teachers", { withCredentials: true });
      if (response.data && response.data.success) setTeachers(response.data.teachers || []);
    } catch (error) { console.error("Error fetching teachers:", error); } 
    finally { setLoadingTeachers(false); }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const response = await axios.get("http://localhost:3000/api/students", { withCredentials: true });
      if (response.data && response.data.success) setStudents(response.data.students || []);
    } catch (error) { console.error("Error fetching students:", error); } 
    finally { setLoadingStudents(false); }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchStudents();
  }, [fetchClasses, fetchTeachers, fetchStudents]);

  // WEBSOCKET FOR LIVE FETCHING
  useEffect(() => {
    const socket = io("http://localhost:3000", { withCredentials: true });
    socket.on("teacher_added", () => fetchTeachers());
    socket.on("student_added", () => fetchStudents());
    socket.on("section_updated", () => { fetchClasses(); fetchStudents(); fetchTeachers(); });
    socket.on("section_added", () => { fetchClasses(); fetchStudents(); fetchTeachers(); });
    socket.on("section_archived", () => { fetchClasses(); fetchStudents(); fetchTeachers(); });
    return () => socket.disconnect();
  }, [fetchTeachers, fetchStudents, fetchClasses]);

  // HANDLERS
  const handleViewClass = (classData) => { setSelectedClass(classData); setIsViewClassModalOpen(true); };
  const handleEditClass = (classData) => { setSelectedClass(classData); setIsEditClassModalOpen(true); };
  const handleDeleteClass = (classData) => { setSelectedClass(classData); setisDeletClassModalOpen(true); };
  const handleEditTeacher = (teacherData) => { setSelectedTeacher(teacherData); setIsEditTeacherModalOpen(true); };
  const handleDeleteTeacher = (teacherData) => { setSelectedTeacher(teacherData); setIsDeleteTeacherModalOpen(true); };
  const handleViewTeacher = (teacherData) => { setSelectedTeacher(teacherData); setIsViewTeacherModalOpen(true); };
  const handleViewStudent = (studentData) => { setSelectedStudent(studentData); setIsViewStudentModalOpen(true); };
  const handleEditStudent = (studentData) => { setSelectedStudent(studentData); setIsEditStudentModalOpen(true); };
  const handleShowSuccess = (msg) => { setSuccessMessage(msg); setIsSuccessModalOpen(true); };

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
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="material-symbols-outlined blue-icon text-[24px]">meeting_room</span>
                    <h2 className="text-cdark text-[18px] font-bold">Active Classes</h2>
                  </div>
                  <p className="text-cgray text-[14px]! leading-normal">
                    Current classes in session.
                  </p>
                </div>

                {/* --- RESPONSIVE View Archives Button --- */}
                <button 
                  onClick={() => setIsArchiveListModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1e293b] rounded-lg transition-colors border-none cursor-pointer font-bold text-[12.5px] shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  <span className="hidden sm:inline">View Archives</span>
                </button>
              </div>

              <div className="search-bar-small flex items-center gap-2 mb-[15px]">
                <span className="material-symbols-outlined">search</span>
                <input 
                   type="text" 
                   placeholder="Search section name..." 
                   value={searchClasses}
                   onChange={(e) => setSearchClasses(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto mb-5 p-[5px] custom-scrollbar">
                {loadingClasses && <p className="text-cgray p-[15px]">Loading Classes...</p>}
                {!loadingClasses && filteredClasses.length === 0 && (
                  <p className="text-cgray p-[15px] text-sm">No classes match your search.</p>
                )}
                {!loadingClasses && filteredClasses.map((cls) => (
                  <ClassManageClassCard key={cls._id || cls.section_id} cls={cls} onView={handleViewClass} onEdit={handleEditClass} onDelete={handleDeleteClass} />
                ))}
              </div>

              <div className="border-ctop mt-6 pt-4">
                <button className="btn btn-outline gap-2 h-12 rounded-xl font-semibold text-[14px] w-full" onClick={() => setIsAddClassModalOpen(true)}>
                  <span className="material-symbols-outlined">add</span> Add New Class
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card queue-card">
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="material-symbols-outlined orange-icon text-[24px]">supervised_user_circle</span>
                  <h2 className="text-cdark text-[18px] font-bold">Teacher's Directory</h2>
                </div>
                <p className="text-cgray leading-normal text-[14px]!">Faculty members and advisers.</p>
              </div>

              <div className="search-bar-small flex items-center gap-2 mb-[15px]">
                <span className="material-symbols-outlined">search</span>
                <input 
                   type="text" 
                   placeholder="Search teacher name..." 
                   value={searchTeachers}
                   onChange={(e) => setSearchTeachers(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto mb-5 p-[5px] custom-scrollbar">
                {loadingTeachers && <p className="text-cgray p-[15px]">Loading Teachers...</p>}
                {!loadingTeachers && filteredTeachers.length === 0 && (
                  <p className="text-cgray p-[15px] text-sm">No teachers match your search.</p>
                )}
                {!loadingTeachers && filteredTeachers.map((tch) => (
                  <ClassManageTeacherCard key={tch._id || tch.user_id} tch={tch} onView={handleViewTeacher} onEdit={handleEditTeacher} onDelete={handleDeleteTeacher} />
                ))}
              </div>

              <button className="btn btn-primary gap-2 h-12 rounded-xl font-semibold text-[14px] border-0 w-full" onClick={() => setIsAddTeacherModalOpen(true)}>
                <span className="material-symbols-outlined">person_add</span> Add Teacher
              </button>
            </div>

            <div className="card queue-card">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined blue-icon text-[24px]">face</span>
                    <h2 className="text-cdark text-[18px] font-bold">Students Directory</h2>
                  </div>

                  {/* Section Filter Dropdown */}
                  <div className="relative shrink-0">
                    <select 
                      className="appearance-none bg-slate-50 border border-slate-200 text-[#475569] text-[11px] font-bold py-1.5 pl-3 pr-8 rounded-lg cursor-pointer hover:border-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100"
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                    >
                      <option value="All Sections">All Sections</option>
                      {(Array.isArray(classes) ? classes : []).map(cls => (
                        <option key={cls._id || cls.section_id} value={cls.section_name}>{cls.section_name}</option>
                      ))}
                      <option value="Unassigned">Unassigned</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">filter_list</span>
                  </div>
                </div>
                <p className="text-cgray leading-noirmal text-[14px]! mt-1">Currently Enrolled students.</p>
              </div>

              <div className="search-bar-small flex items-center gap-2 mb-[15px]">
                <span className="material-symbols-outlined">search</span>
                <input 
                  type="text" 
                  placeholder="Search student name or ID..." 
                  value={searchStudents}
                  onChange={(e) => setSearchStudents(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto mb-5 p-[5px] custom-scrollbar">
                {loadingStudents && <p className="text-cgray p-[15px]">Loading Students...</p>}
                {!loadingStudents && filteredStudents.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                    <span className="material-symbols-outlined text-[40px] mb-2">person_search</span>
                    <p className="text-cgray text-sm mt-2">No students match your criteria.</p>
                  </div>
                )}
                {!loadingStudents && filteredStudents.map((std) => (
                  <ClassManageStudentCard key={std._id || std.section_id} std={std} onView={handleViewStudent} onEdit={handleEditStudent} />
                ))}
              </div>

              <button className="btn btn-primary gap-2 h-12 rounded-xl font-semibold text-[14px] border-0 w-full" onClick={() => setIsAddStudentModalOpen(true)}>
                <span className="material-symbols-outlined">person_add</span> Add Student
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <ClassManageViewClassModal isOpen={isViewClassModalOpen} onClose={() => { setIsViewClassModalOpen(false); setSelectedClass(null); }} classData={selectedClass} />
      <ClassManageAddClassModal isOpen={isAddClassModalOpen} onClose={() => setIsAddClassModalOpen(false)} onSuccess={handleShowSuccess} />
      <ClassManageEditClassModal isOpen={isEditClassModalOpen} onClose={() => { setIsEditClassModalOpen(false); setSelectedClass(null); }} classData={selectedClass} onSuccess={(msg) => { fetchClasses(); handleShowSuccess(msg); }} />
      <ClassManageDeleteClassModal isOpen={isDeletClassModalOpen} onClose={() => { setisDeletClassModalOpen(false); setSelectedClass(null); }} classData={selectedClass} onSuccess={(msg) => { fetchClasses(); handleShowSuccess(msg); }} />
      <ClassManageArchivedClassesModal isOpen={isArchiveListModalOpen} onClose={() => setIsArchiveListModalOpen(false)} onRefreshActive={fetchClasses} />
      <ClassManageAddTeacherModal isOpen={isAddTeacherModalOpen} onClose={() => setIsAddTeacherModalOpen(false)} onSuccess={handleShowSuccess} />
      <ClassManageViewTeacherModal isOpen={isViewTeacherModalOpen} onClose={() => { setIsViewTeacherModalOpen(false); setSelectedTeacher(null); }} teacherData={selectedTeacher} classes={classes} />
      <ClassManageEditTeacherModal isOpen={isEditTeacherModalOpen} onClose={() => { setIsEditTeacherModalOpen(false); setSelectedTeacher(null); }} teacherData={selectedTeacher} onSuccess={(msg) => { fetchTeachers(); handleShowSuccess(msg); }} />
      <ClassManageDeleteTeacherModal isOpen={isDeleteTeacherModalOpen} onClose={() => { setIsDeleteTeacherModalOpen(false); setSelectedTeacher(null); }} teacherData={selectedTeacher} onSuccess={(msg) => { fetchTeachers(); handleShowSuccess(msg); }} />
      <ClassManageAddStudentModal isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} onSuccess={handleShowSuccess} />
      <ClassManageViewStudentModal isOpen={isViewStudentModalOpen} onClose={() => { setIsViewStudentModalOpen(false); setSelectedStudent(null); }} studentData={selectedStudent} onSuccess={(msg) => { fetchStudents(); handleShowSuccess(msg); }} />
      <ClassManageEditStudentModal isOpen={isEditStudentModalOpen} onClose={() => { setIsEditStudentModalOpen(false); setSelectedStudent(null); }} studentData={selectedStudent} onSuccess={(msg) => { fetchStudents(); handleShowSuccess(msg); }} />
      <SuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} message={successMessage} />
    </div>
  );
}