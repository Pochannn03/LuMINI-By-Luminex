import React from 'react';

export default function ClassManageStudentCard({ std, onView, onEdit }) {

  const photoUrl = std.profile_picture 
    ? std.profile_picture 
    : `https://api.dicebear.com/7.x/initials/svg?seed=${std.first_name || 'User'}`;

  const fullName = `${std.first_name || ''} ${std.last_name || ''}`;

  return (
    <div className="flex items-center p-4 rounded-xl bg-(--white) border border-(--border-color) gap-4 transition-all duration-200 hover:bg-[#f8fafc] hover:border-(--primary-blue) hover:-translate-y-0.5 hover:shadow-(--shadow-sm)">
    
    {/* Student Avatar */}
    <img 
        src={photoUrl} 
        className="w-[45px] h-[45px] rounded-[10px] object-cover shrink-0 bg-gray-100" 
        alt="Student Avatar"
      />

    {/* Student Info Section */}
    <div className="flex-1 flex flex-col">
        <span className="font-semibold text-slate-800 text-sm">
            {fullName}
        </span>
        
        {/* Meta Row */}
        <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <span className="material-symbols-outlined text-[14px]!">badge</span>
                <span>{std.student_id || '---'}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <span className="material-symbols-outlined text-[14px]!">class</span>
                <span>{std.section_details?.section_name || 'Unassigned'}</span>
            </div>
        </div>
    </div>

    {/* Action Buttons */}
    <div className="flex items-center gap-2">
        <button 
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-slate-100 text-slate-500 hover:text-blue-600 cursor-pointer"
          onClick={() => onView(std)}
        >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
        </button>
        <button 
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-red-50 text-slate-500 hover:text-blue-600 cursor-pointer"
          onClick={() => onEdit(std)}
        >
            <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
    </div>
</div>
  );
}