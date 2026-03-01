import React from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'Teacher'}`; 
  if (path.startsWith("http")) return path;
  
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

// THE FIX: Added onView prop
export default function ClassManageTeacherCard({ tch, onView, onEdit, onDelete }) {
  const fullName = `${tch.first_name || ''} ${tch.last_name || ''}`;
  const photoUrl = getImageUrl(tch.profile_picture, tch.first_name);

  return (
      <div 
        className="flex items-center p-4 rounded-xl bg-(--white) border border-(--border-color) gap-4 transition-all duration-200 hover:bg-[#f8fafc] hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
        onClick={() => onView(tch)} // THE FIX: Clicking the card triggers onView
      >
    
        <img 
          src={photoUrl} 
          alt="Profile"
          className="w-[45px] h-[45px] rounded-[10px] object-cover shrink-0 bg-slate-100" 
        />

        <div className="flex-1 flex flex-col">
            <span className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{fullName}</span>
            
            <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">mail</span>
                    <span className="truncate">{tch.email}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-slate-200 text-slate-500 hover:text-blue-600"
              onClick={(e) => {
                e.stopPropagation(); // THE FIX: Stops the card click event
                onEdit(tch);
              }}
              title="Edit Teacher"
            >
                <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-red-100 text-slate-500 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation(); // THE FIX: Stops the card click event
                onDelete(tch);
              }}
              title="Delete Teacher"
            >
                <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
        </div>
    </div>
  );
}