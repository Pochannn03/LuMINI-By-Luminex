import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

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

const convertTo24Hour = (time12h) => {
  if (!time12h || time12h === '---') return '';
  const [time, modifier] = time12h.split(' ');
  if (!time || !modifier) return '';
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
  return `${hours.padStart(2, '0')}:${minutes}`;
};

const convertTo12Hour = (time24h) => {
  if (!time24h) return '---';
  let [hours, minutes] = time24h.split(':');
  let hoursInt = parseInt(hours, 10);
  const modifier = hoursInt >= 12 ? 'PM' : 'AM';
  if (hoursInt === 0) hoursInt = 12;
  if (hoursInt > 12) hoursInt -= 12;
  return `${hoursInt}:${minutes} ${modifier}`;
};

// --- IMAGE HELPER ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, fallbackName) => {
  if (!path) return `https://ui-avatars.com/api/?name=${fallbackName}&background=random`;
  if (path.startsWith("http")) return path;
  
  let cleanPath = path.replace(/\\/g, "/");
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
  
  return `${BACKEND_URL}/${cleanPath}`;
};

export default function AdminAttendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeRemarkId, setActiveRemarkId] = useState(null);
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const dateString = dateToInputString(currentDate);

        // Updated to use BACKEND_URL
        const response = await axios.get(`${BACKEND_URL}/api/attendance`, {
          params: { date: dateString },
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

  useEffect(() => {
    const handleTapOutside = () => setActiveRemarkId(null);
    document.addEventListener("click", handleTapOutside);
    return () => document.removeEventListener("click", handleTapOutside);
  }, []);

  const handleLocalChange = (recordId, field, value) => {
    setPendingChanges(prev => {
      const existing = prev[recordId] || {};
      return {
        ...prev,
        [recordId]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  const handleSubmitChanges = async () => {
    const updates = Object.keys(pendingChanges);
    if (updates.length === 0) {
      setIsEditMode(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        updates.map(id => {
          const currentRecord = attendanceData.find(r => r._id === id);
          const payload = {
            status: pendingChanges[id].status || currentRecord.status,
            time_in: pendingChanges[id].time_in !== undefined ? pendingChanges[id].time_in : currentRecord.time_in
          };
          // Updated to use BACKEND_URL
          return axios.put(`${BACKEND_URL}/api/attendance/${id}`, payload, { withCredentials: true });
        })
      );

      setAttendanceData(prevData => 
        prevData.map(record => {
          const pending = pendingChanges[record._id];
          if (pending) {
            return {
              ...record,
              status: pending.status || record.status,
              time_in: pending.time_in !== undefined ? pending.time_in : record.time_in
            };
          }
          return record;
        })
      );

      setPendingChanges({});
      setIsEditMode(false);
    } catch (err) {
      console.error("Failed to submit changes:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handlePrint = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text("Daily Attendance Log", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${monthDay}, ${currentDate.getFullYear()}`, 14, 32);
    doc.text(`Section: ${selectedSection === "all" ? "All Sections" : selectedSection}`, 14, 38);
    doc.text(`Summary: ${stats.present} Present | ${stats.late} Late | ${stats.absent} Absent`, 14, 44);

    const tableColumn = ["Student ID", "Student Name", "Section", "Time In", "Status", "Details"];
    const tableRows = filteredRecords.map(record => [
      record.student_id || "---",
      record.student_name,
      record.section_name || "Unassigned",
      record.time_in || "---",
      record.status,
      record.details || ""
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 52,
      theme: 'grid',
      headStyles: { fillColor: [57, 168, 237] }, 
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Present') data.cell.styles.textColor = [22, 163, 74];
          if (data.cell.raw === 'Late') data.cell.styles.textColor = [202, 138, 4];
          if (data.cell.raw === 'Absent') data.cell.styles.textColor = [220, 38, 38];
        }
      }
    });

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
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-6">
                
                <div className="flex items-start gap-3 shrink-0">
                  <span className="material-symbols-outlined blue-icon text-[32px]">list_alt</span>
                  <div>
                    <h2 className="text-cdark text-[18px] font-bold">Student List</h2>
                    <p className="text-cgray text-[14px]!">Attendance Logs of Students.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full xl:w-auto xl:ml-auto shrink-0 mt-4 xl:mt-0">
                  <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shadow-sm w-full h-[38px]">
                    <button onClick={() => handleDateChange(-1)} className="w-8 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all cursor-pointer shrink-0">
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    
                    <div className="relative h-full flex items-center flex-1">
                      <button 
                        onClick={() => dateInputRef.current.showPicker()} 
                        className="flex items-center justify-center gap-3 px-3 h-full w-full rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-blue-500">calendar_month</span>
                          <span className="text-[12px] font-bold text-cdark uppercase tracking-tight">
                            {monthDay}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300 hidden sm:block"></div>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:block">
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

                    <button onClick={() => handleDateChange(1)} className="w-8 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all cursor-pointer shrink-0">
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>

                  {/* RIGHT SIDE: Filter & Calendar Wrapper */}
                  <div className="flex flex-col md:flex-row items-center gap-2 w-full xl:w-auto xl:ml-auto">
                    
                    {/* CUSTOM SECTION FILTER (Compact Size) */}
                    <div className="relative w-full md:w-44" ref={filterRef}>
                      <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center justify-between w-full h-[38px] px-3 rounded-xl border bg-slate-50 transition-all duration-200 cursor-pointer ${
                          isFilterOpen ? "border-(--brand-blue) ring-2 ring-blue-500/10 bg-white" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="material-symbols-outlined text-slate-400 text-[18px] mr-0.5 shrink-0">
                            {selectedSection === "all" ? "groups" : "inbox"}
                          </span>
                          <span className="text-[12px] font-semibold text-slate-700 uppercase truncate">
                            {selectedSection === "all" ? "Sections" : selectedSection}
                          </span>
                        </div>
                        <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-300 ${isFilterOpen ? "rotate-180" : ""}`}>
                          expand_more
                        </span>
                      </button>

                      {isFilterOpen && (
                        <div className="absolute top-[42px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1 animate-[fadeIn_0.2s_ease-out]">
                          <button 
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-(--brand-blue) transition-colors"
                            onClick={() => { setSelectedSection("all"); setIsFilterOpen(false); }}
                          >
                            <span className="material-symbols-outlined text-[18px]">groups</span> All
                          </button>
                          {teacherSections.map((section) => (
                            <button 
                              key={section._id}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-(--brand-blue) transition-colors"
                              onClick={() => { setSelectedSection(section.section_name); setIsFilterOpen(false); }}
                            >
                              <span className="material-symbols-outlined text-[18px]">inbox</span> {section.section_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS (Compact Height) */}
                    <div className="flex items-center gap-1.5 w-full md:w-auto">
                      {isEditMode ? (
                        <>
                          <button onClick={() => { setIsEditMode(false); setPendingChanges({}); }} className="px-3 text-[11px] font-black uppercase text-slate-500 hover:text-slate-800 transition-colors h-[38px]">Cancel</button>
                          <button onClick={handleSubmitChanges} disabled={isSubmitting} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-4 flex items-center justify-center gap-1.5 text-[12px] h-[38px] transition-all shadow-sm cursor-pointer disabled:opacity-50">
                            <span className="material-symbols-outlined text-[16px]">{isSubmitting ? 'hourglass_empty' : 'check_circle'}</span>
                            {isSubmitting ? 'Saving' : 'Submit'}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setIsEditMode(true)} className="w-full md:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold px-4 flex items-center justify-center gap-1.5 text-[12px] h-[38px] transition-all shadow-sm cursor-pointer">
                          <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full xl:overflow-visible overflow-x-auto pb-4 custom-scrollbar">
                <table className="w-full min-w-[750px] text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%]">Student</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%] text-center">Time</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[30%] text-center">Status</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[10%] text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan="4" className="py-10 text-center italic text-gray-400">Loading records...</td></tr>
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
                            {isEditMode ? (
                              <div className="flex justify-center">
                                <input
                                  type="time"
                                  className="bg-white border border-slate-200 text-slate-700 text-[12px] font-bold px-2 py-1.5 rounded-lg w-[110px] text-center shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-text"
                                  value={convertTo24Hour(pendingChanges[record._id]?.time_in !== undefined ? pendingChanges[record._id].time_in : record.time_in)}
                                  onChange={(e) => handleLocalChange(record._id, 'time_in', convertTo12Hour(e.target.value))}
                                />
                              </div>
                            ) : (
                              <span className="inline-block bg-blue-50 text-blue-600 text-[11px] font-bold px-3 py-1 rounded-lg whitespace-nowrap">
                                {record.time_in || "---"}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-2 text-center">
                            {isEditMode ? (
                              <div className="flex flex-nowrap whitespace-nowrap bg-[#f1f5f9] rounded-xl p-1 w-max mx-auto shadow-inner border border-slate-100 items-center">
                                {['Present', 'Late', 'Absent'].map((statusOption) => {
                                  const currentStatus = pendingChanges[record._id]?.status || record.status;
                                  const isActive = currentStatus === statusOption;
                                  let activeTextColor = 'text-slate-800';
                                  if (isActive) {
                                    if (statusOption === 'Present') activeTextColor = 'text-green-600'; 
                                    if (statusOption === 'Late') activeTextColor = 'text-yellow-600';
                                    if (statusOption === 'Absent') activeTextColor = 'text-red-600';
                                  }
                                  return (
                                    <button
                                      key={statusOption}
                                      onClick={() => handleLocalChange(record._id, 'status', statusOption)}
                                      className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 cursor-pointer ${
                                        isActive
                                          ? `bg-white shadow-sm border border-slate-200/60 ${activeTextColor}`
                                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 border border-transparent'
                                      }`}
                                    >
                                      {statusOption}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                                record.status === 'Present' ? 'bg-green-50 text-green-600' : 
                                record.status === 'Late' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {record.status}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center relative overflow-visible">
                            {record.details ? (
                              <div className="inline-flex items-center justify-center relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRemarkId(activeRemarkId === record._id ? null : record._id);
                                  }}
                                  className={`material-symbols-outlined cursor-pointer text-[22px] transition-all duration-200 outline-none
                                    ${activeRemarkId === record._id ? 'text-blue-700 scale-110' : 'text-blue-500'}`}
                                >
                                  info
                                </button>

                                <div 
                                  className={`
                                    absolute z-[9999] 
                                    top-[130%] sm:top-auto sm:bottom-[130%] 
                                    right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 
                                    mt-2 sm:mt-0 sm:mb-2
                                    w-[240px] sm:w-[260px] h-auto transition-all duration-200 ease-out 
                                    origin-top-right sm:origin-bottom
                                    ${activeRemarkId === record._id 
                                      ? 'visible opacity-100 scale-100' 
                                      : 'invisible opacity-0 scale-95 lg:group-hover:visible lg:group-hover:opacity-100 lg:group-hover:scale-100'}
                                  `}
                                >
                                  <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#39A8ED] text-white p-4 rounded-2xl shadow-[0_10px_30px_-5px_rgba(57,168,237,0.4)] border border-blue-300/30 relative"
                                  >
                                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/20">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-white text-[16px]">chat_bubble</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white">Absence Note</span>
                                      </div>
                                      <button onClick={() => setActiveRemarkId(null)} className="lg:hidden material-symbols-outlined text-[16px] text-white/70">close</button>
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                      <p className="text-[11px]! leading-normal text-white! font-medium italic text-left whitespace-normal break-words">
                                        "{record.details}"
                                      </p>
                                    </div>
                                    
                                    <div className="sm:hidden absolute bottom-full right-[10px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-[#39A8ED]"></div>
                                    
                                    <div className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[#39A8ED]"></div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="material-symbols-outlined text-gray-200 text-[22px] select-none">info</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-10 text-center italic text-gray-400">
                          <div className="flex flex-col gap-1 items-center justify-center">
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
              className="btn btn-primary w-full h-[55px] rounded-xl font-bold text-[16px] gap-2 cursor-pointer disabled:opacity-50"
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