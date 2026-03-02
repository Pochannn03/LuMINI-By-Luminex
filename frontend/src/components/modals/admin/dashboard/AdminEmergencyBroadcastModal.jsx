import React, { useState } from 'react';

export default function AdminEmergencyBroadcastModal({ isOpen, onClose }) {
  const [recipientMode, setRecipientMode] = useState('all'); // 'all' or 'specific'
  const [messageType, setMessageType] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Quick Templates to save time during an emergency
  const templates = {
    medical: "EMERGENCY: There is a medical situation at the school. Please check your Lumini App for immediate updates regarding your child.",
    weather: "ALERT: Severe weather warning. The school is initiating emergency dismissal protocols. Please proceed to the pickup area safely.",
    evacuation: "URGENT: School is being evacuated to the designated safe zone. All students are accounted for. Await further instructions.",
    others: "" // NEW FUNCTIONAL TYPE for empty manual input
  };

  if (!isOpen) return null;

  const handleTemplateSelect = (type) => {
    setMessageType(type);
    setCustomMessage(templates[type] || '');
  };

  const handleSend = async () => {
    setIsSending(true);
    // TODO: Hook up to the backend route we will build next
    setTimeout(() => {
      setIsSending(false);
      onClose();
      // Ideally, trigger a success toast here
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-3xl w-full max-w-[600px] overflow-hidden shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
        
        {/* --- HEADER (Red Warning Theme) --- */}
        <div className="bg-[#ef4444] p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[28px] text-white">warning</span>
              <h2 className="text-[20px] sm:text-[22px] font-black tracking-tight m-0" style={{ color: 'white' }}>Emergency Broadcast</h2>
            </div>
            {/* Short copy, white styling, slightly more clear opacity */}
            <p className="text-[13px] sm:text-[14px] font-medium m-0 max-w-[90%] sm:max-w-[85%]" style={{ color: 'white', opacity: 0.9 }}>
              Send an immediate SMS alert to parents for critical situations.
            </p>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -top-4 text-[120px] text-white opacity-10 pointer-events-none select-none">
            campaign
          </span>
        </div>

        {/* --- BODY --- */}
        <div className="p-5 sm:p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Target Audience */}
          <div className="flex flex-col gap-3">
            <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">1. Select Recipients</label>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
              <button 
                className={`flex-1 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all focus:outline-none border ${recipientMode === 'all' ? 'bg-white text-red-600 shadow-sm border-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setRecipientMode('all')}
              >
                All Parents in Class
              </button>
              <button 
                className={`flex-1 py-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all focus:outline-none border ${recipientMode === 'specific' ? 'bg-white text-red-600 shadow-sm border-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setRecipientMode('specific')}
              >
                Specific Students
              </button>
            </div>
            {recipientMode === 'specific' && (
              <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-[12px] sm:text-[13px] font-medium flex items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">info</span>
                 Student selection list will load here (Pending backend integration).
              </div>
            )}
          </div>

          {/* Quick Templates */}
          <div className="flex flex-col gap-3">
            <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">2. Select Message Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Row 1, Left (Top Left visual place) triggers 'medical' */}
              <button 
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'medical' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                onClick={() => handleTemplateSelect('medical')}
              >
                <span className={`material-symbols-outlined text-[20px] ${messageType === 'medical' ? 'text-red-500' : 'text-slate-400'}`}>medical_services</span>
                <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'medical' ? 'text-red-700' : 'text-slate-700'}`}>Medical Situation</span>
              </button>
              
              {/* Row 1, Right (Top Right visual place) triggers 'weather' */}
              <button 
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'weather' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                onClick={() => handleTemplateSelect('weather')}
              >
                <span className={`material-symbols-outlined text-[20px] ${messageType === 'weather' ? 'text-red-500' : 'text-slate-400'}`}>storm</span>
                <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'weather' ? 'text-red-700' : 'text-slate-700'}`}>Weather Alert</span>
              </button>

              {/* Row 2, Left triggers 'evacuation' -> "Evacuation" */}
              <button 
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'evacuation' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                onClick={() => handleTemplateSelect('evacuation')}
              >
                <span className={`material-symbols-outlined text-[20px] ${messageType === 'evacuation' ? 'text-red-500' : 'text-slate-400'}`}>directions_run</span>
                <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'evacuation' ? 'text-red-700' : 'text-slate-700'}`}>Evacuation</span>
              </button>

              {/* Row 2, Right triggers 'others' -> "Others (Please Specify In Message)" */}
              <button 
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 focus:outline-none ${messageType === 'others' ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                onClick={() => handleTemplateSelect('others')}
              >
                <span className={`material-symbols-outlined text-[20px] ${messageType === 'others' ? 'text-red-500' : 'text-slate-400'}`}>edit_square</span>
                <div className="flex flex-col">
                  <span className={`text-[13px] sm:text-[14px] font-bold ${messageType === 'others' ? 'text-red-700' : 'text-slate-700'}`}>
                    Others
                  </span>
                  {/* Smaller, unbolded supporting text */}
                  <span className={`text-[10px] font-medium tracking-tight mt-0.5 leading-tight ${messageType === 'others' ? 'text-red-500/90' : 'text-slate-400'}`}>
                    (Please specify below)
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Message Area */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <label className="text-[12px] sm:text-[13px] font-bold text-slate-700 uppercase tracking-wide">3. Review Message</label>
                <span className="text-[11px] sm:text-[12px] text-slate-400 font-medium">{customMessage.length}/160</span>
            </div>
            <textarea 
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Select a template or type your emergency message here..."
              className="w-full h-32 p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl text-[13px] sm:text-[14px] text-slate-800 outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50 transition-all resize-none"
            />
          </div>

        </div>

        {/* --- FOOTER: RESPONSIVE BUTTONS --- */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 bg-slate-50">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-[14px] font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors focus:outline-none"
            disabled={isSending}
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            disabled={isSending || customMessage.trim().length === 0}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-[14px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-red-200 focus:outline-none"
          >
            {isSending ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  Broadcasting...
                </>
            ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Dispatch SMS Alert
                </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}