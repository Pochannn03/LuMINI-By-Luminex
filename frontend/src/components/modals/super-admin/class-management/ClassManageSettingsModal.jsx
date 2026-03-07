import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ClassManageSettingsModal({ isOpen, onClose, onSuccess }) {
  // STATE TEMPORARY FOR TIMES
  const [morningStart, setMorningStart] = useState("08:00");
  const [morningEnd, setMorningEnd] = useState("12:00");
  const [afternoonStart, setAfternoonStart] = useState("13:00");
  const [afternoonEnd, setAfternoonEnd] = useState("17:00");
  
  // NEW STATE FOR LATE GRACE PERIOD (Defaults to 15 mins)
  const [lateGracePeriod, setLateGracePeriod] = useState(15);
  
  // LOADING STATE
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${BACKEND_URL}/api/settings/schedule`, { 
          withCredentials: true 
        });
        
        if (response.data.success && response.data.settings) {
          const { settings } = response.data;
          setMorningStart(settings.morning_start || "08:00");
          setMorningEnd(settings.morning_end || "11:30");
          setAfternoonStart(settings.afternoon_start || "13:00");
          setAfternoonEnd(settings.afternoon_end || "16:30");
          // Fetch the grace period from DB
          setLateGracePeriod(settings.late_grace_period_minutes ?? 15); 
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await axios.patch(`${BACKEND_URL}/api/settings/schedule`, {
        morning_start: morningStart,
        morning_end: morningEnd,
        afternoon_start: afternoonStart,
        afternoon_end: afternoonEnd,
        late_grace_period_minutes: Number(lateGracePeriod)
      }, { 
        withCredentials: true 
      });

      if (response.data.success) {
        if (onSuccess) onSuccess("Class schedules and rules updated successfully!");
        onClose();
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#1e293b]">Class Schedule Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90 bg-transparent border-none cursor-pointer flex items-center justify-center p-2 z-50">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Use the isLoading state here to show a message while fetching */}
        {isLoading && !morningStart ? (
           <div className="flex justify-center items-center py-10">
             <span className="text-gray-500 font-semibold text-sm">Loading settings...</span>
           </div>
        ) : (
          <div className="space-y-6">
            {/* Morning Session */}
            <div>
              <h3 className="text-[14px] font-bold text-[#334155] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500 text-[18px]">light_mode</span>
                Morning Classes
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] text-gray-500 font-semibold">Start Time</label>
                  <input 
                    type="time" 
                    className="border border-gray-200 rounded-lg px-3 py-2 text-[14px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                    value={morningStart} 
                    onChange={(e) => setMorningStart(e.target.value)} 
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] text-gray-500 font-semibold">End Time</label>
                  <input 
                    type="time" 
                    className="border border-gray-200 rounded-lg px-3 py-2 text-[14px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                    value={morningEnd} 
                    onChange={(e) => setMorningEnd(e.target.value)} 
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Afternoon Session */}
            <div>
              <h3 className="text-[14px] font-bold text-[#334155] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 text-[18px]">wb_twilight</span>
                Afternoon Classes
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] text-gray-500 font-semibold">Start Time</label>
                  <input 
                    type="time" 
                    className="border border-gray-200 rounded-lg px-3 py-2 text-[14px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                    value={afternoonStart} 
                    onChange={(e) => setAfternoonStart(e.target.value)} 
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] text-gray-500 font-semibold">End Time</label>
                  <input 
                    type="time" 
                    className="border border-gray-200 rounded-lg px-3 py-2 text-[14px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                    value={afternoonEnd} 
                    onChange={(e) => setAfternoonEnd(e.target.value)} 
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Late Grace Period Configuration */}
            <div>
              <h3 className="text-[14px] font-bold text-[#334155] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-[18px]">timer</span>
                Attendance Rules
              </h3>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[12px] text-gray-500 font-semibold">Late Grace Period (Minutes)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    min="0"
                    max="120"
                    className="w-[120px] border border-gray-200 rounded-lg px-3 py-2 text-[14px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                    value={lateGracePeriod} 
                    onChange={(e) => setLateGracePeriod(e.target.value)} 
                    disabled={isLoading} 
                  />
                  <p className="text-[11px]! text-gray-400 leading-tight m-0 flex-1">
                    Students arriving this many minutes after the start time will be marked "Late".
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="px-4 py-2 text-[13px] font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isLoading}
            className="px-4 py-2 text-[13px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
            {isLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}