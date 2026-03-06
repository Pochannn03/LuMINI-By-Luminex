import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// --- HELPERS ---
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
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function AdminDropAndPickHistory() {
  const [transferData, setTransferData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const dateInputRef = useRef(null);
  const { monthDay, weekday } = getDateParts(currentDate);

  useEffect(() => {
    const fetchTransferHistory = async () => {
      try {
        setLoading(true);
        const dateString = dateToInputString(currentDate);

        // Updated to use dynamic BACKEND_URL
        const response = await axios.get(`${BACKEND_URL}/api/transfer`, { 
          params: {
            date: dateString
          },
          withCredentials: true 
        });

        if (response.data.success) {
          setTransferData(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransferHistory();
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

  const filteredData = transferData.filter(item => {
    const selectedDateString = dateToInputString(currentDate); 
    const matchesDate = item.date === selectedDateString;
    
    const recordPurpose = item.purpose?.toLowerCase().replace(/\s/g, "") || "";
    const activeFilter = filterType.toLowerCase().replace(/\s/g, "");

    const matchesType = filterType === "all" || recordPurpose.includes(activeFilter);
    
    return matchesDate && matchesType;
  });

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
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">

              <div className="flex items-center gap-3 shrink-0">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-(--brand-blue) shadow-sm">
                  <span className="material-symbols-outlined text-[32px]">history</span>
                </div>
                <div>
                  <h2 className="text-cdark text-[18px] font-bold">Log Record</h2>
                  <p className="text-cgray text-[14px]! m-0">Historical records for the selected date.</p>
                </div>
              </div>

              {/* RIGHT SIDE: Filter & Calendar Wrapper */}
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                
                {/* CUSTOM TYPE FILTER (Icons kept, Width synced) */}
                <div className="relative w-full md:w-52" ref={filterRef}>
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center justify-between w-full h-[45px] px-4 rounded-xl border bg-slate-50 transition-all duration-200 cursor-pointer ${
                      isFilterOpen ? "border-(--brand-blue) ring-4 ring-blue-500/5 bg-white" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">
                        {filterType === "all" ? "list" : filterType === "drop off" ? "login" : "logout"}
                      </span>
                      <span className="text-sm font-semibold text-gray-700 ">
                        {filterType === "all" ? "All Records" : filterType}
                      </span>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isFilterOpen ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  </button>

                  {isFilterOpen && (
                    <div className="absolute top-[50px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-100 p-1.5 animate-[fadeIn_0.2s_ease-out]">
                      <button 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-(--brand-blue) transition-colors"
                        onClick={() => { setFilterType("all"); setIsFilterOpen(false); }}
                      >
                        <span className="material-symbols-outlined text-[20px]">list</span> All Records
                      </button>
                      <button 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-(--brand-blue) transition-colors"
                        onClick={() => { setFilterType("drop off"); setIsFilterOpen(false); }}
                      >
                        <span className="material-symbols-outlined text-[20px]">login</span> Drop Offs
                      </button>
                      <button 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-(--brand-blue) transition-colors"
                        onClick={() => { setFilterType("pick up"); setIsFilterOpen(false); }}
                      >
                        <span className="material-symbols-outlined text-[20px]">logout</span> Pick Ups
                      </button>
                    </div>
                  )}
                </div>

                {/* CALENDAR CONTROLS */}
                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200 h-[45px] w-full md:w-auto shadow-sm">
                  <button onClick={() => handleDateChange(-1)} className="w-10 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-(--brand-blue) hover:bg-white transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>

                  <div className="relative h-full flex items-center flex-1 md:flex-none">
                    <button 
                      onClick={() => dateInputRef.current.showPicker()} 
                      className="flex items-center justify-between gap-4 px-3 h-full w-full rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100 min-w-[190px] cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-(--brand-blue)">calendar_month</span>
                        <span className="text-[13px] font-bold text-gray-700 uppercase">{monthDay}</span>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <span className="text-[11px] font-semibold text-gray-400 uppercase">{weekday.slice(0, 3)}</span>
                    </button>

                    <input type="date" ref={dateInputRef} onChange={handleCalendarChange} value={dateToInputString(currentDate)} className="absolute opacity-0 pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                  </div>

                  <button onClick={() => handleDateChange(1)} className="w-10 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-(--brand-blue) hover:bg-white transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>

              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[12%]">TRX ID</th>
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[28%]">Student</th>
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[25%]">Parent/Guardian</th>
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[15%] text-center">Time</th>
                    <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan="5" className="py-10 text-center text-gray-400 italic">Loading records...</td></tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((record) => (
                      <tr key={record._id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-2">
                           <span className="inline-block px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-gray-500 font-bold text-[10px] tracking-tight">
                              {record.transfer_id}
                           </span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            <img 
                              src={getImageUrl(record.student_details?.profile_picture, record.student_name)} 
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              alt="student"
                            />
                            <div>
                              <p className="text-cdark text-[13px] font-bold leading-tight">{record.student_name}</p>
                              <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">ID: {record.student_id}</span>
                                <span className="text-blue-400 text-[10px] font-semibold italic">{record.section_name}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={getImageUrl(record.user_details?.profile_picture, record.user_name)} 
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                alt="guardian"
                              />
                              <div>
                                 <p className="text-cdark text-[13px]! font-semibold leading-tight">{record.user_name}</p>
                                 <span className="text-gray-400 text-[10px] uppercase tracking-wider">{record.user_details?.relationship || "Authorized User"}</span>
                              </div>
                            </div>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className="text-cdark text-[13px] font-medium">{record.time}</span>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            record.purpose === "Drop off" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-green-50 text-green-600 border border-green-100"
                          }`}>
                            {record.purpose}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-gray-400 italic">
                        <div className="flex flex-col gap-1">
                          <span className="material-symbols-outlined text-[40px] mb-2">inbox</span>
                          No transfers recorded for {monthDay}.
                        </div>
                      </td>
                    </tr>
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