import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";

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

export default function AdminAttendance() {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("all"); // New State
  const dateInputRef = useRef(null);
  
  const [activeMode, setActiveMode] = useState("Standard Operation");
  const [selectedAction, setSelectedAction] = useState("dropoff");
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  // --- 1. FETCH DATA FROM DB ---
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3000/api/attendance', { withCredentials: true });
        if (response.data.success) {
          setAttendanceData(response.data.data);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  // Get unique sections for the filter dropdown
  const uniqueSections = [...new Set(attendanceData.map(item => item.section_name))].filter(Boolean);

  // --- 2. FILTER & STATS CALCULATION ---
  const filteredRecords = attendanceData.filter(record => {
    const selectedUIString = dateToInputString(currentDate);
    const matchesDate = record.date === selectedUIString;
    const matchesSection = selectedSection === "all" || record.section_name === selectedSection;
    return matchesDate && matchesSection;
  });

  useEffect(() => {
    const present = filteredRecords.filter(s => s.status === 'Present').length;
    const late = filteredRecords.filter(s => s.status === 'Late').length;
    const absent = filteredRecords.filter(s => s.status === 'Absent').length;
    setStats({ present, late, absent });
  }, [attendanceData, currentDate, selectedSection]);

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
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-gray-400 text-[18px] mr-2">filter_alt</span>
                    <select 
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="bg-transparent text-[12px] font-bold text-cdark uppercase outline-none cursor-pointer"
                    >
                      <option value="all">All Sections</option>
                      {uniqueSections.map(section => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
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

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%]">Student</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%] text-center">Time</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%] text-center">Status</th>
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
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                                {record.student_name.charAt(0)}
                              </div>
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
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="py-10 text-center italic text-gray-400">No records found for this date.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SIDEBAR REMAINS SAME */}
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

            <div className="card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined orange-icon text-[28px]">tune</span>
                <div>
                  <h2 className="text-cdark text-[18px] font-bold">System Mode</h2>
                  <p className="text-cgray text-[12px]">Current: <span className="font-bold text-orange-500">{activeMode}</span></p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <select 
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] font-medium text-cdark outline-none appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <option value="dropoff">🌅 Drop-off (Morning)</option>
                    <option value="class">📚 Class In-Session</option>
                    <option value="dismissal">👋 Dismissal (Afternoon)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-gray-400">expand_more</span>
                </div>
                
                <button 
                  onClick={handleSetMode}
                  className="btn btn-outline w-full h-[45px] rounded-xl font-bold text-[14px] cursor-pointer"
                >
                  Apply Override
                </button>
              </div>
            </div>

            <button className="btn btn-primary w-full h-[55px] rounded-xl font-bold text-[16px] gap-2 cursor-pointer">
              <span className="material-symbols-outlined">save</span>
              Save Attendance
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}