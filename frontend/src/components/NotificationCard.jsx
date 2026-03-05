import React from 'react';

import { formatDistanceToNow } from 'date-fns'; // Recommended for "10 mins ago" logic

const NotificationCard = ({ notification, onClick }) => {
  // Map your Schema enums to specific icons
  const getIcon = (type) => {
    switch (type) {
      case 'Announcement': return 'campaign';
      case 'Attendance': return 'person_check';
      case 'Transfer': return 'swap_horiz';
      case 'System': return 'verified_user';
      case 'Alert': return 'exclamation';
      default: return 'notifications';
    }
  };

  // Map types to specific colors for the icon background
  const getIconColor = (type) => {
    switch (type) {
      case 'Announcement': return 'bg-blue-50 text-blue-500';
      case 'Attendance': return 'bg-green-50 text-green-500';
      case 'Transfer': return 'bg-amber-50 text-amber-500';
      case 'System': return 'bg-purple-50 text-purple-500';
      case 'Alert': return 'bg-red-50 text-red-400';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  return (
    <div 
      onClick={() => onClick(notification)}
      className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0 hover:bg-slate-50 ${!notification.is_read ? 'bg-blue-50/30' : 'bg-white'}`}
    >
      {/* Icon Section */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor(notification.type)}`}>
        <span className="material-symbols-outlined text-[20px]">
          {getIcon(notification.type)}
        </span>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2">
          <span className="font-bold text-[13px] text-slate-800">
            {notification.title}
          </span>
          {!notification.is_read && (
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
          )}
        </div>
        
        <p className="text-[13px]! text-slate-600 leading-snug mt-0.5">
          {notification.message}
        </p>
        
        <span className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-medium">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

export default NotificationCard;