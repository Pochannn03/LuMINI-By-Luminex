import React, { useState, useRef } from "react";
import NavBar from "../../components/navigation/NavBar";

export default function AdminAttendance() {
  // --- 1. STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateInputRef = useRef(null);
  
  // --- 2. DUMMY DATA ---
  const [students] = useState([
    { id: 101, name: "Mia Chen", studentId: "2026-0001", arrivalTime: "7:10 AM", status: "drop off" },
    { id: 102, name: "Liam Johnson", studentId: "2026-0002", arrivalTime: "4:30 PM", status: "pick up" },
    { id: 103, name: "Noah Williams", studentId: "2026-0003", arrivalTime: "7:15 AM", status: "drop off" },
    { id: 104, name: "Emma Davis", studentId: "2026-0004", arrivalTime: "7:05 AM", status: "drop off" },
    { id: 105, name: "James Wilson", studentId: "2026-0005", arrivalTime: "4:45 PM", status: "pick up" },
    { id: 106, name: "Oliver Brown", studentId: "2026-0006", arrivalTime: "7:20 AM", status: "drop off" },
  ]);

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

  // Helper to split the date parts
  const getDateParts = (date) => {
    const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    return { monthDay, weekday };
  };

  const dateToInputString = (date) => {
    return date.toISOString().split('T')[0];
  };

  const { monthDay, weekday } = getDateParts(currentDate);

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="flex-1 p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        <div className="admin-banner max-w-[1200px] mx-auto mb-6">
          <h1 className="text-[white]!">Transfer History</h1>
          <p className="text-[white]! opacity-90 m-0">
            View historical records of student drop-offs and pick-ups.
          </p>
        </div>

        <div className="w-full max-w-[1200px] mx-auto">
          <div className="card p-6 min-h-[500px]">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined blue-icon text-[32px]">history</span>
                <div>
                  <h2 className="text-cdark text-[18px] font-bold">Log Record</h2>
                  <p className="text-cgray text-[14px]">Historical records for the selected date.</p>
                </div>
              </div>

              {/* UPDATED DATE CONTROLS */}
              <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 self-start sm:self-auto shadow-sm">
                
                <button onClick={() => handleDateChange(-1)} className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all">
                  <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                </button>

                <div className="relative">
                  <button 
                    onClick={() => dateInputRef.current.showPicker()} 
                    className="flex items-center justify-between gap-4 px-4 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 min-w-60 cursor-pointer"
                  >
                    {/* Date and Icon Left */}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-blue-500">calendar_month</span>
                      <span className="text-[14px] font-bold text-cdark uppercase tracking-tight">
                        {monthDay}
                      </span>
                    </div>

                    {/* Separator Line */}
                    <div className="w-px h-4 bg-gray-300"></div>

                    {/* Weekday Right */}
                    <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest">
                      {weekday}
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

                <button onClick={() => handleDateChange(1)} className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all">
                  <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%]">Student</th>
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%] text-center">Time</th>
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[40%] text-center">Transfer Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => (
                    <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 uppercase">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-cdark text-[14px] font-bold">{student.name}</p>
                            <p className="text-cgray text-[12px]">ID: {student.studentId}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-2 text-center">
                        <span className="text-cdark text-[13px] font-medium">
                          {student.arrivalTime}
                        </span>
                      </td>

                      <td className="py-4 px-2 text-center">
                        <span className={`
                          inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider
                          ${student.status === "drop off" 
                            ? "bg-blue-50 text-blue-600 border border-blue-100" 
                            : "bg-green-50 text-green-600 border border-green-100"
                          }
                        `}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}