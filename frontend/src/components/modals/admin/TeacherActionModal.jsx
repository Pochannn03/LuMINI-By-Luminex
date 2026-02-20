import React from 'react';

const AdminActionFeedbackModal = ({ 
  isOpen, 
  onClose, 
  type = 'success',
  title, 
  message, 
  details = [],
  buttonText = 'Done' 
}) => {
  if (!isOpen) return null;

  // Configuration based on type
  const configs = {
    success: {
      color: '#10b981',
      bgColor: '#ecfdf5',
      icon: 'check_circle'
    },
    warning: {
      color: '#f59e0b',
      bgColor: '#fffbeb',
      icon: 'schedule'
    },
    info: {
      color: '#3b82f6',
      bgColor: '#eff6ff',
      icon: 'info'
    },
    error: { 
      color: '#ef4444', 
      bgColor: '#fef2f2', 
      icon: 'error' 
    }
  };

  const { color, bgColor, icon } = configs[type] || configs.success;

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-[28px] w-[90%] max-w-[400px] p-8 shadow-2xl text-center animate-[zoomIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        
        {/* Dynamic Icon */}
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all"
          style={{ backgroundColor: bgColor, color: color }}
        >
          <span className="material-symbols-outlined text-[48px]">{icon}</span>
        </div>

        <h2 className="text-[#263238] text-[24px] font-bold mb-2">{title}</h2>

        {/* Dynamic Message/Pill */}
        <div 
          className="inline-block px-4 py-1.5 rounded-full text-[13px] font-bold tracking-wide uppercase mb-8"
          style={{ backgroundColor: bgColor, color: color, border: `1px solid ${color}40` }}
        >
          {message}
        </div>

        {details.length > 0 && (
          <div className="bg-[#f8fafc] rounded-2xl p-5 mb-8 text-left border border-[#e2e8f0]">
            <div className="flex flex-col gap-3">
              {details.map((item, index) => (
                <React.Fragment key={index}>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748b] text-[12px] font-medium uppercase tracking-wider mr-4">
                      {item.label}:
                    </span>

                    <span className="text-[#1e293b] font-bold">
                      {item.value}
                    </span>
                  </div>
                  {index < details.length - 1 && <div className="h-px bg-[#e2e8f0] w-full"></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="btn w-full h-[54px] rounded-xl text-white font-bold text-[16px] transition-all active:scale-[0.95] shadow-lg cursor-pointer"
          style={{ backgroundColor: color }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default AdminActionFeedbackModal;