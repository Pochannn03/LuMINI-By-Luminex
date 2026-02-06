import React, { useState } from "react";
import { DashboardReviewAccModal } from './DashboardReviewAccModal';

export function DashboardPendingAccCard({ tch }) {
  const [viewPendingAccModal, setViewPendingAccModal] = useState(false);

  const photoUrl = tch.profile_picture 
    ? `http://localhost:3000/${tch.profile_picture}` 
    : "https://via.placeholder.com/45"; // or a local default asset

  const dateString = new Date(tch.created_at).toLocaleDateString();

  return (
    <>
      <div className="flex items-center p-4 rounded-xl bg-(--white) border border-(--border-color) gap-4 transition-all duration-200 hover:bg-[#f8fafc] hover:border-(--primary-blue) hover:-translate-y-0.5 hover:shadow-(--shadow-sm)">
    
        {/* Teacher Avatar */}
        <img 
          src={photoUrl} 
          className="w-[45px] h-[45px] rounded-[10px] object-cover shrink-0" 
          alt="Teacher Avatar"
        />

        {/* Teacher Info (queue-info) */}
        <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-cdark text-[15px] font-bold">
              {tch.first_name} {tch.last_name}
            </span>
            <span className="text-cgray text-[12px] font-medium">
              Role: Teacher • @{tch.username}
            </span>
            <span className="text-slate-400 text-[11px]">
              Joined: {dateString}
            </span>
        </div>

        {/* Action Buttons (action-buttons-small) */}
        <div className="flex items-center gap-2">
            <button 
              className="btn-icon-tool h-12! w-12!" 
              title="Review Details"
              onClick={() => setViewPendingAccModal(true)}
            >
                <span className="material-symbols-outlined text-[24px]!">visibility</span>
            </button>
            
            <button 
              className="btn-icon-tool h-12! w-12! group hover:bg-green-200!" 
              title="Approve"
            >
                <span className="material-symbols-outlined text-[24px]! group-hover:text-green-700">check</span>
            </button>
            
            <button 
              className="btn-icon-tool h-12! w-12! group hover:bg-red-200!" 
              title="Reject"
            >
              <span className="material-symbols-outlined text-[24px]! group-hover:text-red-700!">
                  close
              </span>
            </button>
        </div>
      </div>

      <DashboardReviewAccModal
        onView={viewPendingAccModal}
        isClose={() => setViewPendingAccModal(false)}
        tch={tch} 
      />

    </>
  );
}