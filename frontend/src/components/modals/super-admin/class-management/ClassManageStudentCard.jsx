import React from 'react';

const BACKEND_URL = "http://localhost:3000";

// HELPER: Convert backend path to full URL, or use Dicebear fallback
const getImageUrl = (path, firstName) => {
  if (!path) return `https://api.dicebear.com/7.x/initials/svg?seed=${firstName || 'User'}`; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function ClassManageStudentCard({ std, onView, onEdit }) {
  const photoUrl = getImageUrl(std.profile_picture, std.first_name);
  const fullName = `${std.first_name || ''} ${std.last_name || ''}`;

  return (
    <div 
      className="flex items-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 gap-3 sm:gap-4 transition-all duration-300 hover:bg-[#f8fafc] hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group"
      onClick={() => onView && onView(std)}
    >
      {/* Student Avatar */}
      <div className="relative shrink-0">
        <img 
          src={photoUrl} 
          className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] rounded-xl object-cover bg-slate-100 border border-slate-200 group-hover:border-blue-200 transition-colors shadow-sm" 
          alt={std.first_name || "Student Avatar"}
        />
      </div>

      {/* Minimal Student Info */}
      <div className="flex-1 flex flex-col overflow-hidden pr-2">
        <span className="block font-extrabold text-slate-800 text-[14px] sm:text-[15px] truncate group-hover:text-blue-600 transition-colors">
          {fullName}
        </span>
      </div>

      {/* Action Button (Box appears on hover!) */}
      <div className="flex items-center shrink-0 pr-1">
        <button 
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 bg-transparent border border-transparent text-slate-400 hover:bg-white hover:border-slate-200 hover:text-blue-600 hover:shadow-sm active:scale-95"
          onClick={(e) => {
            e.stopPropagation(); // Prevents the card from opening the View modal when clicking the icon
            onEdit(std);
          }}
          title="Edit Profile"
        >
          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">edit</span>
        </button>
      </div>
    </div>
  );
}