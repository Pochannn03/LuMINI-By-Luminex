import React, { useState, useEffect } from "react";
import axios from 'axios';
import NavBar from "../../components/navigation/NavBar";
import "../../styles/super-admin/super-admin-analytics.css";

// 1. Chart Data
const attendanceData = [
  { day: "Mon", present: 85, absent: 15 },
  { day: "Tue", present: 92, absent: 8 },
  { day: "Wed", present: 88, absent: 12 },
  { day: "Thu", present: 95, absent: 5 },
  { day: "Fri", present: 78, absent: 22 },
  { day: "Sat", present: 45, absent: 55 }, 
];

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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const fetchLogs = async () => {
        setLoading(true);
        try {
          const { data, headers } = await axios.get(`http://localhost:3000/api/audit`, {
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
            setTotalPages(Math.ceil(totalCount / logsPerPage));
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
        const response = await axios.get('http://localhost:3000/api/users/demographics', { 
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
        const response = await axios.get('http://localhost:3000/api/feedback/stats', { 
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
        const response = await axios.get('http://localhost:3000/api/transfers/today-count', { 
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

    // Adjust if we are near the end
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
        <div className="w-full max-w-[1200px] mx-auto analytics-grid">
          {/* Attendance Bar Chart */}
          <div className="card p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cgray">bar_chart</span>
                  <h2 className="text-cdark text-[18px] font-bold">Weekly Traffic</h2>
                </div>
              </div>
            </div>
            <div className="chart-container">
              {attendanceData.map((data, index) => (
                <div key={index} className="chart-bar-group group w-full">
                  <div className="chart-bar mx-auto" style={{ height: `${data.present}%` }}>
                    <span className="chart-tooltip">{data.present}% Present</span>
                  </div>
                  <span className="chart-bar-label">{data.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics Donut */}
          <div className="card p-6">
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
                        {/* Maps 'users' to 'Parents & Guardians' and 'teachers' to 'Teachers' */}
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
              <button className="btn btn-outline text-sm h-[38px] px-3">
                <span className="material-symbols-outlined text-[18px] mr-1">download</span>
                Export
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

              {/* Search Filter - Connected to State */}
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
              <p className="text-xs text-cgray">
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

                {/* First Page Quick Link (Optional: only if start > 1) */}
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

                {/* Last Page Quick Link (Optional: only if end < totalPages) */}
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