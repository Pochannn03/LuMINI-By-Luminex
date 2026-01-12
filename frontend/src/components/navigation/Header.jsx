import React from "react";
import '../../styles/header.css'

export default function Header({onToggle}) {
  return (
    <>
      <header className="dashboard-header">

        <div className="flex items-center gap-4">
          <button className="icon-btn" id="burgerIconOpenNav" onClick={onToggle}>
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
            <button className="icon-btn relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notif-badge absolute top-2 right-2 w-2 h-2 rounded-full"></span>
            </button>

          <div className="background-border-color w-px h-8"></div>

          <div className="flex items-center gap-3">
            <img 
              class="profile-avatar w-10 h-10 rounded-full object-cover " 
              src="../../../assets/placeholder_image.jpg" 
              alt="Profile" 
            />
            <span class="hidden font-semibold text-[14px] lg:block">User</span>
          </div>
        </div>
      </header>

    </>
  );
}