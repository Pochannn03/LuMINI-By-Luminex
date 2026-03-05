import React, { useState, useEffect } from "react";
import axios from 'axios';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; 
import NavBar from "../../components/navigation/NavBar";
import "../../styles/super-admin/super-admin-analytics.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function SuperAdminAnalytics() {
  // AUDIT STATE
  const [auditLogs, setAuditLogs] = useState([]);
  const [filterRole, setFilterRole] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // AUDIT PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 10;

  // DEMOGRAPHIC STATE
  const [userStats, setUserStats] = useState({
    teachers: { count: 0, color: "#f59e0b" },
    users: { count: 0, color: "#39a8ed" }
  });

  // FEEDBACK STATE
  const [feedbackStats, setFeedbackStats] = useState({
    total: 0,
    positive: 0,
    negative: 0,
    satisfactionRate: 0
  });

  // TRANSFER STATE
  const [todayTransfers, setTodayTransfers] = useState(0);

  // WEEKLY ATTENDANCE STATE
  const [weeklyTraffic, setWeeklyTraffic] = useState([]);

  // --- NEW: CUSTOM EXPORT MODAL STATES ---
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartPage, setExportStartPage] = useState(1);
  const [exportEndPage, setExportEndPage] = useState(1);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const fetchLogs = async () => {
        setLoading(true);
        try {
          const { data, headers } = await axios.get(`${BACKEND_URL}/api/audit`, {
            params: { 
              role: filterRole === "All" ? "" : filterRole, 
              search: searchQuery,
              page: currentPage,
              limit: logsPerPage
            }, 
            withCredentials: true
          });

          if (Array.isArray(data)) {
            setAuditLogs(data);
            const totalCount = parseInt(headers['x-total-count']) || 0;
            setTotalPages(Math.ceil(totalCount / logsPerPage) || 1);
          }
        } catch (err) {
          console.error("Error fetching logs:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchLogs();
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [filterRole, searchQuery, currentPage]);

  useEffect(() => {
    const fetchDemographics = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/users/demographics`, { 
          withCredentials: true 
        });
        
        if (response.data.success) {
          setUserStats(response.data.stats);
        }
      } catch (err) {
        console.error("Error loading demographics:", err);
      }
    };

    fetchDemographics();
  }, []);

  useEffect(() => {
    const fetchFeedbackStats = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/feedback/stats`, { 
          withCredentials: true 
        });
        
        if (response.data.success) {
          setFeedbackStats({
            total: response.data.total,
            positive: response.data.positive,
            negative: response.data.negative,
            satisfactionRate: response.data.satisfactionRate
          });
        }
      } catch (err) {
        console.error("Error loading feedback stats:", err);
      }
    };

    fetchFeedbackStats();
  }, []);

  useEffect(() => {
    const fetchTodayTransfers = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/transfers/today-count`, { 
          withCredentials: true 
        });
        if (response.data.success) {
          setTodayTransfers(response.data.count);
        }
      } catch (err) {
        console.error("Error loading today's transfers:", err);
      }
    };

    fetchTodayTransfers();
  }, []);

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/attendance/weekly-stats`, { 
          withCredentials: true 
        });
        if (response.data.success) {
          setWeeklyTraffic(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching weekly stats:", err);
      }
    };
    fetchWeeklyStats();
  }, []);

  // --- TRIGGER MODAL HANDLER ---
  const handleOpenExportModal = () => {
    setExportStartPage(1);
    setExportEndPage(totalPages);
    setIsExportModalOpen(true);
  };

  // --- DYNAMIC PDF EXPORT FUNCTION ---
  const handleExportPDF = async () => {
    // Validate Inputs
    if (exportStartPage < 1 || exportEndPage > totalPages || exportStartPage > exportEndPage) {
      alert("Please enter a valid page range.");
      return;
    }

    try {
      // 1. Silently fetch ALL matching logs from the backend
      const { data } = await axios.get(`http://${BACKEND_URL}/api/audit`, {
        params: { 
          role: filterRole === "All" ? "" : filterRole, 
          search: searchQuery,
          limit: 100000 // Extremely high limit to grab all filtered records
        }, 
        withCredentials: true
      });

      let exportData = Array.isArray(data) ? data : [];

      // 2. Mathematically slice the array to match the requested page range
      const startIndex = (exportStartPage - 1) * logsPerPage;
      const endIndex = exportEndPage * logsPerPage;
      exportData = exportData.slice(startIndex, endIndex);

      if (exportData.length === 0) {
        alert("No records found in the selected range.");
        return;
      }

      // 3. Generate the PDF
      const doc = new jsPDF();
      
      // Add Document Header
      doc.setFontSize(18);
      doc.text("System Audit Trail Report", 14, 22);
      
      // Add Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Filter Applied: ${filterRole} | Search Query: ${searchQuery || 'None'}`, 14, 36);
      doc.text(`Pages Exported: ${exportStartPage} to ${exportEndPage} | Total Records: ${exportData.length}`, 14, 42);

      // Define Table Columns and Map Data
      const tableColumn = ["User", "Role", "Action", "Target / Details", "Timestamp"];
      const tableRows = [];

      exportData.forEach(log => {
        const logData = [
          log.full_name || "Unknown",
          log.role || "N/A",
          log.action || "N/A",
          log.target || "N/A",
          log.createdAt || log.created_at || log.timestamp 
            ? new Date(log.createdAt || log.created_at || log.timestamp).toLocaleString() 
            : "Date Missing"
        ];
        tableRows.push(logData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 48,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [58, 176, 249] }, 
        alternateRowStyles: { fillColor: [248, 250, 252] }, 
      });

      // Download the PDF
      doc.save(`LuMINI_Audit_Trail_Pages_${exportStartPage}_to_${exportEndPage}.pdf`);
      setIsExportModalOpen(false); // Close modal on success

    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export the audit trail. Please try again.");
    }
  };

  // --- Calculations for Donut Chart ---
  const totalUsers = Object.values(userStats).reduce((acc, curr) => acc + curr.count, 0) || 1; 
  
  let currentDeg = 0;
  const gradientParts = Object.values(userStats).map(stat => {
    const deg = (stat.count / totalUsers) * 360;
    const part = `${stat.color} ${currentDeg}deg ${currentDeg + deg}deg`;
    currentDeg += deg;
    return part;
  });
  const donutGradient = `conic-gradient(${gradientParts.join(", ")})`;

  const getPageNumbers = () => {
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      {/* --- NEW: CUSTOM DYNAMIC EXPORT MODAL --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-[420px] flex flex-col animate-[fadeIn_0.2s_ease-out]">
            
            <div className="flex items-center gap-3 mb-2 text-[var(--brand-blue)]">
              <span className="material-symbols-outlined text-[36px]">picture_as_pdf</span>
              <h3 className="text-2xl font-bold text-slate-800">Export Report</h3>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Select the page range of the audit trail you want to download. (Max pages: {totalPages})
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex flex-col flex-1">
                <label className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">Start Page</label>
                <input 
                  type="number" 
                  min="1" 
                  max={exportEndPage} 
                  value={exportStartPage} 
                  onChange={e => setExportStartPage(Number(e.target.value))} 
                  className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:border-[var(--brand-blue)] transition-colors" 
                />
              </div>
              <span className="mt-5 text-slate-300 font-bold">TO</span>
              <div className="flex flex-col flex-1">
                <label className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">End Page</label>
                <input 
                  type="number" 
                  min={exportStartPage} 
                  max={totalPages} 
                  value={exportEndPage} 
                  onChange={e => setExportEndPage(Number(e.target.value))} 
                  className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 font-bold text-slate-700 outline-none focus:border-[var(--brand-blue)] transition-colors" 
                />
              </div>
            </div>

            {/* DYNAMIC CONFIRMATION MESSAGE */}
            <div className="bg-blue-50 border border-blue-100 flex items-start gap-3 p-4 rounded-xl mb-8">
              <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
              <p className="text-blue-800 text-[13px] leading-relaxed">
                <strong>Confirmation:</strong> You are about to download <span className="font-bold underline">page {exportStartPage} to {exportEndPage}</span> of the current audit trail.
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button 
                type="button" 
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" 
                onClick={() => setIsExportModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="flex-[1.5] py-3.5 rounded-xl font-bold text-white bg-[var(--brand-blue)] hover:bg-[#2c8ac4] shadow-md transition-all active:scale-95 flex items-center justify-center gap-2" 
                onClick={handleExportPDF}
              >
                <span className="material-symbols-outlined text-[20px]">download</span> Download PDF
              </button>
            </div>
            
          </div>
        </div>
      )}

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards] pb-20">
        
        {/* Banner Section */}
        <section className="superadmin-banner mb-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-[white]! text-[28px]! font-bold mb-2 tracking-[-0.5px]">
                Analytics & Audit
              </h1>
              <p className="text-[white]! opacity-80 text-[15px]! m-0">
                Deep dive into system performance and user activities.
              </p>
            </div>
          </div>
        </section>

        {/* --- Top Level Stats --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-[1200px] mx-auto mb-8">
          <div className="card stat-card">
            <div className="stat-icon blue-bg">
              <span className="material-symbols-outlined">swap_horiz</span>
            </div>
            <div className="stat-info">
              <h3>{todayTransfers}</h3>
              <p>Transfers Today</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon purple-bg">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <div className="stat-info">
              <h3>{totalUsers.toLocaleString()}</h3>
              <p>Total Users</p></div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon orange-bg">
              <span className="material-symbols-outlined">feedback</span>
            </div>
            <div className="stat-info">
              <h3>{feedbackStats.total}</h3>
              <p>Feedbacks</p></div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: "#10b981" }}>
              <span className="material-symbols-outlined">thumb_up</span>
            </div>
            <div className="stat-info">
              <h3>{feedbackStats.satisfactionRate} %</h3>
              <p>Feedback Satisfaction</p></div>
          </div>
        </div>

        {/* --- Visualizations --- */}
        <div className="w-full max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-6">
          
          {/* Attendance Bar Chart */}
          <div className="card p-6 flex flex-col justify-between w-full lg:w-1/2">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cgray">bar_chart</span>
                  <h2 className="text-cdark text-[18px] font-bold">Weekly Attendance Traffic</h2>
                </div>
              </div>
            </div>
            <div className="chart-container flex items-end justify-between h-[200px] pt-8">
              {weeklyTraffic.map((data, index) => (
                <div key={index} className="chart-bar-group group flex flex-col items-center w-full">
                  <div className="relative w-full flex justify-center items-end h-[150px]">
                    {/* Tooltip */}
                    <span className="chart-tooltip absolute -top-8 bg-cdark text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {data.present}% Present
                    </span>
                    
                    {/* The Bar */}
                    <div 
                      className={`chart-bar w-8 rounded-t-sm transition-all duration-700 ease-out ${
                        data.isToday ? 'bg-[#3ab0f9]' : 'bg-[#e2e8f0]'
                      }`} 
                      style={{ height: `${data.present || 5}%` }} 
                    ></div>
                  </div>
                  
                  {/* Label */}
                  <span className={`chart-bar-label mt-2 text-xs font-semibold ${
                    data.isToday ? 'text-[#3ab0f9]' : 'text-cgray'
                  }`}>
                    {data.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics Donut */}
          <div className="card p-6 w-full lg:w-1/2">
            <div className="mb-6">
               <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cgray">pie_chart</span>
                  <h2 className="text-cdark text-[18px] font-bold">Demographics</h2>
               </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="donut-chart-wrapper mb-8">
                <div className="donut-chart" style={{ background: donutGradient }}></div>
                <div className="donut-center">
                  <span className="text-3xl font-bold text-cdark">{totalUsers}</span>
                  <span className="text-xs text-clight uppercase tracking-wider font-semibold">Total</span>
                </div>
              </div>

              <div className="w-full chart-legend">
                {Object.entries(userStats).map(([key, stat]) => (
                  <div className="legend-item" key={key}>
                    <div className="legend-indicator">
                      <div className="legend-color" style={{ background: stat.color }}></div>
                      <span className="capitalize">
                        {key === 'users' ? 'Parents & Guardians' : 'Teachers'}
                      </span>
                    </div>
                    <span className="legend-value">{stat.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>

        {/* --- Audit Trail Section --- */}
        <div className="w-full max-w-[1200px] mx-auto mt-6">
          <div className="card p-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cgray">history</span>
                  <h2 className="text-cdark text-[18px] font-bold">System Audit Trail</h2>
                </div>
              </div>
              
              {/* TRIGGER EXPORT MODAL */}
              <button 
                className="btn btn-outline text-sm h-[38px] px-3 cursor-pointer"
                onClick={handleOpenExportModal}
              >
                <span className="material-symbols-outlined text-[18px] mr-1">download</span>
                Export Data
              </button>

            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
              <div className="filter-container">
                 <span className="material-symbols-outlined filter-icon">filter_list</span>
                 <select 
                   className="filter-select"
                   value={filterRole}
                   onChange={(e) => setFilterRole(e.target.value)}
                 >
                   <option value="All">All Roles</option>
                   <option value="superadmin">Super Admin</option>
                   <option value="admin">Teacher</option>
                   <option value="user">Users</option>
                 </select>
              </div>

              {/* Search Filter */}
              <div className="filter-container search-wrapper ml-auto">
                <span className="material-symbols-outlined filter-icon">search</span>
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  className="filter-select md:w-[300px] cursor-text!"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Audit Table */}
            <div className="audit-table-container">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Target / Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-8">Loading logs...</td></tr>
                  ) : (Array.isArray(auditLogs) && auditLogs.length > 0) ? (
                    auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">
                              {log.full_name ? log.full_name.charAt(0) : "?"}
                            </div>
                            <span className="font-medium">{log.full_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-cgray">
                            {log.role}
                          </span>
                        </td>
                        <td className="font-medium text-brand-dark">{log.action}</td>
                        <td className="text-cgray">{log.target}</td>
                        <td className="text-cgray text-xs flex flex-col gap-0.5 justify-center">
                        {(log.createdAt || log.created_at || log.timestamp) ? (
                          <>
                            <div className="font-semibold">
                              {new Date(log.createdAt || log.created_at || log.timestamp).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-cdark text-xd">
                              {new Date(log.createdAt || log.created_at || log.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="text-red-400">Date Missing</div>
                        )}
                      </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="text-center py-8">No logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs! text-cgray">
                Showing page <b>{currentPage}</b> of <b>{totalPages}</b>
              </p>
              
              <div className="flex gap-1">
                {/* Previous Button */}
                <button 
                  className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>

                {/* First Page Quick Link */}
                {getPageNumbers()[0] > 1 && (
                  <>
                    <button className="btn btn-outline h-8 w-8 p-0!" onClick={() => setCurrentPage(1)}>1</button>
                    <span className="px-1 self-center text-gray-400 text-xs">...</span>
                  </>
                )}

                {/* Sliding Page Numbers */}
                {getPageNumbers().map(pageNum => (
                  <button 
                    key={pageNum}
                    className={`btn btn-outline h-8 w-8 p-0! transition-colors flex items-center justify-center font-medium ${ currentPage === pageNum  
                        ? 'bg-[#3ab0f9]! text-white! border-[#3ab0f9]! shadow-sm' 
                        : 'hover:bg-blue-50 text-gray-600 border-gray-200'
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Last Page Quick Link */}
                {getPageNumbers().slice(-1)[0] < totalPages && (
                  <>
                    <span className="px-1 self-center text-gray-400 text-xs">...</span>
                    <button className="btn btn-outline h-8 w-8 p-0!" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                  </>
                )}

                {/* Next Button */}
                <button 
                  className="btn btn-outline h-8 w-8 p-0! disabled:opacity-50"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}