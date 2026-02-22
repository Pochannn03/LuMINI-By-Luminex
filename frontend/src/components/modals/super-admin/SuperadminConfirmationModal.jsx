import React from 'react';
import { createPortal } from "react-dom";

const AdminConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure?", 
  confirmText = "Yes, Remove",
  cancelText = "Cancel",
  type = 'warning' // warning, danger, info
}) => {
  if (!isOpen) return null;

  const configs = {
    warning: { color: '#f59e0b', bgColor: '#fffbeb', icon: 'help' },
    danger: { color: '#ef4444', bgColor: '#fef2f2', icon: 'delete_forever' },
    info: { color: '#3b82f6', bgColor: '#eff6ff', icon: 'info' }
  };

  const { color, bgColor, icon } = configs[type] || configs.warning;

  return createPortal (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-[28px] w-[90%] max-w-[400px] p-8 shadow-2xl text-center animate-[zoomIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        
        {/* Icon */}
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: bgColor, color: color }}
        >
          <span className="material-symbols-outlined text-[48px]">{icon}</span>
        </div>

        <h2 className="text-[#263238] text-[22px] font-bold mb-2">{title}</h2>
        <p className="text-[#64748b] text-[15px] mb-8 px-4">{message}</p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full h-[54px] rounded-xl text-white font-bold text-[16px] transition-all active:scale-[0.98] shadow-lg cursor-pointer border-none"
            style={{ backgroundColor: color }}
          >
            {confirmText}
          </button>
          
          <button 
            onClick={onClose}
            className="w-full h-[54px] rounded-xl text-[#64748b] font-bold text-[16px] transition-all active:scale-[0.98] cursor-pointer border-none bg-slate-100 hover:bg-slate-200"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminConfirmModal;