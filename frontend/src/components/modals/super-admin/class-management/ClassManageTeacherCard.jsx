import React from 'react';

export default function ClassManageTeacherCard({ tch, onEdit, onDelete }) {
  const fullName = `${tch.first_name || ''} ${tch.last_name || ''}`;
  
  const photoUrl = tch.profile_picture || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + tch.first_name; // PLACEHOLDER

  return (
      <div className="flex items-center p-4 rounded-xl bg-(--white) border border-(--border-color) gap-4 transition-all duration-200 hover:bg-[#f8fafc] hover:border-(--primary-blue) hover:-translate-y-0.5 hover:shadow-(--shadow-sm)">
    
        <img 
          src={photoUrl} 
          alt="Profile"
          className="w-[45px] h-[45px] rounded-[10px] object-cover shrink-0 bg-gray-200" 
        />

        <div className="flex-1 flex flex-col">
            <span className="font-semibold text-slate-800 text-sm">{fullName}</span>
            
            <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">mail</span>
                    <span>{tch.email}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-slate-100 text-slate-500 hover:text-(--primary-blue) cursor-pointer"
              onClick={() => onEdit(tch)}
            >
                <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-red-50 text-slate-500 hover:text-red-500 cursor-pointer"
              onClick={() => onDelete(tch)}
            >
                <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
        </div>
    </div>
  );
}