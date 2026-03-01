import React from 'react';

export default function ClassManageClassCard({ cls, onView, onEdit, onDelete }) {
  const isMorning = cls.class_schedule === "Morning";
  
  // Dynamic schedule icons
  const scheduleIcon = isMorning ? "light_mode" : "wb_twilight";
  const studentCount = cls.student_id ? cls.student_id.length : 0;

  // --- CREATIVE THEME LOGIC ---
  // Morning: Sunrise feel (Blue to Yellow/Amber)
  // Afternoon: Sunset feel (Orange to Rose)
  const cardTheme = isMorning 
    ? "bg-gradient-to-br from-blue-50/80 via-white to-amber-50/50 border-blue-100 hover:border-blue-300 shadow-sm"
    : "bg-gradient-to-br from-orange-50/80 via-white to-rose-50/50 border-orange-100 hover:border-orange-300 shadow-sm";
  
  const iconTheme = isMorning 
    ? "bg-blue-100/50 text-blue-600 border border-blue-200/50" 
    : "bg-orange-100/50 text-orange-600 border border-orange-200/50";

  const titleColor = isMorning ? "text-blue-900" : "text-orange-950";
  const subtitleColor = isMorning ? "text-blue-600/80" : "text-orange-600/80";

  return (
    <div 
      className={`flex items-center p-3 sm:p-4 rounded-2xl border gap-3 sm:gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group ${cardTheme}`}
      onClick={() => onView && onView(cls)}
    >
      {/* DYNAMIC ICON BLOCK */}
      <div className={`flex items-center justify-center w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-105 ${iconTheme}`}>
        <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
          {scheduleIcon}
        </span>
      </div>

      {/* MINIMAL TEXT BLOCK */}
      <div className="flex flex-col flex-1 gap-0.5 overflow-hidden pr-2">
        <span className={`text-[15px] sm:text-[16px] font-extrabold truncate transition-colors ${titleColor}`}>
          Kinder - {cls.section_name}
        </span>
        <div className={`flex items-center gap-1.5 text-[12px] sm:text-[13px] font-bold ${subtitleColor}`}>
          <span className="material-symbols-outlined text-[14px] sm:text-[16px]">groups</span>
          <span>{studentCount} Enrolled</span>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <button 
          className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-all duration-200 bg-white/60 hover:bg-white text-slate-400 hover:text-blue-600 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-sm active:scale-95" 
          title="Edit" 
          onClick={(e) => {
            e.stopPropagation(); 
            onEdit(cls);
          }}
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button 
          className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-all duration-200 bg-white/60 hover:bg-red-50 text-slate-400 hover:text-red-600 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-sm active:scale-95" 
          title="Delete" 
          onClick={(e) => {
            e.stopPropagation(); 
            onDelete(cls);
          }}
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  );
}