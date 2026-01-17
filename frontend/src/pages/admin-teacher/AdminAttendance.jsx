import React from "react";
import { Link } from 'react-router-dom';
import NavBar from "../../components/navigation/NavBar";
import "../../styles/admin-teacher/admin-dashboard.css"

export default function SuperAdminDashboard() {
  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />
      
      <main className="flex flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6 m-auto max-w-[1100px] w-full pb-10 animate-[fadeIn_0.4s_ease-out]">
          <div className="bg-[#fff7ed] hidden border border-[#fed7aa] rounded-xl mb-5 overflow-hidden animate-[slideDown_0.3s_ease-out] shadow-[0_2px_5px_rgba(249,115,22,0.05)]" id="simulationControls">
            <div className="flex flex-col h-auto gap-4 items-start w-full px-6 py-3 md:flex-row md:h-[60px] md:gap-0 md:items-center">

              <div className="flex text-[#c2410c] items-center gap-2 text-[14px] font-bold uppercase tracking-[0.5px]">
                <span className="material-symbols-outlined">tune</span>
                <span>System Override</span>
              </div>

              <div></div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}