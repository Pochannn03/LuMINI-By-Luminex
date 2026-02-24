import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <-- CHANGED: Proper import for modern React

// --- HELPERS ---
const getDateParts = (date) => {
  const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return { monthDay, weekday };
};

const dateToInputString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- IMAGE HELPER ---
const BACKEND_URL = "http://localhost:3000";

const getImageUrl = (path, fallbackName) => {
  if (!path) return `https://ui-avatars.com/api/?name=${fallbackName}&background=random`;
  if (path.startsWith("http")) return path;
  
  let cleanPath = path.replace(/\\/g, "/");
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
  
  return `${BACKEND_URL}/${cleanPath}`;
};
// --------------------------

export default function AdminAttendance() {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [teacherSections, setTeacherSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("all");
  const [activeMode, setActiveMode] = useState("Standard Operation");
  const [selectedAction, setSelectedAction] = useState("dropoff");
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const dateInputRef = useRef(null);

  // --- 1. FETCH DATA FROM DB ---
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const dateString = dateToInputString(currentDate);

        const response = await axios.get('http://localhost:3000/api/attendance', {
          params: {
            date: dateString
          },
          withCredentials: true
        });

        if (response.data.success) {
          setAttendanceData(response.data.data);
          setTeacherSections(response.data.sections || []); 
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [currentDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 2. FILTER & STATS CALCULATION ---
  const filteredRecords = React.useMemo(() => {
    return attendanceData.filter(record => {
      const selectedUIString = dateToInputString(currentDate);
      const matchesDate = record.date === selectedUIString;
      const matchesSection = selectedSection === "all" || record.section_name === selectedSection;
      return matchesDate && matchesSection;
    });
  }, [attendanceData, currentDate, selectedSection]);

  useEffect(() => {
    const present = filteredRecords.filter(s => s.status === 'Present').length;
    const late = filteredRecords.filter(s => s.status === 'Late').length;
    const absent = filteredRecords.filter(s => s.status === 'Absent').length;
    
    setStats({ present, late, absent });
  }, [filteredRecords]);

  // --- 3. HANDLERS ---
  const handleDateChange = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const handleCalendarChange = (e) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      setCurrentDate(selectedDate);
    }
  };

  const handleSetMode = () => {
    const modeLabels = {
      dropoff: "Morning Drop-off",
      class: "Class In-Session",
      dismissal: "Afternoon Dismissal"
    };
    setActiveMode(modeLabels[selectedAction]);
  };

  // --- 4. PRINT TO PDF HELPER ---
  const handlePrint = () => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Daily Attendance Log", 14, 22);
    
    // Add Date and Section Info
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Date: ${monthDay}, ${currentDate.getFullYear()}`, 14, 32);
    doc.text(`Section: ${selectedSection === "all" ? "All Sections" : selectedSection}`, 14, 38);
    
    // Add Summary Stats
    doc.text(`Summary: ${stats.present} Present | ${stats.late} Late | ${stats.absent} Absent`, 14, 44);

    // Prepare Table Data
    const tableColumn = ["Student ID", "Student Name", "Section", "Time In", "Status", "Details"];
    const tableRows = [];

    filteredRecords.forEach(record => {
      const rowData = [
        record.student_id || "---",
        record.student_name,
        record.section_name || "Unassigned",
        record.time_in || "---",
        record.status,
        record.details || ""
      ];
      tableRows.push(rowData);
    });

    // CHANGED: Using autoTable() properly
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 52,
      theme: 'grid',
      headStyles: { fillColor: [57, 168, 237] }, // Matches LuMINI blue
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
      didParseCell: function(data) {
        // Color code the status column text
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Present') data.cell.styles.textColor = [22, 163, 74]; // green-600
          if (data.cell.raw === 'Late') data.cell.styles.textColor = [202, 138, 4]; // yellow-600
          if (data.cell.raw === 'Absent') data.cell.styles.textColor = [220, 38, 38]; // red-600
        }
      }
    });

    // Save PDF
    doc.save(`Attendance_${selectedSection}_${dateToInputString(currentDate)}.pdf`);
  };

  const { monthDay, weekday } = getDateParts(currentDate);

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />
      
      <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        <div className="admin-banner max-w-[1200px] mx-auto">
          <h1 className="text-[white]!">Attendance Log</h1>
          <p className="text-[white]! opacity-90 m-0">Manage daily student attendance and system overrides.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1.5fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
          
          <div className="flex flex-col gap-6">
            <div className="card p-6 min-h-[500px]">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined blue-icon text-[32px]">list_alt</span>
                  <div>
                    <h2 className="text-cdark text-[18px] font-bold">Student List</h2>
                    <p className="text-cgray text-[14px]!">Attendance Logs of Students.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* SECTION FILTER */}
                  <div className="filter-wrapper" ref={filterRef}>
                    <button 
                      className={`btn-filter ${isFilterOpen ? "active" : ""}`} 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      style={{ height: '38px', textTransform: 'uppercase', fontSize: '12px' }}
                    >
                      <span className="material-symbols-outlined">filter_list</span> 
                      {selectedSection === "all" ? "All Sections" : selectedSection}
                    </button>

                    {isFilterOpen && (
                      <div className="filter-dropdown-menu" style={{ top: '42px', right: 0 }}>
                        <button 
                          className="filter-option" 
                          onClick={() => { setSelectedSection("all"); setIsFilterOpen(false); }}
                        >
                          <span className="material-symbols-outlined">groups</span> All Sections
                        </button>
                        
                        {teacherSections.map(section => (
                          <button 
                            key={section._id} 
                            className="filter-option" 
                            onClick={() => { setSelectedSection(section.section_name); setIsFilterOpen(false); }}
                          >
                            <span className="material-symbols-outlined">inbox</span> {section.section_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SHRUNK DATE NAVIGATOR */}
                  <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shadow-sm self-start sm:self-auto">
                    <button onClick={() => handleDateChange(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    
                    <div className="relative">
                      <button 
                        onClick={() => dateInputRef.current.showPicker()} 
                        className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 min-w-[175px] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-blue-500">calendar_month</span>
                          <span className="text-[12px] font-bold text-cdark uppercase tracking-tight">
                            {monthDay}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          {weekday.slice(0, 3)}
                        </span>
                      </button>
                      <input 
                        type="date" 
                        ref={dateInputRef} 
                        onChange={handleCalendarChange} 
                        value={dateToInputString(currentDate)} 
                        className="absolute opacity-0 pointer-events-none" 
                        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} 
                      />
                    </div>

                    <button onClick={() => handleDateChange(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-visible">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%]">Student</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%] text-center">Time</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%] text-center">Status</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%] text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan="3" className="py-10 text-center italic text-gray-400">Loading records...</td></tr>
                    ) : filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => (
                        <tr key={record._id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-3">
                              <img 
                                src={getImageUrl(record.student_details?.profile_picture || record.profile_picture, record.student_name)} 
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                alt="student"
                              />
                              <div>
                                <p className="text-cdark text-[14px]! font-bold leading-tight">{record.student_name}</p>
                                <div className="flex flex-col">
                                  <span className="text-cgray text-[11px]!">ID: {record.student_id}</span>
                                  <span className="text-blue-500 font-bold text-[10px] uppercase tracking-wider">{record.section_name}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className="inline-block bg-blue-50 text-blue-600 text-[11px] font-bold px-3 py-1 rounded-lg">
                              {record.time_in}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              record.status === 'Present' ? 'bg-green-50 text-green-600' : 
                              record.status === 'Late' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center relative overflow-visible">
                            {record.details ? (
                              <div className="inline-flex items-center justify-center relative group/note">
                                {/* The Info Icon */}
                                <span className="material-symbols-outlined text-blue-500 cursor-help text-[22px] transition-all duration-200 group-hover/note:scale-110">
                                  info
                                </span>

                                {/* The Expanding Bubble */}
                                <div className="invisible opacity-0 scale-95 group-hover/note:visible group-hover/note:opacity-100 group-hover/note:scale-100
                                                absolute z-[9999] bottom-[130%] left-1/2 -translate-x-1/2 mb-2
                                                w-[260px] h-auto pointer-events-none transition-all duration-200 ease-out origin-bottom">
                                  
                                  {/* Changed background to Primary Blue (bg-[#39A8ED] or similar) */}
                                  <div className="bg-[#39A8ED] text-white p-4 rounded-2xl shadow-[0_10px_30px_-5px_rgba(57,168,237,0.4)] border border-blue-300/30 relative">
                                    
                                    {/* Header */}
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                                      <span className="material-symbols-outlined text-white text-[16px]">chat_bubble</span>
                                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white">Absence Note</span>
                                    </div>

                                    {/* Note Content - Wraps and expands naturally */}
                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                      <p className="text-[11px]! leading-normal text-white! font-medium italic text-left whitespace-normal wrap-break-word">
                                        "{record.details}"
                                      </p>
                                    </div>

                                    {/* The Pointy Arrow (Colored to match the Primary Blue) */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 
                                                    border-l-10 border-l-transparent 
                                                    border-r-10 border-r-transparent 
                                                    border-t-10 border-t-[#39A8ED]">
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="material-symbols-outlined text-gray-200 text-[22px] select-none">
                                info
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-10 text-center italic text-gray-400">
                          <div className="flex flex-col gap-1">
                            <span className="material-symbols-outlined text-[40px] mb-2">inbox</span>
                            No records found for {monthDay}.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="flex flex-col gap-6">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined green-icon text-[28px]">analytics</span>
                <h2 className="text-cdark text-[18px] font-bold">Daily Summary</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                   <span className="block text-[20px] font-bold text-green-700">{stats.present}</span>
                   <span className="text-[10px] font-bold text-green-600 uppercase">Present</span>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                   <span className="block text-[20px] font-bold text-yellow-700">{stats.late}</span>
                   <span className="text-[10px] font-bold text-yellow-600 uppercase">Late</span>
                </div>
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                   <span className="block text-[20px] font-bold text-red-700">{stats.absent}</span>
                   <span className="text-[10px] font-bold text-red-600 uppercase">Absent</span>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary w-full h-[55px] rounded-xl font-bold text-[16px] gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePrint}
              disabled={filteredRecords.length === 0}
            >
              <span className="material-symbols-outlined">print</span>
              Print Attendance
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}