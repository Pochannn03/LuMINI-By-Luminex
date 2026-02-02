import React from 'react';

export default function ClassManageClassCard({ cls, onEdit, onDelete }) {
  const isMorning = cls.class_schedule === "Morning";
  const scheduleIcon = isMorning ? "light_mode" : "wb_twilight";
  const scheduleText = isMorning ? "AM" : "PM";

  const studentCount = cls.student_id ? cls.student_id.length : 0;
  const capacity = cls.max_capacity || 30;
  const teacherName = cls.user_details 
    ? `${cls.user_details.first_name} ${cls.user_details.last_name}` 
    : "Unassigned";

  return (
    <div className='flex items-center p-4 rounded-xl bg-(--white) border border-(--border-color) gap-4 transition-all duration-200 hover:bg-[#f8fafc] hover:border-(--primary-blue) hover:-translate-y-0.5 hover:shadow-(--shadow-sm)'>
      <div className='bg-[#e0f2fe] text-(--primary-blue) text-[18px] flex items-center justify-center w-[45px] h-[45px] rounded-[10px] shrink-0'>
        <span className="material-symbols-outlined">school</span>
      </div>

      <div className="flex flex-col flex-1 gap-1">
        <div className='flex justify-between items-center'>
          <span className="text-cdark text-[15px] font-bold">Kinder - {cls.section_name}</span>
          <span className='text-[11px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded'>
            <span className="material-symbols-outlined text-[14px]">
              {scheduleIcon}
            </span>
            {scheduleText}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-cgray flex items-center gap-1.5 text-[12px] font-medium">
            <span className="material-symbols-outlined text-[16px] text-[#b0bec5]">person</span>
            <span>{teacherName}</span>
          </div>
          <div className="text-cgray flex items-center gap-1.5 text-[12px] font-medium">
            <span className="material-symbols-outlined text-[16px] text-[#b0bec5]">groups</span>
            <span>{studentCount} / {capacity} Students</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="text-cgray w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-all duration-200 bg-transparent hover:bg-[#e0f2fe] hover:text-(--primary-blue)" title="Edit" onClick={() => onEdit(cls)}>
          <span className="material-symbols-outlined">edit</span>
        </button>
        <button className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-all duration-200 bg-transparent hover:text-(--accent-red) hover:bg-[#fee2e2]" title="Delete" onClick={() => onDelete(cls)}>
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  );
}