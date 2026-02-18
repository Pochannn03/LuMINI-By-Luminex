import React from "react";
import PlaceHolder from '../../assets/placeholder_image.jpg';
import '../../styles/header.css';
import { useAuth } from "../../context/AuthProvider"; // <-- Import Auth Context

const BACKEND_URL = "http://localhost:3000";

export default function Header({ onToggle }) {
  const { user } = useAuth(); // <-- Grab the logged-in user

  // Helper to format image URLs correctly (falling back to PlaceHolder)
  const getImageUrl = (path) => {
    if (!path) return PlaceHolder;
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

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
            {/* --- UPDATED: Dynamic Image --- */}
            <img 
              className="profile-avatar w-10 h-10 rounded-full object-cover" 
              src={getImageUrl(user?.profile_picture)} 
              alt="Profile" 
            />
            {/* --- UPDATED: Dynamic Name --- */}
            <span className="hidden font-semibold text-[14px] lg:block">
              {user?.firstName || user?.username || "User"}
            </span>
          </div>
        </div>
      </header>
    </>
  );
}