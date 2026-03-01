import React from 'react';

export default function ClassManageArchivedCard({ cls }) {
  const isMorning = cls.class_schedule === "Morning";
  const scheduleIcon = isMorning ? "light_mode" : "wb_twilight";
  const scheduleText = isMorning ? "AM" : "PM";

  return (
    <div className='flex items-center p-4 rounded-xl bg-white border border-slate-100 gap-4 opacity-80 hover:opacity-100 transition-all'>
      <div className='bg-slate-100 text-slate-500 text-[18px] flex items-center justify-center w-[45px] h-[45px] rounded-[10px] shrink-0'>
        <span className="material-symbols-outlined">archive</span>
      </div>

      <div className="flex flex-col flex-1 gap-1">
        <div className='flex justify-between items-center'>
          <span className="text-cdark text-[15px] font-bold">Kinder - {cls.section_name}</span>
          <span className='text-[11px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded'>
            <span className="material-symbols-outlined text-[14px]">{scheduleIcon}</span>
            {scheduleText}
          </span>
        </div>

        <div className="flex items-center gap-3">
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Archived
            </span>
            <span className="text-cgray text-[12px]">ID: {cls.section_id}</span>
        </div>
      </div>
    </div>
  );
}