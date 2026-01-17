import React from "react";
import { Link } from 'react-router-dom';
import NavBar from "../../components/navigation/NavBar";
import "../../styles/admin-teacher/admin-dashboard.css"

export default function SuperAdminDashboard() {
  return (
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="admin-banner">
          <div>
            <h1>Welcome Back!</h1>
            <p>Ready for your next class?</p>
          </div>
        </section>


      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
        {/* Left Part of Content */}
        <div className="flex flex-col gap-6">
          <div className="card queue-card">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb2">
                <span class="material-symbols-outlined blue-icon text-[24px]">schedule</span>
                <h2 className="text-cdark text-[18px] font-bold" id="queueTitle">Drop-off Queue</h2>
              </div>
              <p className="text-cgray text-[14px]! leading-normal ml-0">Real-time updates from parents.</p>
            </div>

            <div class="flex flex-col gap-4" id="queueContainer">
              <p className="text-[#94a3b8] p-5 text-center">Loading queue...</p>
            </div>
          </div>

          <div className="card emergency-card">
            <div className="emergency-card-wrapper">
              <span class="material-symbols-outlined shrink-0">e911_emergency</span>
            </div>
            <div>
              <h3 className="text-[#c53030] text-[16px]! font-bold mb-0.5">Emergency Override</h3>
              <p className="text-[#742a2a] text-[12px]!">Alert staff and override dismissal process.</p>
            </div>
            <span class="material-symbols-outlined arrow-icon ml-auto text-[#c53030]!">arrow_forward</span>
          </div>
        </div>

        {/* Right Part of the Content */}
        <div className="flex flex-col gap-6">
          <div className="card action-card flex flex-col gap-5">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span class="material-symbols-outlined orange-icon text-[24px]">qr_code_scanner</span>
                <h2 className="text-cdark text-[18px] font-bold">Guardian QR Verification</h2>
              </div>
              <p class="text-cgray text-[14px]! leading-normal ml-0">Scan guardian's QR code for student pickup.</p>
            </div>

            <div class="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0">
              <span class="material-symbols-outlined qr-large-icon">qr_code_2</span>
            </div>

            <div className="flex flex-col gap-3">
              <button class="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" id="scanGuardianBtn">
                <span class="material-symbols-outlined text-[20px]!">center_focus_weak</span>
                Scan Guardian QR Code
              </button>
              <button class="btn btn-outline gap-2 h-[50px] font-semibold rounded-xl text-[14px]! border-none w-full">Verify Manually</button>
            </div>
          </div>

          <div className="card action-card flex flex-col gap-5 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span class="material-symbols-outlined orange-icon text-[24px]">qr_code_2</span>
                <h2 className="text-cdark text-[18px]! font-bold">Student QR Attendance</h2>
              </div>
              <p className="text-cgray leading-normal ml-0 text-[14px]!">Initiate scan for daily student attendance.</p>
            </div>

            <div class="w-full h-[220px] bg-[#dbeafe] flex items-center justify-center rounded-xl mb-0">
              <span class="material-symbols-outlined qr-large-icon">qr_code_2</span>
            </div>

            <div class="flex flex-col gap-3">
              <button class="btn btn-primary gap-2 h-[50px] font-semibold rounded-xl text-[14px] border-none w-full" id="startScanBtn">
                <span class="material-symbols-outlined">center_focus_weak</span>
                Scan Student QR Code
              </button>
            </div>
          </div>

          <div className="card action-card flex flex-col gap-5 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <span class="material-symbols-outlined purple-icon text-[24px]">campaign</span>
                <h2 className="text-cdark font-bold text-[18px]!">Class Announcement</h2>
              </div>
              <p className="text-cgray leading-normal ml-0 text-[14px]!">Post updates to parents.</p>
            </div>

            <div className="announcement-box">
              <textarea className="text-cdark w-full h-20 border-none bg-transparent resize-none text-[14px] outline-none" placeholder="Write an announcement..."></textarea>
              <div className="flex justify-between items-center mt-2.5 pt-2.5 ">
                <div className="flex gap-[5px]">
                  <button className="text-cgray bg-none border-none p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors duration-200" title="Add Image">
                    <span className="material-symbols-outlined">image</span>
                  </button>
                  <button className="text-cgray bg-none border-none p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors duration-200" title="Add Link">
                    <span className="material-symbols-outlined">link</span>
                  </button>
                </div>
                <button className="btn-post">Post</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}