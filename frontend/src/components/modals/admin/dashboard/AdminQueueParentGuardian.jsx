import React from 'react';

const QueueItemCard = ({ item }) => {
  // Extracting details from the populated user_details virtual
  const parent = item.user_details?.[0] || {};
  const parentName = `${parent.first_name || 'Unknown'} ${parent.last_name || 'Parent'}`;
  
  // Format time for a clean UI
  const arrivalTime = new Date(item.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Dynamic status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'At School': return 'bg-green-100 text-green-600';
      case 'Running late': return 'bg-red-100 text-red-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className="flex items-start p-4 bg-white rounded-xl shadow-sm border border-slate-100 gap-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Parent Avatar */}
      <div className="bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 w-10 h-10 rounded-lg">
        <span className="material-symbols-outlined">person</span>
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-center">
          <span className="text-cdark text-[15px] font-bold">
            {parentName}
          </span>
          <span className="text-[11px] text-slate-400">
            {arrivalTime}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 mt-1">
          {/* Status Badge */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
            {item.status}
          </span>
          <span className="text-cgray text-[12px]">
            is arriving for <b className="text-cdark">{item.type}</b>
          </span>
        </div>
      </div>
    </div>
  );
};

export default QueueItemCard;