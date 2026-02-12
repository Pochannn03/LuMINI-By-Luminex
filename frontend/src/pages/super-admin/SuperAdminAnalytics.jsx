import React, { useState } from "react";
import NavBar from "../../components/navigation/NavBar";
import "../../styles/super-admin/super-admin-analytics.css";

// --- Mock Data ---

// 1. Chart Data
const attendanceData = [
  { day: "Mon", present: 85, absent: 15 },
  { day: "Tue", present: 92, absent: 8 },
  { day: "Wed", present: 88, absent: 12 },
  { day: "Thu", present: 95, absent: 5 },
  { day: "Fri", present: 78, absent: 22 },
  { day: "Sat", present: 45, absent: 55 }, // Weekend classes or activities
];

const userStats = {
  students: { count: 850, color: "#39a8ed" }, // Brand Blue
  parents: { count: 620, color: "#2ecc71" },  // Green
  teachers: { count: 85, color: "#f59e0b" },  // Orange
  admins: { count: 12, color: "#9b59b6" }     // Purple
};

// 2. Audit Trail Mock Data
const initialAuditLogs = [
  { id: 101, user: "Super Admin", role: "SuperAdmin", action: "System Backup", target: "Database", status: "success", time: "10:00 AM", date: "2026-02-11" },
  { id: 102, user: "Jane Doe", role: "Teacher", action: "Update Grades", target: "Class 10-A", status: "success", time: "09:45 AM", date: "2026-02-11" },
  { id: 103, user: "John Smith", role: "Parent", action: "Login Attempt", target: "Mobile App", status: "error", time: "09:12 AM", date: "2026-02-11" },
  { id: 104, user: "Guard 01", role: "Staff", action: "QR Scan", target: "Gate 1", status: "success", time: "08:30 AM", date: "2026-02-11" },
  { id: 105, user: "Admin_02", role: "Admin", action: "Edit Schedule", target: "Faculty Roster", status: "warning", time: "08:15 AM", date: "2026-02-11" },
  { id: 106, user: "Maria Clara", role: "Student", action: "Library Checkout", target: "Book #4421", status: "success", time: "08:00 AM", date: "2026-02-11" },
  { id: 107, user: "System", role: "Bot", action: "Auto-Maintenance", target: "Server Cache", status: "success", time: "02:00 AM", date: "2026-02-11" },
];

export default function SuperAdminAnalytics() {
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // --- Calculations for Donut Chart ---
  const totalUsers = Object.values(userStats).reduce((acc, curr) => acc + curr.count, 0);
  
  // Create conic-gradient string dynamically
  let currentDeg = 0;
  const gradientParts = Object.values(userStats).map(stat => {
    const deg = (stat.count / totalUsers) * 360;
    const part = `${stat.color} ${currentDeg}deg ${currentDeg + deg}deg`;
    currentDeg += deg;
    return part;
  });
  const donutGradient = `conic-gradient(${gradientParts.join(", ")})`;

  // --- Filtering Audit Logs ---
  const filteredLogs = initialAuditLogs.filter(log => {
    const roleMatch = filterRole === "All" || log.role === filterRole;
    const statusMatch = filterStatus === "All" || log.status === filterStatus;
    return roleMatch && statusMatch;
  });

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
            <div className="hidden md:block">
              <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/10">
                Today: Feb 11, 2026
              </span>
            </div>
          </div>
        </section>

        {/* --- Top Level Stats --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-[1200px] mx-auto mb-8">
          <div className="card stat-card">
            <div className="stat-icon blue-bg">
              <span className="material-symbols-outlined">monitoring</span>
            </div>
            <div className="stat-info">
              <h3>99.9%</h3>
              <p>System Uptime</p>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon purple-bg">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <div className="stat-info">
              <h3>{totalUsers.toLocaleString()}</h3>
              <p>Total Users</p>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon orange-bg">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div className="stat-info">
              <h3>3</h3>
              <p>Flags Today</p>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon" style={{ background: "#10b981" }}> {/* Custom Green */}
              <span className="material-symbols-outlined">database</span>
            </div>
            <div className="stat-info">
              <h3>Healthy</h3>
              <p>Database Status</p>
            </div>
          </div>
        </div>

        {/* --- Visualizations Section --- */}
        <div className="w-full max-w-[1200px] mx-auto analytics-grid">
          
          {/* Left: Attendance Bar Chart */}
          <div className="card p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cgray">bar_chart</span>
                  <h2 className="text-cdark text-[18px] font-bold">Weekly Traffic</h2>
                </div>
                <p className="text-cgray text-sm mt-1">Student attendance & Gate scans</p>
              </div>
              <button className="btn-icon-tool">
                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
              </button>
            </div>
            
            <div className="chart-container">
              {attendanceData.map((data, index) => (
                <div key={index} className="chart-bar-group group w-full">
                  <div 
                    className="chart-bar mx-auto" 
                    style={{ height: `${data.present}%` }}
                  >
                    <span className="chart-tooltip">{data.present}% Present</span>
                  </div>
                  <span className="chart-bar-label">{data.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: User Demographics Donut */}
          <div className="card p-6">
            <div className="mb-6">
               <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cgray">pie_chart</span>
                  <h2 className="text-cdark text-[18px] font-bold">Demographics</h2>
               </div>
               <p className="text-cgray text-sm mt-1">User distribution by role</p>
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
                <div className="legend-item">
                  <div className="legend-indicator">
                    <div className="legend-color" style={{background: userStats.students.color}}></div>
                    <span>Students</span>
                  </div>
                  <span className="legend-value">{userStats.students.count}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-indicator">
                    <div className="legend-color" style={{background: userStats.parents.color}}></div>
                    <span>Parents</span>
                  </div>
                  <span className="legend-value">{userStats.parents.count}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-indicator">
                    <div className="legend-color" style={{background: userStats.teachers.color}}></div>
                    <span>Teachers</span>
                  </div>
                  <span className="legend-value">{userStats.teachers.count}</span>
                </div>
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
                <p className="text-cgray text-sm mt-1">
                  Comprehensive log of all user activities and system events.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button className="btn btn-outline text-sm h-[38px] px-3">
                  <span className="material-symbols-outlined text-[18px] mr-1">download</span>
                  Export
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
              
              {/* Role Filter */}
              <div className="filter-container">
                 <span className="material-symbols-outlined filter-icon">filter_list</span>
                 <select 
                   className="filter-select"
                   value={filterRole}
                   onChange={(e) => setFilterRole(e.target.value)}
                 >
                   <option value="All">All Roles</option>
                   <option value="SuperAdmin">Super Admin</option>
                   <option value="Admin">Admin</option>
                   <option value="Teacher">Teacher</option>
                   <option value="Parent">Parent</option>
                 </select>
              </div>

              {/* Status Filter */}
              <div className="filter-container">
                 <span className="material-symbols-outlined filter-icon">tune</span>
                 <select 
                   className="filter-select"
                   value={filterStatus}
                   onChange={(e) => setFilterStatus(e.target.value)}
                 >
                   <option value="All">All Status</option>
                   <option value="success">Success</option>
                   <option value="warning">Warning</option>
                   <option value="error">Error</option>
                 </select>
              </div>
              
              {/* Search Filter */}
              <div className="filter-container search-wrapper ml-auto">
                <span className="material-symbols-outlined filter-icon">search</span>
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  className="filter-select md:w-[300px]"
                />
              </div>
            </div>

            {/* Audit Table */}
            <div className="audit-table-container">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Target / Details</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="text-cgray font-mono text-xs">
                          <div>{log.date}</div>
                          <div className="text-cdark font-semibold">{log.time}</div>
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">
                              {log.user.charAt(0)}
                            </div>
                            <span className="font-medium">{log.user}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-cgray">
                            {log.role}
                          </span>
                        </td>
                        <td className="font-medium text-brand-dark">{log.action}</td>
                        <td className="text-cgray">{log.target}</td>
                        <td>
                          <span className={`status-badge ${log.status}`}>
                            <span className="status-dot"></span>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                        </td>
                        <td className="text-right">
                          <button className="text-cgray hover:text-brand-blue transition-colors">
                            <span className="material-symbols-outlined text-[20px]">info</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-cgray">
                        No logs found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Mockup */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-cgray">Showing {filteredLogs.length} results</p>
              <div className="flex gap-2">
                <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-lg" disabled>
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-lg bg-blue-50 border-blue-200 text-blue-600">
                  1
                </button>
                <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-lg">
                  2
                </button>
                <button className="btn btn-outline h-8 w-8 p-0! flex items-center justify-center rounded-lg">
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