import React, { useState } from 'react';
import axios from 'axios';
import AdminConfirmModal from '../TeacherConfirmationModal'; 

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function AdminQueueParentGuardian({ item, setQueue }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const parent = item.user_details || {};
  const parentName = `${parent.first_name || 'Unknown'} ${parent.last_name || 'Parent'}`;
  
  const arrivalTime = new Date(item.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const handleRemove = async () => {
    setIsConfirmOpen(false);
    try {
      const response = await axios.patch(`${BACKEND_URL}/api/queue/remove/${item.user_id}`, 
        {}, 
        { withCredentials: true }
      );

      if (response.data.success) {
        setQueue(prev => prev.filter(q => q.user_id !== item.user_id));
      }
    } catch (err) {
      console.error("Axios Error:", err.response?.data || err.message);
      alert(err.response?.data?.msg || "Could not remove item. Please try again.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'At School': return 'bg-green-100 text-green-600';
      case 'Running late': return 'bg-red-100 text-red-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <>
      {/* Updated Mobile-Friendly Card */}
      <div className="group flex items-start p-3 sm:p-4 bg-white rounded-xl shadow-sm border border-slate-100 gap-3 sm:gap-4 animate-[fadeIn_0.3s_ease-out] hover:border-slate-200 transition-all w-full overflow-hidden">
        
        {/* Parent Avatar */}
        <div className="bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 w-10 h-10 rounded-lg">
          <span className="material-symbols-outlined">person</span>
        </div>
        
        {/* Main Content Area - min-w-0 prevents flexbox blowout on mobile */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            
            {/* Left Column: Text Content */}
            <div className="flex flex-col min-w-0 flex-1">
              {/* Added <p> tag with !important classes via Tailwind's '!' prefix */}
              <p className="text-cdark !text-[15px] !font-bold truncate !m-0 !p-0">
                {parentName}
              </p>
              
              {/* Used flex-wrap so the status and text stack nicely on tiny screens */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                
                {/* Added <p> tag with !important classes */}
                <p className="text-cgray !text-[12px] !m-0 !p-0 break-words line-clamp-2">
                  is arriving for <b className="text-cdark">{item.purpose}</b>
                </p>
              </div>
            </div>

            {/* Right Column: Time and Button (shrink-0 ensures they stay visible) */}
            <div className="flex flex-col items-end shrink-0 gap-2">
              <span className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                {arrivalTime}
              </span>
              
              <button 
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="cursor-pointer opacity-100 sm:opacity-80 group-hover:opacity-100 transition-all duration-200 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 shrink-0"
                title="Dismiss"
              >
                <span className="material-symbols-outlined text-[18px] font-bold">close</span>
              </button>
            </div>
            
          </div>
        </div>
      </div>

      <AdminConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleRemove}
        title="Dismiss Queue"
        message={`Are you sure you want to remove ${parentName} from the queue?`}
        confirmText="Remove Now"
        type="danger"
      />
    </>
  );
}