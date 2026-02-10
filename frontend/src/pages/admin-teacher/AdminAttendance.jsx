import React, { useState, useEffect } from "react";
import NavBar from "../../components/navigation/NavBar";

export default function AdminAttendance() {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // System Controls
  const [activeMode, setActiveMode] = useState("Standard Operation");
  const [selectedAction, setSelectedAction] = useState("dropoff");
  
  // Data
  const [students, setStudents] = useState([
    { id: 101, name: "Mia Chen", studentId: "102394", arrivalTime: "7:10 AM", status: "present", avatar: null },
    { id: 102, name: "Liam Johnson", studentId: "102395", arrivalTime: "--:--", status: "absent", avatar: null },
    { id: 103, name: "Noah Williams", studentId: "102396", arrivalTime: "7:15 AM", status: "late", avatar: null },
    { id: 104, name: "Emma Davis", studentId: "102397", arrivalTime: "7:05 AM", status: "present", avatar: null },
    { id: 105, name: "James Wilson", studentId: "102398", arrivalTime: "--:--", status: "absent", avatar: null },
    { id: 106, name: "Oliver Brown", studentId: "102399", arrivalTime: "7:20 AM", status: "late", avatar: null },
  ]);

  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  // --- EFFECTS ---
  useEffect(() => {
    const present = students.filter(s => s.status === 'present').length;
    const late = students.filter(s => s.status === 'late').length;
    const absent = students.filter(s => s.status === 'absent').length;
    setStats({ present, late, absent });
  }, [students]);

  // --- HANDLERS ---
  const handleDateChange = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const handleStatusChange = (id, newStatus) => {
    setStudents(prev => prev.map(student => 
      student.id === id ? { ...student, status: newStatus } : student
    ));
  };

  const handleSetMode = () => {
    const modeLabels = {
      dropoff: "Morning Drop-off",
      class: "Class In-Session",
      dismissal: "Afternoon Dismissal"
    };
    setActiveMode(modeLabels[selectedAction]);
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />
      
      <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        
        {/* --- BLUE BANNER --- */}
        <div className="admin-banner max-w-[1200px] mx-auto">
          <h1 className="text-[white]!">Attendance Log</h1>
          <p className="text-[white]! opacity-90 m-0">Manage daily student attendance and system overrides.</p>
        </div>

        {/* --- MAIN GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1.5fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
          
          {/* --- LEFT COLUMN: Student List & Date --- */}
          <div className="flex flex-col gap-6">
            <div className="card p-6 min-h-[500px]">
              
              {/* HEADER: Title + Date Controls Moved Here */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                
                {/* Title Section */}
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined blue-icon text-[32px]">list_alt</span>
                  <div>
                    <h2 className="text-cdark text-[18px] font-bold">Student List</h2>
                    <p className="text-cgray text-[14px]">Mark attendance for today.</p>
                  </div>
                </div>

                {/* Date Controls (Integrated) */}
                <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 self-start sm:self-auto">
                   <button onClick={() => handleDateChange(-1)} className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-cdark hover:bg-white transition-all">
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                   </button>
                   <span className="text-[13px] font-bold text-cdark uppercase tracking-wide px-3 whitespace-nowrap min-w-[140px] text-center">
                      {formatDateDisplay(currentDate)}
                   </span>
                   <button onClick={() => handleDateChange(1)} className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-cdark hover:bg-white transition-all">
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                   </button>
                </div>

              </div>

              {/* TABLE */}
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
                    {students.map((student) => (
                      <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-cdark text-[14px] font-bold">{student.name}</p>
                              <p className="text-cgray text-[12px]">ID: {student.studentId}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-2 text-center">
                          {student.arrivalTime !== "--:--" ? (
                            <span className="inline-block bg-blue-50 text-blue-600 text-[12px] font-bold px-3 py-1 rounded-lg">
                              {student.arrivalTime}
                            </span>
                          ) : (
                            <span className="text-cgray text-[12px] italic">--:--</span>
                          )}
                        </td>

                        <td className="py-4 px-2">
                          <div className="flex justify-center bg-gray-50 p-1 rounded-lg border border-gray-100">
                             {['present', 'late', 'absent'].map((status) => (
                               <label 
                                 key={status}
                                 className={`
                                   flex-1 text-center py-1.5 px-2 rounded-md text-[11px] font-bold cursor-pointer transition-all select-none capitalize
                                   ${student.status === status 
                                     ? 'bg-white shadow-sm ring-1 ring-gray-200 ' + (
                                        status === 'present' ? 'text-green-600' : 
                                        status === 'late' ? 'text-yellow-600' : 'text-red-600'
                                     ) 
                                     : 'text-gray-400 hover:bg-gray-200/50'
                                   }
                                 `}
                               >
                                 <input 
                                   type="radio" 
                                   className="hidden" 
                                   checked={student.status === status}
                                   onChange={() => handleStatusChange(student.id, status)}
                                 />
                                 {status}
                               </label>
                             ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: Stats & Actions (Date Removed) --- */}
          <div className="flex flex-col gap-6">
            
            {/* 1. STATS SUMMARY */}
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

            {/* 2. SYSTEM OVERRIDE */}
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
                  className="btn btn-outline w-full h-[45px] rounded-xl font-bold text-[14px]"
                >
                  Apply Override
                </button>
              </div>
            </div>

            {/* 3. MAIN ACTION BUTTON */}
            <button className="btn btn-primary w-full h-[55px] rounded-xl font-bold text-[16px] gap-2">
              <span className="material-symbols-outlined">save</span>
              Save Attendance
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}