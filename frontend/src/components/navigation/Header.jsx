import React, { useState, useEffect, useRef } from "react";
import PlaceHolder from '../../assets/placeholder_image.jpg';
import '../../styles/header.css';
import { useAuth } from "../../context/AuthProvider";

const BACKEND_URL = "http://localhost:3000";

export default function Header({ onToggle }) {
  const { user } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getImageUrl = (path) => {
    if (!path) return PlaceHolder;
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
  };

  return (
    <header className="dashboard-header">
      <div className="flex items-center gap-4">
        <button className="icon-btn" onClick={onToggle}>
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notifRef}>
          <button 
            className={`icon-btn relative ${isNotifOpen ? 'bg-slate-100' : ''}`} 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="notif-badge absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[1000] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <span className="font-bold text-slate-800 text-[16px]">Notifications</span>
                <button className="text-[12px] text-blue-500 font-semibold hover:text-blue-700">Clear All</button>
              </div>

              {/* Scrollable Container */}
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {/* Example Items */}
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-4 flex gap-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">info</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] text-slate-600 leading-snug">
                        <strong>System Update:</strong> Your child's attendance for today has been logged.
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">10 mins ago</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="background-border-color w-px h-8"></div>

        <div className="flex items-center gap-3">
          <img 
            className="profile-avatar w-10 h-10 rounded-full object-cover" 
            src={getImageUrl(user?.profile_picture)} 
            alt="Profile" 
          />
          <span className="hidden font-semibold text-[14px] lg:block">
            {user?.firstName || user?.username || "User"}
          </span>
        </div>
      </div>
    </header>
  );
}