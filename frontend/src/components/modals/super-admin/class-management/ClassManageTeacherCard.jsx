import React from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'Teacher'}`; 
  if (path.startsWith("http")) return path;
  
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function ClassManageTeacherCard({ tch, onView, onEdit, onDelete }) {
  const fullName = `${tch.first_name || ''} ${tch.last_name || ''}`;
  const photoUrl = getImageUrl(tch.profile_picture, tch.first_name);

  return (
      <div 
        className="flex items-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 gap-3 sm:gap-4 transition-all duration-300 hover:bg-[#f8fafc] hover:border-orange-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group"
        onClick={() => onView(tch)}
      >
    
        {/* Teacher Avatar */}
        <div className="relative shrink-0">
          <img 
            src={photoUrl} 
            alt={tch.first_name || "Teacher Avatar"}
            className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] rounded-xl object-cover bg-slate-100 border border-slate-200 group-hover:border-orange-200 transition-colors shadow-sm" 
          />
        </div>

        {/* Minimal Teacher Info */}
        <div className="flex-1 flex flex-col overflow-hidden pr-2">
            <span className="block font-extrabold text-slate-800 text-[14px] sm:text-[15px] truncate group-hover:text-orange-600 transition-colors">
              {fullName}
            </span>
        </div>

        {/* Action Buttons (Visible on hover) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1">
            <button 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 bg-transparent border border-transparent text-slate-400 hover:bg-white hover:border-slate-200 hover:text-blue-600 hover:shadow-sm active:scale-95"
              onClick={(e) => {
                e.stopPropagation(); 
                onEdit(tch);
              }}
              title="Edit Profile"
            >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">edit</span>
            </button>
            <button 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 bg-transparent border border-transparent text-slate-400 hover:bg-red-50 hover:border-red-100 hover:text-red-600 hover:shadow-sm active:scale-95"
              onClick={(e) => {
                e.stopPropagation(); 
                onDelete(tch);
              }}
              title="Delete Teacher"
            >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">delete</span>
            </button>
        </div>
    </div>
  );
}