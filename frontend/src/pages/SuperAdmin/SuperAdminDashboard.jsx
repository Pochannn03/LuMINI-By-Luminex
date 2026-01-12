import React from "react";
import { Link } from 'react-router-dom';
import '../../styles/superadmindashboard.css';
import NavBar from "../../components/navigation/NavBar";

export default function SuperAdminDashboard() {
  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">

      <NavBar />

      <main className="flex flex-1 overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="admin-banner">
          <div>
            <h1>System Overview</h1>
            <p>Here is what's happening across the school today.</p>
          </div>
        </section>
      </main>

      <div className="grid grid-cols-1 gap-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
            <div className="flex flex-row gap-16 w-full">
              <div className="card stat-card">
                <div className="stat-icon blue-bg">
                  <span class="material-symbols-outlined">groups</span>
                </div>
                <div class="stat-info">
                  <h3 id="statTotalStudents">--</h3>
                  <p>Total Students</p>
                </div>
              </div>

              <div class="card stat-card">
                <div class="stat-icon purple-bg">
                  <span class="material-symbols-outlined"
                    >cast_for_education</span
                  >
                </div>
                <div class="stat-info">
                  <h3 id="statTotalTeachers">--</h3>
                  <p>Active Teachers</p>
                </div>
              </div>

              <div class="card stat-card">
                <div class="stat-icon orange-bg">
                  <span class="material-symbols-outlined">family_restroom</span>
                </div>
                <div class="stat-info">
                  <h3 id="statTotalParents">--</h3>
                  <p>Parents Registered</p>
                </div>
              </div>
            </div>
            
          </div>

          <div className="card queue-card">
            <div className="mb-6">
              <h2 className="text-cdark text-[18px] font-bold">Pending Account Approvals</h2>
            </div>

            <div className="flex flex-col gap-[16px]">

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}