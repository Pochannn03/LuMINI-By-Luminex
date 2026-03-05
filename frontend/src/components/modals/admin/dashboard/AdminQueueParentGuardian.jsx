import React, { useState } from 'react';
import axios from 'axios';
import AdminConfirmModal from '../TeacherConfirmationModal'; 

export default function AdminQueueParentGuardian ({ item, setQueue }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const parent = item.user_details || {};
  const parentName = `${parent.first_name || 'Unknown'} ${parent.last_name || 'Parent'}`;
  
  const arrivalTime = new Date(item.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const handleRemove = async () => {
    // Close the modal immediately to show responsiveness
    setIsConfirmOpen(false);
    try {
      const response = await axios.patch(`http://localhost:3000/api/queue/remove/${item.user_id}`, 
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
      {/* 1. The Visible Card in the Queue List */}
      <div className="group flex items-start p-4 bg-white rounded-xl shadow-sm border border-slate-100 gap-4 animate-[fadeIn_0.3s_ease-out] hover:border-slate-200 transition-all">
        
        {/* Parent Avatar */}
        <div className="bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 w-10 h-10 rounded-lg">
          <span className="material-symbols-outlined">person</span>
        </div>
        
        <div className="flex flex-col flex-1">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-cdark text-[15px] font-bold">
                {parentName}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <span className="text-cgray text-[12px]">
                  is arriving for <b className="text-cdark">{item.purpose}</b>
                </span>
              </div>
            </div>

            {/* Right Column: Time and Button */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-slate-400 -mt-1">
                {arrivalTime}
              </span>
              
              <button 
                type="button"
                onClick={() => setIsConfirmOpen(true)} // Change: Open modal instead of deleting
                className="cursor-pointer opacity-80 group-hover:opacity-100 transition-all duration-200 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600"
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