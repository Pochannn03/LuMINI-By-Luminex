import React from "react";
import { Link } from 'react-router-dom';
import NavBar from "../../components/navigation/NavBar";
import "../../styles/admin-teacher/admin-attendance.css"

export default function SuperAdminDashboard() {
  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />
      
      <main className="flex flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6 m-auto max-w-[1100px] w-full pb-10 animate-[fadeIn_0.4s_ease-out]">
          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl overflow-hidden animate-[slideDown_0.3s_ease-out] shadow-[0_2px_5px_rgba(249,115,22,0.05)]" id="simulationControls">
            <div className="flex flex-col h-auto gap-4 items-start w-full px-6 py-3 md:flex-row md:h-[60px] md:gap-0 md:items-center">

              <div className="flex text-[#c2410c] items-center gap-2 text-[14px] font-bold uppercase tracking-[0.5px]">
                <span className="material-symbols-outlined">tune</span>
                <span>System Override</span>
              </div>

              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-orange-200 text-[13px] font-semibold text-orange-700 shadow-sm mx-auto transition-all duration-300 ease-out">
                <span class="w-2 h-2 rounded-full bg-slate-300 ring-2 ring-slate-300/30"></span>
                <span id="activeModeText">Loading...</span>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <div className="relative flex items-center w-[220px]">
                  <select name="classAction" id="classAction" className="form-input-select appearance-none">
                    <option value="dropoff">🌅 Drop-off (Morning)</option>
                    <option value="class">📚 Class In-Session</option>
                    <option value="dismissal">👋 Dismissal (Afternoon)</option>
                  </select>
                  <span className="material-symbols-outlined select-arrow">expand_more</span>
                </div>

                <button id="setSimModeBtn" className="bg-orange-500 text-white border-none py-2.5 px-5 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center h-full">Set Mode</button>
              </div>
            </div>
          </div>

          <div className="bg-white flex flex-col gap-5 rounded-[20px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)] ">
            <div className="flex flex-col items-start gap-4 mb-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2.5 text-[20px] font-bold text-(--text-dark) before:content-[''] before:w-[5px] before:h-6 before:bg-(--primary-blue) before:rounded-[10px]">
                Attendance Log
              </div>
              <div className="flex items-center gap-2 bg-slate-100 pl-4 pr-1.5 py-1.5 rounded-[50px] w-full justify-between md:w-fit md:justify-start">
                <button className="nav-btn" id="prevDateBtn">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <span id="dateDisplay" className="text-cdark text-[13px] font-semibold text-center cursor-pointer">Loading...</span>

                <input type="date" id="datePickerHidden" className="absolute opacity-0 pointer-events-none" />

                <button className="nav-btn" id="nextDateBtn">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:justify-between md:flex-row md:items-stretch md:gap-5">
              <div className="flex gap-4 flex-1">
                <div className="bg-green-50 border-green-100 flex-1 flex items-center gap-3 py-3 px-5 rounded-[14px] border">
                  <div class="bg-green-500 w-9 h-9 rounded-lg flex items-center justify-center text-[white]">
                    <span class="material-symbols-outlined">check</span>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-cdark text-[18px] font-extrabold" id="countPresent">0</span>
                    <span className="text-[11px] font-bold uppercase mt-1 opacity-[0.6]">Present</span>
                  </div>
                </div>
                <div className="bg-red-50 border-red-100 flex-1 flex items-center gap-3 py-3 px-5 rounded-[14px] border">
                  <div class="bg-red-500 w-9 h-9 rounded-lg flex items-center justify-center text-[white]">
                    <span class="material-symbols-outlined">check</span>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-cdark text-[18px] font-extrabold" id="countPresent">0</span>
                    <span className="text-[11px] font-bold uppercase mt-1 opacity-[0.6]">Absent</span>
                  </div>
                </div>
              </div>

              <button class="save-btn" id="saveBtn">
                Save Attendance
                <span class="material-symbols-outlined">save</span>
              </button>
            </div>
          </div>

          <div className="bg-[white] rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)] overflow-hidden p-2.5">
            <form action="attendanceForm">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-100" width="40%">Student Name</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-100" width="20%">Arrival Time</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-100" width="30%">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-100" width="10%">Saved</th>
                  </tr>
                </thead>
                <tbody> {/* Placeholder for data of the childrens will soon use map to list */}
                  <tr className="table-row" data-student-id="101">
                    <td>
                      <div className="flex border-none p-0 w-full md:gap-4 items-center ">
                        <div className="avatar-wrapper">
                          <img
                            src="../../../assets/placeholder_image.jpg"
                            className="w-10 h-10 md:w-11 md:h-11 md:rounded-full md:object-cover md:border-2 md:border-white md:shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
                          />
                          <div className="status-dot-indicator"></div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-cdark text-[15px] font-bold">Mia Chen</span>
                          <span className="text-[12px] font-medium text-[#94a3b8]">ID: 102394</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="inline-flex items-center gap-1.5 bg-green-50 py-1.5 px-3 rounded-[20px] text-xs font-semibold text-green-800 border border-green-100">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        7:10 AM
                      </div>
                    </td>

                    <td>
                      <div className="bg-[#f1f5f9] inline-flex p-1 rounded-xl">
                        <label className="cursor-pointer relative px-5 py-2 rounded-[10px] text-xs font-bold text-slate-500 transition-all has-checked:bg-white has-checked:text-green-700 has-checked:shadow-sm hover:bg-white/60">
                          <input type="radio" name="st_101" value="present" className="appearance-none" checked />
                          Present
                        </label>
                        <label className="cursor-pointer relative px-5 py-2 rounded-[10px] text-xs font-bold text-slate-500 transition-all has-checked:bg-white has-checked:text-amber-700 has-checked:shadow-sm hover:bg-white/60">
                          <input type="radio" className="appearance-none" name="st_101" value="late" />
                          Late
                        </label>
                        <label className="cursor-pointer relative px-4 py-2 rounded-[10px] text-xs font-bold text-slate-500 transition-all has-checked:bg-white has-checked:text-red-700 has-checked:shadow-sm hover:bg-white/60">
                          <input type="radio" className="appearance-none" name="st_101" value="absent" />
                          Absent
                        </label>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}