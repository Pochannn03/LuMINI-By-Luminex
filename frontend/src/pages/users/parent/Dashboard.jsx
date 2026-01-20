import React from "react";
import { Link } from 'react-router-dom';
import '../../../styles/user/parent/dashboard.css';
import NavBar from "../../../components/navigation/NavBar";


export default function Dashboard() {
  return(
    <div className="dashboard-wrapper flex flex-col h-full transition-[padding-left] duration-300 ease-in-out lg:pl-20 pt-20">
      <NavBar />

      <main className="overflow-y-auto p-6 animate-[fadeIn_0.4s_ease-out_forwards]">
        <section className="welcome-banner">
          <div>
            <h1 className="text-[28px]! font-bold text-[white]! mb-2 tracking-[-0.5px]">Welcome!</h1>
            <p className="text-[white]! opacity-80 text-[15px]! m-0">Here is the daily status for your children.</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 w-full max-w-[1200px] mx-auto items-start">
          <div className="flex flex-col gap-6"> {/* Grid Left */}
            <div className="card flex flex-col items-center gap-7 py-10 px-6 bg-[#e1f5fe] border border-[#b3e5fc] rounded-[20px]">

              <div className="flex flex-col items-center gap-1.5">
                <div className="p-1 bg-white rounded-full shadow-[0_4px_12px_rgba(57,168,237,0.2)] mb-2">
                  <img src="../../../assets/placeholder_image.jpg" className="w-[90px] h-[90px] rounded-full object-cover block" /> {/* Profile Picutre of the User */}
                </div>
                {/* Students Informataion yet to be redesigned for possible multiple kid under the same parent/guardian */}
                <h2 className="text-cdark text-[22px] font-bold">Mia Chen</h2>
                <span className="text-cgray text-[14px] font-medium">KinderGarten - Class A</span>
              </div>

              <div className="flex items-start justify-between w-full max-w-[340px] relative my-2.5">
                <div class="absolute top-[18px] left-2.5 right-2.5 h-[3px] bg-[#cfd8dc] z-0 rounded-sm"></div>
              
                <div className="tracker-step active">
                  <div className="step-circle">
                    <span className="material-symbols-outlined text-[20px]">directions_walk</span>
                  </div>
                  <span class="step-label text-[12px] text-[#b0bec5] font-semibold">On Way</span>
                </div>

                <div className="tracker-step">
                  <div className="step-circle">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                  </div>
                  <span class="step-label text-[12px] text-[#b0bec5] font-semibold">Learning</span>
                </div>

                <div className="tracker-step">
                  <div className="step-circle">
                    <span className="material-symbols-outlined text-[20px]">home</span>
                  </div>
                  <span class="step-label text-[12px] text-[#b0bec5] font-semibold">Dismissed</span>
                </div>
              </div>

              <div className="bg-[#fffbeb] border-2 border-[#fcd34d] py-3 px-9 rounded-[50px] shadow-[0_4px_10px_rgba(245,158,11,0.1)]">
                {/* Information depends on Status(static for the mean time */}
                <p className="text-[#b45309]! font-bold! text-base">Learning At School</p>
              </div>
            </div>

            <div className="card action-card">
              <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <span class="material-symbols-outlined blue-icon text-[24px]">tune</span>
                  <h2 className="text-cdark text-[18px] font-bold">Quick Actions</h2>
                </div>
                <p className="text-cgray text-[14px]! leading-normal">Access the most important tasks instantly.</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="">

                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}