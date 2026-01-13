import React from "react";
import { Link } from 'react-router-dom';
import '../../styles/superadmindashboard.css';
import NavBar from "../../components/navigation/NavBar";

export default function SuperAdminDashboard() {
  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">

      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="admin-banner">
          <div>
            <h1>System Overview</h1>
            <p>Here is what's happening across the school today.</p>
          </div>
        </section>


      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="card stat-card">
              <div className="stat-icon blue-bg">
                <span class="material-symbols-outlined">groups</span>
              </div>
              <div class="stat-info">
                <h3 id="statTotalStudents">--</h3> {/* This is where the data will be displayed */}
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
                  <h3 id="statTotalTeachers">--</h3> {/* This is where the data will be displayed */}
                  <p>Active Teachers</p>
                </div>
              </div>

              <div class="card stat-card">
                <div class="stat-icon orange-bg">
                  <span class="material-symbols-outlined">family_restroom</span>
                </div>
                <div class="stat-info">
                  <h3 id="statTotalParents">--</h3> {/* This is where the data will be displayed */}
                  <p>Parents Registered</p>
                </div>
            </div>
            
          </div>

          <div className="card queue-card">
            <div className="mb-6">
              <h2 className="text-cdark text-[18px]! font-bold!">Pending Account Approvals</h2>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-cgray p-2.5">Loading Pending Request...</p> {/* Data Pending for Acc Approval here*/}
            </div>

          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined orange-icon text-[24px]">
                  settings_suggest
                </span>
                <h2 className="text-cdark text-[18px] font-bold">Quick Management</h2>
              </div>
              <p className="text-cgray text-[13px]! leading-normal!">
                Access key administrative areas.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link to="#" className="quick-link-item">
                <div className="link-icon-box icon-blue">
                    <span class="material-symbols-outlined">manage_accounts</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="text-cdark text-[15px]! font-semibold! m-0">Manage Classes & Students</h3>
                  <p className="text-cgray text-[12px]! !leading-[1.4]!">Add, edit, or remove classes and student profiles.</p>
                </div>
                <div>
                  <span className="material-symbols-outlined arrow-icon">
                    chevron_right
                  </span>
                </div>
              </Link>
              
              <Link to="#" className="quick-link-item">
                <div className="link-icon-box icon-blue">
                    <span class="material-symbols-outlined">group</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="text-cdark text-[15px]! font-semibold! m-0">Accounts</h3>
                  <p className="text-cgray text-[12px]! !leading-[1.4]!">Manage user accounts and deactivate access.</p>
                </div>
                <div>
                  <span className="material-symbols-outlined arrow-icon">
                    chevron_right
                  </span>
                </div>
              </Link>

              <Link to="#" className="quick-link-item danger-link">
                <div className="link-icon-box icon-red">
                    <span class="material-symbols-outlined">campaign</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <h3 className="text-cdark text-[15px]! font-semibold! m-0">System Broadcast</h3>
                  <p className="text-cgray text-[12px]! !leading-[1.4]!">Send emergency alerts or announcements.</p>
                </div>
                <div>
                  <span className="material-symbols-outlined arrow-icon">
                    chevron_right
                  </span>
                </div>
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined purple-icon text-[24px]">
                  dns
                </span>
                <h2 className="text-cdark text-[18px] font-bold">System Activity</h2>
              </div>
            </div>
            
            {/* Content Below is for Quick System Notification Hence Data Activities will replaced the static information below*/}
            <div className="flex flex-col gap-4">
              <div className="queue-item">
                <div className="success w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">cloud_done</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <span className="text-cdark text-[14px] font-bold">Backup Completed</span>
                  <span className="text-cgray text-[12px]">Daily database backup successful.</span>
                  <span className="text-cgray text-[11px] font-medium mt-2px">2:00 AM</span>
                </div>
              </div>

              <div className="queue-item">
                <div className="warning w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">lock_person</span>
                </div>
                <div className="flex flex-col flex-1 gap-0.5">
                  <span className="text-cdark text-[14px] font-bold">Failed Login Attempt</span>
                  <span className="text-cgray text-[12px]">Multiple attempts on admin_02.</span>
                  <span className="text-cgray text-[11px] font-medium mt-2px">Yesterday</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
    </div>
  );
}