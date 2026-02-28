import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthProvider";
import { io } from "socket.io-client";
import axios from "axios";
import PlaceHolder from '../../assets/placeholder_image.jpg';
import NotificationCard from "../NotificationCard";
import '../../styles/header.css';

const BACKEND_URL = "http://localhost:3000";

export default function Header({ onToggle }) {
  const { user } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/notifications`, {
          withCredentials: true 
        });
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifs();
  }, []);

  const handleNotificationClick = async (notif) => {
    if (notif.is_read) return;

    try {
      await axios.patch(`${BACKEND_URL}/api/notifications/${notif.notification_id}/read`, {}, { withCredentials: true });
      
      setNotifications(prev => 
        prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking as read", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.put(`${BACKEND_URL}/api/notifications/read-all`, {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  useEffect(() => {
    const socket = io("http://localhost:3000", { withCredentials: true });

    socket.on('new_notification', (newNotif) => {
      if (Number(newNotif.recipient_id) === Number(user?.user_id)) {
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      socket.off('new_notification');
      socket.disconnect();
    };
  }, [user?.user_id]);

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
          <button className="icon-btn relative" onClick={() => setIsNotifOpen(!isNotifOpen)}>
            <span className="material-symbols-outlined mt-2">notifications</span>
            {unreadCount > 0 && (
              <span className="notif-badge absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-1000 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <span className="font-bold text-slate-800 text-[16px]">Notifications</span>
                <button 
                  onClick={handleClearAll}
                  className="text-[12px] text-blue-500 font-semibold hover:text-blue-700">
                    Clear All
                  </button>
              </div>

              {/* Scrollable Container */}
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <NotificationCard 
                      key={notif.notification_id} 
                      notification={notif} 
                      onClick={handleNotificationClick} 
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                    <p className="text-sm!">No notifications yet</p>
                  </div>
                )}
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