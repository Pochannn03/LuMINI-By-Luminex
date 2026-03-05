import React from 'react';

const NewDayModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-[400px] w-[90%] text-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-zoom-in">
        
        {/* Icon Circle */}
        <div className="w-20 h-20 bg-[#e1f5fe] text-[#0288d1] rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px]">wb_sunny</span>
        </div>

        <h2 className="text-[#263238] text-[24px] font-bold mb-3">New Day Started!</h2>
        
        <p className="text-[#546e7a] text-[15px] leading-relaxed mb-8">
          Your child's status has been reset for today. 
          Please update your <strong>Update Status</strong> before scanning at the gate.
        </p>

        <button 
          onClick={onClose}
          className="w-full h-[52px] bg-[#0288d1] hover:bg-[#0277bd] text-white rounded-xl font-bold transition-all shadow-md active:scale-[0.98]"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default NewDayModal;