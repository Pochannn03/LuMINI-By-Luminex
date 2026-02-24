import React from 'react';

const BACKEND_URL = "http://localhost:3000";

// HELPER: Convert backend path to full URL
const getImageUrl = (path) => {
  if (!path) return "/default-avatar.png"; 
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/${path.replace(/\\/g, "/")}`;
};

export default function ClassManageAddStudentCard({ student, isSelected, onToggle }) {
  
  const photoUrl = getImageUrl(student.profile_picture);
  
  // --- THE FIX: Look at section_details, not section_id ---
  const sectionName = student.section_details?.section_name;
  
  // Render the actual section name if enrolled, otherwise "Unassigned"
  const statusBadge = sectionName ? (
    <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold tracking-wide">
      {sectionName}
    </span>
  ) : (
    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
      Unassigned
    </span>
  );

  return(
    <div 
      className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer border ${isSelected ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
      onClick={() => onToggle(student.student_id)}
    >
      <input 
        type="checkbox" 
        className="w-[18px] h-[18px] ml-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
        value={student.student_id} 
        checked={isSelected}
        readOnly // React prefers readOnly if controlled by an onClick on the parent div
      />

      <div className="flex items-center gap-3 flex-1">
        <img 
          src={photoUrl} 
          className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-white" 
          alt="Avatar"
        />

        <div className="flex flex-col">
          <span className="text-slate-800 text-[14px] font-bold leading-tight mb-0.5">
            {student.first_name} {student.last_name}
          </span>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">badge</span>
              {student.student_id}
            </span>
            {statusBadge}
          </div>
        </div>
      </div>
    </div>
  );
}