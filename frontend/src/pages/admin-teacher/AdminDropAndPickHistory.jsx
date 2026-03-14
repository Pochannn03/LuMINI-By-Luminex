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
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName || '?')}&backgroundColor=e2e8f0&textColor=94a3b8`;
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
        const response = await axios.get(`${BACKEND_URL}/api/transfer`, {
          params: { date: dateString },
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

      <main className="flex-1 p-4 md:p-6 animate-[fadeIn_0.4s_ease-out_forwards] overflow-y-auto">
        <div className="admin-banner max-w-[1200px] mx-auto mb-6">
          <h1 className="text-[white]!">History</h1>
          <p className="text-[white]! opacity-90 m-0">
            View historical records of student drop-offs and pick-ups.
          </p>
        </div>

        <div className="w-full max-w-[1200px] mx-auto">
          <div className="card p-4 md:p-6 min-h-[500px]">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-6 border-b border-slate-100">

              {/* Title */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-(--brand-blue) shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[32px]">history</span>
                </div>
                <div>
                  <h2 className="text-cdark text-[18px] font-bold">Log Record</h2>
                  <p className="text-cgray text-[14px]! m-0">Historical records for the selected date.</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

                {/* Type Filter */}
                <div className="relative w-full sm:w-52" ref={filterRef}>
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
                      <span className="text-sm font-semibold text-gray-700">
                        {filterType === "all" ? "All Records" : filterType === "drop off" ? "Drop Offs" : "Pick Ups"}
                      </span>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isFilterOpen ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  </button>

                  {isFilterOpen && (
                    <div className="absolute top-[50px] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1.5 animate-[fadeIn_0.2s_ease-out]">
                      {[
                        { value: "all", icon: "list", label: "All Records" },
                        { value: "drop off", icon: "login", label: "Drop Offs" },
                        { value: "pick up", icon: "logout", label: "Pick Ups" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-(--brand-blue) transition-colors"
                          onClick={() => { setFilterType(opt.value); setIsFilterOpen(false); }}
                        >
                          <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Calendar Controls */}
                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200 h-[45px] w-full sm:w-auto shadow-sm">
                  <button
                    onClick={() => handleDateChange(-1)}
                    className="w-10 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-(--brand-blue) hover:bg-white transition-all cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>

                  <div className="relative h-full flex items-center flex-1">
                    <button
                      onClick={() => dateInputRef.current.showPicker()}
                      className="flex items-center justify-between gap-2 px-3 h-full w-full rounded-lg hover:bg-white transition-all border border-transparent hover:border-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[18px] text-(--brand-blue) shrink-0">calendar_month</span>
                        <span className="text-[13px] font-bold text-gray-700 uppercase truncate">{monthDay}</span>
                      </div>
                      <div className="w-px h-4 bg-gray-300 shrink-0"></div>
                      <span className="text-[11px] font-semibold text-gray-400 uppercase shrink-0">{weekday.slice(0, 3)}</span>
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
                    className="w-10 h-full flex items-center justify-center rounded-lg text-gray-400 hover:text-(--brand-blue) hover:bg-white transition-all cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>

              </div>
            </div>

            {/* CONTENT */}
            {loading ? (
              <div className="py-16 text-center text-gray-400 italic">Loading records...</div>
            ) : filteredData.length === 0 ? (
              <div className="py-16 text-center text-gray-400 italic">
                <div className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-[40px] mb-2">inbox</span>
                  No transfers recorded for {monthDay}.
                </div>
              </div>
            ) : (
              <>
                {/* SCROLLABLE TABLE */}
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                  <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
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
                      {filteredData.map((record) => (
                        <tr key={record._id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-5 px-2">
                            <span className="inline-block px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-gray-500 font-bold text-[10px] tracking-tight">
                              {record.transfer_id}
                            </span>
                          </td>
                          <td className="py-5 px-2">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={getImageUrl(record.student_details?.profile_picture, record.student_name)}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                alt="student"
                              />
                              <div className="min-w-0">
                                <p className="text-cdark text-[13px]! font-bold leading-tight">{record.student_name}</p>
                                <p className="text-gray-400 text-[10px]! font-medium uppercase tracking-wide">ID: {record.student_id}</p>
                                <p className="text-blue-400 text-[10px]! font-semibold italic">{record.section_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-2">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getImageUrl(record.user_details?.profile_picture, record.user_name)}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                alt="guardian"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(record.user_name || '?')}&backgroundColor=e2e8f0&textColor=94a3b8`;
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-cdark text-[13px]! font-semibold leading-tight">{record.user_name}</p>
                                <p className="text-gray-400 text-[10px]! uppercase tracking-wider">{record.user_details?.relationship || "Not Authorized"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-2 text-center">
                            <p className="text-cdark text-[13px]! font-medium">{record.time}</p>
                          </td>
                          <td className="py-5 px-2 text-center">
                            <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              !record.purpose || record.purpose === "---"
                                ? "bg-gray-100 text-gray-400 border border-gray-200"
                                : record.purpose === "Drop off" 
                                ? "bg-blue-50 text-blue-600 border border-blue-100" 
                                : "bg-green-50 text-green-600 border border-green-100"
                            }`}>
                              {record.purpose || "---"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}