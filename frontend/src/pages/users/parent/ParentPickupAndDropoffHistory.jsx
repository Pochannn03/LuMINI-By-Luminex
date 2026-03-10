import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import NavBar from "../../../components/navigation/NavBar";

// --- HELPERS ---
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getDateParts = (date) => {
  const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return { monthDay, weekday };
};

const dateToInputString = (date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const getImageUrl = (path, fallbackName) => {
  if (!path) return `https://ui-avatars.com/api/?name=${fallbackName}&background=random`;
  if (path.startsWith("http")) return path;
  
  // Sanitizing path to prevent double-slashes
  const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BACKEND_URL}/${cleanPath}`;
};

export default function AdminDropAndPickHistory() {
  const [transferData, setTransferData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState("all");
  const dateInputRef = useRef(null);
  const { monthDay, weekday } = getDateParts(currentDate);

  useEffect(() => {
    const fetchTransferHistory = async () => {
      try {
        setLoading(true);
        const dateString = dateToInputString(currentDate);
        
        // Updated to use dynamic BACKEND_URL
        const response = await axios.get(`${BACKEND_URL}/api/transfer/parent`, { 
          params: {
            date: dateString,
            purpose: filterType !== "all" ? filterType : undefined
          },
          withCredentials: true 
        });

        if (response.data.success) {
          setTransferData(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
        setTransferData([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchTransferHistory();
  }, [currentDate, filterType]);

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

  const filteredData = transferData.filter(item => {
    const selectedDateString = dateToInputString(currentDate); 
    const matchesDate = item.date === selectedDateString;
    const recordPurpose = item.purpose?.toLowerCase().replace(/\s/g, "") || "";
    const activeFilter = filterType.toLowerCase().replace(/\s/g, "");
    const matchesType = filterType === "all" || recordPurpose.includes(activeFilter);
    return matchesDate && matchesType;
  });

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
          <div className="card p-4 md:p-6 min-h-[500px]">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
  
              {/* LEFT SIDE: Icon and Header Text */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="material-symbols-outlined blue-icon text-[32px]">history</span>
                <div>
                  <h2 className="text-cdark text-[18px] font-bold">Log Record</h2>
                  <p className="text-cgray text-[14px]! m-0 mt-1">Historical records for the selected date.</p>
                </div>
              </div>

              {/* RIGHT SIDE: Filters and Calendar */}
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                
                {/* TYPE FILTER (Matched Style) */}
                <div className="relative shrink-0 w-full md:w-auto">
                  <select 
                    className="appearance-none bg-slate-50 border border-slate-200 text-gray-700 text-sm font-semibold h-[45px] pl-4 pr-10 rounded-xl cursor-pointer w-full md:w-auto outline-none focus:border-(--brand-blue) focus:ring-4 focus:ring-blue-500/5 transition-all"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Records</option>
                    <option value="drop off">Drop Offs</option>
                    <option value="pick up">Pick Ups</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">
                    filter_list
                  </span>
                </div>

                {/* CALENDAR CONTROLS (Height matched to 45px) */}
                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200 h-[45px] w-full md:w-auto">
                  <button 
                    onClick={() => handleDateChange(-1)} 
                    className="w-10 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-(--brand-blue) hover:bg-white transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>

                  <div className="relative h-full flex items-center flex-1 md:flex-none">
                    <button 
                      onClick={() => dateInputRef.current.showPicker()} 
                      className="flex items-center justify-between gap-3 px-3 h-full w-full rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100 min-w-[180px] cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-(--brand-blue)">calendar_month</span>
                        <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">{monthDay}</span>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{weekday.slice(0, 3)}</span>
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

                  <button 
                    onClick={() => handleDateChange(1)} 
                    className="w-10 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-(--brand-blue) hover:bg-white transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>

              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[12%]">TRX ID</th>
                    <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[28%]">Student</th>
                    <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[25%]">Parent/Guardian</th>
                    <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[15%] text-center">Time</th>
                    <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan="5" className="py-16 text-center text-gray-400 italic">Loading records...</td></tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((record) => (
                      <tr key={record._id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-5 px-2">
                           <span className="inline-block px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-gray-500 font-bold text-[10px] tracking-tight">{record.transfer_id}</span>
                        </td>
                        <td className="py-5 px-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={getImageUrl(record.student_details?.profile_picture, record.student_name)} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" alt="student" />
                            <div className="min-w-0">
                              <p className="text-cdark text-[13px]! font-bold leading-tight truncate">{record.student_name}</p>
                              <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide truncate">ID: {record.student_id}</span>
                                <span className="text-blue-400 text-[10px] font-semibold italic truncate">{record.section_name}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={getImageUrl(record.user_details?.profile_picture, record.user_name)} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" alt="guardian" />
                            <div className="min-w-0">
                                <p className="text-cdark text-[13px]! font-semibold leading-tight truncate">{record.user_name}</p>
                                <span className="text-gray-400 text-[10px] uppercase tracking-wider truncate">{record.user_details?.relationship || "Authorized User"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-2 text-center">
                          <span className="text-cdark text-[13px] font-medium">{record.time}</span>
                        </td>
                        <td className="py-5 px-2 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            record.purpose === "Drop off" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-green-50 text-green-600 border border-green-100"
                          }`}>{record.purpose}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="py-16 text-center text-gray-400 italic">No transfers recorded for {monthDay}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}