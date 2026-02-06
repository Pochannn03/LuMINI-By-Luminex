import React from 'react';

export default function ClassManageAddStudentCard({ student, isSelected, onToggle }) {

  const photoUrl = student.profile_picture || "/default-avatar.png";
  const isEnrolled = student.section_id !== null && student.section_id !== undefined;
  const statusBadge = isEnrolled ? 
    <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded">Enrolled</span> : 
    <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">Unassigned</span>;

  return(
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
      <input 
        type="checkbox" 
        className="w-4 h-4 rounded border-slate-300 text-(--primary-blue) focus:ring-(--primary-blue)"
        value={student.student_id} 
        checked={isSelected}
        onChange={() => onToggle(student.student_id)}
      />

      {/* Content Wrapper (check-content) */}
      <div className="flex items-center gap-2.5 flex-1">
        {/* Small Avatar */}
        <img 
          src={photoUrl} 
          className="w-9 h-9 rounded-full object-cover" 
          alt="Avatar"
        />

        {/* Info Wrapper (check-info) */}
        <div className="flex flex-col">
          <span className="text-cdark text-[13px] font-semibold">
            {student.first_name} {student.last_name}
          </span>
          
          {/* ID and Status Badge Container */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-cgray text-[11px]">
              {student.student_id}
            </span>
            {/* Render your statusBadge here */}
            {statusBadge}
          </div>
        </div>
      </div>
    </div>
  );
}