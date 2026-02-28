import React from "react";

export function DashboardFeedbackCard({ item, onClick }) {
  const isPositive = item.rating === 'up';

  return (
    <div 
      onClick={() => onClick(item)}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition-all duration-200 group border border-transparent hover:border-slate-200"
    >
      {/* Dynamic Thumb Icon */}
      <div className={`${isPositive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0`}>
        <span className="material-symbols-outlined text-[20px] fill-1">
          {isPositive ? "thumb_up" : "thumb_down"}
        </span>
      </div>

      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <div className="flex justify-between items-center">
          <span className="text-cdark text-[14px] font-bold truncate">
            {item.user_name || "Parent/Guardian"}
          </span>
          <span className="text-slate-400 text-[10px] shrink-0">{item.time || "Just now"}</span>
        </div>
        
        {/* Truncated Remark: line-clamp-2 hides text after 2 lines */}
        <p className="text-cgray text-[12px]! leading-snug line-clamp-2">
          {item.remark || "No additional comments."}
        </p>

        {item.remark?.length > 60 && (
          <span className="text-[11px] text-[#39a8ed] font-medium group-hover:underline">Read more...</span>
        )}
      </div>
    </div>
  );
}